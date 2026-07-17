# AqStoqFlow 012 Payroll Presence Completion Gate Execution Report

Date: 2026-06-15  
Route: Route 2 vertical completion slices  
Installed skill: `012-aqstoqflow-payroll-presence-completion-gate`  
Installed path: `C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-completion-gate`

## Decision

012 is now advanced through the requested completion slice: payroll payment release/reconciliation evidence, declaration preparation, protected actions, TanStack hooks, read-only workbench UI, and DB immutability hardening.

The next recommended numbered skill can move to:

- `013-aqstoqflow-data-trust-accountant-portal`

This is allowed because the open 012 gates from the prior backend-foundation report are now closed with service-layer implementation, visible blockers where legal/payment evidence is not final, and focused regression evidence.

## Skills Used

- `000-aqstoqflow-execution-suite`
- `012-aqstoqflow-payroll-presence-engine`
- `012-aqstoqflow-payroll-presence-architect`
- `012-aqstoqflow-payroll-presence-completion-gate`
- `ohada-payroll-engine`
- `regulatory-country-pack-factory`
- `ledger-first-business-events`
- `payment-reconciliation-moat`
- `rbac`
- `enterprise-fraud-and-controls`
- `enterprise-error-handling`

## 011 Entry Gate

The suite was allowed to continue because `what-next/AQSTOQFLOW_011_AP_FINALIZER_CLOSURE_REPORT_2026-06-15.md` records:

- AP posting recipes for supplier invoices and supplier payments.
- AP workbench route/read model.
- Supplier payment outbound reconciliation evidence.
- Country-pack AP status fields.
- Focused AP validation evidence.

## Implemented 012 Completion

### Payroll Payment Release

Implemented in:

- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/payroll-control.service.ts`

Added `releasePayrollPaymentBatch` with:

- posted-payroll-run prerequisite;
- emitted-payslip allocation checks;
- payment destination evidence checks;
- maker-checker and fresh-auth-compatible sensitive-action evaluation;
- idempotency payload hash comparison;
- payroll payment batch and allocation creation;
- SYSCOHADA payroll payment posting through posting rules;
- explicit failed ledger blocker when payment posting cannot be certified;
- outbound `PaymentTransaction`;
- open `PaymentException` until statement/provider evidence matches;
- `payroll.payment_batch.released` business event;
- accounting and reconciliation notifications;
- audit log evidence.

### Payroll Declarations

Implemented `preparePayrollDeclarations` with:

- posted/paid payroll run prerequisite;
- country-pack declaration resolution attempt;
- country-pack provenance pinned to every declaration;
- payload hash;
- internal expert-review fallback when declaration country-pack parameters are not configured;
- `payroll.declaration.prepared` business event and notification.

The implementation does not claim legal submission or authority acceptance. Those remain adapter/evidence-driven future states.

### Actions, Hooks, And UI

Implemented:

- `actions/payroll/payroll-control.actions.ts`
- `hooks/payroll/usePayrollWorkbench.ts`
- `components/payroll/PayrollControlWorkbench.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`

Controls added:

- tenant scope is derived from authenticated RBAC context;
- client-supplied `organizationId`, approver, releaser, and preparer values are overwritten;
- payroll payment release and payroll run approval require fresh auth;
- user-facing errors are returned through protected action results;
- the UI is read-model based and does not import Prisma or mutate financial truth.

### DB Immutability

Added migration:

- `prisma/migrations/20260615193000_payroll_completion_immutability/migration.sql`

Triggers harden:

- posted payroll runs;
- emitted payslips;
- emitted payslip lines;
- released payroll payment batches;
- released payroll payment allocations;
- prepared payroll declarations.

The triggers allow legitimate status progression and correction workflows while blocking silent rewrites of amounts, hashes, country-pack provenance, ledger references, actor fields, and payment/declaration evidence.

## Verification

Passed:

```bash
python "C:\Users\J COMPUTER\.codex\skills\.system\skill-creator\scripts\quick_validate.py" "C:\Users\J COMPUTER\.codex\skills\012-aqstoqflow-payroll-presence-completion-gate"
npm test -- --runTestsByPath services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
npm run typecheck
npm run prisma:validate
npm run inventory:boundary
```

Results:

- Installed skill validation: passed.
- Focused Jest suites: 3 passed, 12 tests passed.
- TypeScript: passed.
- Prisma schema validation: passed.
- Inventory boundary report: 0 active violations.
- Numeric payroll-rate hardcode scan: no matches for hardcoded payroll rate literals in non-test payroll/action/hook/UI code.

The broader payroll scan only matched country-pack resolver paths/review flags such as `payroll.cnps.pensionRatesBps`, which is expected and compliant.

## Remaining Professional Boundary

Country-specific payroll declarations and legal formulas must still be expanded through effective-dated, cited, dual-approved country packs and reviewed by qualified national payroll/accounting experts before production statutory claims.

That is not a 012 blocker because the platform now records expert-review fallback instead of fabricating legal certainty.

## Next Step

Run:

- `013-aqstoqflow-data-trust-accountant-portal`

The accountant portal should consume the source-linked payroll, payment, declaration, ledger, and reconciliation evidence produced by 012.
