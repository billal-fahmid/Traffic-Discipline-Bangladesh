-- =====================================================================
-- Migration 008 — resolution summary ("what action was taken")
-- Run after 007_profile_self_service.sql
--
-- Distinct from officer_notes (internal working notes, deliberately
-- hidden from anonymous trackers) and rejection_reason (only set on
-- the reject branch): resolution_summary is the one-paragraph,
-- citizen-facing answer to "what did the officer actually do about
-- this?" — set when a case moves to action_taken and readable by the
-- reporter, the assigned officer, and admins once the case is solved.
--
-- A registered citizen already sees it for free via the existing
-- "reports: citizen reads own" RLS policy (row-level, not column-level).
-- Anonymous tracking goes through get_report_by_token instead, which
-- has to be dropped and recreated because its return shape is
-- changing (CREATE OR REPLACE can't add an output column).
-- =====================================================================

alter table public.reports add column if not exists resolution_summary text;

drop function if exists public.get_report_by_token(text, text);

create function public.get_report_by_token(p_report_code text, p_tracking_token text)
returns table (
  report_code text,
  status report_status,
  category_name_en text,
  category_name_bn text,
  district text,
  location_label text,
  created_at timestamptz,
  updated_at timestamptz,
  officer_notes text,
  resolution_summary text
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
    null::text as officer_notes,
    r.resolution_summary
  from public.reports r
  join public.violation_categories c on c.id = r.category_id
  where r.report_code = p_report_code
    and r.tracking_token = p_tracking_token;
$$;

revoke all on function public.get_report_by_token(text, text) from public;
grant execute on function public.get_report_by_token(text, text) to anon, authenticated;
