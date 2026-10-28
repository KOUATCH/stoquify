# AqStoqFlow HRIS–Payroll Employee Identity Ownership Tranche

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-03-employee-identity`  
Result: **Passed for the employee profile/evidence writer-consolidation slice**

## Scope

Establish the HRIS facade as the sole production service entry point for employee profile and employee evidence mutations while preserving the current Payroll action API and compatibility storage.

## Files inspected

- `prisma/schema.prisma`
- `services/payroll/employee.service.ts`
- `services/hris/employee.service.ts`
- `actions/payroll/payroll-employee.actions.ts`
- `actions/hris/employee.actions.ts`
- Focused service/action tests and knowledge-graph communities for HRIS and Payroll employee boundaries

## Files changed

- `actions/payroll/payroll-employee.actions.ts`
- `actions/payroll/__tests__/payroll-employee.actions.test.ts`
- `scripts/__tests__/hris-employee-writer-boundary.test.js`

## Implementation

- Legacy `upsertPayrollEmployeeSourceProfileAction` now delegates to `upsertHrisEmployeeProfile`.
- Legacy `attachPayrollEmployeeEvidenceReferencesAction` now delegates to `attachHrisEmployeeEvidenceReferences`.
- Existing Payroll module entitlement, `payroll.employees.manage` permission, fresh-auth gate, server-derived organization/actor context, audit resource, action names, and cache revalidation remain unchanged.
- Compatibility responses now carry the HRIS ownership marker returned by the facade.
- A static ratchet scans production TypeScript surfaces and rejects physical Payroll employee writer imports outside the HRIS facade and physical compatibility adapter.

## Data ownership

`services/hris/employee.service.ts` is the canonical employee-profile/evidence writer API. `services/payroll/employee.service.ts` remains the temporary physical storage adapter. No second employee master or schema rename was introduced.

## Tenant, RBAC, audit, and redaction decision

Tenant and actor identifiers continue to be derived from protected server context. The legacy Payroll action preserves its existing access contract to avoid an unsafe entitlement migration inside this slice. HRIS ownership changed at the service boundary only. No raw person, salary, destination, document, provider, or authority data was added.

## Verification

```text
npm test -- actions/payroll/__tests__/payroll-employee.actions.test.ts actions/hris/__tests__/employee.actions.test.ts services/hris/__tests__/employee.service.test.ts scripts/__tests__/hris-employee-writer-boundary.test.js --runInBand

PASS: 4 suites, 23 tests

npm exec -- eslint actions/payroll/payroll-employee.actions.ts actions/payroll/__tests__/payroll-employee.actions.test.ts scripts/__tests__/hris-employee-writer-boundary.test.js

PASS
```

Installed skill validation also passed for `aqstoqflow-hris-payroll-00` through `03`.

## Skipped checks

- Full-project typecheck was not rerun because the latest bounded readiness evidence records an 8 GB V8 OOM before diagnostics.
- No Prisma/schema, browser, module packaging, Payroll formula, contract, compensation, payment destination, attendance, provider, authority, or production-data change was made.

## Residual risk

- Employee reads still use Payroll compatibility services directly where appropriate for backward compatibility.
- Physical storage remains Payroll-named.
- Other HR-owned domains still have parallel Payroll writers.
- Database-level attendance snapshot immutability and the persisted HRIS-to-Payroll snapshot aggregate remain open.

## Next handoff

Hand off to `aqstoqflow-hris-payroll-04-org-structure-manager-scope` for a bounded current-state and durable-scope assessment. Do not begin the contract-writer adapter until that prerequisite is closed. When contract migration becomes eligible, keep it separate from compensation and payment-destination work.

