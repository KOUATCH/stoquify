# v98 — Source-owned suspense correction verification

9 September 2026. Branch codex/migration-control-plane-release-2026-08-29, HEAD a05a41ef66cd5d98fd69ae3df18225795f912232. Current source bindings: [receipt](evidence/suspense-correction-v98.json) and [baseline](evidence/source-baseline-v98.json). Full workflow assignment remains active.

## Verified boundaries

- 101 assertions / 9 suites passed (session 57432, chunk a20f00): contracts, protected identity/fresh-auth provenance, UI recovery/identity/storage, suspense gateway/workflow, reconciliation certification and notifications, posting identity/regressions.
- 14 actual owned PostgreSQL checks: [runtime](lanes/environment/suspense-correction-v98-770dbf69-16c.json). Exact compensation, original approval retention, rejection, rollback, concurrent retry, repeated posting cycles, zero/net-100.25 trial balance, tampered-history denial, scoped history and voided-source denial.
- Signed-run/certified-close invalidation uses clearly marked synthetic state fixtures. Both periods become stale/blocked and original certificate bytes remain in the receipt. No certificate issuance or expert approval is inferred.
- Actual EN/FR normal password sessions and server actions: [browser](lanes/environment/suspense-correction-v98-browser-c25d67bf-38d.json), 14 screenshots in [evidence](evidence/suspense-correction-v98-screenshots). Draft reload, independent review, current-role denial, password step-up, lost committed response/reload/retry with one reversal, retained history, keyboard focus return, 320/390/768px and 200% text verified. No page errors. English load 25323ms; French 14655ms. These are development observations, not performance certification.
- Final typecheck and changed-file lint completion must have been observed before invoking this one-use publisher; their shell session receipts are recorded in the aggregate evidence.

## Failed attempts retained

- Initial runtime attempts 5c129220-5b9 and 4fa477da-1c4 exposed denial-code and serialization-conflict mapping issues; corrected and rerun.
- Verifier syntax error 02ba8c and invalid fixture exception enum in 43a71c32-28c are test-harness failures, retained separately from successful runs.
- 42 assertions passed in session 69975 but JSON output failed with EPERM (exit1); later reviewed report-writing run passed. Initial TSX syntax/type failures were corrected without weakening compiler checks.
- Browser 27588a43-e8f exposed permission observer refetch/unmount loop. Browser 75fa9b04-1be exposed restored textarea label contamination. Both fixed; subsequent 7368db52-18c passed before final message/cycle updates; the final browser receipt above binds the final source.
- A loopback diagnostic request timed out after10s during browser work; no availability or performance pass inferred from it.

## Commands and environment

Use the bundled Node runtime with inspected direct Jest/TypeScript/ESLint commands; no default build, migrations or seeds were invoked in v98. The exact test list is retained in the JSON report. Runtime and browser helpers are under lanes/environment. The existing v97 migration and generated client are prerequisites; only stoquify_local_registration_20260906_01 was used, with ownership checks and unchanged pre-existing-record snapshots.

## Remaining scope

See [guide](SUSPENSE_CORRECTION_GUIDE.md), [design/review matrix](SUSPENSE_CORRECTION_DESIGN.md) and PR-13 in WORKFLOW_REGISTER.json. No correction export, production rollout, whole-workflow completion, X1 clearance or statutory/security/accessibility certification. The held alert cutover remains held. Final screenshots show correction notifications in the inbox; earlier captures lagged the durable records. Refresh latency has not been measured or assigned a root cause.

Coverage: 229 provisional workflows / 0 complete whole workflows / 209 unmapped entry sources. Prioritization has not reduced the full assignment scope.

## Exact final commands

PowerShell, repository working directory. The bundled executable was used directly to avoid lifecycle hooks. These are execution records; the capture and publisher commands are one-use and must not be rerun under the same evidence version.

```powershell
$verificationNode = 'C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
& $verificationNode node_modules/jest/bin/jest.js --runInBand --runTestsByPath components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx services/reconciliation/__tests__/payment-suspense-correction.contracts.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/__tests__/payment-reconciliation-certification.service.test.ts services/reconciliation/__tests__/payment-reconciliation-notifications.test.ts services/accounting/__tests__/posting-batch-identity.test.ts services/accounting/__tests__/posting.service.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-correction-tests-v98-final.json
& $verificationNode node_modules/typescript/bin/tsc --noEmit --pretty false
& $verificationNode node_modules/eslint/bin/eslint.js components/finance/PaymentSuspenseCorrectionPanel.tsx components/finance/PaymentSuspenseQueue.tsx components/finance/__tests__/PaymentSuspenseCorrectionPanel.test.tsx actions/payments/reconciliation.actions.ts actions/payments/__tests__/reconciliation.actions.test.ts services/reconciliation/payment-suspense-correction.service.ts services/reconciliation/payment-suspense-correction.contracts.ts services/reconciliation/payment-suspense-cycle-ledger.service.ts services/reconciliation/payment-suspense-read.service.ts services/reconciliation/payment-suspense-ledger.service.ts services/reconciliation/payment-suspense-evidence.ts services/reconciliation/payment-suspense-workflow.service.ts services/reconciliation/payment-reconciliation-notifications.ts services/reconciliation/payment-reconciliation-dashboard.service.ts services/reconciliation/__tests__/payment-suspense-correction.contracts.test.ts services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-correction-v98.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-correction-browser-v98.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
& $verificationNode what-next/workflow-modernization/2026-09-05-run-01/publish-suspense-correction-v98.cjs verified-final-typecheck-and-lint-exit-0 lanes/environment/suspense-correction-v98-browser-c25d67bf-38d.json
```

Final terminal receipts: tests `57432/a20f00`, database `18514/12c0cd`, browser `19819/26c688`, typecheck `29568/596206`, lint `42823/024ef9`, baseline `98528/d58937`, publisher `3c16e7`. All exit 0. The final English desktop history and French 320px decision screenshots were visually inspected; this does not establish full screen-reader or contrast certification.
