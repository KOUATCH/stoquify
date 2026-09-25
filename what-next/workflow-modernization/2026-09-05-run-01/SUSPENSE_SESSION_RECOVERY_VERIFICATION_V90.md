# Suspense session recovery verification — v90

Date 2026-09-09T07:04:25.507Z. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; dirty working-tree changes retained. [Source baseline](evidence/source-baseline-v90.json), [machine receipt](evidence/suspense-recovery-v90.json), [operator/rollout guide](SUSPENSE_SESSION_RECOVERY_GUIDE.md).

## Passed evidence

- 82 tests in seven suites, session 68900: scoped parsing, malformed/oversized storage, storage failure, exact retained requests, remount recovery, actor/organization cache isolation, permission-refresh behavior, protected action identity and existing workbench/permission invalidation.
- Actual EN/FR browser journeys passed: draft reload, lost committed proposal response/reload/exact retry with one proposal audit, independent review, fresh password verification, stale rejection, lost approval response, session expiry, normal sign-in, restored server facts and exact retry with one journal/approval audit. Role revocation denied the route. No page errors; source hashes and nonfixture records remained unchanged.
- Responsive review at desktop, 320/390px mobile and 768px tablet; keyboard focus entry/return, reachable confirmation, reduced-motion preference and 200% text reflow exercised. Full screen-reader/contrast audit remains incomplete.
- Typecheck session 56038 and 12-file changed lint session 42296 passed. No schema/migration change. Actual isolated Next development route executed; no full production build or deployment in this batch.

## Commands

Commands ran from the workspace using the bundled Node executable, bypassing npm migration/seed hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "hooks/payments/__tests__/permission-scope.test.tsx" "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx" "components/finance/__tests__/PaymentSuspenseQueue.test.tsx" "hooks/payments/__tests__/suspense-dashboard-scope.test.tsx" "actions/payments/__tests__/reconciliation.actions.test.ts" "hooks/payments/__tests__/suspense-recovery.test.ts" "hooks/__tests__/permission-invalidation.workflow.test.tsx" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-recovery-final-v90-attempt2.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-recovery-browser-v90.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

### lint

```text
node node_modules/eslint/bin/eslint.js "lib/auth-client.ts" "actions/payments/reconciliation.actions.ts" "actions/payments/__tests__/reconciliation.actions.test.ts" "hooks/payments/usePaymentReconciliationDashboard.ts" "hooks/payments/suspense-recovery.ts" "hooks/payments/__tests__/suspense-recovery.test.ts" "hooks/payments/__tests__/suspense-dashboard-scope.test.tsx" "hooks/payments/__tests__/permission-scope.test.tsx" "components/finance/PaymentSuspenseQueue.tsx" "components/finance/PaymentReconciliationWorkbench.tsx" "components/finance/__tests__/PaymentSuspenseQueue.test.tsx" "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx"
```

## Failed attempts retained

- `evidence/suspense-recovery-focused-v90.json`: test-parser parenthesis error and two broad page-status assertions; 63 passed, two failed, one suite could not run.
- `evidence/suspense-recovery-focused-v90-attempt2.json`: 77 passed, one ambiguous text selector failed. The corrected selector still requires the manual workflow status role.
- `evidence/suspense-recovery-focused-v90-attempt3.json`: 78 passed before adding protected-action and actual permission-scope coverage.
- Typecheck 63989 found a possibly-undefined permission snapshot access; corrected. Typecheck 48183 passed before the later permission-refetch correction.
- `evidence/suspense-recovery-final-v90.json`: 79 passed; the added permission-hook suite hit an unrelated ESM routing import. Test-only routing mock isolated the intended behavior; final seven-suite receipt passed.
- Browser `lanes/environment/suspense-recovery-v90-browser-5e693362-f31.json`: both locales failed before queue discovery. Source review identified a mount/refetch loop caused by changing the cache key during permission refresh. Same-actor cache scope now remains stable while permissions stay empty until ready.
- Browser `lanes/environment/suspense-recovery-v90-browser-5831abd2-c8b.json`: seven stages in each locale reached expired-session restoration, then the verifier checked for the password prompt before it rendered. Screenshots show the correct fresh-auth guard. The verifier now waits for prompt or retained result before branching.

Final development load observations: en 11580 ms, fr 11766 ms. Compilation/cache differences prevent treating these as controlled performance comparisons.

## Remaining scope

Coverage: 226 provisional workflows, 0 whole workflows verified, 209 unmapped entry sources. No full workflow completion is asserted. Full history/pagination, posting setup and standalone close obligations, notification lifecycle and the remaining platform still require implementation/review. The tab store does not provide cross-device recovery, authenticate a signer or establish posting truth.
