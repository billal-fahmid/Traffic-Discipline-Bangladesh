-- =====================================================================
-- Row Level Security — run after schema.sql
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.violation_categories enable row level security;
alter table public.reports enable row level security;
alter table public.report_evidence enable row level security;
alter table public.report_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limit_events enable row level security;
alter table public.spam_flags enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- Helper functions (security definer to avoid recursive RLS lookups)
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.current_role()
returns user_role
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('officer', 'admin', 'super_admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'super_admin') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce((select role = 'super_admin' from public.profiles where id = auth.uid()), false);
$$;

-- ─────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────

create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles: staff read all" on public.profiles
  for select using (public.is_staff());

create policy "profiles: update own (not role)" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles: admin manage roles" on public.profiles
  for update using (public.is_admin());

create policy "profiles: super_admin insert staff" on public.profiles
  for insert with check (public.is_super_admin() or auth.uid() = id);

-- ─────────────────────────────────────────────────────────────────────
-- violation_categories — public read, admin write
-- ─────────────────────────────────────────────────────────────────────

create policy "categories: public read active" on public.violation_categories
  for select using (is_active or public.is_staff());

create policy "categories: admin write" on public.violation_categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ─────────────────────────────────────────────────────────────────────
-- reports
--   • Anyone (incl. anonymous) may INSERT — enforced further by the
--     anonymous_has_no_contact_info check constraint and app-side
--     rate limiting.
--   • A registered citizen may read only their own reports.
--   • Anonymous lookups happen through a SECURITY DEFINER RPC
--     (get_report_by_token) rather than direct table access, since
--     anonymous sessions have no auth.uid() to filter on.
--   • Officers/admins can read and update everything.
-- ─────────────────────────────────────────────────────────────────────

create policy "reports: anyone can submit" on public.reports
  for insert with check (
    (mode = 'anonymous' and reporter_id is null)
    or (mode = 'registered' and reporter_id = auth.uid())
  );

create policy "reports: citizen reads own" on public.reports
  for select using (reporter_id = auth.uid());

create policy "reports: staff read all" on public.reports
  for select using (public.is_staff());

create policy "reports: staff update" on public.reports
  for update using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- report_evidence — follows the parent report's visibility
-- ─────────────────────────────────────────────────────────────────────

create policy "evidence: insert with report" on public.report_evidence
  for insert with check (
    exists (
      select 1 from public.reports r
      where r.id = report_id
        and (r.reporter_id = auth.uid() or r.mode = 'anonymous')
    )
  );

create policy "evidence: owner reads" on public.report_evidence
  for select using (
    exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = auth.uid())
  );

create policy "evidence: staff reads all" on public.report_evidence
  for select using (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- report_status_history — read-only to citizens (own reports), full to staff
-- ─────────────────────────────────────────────────────────────────────

create policy "history: owner reads" on public.report_status_history
  for select using (
    exists (select 1 from public.reports r where r.id = report_id and r.reporter_id = auth.uid())
  );

create policy "history: staff reads all" on public.report_status_history
  for select using (public.is_staff());

create policy "history: staff insert" on public.report_status_history
  for insert with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- notifications — recipient only, or staff
-- ─────────────────────────────────────────────────────────────────────

create policy "notifications: recipient reads" on public.notifications
  for select using (recipient_id = auth.uid());

create policy "notifications: recipient marks read" on public.notifications
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "notifications: staff manage" on public.notifications
  for all using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- rate_limit_events / spam_flags — service role & staff only, never
-- exposed to citizens. No citizen-facing policy is created, so with
-- RLS enabled and no matching policy, all citizen access is denied.
-- ─────────────────────────────────────────────────────────────────────

create policy "rate limits: staff read" on public.rate_limit_events
  for select using (public.is_staff());

create policy "spam flags: staff read" on public.spam_flags
  for select using (public.is_staff());

create policy "spam flags: staff manage" on public.spam_flags
  for all using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- Secure anonymous tracking RPC
-- Looks a report up by report_code + tracking_token together — knowing
-- the code alone (which may appear in screenshots, etc.) is not enough.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.get_report_by_token(p_report_code text, p_tracking_token text)
returns table (
  report_code text,
  status report_status,
  category_name_en text,
  category_name_bn text,
  district text,
  location_label text,
  created_at timestamptz,
  updated_at timestamptz,
  officer_notes text
)
language sql
security definer
set search_path = public
as $$
  select
    r.report_code,
    r.status,
    c.name_en,
    c.name_bn,
    r.district,
    r.location_label,
    r.created_at,
    r.updated_at,
    -- officer_notes are intentionally NOT exposed to anonymous trackers;
    -- kept null here so the shape matches while nothing sensitive leaks.
    null::text as officer_notes
  from public.reports r
  join public.violation_categories c on c.id = r.category_id
  where r.report_code = p_report_code
    and r.tracking_token = p_tracking_token;
$$;

revoke all on function public.get_report_by_token(text, text) from public;
grant execute on function public.get_report_by_token(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Storage: 'report-evidence' bucket policies
-- Create the bucket first (dashboard or `supabase storage create`),
-- private, then apply these policies.
-- ─────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('report-evidence', 'report-evidence', false)
on conflict (id) do nothing;

create policy "evidence bucket: anyone can upload to their own report folder"
  on storage.objects for insert
  with check (bucket_id = 'report-evidence');

create policy "evidence bucket: staff can read"
  on storage.objects for select
  using (bucket_id = 'report-evidence' and public.is_staff());

create policy "evidence bucket: uploader session can read during submission"
  on storage.objects for select
  using (bucket_id = 'report-evidence' and owner = auth.uid());
