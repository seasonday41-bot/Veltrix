# Sibling Position AI V1

Purpose: report only whether the next result has elevated probability of a sibling pair in the 2-top or 2-bottom positions. It does not select which sibling pair will occur.

Sibling definition (circular): 01/10, 12/21, 23/32, 34/43, 45/54, 56/65, 67/76, 78/87, 89/98, 90/09.

Scope:
- Top uses only the tens+ones of the 3-top result.
- Bottom uses only the two bottom digits.
- Hundreds digit is ignored.

Output:
- พี่น้องบน NN%
- พี่น้องล่าง NN%

The engine uses cross-formula sibling structure plus recent 5-draw market behavior. It is intentionally separated from future Sibling Pair AI, which will later choose the actual candidate pair.

Relationship lock: this module must not alter WIN6, RUD, Reserve, Pair2, Pair3 or Double Pattern AI. Snapshot metadata stores `sibling_position` for later settlement/backtesting.
