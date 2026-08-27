-- =====================================================================
-- Migration 005a — add 'push' to notification_channel.
-- RUN THIS FILE ALONE, before 005_advanced_features.sql, for the same
-- reason as 002a_status_enum.sql: Postgres won't let a newly-added
-- enum value be referenced in the same transaction that added it.
-- =====================================================================

alter type notification_channel add value if not exists 'push';
