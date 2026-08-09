# VELTRIX

Adaptive Number Intelligence — MODE A / MODE B with Forward Tracking.

## Supabase setup

VELTRIX uses the existing Supabase project `six-digit-thai-lao`, but every VELTRIX table/function/view is isolated with the `veltrix_` prefix.

1. Open Supabase → SQL Editor.
2. Open `supabase/veltrix_schema.sql` from this repository.
3. Copy the whole file into a new SQL query.
4. Run it once.

The schema creates the VELTRIX tables plus two history views:

- `veltrix_latest_20` = rolling stored history
- `veltrix_latest_10` = engine calculation history

### Locked history rules

- Store **maximum 20 actual occurrences per market**.
- When occurrence #21 is inserted, the oldest occurrence for that market is deleted automatically.
- VELTRIX calculations use only the **latest 10 actual occurrences**.
- Markets do not need to draw every day.
- Occurrence order is used, not calendar-day gaps.
- MODE A uses occurrences 1–3 as primary and 3–5 as support.
- MODE B uses occurrences 3–5 as primary and 1–3 as support.
- Duplicate key is canonical market + draw date.
- Same market/date/result = duplicate and importer skips it.
- Same market/date but different result = conflict; never overwrite automatically.
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

- MODE A / MODE B
- WIN6 + Reserve #7
- Rud top / bottom (1 digit each)
- Shared Rud + support digit when both sides agree
- เจาะ 2 (5 top + 5 bottom internally, one compact UI block)
- เจาะ 3 uses top Pair2 support only

### Page 2 — Results / Forward Tracker

Paste a whole daily result block such as:

```text
สรุปผลหวยประจำวันที่ 08 สิงหาคม 2569
787-21 ดาวโจนส์ VIP
161-08 ดาวโจนส์สตาร์
794-56 ลาวกาชาด
```

The importer parses the block, matches canonical market names, detects duplicates/conflicts, saves only new results, settles locked MODE A/B predictions, and then prepares the next occurrence from each market's latest history.
