# VELTRIX — Adaptive Number Intelligence

> ## SOURCE OF TRUTH / CHAT HANDOFF
>
> Read this README before changing Formula, WIN6, World WIN, RUD, Reserve, Pair2, Pair3, Double, Snapshot, Error Memory, Backfill or Supabase behavior.
>
> **Current release target:** Adaptive v16 + Linked RUD AI + Smart Reserve + Persistent World WIN + Output Specialists.

---

## 1. One connected deterministic pipeline

```text
Historical results
  -> Formula evidence
  -> Recent market behavior
  -> Snapshot Error Memory
  -> Adaptive Ranking
  -> Persistent World WIN Fusion (bonus only)
  -> FINAL WIN6
       -> Linked RUD AI -> รูดหลัก / รูดรอง
       -> Pair2 Specialist -> เจาะ 2 (5 sets)
       -> Pair3 Specialist -> เจาะ 3 (3 sets)
       -> Double Specialist -> เบิ้ล % + 3 watch digits
       -> Smart Reserve -> one digit outside WIN6
  -> Snapshot Lock
  -> Actual result
  -> Settlement / Forward Audit
  -> Error Memory
  -> next prediction
```

### Non-negotiable relationship locks

- FINAL WIN6 = exactly 6 unique digits.
- RUD AI may score 0-9 internally, but actual รูดหลัก/รูดรอง must be inside FINAL WIN6 and different.
- Pair2, Pair3 and Double Watch may use only digits inside the same FINAL WIN6.
- Reserve is the only seventh support digit and must stay outside FINAL WIN6.
- RUD/Pair/Double evidence may influence their own specialist decision but must never inject an outside digit into WIN6.
- No random selection anywhere.

---

## 2. History rules

- Store maximum **20 actual occurrences per market**.
- Never read more than 20 rows per market.
- Calculations are occurrence-based, not calendar-gap based.
- `top3` and `bottom2` are text so leading zeroes survive.
- Same canonical market + date + same result = duplicate/skip.
- Same market + date but different result = conflict; never overwrite automatically.
- Market aliases are explicit only.

### RUD learning window

RUD uses up to 10 completed transitions, weighted:

```text
[1.15, 1.15, 1.35, 1.35, 1.30, 0.95, 0.82, 0.70, 0.60, 0.52]
```

Transitions 3-5 intentionally carry the strongest weight.

---

## 3. Locked formula family

Regression reference `279-62` must remain:

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

Do not change formula definitions without a new comparable walk-forward test and regression update.

---

## 4. Adaptive WIN6 core — unchanged in v16

Candidate Base / Recent mixes:

```text
100/0, 80/20, 60/40, 50/50, 40/60, 20/80
```

Per-market mix selection uses the market's latest 3 completed walk-forward predictions.

Validation score:

```text
5/5 -> 10
>=4 -> 4
>=3 -> 1
else -> 0
```

Recent evidence includes formula reliability, recent digit presence and source-to-next persistence.

Error Memory correction remains bounded:

```text
ERROR_MEMORY_WEIGHT = 0.08
```

**v16 does not change WIN6 ranking logic.**

---

## 5. Persistent World WIN / วินรอบโลก

```text
WORLD_WIN_BONUS = 0.10
forced = false
persistent = true
```

- Persists until changed/cleared.
- Used across markets.
- Applied before Linked RUD selection.
- Bonus only; never forced into WIN6.

Order:

```text
calculateVeltrix(core)
  -> applyWorldWinFusion(...)
  -> enhanceVeltrixWithRud(...)
```

---

## 6. Linked RUD AI — unchanged in v16

RUD is not `win6.slice(0,2)`.

Evidence includes Percent RUD `3-top x 56%` plus Formula 1, 2, 2.1, 2.2, 3-9%, 3-7%, 3-6%, 3-99%, learned by source/position per market using walk-forward only.

Current linked score is approximately:

```text
60% all-source learned evidence
25% P56 evidence
15% central rank evidence
```

Final selection is still constrained to FINAL WIN6:

```text
Rud Primary   = strongest eligible RUD candidate inside WIN6
Rud Secondary = next strongest different candidate inside WIN6
```

Internal side learning (top/bottom) is still stored for settlement, but **customer UI and LINE copy show only `รูดหลัก` and `รูดรอง`; do not display บน/ล่าง.**

Implementation:

```text
RUD_AI_P56_MARKET_LINKED_WIN6_V2
relationshipLocked = true
```

---

## 7. Smart Reserve — unchanged in v16

Reserve remains outside FINAL WIN6.

Strategy:

1. Evaluate digits outside WIN6.
2. Prefer learned P56 evidence.
3. Use all-source RUD evidence + central rank as tie-break/fallback.
4. Keep original central rank #7 internally as `reserveRank7` for audit.

```text
P56_RUD_RANK_LINKED_RESERVE
```

Comparable 900 walk-forward predictions:

```text
WIN6 5/5                         76/900 = 8.44%
WIN6 + plain rank #7            134/900 = 14.89%
WIN6 + Smart Reserve            166/900 = 18.44%
```

18.44% is WIN6+Reserve seven-digit coverage, not WIN6 accuracy.

---

## 8. Adaptive v16 Output Specialists

v16 changes only Pair2, Pair3 and Double Watch. WIN6, Smart Reserve and Linked RUD remain unchanged.

### Pair2 Specialist

```text
PAIR2_POSITION_SPECIALIST_V1
```

- Builds candidates only from FINAL WIN6.
- Scores exact two-digit task from top-last2 + bottom positional probability.
- Keeps 5 deterministic non-reversed duplicate sets.
- Does not use unrelated bonuses that reduced exact Pair2 performance.

### Pair3 Specialist

```text
PAIR3_FORMULA_PRIORITY_SPECIALIST_V1
```

Formula candidate priority:

```text
สูตร 3-6%
สูตร 3-9%
สูตร 3-99%
สูตร 2.2
สูตร 3-7%
```

- Formula output must be exactly 3 digits and every digit must be inside FINAL WIN6.
- Deduplicate by digit multiset.
- If fewer than 3 candidates survive, fill deterministically with the previous linked triple scorer.

### Double Specialist

```text
DOUBLE_BALANCED_SPECIALIST_V1
```

The existing double probability % is retained. Only the 3 watch digits are specialized.

Watch score combines:

```text
25% recent double history
30% Formula 2 / 2.1 / 2.2 support
30% central ranking
```

Every watch digit must be inside FINAL WIN6.

### v16 comparable benchmark

Dataset: 60 markets x 20 draws, **900 walk-forward predictions**.
Experiment split: 600 older predictions for selection + 300 latest predictions for validation.

```text
WIN6 5/5                         76/900 -> 76/900   unchanged
WIN6 + Smart Reserve            166/900 -> 166/900 unchanged
Linked RUD                      unchanged

Pair2 exact top/bottom any       79/900 -> 91/900
Pair2 exact top                  45/900 -> 53/900
Pair2 exact bottom               37/900 -> 39/900
Pair3 exact top3                  5/900 ->  9/900
Double watch catch              97/307 -> 106/307
```

The selected specialists also improved on the latest 300 validation predictions, not only the older selection segment.

---

## 9. Snapshot / Settlement / Error Memory

Current live Snapshot:

```text
adaptive_v16
```

Compatible previous live Snapshot:

```text
adaptive_v15
```

Historical Backfill currently retained:

```text
adaptive_v15_backfill
```

Error Memory:

```text
snapshot_error_memory_v2
```

Memory priority for the same target:

```text
adaptive_v16 > adaptive_v15 > adaptive_v15_backfill
```

Live settlement stores WIN6 coverage, missing/false-positive digits, Reserve rescue, RUD results, Pair2/Pair3 outcomes, double event/watch result, Drift, weights, formulas and specialist metadata.

---

## 10. Historical Backfill — KNOWN GAP

`api/backfill-learning.js` still contains legacy v14-era confirmation/metadata and does not yet reproduce the complete live order of World WIN -> Linked RUD -> v16 Output Specialists.

Therefore **do not report the existing Backfill as a full v16 production reproduction.**

Future Backfill fix must be:

```text
historical source rows
 -> calculateVeltrix
 -> approved World WIN policy
 -> enhanceVeltrixWithRud (including v16 specialists)
 -> adaptive_v16_backfill snapshot
 -> settlement
 -> Error Memory
```

Backfill must remain true walk-forward, no future leakage, isolated, idempotent, POST-only and Dry Run before write.

---

## 11. Supabase

Uses project `six-digit-thai-lao` with isolated `veltrix_` objects:

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
```

Server only:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

Never expose the service-role key in browser code or GitHub.

---

## 12. Customer UI / screenshot rules

Mobile-first, especially iPhone.

Visible customer output:

- market
- persistent World WIN input
- WIN6 + Reserve
- รูดหลัก
- รูดรอง
- เจาะ 2 (5 sets)
- เจาะ 3 (3 sets)
- เบิ้ล % + 3 watch digits
- copy / auto lock

Do **not** show RUD side labels (บน/ล่าง) to customers.
Do **not** show internal engine-status text such as Adaptive/RUD AI/Reserve Challenger/World/Memory/history in screenshots. `engineStatus` is hidden on the customer page.

LINE copy keeps:

```text
Market
WIN6(Reserve)
รูดหลัก
รูดรอง
เจาะ 2
เจาะ 3
เบิ้ล %
เฝ้าเบิ้ล 3 digits
Drift / weight
```

---

## 13. Regression locks

Before delivery/merge verify:

- `279-62` formula reference exact.
- WIN6 = 6 unique digits.
- WIN6 result remains unchanged by v16 specialists.
- RUD primary/secondary inside WIN6 and different.
- Reserve outside WIN6.
- Pair2 digits inside WIN6.
- Pair3 digits inside WIN6.
- Double Watch digits inside WIN6.
- World WIN remains assistive/not forced.
- Snapshot version and Error Memory compatibility correct.
- no future leakage.
- no random output.

Reference v16 regression for the test history beginning `279-62`:

```text
Pair2  = 89 • 86 • 19 • 16 • 69
Pair3  = 931 • 953 • 916
Double = 9 • 3 • 6
```

---

## New chat handoff

In a new ChatGPT room, start with:

```text
@GitHub เปิด repo seasonday41-bot/Veltrix อ่าน README.md บน main ก่อนทั้งหมด แล้วทำต่อจาก Source of Truth ในนั้น
```
