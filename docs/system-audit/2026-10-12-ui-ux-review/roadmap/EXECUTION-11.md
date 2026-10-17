# Delivery 11 — Reconciliation access recovery

Date: 14 October 2026. Revision inspected: `6f7f6741cabfdeff61989a40455d6f3ea37b33c9`, with substantial pre-existing working-tree changes. This delivery is a narrow presentation correction and runtime recovery attempt, not completion of the role acceptance matrix.

## Change

`PaymentReconciliationWorkbench` previously rendered the generic service-error page for `FORBIDDEN`, with a full-page reload as its only recovery. The current read hook uses that code when current read authority cannot be confirmed, including a failed permission lookup; it does not establish that the organization was deleted or that the role definitively lacks every relevant permission.

The workbench now presents an English/French access-review state, a locale-preserving link to the existing access-review destination, and a button to refresh the existing permission lookup. It does not directly force a financial read when access is unconfirmed. Other service failures retain the read retry. The access panel reuses the existing embedded route-state primitive and does not add a second main landmark. Internal error text remains outside visible task copy.

No server guard, entitlement, tenant binding, query scope, mutation, payment approval or financial calculation changed. The code does not claim to resolve the unidentified loading failure recorded in Delivery 10.

## Verification

- Workflow contract: passed; 196 scripts remain outside the reviewed manifest. Reviewed the current script, registry and lifecycle entries before running it.
- Production-file ESLint: passed with exit 0.
- Scoped TypeScript: passed with exit 0, using normal dependency resolution, `noEmit`, no incremental metadata, and the normal Next environment declarations. An initial configuration omission of CSS-module declarations was corrected in the scoped check configuration; no application types were weakened.
- Mocked tests: **52 passed across two suites**, exit 0; final result recorded in `evidence/delivery-11-tests.json`. The lane includes the real component with mocked application actions/permission hooks, plus the existing actor/organization/revocation scope-hook suite. Initial runs exposed a missing Jest routing mock and test-state leakage; both were corrected in the owned test changes.
- Browser: authenticated acceptance remains pending. No database test, migration, seed, build or deployment ran.

Commands:

```text
npm run agent:workflow:check
node node_modules/jest/bin/jest.js --config docs/system-audit/2026-10-12-ui-ux-review/roadmap/jest.reconciliation-recovery.config.cjs --runInBand --no-cache --json --outputFile=docs/system-audit/2026-10-12-ui-ux-review/roadmap/evidence/delivery-11-tests.json
node node_modules/typescript/bin/tsc --project docs/system-audit/2026-10-12-ui-ux-review/roadmap/tsconfig.reconciliation-recovery.json --pretty false
node node_modules/eslint/bin/eslint.js components/finance/PaymentReconciliationWorkbench.tsx
```

## Current browser/runtime evidence

The previously used application was not reachable at localhost:3000. The current repository already contained a new safe-development runner and configuration changes; these were inspected and retained. The runner creates a fresh output directory and session-specific TypeScript configuration. It loads the normal application environment and can access configured services, so it is not a database-isolated test.

A sandbox-started process reported ready but was not reachable by the connected browser. That owned process was stopped. A host-accessible instance was then started with the same reviewed runner on loopback port 3003, with hidden process startup and separate local stdout/stderr files. No npm predev/Prisma helper was invoked. The host process remains available for user sign-in; runtime output is `.next-dev-session-o0Vvph`, with logs `.codex-tmp/ui11-host-dev.*.log`. The runner also generates the normal Next environment route reference; generated runtime artifacts are outside the owned source patch.

| Route | Browser / role | Locale / viewport / state | Result |
|---|---|---|---|
| `/en/dashboard/finance/reconciliation`, port 3000 | Edge; role not available | EN; normal viewport; connection refused/timed out | No authenticated content verified |
| `/en/dashboard/finance/reconciliation`, port 3003 | Edge; unauthenticated | EN; normal viewport | Redirected to login with the reconciliation callback retained |
| `/en/login?callbackUrl=%2Fen%2Fdashboard%2Ffinance%2Freconciliation`, port 3003 | Edge; unauthenticated | EN; normal viewport; login | Sign-in form and return context rendered. Tab preserved for user sign-in |

No viewport override was applied during this delivery. The user was asked to sign in through the browser, without sharing credentials. No permission or module changes, business transactions, messages or invitations were submitted. Normal reads may produce application audit records.

## Open acceptance and rollback

After accountant sign-in: inspect reconciliation's populated or accurately denied/error state, then French access recovery, accountant portal/access-review destinations, mobile/tablet containment and keyboard focus. Actual owner/cashier journeys and screen-reader checks remain open. Yesterday's accountant evidence remains valid only for its recorded context; today's unauthenticated page does not certify the changed recovery panel in a real role session.

Use `evidence/delivery-11-owned.patch` and its captured baseline for scoped rollback. Do not reset the component/test to HEAD: both contained unrelated changes before this delivery. New check configurations and this report can be removed independently. Nothing was committed or deployed.
