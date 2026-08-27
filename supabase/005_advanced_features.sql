-- =====================================================================
-- Migration 005 — Advanced Reporting + Notification Infrastructure
-- Run after 005a_notification_channel_enum.sql has committed on its own.
-- Run 005_advanced_features_rls.sql immediately after this file.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Evidence file hashing — exact-duplicate detection. Computed
-- client-side (Web Crypto SHA-256, see src/lib/file-hash.ts) before
-- upload and passed alongside the file, so no server-side image
-- decoding is required.
-- ─────────────────────────────────────────────────────────────────────

alter table public.report_evidence
  add column if not exists file_hash text;

create index if not exists report_evidence_file_hash_idx on public.report_evidence (file_hash);

-- ─────────────────────────────────────────────────────────────────────
-- Report quality score — a transparent, rule-based completeness score
-- (0–100), not a validity judgment. Never used to auto-verify or
-- auto-reject anything; it only feeds priority ordering and gives
-- officers a quick signal about how actionable a report looks.
-- ─────────────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists quality_score smallint not null default 0;

create index if not exists reports_quality_score_idx on public.reports (quality_score desc);

create or replace function public.compute_quality_score(p_report_id uuid)
returns smallint
language plpgsql
as $$
declare
  r record;
  evidence_count int;
  score int := 0;
begin
  select * into r from public.reports where id = p_report_id;
  if not found then return 0; end if;

  select count(*) into evidence_count from public.report_evidence where report_id = p_report_id;

  if evidence_count >= 1 then score := score + 30; end if;
  if evidence_count >= 2 then score := score + 10; end if;
  if r.latitude is not null and r.longitude is not null then score := score + 15; end if;
  if r.vehicle_registration is not null and length(trim(r.vehicle_registration)) >= 4 then score := score + 15; end if;
  if r.description is not null and length(trim(r.description)) >= 20 then score := score + 20; end if;
  if r.district is not null and r.thana is not null then score := score + 10; end if;

  return least(score, 100)::smallint;
end;
$$;

create or replace function public.refresh_report_quality_score()
returns trigger
language plpgsql
-- security definer: fires on evidence insert/delete, which an anonymous
-- reporter can do — the follow-up UPDATE on reports must not be blocked by
-- the (staff-only) reports UPDATE policies.
security definer set search_path = public
as $$
declare
  target_report_id uuid;
begin
  target_report_id := coalesce(new.report_id, old.report_id);
  update public.reports set quality_score = public.compute_quality_score(target_report_id) where id = target_report_id;
  return null;
end;
$$;

drop trigger if exists report_evidence_refresh_quality on public.report_evidence;
create trigger report_evidence_refresh_quality
  after insert or delete on public.report_evidence
  for each row execute function public.refresh_report_quality_score();

create or replace function public.set_initial_quality_score()
returns trigger
language plpgsql
as $$
begin
  -- On insert, evidence rows don't exist yet (they're attached in a
  -- second step by the client), so this covers the text/location/
  -- vehicle portion of the score; the evidence trigger above tops it
  -- up moments later once files are attached.
  new.quality_score := public.compute_quality_score(new.id);
  return new;
end;
$$;

-- Fired AFTER insert (needs the row to already exist for compute_quality_score
-- to select it) via a lightweight follow-up update rather than BEFORE INSERT.
create or replace function public.set_initial_quality_score_after_insert()
returns trigger
language plpgsql
-- security definer: an anonymous reporter inserts the row, and this
-- follow-up UPDATE would otherwise be rejected by the staff-only reports
-- UPDATE policies.
security definer set search_path = public
as $$
begin
  update public.reports set quality_score = public.compute_quality_score(new.id) where id = new.id;
  return null;
end;
$$;

drop trigger if exists reports_set_initial_quality_score on public.reports;
create trigger reports_set_initial_quality_score
  after insert on public.reports
  for each row execute function public.set_initial_quality_score_after_insert();

-- ─────────────────────────────────────────────────────────────────────
-- Priority auto-suggestion — derived from the violation category's
-- severity at submission time. Purely a starting point: officers and
-- admins can still change it manually at any time via the existing
-- setPriority action from Milestone 2.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.suggest_initial_priority()
returns trigger
language plpgsql
as $$
declare
  cat_severity smallint;
begin
  select severity into cat_severity from public.violation_categories where id = new.category_id;
  new.priority := case
    when cat_severity = 3 then 'high'
    when cat_severity = 1 then 'low'
    else 'medium'
  end::report_priority;
  return new;
end;
$$;

drop trigger if exists reports_suggest_priority on public.reports;
create trigger reports_suggest_priority
  before insert on public.reports
  for each row execute function public.suggest_initial_priority();

-- ─────────────────────────────────────────────────────────────────────
-- AI-assisted category suggestion — a purely advisory column an
-- officer/admin AI action (src/lib/ai/report-ai.ts) may populate.
-- Never written by a trigger, never read by any status-changing logic.
-- ─────────────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists ai_suggested_category_id uuid references public.violation_categories (id) on delete set null,
  add column if not exists ai_suggestion_note text,
  add column if not exists ai_summary text,
  add column if not exists ai_summary_generated_at timestamptz;

comment on column public.reports.ai_suggested_category_id is
  'Advisory only. Set by an officer/admin explicitly requesting an AI category suggestion — never by an automated process, and never treated as the report''s actual category.';
comment on column public.reports.ai_summary is
  'Advisory only. An AI-generated neutral summary of the report + case notes for officer reference — never a finding, never surfaced to citizens or the public.';

-- ─────────────────────────────────────────────────────────────────────
-- Duplicate detection — geographic + temporal + category clustering,
-- plus exact evidence-file matches. Suggestions are queued for a human
-- (officer) to confirm via the existing markDuplicate action; nothing
-- here marks a report as a duplicate automatically.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.report_duplicate_suggestions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  candidate_report_id uuid not null references public.reports (id) on delete cascade,
  score numeric(4, 3) not null,          -- 0.000–1.000, higher = more likely duplicate
  reason text not null,                  -- e.g. 'same category + location + time window', 'identical evidence file'
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'dismissed')),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint no_self_duplicate check (report_id <> candidate_report_id),
  unique (report_id, candidate_report_id)
);

create index if not exists dup_suggestions_report_idx on public.report_duplicate_suggestions (report_id, status);

create or replace function public.find_possible_duplicates(p_report_id uuid)
returns void
language plpgsql
as $$
declare
  r record;
begin
  select * into r from public.reports where id = p_report_id;
  if not found or r.latitude is null or r.longitude is null then return; end if;

  insert into public.report_duplicate_suggestions (report_id, candidate_report_id, score, reason)
  select
    p_report_id,
    other.id,
    -- Weighted score: location proximity (grid match) + category match +
    -- a bonus if the plate also matches when both are known.
    least(1.0, 0.55
      + case when other.vehicle_registration is not null and r.vehicle_registration is not null
             and lower(other.vehicle_registration) = lower(r.vehicle_registration) then 0.35 else 0 end
      + case when abs(extract(epoch from (other.created_at - r.created_at))) < 3600 then 0.10 else 0 end
    )::numeric(4,3),
    'Same category, nearby location, within 48 hours'
  from public.reports other
  where other.id <> p_report_id
    and other.category_id = r.category_id
    and other.status <> 'duplicate'
    and other.latitude is not null and other.longitude is not null
    and round((other.latitude / 0.0015)::numeric) = round((r.latitude / 0.0015)::numeric)
    and round((other.longitude / 0.0015)::numeric) = round((r.longitude / 0.0015)::numeric)
    and abs(extract(epoch from (other.created_at - r.created_at))) < 172800 -- 48h
  order by other.created_at desc
  limit 5
  on conflict (report_id, candidate_report_id) do nothing;
end;
$$;

create or replace function public.trigger_find_possible_duplicates()
returns trigger
language plpgsql
-- security definer: fires on report insert (anonymous reporters included);
-- writes to report_duplicate_suggestions, which has no INSERT policy.
security definer set search_path = public
as $$
begin
  perform public.find_possible_duplicates(new.id);
  return null;
end;
$$;

drop trigger if exists reports_find_duplicates on public.reports;
create trigger reports_find_duplicates
  after insert on public.reports
  for each row execute function public.trigger_find_possible_duplicates();

-- Exact evidence-file match across different reports.
create or replace function public.detect_duplicate_evidence()
returns trigger
language plpgsql
-- security definer: fires on evidence insert (anonymous reporters included);
-- writes to report_duplicate_suggestions, which has no INSERT policy.
security definer set search_path = public
as $$
declare
  match record;
begin
  if new.file_hash is null then return null; end if;

  for match in
    select distinct report_id from public.report_evidence
    where file_hash = new.file_hash and report_id <> new.report_id
  loop
    insert into public.report_duplicate_suggestions (report_id, candidate_report_id, score, reason)
    values (new.report_id, match.report_id, 0.950, 'Identical evidence file uploaded to another report')
    on conflict (report_id, candidate_report_id) do nothing;
  end loop;
  return null;
end;
$$;

drop trigger if exists report_evidence_detect_duplicate on public.report_evidence;
create trigger report_evidence_detect_duplicate
  after insert on public.report_evidence
  for each row execute function public.detect_duplicate_evidence();

-- ─────────────────────────────────────────────────────────────────────
-- Suspicious activity detection — conservative heuristics that only
-- ever *flag for human review* (via the existing spam_flags table and
-- admin review queue from Milestone 2). Nothing here rejects a report
-- automatically.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.detect_suspicious_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_from_identity int;
  recent_against_plate int;
begin
  -- Rapid-fire submissions from the same (hashed) IP or account.
  if new.submitted_ip_hash is not null then
    select count(*) into recent_from_identity
    from public.reports
    where submitted_ip_hash = new.submitted_ip_hash
      and created_at > now() - interval '10 minutes';
    if recent_from_identity >= 5 then
      insert into public.spam_flags (report_id, reason, status)
      values (new.id, format('Auto-flagged: %s reports from the same submitter in the last 10 minutes.', recent_from_identity), 'pending');
    end if;
  end if;

  -- The same vehicle plate reported repeatedly in a short window can be
  -- either a genuine repeat-offender pattern or targeted harassment of
  -- one vehicle/owner — flagged either way for a human to judge, never
  -- auto-resolved in either direction.
  if new.vehicle_registration is not null and length(trim(new.vehicle_registration)) > 0 then
    select count(*) into recent_against_plate
    from public.reports
    where lower(vehicle_registration) = lower(new.vehicle_registration)
      and created_at > now() - interval '24 hours';
    if recent_against_plate >= 5 then
      insert into public.spam_flags (report_id, reason, status)
      values (new.id, format('Auto-flagged: %s reports against the same plate in 24 hours — review for genuine repeat offense vs. targeted harassment.', recent_against_plate), 'pending');
    end if;
  end if;

  -- Very low-effort submissions (no evidence, minimal description, no
  -- plate) are flagged for a lower-priority manual pass, not rejected.
  if new.description is not null and length(trim(new.description)) < 15
     and new.vehicle_registration is null then
    insert into public.spam_flags (report_id, reason, status)
    values (new.id, 'Auto-flagged: minimal detail (short description, no plate) — may still be valid, needs manual review.', 'pending');
  end if;

  return null;
end;
$$;

drop trigger if exists reports_detect_suspicious on public.reports;
create trigger reports_detect_suspicious
  after insert on public.reports
  for each row execute function public.detect_suspicious_activity();

-- ─────────────────────────────────────────────────────────────────────
-- Push notification subscriptions (Web Push). Delivery itself lives in
-- application code (src/lib/notifications/push.ts) — this table only
-- stores what a citizen's browser handed us via the Push API.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx on public.push_subscriptions (user_id);
