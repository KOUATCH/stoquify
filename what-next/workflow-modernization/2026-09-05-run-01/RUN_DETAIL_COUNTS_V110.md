# Complete reconciliation run counts

The review-handoff trace found that `getReconciliationRunDetail` counted unresolved exceptions and suspense only within its first 100 displayed rows. A run could therefore report zero unresolved records when an unresolved record existed after the sample. Match counts were also limited to the returned sample.

The existing service now loads its run, bounded records and full scoped counts in one RepeatableRead transaction. Independent count queries preserve all existing open-state definitions. The response adds `recordCoverage`, with returned count, total and truncation for each collection. Ordering includes an ID tie-breaker. The existing stored run totals remain historical run fields; current evidence counts are separate. Query failures still propagate and cannot become a successful zero result.

This is a read-model prerequisite to general exception review, not its implementation. The protected server action and hook expose the detail response, but current source search found no rendered consumer of that hook. No new screen, terminal exception transition, sign-off or approval was introduced. The existing workbench route remains `/en/dashboard/finance/reconciliation` and `/fr/dashboard/finance/reconciliation`; screenshots of it would not prove this service-only correction.

## Verification

- 44 tests in three suites passed: run-detail, certification and protected reconciliation actions. Seven new cases cover the hidden 101st record, explicit coverage, scoped snapshot queries, actual empty results, count failures and missing/foreign runs.
- Two-file lint passed after final formatting (receipt `c4b5f7`).
- Configured `tsc --noEmit --pretty false` passed (receipt `87160a`). The only subsequent production-source change was indentation inside the modified transaction; final regression and database runs bind that formatting. The previous v109 inventory type failure remains in its original evidence; this batch did not fix or claim ownership of that component.
- Owned PostgreSQL verifier `lanes/environment/verify-run-detail-v110.cjs`: final receipt `run-detail-v110-7792ba4a-04f.json` / command `304e9c`. It creates new synthetic rows only after verifying the owned database. One unresolved exception and suspense item remain counted behind 100 resolved sample rows; 145 match records remain counted despite the 100-row sample.
- A real insert through another database connection during loading is excluded from both the current sample and count, then appears on the next read. Foreign-run reads fail, empty reads are explicit, count failure propagates. Existing organizations and financial rows remain unchanged. Four check groups passed; final measured local detail load was 60 ms, with no approved performance budget or production-performance claim.
- Synthetic terminal labels only reproduce the read defect. They do not establish genuine exception resolution, financial treatment or sign-off.
- Earlier pre-formatting test/database passes are retained. An initial patch to the baseline filename failed to match and changed no files; the exact line was inspected before the successful patch.

## Controls and review responsibilities

Backend/data: bounded records plus complete scoped counts, a single snapshot and deterministic ordering. Security/IAM: existing protected-action authority retained, tenant/run filters verified. Finance/audit: no mutation, posting, sign-off or evidence invalidation. QA/SRE: regression, actual database and concurrency checks, failures propagated. UX/product: explicit sample coverage for the subsequent review interface; no visible workflow claims. API: additive response field; existing count fields now mean complete scoped totals. Statutory/country rules, payroll, POS/offline, billing, provider protocols and AI: not applicable; this batch changes none of their decisions or behavior. These are engineering checks, not certification.

## Operator and rollout guidance

No migration, bulk backfill, production deployment or external input is required. Consumers should display `evidence` counts as complete counts and use `recordCoverage` to label bounded lists. Do not use sample length to permit sign-off or imply that all records were reviewed. A query error requires retry/investigation, not an empty-state success. Existing sign-off validation remains authoritative.

Next engineering work remains evidence-bound exception review/closure, complete record navigation, reviewed-run preparation, independent sign-off/export and reopening. After those handoffs, continue the full platform register. The platform goal remains active; no complete workflow is claimed by this prerequisite fix.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Changed production file: `services/reconciliation/payment-reconciliation-certification.service.ts`; added `services/reconciliation/__tests__/payment-reconciliation-run-detail.test.ts` and the owned verifier. Passed gates: scoped read/count integrity, error propagation, snapshot consistency and focused regression. Open: full exception lifecycle/UI and platform coverage. Next numbered skill after reconciliation: `010-aqstoqflow-inventory-valuation-kernel`.
