# Reconciliation period verification — v87

Evidence date: 2026-09-09. Branch `codex/migration-control-plane-release-2026-08-29`; commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Unrelated dirty-tree changes preserved. Final source hashes are bound by `evidence/source-baseline-v87.json` and the consolidated receipt.

## Findings and correction

Seven negative tests reproduced stale/unchecked closed and locked periods and mismatched period assignments in sign-off, suspense approval and direct suspense posting. The three owner services now use `getOpenPeriodForDate` within their transactions. Sign-off validates its assigned period; suspense posting validates both submitted and retained batch period. The posted batch replay branch precedes the new check, preserving retained evidence after closure. Transaction rollback prevents the preliminary posting-batch creation from surviving a period denial.

Historical graph nodes `payments_reconciliation_actions_approvesuspensepostingaction` and `payments_reconciliation_actions_signreconciliationrunaction` guided discovery. Current `actions/payments/reconciliation.actions.ts`, `hooks/payments/usePaymentReconciliationDashboard.ts` and `components/manager-action-center/PaymentReconciliationSignOffCommand.tsx` confirm the caller chain. Assignment, proposal, suspense approval and standalone run sign-off are separately registered in v87; none is marked whole-workflow complete.

## Results

| Check | Result and binding |
| --- | --- |
| Before change, session 45897 | 20 passed, seven failed across three suites. Terminal `c58737`; Jest JSON write failed with sandbox EPERM. `evidence/reconciliation-period-before-v87-observed.json` preserves the observed counts, not an invented raw Jest receipt. |
| Focused tests, terminal `ba436a` | 34 passed, four suites, exit 0; `evidence/reconciliation-period-focused-v87.json`. |
| Final regressions, session 47216 | 175 passed, 12 suites, exit 0; `evidence/reconciliation-period-final-v87.json`. |
| Actual database, session 80155 | Nine checks passed; `lanes/environment/reconciliation-period-f39eb842-09f.json`; source stable, non-fixture rows unchanged. |
| Full typecheck, session 58773 | Exit 0 against all final production and test edits. |
| Changed-file lint, terminal `9a87e5` | Exit 0 for all three production services and three edited test files. |

Database checks cover actual closed-period denial at both approval and writer boundaries, missing/mismatched periods, real successful independent suspense approval with balanced journal/source evidence, period-lock retention, retained posted replay after closure, and actual sign-off denials for closed/mismatched periods. Denial snapshots cover period, suspense, batch, journal/lines, source links, audit, business events, runs and inbox. No-further-effects replay is checked using the same snapshot.

The lock contender in v87 is a synthetic exclusive period update, not a claim that full close preflight approved the suspense obligation. v86 separately proved the actual close/preflight protocol. v87 does not prove successful real-provider sign-off, all simultaneous sign-off/posting interleavings, or public authorization. Existing successful sign-off/replay and authorization assertions pass in Jest.

## Commands

Run from the repository root using `C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` as `node`. Package/Jest configuration was inspected; these commands bypass npm migration/seed hooks.

```powershell
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-reconciliation-sign-off-command-state.service.test.ts services/reconciliation/__tests__/payment-reconciliation-run.service.test.ts services/reconciliation/__tests__/payment-reconciliation-manual-match.test.ts services/reconciliation/__tests__/payment-reconciliation-manual-candidates.test.ts services/reconciliation/__tests__/payment-reconciliation-evidence.service.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-reconciliation-auto-match.test.ts services/accounting/__tests__/periods.service.test.ts actions/payments/__tests__/reconciliation-workbench.actions.test.ts actions/payments/__tests__/reconciliation.actions.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/reconciliation-period-final-v87.json
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
node node_modules/eslint/bin/eslint.js services/reconciliation/payment-reconciliation-certification.service.ts services/reconciliation/payment-suspense-workflow.service.ts services/reconciliation/payment-suspense-ledger.service.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-reconciliation-period.cjs
```

The verifier asserts local database ownership before creating synthetic tenants in `stoquify_local_registration_20260906_01`. It never resets, migrates, calls a provider or sends external messages. Synthetic settlement approval is explicitly fixture evidence with no live authority. The source baseline capture and publication helpers only inventory source and update this run's records.

No interface or schema changed: no screenshot, browser, native assistive-technology, full build or migration result is claimed. Historical runtime results keep their original bindings. Missing optional skill reference documents were checked and absent; the installed skill and its chunk blueprint were read. The existing permanent and affected review responsibilities, rollout limits and precise operator inputs are in [the guide](RECONCILIATION_PERIOD_GUIDE.md).
