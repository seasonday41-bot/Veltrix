# VELTRIX

Adaptive Number Intelligence — MODE A / MODE B with Forward Tracking.

## Supabase setup

VELTRIX uses the existing Supabase project `six-digit-thai-lao`, but every VELTRIX table/function/view is isolated with the `veltrix_` prefix.

1. Open Supabase → SQL Editor.
2. Open `supabase/veltrix_schema.sql` from this repository.
3. Copy the whole file into a new SQL query.
4. Run it once.

The schema creates:

- `veltrix_markets`
- `veltrix_market_aliases`
- `veltrix_market_results`
- `veltrix_import_batches`
- `veltrix_prediction_snapshots`
- `veltrix_forward_audit`
- `veltrix_engine_settings`
- `veltrix_latest_20` view

### Important data rules

- Markets do not need to draw every day.
- VELTRIX reads the latest **occurrences** for each market, not calendar-day gaps.
- Duplicate key is canonical market + draw date.
- Same market/date/result = duplicate and should be skipped by importer.
- Same market/date but different result = conflict; do not overwrite automatically.
- Market aliases are explicit only; no fuzzy remapping.
- `top3` and `bottom2` are stored as text so leading zeroes are preserved.

## Vercel environment variables

The web app will use server-side API routes. Add these only in Vercel Project Settings → Environment Variables:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never put `SUPABASE_SERVICE_ROLE_KEY` in browser/client JavaScript or commit it to GitHub.

## Planned pages

### Page 1 — Engine

- MODE A: draws 1–3 primary, draws 3–5 support
- MODE B: draws 3–5 primary, draws 1–3 support
- WIN6 + Reserve #7
- Rud top / bottom (1 digit each)
- Shared Rud + support digit when both sides agree
- เจาะ 2 (5 top + 5 bottom internally, one compact UI block)
- เจาะ 3 uses top Pair2 support

### Page 2 — Results / Forward Tracker

Paste a whole daily result block such as:

```text
สรุปผลหวยประจำวันที่ 08 สิงหาคม 2569
787-21 ดาวโจนส์ VIP
161-08 ดาวโจนส์สตาร์
794-56 ลาวกาชาด
```

The importer will parse, match canonical market names, detect duplicates/conflicts, save only new results, settle locked MODE A/B predictions, and prepare the next occurrence from each market's latest history.
