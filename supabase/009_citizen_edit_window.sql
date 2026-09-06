-- =====================================================================
-- Migration 009 — citizen self-edit window
-- Run after 008_resolution_summary.sql
--
-- Lets a registered citizen correct their own report within 10 minutes
-- of filing it (typo in the plate number, wrong district, etc.).
--
-- Deliberately a narrow SECURITY DEFINER RPC rather than a new RLS
-- UPDATE policy on reports: an RLS policy checking only
-- "reporter_id = auth.uid() and created_at > now() - 10m" would still
-- let the client set ANY column in the same UPDATE call (status,
-- officer_id, priority, resolution_summary, ...) since RLS has no
-- concept of "these columns only". This RPC takes explicit typed
-- parameters — the same pattern as create_report — so there's no
-- column a caller can touch beyond what's listed here.
-- =====================================================================

create or replace function public.update_own_report(
  p_report_id uuid,
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
  p_description text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reporter_id uuid;
  v_created_at timestamptz;
begin
  select reporter_id, created_at into v_reporter_id, v_created_at
  from public.reports
  where id = p_report_id
  for update;

  if v_reporter_id is null or v_reporter_id is distinct from auth.uid() then
    raise exception 'You can only edit your own report.';
  end if;

  if v_created_at < now() - interval '10 minutes' then
    raise exception 'The 10-minute edit window has passed.';
  end if;

  update public.reports set
    category_id = p_category_id,
    is_illegal_stoppage = coalesce(p_is_illegal_stoppage, false),
    route_name = p_route_name,
    stoppage_duration_estimate = p_stoppage_duration,
    latitude = p_latitude,
    longitude = p_longitude,
    location_label = p_location_label,
    district = p_district,
    thana = p_thana,
    vehicle_type = p_vehicle_type,
    vehicle_registration = p_vehicle_registration,
    vehicle_color = p_vehicle_color,
    vehicle_owner_visible_name = p_vehicle_owner_visible_name,
    description = p_description
  where id = p_report_id;
end;
$$;

revoke all on function public.update_own_report(
  uuid, uuid, boolean, text, text, double precision, double precision, text, text, text,
  text, text, text, text, text
) from public;
grant execute on function public.update_own_report(
  uuid, uuid, boolean, text, text, double precision, double precision, text, text, text,
  text, text, text, text, text
) to authenticated;
