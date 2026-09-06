-- =====================================================================
-- Migration 007 — profile self-service (avatar upload + address field)
-- Run after 006_anonymous_submission_fix.sql
--
-- Every registered user (citizen, officer, admin) can already update
-- their own profiles row under "profiles: update own (not role)" in
-- rls.sql. This migration adds the one field that policy didn't have
-- yet (address) and a public "avatars" bucket so a profile photo has
-- somewhere to live — writable only inside the uploader's own folder,
-- readable by anyone (profile photos are shown in officer/admin UI).
-- =====================================================================

alter table public.profiles add column if not exists address text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: owner can upload"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner can replace"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars: owner can delete"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
