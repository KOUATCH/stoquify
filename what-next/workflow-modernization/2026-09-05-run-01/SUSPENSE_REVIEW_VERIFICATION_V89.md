# Suspense review verification — v89

Evidence date 2026-09-09T06:33:01.831Z. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`. Current dirty source is bound by [baseline](evidence/source-baseline-v89.json) and [receipt](evidence/suspense-review-v89.json). Unrelated changes were preserved.

## Results

- 84 tests in six suites passed (session 18807): evidence revisions, action/guard authority, suspense service and workbench/queue behavior. Eleven queue tests include exact EN/FR recorded amount display.
- Thirteen actual owned-PostgreSQL checks passed: source/tenant rejection, stale proposal, idempotency-key conflict, replacement revision, one journal/audit under concurrent approval, exact replay after synthetic period closure, terminal assignment denial and inconsistent receipt rejection. The period status mutation is synthetic; it does not prove full close-workflow approval.
- Two actual browser journeys passed in EN/FR with normal sign-in, password step-up, persisted proposal/posting, stale rejection, lost committed response/exact retry and current-role direct-route denial. No page errors. Both source and nonfixture database records remained unchanged in each verifier.
- Desktop, 320/390px mobile and 768px tablet, keyboard focus entry/return and reachable review confirmation checked. 200% text reflow and reduced-motion preference exercised. This is not complete screen-reader/contrast certification.
- Final typecheck session 88407 and 12-file lint session 42572 passed. No schema migration. Actual Next development route compilation/execution passed; full production build was not run and remains a release verification item. Default build contains migration hooks and was not used.

## Exact commands

Commands ran from the workspace with the bundled Node executable `C:/Users/J COMPUTER/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`, without npm lifecycle hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx" "services/reconciliation/__tests__/payment-suspense-evidence.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "components/finance/__tests__/PaymentSuspenseQueue.test.tsx" "actions/payments/__tests__/reconciliation.actions.test.ts" "actions/payments/__tests__/suspense-guard.integration.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-review-final-v89.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### lint

```text
node node_modules/eslint/bin/eslint.js "components/finance/PaymentSuspenseQueue.tsx" "components/finance/__tests__/PaymentSuspenseQueue.test.tsx" "services/reconciliation/payment-suspense-evidence.ts" "services/reconciliation/payment-suspense-workflow.service.ts" "services/reconciliation/payment-reconciliation-dashboard.service.ts" "services/reconciliation/__tests__/payment-suspense-evidence.test.ts" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "actions/payments/reconciliation.actions.ts" "actions/payments/__tests__/reconciliation.actions.test.ts" "actions/payments/__tests__/suspense-guard.integration.test.ts" "hooks/payments/usePaymentReconciliationDashboard.ts" "components/finance/PaymentReconciliationWorkbench.tsx"
```

### database

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-review.cjs
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-review-browser.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

## Attempts and observations

- Database attempt session 96362 could not write its receipt (EPERM); no pass inferred from that attempt. Narrow authorized execution produced the retained passing receipt.
- Initial UI suite could not load the ESM icon dependency; `evidence/suspense-review-ui-v89.json` is retained. Test-only icon mock corrected the harness; nine checks passed in `evidence/suspense-review-ui-v89-attempt2.json`.
- Browser session 21348 and typecheck session 92246 lost their handles and were confirmed absent by process inspection; no browser receipt or final typecheck pass attributed to them.
- Initial complete browser receipt `lanes/environment/suspense-review-browser-e053a002-5d2.json` passed behavior, but visual inspection exposed rounded 100.25 → 100 in XAF approval and mobile screenshots outside the review. Queue precision was corrected and final browser assertions/captures strengthened. Original evidence remains retained.
- Earlier typechecks 6491 and 55278 passed before the final amount-display patch; final source uses the terminal session above.

Final development route load observations: en 19270 ms, fr 12408 ms. The initial run measured EN 103774 ms and FR 8360 ms including development compilation/caches. These uncontrolled observations do not establish improvement or production performance certification.

## Scope remaining

See [guide](SUSPENSE_REVIEW_GUIDE.md) for inputs, owners, recovery, rollout and review matrix. Full workflow completion is false. The register contains 226 provisional workflows, 0 whole workflows verified and 209 unmapped entry sources. Draft reload/session recovery, complete history/exports, delivery, standalone close obligations, posting-configuration review and the wider platform remain open. No deployment, live payment, external message or X1 clearance occurred.
