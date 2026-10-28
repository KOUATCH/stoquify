# AqStoqFlow HR/Payroll Setup Control Plane Statutory Backfill Gap Report

Date: 2026-07-01
Status: Completed
Scope: Setup/admin control plane surfacing for statutory scenario coverage proof-backfill gaps.

## Outcome

The payroll setup control plane now exposes the server-provided `payrollRunMissingStatutoryScenarioCoverage` proof-backfill gap with operator-readable language while preserving the raw evidence key for audit traceability.

This closes the UI visibility gap created by the proof-backfill dry-run scanner for legacy posted/paid/archived payroll runs missing statutory scenario coverage hash, status, or reviewed source evidence.

## Files Updated

- `components/payroll/PayrollSetupControlPlane.tsx`
- `components/payroll/__tests__/PayrollSetupControlPlane.test.tsx`

## Design Notes

- The UI does not compute payroll truth or readiness client-side.
- The table renders only `plan.proofBackfill.gapCounts` returned by the payroll setup/backfill service.
- A narrow display map translates proof-gap keys into operator labels and descriptions.
- The raw proof-gap key remains visible in the table so support, audit, and data-trust teams can tie the row back to the evidence model.
- Existing setup readiness, dry-run status, signoffs, rollback, and reconciliation sections remain unchanged.

## Verification

Passed:

- `npx jest components/payroll/__tests__/PayrollSetupControlPlane.test.tsx --runInBand`
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

This is an operator visibility hardening slice, not a new source of payroll truth. It makes the newly enforced statutory scenario coverage backfill blocker visible in the setup/admin surface before production migration or close certification decisions.

## Remaining Roadmap Work

- Add an execution path for appending/restoring statutory scenario coverage proof to legacy payroll runs when approved by tenant-level signoff.
- Keep close/data-trust blockers active until the backfill certificate and reconciliation certificate prove the gap cleared.
- Continue release-gate browser validation for setup, runs, payments, declarations, and close surfaces after the backfill execution workflow is added.