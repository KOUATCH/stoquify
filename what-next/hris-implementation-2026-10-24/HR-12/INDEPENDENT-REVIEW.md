# Independent HR-12 review

Reviewer: `/root/hr09_independent_review`. Read-only source and test-definition review; reviewer did not edit code or execute checks. The implementation agent owns runtime evidence separately.

| Finding | Resolution | Regression evidence |
|---|---|---|
| R1: settlement overlooked approved leave with a pending cancellation | Settlement blocks pending cancellation metadata; new cancellation of an already settled balance is denied | `R1 settlement waits...` PostgreSQL case |
| R2: navigating employees could retain another employee's form values | Stateful management component is keyed by employee ID | EN/FR browser A→B remount checks |
| R3: retired policy blocked exact scheduler recovery | Retained scheduled events are recovered before new-effect active eligibility; missing credits still require active eligibility | `R3 exact scheduler recovery...` PostgreSQL case |
| R4: approval checked one request's capacity without other approved leave | Employee-serialized capacity check includes other approved leave across policies, excluding the claimed request itself | `R4 parallel leave approvals...` PostgreSQL case with ample balances |
| R5: timestamp overlap query disagreed with work-date eligibility | Versioned policy dates must be UTC-midnight work-date labels; schedule admission rejects ambiguous timestamp bounds | Policy date-boundary unit case and independent approval PostgreSQL case |
| R6: day/hour conversion lost its evidence and audit used placeholder minutes | Retain quantity/unit/work date/schedule ID/hash and converted minutes; audit actual stored minutes and render the equation | Partial-day PostgreSQL assertions and rendered self-service equation |

Final reviewer statement: R1–R6 closed in current source; no additional blocking issue found in this bounded review. Final DB/browser/evidence closure remains the implementation agent's responsibility. No domain, legal or release certification is implied.

Additional implementation-agent verification found and repaired a browser focus issue: timeout-based focus could run before the status node committed. A post-render effect now moves focus to status. Browser checks verify keyboard submission and focus. Failed diagnostic logs remain retained, not relabeled as passing evidence.
