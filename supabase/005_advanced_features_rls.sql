-- =====================================================================
-- Migration 005 RLS — run after 005_advanced_features.sql
-- =====================================================================

alter table public.report_duplicate_suggestions enable row level security;
alter table public.push_subscriptions enable row level security;

-- ─────────────────────────────────────────────────────────────────────
-- report_duplicate_suggestions — staff only, same as report_notes.
-- Inserted exclusively by the SQL triggers in 005_advanced_features.sql
-- (which run as the table owner and so aren't blocked by the absence
-- of an INSERT policy here); officers/admins only ever read and
-- confirm/dismiss.
-- ─────────────────────────────────────────────────────────────────────

create policy "dup suggestions: staff read" on public.report_duplicate_suggestions
  for select using (public.is_staff());

create policy "dup suggestions: staff update" on public.report_duplicate_suggestions
  for update using (public.is_staff()) with check (public.is_staff());

-- ─────────────────────────────────────────────────────────────────────
-- push_subscriptions — a citizen manages only their own device
-- subscriptions. Never readable by anyone else, including staff — a
-- push endpoint is a direct channel to someone's device and has no
-- legitimate case-management use.
-- ─────────────────────────────────────────────────────────────────────

create policy "push subs: own read" on public.push_subscriptions
  for select using (user_id = auth.uid());

create policy "push subs: own insert" on public.push_subscriptions
  for insert with check (user_id = auth.uid());

create policy "push subs: own delete" on public.push_subscriptions
  for delete using (user_id = auth.uid());
