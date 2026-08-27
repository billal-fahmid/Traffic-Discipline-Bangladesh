-- =====================================================================
-- Migration 002 RLS — run after 002_case_management.sql
-- =====================================================================

alter table public.report_notes enable row level security;
alter table public.audit_logs enable row level security;
alter table public.traffic_rules enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- Tighten report mutation: an officer may only update a report that is
-- unassigned or assigned to them; admins/super_admins may update any
-- report. This is the core IDOR guard — without it, any officer could
-- edit any other officer's active case by guessing/enumerating a
-- report id.
-- ─────────────────────────────────────────────────────────────────────

drop policy if exists "reports: staff update" on public.reports;

create policy "reports: admin update any" on public.reports
  for update using (public.is_admin()) with check (public.is_admin());

create policy "reports: officer update unassigned or own" on public.reports
  for update using (
    public.current_role() = 'officer' and (officer_id is null or officer_id = auth.uid())
  ) with check (
    public.current_role() = 'officer' and (officer_id is null or officer_id = auth.uid())
  );

-- ─────────────────────────────────────────────────────────────────────
-- report_notes — internal to staff only; never exposed to the
-- reporting citizen, registered or otherwise.
-- ─────────────────────────────────────────────────────────────────────

create policy "notes: staff read" on public.report_notes
  for select using (public.is_staff());

create policy "notes: staff insert own" on public.report_notes
  for insert with check (public.is_staff() and author_id = auth.uid());

-- No update/delete policy — notes are append-only by design.

-- ─────────────────────────────────────────────────────────────────────
-- audit_logs — append-only, staff-readable, and only insertable as
-- yourself (actor_id must equal the caller's own uid, so nobody can
-- forge an entry attributing an action to someone else).
-- ─────────────────────────────────────────────────────────────────────

create policy "audit: staff read" on public.audit_logs
  for select using (public.is_staff());

create policy "audit: staff insert as self" on public.audit_logs
  for insert with check (public.is_staff() and actor_id = auth.uid());

-- No update/delete policy anywhere — audit_logs is immutable from the
-- application's perspective. Only a database superuser (never exposed
-- through the API) could alter it.

-- ─────────────────────────────────────────────────────────────────────
-- traffic_rules — public read (citizens should be able to see what a
-- violation actually means/costs), admin write.
-- ─────────────────────────────────────────────────────────────────────

create policy "rules: public read active" on public.traffic_rules
  for select using (is_active or public.is_staff());

create policy "rules: admin write" on public.traffic_rules
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────
-- spam_flags — allow staff to create flags (in addition to the
-- Milestone 1 "staff manage" policy which already covers update),
-- with flagged_by pinned to the caller.
-- ─────────────────────────────────────────────────────────────────────

create policy "spam flags: staff insert as self" on public.spam_flags
  for insert with check (public.is_staff() and (flagged_by is null or flagged_by = auth.uid()));

-- ─────────────────────────────────────────────────────────────────────
-- Secure evidence retrieval — signed URLs, generated server-side only
-- ─────────────────────────────────────────────────────────────────────
-- report_evidence rows already restrict SELECT to staff or the
-- reporting citizen (Milestone 1). The actual files live in the
-- private 'report-evidence' bucket with no public/anon read policy,
-- so a raw storage URL is never usable — evidence can only be viewed
-- via a short-lived signed URL minted by the getEvidenceSignedUrl
-- server action (src/app/officer/actions.ts), which re-checks role
-- and report access before calling storage.createSignedUrl().

-- ─────────────────────────────────────────────────────────────────────
-- Officer/citizen-facing report views must never leak anonymous
-- reporter identity. There is none to leak (reporter_id, contact_*
-- are enforced null for anonymous reports by the Milestone 1 check
-- constraint) — this view exists so application code can select from
-- it instead of the base table when building any endpoint an officer
-- might use for a quick list, as a second line of defense against a
-- future column addition accidentally reintroducing identifying data.
-- ─────────────────────────────────────────────────────────────────────

create or replace view public.reports_officer_safe
with (security_invoker = true) as
select
  id, report_code, mode, status, priority, category_id, vehicle_type, vehicle_registration,
  vehicle_color, vehicle_owner_visible_name, is_illegal_stoppage, route_name,
  stoppage_duration_estimate, latitude, longitude, location_label, district, thana,
  description, officer_id, assigned_by, assigned_at, is_duplicate, duplicate_of_report_id,
  rejection_reason, officer_notes, created_at, updated_at,
  case when mode = 'registered' then reporter_id else null end as reporter_id
from public.reports;

comment on view public.reports_officer_safe is
  'Deliberately omits contact_name/contact_phone/contact_email entirely — officers work reports through report_code and case notes, never direct citizen contact info, keeping anonymous and registered reports handled identically at the UI layer.';

grant select on public.reports_officer_safe to authenticated;
grant select on public.report_status_counts to authenticated;
grant select on public.report_district_counts to authenticated;
