# VELTRIX — Adaptive Number Intelligence

> ## SOURCE OF TRUTH / CHAT HANDOFF
>
> Read this README before changing Formula, WIN6, World WIN, RUD, Reserve, Pair2, Pair3, Double, Snapshot, Error Memory, Backfill or Supabase behavior.
>
> **Current production target: Adaptive v17 RUD-FIRST + v16 Output Specialists.**

## 1. Connected pipeline

```text
Historical results
  -> Formula evidence
  -> Recent market behavior
  -> Snapshot Error Memory
  -> Adaptive central ranking
  -> Persistent World WIN bonus (assistive only)
  -> RUD AI scores 0-9 per market
  -> RUD FIRST selects 2 digits
  -> FINAL WIN6 = RUD 2 digits + central WIN ranking fills remaining 4
       -> Pair2 Specialist
       -> Pair3 Specialist
       -> Double Specialist
       -> Smart Reserve outside WIN6
  -> Snapshot Lock
  -> Actual result
  -> Settlement / Forward Audit
  -> Error Memory
  -> next prediction
```

### Non-negotiable relationship locks

- FINAL WIN6 = exactly 6 unique digits.
- `WIN6[0] = รูดหลัก` and `WIN6[1] = รูดรอง` in v17.
- รูดหลัก and รูดรอง must be different.
- RUD AI learns independently from market history; it is not merely `win6.slice(0,2)` by origin. In v17 it selects first, then WIN6 is built around those 2 digits.
- Central WIN ranking fills only the remaining 4 WIN6 positions.
- Production Pair2, Pair3 and Double Watch may use only digits inside FINAL WIN6.
- Reserve is the only seventh support digit and must stay outside FINAL WIN6.
- No random selection.

## 2. History rules

- Maximum 20 actual occurrences per market.
- Never read more than 20 rows per market.
- Main RUD learning uses up to 10 completed transitions.
- Transition weights:

```text
[1.15, 1.15, 1.35, 1.35, 1.30, 0.95, 0.82, 0.70, 0.60, 0.52]
```

Transitions 3-5 intentionally carry the strongest weight.

When loading many markets through PostgREST, history must be batched (currently 30 markets/request) so the 1000-row API cap cannot silently truncate a 60-market run.

## 3. Locked formula reference

Input `279-62` must remain:

```text
Formula 1     = 89
Formula 2     = 6
Formula 2.1   = 67
Formula 2.2   = 931
Formula 3-9%  = 251
Formula 3-7%  = 953
Formula 3-6%  = 846
Formula 3-99% = 95
```

Do not change formula definitions without a new walk-forward benchmark and regression update.

## 4. Adaptive central WIN ranking

Candidate Base/Recent mixes:

```text
100/0, 80/20, 60/40, 50/50, 40/60, 20/80
```

The chosen mix is learned per market from recent walk-forward performance.

Validation score:

```text
5/5 -> 10
>=4 -> 4
>=3 -> 1
else -> 0
```

Error Memory remains bounded:

```text
ERROR_MEMORY_WEIGHT = 0.08
```

In v17 central ranking no longer owns all 6 WIN6 slots. RUD takes 2 slots first; central ranking fills the other 4.

## 5. Persistent World WIN

```text
WORLD_WIN_BONUS = 0.10
forced = false
persistent = true
```

World WIN is applied to central rank evidence before RUD-FIRST selection. It is never forced directly into WIN6.

## 6. RUD AI / Percent RUD

RUD evidence includes:

- P56 = 3-top x 56%
- Formula 1
- Formula 2
- Formula 2.1
- Formula 2.2
- Formula 3-9%
- Formula 3-7%
- Formula 3-6%
- Formula 3-99%

Each source/position is learned per market with walk-forward only.

Approximate RUD score:

```text
60% learned all-source evidence
25% P56 evidence
15% central ranking evidence
```

### v17 RUD-FIRST

```text
RUD AI -> choose รูดหลัก / รูดรอง from 0-9
       -> lock those 2 as first two WIN6 members
       -> central rank fills 4 remaining unique digits
```

Implementation label:

```text
RUD_FIRST_WIN6_V17
```

Internal side learning (บน/ล่าง) is still stored for settlement, but customer UI and LINE copy must show only:

```text
รูดหลัก X
รูดรอง Y
```

Do not display side labels to customers.

## 7. Smart Reserve

Reserve remains outside FINAL WIN6. It uses learned P56/all-source evidence with central ranking tie-break/fallback.

Current v17 strategy label:

```text
P56_RUD_RANK_RUD_FIRST_RESERVE
```

The previous central rank #7 is retained internally as `reserveRank7` for audit.

## 8. v16 Output Specialists retained in v17

v17 changes WIN6 construction, but keeps the validated downstream specialists:

```text
PAIR2_POSITION_SPECIALIST_V1
PAIR3_FORMULA_PRIORITY_SPECIALIST_V1
DOUBLE_BALANCED_SPECIALIST_V1
```

Pair2 = 5 sets, Pair3 = 3 sets, Double Watch = 3 digits. Every production output digit must belong to the same FINAL WIN6.

### Pair2 experimental challenger / Reserve battle

Production Pair2 remains `PAIR2_POSITION_SPECIALIST_V1`. Do not replace customer output yet.

Current Pair2 challenger:

```text
PAIR2_V21_EXACT_DNA_3_5
alpha = 0.25
score = 75% V1 position score + 25% exact Pair DNA from occurrences 3-5
```

Historical no-World reference used only to select the challenger: 50 markets / 750 walk-forward cases, V1 any-side hit `137/750 = 18.27%`, V2.1 `147/750 = 19.60%`. This is a historical reference, not a guarantee and not the current Forward policy.

Live Forward battle begins **2026-08-11** with **World WIN enabled equally for V1 and V2.1**. Each target date freezes that day's World WIN, fused WIN6 and Reserve7 before the actual result is inserted.

Battle label:

```text
PAIR2_WORLD_WIN_RESERVE_BATTLE_V1
```

Six variants are locked per market/mode:

```text
v1_a  = V1, 5 pairs from WIN6 only
v1_b  = V1, 4 WIN6 pairs + 1 best Reserve7 pair
v1_c  = V1, 3 WIN6 pairs + up to 2 best Reserve7 pairs
v21_a = V2.1, 5 pairs from WIN6 only
v21_b = V2.1, 4 WIN6 pairs + 1 best Reserve7 pair
v21_c = V2.1, 3 WIN6 pairs + up to 2 best Reserve7 pairs
```

A/B/C differ only in Pair2 selection. They use the same World-WIN-fused prediction state. Reserve pairs are experimental only; they do **not** change the production rule that customer Pair2 must stay inside FINAL WIN6.

Forward settlement measures 2-top, 2-bottom, any side and both sides. Daily comparison uses Mode A by default. Do not promote V2.1 or Reserve B/C to production from a single day; accumulate true forward results first.

Initial 2026-08-11 lock: 60 markets, 120 rows (Mode A 60 + Mode B 60), World WIN frozen as `9631275`.

## 9. Approved v17 walk-forward comparison

Comparable dataset: 60 markets x 20 draws = **900 walk-forward predictions**.

```text
Metric                     v16             v17 RUD-FIRST
WIN6 5/5                   76/900  8.44%   84/900  9.33%
WIN6 >=4/5                 291/900 32.33%  304/900 33.78%
WIN6 >=3/5                 603/900 67.00%  613/900 68.11%
RUD primary hit            39.89%          43.44%
RUD secondary hit          41.67%          41.00%
At least one RUD hits      66.00%          67.44%
Both RUD digits hit        15.56%          17.00%
WIN6 + Reserve 5/5         166/900 18.44%  165/900 18.33%
```

Latest 300 validation targets also improved on WIN6 5/5, >=4/5, at-least-one-RUD and both-RUD metrics. Reserve decreased by one full rescue across 900, while WIN6 itself improved by eight full 5/5 cases.

These are historical walk-forward references, not guarantees of future outcomes.

## 10. Snapshot / Settlement / Error Memory

Current live Snapshot:

```text
adaptive_v17
```

Compatible memory sources, highest priority first:

```text
adaptive_v17
adaptive_v16
adaptive_v15
adaptive_v15_backfill
```

Error Memory:

```text
snapshot_error_memory_v2
```

AUTO LOCK must occur before inserting the incoming actual result.

Settlement stores WIN6 coverage, missing/false-positive digits, Reserve rescue, RUD results, Pair2/Pair3 results, double event/watch result, Drift, Base/Recent weights, formulas, specialist metadata and `rud_first` metadata.

Pair2 Forward Battle is separately locked before actual insertion and automatically settled by a Supabase result-insert trigger. Deleting an actual result resets the linked battle settlement without deleting the pre-result locked battle row.

## 11. Historical Backfill known gap

`api/backfill-learning.js` still does not fully reproduce the current production chain. Do not report old Backfill as a complete v17 reproduction.

A future v17 Backfill must run:

```text
historical rows
 -> calculateVeltrix
 -> approved World WIN policy
 -> RUD-FIRST enhancer
 -> v16 output specialists
 -> adaptive_v17_backfill snapshot
 -> settlement
 -> Error Memory
```

Requirements: true walk-forward, no future leakage, isolated from live snapshots, idempotent, POST-only, Dry Run before write.

## 12. Customer UI / screenshot rules

Visible customer output:

- market
- persistent World WIN input
- WIN6 + Reserve
- รูดหลัก
- รูดรอง
- เจาะ 2 (5 sets)
- เจาะ 3 (3 sets)
- เบิ้ล % + 3 watch digits
- copy

Do not show internal engine-status text such as Adaptive/RUD AI/Reserve Challenger/World/Memory/history in screenshots. `engineStatus` remains hidden.

LINE copy includes WIN6/Reserve, รูดหลัก, รูดรอง, เจาะ2, เจาะ3, เบิ้ล %, เฝ้าเบิ้ล 3 digits and Drift/weight.

Pair2 Forward Battle A/B/C is internal experimental data and must not appear in the customer UI until explicitly promoted.

## 13. Supabase

Core isolated objects:

```text
veltrix_markets
veltrix_market_aliases
veltrix_market_results
veltrix_import_batches
veltrix_prediction_snapshots
veltrix_forward_audit
veltrix_engine_settings
veltrix_latest_20
veltrix_latest_10
veltrix_pair2_forward_battle
veltrix_pair2_forward_daily
```

`veltrix_pair2_forward_battle` stores immutable pre-result A/B/C Pair2 locks plus later settlement. `veltrix_pair2_forward_daily` is the Mode-A daily summary view.

Server-only environment variables:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Never expose the service-role key in browser JavaScript or GitHub.

## 14. Regression locks before every delivery

- formula reference `279-62` exact
- WIN6 has 6 unique digits
- WIN6 first digit = RUD primary
- WIN6 second digit = RUD secondary
- RUD primary != secondary
- Reserve outside WIN6
- production Pair2 digits inside WIN6
- Pair3 digits inside WIN6
- Double Watch digits inside WIN6
- World WIN assistive only / not forced
- Pair2 Forward V1 and V2.1 use the same World-WIN-fused WIN6/Reserve state
- Pair2 Forward A uses WIN6 only; B/C may use Reserve7 only in the experimental table
- Pair2 Forward lock must happen before actual result insertion
- AUTO and manual Snapshot both use `adaptive_v17`
- Error Memory reads v17 > v16 > v15 > v15_backfill
- 60-market history loads must not truncate at PostgREST 1000 rows
- no future leakage
- no random output

## New chat handoff

In a new ChatGPT room:

```text
@GitHub เปิด repo seasonday41-bot/Veltrix อ่าน README.md บน main ก่อนทั้งหมด แล้วทำต่อจาก Source of Truth ในนั้น
```
