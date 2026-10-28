# AQSTOQFLOW HRIS Payroll Compensation Controls - 2026-07-12

## Scope

Executed the `aqstoqflow-hris-payroll-06-compensation-controls` slice after the contract lifecycle handoff. The goal was to ensure payroll consumes approved, effective, traceable compensation records only, with maker-checker salary changes and stale compensation inputs denied before calculation.

## Files Inspected

- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-command-read-model.service.test.ts`
- `docs/HR-Payroll/`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_CONTRACT_LIFECYCLE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-12.md`

## Changes Completed

- Added a write-boundary guard so `ACTIVE` employee rubrique assignments cannot be created without `evidenceDocumentHash`.
- Added a payroll calculation guard so active rubrique assignments without evidence fail closed before run creation.
- Added a payroll calculation readiness gate that blocks calculation when `REQUESTED` or `APPROVED` salary changes are still open for the run period.
- Preserved payroll consumption of rubrique assignments as `ACTIVE` only; draft compensation records remain workflow data, not payroll-run inputs.
- Added focused tests for missing active assignment evidence, missing calculation evidence, and open salary-change queue denial.

## Data Ownership

- HRIS compensation controls own salary-change requests, employee rubrique assignments, evidence hashes, and maker-checker state.
- Payroll run calculation consumes only finalized active assignments and resolved salary truth.
- Country-pack statutory formula provenance remains owned by the country-pack layer and was not widened in this slice.

## Tenant / RBAC Decision

- Existing tenant-scoped queries and compensation permissions were preserved.
- Assignment mutation remains protected by `payroll.compensation.manage`.
- Salary changes remain split across request, approve/reject, and apply permissions with requester self-approval/application blocked.

## Audit / Redaction Decision

- Existing business-event and audit logging remained service-owned.
- Salary and assignment amounts remain redacted in workflow reads unless the actor has explicit salary/amount access.
- New failure gates do not expose payroll amounts or sensitive employee compensation details.

## Gates Run

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-compensation.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand`
  - Result: passed, 3 suites / 43 tests.
- `npm run typecheck`
  - Result: passed.
- `npm run prisma:validate`
  - Result: passed.

## Skipped Checks

- Full `npm run policy:gates` was skipped because this slice did not change global policy gate scripts or route/API surfaces; the focused payroll service tests plus typecheck/prisma validation directly prove the compensation control change.
- Browser/UI smoke was skipped because this was a backend service/readiness gate slice with no UI changes.
- Broad service-boundary and regulatory hardcode gates were skipped to keep the verification focused; no statutory formula logic was modified.

## Current Blockers

- None found in the compensation-controls slice.
- The wider working tree remains dirty with many unrelated modified and untracked docs, gate outputs, scripts, and prior HRIS/payroll artifacts. Stage this slice carefully if committing only compensation controls.

## Residual Risk

- `getCompensationWorkflow` can still show draft compensation assignments to authorized operators for workflow management, but payroll calculation does not consume those drafts.
- Existing historical active rubrique assignments without evidence will now fail payroll calculation until backfilled or corrected.
- Full policy gate runs may refresh many `what-next/` evidence files and should be run as a separate release-hardening pass if desired.

## Next Handoff Skill

`aqstoqflow-hris-payroll-07-document-evidence-redaction`

Focus next on employee/contract/compensation document evidence boundaries, redaction, and proof exposure rules so HRIS can support payroll-grade evidence without leaking sensitive files or raw identifiers.
