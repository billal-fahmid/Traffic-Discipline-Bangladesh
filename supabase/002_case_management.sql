-- =====================================================================
-- Migration 002 — Case Management (Officer + Admin)
-- Run AFTER 002a_status_enum.sql has been committed on its own.
-- Run 002_case_management_rls.sql immediately after this file.
-- =====================================================================

-- ─────────────────────────────────────────────────────────────────────
-- Priority
-- ─────────────────────────────────────────────────────────────────────

create type report_priority as enum ('low', 'medium', 'high', 'urgent');

alter table public.reports
  add column if not exists priority report_priority not null default 'medium';

create index if not exists reports_priority_idx on public.reports (priority);

-- ─────────────────────────────────────────────────────────────────────
-- Duplicates
-- ─────────────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists is_duplicate boolean not null default false,
  add column if not exists duplicate_of_report_id uuid references public.reports (id) on delete set null;

create index if not exists reports_duplicate_of_idx on public.reports (duplicate_of_report_id);

-- ─────────────────────────────────────────────────────────────────────
-- Assignment tracking (officer_id already exists on reports — this adds
-- who assigned it and when, so "self-claimed" vs "admin-assigned" is
-- distinguishable in the case history)
-- ─────────────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists assigned_by uuid references public.profiles (id) on delete set null,
  add column if not exists assigned_at timestamptz;

-- ─────────────────────────────────────────────────────────────────────
-- Rejection reason — kept distinct from the free-form officer_notes so
-- the reason a citizen-visible rejection happened is always structured.
-- ─────────────────────────────────────────────────────────────────────

alter table public.reports
  add column if not exists rejection_reason text;

-- ─────────────────────────────────────────────────────────────────────
-- Report notes — append-only officer/admin case notes. Replaces
-- single-field officer_notes as the primary note surface; officer_notes
-- is kept as a lightweight "latest note" mirror for list views.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create index if not exists report_notes_report_idx on public.report_notes (report_id, created_at desc);

-- Mirror the latest note onto reports.officer_notes for cheap list-view display.
create or replace function public.mirror_latest_note()
returns trigger
language plpgsql
as $$
begin
  update public.reports set officer_notes = new.note where id = new.report_id;
  return new;
end;
$$;

drop trigger if exists report_notes_mirror on public.report_notes;
create trigger report_notes_mirror
  after insert on public.report_notes
  for each row execute function public.mirror_latest_note();

-- ─────────────────────────────────────────────────────────────────────
-- Audit logs — append-only record of every privileged action. Never
-- updated or deleted by the application; inserted exclusively through
-- server-side actions running as the acting staff member's own session
-- (so actor_id is always a real, RLS-checked auth.uid(), never
-- client-supplied).
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,                 -- e.g. 'report.verify', 'report.assign', 'officer.role_change'
  entity_type text not null,            -- e.g. 'report', 'profile', 'violation_category'
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id, created_at desc);
create index if not exists audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- Traffic rule reference library (admin-managed, citizen/officer-visible)
-- ─────────────────────────────────────────────────────────────────────

create table if not exists public.traffic_rules (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,        -- e.g. "MVA-1983-S-XX"
  title_en text not null,
  title_bn text not null,
  description_en text,
  description_bn text,
  category_id uuid references public.violation_categories (id) on delete set null,
  fine_amount_bdt numeric(10, 2),
  legal_reference text,                  -- e.g. "Motor Vehicles Ordinance 1983, Section 140"
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger traffic_rules_set_updated_at
  before update on public.traffic_rules
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- Spam / suspicious report review workflow
-- ─────────────────────────────────────────────────────────────────────

create type spam_flag_status as enum ('pending', 'confirmed_spam', 'dismissed');

alter table public.spam_flags
  add column if not exists status spam_flag_status not null default 'pending',
  add column if not exists flagged_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists reviewed_at timestamptz;

create index if not exists spam_flags_status_idx on public.spam_flags (status);

-- ─────────────────────────────────────────────────────────────────────
-- Fix report_status_history to record the actual acting user
-- (auth.uid()) rather than reports.officer_id, which reflects
-- assignment, not who performed this particular transition.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.log_report_status_change()
returns trigger
language plpgsql
-- security definer: this fires on every report INSERT, including anonymous
-- citizen submissions whose session is not staff. report_status_history has
-- a staff-only INSERT policy, so without definer rights the very first
-- status-history row (and thus the whole report submission) is rejected.
security definer set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Privilege-escalation guard: only a super_admin may promote someone
-- to admin/super_admin, and nobody may change their own role (blocks
-- an admin from quietly self-promoting to super_admin, and blocks any
-- staff member from editing their own row to escalate).
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.enforce_role_change_authority()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    if auth.uid() = old.id then
      raise exception 'You cannot change your own role.';
    end if;
    if new.role in ('admin', 'super_admin') and not public.is_super_admin() then
      raise exception 'Only a super_admin can grant admin or super_admin.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_enforce_role_authority on public.profiles;
create trigger profiles_enforce_role_authority
  before update on public.profiles
  for each row execute function public.enforce_role_change_authority();

-- ─────────────────────────────────────────────────────────────────────
-- Case counts view for the admin overview page — cheap to query,
-- respects nothing on its own (it's a view; RLS on the base tables
-- still applies to whoever queries it, and only staff can query
-- `reports` at all).
-- ─────────────────────────────────────────────────────────────────────

create or replace view public.report_status_counts
with (security_invoker = true) as
select status, count(*) as count
from public.reports
group by status;

create or replace view public.report_district_counts
with (security_invoker = true) as
select coalesce(district, 'Unspecified') as district, count(*) as count
from public.reports
group by district
order by count desc;
