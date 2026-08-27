-- =====================================================================
-- Traffic Discipline Bangladesh — Core Schema
-- Run in the Supabase SQL editor, or via `supabase db push`.
-- Order matters: extensions → enums → tables → functions → triggers.
-- RLS policies live in rls.sql (run after this file).
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ─────────────────────────────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────────────────────────────

create type user_role as enum ('citizen', 'officer', 'admin', 'super_admin');

create type report_mode as enum ('anonymous', 'registered');

create type report_status as enum (
  'submitted',      -- just came in
  'under_review',   -- an officer has opened it
  'verified',       -- officer confirmed the violation is valid
  'action_taken',   -- fine/notice/enforcement action recorded
  'rejected',       -- insufficient evidence / invalid
  'closed'          -- terminal state, no further action
);

create type evidence_type as enum ('photo', 'video');

create type notification_channel as enum ('in_app', 'email', 'sms');

-- ─────────────────────────────────────────────────────────────────────
-- Profiles (extends auth.users)
-- One row per authenticated user. Anonymous reporters never get a row
-- here — that's the whole point of anonymous reporting.
-- ─────────────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null default 'citizen',
  full_name text,
  phone text,
  nid_number text,                 -- optional, only ever self-reported by registered users
  avatar_url text,
  district text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'One row per Supabase auth user. Role drives dashboard access & RLS.';

-- ─────────────────────────────────────────────────────────────────────
-- Violation categories (seedable, admin-editable)
-- ─────────────────────────────────────────────────────────────────────

create table public.violation_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_en text not null,
  name_bn text not null,
  description_en text,
  description_bn text,
  icon text,                       -- lucide icon name for the UI
  severity smallint not null default 1 check (severity between 1 and 3), -- 1 low .. 3 high
  is_special boolean not null default false, -- e.g. illegal bus stoppage flow
  sort_order smallint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- Reports
-- ─────────────────────────────────────────────────────────────────────

create table public.reports (
  id uuid primary key default gen_random_uuid(),

  -- Human-facing identifiers. report_code is public (e.g. TDB-2026-483920).
  -- tracking_token is the secret required to look the report up anonymously.
  report_code text not null unique,
  tracking_token text not null unique,

  mode report_mode not null,
  reporter_id uuid references public.profiles (id) on delete set null, -- null when anonymous
  status report_status not null default 'submitted',

  category_id uuid not null references public.violation_categories (id),

  -- Vehicle info — all optional; anonymous or unclear-plate reports are still valid.
  vehicle_type text,
  vehicle_registration text,
  vehicle_color text,
  vehicle_owner_visible_name text,   -- e.g. company name painted on a bus, not a person

  -- Special illegal bus / passenger pickup-drop-off flow
  is_illegal_stoppage boolean not null default false,
  route_name text,                   -- e.g. "Gabtoli–Motijheel"
  stoppage_duration_estimate text,   -- free text: "~5 minutes", "blocked a full lane" etc.

  -- Location
  latitude double precision,
  longitude double precision,
  location_label text,               -- human-readable address / landmark
  district text,
  thana text,

  description text,

  -- Contact info, ONLY ever populated for registered/consenting reporters.
  -- Never required — enforced at the application layer and by the
  -- check constraint below for anonymous reports.
  contact_name text,
  contact_phone text,
  contact_email text,

  -- Anti-spam / audit
  submitted_ip_hash text,            -- hashed, never raw IP
  user_agent text,

  officer_id uuid references public.profiles (id) on delete set null, -- assigned officer
  officer_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint anonymous_has_no_contact_info check (
    mode <> 'anonymous'
    or (contact_name is null and contact_phone is null and contact_email is null and reporter_id is null)
  )
);

create index reports_status_idx on public.reports (status);
create index reports_category_idx on public.reports (category_id);
create index reports_reporter_idx on public.reports (reporter_id);
create index reports_created_at_idx on public.reports (created_at desc);
create index reports_district_idx on public.reports (district);
create index reports_location_idx on public.reports (latitude, longitude);

comment on column public.reports.tracking_token is
  'Opaque secret shown once at submission time. Required (in addition to report_code) to look up an anonymous report — the code alone is not enough.';

-- ─────────────────────────────────────────────────────────────────────
-- Evidence (photos / videos), stored in Supabase Storage; this table
-- just holds pointers + metadata.
-- ─────────────────────────────────────────────────────────────────────

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  type evidence_type not null,
  storage_path text not null,        -- path within the 'report-evidence' bucket
  file_size_bytes bigint,
  mime_type text,
  width smallint,
  height smallint,
  duration_seconds smallint,         -- for video
  created_at timestamptz not null default now()
);

create index report_evidence_report_idx on public.report_evidence (report_id);

-- ─────────────────────────────────────────────────────────────────────
-- Status history — append-only audit trail
-- ─────────────────────────────────────────────────────────────────────

create table public.report_status_history (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports (id) on delete cascade,
  from_status report_status,
  to_status report_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create index report_status_history_report_idx on public.report_status_history (report_id);

-- ─────────────────────────────────────────────────────────────────────
-- Notifications
-- ─────────────────────────────────────────────────────────────────────

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade, -- null = anonymous, delivered via tracking token page only
  report_id uuid references public.reports (id) on delete cascade,
  channel notification_channel not null default 'in_app',
  title text not null,
  body text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_recipient_idx on public.notifications (recipient_id, is_read);

-- ─────────────────────────────────────────────────────────────────────
-- Rate limiting / anti-spam ledger
-- One row per (identity, window). identity is an IP hash for anonymous
-- submissions or a user id for registered ones. Cleaned up periodically.
-- ─────────────────────────────────────────────────────────────────────

create table public.rate_limit_events (
  id bigint generated always as identity primary key,
  identity_key text not null,        -- 'ip:<hash>' or 'user:<uuid>'
  action text not null,               -- e.g. 'report_submit'
  created_at timestamptz not null default now()
);

create index rate_limit_events_lookup_idx on public.rate_limit_events (identity_key, action, created_at desc);

-- Flagged submissions for manual anti-spam review (honeypot hits, burst
-- detection, disposable-content heuristics, etc.)
create table public.spam_flags (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────
-- updated_at trigger helper
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- Auto-log status transitions into report_status_history
create or replace function public.log_report_status_change()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, new.officer_id);
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.report_status_history (report_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, new.officer_id);
  end if;
  return new;
end;
$$;

create trigger reports_log_status_change
  after insert or update on public.reports
  for each row execute function public.log_report_status_change();

-- Create a profile row automatically when someone signs up via Supabase Auth
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data ->> 'full_name', 'citizen')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- ─────────────────────────────────────────────────────────────────────
-- Report code / tracking token generation
-- Format: TDB-<year>-<6 random digits>, collision-checked.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.generate_report_code()
returns text
language plpgsql
as $$
declare
  candidate text;
  year_part text := to_char(now(), 'YYYY');
begin
  loop
    candidate := 'TDB-' || year_part || '-' || lpad(floor(random() * 1000000)::text, 6, '0');
    exit when not exists (select 1 from public.reports where report_code = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.generate_tracking_token()
returns text
language sql
-- search_path pinned so gen_random_bytes (pgcrypto, in the `extensions`
-- schema on Supabase) resolves even when this runs inside another
-- SECURITY DEFINER function that set its own search_path.
set search_path = extensions, public
as $$
  -- URL-safe token; translate() instead of the 'base64url' encoding, which
  -- only exists in Postgres 18+. gen_random_bytes(18) yields 24 base64 chars
  -- with no '=' padding, so +/ -> -_ is all that's needed.
  select translate(encode(gen_random_bytes(18), 'base64'), '+/', '-_');
$$;

-- Wire the generators up as column defaults now that both functions
-- exist, so a plain INSERT with no report_code/tracking_token "just
-- works" from the app layer.
alter table public.reports alter column report_code set default public.generate_report_code();
alter table public.reports alter column tracking_token set default public.generate_tracking_token();
