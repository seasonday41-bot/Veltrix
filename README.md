# VELTRIX — Adaptive Number Intelligence

> **SOURCE OF TRUTH / CHAT HANDOFF**
>
> This README describes the current development state of VELTRIX on branch `agent/adaptive-win6-drift` / PR #1.
> When continuing in a new ChatGPT room, read this file first before changing formulas, ranking, RUD, Reserve, Snapshot, or database behavior.
>
> **Current status:** PR #1 is still Draft and has NOT been merged to `main` / production.

---

## 1. Core principle

VELTRIX is one connected prediction lineage. Components may have their own evidence/learning logic, but outputs must remain related to the same central ranking.

```text
Historical results
  -> Formula evidence
  -> Recent / market behavior
  -> Snapshot Error Memory
  -> Adaptive Ranking / Fusion
  -> FINAL WIN6
       -> RUD AI selects Primary / Secondary from FINAL WIN6
       -> Drill 2 / Drill 3 are built from FINAL WIN6
       -> Double Watch is built from FINAL WIN6
       -> Reserve stays outside FINAL WIN6 but uses the same learned evidence lineage
  -> Snapshot Lock
  -> Actual result
  -> Settlement
  -> Error Memory
  -> next prediction
```

### Relationship lock

- WIN6 is the central 6-digit pool.
- RUD AI may score all digits `0-9`, but **actual Rud Primary and Rud Secondary must be members of FINAL WIN6**.
- Rud Primary and Rud Secondary must be different digits.
- Pair2 / Pair3 / Double Watch must use digits from the same FINAL WIN6.
- Reserve must stay outside FINAL WIN6.
- Do not create a completely separate RUD output that can drift away from WIN6.
- Do not simply call the first two WIN6 digits “RUD”; RUD has its own learned scoring, then selects its two outputs from FINAL WIN6.
- Deterministic only. **No random selection.**

---

## 2. Data window

Supabase stores a maximum of **20 actual occurrences per market**.

Current learning rules:

- Never read more than 20 rows for one market.
- Main RUD learning uses up to **10 completed transitions**.
- Recent transitions receive higher weight.
- RUD learning weights are currently:

```text
[1.15, 1.15, 1.35, 1.35, 1.30, 0.95, 0.82, 0.70, 0.60, 0.52]
```

This intentionally gives the strongest emphasis to the recent transition zone around **3-5** while still keeping a 10-transition learning window.

The Adaptive WIN6 core also uses recent-5 behavior plus short walk-forward validation. Drift compares recent behavior against earlier behavior and therefore may read further back, but never beyond the stored 20 rows.

Markets are occurrence-based; they do not need to draw every calendar day.

---

## 3. Current formula family

Current formula definitions are locked by regression tests.

For reference input `279-62`, outputs must remain exactly:

```text
Formula 1    = 89
Formula 2    = 6
Formula 2.1  = 67
Formula 2.2  = 931
Formula 3-9% = 251
Formula 3-7% = 953
Formula 3-6% = 846
Formula 3-99%= 95
```

Implementation summary:

### Formula 1

```text
x = (hundreds of top3 + tens of bottom2) mod 10
output = x, x+1 mod 10
```

### Formula 2

```text
(last2 of top3 + bottom2)
then sum result digits mod 10
```

### Formula 2.1

```text
sum all 5 result digits mod 10
output = x, x+1 mod 10
```

### Formula 2.2

Using top3 = A B C and bottom2 = D E:

```text
(B+E) mod10
(B+D) mod10
(C+E) mod10
```

### Formula 3

- top3 x 9%
- top3 x 7%
- (last2 top3 + bottom2) x 6%
- (last2 top3 + bottom2) x 99%

Formula results contribute evidence to ranking; duplicate digits are handled deterministically.

---

## 4. Adaptive WIN6 core

The validated core uses candidate Base/Recent mixes:

```text
100/0
80/20
60/40
50/50
40/60
20/80
```

For each market, the mix is chosen from the market's own short **walk-forward validation window of the latest 3 completed predictions**. Future results must never be used to choose the weight for an earlier prediction.

Scoring used by the weight selector:

```text
5/5  -> 10 points
>=4  -> 4 points
>=3  -> 1 point
else -> 0
```

Recency factor is applied to those validation predictions.

### Recent score components

Recent digit evidence includes:

- formula reliability
- recent digit presence
- source-to-next-result persistence

### Error Memory correction

Snapshot Error Memory can add only a small bounded correction to ranking.

```text
ERROR_MEMORY_WEIGHT = 0.08
```

It must not overpower the validated core ranking.

---

## 5. RUD AI — current linked design

RUD is **not** just the first two digits of WIN6.

RUD AI learns per market and scores candidates using source/position evidence. It borrows the useful concept from the NEXUS RUD approach, but is implemented inside VELTRIX and remains connected to the VELTRIX central lineage.

### Percent RUD source

A primary RUD evidence source is **3-top x 56%**.

Example:

```text
354 x 56% = 198.24
read left-to-right -> 1 9 8 2 4
```

If a full percent result contains duplicates, retain the first occurrence when interpreting candidates conceptually.

Percent RUD is an evidence source/candidate generator, **not the whole RUD AI**.

### RUD sources

Current RUD source-position learning includes:

- P56 Percent RUD
- Formula 1
- Formula 2
- Formula 2.1
- Formula 2.2
- Formula 3-9%
- Formula 3-7%
- Formula 3-6%
- Formula 3-99%

For each source and position, the engine learns whether that digit historically appeared in the next result:

- anywhere in top3 or bottom2
- top3
- bottom2

Learning is walk-forward and market-specific.

### RUD score

Current linked RUD score is approximately:

```text
60% learned all-source evidence
25% Percent-56 evidence
15% central rank evidence
```

RUD AI may score all `0-9`, but after FINAL WIN6 exists:

- **Rud Primary** = strongest eligible RUD candidate inside FINAL WIN6
- **Rud Secondary** = next strongest different candidate inside FINAL WIN6

The engine also estimates a side label independently for each selected RUD digit:

```text
Rud Primary 3 • บน
Rud Secondary 7 • ล่าง
```

This does **not** mean there are separate Top-RUD and Bottom-RUD AIs. There is one RUD AI, two selected digits, and a learned side label for each digit.

Current RUD implementation version:

```text
RUD_AI_P56_MARKET_LINKED_WIN6_V2
```

Relationship flag:

```text
relationshipLocked = true
```

---

## 6. Drill 2 / Drill 3

RUD and Drill are different decisions, but they are connected through the same FINAL WIN6 lineage.

Current behavior:

- Pair2 produces 5 pairs.
- Pair3 produces 3 triples.
- Every Pair2 / Pair3 digit must belong to FINAL WIN6.
- RUD evidence is allowed to contribute a **bonus**, but RUD does not force every Drill set to contain a RUD digit.
- Position probability, rank score, historical evidence and pair support remain part of Drill scoring.

This preserves the relationship without allowing RUD to dominate Drill.

---

## 7. Double Watch

Double Watch is produced from FINAL WIN6 only.

Current evidence includes:

- historical double behavior from recent rows
- Formula 2 / Formula 2.1 / Formula 2.2 support
- central ranking

Output:

- double probability percentage
- 3 watch digits

LINE copy must include both the double probability and all 3 watch digits.

---

## 8. Reserve

Reserve is the seventh support digit and **must be outside WIN6**.

Current linked Reserve selection uses the same evidence lineage:

1. Prefer strong learned Percent-RUD evidence among digits outside FINAL WIN6.
2. Use learned all-source RUD evidence and central ranking as tie-break/fallback.
3. If needed, fall back to central rank #7.

Current strategy label:

```text
P56_RUD_RANK_LINKED_RESERVE
```

The original central rank #7 is retained internally as `reserveRank7` for comparison/audit.

### Reserve research result

Previous walk-forward research on the 900-prediction dataset showed Reserve has meaningful rescue value:

- WIN6 full 5/5 baseline: **8.44%**
- WIN6 + original rank #7 coverage: approximately **14.89%**
- An earlier experimental RUD-smart Reserve reached approximately **18.56%** full-5 coverage as a 7-digit pool.

**Important:** the 18.56% value came from the earlier Reserve experiment. The final linked RUD/Reserve V15 lineage must be rerun on the same historical dataset before claiming that number as final production performance.

Do not automatically force Reserve into WIN6 solely because WIN7 coverage is higher. WIN6 and Reserve must continue to be measured separately.

---

## 9. Drift

Drift is diagnostic evidence describing how recent market behavior differs from previous behavior.

Current components include:

- digit-distribution shift
- position-behavior shift
- formula-reliability shift
- pattern/double-rate shift
- baseline coverage degradation

Displayed scale: `0-100`.

Approximate labels:

```text
<25  = นิ่ง
<45  = เริ่มเปลี่ยน
<65  = เปลี่ยนชัด
>=65 = เปลี่ยนแรง
```

Drift does not directly force a Base/Recent mix. The mix is selected by recent walk-forward performance.

---

## 10. Snapshot / Settlement / Error Memory

Current live Snapshot engine version:

```text
adaptive_v14
```

Historical simulated Snapshot version:

```text
adaptive_v14_backfill
```

The RUD/Reserve linked lineage is currently added as V15 hybrid metadata on top of the v14 Snapshot system. Do not silently rename database versions without updating every writer/reader/settlement path together.

### Live flow

```text
Before new actual result is inserted
  -> AUTO LOCK prediction Snapshot
  -> insert actual result
  -> settle locked Snapshot
  -> write Forward Audit / Error details
  -> Error Memory becomes available for the next prediction
```

### Settlement records

Settlement should retain evidence such as:

- WIN6 5-position coverage
- 5/5 / >=4 / >=3
- missing actual digits
- false-positive WIN6 digits
- Reserve rescue digit(s)
- RUD Primary hit
- RUD Secondary hit
- RUD side evidence where available
- Pair2 hit
- Pair3 hit
- actual double event
- Double Watch hit
- Drift at prediction time
- Base/Recent weights
- formula outputs
- formula reliability

### Error Memory

Memory is per market, recency-decayed and bounded.

It learns repeated:

- missing digits
- false-positive digits
- successful digits
- missed double digits

Live snapshots have priority over equivalent historical-backfill simulations when deduplicating the same actual target.

---

## 11. Historical Backfill

The RESULTS page contains an AI Error Memory backfill workflow.

Required sequence:

```text
ตรวจย้อนหลัง (Dry Run)
  -> inspect counts/performance WITHOUT writing DB
  -> if successful, enable สร้าง Error Memory
  -> execute historical Snapshot + Settlement backfill
```

Backfill rules:

- true walk-forward only
- a simulated prediction may see only results that existed before its target result
- simulated Error Memory may use only errors already settled before that simulated target
- historical backfill must be isolated from live snapshots
- idempotent: rerunning must reuse existing backfill snapshots instead of duplicating them
- endpoint is POST-only and requires explicit confirmation

The backfill has intentionally **not** been auto-executed by weakening Vercel Preview Authentication.

---

## 12. Supabase

VELTRIX uses the existing Supabase project `six-digit-thai-lao`, but VELTRIX objects are isolated with the `veltrix_` prefix.

Core objects include:

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

History retention:

- maximum 20 actual occurrences per market
- insertion #21 removes the oldest occurrence for that market
- top3 / bottom2 are stored as text to preserve leading zeroes
- canonical market + draw date controls duplicate/conflict behavior
- same market/date/result = duplicate / skip
- same market/date but different result = conflict / never overwrite automatically
- aliases are explicit; do not invent fuzzy aliases

### Environment variables

Server-side only:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser JavaScript or commit it to GitHub.

---

## 13. UI / iPhone rules

VELTRIX is mobile-first, especially iPhone.

Current customer output:

- market selector/search
- WIN6 + Reserve
- Rud Primary
- Rud Secondary
- learned side label for each RUD digit
- Drill 2: 5 sets
- Drill 3: 3 sets
- Double probability + 3 watch digits
- Drift / Base-Recent information
- Copy button

Legacy visible MODE A / MODE B UI is removed/hidden. Internal A/B compatibility objects may still exist where old DB constraints/integrations require them, but users should see **one Adaptive system**.

LINE copy must include:

```text
market
WIN6 + (Reserve)
Rud Primary + side
Rud Secondary + side
Drill 2
Drill 3
Double %
3 Double Watch digits
Drift / weight
```

Do not add unnecessary screenshots/images while doing code fixes.

---

## 14. Regression locks

Before delivery/merge, tests must continue to verify at minimum:

- formula reference `279-62` remains exact
- WIN6 has exactly 6 unique digits
- RUD Primary belongs to FINAL WIN6
- RUD Secondary belongs to FINAL WIN6
- RUD Primary != RUD Secondary
- Reserve is outside FINAL WIN6
- all Pair2 digits are inside FINAL WIN6
- all Pair3 digits are inside FINAL WIN6
- Double Watch digits are inside FINAL WIN6
- Settlement records missing digits / Reserve rescue correctly
- Error Memory correction remains bounded
- no future leakage in walk-forward logic
- no random selection

Latest linked-lineage test explicitly locks the RUD/WIN6/Reserve relationship.

---

## 15. Performance references

Validated Adaptive v13 core on the 900 walk-forward prediction dataset before Error Memory/RUD-linked experiments:

```text
5/5              8.44%
>=4/5           32.33%
>=3/5           67.00%
2-bottom full   34.33%
```

Fresh 17-result check for v13:

```text
5/5      3/17
>=4/5   11/17
>=3/5   15/17
Top3     10/17
Bottom2   5/17
```

Treat these as baselines. Do not claim later v14/v15 learning is more accurate until the final linked lineage is walk-forward backtested on the same dataset.

---

## 16. Current development status / next work

Current branch:

```text
agent/adaptive-win6-drift
```

Current PR:

```text
PR #1
Draft
base = main
NOT merged
```

GitHub Actions and Vercel Preview have been passing on the latest linked-RUD regression work.

### Remaining work before production merge

1. Run the final **linked RUD + linked Reserve** walk-forward backtest against the same 900-prediction dataset.
2. Compare:
   - WIN6 alone
   - WIN6 + original central rank #7
   - WIN6 + linked learned Reserve
   - RUD Primary/Secondary any-hit and side accuracy
3. Confirm the linked RUD/Reserve changes do not reduce key WIN6 metrics materially.
4. Run Historical Backfill Dry Run from RESULTS.
5. Review the Dry Run summary before writing backfill snapshots to Supabase.
6. Keep regression tests green.
7. Only then merge PR #1 to `main` and verify the Vercel production deployment is READY.

---

## 17. Do-not-break rules for the next chat/developer

1. **Read this README before changing the engine.**
2. Do not resurrect visible MODE A / MODE B unless explicitly requested.
3. Do not replace RUD AI with `win6.slice(0,2)`.
4. Do not let RUD become disconnected from FINAL WIN6.
5. Do not force an outside RUD digit into WIN6 after final ranking.
6. Do not put Reserve inside WIN6; evaluate it separately unless a new strategy is explicitly backtested and approved.
7. Do not let Drill use digits outside FINAL WIN6.
8. Do not let Error Memory overpower the core ranking.
9. Do not use future data in historical tests.
10. Do not read more than 20 historical occurrences per market.
11. Main RUD learning uses up to 10 completed transitions and emphasizes transitions 3-5.
12. Do not randomize any output.
13. Keep Snapshot live vs backfill versions isolated.
14. Do not delete existing historical Supabase data merely because old UI modes are hidden.
15. Verify GitHub Actions and Vercel before claiming a change is ready.
16. Do not claim production is updated until PR is merged and the production deployment is verified READY.

---

## 18. Quick new-chat instruction

Paste this into a new room if needed:

```text
Open GitHub repo seasonday41-bot/Veltrix.
Read README.md on branch agent/adaptive-win6-drift first; treat it as the project source of truth.
Continue PR #1 without changing the locked formula/RUD/WIN6/Reserve/Snapshot relationships unless I explicitly request it.
Check the latest branch + CI status before editing.
```
