# AqStoqFlow HR/Payroll Phase 1 Prompt 14 Report

Date: 2026-06-27
Prompt: 14 - Payslip, Archive, Export, And Employee Self-Service
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Executive Summary

Prompt 14 is materially present in the codebase: employee self-service payslip reads are tenant scoped, restricted to the actor's own employee identity, redaction-aware, and audited. Payslip export/archive preparation already includes content hashes, an archive manifest hash, watermarking, source links, business event emission, and redaction metadata.

The implementation gap closed in this pass was fresh-auth evidence integrity. Previously, the protected server action enforced fresh authentication, but the payroll export action passed a newly created `Date` into the export service. That made the export evidence look fresh without proving it came from the verified authentication step. The shared action guard now carries verified fresh-auth claims into the handler, and the payslip export action uses the verified `lastAuthAt` value.

## What Is Present

- Self-service route: `app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx`
- Self-service component: `components/payroll/PayrollPayslipSelfService.tsx`
- Protected actions: `actions/payroll/payroll-payslip-self-service.actions.ts`
- Self-service service boundary: `services/payroll/payslip-self-service.service.ts`
- Privacy controls: own-data restriction, salary-read audit, and payroll amount redaction behavior
- Export/archive evidence: JSON export content, content hash, archive manifest hash, watermark id, business event id, generated timestamp, redaction state, and source links
- Module entitlement: payroll module gate on self-service read and export actions
- Tests for own-data denial, redaction audit, fresh-auth export blocking, and archive hash behavior

## Change Made

### Shared Protected Action Context

File: `services/_shared/protect.ts`

The shared `protect` wrapper now exposes a typed `ProtectedActionContext` with optional verified fresh-auth evidence:

- verified claims from `requireFreshAuth`
- `lastAuthAt` converted to a `Date`

Handlers for fresh-auth-protected actions can now use the authentication evidence that was actually checked by the guard.

### Payslip Export Action Evidence

File: `actions/payroll/payroll-payslip-self-service.actions.ts`

The export action now passes `ctx.freshAuth?.lastAuthAt` to `preparePayrollPayslipExport` instead of manufacturing freshness from the current request time. This keeps the export proof aligned with the session step-up event.

### Test Coverage

Files:

- `services/_shared/__tests__/protect.test.ts`
- `actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts`

The tests now assert that:

- `protect` forwards verified fresh-auth evidence into the action handler
- the payslip export action passes the verified `lastAuthAt` timestamp to the export service

## Accounting And System Integration Position

This slice strengthens the trust bridge between HR/payroll self-service and the accounting control layer:

- payslip export evidence no longer relies on fabricated request-time freshness
- exported payslip artifacts keep ties to payroll run, calculation/source links, redaction state, hash evidence, and business events
- employee self-service remains separated from manager/payroll-admin cross-employee access
- module entitlement, RBAC, and tenant context are enforced before export preparation

This supports later payroll register tie-out work because exported employee artifacts can be treated as evidence generated under verified actor, tenant, and freshness constraints.

## Remaining Gaps

- Browser smoke was not executed in this pass because the route requires an authenticated payroll tenant session and the current verification focused on server/service gates.
- The visible self-service page currently presents payslip proof data, but a polished in-browser export/download workflow remains a future UX hardening item.
- PDF generation remains intentionally deferred; the current supported export artifact is structured JSON with hash and archive evidence.
- Prompt 15 should verify that payslip totals reconcile to payroll register, ledger, payment, declaration, and journal posting records without widening employee self-service privileges.

## Verification

Passed:

```text
npm test -- --runTestsByPath services/_shared/__tests__/protect.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts --runInBand
npm test -- --runTestsByPath services/payroll/__tests__/payroll-immutability-migration.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run prisma:validate
npm run service:boundary:fail
npm run typecheck
npm run lint -- --quiet
git diff --check
```

Lint result:

- 0 errors
- 5 existing warnings outside this payslip evidence change

`git diff --check` result:

- Passed
- Reported line-ending normalization warnings only

## Prompt 14 Status

Status: Completed for the secure server/service evidence layer.

The system now has a stronger Prompt 14 foundation: own-payslip access, redaction, archive/export proof, and fresh-auth evidence are enforced through the protected action boundary. The remaining work is product polish and browser-level export UX, not a core trust-boundary blocker.
