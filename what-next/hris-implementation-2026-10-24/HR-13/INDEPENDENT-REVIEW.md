# HR-13 independent review

Reviewer: `/root/hr09_independent_review`, read-only source review, separate from implementation. Final disposition: **R1–R7 closed; no remaining concrete blocking finding identified in the bounded candidate.** Reviewer inspected source/migration/test definitions and did not execute tests. Runtime results are recorded separately in RESULT.md and evidence.json.

| Finding | Resolution | Regression evidence |
|---|---|---|
| R1: Legacy nonmidnight schedule bounds can collide with new date-label versions. | Preparation/publication reject unresolved legacy bounds; no implicit backfill. | Real PostgreSQL retained-noon row remains unchanged and conflicting publication is blocked. |
| R2: OR lookup could overlook contradictory idempotency-key/source bindings. | Inspect every matching binding; any changed payload conflicts. Employer import lock precedes sorted employee locks. | Real PostgreSQL source B plus already-bound key A rejects. |
| R3: Legacy certification caller could forge preparedById and bypass importer independence. | Shared source owner derives a deterministic actual importer set over the complete contributing date range. Shared certification rejects every contributing importer, including adjacent-period observations. | Direct legacy owner denial, expanded-range importer denial and new facade denial in PostgreSQL. |
| R4: Slow file A could replace later-selected file B. | Selection generation guard; loading state; selected filename confirmation. | Reversed asynchronous completion component test imports B. |
| R5: Name-only revision lost breaks, split shifts, numeric weekday capacities or explicit off days. | Preserve additional shifts/breaks; preload first break; named-or-numeric weekday lookup; empty plan defaults OFF. | Component tests retain all normalized shifts/breaks and paid minutes, numeric office capacities and off-day semantics. |
| R6: Preview omitted identities/quantities and discarded import reconciliation. | Preview displays employee/provider IDs and four minute values; retained receipt includes batch ID, accepted/rejected/unchanged counts and replay outcome. | Two-employee mixed duplicate/rejected preview and retained receipt component case; PostgreSQL duplicate replay cases. |
| R7: Employee/period switch retained stale certification evidence. | Key closure by employee and period. Internal refresh clears upload/receipt state. | Internal READ A/P1→B/P2 clears certification evidence. |

Additional inspection fixes: canonical JSON hashing survives JSONB property ordering; published working shifts on excluded holidays fail pending explicit holiday-work policy; bounded history refuses incomplete views; route errors distinguish failed reads from authorization denial. Existing error/action/module/tenant and payroll admission owners remain authoritative.
