# VELTRIX — Adaptive Number Intelligence

> ## SOURCE OF TRUTH / CHAT HANDOFF
>
> This README is the primary handoff document for the current VELTRIX production code on `main`.
> A new ChatGPT room or developer should read this file before changing formulas, WIN6, World WIN, RUD, Reserve, Drill, Snapshot, Error Memory, Backfill, or Supabase behavior.
>
> **Current production:** Adaptive v15 + Linked RUD AI + Smart Reserve + Persistent World WIN.

---

## 1. Current system lineage

VELTRIX is one connected deterministic pipeline. Subsystems may learn different evidence, but they must remain related to the same final ranking.

```text
Historical results
  -> Formula evidence
  -> Recent market behavior
  -> Snapshot Error Memory
  -> Adaptive Ranking
  -> Persistent World WIN Fusion (bonus only, not forced)
  -> FINAL WIN6
       -> Linked RUD AI selects Rud Primary / Secondary from FINAL WIN6
       -> Pair2 / Pair3 use FINAL WIN6 and bounded RUD evidence
       -> Double Watch uses FINAL WIN6
       -> Smart Reserve stays outside FINAL WIN6
  -> Snapshot Lock
  -> Actual result
  -> Settlement / Forward Audit
  -> Error Memory
  -> next prediction
```

### Non-negotiable relationship rules

- FINAL WIN6 contains exactly 6 unique digits.
- RUD AI may score all `0-9`, but actual **Rud Primary and Rud Secondary must be inside FINAL WIN6**.
- Rud Primary and Rud Secondary must be different.
- RUD is **not** `win6.slice(0,2)`; it has its own market-specific learned scoring.
- Pair2 / Pair3 / Double Watch must use digits from the same FINAL WIN6.
- RUD evidence may contribute bounded bonuses to Drill, but must not force every Drill set to contain a RUD digit.
- Reserve is the only seventh support digit and must stay outside FINAL WIN6.
- Reserve must remain measured separately from WIN6.
- No random selection anywhere.

---

## 2. Data / history rules

VELTRIX stores a maximum of **20 actual occurrences per market**.

- Never read more than 20 historical rows per market.
- Markets are occurrence-based; they do not need to draw every calendar day.
- Inserting occurrence #21 removes the oldest occurrence for that market.
- `top3` and `bottom2` are stored as text to preserve leading zeroes.
- Canonical market + draw date controls duplicate/conflict behavior.
- Same market/date/result = duplicate / skip.
- Same market/date but different result = conflict / never overwrite automatically.
- Market aliases are explicit; do not invent fuzzy aliases.

### RUD learning window

RUD learns from up to **10 completed transitions** and never reads beyond 20 rows.

Current transition weights:

```text
[1.15, 1.15, 1.35, 1.35, 1.30, 0.95, 0.82, 0.70, 0.60, 0.52]
```

The strongest emphasis is intentionally around transitions **3-5**.

The Adaptive WIN6 core uses recent-5 evidence plus short recent walk-forward validation. Drift may compare recent behavior with earlier behavior but still never exceeds the 20-row retention window.

---

## 3. Locked formula family

Regression reference input:

```text
279-62
```

Expected outputs:

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

### Formula 1

```text
x = (hundreds of top3 + tens of bottom2) mod 10
output = x, (x+1) mod 10
```

### Formula 2

```text
(last2 of top3 + bottom2)
then sum result digits mod 10
```

### Formula 2.1

```text
sum all 5 input digits mod 10
output = x, (x+1) mod 10
```

### Formula 2.2

For top3 = `A B C` and bottom2 = `D E`:

```text
(B+E) mod10
(B+D) mod10
(C+E) mod10
```

### Formula 3

```text
top3 x 9%
top3 x 7%
(last2 top3 + bottom2) x 6%
(last2 top3 + bottom2) x 99%
```

Do not change formula definitions without updating regression tests and rerunning the comparable walk-forward benchmark.

---

## 4. Adaptive WIN6 core

Candidate Base / Recent mixes:

```text
100/0
80/20
60/40
50/50
40/60
20/80
```

The selected mix is learned per market using the market's own latest **3 completed walk-forward predictions**.

Validation scoring:

```text
5/5  -> 10
>=4  -> 4
>=3  -> 1
else -> 0
```

Recent evidence includes:

- formula reliability
- recent digit presence
- source-to-next-result persistence

Snapshot Error Memory can add only a small bounded correction:

```text
ERROR_MEMORY_WEIGHT = 0.08
```

It must not overpower the core ranking.

---

## 5. Persistent World WIN / วินรอบโลก

Current production includes a persistent World WIN field.

Behavior:

- User can enter any unique digit set up to 10 digits.
- The value persists until manually changed/cleared.
- It is used across all markets.
- It is applied **before Linked RUD selection**.
- It adds a small Fusion bonus to matching digits.
- It is **not forced into WIN6**.

Current configuration:

```text
WORLD_WIN_BONUS = 0.10
forced = false
persistent = true
```

Current order:

```text
calculateVeltrix(core)
  -> applyWorldWinFusion(...)
  -> enhanceVeltrixWithRud(...)
```

World WIN evidence is stored in live Snapshot metadata so AUTO/manual snapshots remain aligned.

---

## 6. Linked RUD AI

RUD is an AI/scoring layer, not merely the first two WIN6 digits.

RUD learns per market using source/position evidence, then selects its actual output from FINAL WIN6 so the system remains connected.

### Percent RUD source

Primary evidence includes **3-top x 56%**.

Example:

```text
354 x 56% = 198.24
read left-to-right -> 1 9 8 2 4
```

If a percent result conceptually contains repeated digits, candidate interpretation keeps the first occurrence.

Percent RUD is a **candidate/evidence source**, not the whole RUD AI.

### RUD evidence sources

- P56 Percent RUD
- Formula 1
- Formula 2
- Formula 2.1
- Formula 2.2
- Formula 3-9%
- Formula 3-7%
- Formula 3-6%
- Formula 3-99%

For each source/position, RUD learns whether the digit appeared in the next result:

- anywhere in top3 or bottom2
- top3
- bottom2

Learning is per market and walk-forward only.

### Current linked RUD score

Approximately:

```text
60% learned all-source evidence
25% P56 evidence
15% central rank evidence
```

RUD AI may score all digits `0-9`, but final selection is locked:

```text
Rud Primary   = strongest eligible RUD candidate inside FINAL WIN6
Rud Secondary = next strongest different candidate inside FINAL WIN6
```

Each selected RUD digit also receives a learned side label:

```text
รูดหลัก 3 • บน
รูดรอง 7 • ล่าง
```

There are **not** separate Top-RUD and Bottom-RUD AIs. There is one RUD AI, two selected digits, and a side label for each digit.

Current implementation version:

```text
RUD_AI_P56_MARKET_LINKED_WIN6_V2
relationshipLocked = true
```

---

## 7. Drill 2 / Drill 3

RUD and Drill are different decisions but remain in the same FINAL WIN6 lineage.

Current output:

- Pair2 = 5 sets
- Pair3 = 3 sets

Rules:

- every Pair2/Pair3 digit must be in FINAL WIN6
- position probability contributes
- central rank contributes
- historical pair/triple evidence contributes
- RUD may add a bounded bonus
- RUD does not force all Drill sets

---

## 8. Double Watch

Double Watch uses FINAL WIN6 only.

Current evidence includes:

- recent historical double behavior
- Formula 2 / 2.1 / 2.2 support
- central ranking

Output:

- double probability %
- 3 watch digits

LINE copy must include the double probability and all 3 watch digits.

---

## 9. Smart Reserve

Reserve stays outside FINAL WIN6.

Current strategy:

1. Evaluate digits outside FINAL WIN6.
2. Prefer strong learned P56 evidence.
3. Use learned all-source RUD evidence and central ranking as tie-break/fallback.
4. Retain original central rank #7 internally as `reserveRank7` for audit/comparison.

Current strategy label:

```text
P56_RUD_RANK_LINKED_RESERVE
```

### Final linked Reserve walk-forward check

Comparable dataset: **60 markets x 20 draws, 900 walk-forward predictions**.

```text
WIN6 full 5-position coverage
76/900 = 8.44%

WIN6 + plain central rank #7 full coverage
134/900 = 14.89%
additional rescues = 58

WIN6 + Linked Percent-RUD Smart Reserve full coverage
166/900 = 18.44%
additional rescues = 90

Smart Reserve appears somewhere in next 5 result positions
~41.89%
```

Important: **18.44% is WIN6+Reserve seven-digit coverage, not WIN6 accuracy.**
Do not report WIN6 itself as 18.44%.

---

## 10. Linked RUD walk-forward reference

On the same 900 targets:

```text
Rud Primary hit-any     39.89%
Rud Secondary hit-any   41.67%
At least one hits        66.00%
Both hit                 15.56%
```

These figures are primarily evidence that the linked RUD selection is usable while preserving the relationship lock. They are not a guarantee of future results.

World WIN can change final rankings when a non-empty World WIN is active, so these benchmark figures should be treated as the linked-v15 reference baseline rather than a universal figure for every World WIN input.

---

## 11. Drift

Drift is diagnostic evidence comparing recent behavior with previous behavior.

Components include:

- digit distribution shift
- position behavior shift
- formula reliability shift
- pattern/double-rate shift
- baseline coverage degradation

Display scale:

```text
<25  = นิ่ง
<45  = เริ่มเปลี่ยน
<65  = เปลี่ยนชัด
>=65 = เปลี่ยนแรง
```

Drift does not directly force the Base/Recent mix. The mix is chosen by actual recent walk-forward performance.

---

## 12. Snapshot / Settlement / Error Memory

Current live Snapshot version:

```text
adaptive_v15
```

Current historical Backfill version expected by Error Memory:

```text
adaptive_v15_backfill
```

Error Memory version:

```text
snapshot_error_memory_v2
```

### Live flow

```text
before incoming actual result
  -> AUTO LOCK adaptive_v15 prediction
  -> insert actual result
  -> settle Snapshot
  -> Forward Audit / Error details
  -> Error Memory for next prediction
```

### Live Snapshot metadata includes

- relationship lock
- WIN6 / Reserve
- original central `reserveRank7`
- Reserve strategy
- linked RUD AI payload
- Rud Primary / Secondary side labels
- World WIN and World WIN fusion evidence
- Pair2 / Pair3
- double probability / watch
- Drift
- Base/Recent weights
- Error Memory state
- formula outputs/reliability

### Settlement records

- WIN6 5-position coverage
- 5/5 / >=4 / >=3
- missing actual digits
- false-positive WIN6 digits
- Reserve rescue digits
- full-5 Reserve rescue
- Rud Primary / Secondary any-hit
- Rud top/bottom hit
- Rud side hit
- Pair2 / Pair3 hit
- double event / watch hit
- Drift and weights at prediction time
- formula evidence

### Error Memory behavior

- per market
- recency-decayed
- bounded
- learns missing digits / false-positive digits / successful digits / missed double digits
- live Snapshot has priority over historical simulation for the same target when deduplicating

---

## 13. Historical Backfill — IMPORTANT KNOWN GAP

The RESULTS page contains Dry Run / Error Memory backfill support, and Error Memory expects `adaptive_v15_backfill`.

However, **the current `api/backfill-learning.js` still contains legacy v14-era pieces**:

- confirmation token is still `VELTRIX_BACKFILL_V14`
- metadata label still says `adaptive-v14-backfill`
- the simulation currently calls core `calculateVeltrix(...)` directly
- it does **not yet run Persistent World WIN Fusion + Linked RUD enhancer in the same order as live adaptive_v15 predictions**

Therefore:

> **Do not treat the current Backfill result as a full production-v15 reproduction until this gap is fixed.**

Required fix for the next development step:

```text
historical source rows
  -> calculateVeltrix(core)
  -> apply historical/current approved World WIN policy
  -> enhanceVeltrixWithRud
  -> snapshot as adaptive_v15_backfill
  -> settle
  -> Error Memory
```

Then update confirmation/UI metadata from V14 to V15 consistently and rerun regression tests.

Backfill must remain:

- true walk-forward
- no future leakage
- isolated from live snapshots
- idempotent
- POST-only
- Dry Run before write

---

## 14. Supabase

VELTRIX uses Supabase project `six-digit-thai-lao`, with isolated `veltrix_` objects.

Core objects:

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

Server-side environment variables:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser JavaScript or commit it to GitHub.

---

## 15. UI / iPhone behavior

VELTRIX is mobile-first, especially iPhone.

Current customer view includes:

- market search/select
- persistent World WIN input
- WIN6 + Reserve
- Rud Primary + side
- Rud Secondary + side
- Drill 2 (5 sets)
- Drill 3 (3 sets)
- Double % + 3 watch digits
- Drift / Base-Recent information
- Copy button

Legacy visible MODE A/B UI is removed/hidden. Internal compatibility A/B objects may still exist because older DB constraints/integrations use them, but the user should see **one Adaptive system**.

LINE copy format includes:

```text
Market
WIN6(Reserve)
Rud Primary + side
Rud Secondary + side
Drill 2
Drill 3
Double %
3 Double Watch digits
Drift / weight
```

---

## 16. Regression locks

Before any future delivery, tests should verify at minimum:

- `279-62` formula reference stays exact
- WIN6 has 6 unique digits
- Rud Primary is inside FINAL WIN6
- Rud Secondary is inside FINAL WIN6
- Rud Primary != Rud Secondary
- Reserve is outside FINAL WIN6
- Pair2 digits are inside FINAL WIN6
- Pair3 digits are inside FINAL WIN6
- Double Watch digits are inside FINAL WIN6
- World WIN is a bonus only and does not force membership
- Settlement records missing digits / Reserve rescue / RUD outcomes correctly
- Error Memory remains bounded
- no future leakage
- no random output

---

## 17. Performance references

Adaptive v15 linked benchmark without claiming Reserve as WIN6:

```text
WIN6 5/5      8.44%   (76/900)
WIN6+Rank7   14.89%  (134/900)
WIN6+SmartR  18.44%  (166/900)
```

Earlier core baseline references:

```text
WIN6 >=4/5       32.33%
WIN6 >=3/5       67.00%
2-bottom full    34.33%
```

Fresh 17-result v13 reference before later v15/World-WIN changes:

```text
5/5      3/17
>=4/5   11/17
>=3/5   15/17
Top3     10/17
Bottom2   5/17
```

Always label which engine/version and whether Reserve/World WIN is included when reporting performance.

---

## 18. Current production / Git status

Adaptive v15 PR #1 was merged into `main`.

A later Persistent World WIN change is also on `main` and deployed to Vercel production.

At the time this README was updated, the latest Vercel production deployment for `main` was **READY**.

Do not assume future production status from this sentence forever; re-check GitHub/Vercel before claiming a new change is live.

---

## 19. Do-not-break rules for the next chat/developer

1. Read this README before editing VELTRIX.
2. Treat `main` as current production source of truth unless the user names a newer branch/PR.
3. Do not resurrect visible MODE A/B unless explicitly requested.
4. Do not replace RUD AI with `win6.slice(0,2)`.
5. Do not let actual RUD Primary/Secondary leave FINAL WIN6.
6. Do not force an outside RUD digit into WIN6 after final ranking.
7. Keep Reserve outside WIN6 and report Reserve metrics separately.
8. Do not let Drill use digits outside FINAL WIN6.
9. Keep World WIN a bounded bonus unless a new strategy is explicitly backtested and approved.
10. Do not let Error Memory overpower core ranking.
11. Do not use future data in backtests or historical simulations.
12. Never read more than 20 historical occurrences per market.
13. Main RUD learning uses up to 10 completed transitions, strongest around 3-5.
14. No randomization.
15. Keep live vs backfill Snapshot versions isolated.
16. Do not delete existing historical Supabase data just because legacy UI is hidden.
17. Fix the known Backfill v15 parity gap before treating historical Error Memory backfill as production-equivalent.
18. Verify GitHub Actions and Vercel before claiming a change is ready/live.

---

## 20. Quick instruction for a new ChatGPT room

Send this message in the new room:

```text
@GitHub เปิด repo seasonday41-bot/Veltrix แล้วอ่าน README.md บน main ก่อนทั้งหมด
ให้ถือ README เป็น source of truth ของโปรเจกต์ แล้วเช็ก main/PR/CI/Vercel ล่าสุดก่อนแก้โค้ด
ทำต่อจาก Adaptive v15 + Linked RUD + Smart Reserve + Persistent World WIN
และห้ามทำลาย relationship lock ของ WIN6/RUD/Reserve/Drill
```
