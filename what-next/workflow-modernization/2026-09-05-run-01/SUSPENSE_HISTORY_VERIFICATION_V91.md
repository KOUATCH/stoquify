# Suspense history verification — v91

2026-09-09T07:25:36.558Z. Branch `codex/migration-control-plane-release-2026-08-29`, commit `a05a41ef66cd5d98fd69ae3df18225795f912232`; unrelated dirty-tree changes retained. [Baseline](evidence/source-baseline-v91.json), [receipt](evidence/suspense-history-v91.json), [guide](SUSPENSE_HISTORY_GUIDE.md).

## Results

- Final focused suite: 114 tests / eight suites, session 17356, exit 0. Initial corrected set: 77 tests / four suites, session 57882. Includes real protected wrapper regression, stale/replay/ledger tests and new cursor, identity, read-error and UI recovery cases.
- Owned PostgreSQL: 17 checks passed; source and unrelated records unchanged. Actual prior-day posting date, 31 records across tied-time pages, cross-tenant lookup and read-side immutability are verified. Existing 13 posting/replay tests remain included.
- Actual EN/FR application: three history pages containing 57 fixtures; missing-from-queue approval lookup and exact retry; current account names/journal reference; read-only inspection; mobile 320/390, tablet 768, desktop, keyboard focus, reduced-motion preference, 200% text, stale/fresh-auth/lost-response/expired-session recovery and role-denied route. Both locales passed without page errors. Source and unrelated records unchanged. 24 screenshots retained.
- Final typecheck session 64342 passed. Earlier typechecks 20382/63430 also passed. Nine-file final lint passed, chunk a98c06, no warnings.
- Baseline session 39158 passed. No schema migration or backfill. Actual Next development route compiled/executed; no full production build or deployment in this batch.

## Commands

Bundled Node used directly to bypass migration/seed lifecycle hooks.

### tests

```text
node node_modules/jest/bin/jest.js --runInBand --runTestsByPath "components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx" "services/reconciliation/__tests__/payment-suspense-workflow.service.test.ts" "components/finance/__tests__/PaymentSuspenseQueue.test.tsx" "services/reconciliation/__tests__/payment-suspense-evidence.test.ts" "services/reconciliation/__tests__/payment-suspense-read.service.test.ts" "services/reconciliation/__tests__/payment-suspense-ledger.service.test.ts" "services/_shared/__tests__/protect.test.ts" "actions/payments/__tests__/reconciliation.actions.test.ts" --json --outputFile="what-next/workflow-modernization/2026-09-05-run-01/evidence/suspense-history-final-v91.json"
```

### typecheck

```text
node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false
```

### database

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-history-db-v91.cjs
```

### browser

```text
node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-suspense-history-browser-v91-attempt2.cjs
```

### baseline

```text
node what-next/workflow-modernization/2026-09-05-run-01/capture-source-baseline.cjs
```

### lint

```text
node node_modules/eslint/bin/eslint.js services/reconciliation/payment-suspense-read.service.ts services/reconciliation/payment-reconciliation-dashboard.service.ts actions/payments/reconciliation.actions.ts components/finance/PaymentSuspenseQueue.tsx components/finance/PaymentSuspenseHistory.tsx services/reconciliation/__tests__/payment-suspense-read.service.test.ts components/finance/__tests__/PaymentSuspenseQueue.test.tsx components/finance/__tests__/PaymentReconciliationWorkbench.test.tsx actions/payments/__tests__/reconciliation.actions.test.ts
```

## Failed attempts and limitations

Initial tests session 9884: 14 passed, two UI suites failed to import the server auth dependency (ESM in Jest). The new server-action boundary is now mocked in component tests; actual action/wrapper and browser verification remain separate. Its JSON receipt write failed with filesystem EPERM; terminal chunk b88903 retains the result. No receipt/pass invented. Initial lint found one effect dependency warning, fixed before final lint.

First prepared browser script failed syntax check (df4bc4) because JavaScript replacement-string expansion corrupted a generated selector. It never executed; the separate attempt2 verifier uses explicit locator alternatives and passed syntax (7819d0) before browser execution. Preparation and publisher filesystem permissions are environment restrictions, not gate clearance.

Development load observations: en 19234 ms, fr 10330 ms. These are not controlled performance comparisons or production budgets. Full screen-reader/contrast audit, current-versus-retained inspection copy, all older-work editing/assignment, full resolution/reversal/export, journal navigation and accurate population summary totals remain incomplete.

Coverage: 227 provisional workflows, 0 whole workflows verified, 209 unmapped entry sources. Full-platform goal remains active; no X1 or professional certification asserted.
