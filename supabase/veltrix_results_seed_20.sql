-- DEPRECATED / DO NOT RUN
--
-- The original 62-market seed in this file was built from a bad historical mapping
-- and is intentionally disabled so it cannot corrupt VELTRIX history again.
--
-- Authoritative replacement:
--   supabase/veltrix_master_actual_60_restore.sql
--
-- That restore uses the user's actual-result source set, consolidates Hong Kong VIP
-- to 60 real active markets, resets stale VELTRIX predictions/audits, and loads the
-- latest 20 actual occurrences per market (1,200 rows total).

do $$
begin
  raise exception 'Deprecated VELTRIX seed. Run supabase/veltrix_master_actual_60_restore.sql instead.';
end $$;
