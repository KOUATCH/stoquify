# Stoquify HRIS Payroll Readiness Contract

Date: 2026-07-15  
Status: READY TO LAND FOR CONTROLLED ROLLOUT  
Next handoff: `stoquify-hris-14-employee-self-service`

## Scope

This slice binds approved People Core facts to payroll input readiness, certified engine inputs, correction evidence, payroll-run metadata, business events, and audit hashes. It does not add a second employee master, change payroll calculations, or add UI-derived truth.

## Evidence Inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/employee.service.ts`
- `services/payroll/contract.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/hris/document-evidence.service.ts`
- `services/hris/time-leave.contract.ts`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md`

## Files Changed

- `services/hris/payroll-readiness-contract.ts`
- `services/hris/__tests__/payroll-readiness-contract.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- This report

## Implemented Contract

The versioned `STOQUIFY_HRIS_PAYROLL_READINESS_EXPORT` now certifies, per employee:

- HRIS identity source reference and source hash.
- Approved contract activation proof and approved scanned document evidence.
- Approved compensation assignment maker-checker evidence.
- Applied payment-destination evidence reconciled to its request record.
- Frozen attendance source and HRIS certification hashes.

The export contains hashes and evidence references, not salary values, identifiers, raw documents, bank details, or provider payloads. Its aggregate export hash and employee proof hashes are bound into the existing payroll input verdict and certified engine snapshots.

## Fail-Closed Behavior

Payroll calculation now blocks before engine execution when any required HRIS proof is missing. A modified export fails integrity validation, and a changed employee source snapshot fails comparison with its certified proof. The engine consumes the certified snapshot immediately after validation; later calculation logic uses that frozen input rather than rereading mutable HRIS tables.

The HRIS export hash propagates through payroll line calculation snapshots, run document hashes, correction evidence, payroll-run metadata, calculated events, and audit proof.

## Ownership And Security Decisions

- HRIS remains the owner of people, contract, compensation, destination, and attendance truth.
- Payroll owns the certified consumption snapshot and financial calculation truth.
- Existing organization-scoped queries preserve tenant isolation; no cross-tenant read path was added.
- No route, permission, or UI surface was added, so existing RBAC boundaries remain unchanged.
- Only hashes and evidence references are persisted in the HRIS readiness export; sensitive values remain in the existing restricted payroll snapshot.
- Existing payroll event and audit paths now cite the HRIS proof hash end to end.

## Verification

- `jest --runInBand services/hris/__tests__/payroll-readiness-contract.test.ts services/payroll/__tests__/payroll-control.service.test.ts`: PASS, 2 suites and 44 tests.
- Focused ESLint on the four changed TypeScript files: PASS.
- `tsc --noEmit --pretty false`: PASS.
- `git diff --check` on the tracked payroll files: PASS.

The focused tests prove complete proof consumption, missing-proof blocking, tamper rejection, source-drift rejection, HRIS hash persistence in engine snapshots, correction compatibility, and the existing payroll-control behavior.

## Current Blockers

No code blocker prevents this slice from landing.

Production activation remains blocked until legacy active data is backfilled or explicitly remediated. In particular, legacy employees may lack HRIS identity source hashes, approved contract/document projections, approved compensation assignment metadata, or an applied payment-destination request. The new gate intentionally rejects those records.

## Skipped Checks

- Full repository Jest suite.
- Full production build.
- Browser and Playwright checks; this slice has no UI surface.
- Database-backed payroll immutability runtime gate; no schema or immutability trigger changed.
- Production data backfill or migration rehearsal.

## Residual Risk And Rollout

Use a controlled rollout that inventories each blocker code, backfills evidence through the owning HRIS workflows, and compares certified employee counts and source-set hashes before enabling payroll calculation for an organization. Do not bypass the gate for legacy data. The export hash provides deterministic integrity and drift detection inside the application evidence chain; it is not an external digital signature.

## Handoff

Proceed to `stoquify-hris-14-employee-self-service` after the readiness gate is accepted and the legacy-proof backfill plan has an owner.
