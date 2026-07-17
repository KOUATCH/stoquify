# AqStoqFlow HRIS/Payroll Contract Lifecycle Gate

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-05-contract-lifecycle`
Scope: contract lifecycle, evidence, activation, amendment/salary-change boundary, termination, active compensation dependency, readiness blockers, tenant/RBAC, audit, redaction, and evidence handoff.
Status: core service gates implemented and verified
Next intended handoff: `aqstoqflow-hris-payroll-06-compensation-controls`

## Executive Decision

The contract lifecycle slice is ready to hand off to compensation controls.

The existing contract workflow already had strong controls: active contracts require signed document evidence, active contract overlaps are blocked, active contract salary mutations are forced through the compensation approval workflow, contract lifecycle changes record business events, and create/update/termination operations write audit history.

The missing stop-condition gate was active compensation assignment. `PayrollEmployeeRubriqueAssignment` has no direct `contractId`, and `assignEmployeeRubrique` could create an `ACTIVE` assignment after checking only employee and rubrique ownership. That meant active compensation could exist without proving an approved effective contract.

This slice closes that write-boundary gap for new active assignments. `assignEmployeeRubrique` now requires an active tenant-scoped contract with signed evidence, activation business-event evidence, and date coverage for the assignment period before an `ACTIVE` rubrique assignment can be created.

## Files Inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ORG_MANAGER_SCOPE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- `prisma/schema.prisma`
- `services/payroll/contract.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-contract.service.test.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`

## Data Ownership

| Data | Owner decision | Current status | Decision |
| --- | --- | --- | --- |
| Employee identity | HRIS employee master | `PayrollEmployee` is the current service-owned employee source model | Contract workflows must keep tenant-scoped employee ownership checks |
| Contract lifecycle | HRIS contract workflow | `PayrollContract` has status, effective dates, signed evidence, activation event id, business events, and audit logs | Core gate pass |
| Contract activation evidence | HRIS evidence plus business-event proof | Active create/update paths require `signedDocumentHash` and stamp `activatedBusinessEventId` | Core gate pass |
| Salary amendment | HRIS compensation approval workflow | Active contract base salary cannot be mutated directly; salary changes use request/approve/apply and create effective-dated contract versions | Core gate pass |
| Termination | HRIS contract workflow | `terminatePayrollContract` ends the contract, records termination reason metadata, business event, and audit | Core gate pass |
| Active compensation assignment | HRIS compensation controls, dependent on contract lifecycle | `assignEmployeeRubrique` now requires an approved effective contract before creating `ACTIVE` assignments | Core gate pass for new writes |
| Existing active assignments | Migration/backfill assurance | Existing rows do not have a schema-level contract link | Residual risk; audit/backfill recommended |

## Tenant And RBAC Decision

- Contract reads require `payroll.contracts.read`; contract mutations require `payroll.contracts.manage`.
- Compensation reads require `payroll.compensation.read`; rubrique assignments require `payroll.compensation.manage`.
- Contract and compensation mutations are tenant-scoped by `organizationId`.
- The active compensation gate queries only `{ organizationId, employeeId }` contracts and rejects missing approved effective contract evidence before creating active compensation rows.
- This slice does not broaden global admin permissions or statutory/payroll-run finalization behavior.

## Audit And Redaction Decision

- Contract workflow reads redact person-level salary by default unless the actor has explicit salary authority.
- Contract create/update/termination write audit entries and business events with signed document hash presence, activation evidence, and lifecycle metadata.
- Salary change request/approval/application write business events and audit entries, including approval evidence.
- Active rubrique assignment creation already writes business-event and audit evidence; this slice adds contract lifecycle proof metadata and event payload context for the active assignment gate.

## Required Gate Status

| Gate | Status | Evidence |
| --- | --- | --- |
| Approved effective contract required for payroll activation | Pass | New active rubrique assignment gate checks `PayrollContractStatus.ACTIVE`, signed document hash, activation business-event id, tenant scope, employee scope, and date coverage before creating `ACTIVE` compensation |
| Amendment audit evidence | Pass | Existing salary change tests prove direct active salary mutation is blocked and approved salary changes create superseding active contracts with approval evidence |
| Termination audit evidence | Pass | Existing termination test proves lifecycle event and audit history are recorded for contract termination |

## Gates Run

Focused implementation gates:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-contract.service.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts --runInBand
```

Result: passed. `2` suites, `18` tests.

```powershell
npm run typecheck
```

Result: passed.

## Skipped Checks

- Browser smoke was not run because this is a server-side source-truth and access-control slice with no UI route changes.
- Full app test suite was not run; the focused contract/compensation suites and TypeScript gate passed.
- No Prisma migration was added in this slice; the active compensation guard is a service write-boundary fix, not a schema relation/backfill.

## Current Blockers

| Blocker | Severity | Status |
| --- | --- | --- |
| Active compensation can be created without approved effective contract | Critical | Closed for new `ACTIVE` rubrique assignment writes |
| Active contract can be created without signed evidence | Critical | Already closed by existing contract service |
| Active contract salary can be amended outside maker-checker | High | Already closed by existing contract/compensation workflow |
| Contract termination lacks lifecycle audit | High | Already closed by existing contract service and tests |
| Existing active assignment rows lack direct contract linkage | Medium | Still open; needs migration/backfill audit or future schema relation |
| Contract documents/templates/signatures are not a full HRIS document workflow | Medium | Still open; document evidence/redaction slice should own this |

## Implementation Completed

1. Added `assertApprovedEffectiveContractForActiveAssignment` inside `services/payroll/compensation.service.ts`.
2. Required `ACTIVE` rubrique assignments to prove an active signed contract with activation business-event evidence and date coverage.
3. Added contract lifecycle proof metadata to active assignment creation and business-event payloads.
4. Extended `payroll-compensation.service.test.ts` to prove:
   - active rubrique assignment looks up an approved effective contract,
   - active rubrique assignment is blocked when no approved effective contract covers the assignment.
5. Re-ran contract lifecycle tests and TypeScript.

## Residual Risk

- `PayrollEmployeeRubriqueAssignment` still has no direct `contractId`; the service gate prevents new unsafe active writes, but historical rows may need an audit/backfill report.
- Open-ended active assignments now require an open-ended active contract. Fixed-term contracts should use bounded assignment dates, otherwise the service fails closed.
- Contract evidence is hash-based; full legal document lifecycle, template/version control, signature provider proof, retention, and redaction should remain under the document/evidence slice.
- Manager-scoped contract reads are not yet wired into UI/action surfaces; downstream manager self-service must use the org-manager scope gate before exposing person-level contract data.

## Handoff

Hand off to `aqstoqflow-hris-payroll-06-compensation-controls`.

The next slice should build on this contract prerequisite and harden compensation/rubrique source truth: maker-checker paths, benefit/deduction traceability, country-pack provenance, stale compensation blockers, and migration evidence for any pre-existing active assignments.
