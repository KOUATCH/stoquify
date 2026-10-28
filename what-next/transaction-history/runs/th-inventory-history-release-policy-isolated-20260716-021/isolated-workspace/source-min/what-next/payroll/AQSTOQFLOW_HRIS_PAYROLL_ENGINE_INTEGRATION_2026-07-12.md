# AqStoqFlow HRIS/Payroll Engine Integration

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-11-payroll-engine-integration`
Status: Completed for the focused payroll-control slice
Next handoff: `aqstoqflow-hris-payroll-12-country-pack-provenance`

## Executive Decision

Payroll calculation is now wired through a service-owned certified engine input adapter before existing payroll formulas run.

This closes the focused integration objective: payroll no longer proceeds from mutable employee/payroll read state directly after readiness. The calculation path now derives deterministic per-employee engine input snapshots from the accepted readiness verdict, hashes each employee input, records the aggregate input hash, and carries those proofs into line snapshots, run metadata, business events, document hashes, and correction evidence.

This does not claim full statutory production readiness. Country-pack formula provenance, legal references, scenario coverage, and statutory golden outputs remain the next gate.

## Evidence Inspected

- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`

## What Changed

- Added a certified payroll engine input adapter inside `payroll-control.service.ts`.
- The adapter refuses non-READY readiness verdicts before engine input construction.
- The adapter canonicalizes employee order and rubrique assignment order before hashing.
- Per-employee engine input snapshots now include the readiness verdict hash, contract proof, attendance proof, payment destination proof, and rubrique assignment proof.
- Each line calculation snapshot now records `payrollEngineInput` and `payrollEngineInputHash`.
- Payroll run metadata now records `payrollEngineInputHashes` and `payrollEngineInputSnapshotHash`.
- Payroll calculation business events now carry the same engine input proof chain.
- Correction evidence and payroll document hashes now include the certified engine input aggregate hash.
- Focused tests now assert the new engine input proof chain on ordinary calculation and correction calculation paths.

## Verification

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - 1 suite passed
  - 34 tests passed
- `npm run typecheck`
- `npm run prisma:validate`
- `git diff --check -- services/payroll/payroll-control.service.ts services/payroll/__tests__/payroll-control.service.test.ts`

Known environment note:

- Several read/test commands needed elevated execution because the Windows sandbox returned `helper_unknown_error` before the command started.

## What Is Working

- Payroll still uses the existing calculation formula path and existing focused kernel coverage.
- Readiness remains fail-closed before calculation.
- Snapshot correction remains blocked for sealed runs unless correction context is provided.
- Calculation input is now traceable from readiness verdict to per-line calculation snapshot to run-level metadata and event proof.
- Correction evidence now proves which certified engine input set was recalculated.

## What Is Not Yet Complete

- Country-pack formula provenance is still the next gate.
- Statutory formula legal references, source hashes, scenario matrices, and golden outputs are not completed by this slice.
- This slice does not add browser validation or UI certification.
- This slice does not migrate historical payroll runs to include engine input proof metadata.

## Landing Recommendation

This focused slice is ready to land after normal review of the broader dirty worktree.

Recommended next step: run `aqstoqflow-hris-payroll-12-country-pack-provenance` to prove formula source authority, statutory review state, and country-pack version traceability without changing the newly certified engine input boundary.
