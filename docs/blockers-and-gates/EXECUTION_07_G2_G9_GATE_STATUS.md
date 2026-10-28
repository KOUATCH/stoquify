# Stoquify enterprise POS gate status

Status: **BLOCKED**
Program controller: **PROGRAM_CONTROL_PLANE_INVALID**
First blocking gate: **G1**
Passed gates: **0/10**
Verified external evidence: **0/9**

| Gate | Runtime status | Dependencies |
| --- | --- | --- |
| G1 | BLOCKED_AUTHENTIC_APPROVALS | None |
| G2 | BLOCKED_DEPENDENCY | G1 |
| G3A | BLOCKED_DEPENDENCY | G2 |
| G3B | BLOCKED_DEPENDENCY | G2 |
| G4 | BLOCKED_DEPENDENCY | G2, G3B |
| G5 | BLOCKED_DEPENDENCY | G3A, G3B, G4 |
| G6 | BLOCKED_DEPENDENCY | G2 |
| G7 | BLOCKED_DEPENDENCY | G3A, G3B, G6 |
| G8 | BLOCKED_DEPENDENCY | G3A, G3B, G4, G5, G6, G7 |
| G9 | BLOCKED_DEPENDENCY | G8 |

The gate intentionally remains nonzero until every dependency, internal invariant and authentic external evidence item passes.
