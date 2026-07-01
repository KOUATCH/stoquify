# AqStoqFlow HR/Payroll Phase 1 Compensation Approval Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-09-compensation-approval`

Prompt name: Compensation, Rubrique, And Salary Change Approval

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Predecessors:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`

## Decision

The compensation/rubrique and salary-change readiness surface is implemented for a safe read-only workflow slice.

This is not a direct salary editing screen, payroll calculation cockpit, payment release workflow, payslip surface, or statutory formula expansion. The route exposes service-owned compensation workflow facts only: rubriques, taxable/social/employer-charge bases, posting and payslip traceability metadata, country-pack provenance, employee rubrique assignments, salary-change status, approval chain, evidence presence, effective dates, and redaction state.

## Expert Lenses Applied

- Payroll domain expert.
- Security controls architect.
- Accountant and finance controls reviewer.
- OHADA/SYSCOHADA-aware country-pack boundary reviewer.
- Structural UI/UX reviewer for service-backed operator workbenches.

## Prerequisite Gate

Status: passed for this narrow Phase 1 compensation slice.

- Employee and contract workflow surfaces are service-backed and tested.
- Regulatory hardcode gate passed with 0 active findings.
- Salary permission separation exists through `payroll.compensation.read`, salary-specific read aliases, and the redaction service.
- Maker-checker salary change rules exist in the service and are covered by focused service tests.
- Compensation mutations already require protected actions, fresh authentication, tenant-derived actor context, RBAC, module entitlement, business events, and audit.

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_SOURCE_DATA_FOUNDATION_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CONTRACT_LIFECYCLE_REPORT_2026-06-27.md`
- `services/payroll/compensation.service.ts`
- `actions/payroll/payroll-compensation.actions.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `actions/payroll/__tests__/payroll-compensation.actions.test.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/security/redaction-policy.service.ts`
- `services/events/business-event.service.ts`
- `services/payroll/payroll-control.service.ts`
- `lib/security/rbac-permissions.ts`

## Implementation Summary

- Added `/dashboard/payroll/compensation`.
- Added `PayrollCompensationWorkbench` as a read-only compensation approval workbench.
- Expanded `PayrollRubriqueReadModel` with existing posting, payslip, country, schema, and legal-reference fields for register/accounting traceability.
- Updated compensation action revalidation to include `/dashboard/payroll/compensation`.
- Added Compensation to HR & Payroll navigation with `payroll.compensation.read`.
- Extended payroll route smoke coverage for page-level RBAC, module entitlement, protected action delegation, denial states, and route contract checks.
- Extended browser-smoke route catalog, Playwright route list, and `ui:smoke:payroll` route ids to include compensation.

## Security And Privacy

- The page requires `payroll.compensation.read` through page-level RBAC.
- The page and action enforce payroll module entitlement in `enforce` mode.
- The page uses `getCompensationWorkflowAction`; it does not query Prisma or compute payroll truth client-side.
- Salary and assignment amounts are rendered exactly as returned by the compensation service. Without explicit salary permission, the service returns `[REDACTED:PAYROLL]`.
- Mutation paths remain action-only and fresh-auth protected:
  - rubrique upsert and assignment require `payroll.compensation.manage`;
  - salary change request requires `payroll.salary_changes.request`;
  - salary change approval/rejection requires `payroll.salary_changes.approve`;
  - salary change application requires `payroll.salary_changes.apply`.
- Maker-checker prevents a requester from approving, rejecting, or applying their own salary change.

## Accounting And Finance Decisions

- Rubriques now expose payslip label, posting debit account, posting credit account, taxable base, social base, employer-charge flag, statutory parameter path, country-pack version/schema/hash, legal reference, verification status, and capability status through the read model.
- No unreviewed formulas were added.
- No payroll run calculation, posting, payslip emission, payment release, or declaration workflow was added in this slice.
- Salary changes remain effective-dated contract versioning through the service, not direct salary mutation from the UI.

## UI/UX Decisions

- The first screen is an operator workbench, not a wizard or mutation console.
- Metrics show workflow state: rubriques, active rubriques, assignments, requested changes, approved changes, and redacted changes.
- Tables expose risk and control context: bases, posting traceability, country-pack provenance, assignment policy, approval chain, evidence presence, effective dates, and redaction reason.
- The page links back to contract readiness because compensation depends on active contract foundations.

## Verification

Passed:

```powershell
npm run regulatory:hardcode:fail
npm test -- --runTestsByPath actions/payroll/__tests__/payroll-compensation.actions.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts __tests__/payroll-dashboard-routes.smoke.test.tsx config/__tests__/sidebar.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run lint -- --quiet
node scripts/ui-route-smoke-gate.js --help
```

Results:

- Regulatory hardcode gate: passed, 0 active findings.
- Focused Jest: 4 suites passed, 33 tests passed.
- Prisma schema validation: passed.
- Typecheck: passed.
- Service boundary gate: passed, 0 active violations.
- ESLint: passed with 0 errors and 5 existing warnings in unrelated files.
- UI smoke script parse/help run: passed.

Skipped:

- `npm run prisma:generate`: no schema or migration changes.
- Authenticated browser smoke execution: still requires a seeded payroll-enabled user and saved `playwright/.auth/payroll.json` state.
- Full `npm run policy:gates`: not run for this narrow route/DTO slice because the relevant hardcode and service-boundary gates passed; full policy gates include heavier runtime/database checks outside this route exposure.

## Files Changed

- `services/payroll/compensation.service.ts`
- `actions/payroll/payroll-compensation.actions.ts`
- `actions/payroll/__tests__/payroll-compensation.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/payroll/compensation/page.tsx`
- `components/payroll/PayrollCompensationWorkbench.tsx`
- `__tests__/payroll-dashboard-routes.smoke.test.tsx`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `scripts/ui-route-smoke-gate.js`
- `tests/e2e/payroll-authenticated-smoke.spec.ts`
- `package.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMPENSATION_APPROVAL_REPORT_2026-06-27.md`

## Source-Of-Truth Risks Avoided

- No UI-owned salary calculation.
- No direct salary editing bypass.
- No statutory formula claim without country-pack provenance.
- No payroll posting or payment release before downstream gates.
- No salary/person amount leakage beyond the service redaction decision.

## Handoff

Compensation source data is now ready for payment-destination evidence readiness and command read-model expansion. The next safe slice is Prompt 10: Payment Destination, HR Evidence, And Attendance Readiness.
