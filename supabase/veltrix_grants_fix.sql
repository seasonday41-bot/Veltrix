-- VELTRIX Data API permission fix
-- Supabase projects created/configured with automatic grants disabled require
-- explicit table/view privileges even when service_role bypasses RLS.
-- Backend only: no anon/authenticated grants are added here.

grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.veltrix_markets,
  public.veltrix_market_aliases,
  public.veltrix_market_results,
  public.veltrix_import_batches,
  public.veltrix_prediction_snapshots,
  public.veltrix_forward_audit,
  public.veltrix_engine_settings
  to service_role;

grant select on table
  public.veltrix_latest_20,
  public.veltrix_latest_10
  to service_role;

grant execute on function public.veltrix_touch_updated_at() to service_role;
grant execute on function public.veltrix_prune_market_results_20() to service_role;

-- Keep browser roles closed. VELTRIX accesses Supabase only through Vercel API routes.
revoke all on table
  public.veltrix_markets,
  public.veltrix_market_aliases,
  public.veltrix_market_results,
  public.veltrix_import_batches,
  public.veltrix_prediction_snapshots,
  public.veltrix_forward_audit,
  public.veltrix_engine_settings
  from anon, authenticated;

revoke all on table
  public.veltrix_latest_20,
  public.veltrix_latest_10
  from anon, authenticated;

notify pgrst, 'reload schema';

-- Verification. Run as postgres in SQL Editor; these rows should return true.
select
  has_table_privilege('service_role','public.veltrix_markets','SELECT') as markets_select,
  has_table_privilege('service_role','public.veltrix_market_results','SELECT') as results_select,
  has_table_privilege('service_role','public.veltrix_market_results','INSERT') as results_insert,
  has_table_privilege('service_role','public.veltrix_prediction_snapshots','INSERT') as snapshots_insert,
  has_table_privilege('service_role','public.veltrix_latest_10','SELECT') as latest10_select;
