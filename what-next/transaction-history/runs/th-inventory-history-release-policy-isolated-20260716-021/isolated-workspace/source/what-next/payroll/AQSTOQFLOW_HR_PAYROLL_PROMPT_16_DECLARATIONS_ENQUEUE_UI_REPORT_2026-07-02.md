# AqStoqFlow HR/Payroll Prompt 16 Declarations Enqueue UI Report

Date: 2026-07-02

Skill applied: `aqstoqflow-hrpayroll-16-declaration-lifecycle`

## Decision

Status: passed for this narrow operator UI slice.

`/dashboard/payroll/declarations` now has a service-backed fresh-auth operator control for `enqueuePayrollAuthorityAdapterExecutionAction`. The UI does not compute payroll or statutory truth. It renders the declaration service's `adapterExecution` gate and submits only the redacted-safe declaration evidence id and client-generated idempotency key to the protected server action.

## Scope Implemented

- Added a service-owned `adapterExecution` gate to declaration workbench rows.
- The gate disables enqueue when proof identifiers are redacted, latest evidence is not certified for production submission, high/critical blockers are present, or an authority adapter execution already exists.
- Added `PayrollDeclarationAuthorityExecutionPanel` to show fresh-auth requirements, safe blocked states, success feedback, and denied/error notices.
- The panel displays only status, adapter key, proof hash, evidence id, and correlation id values that are already service-redacted. It does not render salary/person details, authority payload bodies, credential secrets, bank values, or raw response bodies.
- The existing protected action remains the mutation boundary and continues to derive tenant and actor context server-side.

## Files Covered

- `services/payroll/declaration-lifecycle.service.ts`
- `components/payroll/PayrollDeclarationAuthorityExecutionPanel.tsx`
- `components/payroll/PayrollDeclarationWorkbench.tsx`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx`

## Validation Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx --runInBand`
  - 2 suites passed, 19 tests passed.
- `npx eslint components/payroll/PayrollDeclarationAuthorityExecutionPanel.tsx components/payroll/PayrollDeclarationWorkbench.tsx components/payroll/__tests__/PayrollDeclarationWorkbench.test.tsx services/payroll/declaration-lifecycle.service.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --quiet`
  - Passed.
- `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3000 --timeout-ms 60000 --require-screenshots --route payroll-declarations --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-declarations-enqueue-ui-2026-07-02 --out what-next/payroll/AQSTOQFLOW_PAYROLL_DECLARATIONS_ENQUEUE_UI_BROWSER_2026-07-02.json`
  - Passed for `/en/dashboard/payroll/declarations` with tablet and desktop screenshots.

Blocked by pre-existing unrelated typecheck errors:

- `npm run typecheck`
  - Failed in `services/payroll/payroll-proof-backfill-reconciliation.service.ts` for existing `reviewedProofChain`, `correctionIntentCount`, and function arity errors outside this declarations UI slice.

## Non-Claims

- This does not add live authority adapter mappings, credential custody, scheduler deployment, payment settlement, or production statutory filing claims.
- The server action and authority adapter execution service still enforce certification proof, entitlement, fresh auth, RBAC, idempotency, audit, and redacted execution metadata.
