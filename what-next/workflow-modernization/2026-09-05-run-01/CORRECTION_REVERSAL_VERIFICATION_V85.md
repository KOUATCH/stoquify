# v85 — Period-safe purchase correction reversal

Evidence date: 2026-09-08. Branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Unrelated worktree changes preserved. Use `evidence/source-baseline-v85-final-2.json` and `evidence/correction-reversal-v85.json` for final hashes; preliminary baselines remain separate.

## Finding, correction and scope

`reversePurchaseCorrectionLedgerInTx` returned before the period lookup when the original journal ID was null. It could also mark any non-reversed referenced batch reversed without checking whether it represented the same source or already had posted journal effects. Both credit and return reversal callers reach this branch before their supplier or stock effects.

Moved the existing open-period check before the branch. Both callers now supply the original source ID. A no-journal reversal checks for a retained source journal and conditionally updates only the original tenant/source/purpose's PENDING or FAILED batch with no journal entries. Missing, mismatched, posted or changed evidence is rejected. An absent batch pointer cannot conceal retained source posting evidence. An explicit `PURCHASING_AP_UNPOSTED_CORRECTION_REVERSED` audit distinguishes this from journal reversal. Posted-journal lookup also checks original source ID; existing line-for-line reversal and close invalidation remain.

Production changes are limited to `services/purchasing/purchase-correction-ledger.service.ts` and `purchase-return-credit.service.ts`. Tests changed in `services/purchasing/__tests__/purchase-correction-ledger.service.test.ts` and `services/inventory/__tests__/inventory-stock-event.service.test.ts`. The latter had stale database doubles and an obsolete generic audit expectation; it now verifies actual business-event conflict audit/anomaly persistence and still forbids stock effects, including when evidence persistence fails. No inventory production code changed.

## Verification commands

All commands use the bundled Node executable directly from the repository root. No npm lifecycle hooks, migration-bearing build or seeds were invoked.

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/purchasing/__tests__/purchase-correction-ledger.service.test.ts services/purchasing/__tests__/purchase-return-credit.service.test.ts services/purchasing/__tests__/supplier-payment-balance.test.ts services/purchasing/__tests__/ap-control.service.test.ts services/inventory/__tests__/inventory-stock-event.service.test.ts services/accounting/__tests__/journal-close-invalidation.service.test.ts services/accounting/__tests__/periods.service.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/correction-reversal-final-v85-3.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/eslint/bin/eslint.js services/purchasing/purchase-correction-ledger.service.ts services/purchasing/purchase-return-credit.service.ts services/purchasing/__tests__/purchase-correction-ledger.service.test.ts
node node_modules/eslint/bin/eslint.js services/inventory/__tests__/inventory-stock-event.service.test.ts
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-correction-reversal.cjs
```

Final combined session 60715 passed 102 tests in seven suites. Typecheck session 96233 passed against final production code before the last inventory test-only correction; final recheck session 48386 is recorded in the consolidated receipt after terminal completion. Service/test lint session 48707 passed. Final inventory-test lint returned exit 0 in command chunk `f37d60` (earlier session 16855 also passed). The focused intermediate run 35810 passed 39 tests in three suites.

The owned PostgreSQL run 22186 passed **17 checks** in `lanes/environment/correction-reversal-f9a3a446-a20.json`. It verifies:

- Credit and return rejection in closed, locked and missing reversal periods, including when the original journal is absent.
- No changes to invoice, cash, supplier, stock, document sequences, batches, journals, audits or outbox on rejection.
- Existing active-credit dependency, cross-tenant identifier rejection, posted/mismatched batch rejection and detection of a retained journal behind inconsistent service input.
- Concurrent duplicate credit reversal commits once; a later open period works while the original is closed.
- Return reversal restores quantity and value, references the original movement, preserves cash and records the unposted audit event once. Inventory movement totalCost is an unsigned magnitude; quantity carries direction.
- Exact credit and return retries after the reversal period closes have no new effects.
- Posted credit evidence remains immutable; actual posted journal reversal mirrors accounts/debits/credits in a later open period.

The verifier asserts ownership of `stoquify_local_registration_20260906_01` before writes and uses synthetic tenants only. It hashes non-fixture rows and confirms unchanged values. Five production source hashes are stable during the final run. Service fixtures use trusted actor arguments, not a live authorization/session proof. Synthetic posting rules and bank evidence are not statutory or bank approval. Outbox rows are observed but no delivery worker or external notification is run.

## Failed attempts retained

| Attempt | Result and resolution |
| --- | --- |
| Session 68552 / `evidence/correction-reversal-before-v85.json` | Before correction: three negative period cases failed because reversal resolved; original posted-journal case passed. This demonstrates the defect. |
| Session 1183 | Verifier failed before fixture creation: InventoryLevel has tenant ownership through Item, not a direct organizationId field. Corrected the snapshot query. No final receipt was produced because its final snapshot hit the same error. |
| Session 23022 / `correction-reversal-8044a2b4-304.json` | Eleven checks passed, then the verifier incorrectly expected signed totalCost. Source uses absolute valueDelta; corrected the assertion and added restored stock-value verification. |
| Session 61956 / `correction-reversal-0ed9f659-070.json` | Thirteen checks passed; the immutable credit trigger rejected an attempted synthetic pointer edit. Kept the guard intact and tested inconsistent helper input without editing retained evidence. |
| Session 54672 / `evidence/correction-reversal-final-v85.json` | 100 tests passed, one inventory conflict test failed due to stale audit doubles/expectation. Updated the test to verify current audit and anomaly records; did not weaken production controls or the no-stock-effects assertion. |
| Session 73635 / `evidence/correction-reversal-final-v85-2.json` | 101 tests passed, one new representation assertion expected a hash prefix. The event service emits 64 hexadecimal characters; corrected that assertion. Final session 60715 passed all 102 tests. |

Earlier receipts remain evidence of their actual partial outcomes, not final success. The consolidated receipt binds the final passing checks and test files to the final baseline.

## UI, rollout and remaining work

No UI changed. Search found no production component calling either reversal action, matching the workflow register. Therefore there is no claimed EN/FR/mobile/browser reversal completion. Prior v84 history screenshots remain historical history evidence. Building the role-appropriate preview, confirmation, retry and retained reversal experience is still necessary.

No schema migration, production deployment, real payment, message, X1 clearance or certification occurred. Release the two production files together. Preserve all financial records and immutable evidence during recovery. See [the operator/input guide](PURCHASE_CORRECTION_REVERSAL_GUIDE.md).

The specific no-journal period bypass reported in v84 is corrected; the wider assignment remains incomplete. Further engineering includes period-close/posting-recovery races across shared services, full public authorization and separation-of-duties review, missing reversal interfaces, historical status drift repair and downstream settlement/close. Current shared `getOpenPeriodForDate` is a read, and `closeAccountingPeriod` runs preflight before updating the period; this batch does not certify their broader concurrency protocol. Retiring an unposted correction batch also does not prove every separate inventory posting obligation has been resolved. These are remaining engineering boundaries, not approval requests.
