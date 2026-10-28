# Aqstoqflow HR/Payroll Prompt 14 Payslip Self-Service Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-14-payslip-self-service`

## Decision

Prompt 14 is implemented for the employee-owned payslip self-service slice.

The implementation adds a server-owned immutable payslip read model, a protected employee self-service page, controlled archive/export evidence, payroll module entitlement, RBAC, fresh-auth export protection, audit logs, watermarks, business-event evidence, and sidebar exposure for the new real route.

No payroll register, broad payroll-office cross-employee viewer, unsupported statutory claim, client-computed payroll truth, dashboard shadow service, unaudited export, or fake PDF binary was added.

## Source Document

The installed skill still names the older source path:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

That file has been consolidated. The resolved source-of-truth prompt suite used for this run is:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

Source document evidence:

- SHA256: `051F492B949022AEC6492A008B53629E638E9E88133ABD8646EBC161DD6FC99E`
- Line count: `1589`
- Prompt 14 location: lines 1054-1123

## Expert Lenses Applied

- Payroll product architect
- Payroll privacy specialist
- UX expert
- Senior enterprise software architect
- Cybersecurity and RBAC specialist
- Accounting and finance controls reviewer
- SaaS module entitlement and tenant-isolation reviewer

## Source Prerequisite IDs

- P4.01
- P4.02
- P4.03
- P0.08
- P0.16
- P0.30
- P3.04

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_04_ACCESS_PRIVACY_ACTIONS_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_08_EMPLOYEE_CONTRACT_WORKFLOW_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_11_COMMAND_READ_MODEL_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_12_COMMAND_CENTER_UX_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_RUNTIME_IMMUTABILITY_PROOF_REPORT_2026-06-25.md`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `prisma/schema.prisma`
- `services/payroll/contract.service.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/security/export-safety.service.ts`
- `services/controls/sensitive-action.service.ts`
- `actions/payroll/payroll-contract.actions.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/payroll-command-read-model.actions.ts`
- `components/payroll/PayrollCommandCenter.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`
- `config/sidebar.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`

## Prerequisite Gate Result

Passed.

| Gate | Result | Evidence |
| --- | --- | --- |
| Own-data restriction passes | Passed | Prompt 08 report confirmed `resolvePayrollEmployeeForUser`; focused tests passed `payroll-contract.service.test.ts`; new Prompt 14 service tests prove employee-user mapping and cross-employee denial. |
| Runtime immutability proven | Passed | `npm run payroll:immutability:runtime` passed: required triggers 7/7, forbidden mutations blocked 9/9, lifecycle checks 3/3, blockers 0. |
| Salary redaction/audit passes | Passed | Prompt 04/11 reports confirmed redaction/audit; focused `payroll-privacy.service.test.ts` passed; new Prompt 14 tests prove own payslip read audit and controlled export audit. |
| Unsupported statutory states visible | Passed | Prompt 13 allows only proven Cameroon CNPS scope; the payslip read model exposes supported scope and unsupported IRPP/authority-adapter claims without pretending completion. |

Prerequisite commands run before implementation:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-contract.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand
npm run prisma:validate
npm run payroll:immutability:runtime
```

Results:

- Payroll prerequisite tests: passed, 4 suites, 27 tests.
- Prisma schema validation: passed.
- Payroll immutability runtime: passed, blockers 0.

## Implementation Summary

Added `services/payroll/payslip-self-service.service.ts`.

- Builds an employee-owned payslip self-service read model.
- Resolves the authenticated actor to exactly one `PayrollEmployee` by tenant and `userId`.
- Queries payslips only through `organizationId`, linked `employeeId`, and `PayrollPayslipStatus.EMITTED`.
- Emits immutable proof metadata: payslip document hash, archive manifest hash, source links, run link, run-line link, payment evidence hashes, declaration payload hashes, ledger posting batch, posted event, and country-pack provenance.
- Redacts payroll amounts unless own-payslip read permission is present.
- Audits every payslip self-service read.
- Prepares a controlled JSON archive export with watermark, purpose, actor, redaction metadata, source links, content hash, audit decision, and `payroll.payslip.exported` business event.

Added `actions/payroll/payroll-payslip-self-service.actions.ts`.

- `getMyPayrollPayslipsAction` derives tenant and actor from the protected context.
- `prepareMyPayrollPayslipExportAction` requires fresh auth before controlled export.
- Both actions enforce payroll module entitlement and do not trust client-supplied tenant or actor identity.

Added `components/payroll/PayrollPayslipSelfService.tsx` and route:

- `app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx`

The page is render-only and calls the protected action. It does not compute payroll totals, evidence state, redaction, eligibility, statutory scope, payment state, or ledger state in the browser.

Updated permission and control policy:

- Added `payroll.payslips.self.read`.
- Added `payroll.payslips.self.export`.
- Added sensitive action `payroll.payslip.self.export` with export control, fresh auth, watermark, and critical risk tier.

Updated navigation:

- `HR & Payroll` is now a real dropdown with:
  - `Overview` -> `/dashboard/payroll`
  - `My Payslips` -> `/dashboard/payroll/payslips`

## Security And Privacy Decisions

- Employee self-service is own-data only.
- No broad cross-employee payslip viewer was added in this slice.
- User-to-employee mapping is required and must be unique.
- Payslip amount visibility is governed by `payroll.payslips.self.read`.
- Export is separately governed by `payroll.payslips.self.export`, fresh auth, controlled-export policy, watermark, and audit.
- Export content excludes raw bank account, tax identifier, social identifier, and payment destination details.
- Module entitlement is enforced on page and action surfaces.
- Client-supplied `organizationId` and `actorId` are overwritten by protected server context.

## Accounting And Finance Decisions

- Payslip totals come from emitted `PayrollPayslip` rows created by the payroll control service.
- Register readiness is not implemented here; the read model links each payslip back to its run line for Prompt 15.
- Ledger tie-out is shown through `ledgerPostingBatchId` and `postedBusinessEventId`.
- Payment tie-out is shown through payment allocation batch status and payment evidence hashes.
- Declaration tie-out is shown through declaration payload hashes linked to the payroll run.
- Country-pack provenance is exposed without adding new statutory formulas.

## UI/UX Decisions

- Added a calm, dense, mobile-safe employee self-service payslip page.
- UI renders service-provided strings and proof data only.
- No decorative or speculative payroll routes were added.
- Sidebar exposure is permitted because `/dashboard/payroll/payslips` now exists and is gated.

## Files Changed

- `services/payroll/payslip-self-service.service.ts`
- `services/payroll/__tests__/payroll-payslip-self-service.service.test.ts`
- `actions/payroll/payroll-payslip-self-service.actions.ts`
- `actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts`
- `components/payroll/PayrollPayslipSelfService.tsx`
- `app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `services/controls/sensitive-action.service.ts`
- `config/sidebar.ts`
- `config/__tests__/sidebar.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_14_PAYSLIP_SELF_SERVICE_REPORT_2026-06-26.md`

Note: the worktree already contained many unrelated modified, deleted, and untracked files before this run. They were not reverted.

## Tests And Validation

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts --runInBand
```

Result: 2 suites, 9 tests passed.

Passed:

```powershell
npm test -- --runTestsByPath config/__tests__/sidebar.test.ts --runInBand
```

Result: 1 suite, 11 tests passed.

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-contract.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts services/payroll/__tests__/payroll-immutability-migration.test.ts services/payroll/__tests__/payroll-control.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts config/__tests__/sidebar.test.ts services/security/__tests__/export-safety.service.test.ts services/controls/__tests__/sensitive-action.service.test.ts --runInBand
```

Result: 10 suites, 66 tests passed.

Passed:

```powershell
npm run prisma:validate
npm run typecheck
npm run service:boundary:fail
npm run policy:gates
npm run payroll:immutability:runtime
```

Policy gate result:

- Inventory boundary: passed.
- Service boundary: passed, active violations 0.
- Workflow assurance runtime table check: passed, blockers 0.
- Payroll immutability runtime: passed, blockers 0.
- Hard-delete gate: passed.
- Regulatory hardcode gate: passed.
- Demo/report trust gate: passed.
- Raw error boundary gate: passed.

Focused lint:

```powershell
npx eslint services/payroll/payslip-self-service.service.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/payroll-payslip-self-service.actions.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts components/payroll/PayrollPayslipSelfService.tsx 'app/[locale]/(dashboard)/dashboard/payroll/payslips/page.tsx' config/sidebar.ts config/__tests__/sidebar.test.ts services/controls/sensitive-action.service.ts config/permissions.ts lib/security/rbac-permissions.ts
```

Result: passed with one existing warning in `config/permissions.ts`:

- `import/no-anonymous-default-export`

Route smoke:

```powershell
GET http://localhost:3001/en/dashboard/payroll/payslips
```

Result: `307` redirect to `/en/login?callbackUrl=%2Fen%2Fdashboard%2Fpayroll%2Fpayslips`, which proves the route exists and the unauthenticated boundary is active.

## Checks Skipped Or Deferred

- `npm run prisma:generate` was skipped because no Prisma schema change was made in this Prompt 14 slice.
- Full `npm test -- --runInBand` was skipped in favor of the focused payroll/security/sidebar suites plus aggregate policy gates.
- Authenticated browser screenshot was skipped because no authenticated browser session is available in this shell. Route smoke confirmed the route boundary; typecheck and component lint covered compile safety.
- Binary PDF generation was not implemented because no approved payroll PDF renderer service exists in the system. The export explicitly records `NOT_GENERATED_NO_APPROVED_PAYROLL_PDF_RENDERER` and produces a controlled JSON archive manifest instead of pretending a PDF was generated.

## Source-Of-Truth Risks Avoided

- No client-side payroll totals.
- No duplicated payslip calculation logic.
- No dashboard-specific payroll shadow service.
- No client-trusted tenant or actor identity.
- No cross-employee self-service access.
- No unaudited export.
- No mutation of emitted payslip evidence.
- No unsupported IRPP or authority-adapter legal claim.
- No payroll register implementation before Prompt 15.

## Remaining Soft Readiness Items

- Add an approved payroll PDF renderer before enabling binary PDF downloads.
- Decide whether a later payroll-office payslip viewer is needed; it should be separate from employee self-service and controlled by `payroll.payslips.read`.
- Prompt 15 should consume the new payslip/run-line source links for payroll register and livre de paie tie-out.

## Blockers

None for the implemented Prompt 14 scope.

## Handoff

Prompt 14 handoff criteria are satisfied for employee-owned payslip self-service and archive/export evidence.

Recommended next skill: `aqstoqflow-hrpayroll-15-register-tieout`.
