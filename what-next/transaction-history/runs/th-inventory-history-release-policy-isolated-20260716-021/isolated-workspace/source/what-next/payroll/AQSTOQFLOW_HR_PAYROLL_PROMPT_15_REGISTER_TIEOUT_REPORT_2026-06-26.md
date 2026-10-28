# Aqstoqflow HR/Payroll Prompt 15 Register Tie-Out Report

Date: 2026-06-26

Skill executed: `aqstoqflow-hrpayroll-15-register-tieout`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Prompt: Payroll Register And Livre De Paie Tie-Out

## Outcome

Prompt 15 completed.

The system now has a service-owned payroll register read model that ties payroll run lines to emitted payslips, payment allocations, payment batches, declaration payloads, ledger source links, and close evidence. The register is exposed through protected server actions and a real dashboard route at `/dashboard/payroll/register`.

## Prerequisite Gate

Passed before implementation:

- Payslip/archive/self-service gate: passed through focused payroll payslip/control/privacy/immutability/close tests.
- Statutory unsupported-state gate: passed through existing payroll control and regulatory policy gates.
- Payroll run posting/source-link foundation: present in payroll run, payment batch, accounting source-link, data-trust, and close-assurance services.
- Runtime immutability proof: passed against dedicated local test database `stockflow_immutability_test`.

Gate commands:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand`
  - Result: 7 suites passed, 41 tests passed.
- `npm run prisma:validate`
  - Result: Prisma schema valid.
- `npm run payroll:immutability:runtime`
  - Result: required triggers 7/7, forbidden mutation checks blocked 9/9, allowed lifecycle checks passed 3/3, blockers 0.

## Implemented

- Added `services/payroll/payroll-register.service.ts`.
  - Builds the register from payroll runs, run lines, payslips, payment allocations, payment batches, declarations, accounting source links, and close evidence.
  - Computes tie-out status server-side only.
  - Applies payroll amount redaction through the existing redaction policy.
  - Audits register reads.
  - Exports controlled JSON with watermark, content hash, register hash, audit decision, and business event.

- Added `actions/payroll/payroll-register.actions.ts`.
  - Protects register read with `payroll.reports.read`.
  - Protects register export with `payroll.exports.create` and fresh authentication.
  - Enforces Payroll module entitlement through the shared `protect` wrapper.

- Added `components/payroll/PayrollRegisterTieOut.tsx`.
  - Renders trusted server-provided register state.
  - Shows tie-out checks, blockers, proof hashes, register rows, payment batches, and declarations.
  - Does not compute business truth in the client.

- Added `app/[locale]/(dashboard)/dashboard/payroll/register/page.tsx`.
  - Adds the real protected dashboard route.

- Updated `config/sidebar.ts` and `config/__tests__/sidebar.test.ts`.
  - Adds `Register` to HR & Payroll under `/dashboard/payroll/register`.
  - Preserves the sidebar route-exists smoke check.

- Updated `services/controls/sensitive-action.service.ts`.
  - Adds `payroll.register.export` as a dedicated controlled export action tied to `payroll.exports.create`.

- Added tests:
  - `services/payroll/__tests__/payroll-register.service.test.ts`
  - `actions/payroll/__tests__/payroll-register.actions.test.ts`

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts config/__tests__/sidebar.test.ts services/controls/__tests__/sensitive-action.service.test.ts services/security/__tests__/export-safety.service.test.ts --runInBand`
  - Result: 5 suites passed, 34 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts actions/payroll/__tests__/payroll-register.actions.test.ts config/__tests__/sidebar.test.ts --runInBand`
  - Result: 3 suites passed, 21 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 5 existing warnings outside this slice.
- `npm run prisma:validate`
  - Result: Prisma schema valid.
- `npm run policy:gates`
  - Result: passed.
  - Includes inventory boundary, service boundary, workflow assurance runtime table check, payroll immutability runtime proof, hard-delete gate, regulatory hardcode gate, demo/report trust gate, and raw error boundary gate.

Known lint warnings observed:

- `components/auth/EmailVerificationForm.tsx`: existing hook dependency warning.
- `components/dashboard/items/ModernItemFormForEditing.tsx`: existing image optimization warning.
- `components/frontend/custom-carousel.tsx`: existing image optimization warning.
- `components/ui/groups/inventory/ItemManagement.tsx`: existing image optimization warning.
- `config/permissions.ts`: existing anonymous default export warning.

## Single Source Of Truth Controls

Preserved:

- Services own payroll register truth.
- Server actions expose protected workflows.
- Dashboards render trusted server-provided register data.
- RBAC governs read and export capability.
- Module entitlement governs Payroll access.
- Payroll amount redaction is enforced server-side.
- Register export is controlled, watermarked, audited, and event-backed.

Avoided:

- No new payroll register table or duplicated stored metrics.
- No client-computed payroll totals.
- No dashboard-specific shadow service.
- No declaration submission adapter.
- No payment reconciliation UI.
- No statutory legal claim expansion.
- No mutation of finalized payroll evidence.
- No salary amount exposure without permission and redaction policy.

## Blockers

None for Prompt 15.

## Handoff

Prompt 15 is ready to hand off to Prompt 16: `aqstoqflow-hrpayroll-16-declaration-lifecycle`.

Recommended next action:

Run `aqstoqflow-hrpayroll-16-declaration-lifecycle` to build declaration lifecycle controls on top of the now-available register tie-out, while continuing to avoid unsupported statutory submission claims.
