# HR-08 independent adversarial review

Reviewer: `/root/hr08_independent_review`, a separate agent started with fresh context and read-only ownership at the user's explicit request. The primary agent implemented fixes and ran verification. The reviewer inspected current source and artifacts without editing files or running application/database commands. This is independent engineering review, not qualified legal or production certification.

## Findings and disposition

| ID | Severity | Finding | Remediation and regression |
|---|---|---|---|
| R1 | P1 | An employment proposal created after attendance freeze could become impossible to apply or reject after approval, while also blocking certification. | Reject new overlapping requests before event creation; recheck before approval. An independent actor may reject an approved but unapplied proposal, retaining the prior approval in audit. PostgreSQL reproduces both original failures and verifies prevention, legacy recovery and unchanged frozen evidence. |
| R2 | P2 | Retained service replays returned before current sensitive authorization. Protected HTTP actions reduced exposure; no HTTP bypass was demonstrated. Review also found declaration replay bound to current status/time and adapter policy. | Current permission/fresh authentication before retained results for review, approval, emission, posting, legacy approval/post, payment request/approval/release and declarations. New declaration command identity excludes authentication/capture context; legacy commands compare integrity-checked retained evidence. Exact recovery precedes current adapter/admission requirements. Unit matrix covers eight payroll operations and current/legacy manual/automated declaration recovery after status/time/adapter retirement; changed payload and revoked/stale authority fail. Real PostgreSQL emission retries preserve one payslip/transition. |
| R3 | P1 | The authority worker supplied default permission/authentication and could reach provider submission before authority validation. No deployed caller was found. | Explicit actor, empty default permissions, current sensitive authorization before leasing or adapter submission. Tests cover revoked, stale, missing permission, missing authentication and missing actor; no lease or fake adapter call occurs. No live provider used. |
| R4 | P1 | Payroll freshness checked only corrections, allowing later leave/overtime, schedules, ledger entries or imports to leave a retained operational snapshot stale. | Certification and payroll consumption share an internal current-source projection. Canonical comparison covers policy, evidence and totals, plus pending requests/anomalies. Schedule activation and manual ledger changes share the employee lock. Approval of all time request types checks sealed payroll. PostgreSQL verifies unchanged proof, pending/rejected recovery, stale leave/overtime, fresh leave/schedule certification, ledger changes and import anomalies. |

The reviewer caught a JSON property-order issue during re-review; canonical `hashBusinessPayload` replaced insertion-order hashing. Unchanged and freshly revised snapshots now pass. No HR permissions or approval evidence are fabricated by the internal source projection.

## Verification history

- `review-reproduction.json`: two expected real-database failures before R1 implementation.
- `unit-review-initial.json`: first combined run, 315 passed / 10 failed. Eight assertions expected the wrong safe denial text; two declaration cases still mocked authority. Assertions now match the actual denial, and the latter cases use the real sensitive-action policy.
- `postgres-review-focused.json`: nine selected cases passed, but suite cleanup failed because the new anomaly fixture still referenced its import batch. This is a failed run, not acceptance evidence. Cleanup order was corrected. `cleanup-recovery.json` records the exact two synthetic organization IDs and zero remaining rows after recovery.
- Final machine-readable decision, reviewer disposition, source hashes, commands and separate passing lanes: `independent-review.json` and `evidence.json`.

## Scope retained

Real PostgreSQL uses the isolated schema-synchronized fixture database. It does not replay production migrations/custom immutability triggers. Browser journeys use real components and, for People, real services/PostgreSQL behind synthetic role boundaries; they do not certify full Next/Better Auth sessions or screen-reader behavior. Country/legal rules, provider acceptance, production rollout and later roadmap gates remain separate. The readiness chain retains genuine missing-proof blockers.
