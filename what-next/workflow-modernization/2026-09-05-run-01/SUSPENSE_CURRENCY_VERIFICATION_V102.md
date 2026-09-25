# v102 verification — suspense currency

Branch: `codex/migration-control-plane-release-2026-08-29`. Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`. The worktree contains extensive pre-existing changes. Final source/build bindings are recorded in the v102 aggregate and baseline when publication completes. No production database or real provider was used.

## Preserved failures and corrections

- Tool receipt `2b1856`: regression reproduced EUR posting with a rate of one and unchanged base amounts. One test failed and seven passed. The sandbox then refused writing the requested JSON result (`EPERM`); the observed regression is retained here and in the tool receipt, not represented as a saved JSON file.
- `evidence/suspense-currency-v102-tests.json`: 41 passed, one failed because the new empty-array parameterized test was interpreted as a callback test. Corrected the test-case wrapper; production currency refusal had already been exercised. No test timeout was increased.
- `lanes/environment/suspense-currency-v102-7b80f429-56d.json`: six owned database checks passed; the concurrency check exposed raw `P2010` serialization failure. Financial posting remained refused. Added the existing `CONFLICT` contract mapping for serialization/deadlock errors.
- `lanes/environment/suspense-currency-v102-ece4606d-f6d.json`: all seven initial runtime checks passed; concurrent settings edit returned `CONFLICT`, with unrelated rows unchanged. This predates the final retained-metadata malformed-value check and the extended correction-cycle test; the final receipt supersedes it for current-source claims.
- `lanes/environment/suspense-currency-v102-browser-b9630e14-80a.json`: both browser attempts stopped at required fresh authentication. No financial effects; no page errors. Source changed during this attempt, so its source binding is explicitly false. The subsequent harness completes the actual password step-up; the control was not relaxed.
- Source inspection identified the shared canonical error whitelist dropping the new code. Both adapters now retain the explicit currency code, verified by a focused compatibility test.

## Commands

Commands use the installed Node binary at `C:\Users\J COMPUTER\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe` to avoid migration-bearing package hooks. Working directory is the repository root.

```powershell
& $node node_modules/jest/bin/jest.js --runInBand --runTestsByPath services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts components/finance/__tests__/PaymentSuspenseQueue.test.tsx services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts actions/payments/__tests__/reconciliation.actions.test.ts services/_shared/__tests__/action-errors.test.ts lib/error-handling/__tests__/canonical.test.ts --json --outputFile=what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-currency-v102-tests-complete.json
& $node node_modules/typescript/bin/tsc --noEmit --pretty false
& $node node_modules/eslint/bin/eslint.js services/_shared/action-errors.ts services/_shared/__tests__/action-errors.test.ts lib/error-handling/canonical.ts services/reconciliation/payment-suspense-ledger.service.ts services/reconciliation/payment-suspense-workflow.service.ts components/finance/PaymentSuspenseQueue.tsx services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts components/finance/__tests__/PaymentSuspenseQueue.test.tsx
& $node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-currency-v102.cjs
& $node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-currency-browser-v102.cjs
```

Current focused test receipt: 73 tests across six suites passed (`a557d8`, session 40485). Nine-file lint passed without warnings (`fd99ee`, session 22115). The final typecheck, browser and extended runtime results are appended during publication; missing evidence is not a pass.

The isolated database is `stoquify_local_registration_20260906_01`, checked against its ownership metadata before each run. Browser traffic is fenced to `http://127.0.0.1:3110`. Synthetic roles, statements, accounts and rules are verification fixtures, not organization or statutory approvals. No full build, migration, production-scale performance test or professional certification is claimed.


## Final results

- Typecheck: session 12228, receipt c6ad88, exit 0.
- Lint: session 22115, receipt fd99ee, 9 files, exit 0, no warnings.
- Tests: evidence/suspense-currency-v102-tests-complete.json, 73 passed / 6 suites, no failures.
- Runtime: lanes/environment/suspense-currency-v102-130b09d7-ba8.json, 8 checks passed; current source stable and unrelated records unchanged.
- Browser: lanes/environment/suspense-currency-v102-browser-cb89ae66-7fb.json, EN/FR passed, 12 screenshots, no page errors, current source stable and unrelated records unchanged. EN route-to-queue 28,288 ms, FR 35,796 ms in the local development app; these are observations with no approved budget comparison. EN/FR 320px alert screenshots visually inspected.
- Source baseline: evidence/source-baseline-v102.json, 2803 source/config/test files, 159 pages, 18 handlers and 33 background candidates; this is discovery evidence, not workflow completion.

Aggregate: evidence/suspense-currency-v102.json. Runtime and UI evidence prove only the stated owned scenarios. Full build, native screen-reader/contrast audit, production scale, real FX conversion and terminal resolution remain unverified/unimplemented as specified in the guide.
