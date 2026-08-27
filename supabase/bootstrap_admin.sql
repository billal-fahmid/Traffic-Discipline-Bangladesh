-- =====================================================================
-- One-time bootstrap of the first super_admin.
--
-- public.profiles has a BEFORE UPDATE trigger
-- (profiles_enforce_role_authority) that only lets an EXISTING
-- super_admin grant 'admin' / 'super_admin'. Before the first one exists
-- that's a chicken-and-egg.
--
-- The trigger is UPDATE-only, so the simplest bootstrap is to replace
-- the row (delete + insert) rather than update it. Run this once in the
-- Supabase SQL editor. Afterwards every further role change goes through
-- /admin/officers in the app.
-- =====================================================================

delete from public.profiles
where id = (select id from auth.users where email = 'admin@tdb.test');

insert into public.profiles (id, full_name, role)
values (
  (select id from auth.users where email = 'admin@tdb.test'),
  'TDB Admin',
  'super_admin'
);

-- Optional — promote your own personal account too:
-- delete from public.profiles
-- where id = (select id from auth.users where email = 'officialbillal103@gmail.com');
-- insert into public.profiles (id, full_name, role)
-- values ((select id from auth.users where email = 'officialbillal103@gmail.com'), 'test', 'super_admin');

select u.email, p.role
from public.profiles p join auth.users u on u.id = p.id
order by p.role;
