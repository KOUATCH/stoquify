# AqStoqFlow HR/Payroll Wave 1 Phase 8 Run Report

Date: 2026-06-29
Selected skill: `aqstoqflow-payroll-smb-ops`
Selected slice: POS, sales, BI, and branch profitability payroll allocation proof

## Outcome

Phase 8 now gives branch operating snapshots an aggregate payroll allocation proof path. POS and sales remain operational inputs only; payroll run lines remain the monetary payroll source of truth. Branch BI can now see whether payroll cost has been approved and allocated before claiming payroll-complete profitability.

## Scope Delivered

- Extended `BranchOperatingMetrics` with POS shift, frozen attendance, branch payroll employee, approved payroll line, unallocated payroll line, aggregate payroll amount, and payroll profitability contribution fields.
- Added branch snapshot reads for:
  - POS shift evidence by branch and period.
  - Closed/reconciled POS shift evidence.
  - Active payroll employees assigned to the branch.
  - Frozen/corrected attendance snapshots for branch employees.
  - Approved/emitted/paid/posted/archived payroll run lines allocated to branch employees.
  - Organization payroll run lines without branch allocation.
- Added branch profitability blockers when:
  - A branch has completed sales but no approved payroll run lines allocated.
  - POS shift evidence exists without frozen payroll attendance proof.
  - Approved payroll run lines exist without employee branch allocation.
- Added redaction metadata so branch snapshots expose aggregate payroll allocation only.
- Updated snapshot rebuild fallback metrics so failed branch snapshots stay contract-complete.
- Added business-signal generation for branch payroll allocation proof with redacted person-level payloads.
- Updated business signal action fixtures to include the current payroll forecast snapshot contract.
- Added focused service and signal tests for authoritative and blocked branch payroll allocation states.

## Files Changed

- `services/snapshots/snapshot-contracts.ts`
- `services/snapshots/branch-operating-snapshot.service.ts`
- `services/snapshots/snapshot-rebuild.service.ts`
- `services/snapshots/__tests__/branch-operating-snapshot.service.test.ts`
- `services/signals/business-signal-rules.service.ts`
- `services/signals/__tests__/business-signal-rules.service.test.ts`
- `actions/signals/__tests__/business-signals.actions.test.ts`

## Evidence And Controls

- POS sessions contribute shift evidence only; they do not calculate payroll amounts.
- Sales contributes branch revenue only; it does not own commission or payroll truth.
- Payroll monetary values come from approved-or-later payroll run lines.
- Branch allocation is derived from payroll employee branch assignment, not from POS ownership.
- Person-level payroll values are never emitted in branch snapshots or branch payroll signals.
- Missing allocation or frozen attendance proof creates blockers instead of silent fallbacks.

## Gates Run

- `npm test -- --runTestsByPath services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts --runInBand`
  - Passed: 2 suites, 8 tests.
- `npm test -- --runTestsByPath services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/snapshots/__tests__/snapshot-rebuild.service.test.ts services/signals/__tests__/business-signal-rules.service.test.ts actions/signals/__tests__/business-signals.actions.test.ts --runInBand`
  - Passed: 4 suites, 12 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/snapshots/branch-operating-snapshot.service.ts services/snapshots/snapshot-contracts.ts services/snapshots/snapshot-rebuild.service.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/signals/business-signal-rules.service.ts services/signals/__tests__/business-signal-rules.service.test.ts actions/signals/__tests__/business-signals.actions.test.ts`
  - Passed.
- `npm run service:boundary:fail`
  - Passed: 0 active service-boundary violations.
- `git diff --check -- services/snapshots/branch-operating-snapshot.service.ts services/snapshots/snapshot-contracts.ts services/snapshots/snapshot-rebuild.service.ts services/snapshots/__tests__/branch-operating-snapshot.service.test.ts services/signals/business-signal-rules.service.ts services/signals/__tests__/business-signal-rules.service.test.ts actions/signals/__tests__/business-signals.actions.test.ts`
  - Passed.

## Residual Risk

- This slice does not introduce a commission approval workflow or new payroll input tables.
- Branch allocation is currently based on payroll employee branch assignment; cost-center allocation rules remain future work.
- POS shift evidence is counted, but no cashier-to-attendance reconciliation adapter is added in this slice.
- BI/UI surfaces consume the enriched branch snapshot and signals indirectly; dedicated visual branch payroll profitability cards remain a follow-up.

## Next Recommended Skill/Slice

Use `aqstoqflow-payroll-command-center` or `aqstoqflow-payroll-smb-ops` for the payroll operator proof drawer slice: expand `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, and `/dashboard/payroll/declarations` so every finance, BI, close, and branch blocker link opens a service-backed proof view with redacted states, denied states, and fresh-auth actions.
