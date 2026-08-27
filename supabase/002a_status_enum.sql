-- =====================================================================
-- Migration 002a — extend report_status with the full case-management
-- workflow. RUN THIS FILE ALONE, as its own statement batch/transaction,
-- BEFORE running 002_case_management.sql. Postgres does not allow a
-- newly-added enum value to be referenced by DDL/DML in the same
-- transaction that added it, so these two files cannot be merged or
-- run together in one paste into the SQL editor.
--
-- Resulting workflow order:
--   submitted → received → under_review → evidence_verification
--     → verified → rejected
--     → assigned → action_recommended → action_taken → closed
--   (duplicate is a separate terminal state reachable from any point)
-- =====================================================================

alter type report_status add value if not exists 'received' after 'submitted';
alter type report_status add value if not exists 'evidence_verification' after 'under_review';
alter type report_status add value if not exists 'assigned' after 'verified';
alter type report_status add value if not exists 'action_recommended' after 'assigned';
alter type report_status add value if not exists 'duplicate' after 'rejected';
