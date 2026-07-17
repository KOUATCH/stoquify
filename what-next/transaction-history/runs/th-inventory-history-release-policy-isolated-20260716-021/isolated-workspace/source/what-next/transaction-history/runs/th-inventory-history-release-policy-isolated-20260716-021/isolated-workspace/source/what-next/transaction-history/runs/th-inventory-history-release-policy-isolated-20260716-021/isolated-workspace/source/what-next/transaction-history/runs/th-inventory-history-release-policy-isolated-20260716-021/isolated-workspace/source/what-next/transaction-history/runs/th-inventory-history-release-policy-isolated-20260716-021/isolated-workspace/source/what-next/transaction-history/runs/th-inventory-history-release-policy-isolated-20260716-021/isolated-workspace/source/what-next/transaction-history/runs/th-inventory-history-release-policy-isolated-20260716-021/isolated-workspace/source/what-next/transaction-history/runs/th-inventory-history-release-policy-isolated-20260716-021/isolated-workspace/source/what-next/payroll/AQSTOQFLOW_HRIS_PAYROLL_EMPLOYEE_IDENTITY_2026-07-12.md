# AqStoqFlow HRIS/Payroll Employee Identity Gate

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-03-employee-identity`
Scope: employee identity, tenant scope, duplicate-risk, user-to-employee mapping, self-service access, redaction, audit, and payroll-snapshot readiness evidence.
Next handoff: `aqstoqflow-hris-payroll-04-org-structure-manager-scope`

## Executive Decision

The current employee identity slice is ready for review for controlled HRIS/payroll execution. No employee identity stop-blocker was found: employee source data cannot be created or read without tenant context, payroll employee reads are permission-gated, linked users must belong to the same organization, duplicate employee/user mappings are rejected, and self-service payslip access resolves only the authenticated user's employee record inside the tenant.

This does not complete a full HRIS product. It confirms the employee identity boundary is strong enough to hand off to org structure and manager scope hardening.

## Files Inspected

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `prisma/schema.prisma`
- `services/payroll/employee.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `actions/payroll/payroll-employee.actions.ts`
- `actions/payroll/payroll-payslip-self-service.actions.ts`
- `services/payroll/__tests__/payroll-employee.service.test.ts`
- `services/payroll/__tests__/payroll-payslip-self-service.service.test.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`

## Data Ownership

| Data | Owner decision | Current evidence |
| --- | --- | --- |
| Employee identity | HRIS logical owner, stored today in `PayrollEmployee` | Tenant-scoped `organizationId`, unique employee number per org, unique user mapping per org |
| User-to-employee mapping | HRIS plus Auth/RBAC boundary | `userId` is verified against the same organization before link; self-service resolves by actor user id and organization |
| Identity evidence | HRIS document/evidence boundary | Evidence metadata stores document hashes and reference types, not document bodies |
| Payroll readiness identity facts | Payroll consumer of certified HRIS facts | Source-data read model exposes blockers for user mapping, active contract, attendance freeze, and payment destination evidence |
| Payslip self-service identity | Payroll self-service consumer | Payslip reads filter by authenticated employee id, emitted status, and organization |

## Tenant And RBAC Decision

- Action handlers derive `organizationId`, `actorId`, and permissions from protected server context, not client-supplied payloads.
- Employee source-data reads require `payroll.employees.read` or `payroll.command.read`.
- Employee source-data writes and evidence attachment require `payroll.employees.manage` plus fresh authentication at the action boundary.
- Self-service payslip reads require `payroll.payslips.self.read`.
- Self-service payslip export requires `payroll.payslips.self.export` plus fresh authentication and export-safety checks.
- Payroll employee manage permissions are risk-rated `crit`; self-service export is risk-rated `crit`.

## Audit And Redaction Decision

- Employee source-data reads are audited with actor, organization, returned count, and salary redaction decision.
- Employee profile create/update records a business event and audit log entry.
- Employee evidence attachment records a business event and audit log entry.
- Payslip self-service reads are audited with actor, organization, employee id, payslip id/count, and amount access decision.
- Payslip exports are watermarked, export-safety audited, and business-event backed.
- Employee read models mask email addresses and exclude salary, raw bank account, mobile money phone, raw tax id, raw social id, payment destination payloads, and document bodies.

## Required Gate Coverage

| Gate | Status | Evidence |
| --- | --- | --- |
| Tenant isolation | Pass | Source reads filter `organizationId`; actions override client org/actor with protected context; linked users are checked inside the same organization |
| Duplicate prevention | Pass | Conflicting employee-number and user mappings reject with `ConflictError`; schema also has org-scoped unique employee number and user mapping |
| User-to-employee access denial | Pass | Self-service loads exactly one employee for actor plus organization, and payslip lookup filters by that employee id |
| Redacted employee payload tests | Pass | Focused tests assert no salary, bank, mobile money, or tax identifier leaks in employee/self-service payloads |

## Gates Run

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts actions/payroll/__tests__/payroll-employee.actions.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts actions/payroll/__tests__/payroll-payslip-self-service.actions.test.ts --runInBand
```

Result: 4 test suites passed, 21 tests passed.

## Skipped Checks

- Full `npm test` was not run because this was a focused employee-identity slice.
- Full typecheck was not run because no production TypeScript code changed.
- Browser smoke was not run because this slice verified service/action identity boundaries, not layout or route rendering.

## Current Blockers

No employee identity stop-blocker was found for controlled HRIS/payroll execution.

Remaining downstream blockers:

| Blocker | Status | Required next skill |
| --- | --- | --- |
| Org, branch, position, and manager scope | Open | `aqstoqflow-hris-payroll-04-org-structure-manager-scope` |
| Full HRIS namespace/source-data breadth | Open | Continue HRIS-first chain |
| Manager-scoped employee access | Open | `aqstoqflow-hris-payroll-04-org-structure-manager-scope` |
| Contract lifecycle as complete HRIS domain | Open | `aqstoqflow-hris-payroll-05-contract-lifecycle` |
| Payroll input readiness gate | Open | `aqstoqflow-hris-payroll-09-input-readiness-gate` |

## Residual Risk

- The implementation still stores HRIS-like identity fields in `PayrollEmployee`; this is acceptable for the current compatibility layer but should remain logically HRIS-owned.
- `department`, `jobTitle`, `costCenter`, and `locationId` are identity/readiness attributes today, but they are not yet a certified org-structure and manager-scope model.
- Self-service own-payslip access is strong, but broader employee/manager self-service must wait for manager scope, document redaction, and proof-access gates.

## Handoff

Proceed to `aqstoqflow-hris-payroll-04-org-structure-manager-scope`.

Acceptance criteria for the next slice:

- Org units, branches, locations, jobs, and manager scopes have one source-truth owner.
- Manager access cannot read employees outside assigned scope.
- Employee identity cannot claim a location, department, job, or manager relationship that belongs to another tenant.
- Payroll readiness can consume org scope as certified HRIS context, not as UI-derived labels.
