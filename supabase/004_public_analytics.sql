-- =====================================================================
-- Migration 004 — Public Dashboard, Traffic Map & Hotspots
-- Run after 003_seed_case_management.sql.
--
-- Everything here is intentionally exposed through narrow, aggregate-
-- or-sanitized SECURITY DEFINER functions rather than granting anon
-- any direct SELECT on `reports`. That table stays exactly as locked
-- down as Milestones 1–2 left it — nobody outside staff (or a citizen
-- viewing their own rows) can ever query it directly. Three privacy
-- rules apply throughout this file:
--
--   1. Only statuses that mean "an officer confirmed this violation
--      actually happened" are ever counted as "verified" or shown on
--      the public map/hotspots. A raw, unverified citizen report is
--      never surfaced publicly as if it were a confirmed violation —
--      that would risk publicly implicating an unverified vehicle/
--      location before any human review.
--   2. No row-level public output ever includes reporter identity,
--      vehicle registration/plate, description text, or officer
--      notes — categories, rough coordinates, district, and dates
--      only.
--   3. Coordinates returned to the public are rounded (never the
--      exact submitted GPS pin), and hotspot clusters require a
--      minimum report count before they're returned at all — a
--      cluster of one is noise, not a "hotspot," and showing it
--      could de-anonymize a single incident.
-- =====================================================================

-- Statuses that represent a violation an officer has confirmed at some
-- point in its lifecycle (even if it has since moved further along,
-- e.g. to action_taken/closed). Kept as a SQL function so every query
-- below stays in sync if the workflow changes.
create or replace function public.confirmed_statuses()
returns report_status[]
language sql immutable
as $$
  select array['verified', 'assigned', 'action_recommended', 'action_taken', 'closed']::report_status[];
$$;

-- ─────────────────────────────────────────────────────────────────────
-- Public dashboard stats — one round trip, one jsonb payload.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.get_public_dashboard_stats()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'total_reports', (select count(*) from public.reports where status <> 'duplicate'),
    'verified_reports', (select count(*) from public.reports where status = any (public.confirmed_statuses())),
    'reports_this_week', (
      select count(*) from public.reports
      where status <> 'duplicate' and created_at >= date_trunc('week', now())
    ),
    'reports_this_month', (
      select count(*) from public.reports
      where status <> 'duplicate' and created_at >= date_trunc('month', now())
    ),
    'common_violations', (
      select coalesce(jsonb_agg(row_to_json(x) order by x.count desc), '[]'::jsonb)
      from (
        select c.slug, c.name_en, c.name_bn, count(*) as count
        from public.reports r
        join public.violation_categories c on c.id = r.category_id
        where r.status <> 'duplicate'
        group by c.slug, c.name_en, c.name_bn
        order by count(*) desc
        limit 10
      ) x
    ),
    'vehicle_type_stats', (
      select coalesce(jsonb_agg(row_to_json(x) order by x.count desc), '[]'::jsonb)
      from (
        select vehicle_type, count(*) as count
        from public.reports
        where vehicle_type is not null and vehicle_type <> ''
          and status = any (public.confirmed_statuses())
        group by vehicle_type
        order by count(*) desc
        limit 10
      ) x
    ),
    'bus_related_count', (
      select count(*) from public.reports r
      join public.violation_categories c on c.id = r.category_id
      where r.status = any (public.confirmed_statuses())
        and (c.slug = 'illegal-bus-stoppage' or r.vehicle_type ilike '%bus%')
    ),
    'illegal_stopping_count', (
      select count(*) from public.reports
      where status = any (public.confirmed_statuses()) and is_illegal_stoppage = true
    )
  );
$$;

revoke all on function public.get_public_dashboard_stats() from public;
grant execute on function public.get_public_dashboard_stats() to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Public map points — individual confirmed-violation markers.
-- Coordinates rounded to ~11m (4 decimal places); no plate, no
-- description, no reporter/vehicle-owner info.
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.get_public_violation_points(
  p_category_slug text default null,
  p_district text default null
)
returns table (
  latitude double precision,
  longitude double precision,
  category_slug text,
  category_name_en text,
  category_name_bn text,
  district text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select
    round(r.latitude::numeric, 4)::double precision,
    round(r.longitude::numeric, 4)::double precision,
    c.slug, c.name_en, c.name_bn, r.district, r.created_at
  from public.reports r
  join public.violation_categories c on c.id = r.category_id
  where r.status = any (public.confirmed_statuses())
    and r.latitude is not null and r.longitude is not null
    and (p_category_slug is null or c.slug = p_category_slug)
    and (p_district is null or r.district = p_district)
  order by r.created_at desc
  limit 2000;
$$;

revoke all on function public.get_public_violation_points(text, text) from public;
grant execute on function public.get_public_violation_points(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────
-- Hotspots — confirmed violations grid-clustered to roughly
-- intersection scale (~275m cells), with a minimum cluster size so a
-- single confirmed incident never appears on its own as a "hotspot."
-- ─────────────────────────────────────────────────────────────────────

create or replace function public.get_hotspots(
  p_category_slug text default null,
  p_min_count int default 3
)
returns table (
  grid_lat double precision,
  grid_lng double precision,
  location_name text,
  district text,
  total_count bigint,
  risk_level text,
  top_violations jsonb
)
language sql
security definer
set search_path = public
stable
as $$
  with grid as (
    select
      (round((r.latitude / 0.0025)::numeric) * 0.0025)::double precision as glat,
      (round((r.longitude / 0.0025)::numeric) * 0.0025)::double precision as glng,
      r.location_label, r.district, c.name_en
    from public.reports r
    join public.violation_categories c on c.id = r.category_id
    where r.status = any (public.confirmed_statuses())
      and r.latitude is not null and r.longitude is not null
      and (p_category_slug is null or c.slug = p_category_slug)
  ),
  clustered as (
    select
      glat, glng,
      count(*) as total_count,
      mode() within group (order by location_label) as location_name,
      mode() within group (order by district) as district
    from grid
    group by glat, glng
    having count(*) >= greatest(p_min_count, 1)
  ),
  violation_counts as (
    select glat, glng, name_en, count(*) as cnt
    from grid
    group by glat, glng, name_en
  ),
  ranked as (
    select *, row_number() over (partition by glat, glng order by cnt desc) as rn
    from violation_counts
  ),
  top4 as (
    select glat, glng, jsonb_agg(jsonb_build_object('name', name_en, 'count', cnt) order by cnt desc) as top_violations
    from ranked
    where rn <= 4
    group by glat, glng
  )
  select
    c.glat, c.glng,
    coalesce(nullif(c.location_name, ''), c.district, 'Unnamed location') as location_name,
    c.district,
    c.total_count,
    case
      when c.total_count >= 80 then 'high'
      when c.total_count >= 25 then 'medium'
      else 'low'
    end as risk_level,
    t.top_violations
  from clustered c
  join top4 t on t.glat = c.glat and t.glng = c.glng
  order by c.total_count desc
  limit 200;
$$;

revoke all on function public.get_hotspots(text, int) from public;
grant execute on function public.get_hotspots(text, int) to anon, authenticated;
