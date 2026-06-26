# Aqstoqflow HR/Payroll Prompt 05 Accounting Close Gate Report

Date: 2026-06-25
Skill: `aqstoqflow-hrpayroll-05-accounting-close-gate`
Status: Passed

## Purpose

Implement and validate the accounting, SYSCOHADA posting, and close-impact gate for the HR/Payroll roadmap without breaking the system's single-source-of-truth discipline.

## Prerequisite Gate

Passed.

Evidence checked:

- Prompt 02 runtime immutability proof passed with a dedicated PostgreSQL trigger harness.
- Prompt 03 country-pack gate passed with statutory hardcode checks clean.
- Prompt 04 access/privacy actions passed with RBAC, module entitlement, and payroll redaction controls in place.
- Payroll posting rules, posting services, source-link services, close invalidation services, and accountant data-trust services were inspectable.
- Default payroll posting rules already include balanced payroll run and payroll payment recipes covered by focused tests.

## Implementation Completed

1. Close invalidation source catalogue expanded

- Added `PAYROLL_PAYMENT_RELEASED` as a first-ring payroll close-impact source.
- Added `PAYROLL_DECLARATION_PREPARED` as a first-ring payroll close-impact source.
- Kept the existing `PAYROLL_RUN_POSTED` source intact.

2. Payroll payment release now invalidates certified close evidence

- `releasePayrollPaymentBatch` now records close invalidation after the payment business event is applied.
- Invalidation is scoped by accounting period and payment date.
- Evidence hash uses the payroll payment evidence hash.
- Actor context uses the payment releaser.

3. Payroll declaration preparation now invalidates certified close evidence

- `preparePayrollDeclarations` now records close invalidation after declaration business evidence is applied.
- Invalidation is scoped by payroll period start/end.
- Evidence hash is derived from prepared declaration payload hashes.
- Actor context uses the declaration preparer.

4. Accountant data-trust payroll blockers strengthened

Added service-owned accountant portal blockers for:

- Posted or paid payroll runs without ledger posting batches.
- Released or partially settled payroll payment batches without ledger posting batches.
- Posted payroll ledger batches without accounting source-link evidence.

The payroll module evidence now exposes these facts from server-side accounting/payroll data only.

## Files Changed

- `services/accounting/close-assurance-pack.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/payroll/__tests__/payroll-completion.service.test.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`

## Validation

Passed:

- `npx jest services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/accounting/__tests__/posting.service.test.ts services/accounting/__tests__/default-posting-rules.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - 6 suites passed
  - 34 tests passed
- `npm run service:boundary:fail`
  - 0 active service-boundary violations
- `npm run policy:gates`
  - inventory boundary, service boundary, workflow assurance runtime check, hard-delete gate, regulatory hardcode gate, demo/report trust gate, and raw-error boundary gate all passed
- `npm run typecheck`
  - passed
- `npm run lint`
  - passed with 0 errors
  - 5 existing unrelated warnings remain
- `npx prisma validate`
  - schema valid
- `git diff --check -- <touched files>`
  - passed
  - noted existing line-ending warning for `services/payroll/payroll-control.service.ts`

## Blockers

None for Prompt 05.

Non-blocking residuals:

- Existing lint warnings remain in unrelated files:
  - `components/auth/EmailVerificationForm.tsx`
  - `components/dashboard/items/ModernItemFormForEditing.tsx`
  - `components/frontend/custom-carousel.tsx`
  - `components/ui/groups/inventory/ItemManagement.tsx`
  - `config/permissions.ts`

## Single-Source-Of-Truth Review

No SSOT violation introduced.

Controls preserved:

- Payroll business truth remains in payroll services.
- Accounting truth remains in posting batches, journal entries, source links, and data-trust services.
- Close evidence freshness is controlled by the close-assurance service.
- Dashboards are not computing payroll truth.
- No dashboard-specific shadow service was added.
- No duplicated payroll metric source was introduced.
- No speculative UI route or placeholder surface was added.
- No statutory legal automation was expanded.
- No unbalanced payroll posting path was introduced.

## Risks Avoided

- Certified close packs can no longer remain falsely fresh after payroll payment release.
- Certified close packs can no longer remain falsely fresh after payroll declaration preparation.
- Accountant trust packs now surface payroll ledger/source-link gaps before certification.
- Payroll payment and declaration close-impact facts are emitted from protected service workflows, not from UI state.

## Handoff

Prompt 05 is complete.

Recommended next skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`.

Prompt 06 should not create production payroll fixtures blindly. It should first verify seed/backfill scope, tenant safety, idempotency, auditability, and whether any historical payroll records need ledger/source-link reconciliation before HR source-data expansion proceeds.
