# AQSTOQFLOW HRIS Payroll Document Evidence Redaction - 2026-07-12

## Scope

Executed the `aqstoqflow-hris-payroll-07-document-evidence-redaction` slice after compensation controls. The goal was to keep HRIS/payroll document evidence tenant-scoped, role-redacted, audited, and safe for proof/readiness surfaces without changing raw document storage-provider behavior.

## Files Inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COMPENSATION_CONTROLS_2026-07-12.md`
- `services/payroll/employee.service.ts`
- `services/payroll/contract.service.ts`
- `services/payroll/payslip-self-service.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/security/redaction-policy.service.ts`
- `services/evidence/evidence-redaction.service.ts`
- `services/evidence/proof-trail.service.ts`
- `actions/payroll/payroll-employee.actions.ts`
- `components/payroll/PayrollEmployeeSourceWorkbench.tsx`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- `prisma/schema.prisma`

## Changes Completed

- Added a shared redaction category, `payroll_document_evidence`, for HR/payroll document evidence hashes.
- Redacted `PayrollEmployeeSourceData.evidence.latestDocumentHash` by default for source-data readers.
- Allowed document evidence hashes only for document-owning payroll roles such as `payroll.employees.manage` or `payroll.contracts.manage`.
- Extended employee source-data read audit records with an explicit purpose, `HRIS_PAYROLL_EMPLOYEE_SOURCE_DATA_EVIDENCE_READ`.
- Added audit metadata for document-evidence access decisions so reviewers can see whether the document evidence hash was allowed or redacted.
- Added focused tests for role-appropriate redaction, HR-role visibility, unauthorized denial, and redaction policy behavior.

## Data Ownership

- HRIS employee source data owns employee evidence references and document-evidence hashes.
- Payroll readiness surfaces may consume aggregate evidence state and redacted proof identifiers, but they do not become the source of document truth.
- Raw document storage/provider behavior remains unchanged in this slice.

## Tenant / RBAC Decision

- `getPayrollEmployeeSourceData` remains tenant-scoped by `organizationId`.
- Unauthorized users without `payroll.employees.read` or `payroll.command.read` receive no employee document evidence and no employee query is executed.
- Read-only payroll users can see evidence counts/types and readiness booleans, but not the latest document hash.
- Document-owning HR/payroll roles can see the latest document evidence hash for operational remediation.

## Audit / Redaction Decision

- Document evidence hashes are treated as sensitive evidence pointers, not as ordinary read-model metadata.
- Audit records now include the source-data read purpose and the document-evidence redaction policy result.
- The slice keeps redaction service-owned and does not rely on React/UI masking.

## Gates Run

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-employee.service.test.ts services/security/__tests__/redaction-policy.service.test.ts --runInBand`
  - Result: passed, 2 suites / 13 tests.
- `npm test -- --runTestsByPath actions/payroll/__tests__/payroll-employee.actions.test.ts --runInBand`
  - Result: passed, 1 suite / 5 tests.
- `npm run typecheck`
  - Result: passed.
- `git diff --check -- services/security/redaction-policy.service.ts services/security/__tests__/redaction-policy.service.test.ts services/payroll/employee.service.ts services/payroll/__tests__/payroll-employee.service.test.ts actions/payroll/__tests__/payroll-employee.actions.test.ts`
  - Result: passed.

## Skipped Checks

- Browser/UI smoke was skipped because no layout or interaction surface changed; the UI now receives a service-redacted value.
- `npm run prisma:validate` was skipped because this slice did not change Prisma schema or generated client usage.
- Full `npm run policy:gates` was skipped to avoid refreshing broad evidence outputs unrelated to this read-model hardening.

## Current Blockers

- None found in this document-evidence-redaction slice.
- The wider working tree is still dirty with unrelated docs, release-gate outputs, module artifacts, and earlier HRIS/payroll slices. Stage the intended files carefully.
- `services/payroll/employee.service.ts` and `services/payroll/__tests__/payroll-employee.service.test.ts` also contain prior org/manager-scope changes already present in the working tree.

## Residual Risk

- This slice hardens evidence references and hashes, not actual file download/storage routes. A future HR document center must repeat the same tenant/RBAC/redaction/audit rules at any binary download or signed-url boundary.
- Contract signed-document hashes are still represented as readiness booleans in this read model; direct contract document access should remain a separate controlled surface.
- Existing historical reports may still mention broader HR document-management gaps; this slice closes the source-data evidence exposure gap only.

## Next Handoff Skill

`aqstoqflow-hris-payroll-08-time-leave-attendance`

Focus next on schedules, leave/absence/overtime evidence, attendance freeze readiness, and controlled corrections so payroll inputs remain approved, traceable, and immutable before calculation.
