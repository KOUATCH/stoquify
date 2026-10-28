# AqStoqFlow Enterprise HRIS/Payroll Execution Next Steps

Date: 2026-07-12

## Purpose

This next-steps artifact summarizes how to execute the HRIS-first payroll-grade roadmap without compromising existing payroll controls.

Primary roadmap:

- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`

Supporting documents:

- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`

## Current Decision

Continue controlled pilot for implemented payroll workflows only.

Do not declare unrestricted production HRIS/payroll readiness yet.

Preserve the current payroll kernel and make the next program HRIS-first:

- HRIS owns people truth.
- Payroll consumes certified HRIS snapshots.
- Accounting records money truth.
- Assurance proves the whole chain.

## What Is Ready

- Payroll-specific Prisma models and lifecycle states exist.
- Payroll services/actions/routes/workbenches exist for core implemented workflows.
- RBAC, module entitlement, and fresh-auth patterns exist across payroll actions and routes.
- Payroll immutability runtime currently reports ready with 0 blockers.
- Regulatory hardcode gate currently reports pass.
- Pilot certification close-pack slice passed.
- Statutory evidence-chain slice passed for blocker propagation, not full statutory production.
- Policy gates include payroll immutability and regulatory hardcode checks.

## What Remains Blocked

- Full statutory country-pack breadth.
- Live authority declaration proof.
- Live payment provider proof.
- Production seed/backfill mutation.
- Full authenticated browser smoke certification for all payroll routes/viewports.
- Full HRIS source-data breadth around employees, org structure, contracts, compensation, documents, leave, attendance, benefits, approvals, manager workflows, and self-service.

## First Safe Implementation Slice

### Slice Name

Phase 0: Canonical HRIS/payroll status register and source-of-truth ownership map.

### Why This Slice First

- It is documentation/service-boundary oriented, so it is low risk.
- It preserves the existing payroll kernel.
- It prevents stale reports from reopening closed blockers.
- It makes the HRIS-to-payroll ownership boundary explicit before code changes.
- It sets acceptance criteria for the first real HRIS service slice.

### Files To Produce

- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_CANONICAL_STATUS_REGISTER_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PHASE_0_STATUS_REGISTER_REPORT_2026-07-12.md`

### Required Content

- Current release posture.
- Source-of-truth ownership map.
- Open blocker table.
- Closed blocker table.
- Superseded historical blocker table.
- Controlled-pilot-only table.
- "Do not weaken" constraints.
- Phase 1 entry criteria.
- First Phase 1 implementation prompt.

### Acceptance Criteria

- Current immutability is marked closed/ready for the current workspace, with a note that target databases must apply the migration/runtime check.
- Statutory breadth remains open until expert-reviewed country-pack formulas and golden fixtures exist.
- Browser certification remains open until all configured HRIS/payroll routes/viewports pass live authenticated smoke.
- Production backfill remains open until tenant dry-run, idempotency, rollback/correction, and signoff evidence exist.
- Existing payroll services, routes, actions, RBAC, policy gates, and close evidence are explicitly preserved.

## Phase 1 Candidate Prompt

After Phase 0 is accepted, run a narrow implementation prompt:

```md
Act as a senior enterprise HRIS/payroll implementation team.

Implement the first HRIS source-of-truth slice for AqStoqFlow without weakening existing payroll controls.

Goal:
Create a service-owned HRIS employee identity and payroll readiness foundation that payroll can consume later through certified snapshots.

Scope:
- Inspect `prisma/schema.prisma`, `services/payroll/employee.service.ts`, existing payroll employee/user mapping behavior, `actions/payroll/payroll-employee.actions.ts`, employee payroll routes, permissions, and focused tests.
- Design or implement the smallest safe HRIS employee identity/readiness contract.
- Preserve current payroll employee workflows.
- Add blocker codes for duplicate employee risk, missing user mapping, missing contract, missing payment destination, missing evidence, and unsupported country pack.
- Keep outputs redacted and tenant-scoped.
- Add focused service/action tests.
- Save a dated report under `what-next/payroll/`.

Non-goals:
- No recruitment.
- No performance management.
- No broad dashboard redesign.
- No payroll calculation rewrite.
- No production backfill mutation.

Verification:
- Focused Jest for touched services/actions.
- `npm run prisma:validate` if schema changes.
- `npm run typecheck`.
- `npm run service:boundary:fail`.
- `npm run regulatory:hardcode:fail`.
- `npm run policy:gates` if the slice touches gate-sensitive surfaces.
```

## Suggested Verification For This Planning Run

```powershell
rg -n "HRIS owns people truth|Payroll consumes certified HRIS snapshots|Readiness gate|Phase" docs/HR-Payroll what-next/payroll
rg -n "unrestricted production|controlled pilot|statutory|browser smoke|immutability" docs/HR-Payroll what-next/payroll
```

## Commit-Ready Summary

Produced:

- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_NEXT_STEPS_2026-07-12.md`

No production code should be changed by this planning run.

Ready to land when:

- Both files exist.
- The roadmap references the saved HRIS-first blueprint.
- The roadmap separates controlled-pilot readiness from unrestricted production readiness.
- The roadmap preserves current payroll controls.
- The first implementation slice is Phase 0 canonical status and source-of-truth ownership.

