# AqStoqFlow HR/Payroll Proof Backfill Action Release-Gate Hash Report

Date: 2026-07-01
Status: Completed
Scope: Payroll setup proof-backfill execution action contract.

## Outcome

The protected payroll setup action now forwards `adapterChaosReleaseGateHash` into `preparePayrollProofBackfillExecution`.

Before this slice, the service required the adapter chaos release-gate hash as part of the execution certificate signoff bundle, but the action wrapper did not pass it through. That meant a certificate prepared through the action path could remain blocked by `adapter-chaos-release-gate-hash` even when the caller supplied reviewed release-gate evidence.

## Files Updated

- `actions/payroll/payroll-setup.actions.ts`
- `actions/payroll/__tests__/payroll-setup.actions.test.ts`

## Design Notes

- Tenant context remains handler-derived through the protected action.
- The action still delegates proof-backfill certificate construction to the payroll service boundary.
- No client-owned readiness or payroll truth was introduced.
- This does not enable mutation execution; it closes the approval-path evidence propagation gap.

## Verification

Passed:

- `npx jest actions/payroll/__tests__/payroll-setup.actions.test.ts --runInBand`
- `npm run typecheck`
- `npm run service:boundary:fail`
- `npm run policy:gates`

Gate evidence from `npm run policy:gates`:

- Inventory boundary: 0 active violations
- Service boundary: 0 active violations
- Workflow assurance runtime tables: ready, 0 blockers
- Payroll immutability runtime: ready, 0 blockers
- Hard delete gate: 0 active unsafe findings
- Regulatory hardcode gate: pass, 0 active findings
- Demo/report trust gate: 0 active production-visible findings
- Raw error boundary gate: 0 active unsafe findings

## Release Impact

This makes the proof-backfill execution certificate action path evidence-complete for the existing validate-only flow. It prepares the system for a later explicitly approved metadata-only execution path without weakening service-boundary, tenant, or redaction controls.