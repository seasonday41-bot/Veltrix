# Double Pattern AI V1

Purpose: report **where a double pattern is likely**, not which digit will double.

Customer output:

- เบิ้ลบน % + one position label: เบิ้ลหน้า (AAB), หาม (ABA), เบิ้ลหลัง (ABB), or ตอง (AAA)
- เบิ้ลล่าง % (AA)

The module intentionally returns no watch digits and no double-digit picks. Double Digit AI will be a separate future component.

Signals were selected from the 60-market historical experiments discussed before implementation, including cross-formula pair convergence, multi-formula confluence, raw percent-pattern windows, and recent pattern history. Raw percent results preserve repeated digits for pattern detection.

This component must not force or rerank WIN6, RUD, Pair2, Pair3, or Reserve. It is an auxiliary pattern signal only.

Implementation: `lib/double-pattern-ai.js` (`DOUBLE_PATTERN_AI_V1`). Manual snapshots store the output under `metadata.double_pattern` while the core snapshot engine version remains `adaptive_v17`.
