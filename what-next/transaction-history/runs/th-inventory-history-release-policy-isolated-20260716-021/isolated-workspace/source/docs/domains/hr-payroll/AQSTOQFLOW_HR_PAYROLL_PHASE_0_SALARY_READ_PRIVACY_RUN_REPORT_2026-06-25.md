# AqStoqFlow HR/Payroll Phase 0 Salary Read Privacy Run Report

Date: 2026-06-25

Selected skill: `aqstoqflow-payroll-kernel-hardener`

Selected phase and executable slice: Phase 0 payroll kernel hardening, salary-bearing workbench read audit plus policy-driven amount redaction.

## Classification

This continues the current Phase 0 payroll kernel hardening sequence after the existing DB immutability and tenant-boundary proof slices. The smallest safe next slice was the salary-read audit/privacy gap called out by the Phase 0 reports.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `services/payroll/__tests__/payroll-privacy.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_SALARY_READ_PRIVACY_RUN_REPORT_2026-06-25.md`

## Implementation

- Added actor context to `getPayrollWorkbenchData` calls from the protected payroll workbench action.
- Evaluated the existing `payroll_person_amount` redaction policy before returning payroll amount fields from the workbench read model.
- Redacted payroll workbench amount fields when the actor lacks the existing payroll salary/amount permissions.
- Added a durable `PAYROLL_WORKBENCH_SALARY_READ` audit log entry for salary-bearing payroll workbench reads, including actor, organization, redaction decision, policy, and returned record counts.
- Added focused service/action tests proving actor context is passed, salary-bearing reads are audited, and amount fields redact when permissions are absent.

## Preserved Semantics

- No payroll schema, migration, country-pack, statutory calculation, ledger posting, payment release, declaration, or close invalidation behavior was changed in this slice.
- Existing payroll read permission behavior remains policy-driven through the current RBAC/redaction policy.
- Existing Phase 0 DB immutability, tenant-boundary, and `PAYROLL_RUN_POSTED` close invalidation work remains intact.

## Gates Passed

- Salary-bearing payroll workbench reads are audited.
- Payroll amount redaction is policy-driven when salary permissions are absent.
- Payroll action passes actor identity and permissions into the service read model.
- Payroll service/action tests pass.
- Shared policy gates pass.
- TypeScript typecheck passes.
- Prisma schema validation passes.

## Gates Blocked

None for this slice.

Remaining Phase 0 work from the hardener skill:

- Add or prove statutory hardcode gates for payroll engine files.
- Normalize payroll module identity across routes, actions, read models, and redaction surfaces.
- Evaluate close invalidation coverage for payment release, declaration state changes, and payroll corrections.
- Add runtime DB integration coverage for immutability triggers after the migration is applied to a live database.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services\payroll\__tests__\payroll-privacy.service.test.ts actions\payroll\__tests__\payroll-control.actions.test.ts --runInBand
npm test -- --runTestsByPath services\payroll\__tests__\payroll-control.service.test.ts services\payroll\__tests__\payroll-privacy.service.test.ts actions\payroll\__tests__\payroll-control.actions.test.ts --runInBand
npm run policy:gates
npm run typecheck
npm run prisma:validate
```

## Verification Result

The slice is verified. Focused Jest coverage passed, policy gates passed, typecheck passed, and Prisma schema validation passed.

## Next Recommended Skill Or Slice

Continue `aqstoqflow-payroll-kernel-hardener` with the payroll statutory hardcode gate and module identity normalization slice.