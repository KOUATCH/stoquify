# HR-16 independent review

Reviewer: `/root/hr09_independent_review`, read-only and independent of implementation. Final disposition: **PASS_SCOPED (source inspection only)**. The reviewer did not execute tests or browser checks. Parent verification is recorded separately.

| Finding | Resolution | Evidence |
|---|---|---|
| R1: amendment overwrote prior baseline, supporting original and policy provenance | Every submitted/amended history item retains its baseline, document ID, private SHA and policy. Supporting originals are irreversibly evidence-bound in the same transaction; public history omits SHA. | Real PostgreSQL amended legal-name case regression |
| R2: form defaults could differ from available fields/decisions | Initial field follows allowed policy subset; returned/unassigned reviews initialize to permitted decisions and validate before submitting. | Component regressions |
| R3: dual-role own document retrieval inherited pending HR-review privilege | Own HTTP endpoint rejects HR operations; service ownOnly mode excludes reviewer exception and denies HR mutations. | Actual own HTTP + service/PostgreSQL denial regression |
| R4: successful mutation followed by failed refresh appeared unconfirmed and permitted duplicate submission | Successful mutation clears submitted draft and preserves a confirmed-success notice; list-refresh failure has refresh-only guidance. Failed mutations retain the exact retry envelope. | Component success-then-refresh-failure regression |

Reviewer also inspected current mapping revalidation after lock, live role intersection, policy/version admission, source CAS and native profile-before-employee lock order. No remaining material source finding reported. This is engineering review, not qualified employer-policy approval or release certification.
