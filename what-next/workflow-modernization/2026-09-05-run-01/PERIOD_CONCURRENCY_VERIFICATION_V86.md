# v86 — Shared period-lock verification

Evidence date: 2026-09-08. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`, with unrelated worktree changes preserved. Final hashes are in `evidence/source-baseline-v86.json` and the consolidated `evidence/period-concurrency-v86.json`.

## Delivered behavior

Transactional `getOpenPeriodForDate` now reads and locks its selected period in one parameterized `SELECT … FOR SHARE`. It validates the current returned state. Root-client checks remain read-only. `closeAccountingPeriod` obtains a tenant-scoped `FOR UPDATE` lock before preflight and retains it through commit. Manual journal posting checks the current locked period and rejects a mismatched draft period assignment.

Production files changed: `services/accounting/periods.service.ts` and `posting.service.ts`. Test fixtures changed in `services/accounting/__tests__/{periods.service,posting.service}.test.ts` and `services/accounting/postings/{post-sale,post-payment,post-reversal}.test.ts`. Transaction doubles now implement the real lock query; no fallback skips the lock for a transaction missing `$queryRaw`.

## Passed checks

| Verification | Result |
| --- | --- |
| Cross-domain Jest, session 67357 | **205 tests in 17 suites passed**; `evidence/period-concurrency-final-v86.json` |
| Owned period concurrency, session 11374 | **Five interleavings passed**; `lanes/environment/period-concurrency-b80977cf-a6a.json` |
| Owned AP/stock reversal regression, session 63691 | **17 persisted-effect checks passed**; `lanes/environment/correction-reversal-320d501d-192.json` |
| Typecheck, session 36132 | Exit 0 against final production code; started before the last test-only changes. Final test changes are covered by the final Jest and lint run. |
| Changed-file lint, session 10648 | Exit 0 for both production files and all five changed tests. |
| Baseline, session 88875 | Captured final source and graph references; no source files were overwritten by capture. |

Period concurrency uses actual database lock waits observed through `pg_blocking_pids`, not a fixed sleep as proof of blocking. It checks writer-first/close-first orderings, one retained audit for concurrent closes, compatible shared writers, independent tenant closure and cross-tenant denial. A temporary fixture lock orders the close-first case. Gates release in `finally` and all transaction promises settle. This verifies the participating services, not every writer in the repository.

AP/stock regression verifies closed/locked/missing-period rejection, no mutation on denial, active-credit dependency, tenant/source integrity, duplicate credit reversal, exact stock quantity/value restoration, immutable evidence, replay after closure and posted journal reversal. Both database receipts report stable source hashes and unchanged non-fixture rows. Their fixtures use trusted synthetic actors and control context; neither is complete public authorization/browser proof.

The source census `evidence/period-writer-coverage-v86-final.json` identifies **29 call sites in 19 files**, excluding the helper definition, plus 18 files with direct period reads needing path classification. Historical graph node `accounting_settings_actions_closeaccountingperiodaction` guided discovery; current `actions/accounting/settings.actions.ts` confirms the actual close action, fresh authentication and server-derived organization. Graph membership and call counts are not workflow completion.

## Exact commands and environments

Commands run from the repository root using the bundled Node executable, without npm lifecycle hooks, migrations or seeds:

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/accounting/__tests__/periods.service.test.ts services/accounting/__tests__/posting.service.test.ts services/accounting/__tests__/customer-settlement.service.test.ts services/accounting/__tests__/customer-settlement-reversal.service.test.ts services/accounting/postings/post-sale.test.ts services/accounting/postings/post-payment.test.ts services/accounting/postings/post-reversal.test.ts services/purchasing/__tests__/ap-control.service.test.ts services/purchasing/__tests__/purchase-correction-ledger.service.test.ts services/inventory/__tests__/inventory-stock-event.service.test.ts services/inventory/__tests__/inventory-transfer.service.test.ts services/inventory/__tests__/inventory-count.service.test.ts services/inventory/__tests__/inventory-adjustment.service.test.ts services/inventory/__tests__/inventory-adjustment-reversal.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-employee-balance.service.test.ts actions/accounting/__tests__/settings.actions.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/period-concurrency-final-v86.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/eslint/bin/eslint.js services/accounting/periods.service.ts services/accounting/posting.service.ts services/accounting/__tests__/periods.service.test.ts services/accounting/__tests__/posting.service.test.ts services/accounting/postings/post-sale.test.ts services/accounting/postings/post-payment.test.ts services/accounting/postings/post-reversal.test.ts
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-period-concurrency.cjs
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-correction-reversal.cjs
```

Database verifiers ran sequentially against the ownership-checked local database `stoquify_local_registration_20260906_01`. Only synthetic tenant records changed. No real payment, notification delivery or production operation occurred. No full build or browser check was run: there is no UI/schema change, and the demonstrated concurrency requirement needs persisted transaction evidence. Existing setup/UI workflows remain incompletely visited. One-query transactional period lookup is a source property, not a production latency certification.

## Failed attempts and corrections

- Session 7323, `period-concurrency-before-v86.json`: three failures and four passes before implementation. Close did not lock before preflight; period lookup returned its unlocked row. The third failure was affected by an unconsumed queued mock result from the preceding negative test; mocks now reset fully between cases. The first two failures independently demonstrate the missing protocol.
- Session 79695, `period-concurrency-focused-v86.json`: nine passes, three manual-posting test failures because its SQL double accepted a Prisma SQL object but not a tagged template. Updated the double to support both actual call forms.
- Session 15878, `period-concurrency-regression-v86.json`: 196 passes, seven failures in three POS fixtures missing `$queryRaw`. Added period-lock results to those transaction doubles; the final 205-test run retains the original financial assertions and adds stale/mismatched manual-period negatives.
- Preliminary `period-writer-coverage-v86.json` counted the helper definition. The final census excludes it and preserves the original output as preliminary evidence.

## Remaining scope

The specific shared-helper/close race is corrected and verified. Independent suspense posting and reconciliation sign-off still use separate period reads and must join the protocol next. Low-level/null-period posting batches, period overlaps, other independent writers, full action/session/role journeys, accessible EN/FR reversal forms, historical invoice-status repair and all remaining platform workflows remain engineering work.

No migration, deployment, X1 clearance or professional certification. See [operator inputs and rollout/recovery guidance](PERIOD_CONCURRENCY_GUIDE.md). The finance period-close workflow receives bounded domain evidence, not complete-workflow status.
