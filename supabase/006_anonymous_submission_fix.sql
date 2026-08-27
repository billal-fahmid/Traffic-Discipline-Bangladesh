-- =====================================================================
-- Migration 006 — fix anonymous report submission
-- Run after 005_advanced_features_rls.sql
--
-- Two problems made an anonymous (and in practice any) report submission
-- fail with "new row violates row-level security policy":
--
--  1. reports has an INSERT policy for anonymous reporters but no SELECT
--     policy that matches an anonymous row. The submit path does
--     `insert ... returning id, report_code, tracking_token`, and
--     Postgres rejects a RETURNING clause whose row is invisible under
--     the table's SELECT policies. Fixed with a SECURITY DEFINER RPC
--     (create_report) that performs the insert and returns just the
--     three identifiers the client needs — the same pattern already used
--     for anonymous tracking (get_report_by_token).
--
--  2. report_evidence's INSERT policy did `exists (select 1 from reports
--     ...)`, but that sub-select is itself RLS-filtered, so an anonymous
--     session can never see its own just-created report and the evidence
--     insert is refused. Fixed by moving the visibility check into a
--     SECURITY DEFINER helper.
--
-- (The companion trigger-function fixes — log_report_status_change,
--  refresh_report_quality_score, set_initial_quality_score_after_insert,
--  trigger_find_possible_duplicates, detect_duplicate_evidence all needed
--  SECURITY DEFINER too — are folded into 002_case_management.sql and
--  005_advanced_features.sql directly.)
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- create_report — the one write path for a citizen report submission.
-- SECURITY DEFINER so the INSERT + RETURNING is not blocked by the
-- (deliberately narrow) SELECT policies on public.reports.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.create_report(
  p_mode text,
  p_category_id uuid,
  p_is_illegal_stoppage boolean default false,
  p_route_name text default null,
  p_stoppage_duration text default null,
  p_latitude double precision default null,
  p_longitude double precision default null,
  p_location_label text default null,
  p_district text default null,
  p_thana text default null,
  p_vehicle_type text default null,
  p_vehicle_registration text default null,
  p_vehicle_color text default null,
  p_vehicle_owner_visible_name text default null,
  p_description text default null,
  p_contact_name text default null,
  p_contact_phone text default null,
  p_contact_email text default null,
  p_submitted_ip_hash text default null,
  p_user_agent text default null
)
returns table (id uuid, report_code text, tracking_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter uuid;
begin
  if p_mode not in ('anonymous', 'registered') then
    raise exception 'invalid report mode: %', p_mode;
  end if;

  if p_mode = 'registered' then
    v_reporter := auth.uid();
    if v_reporter is null then
      raise exception 'a registered report requires an authenticated session';
    end if;
  else
    v_reporter := null;
  end if;

  return query
  with ins as (
    insert into public.reports (
      mode, reporter_id, category_id, is_illegal_stoppage, route_name,
      stoppage_duration_estimate, latitude, longitude, location_label, district, thana,
      vehicle_type, vehicle_registration, vehicle_color, vehicle_owner_visible_name,
      description, contact_name, contact_phone, contact_email,
      submitted_ip_hash, user_agent
    )
    values (
      p_mode::report_mode, v_reporter, p_category_id, coalesce(p_is_illegal_stoppage, false), p_route_name,
      p_stoppage_duration, p_latitude, p_longitude, p_location_label, p_district, p_thana,
      p_vehicle_type, p_vehicle_registration, p_vehicle_color, p_vehicle_owner_visible_name,
      p_description,
      case when p_mode = 'registered' then p_contact_name  else null end,
      case when p_mode = 'registered' then p_contact_phone else null end,
      case when p_mode = 'registered' then nullif(p_contact_email, '') else null end,
      p_submitted_ip_hash, p_user_agent
    )
    returning reports.id, reports.report_code, reports.tracking_token
  )
  select ins.id, ins.report_code, ins.tracking_token from ins;
end;
$$;

revoke all on function public.create_report(
  text, uuid, boolean, text, text, double precision, double precision, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_report(
  text, uuid, boolean, text, text, double precision, double precision, text, text, text,
  text, text, text, text, text, text, text, text, text, text
) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- report_evidence INSERT — check report accessibility without being
-- caught by the reports SELECT policies.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.report_accepts_evidence(p_report_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.reports r
    where r.id = p_report_id
      and (r.mode = 'anonymous' or r.reporter_id = auth.uid())
  );
$$;

revoke all on function public.report_accepts_evidence(uuid) from public;
grant execute on function public.report_accepts_evidence(uuid) to anon, authenticated;

drop policy if exists "evidence: insert with report" on public.report_evidence;
create policy "evidence: insert with report" on public.report_evidence
  for insert with check (public.report_accepts_evidence(report_id));

-- ─────────────────────────────────────────────────────────────────────
-- Backfill profiles for any auth.users that predate the
-- on_auth_user_created trigger (e.g. accounts created before this
-- schema was applied). Without a profiles row, a registered report's
-- reporter_id FK (reports_reporter_id_fkey -> profiles.id) fails.
-- ─────────────────────────────────────────────────────────────────────

insert into public.profiles (id, full_name, role)
select u.id, u.raw_user_meta_data ->> 'full_name', 'citizen'
from auth.users u
on conflict (id) do nothing;
