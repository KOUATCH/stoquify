# AQSTOQFLOW HRIS/Payroll Input Readiness Gate

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-09-input-readiness-gate`
Status: Implemented and focused verification passed
Next handoff: `aqstoqflow-hris-payroll-10-snapshot-correction`

## Scope

This slice hardens payroll calculation so it starts from a service-owned input-readiness verdict before payroll run creation, calculation hashes, YTD reads, or business-event emission. The gate covers active employee scope, active contract, contract base salary sanity, frozen attendance, attendance source proof, payment destination presence, stale compensation changes, and unsupported country-pack capability.

The slice does not change payroll formulas, payment release, statutory declaration release, or accounting posting behavior.

## Files Inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/command-read-model.service.ts`
- `services/payroll/compensation.service.ts`
- `prisma/schema.prisma`
- `docs/HR-Payroll/*`
- Prior reports in `what-next/payroll/*`

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`

## What Changed

- Added `AQSTOQFLOW_PAYROLL_INPUT_READINESS_VERDICT` inside payroll-control service.
- Payroll calculation now fails closed before YTD/calculation work when required HRIS/payroll inputs are blocked.
- The ready verdict is attached to payroll run metadata, calculated-run business-event payload, audit changes, document hash, and correction evidence hash through `payrollInputReadinessHash`.
- Existing review-required Cameroon IRPP behavior remains allowed and auditable. Truly unsupported country-pack capability blocks calculation.

## Gates Covered

- Missing active contract: `PAYROLL_INPUT_CONTRACT_MISSING`
- Stale/open compensation change: `PAYROLL_INPUT_COMPENSATION_STALE`
- Missing frozen attendance: `PAYROLL_INPUT_ATTENDANCE_MISSING`
- Missing attendance source proof: `PAYROLL_INPUT_ATTENDANCE_SOURCE_MISSING`
- Missing payment destination: `PAYROLL_INPUT_PAYMENT_DESTINATION_MISSING`
- Unsupported country pack: `PAYROLL_INPUT_COUNTRY_PACK_UNSUPPORTED`
- Empty active employee scope: `PAYROLL_INPUT_ACTIVE_EMPLOYEE_MISSING`
- Invalid contract base salary: `PAYROLL_INPUT_CONTRACT_BASE_SALARY_INVALID`

## Data Ownership

The readiness verdict is built in the payroll service from persisted payroll employee, contract, attendance, compensation-change, country-pack, and payment-destination state. The UI cannot satisfy or bypass the gate by sending its own readiness claim.

Payment destination approval evidence remains enforced at payment release by `assertApprovedPaymentDestinationEvidence`. This slice blocks missing destinations earlier at calculation input readiness.

## Tenant And RBAC Boundary

All readiness reads remain tenant-scoped by `organizationId`. The slice does not add a new public API or widen permissions. It hardens the existing service path used by action/API callers instead of relying on dashboard state.

## Audit And Redaction

The persisted verdict carries IDs, hashes, blocker codes, and display names already used in existing payroll calculation errors. It does not persist tax IDs, bank account values, mobile-money phone values, or raw attendance payloads. Run metadata and business-event payload include the verdict and hash for downstream audit proof.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run prisma:validate`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts`

Known unrelated full-worktree check:

- `git diff --check` still fails on pre-existing unrelated files:
  - `docs/modules/README.md:36: new blank line at EOF.`
  - `what-next/settings-surface-classification.md:93: new blank line at EOF.`

## Skipped Checks

- No browser validation: this was a service-level payroll calculation gate with focused Jest coverage.
- No payment/declaration release retest: this slice intentionally did not change release workflows.
- No full Jest run: the worktree contains broad unrelated module/payroll/roadmap changes; focused payroll-control plus typecheck and Prisma validate were used for this slice.

## Current Blockers

No blocker remains inside this input-readiness slice.

Commit readiness still depends on how the broader dirty worktree should be staged, because many unrelated files are modified or untracked. The only observed full-worktree whitespace blockers are the two unrelated blank-line-at-EOF files listed above.

## Residual Risk

- The calculation gate currently blocks missing payment destination presence; full approved destination evidence still remains a payment-release gate. A future hardening pass can decide whether calculation should also require approved destination evidence for every employee.
- Review-required country-pack components remain allowed when the current payroll engine already carries review-required component proof. Unsupported country-pack capability now blocks.

## Next Handoff

Run `aqstoqflow-hris-payroll-10-snapshot-correction` next. The next slice should make corrections and snapshot changes immutable, traceable, and explicitly tied to the readiness verdict and source hashes.
