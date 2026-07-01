# AqStoqFlow HR/Payroll Wave 1 Correction Accounting Tie-Out Report

Generated: 2026-06-28

## Decision

Status: implemented and evidence-gated for the correction accounting slice.

This advances the full HR/payroll production roadmap by carrying correction-run identity from calculation into accounting, payslips, payments, declarations, reconciliation evidence, close invalidation metadata, and business events. It also allows negative correction deltas to post as reversal-side journal lines while preserving fail-closed behavior for negative ordinary payroll postings.

## What Changed

- `services/payroll/payroll-control.service.ts`
  - Added `payrollRunCorrectionMetadata` to derive correction evidence from either a payroll run object or flattened metadata.
  - Added correction evidence fields:
    - `payrollRunType`
    - `correctionRun`
    - `originalRunId`
    - `originalRunNumber`
    - `originalRunStatus`
    - `originalRunDocumentHash`
    - `originalRunEvidenceHash`
    - `originalCalculationHash`
  - Threaded correction evidence through:
    - approval fresh-auth metadata
    - payroll ledger posting batch metadata
    - journal line metadata
    - ledger audit events
    - payslip hashes and payslip metadata
    - `payroll.run.posted` event payload and outbox payloads
    - payment release evidence, payment batch metadata, allocation metadata, payment posting metadata, reconciliation payloads, event metadata, and outbox payloads
    - declaration payload hashes, declaration metadata, `payroll.declaration.prepared` event payload, outbox payload, and audit metadata
  - Updated payroll-run ledger posting to reverse debit/credit side for negative correction deltas.
  - Preserved fail-closed behavior for negative non-correction payroll postings.

- `services/payroll/__tests__/payroll-control.service.test.ts`
  - Added `runType` and `originalRunId` shape to the base payroll run fixture.
  - Added `payrollCorrectionRunFixture`.
  - Added a negative correction accounting test that proves:
    - correction metadata reaches ledger posting batch metadata
    - negative gross delta credits expense instead of throwing
    - negative net-pay and deduction deltas debit payable accounts
    - journal line metadata includes `signedAmount`, `correctionReversal`, and original-run proof
    - payslip metadata and posted-run event payload preserve correction identity

## Evidence

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - Passed: 1 suite, 19 tests.

- `npm run typecheck`
  - First run timed out at the command timeout.
  - Rerun with a longer timeout passed: `tsc --noEmit --pretty false`.

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - Passed: 4 suites, 37 tests.

- `npm run prisma:validate`
  - Passed: Prisma schema valid.

- `npm run policy:gates`
  - Passed aggregate gates:
    - inventory boundary: 0 active violations
    - service boundary: 0 active violations
    - workflow assurance runtime check: ready
    - payroll immutability runtime check: ready
    - hard-delete gate: 0 active unsafe findings
    - regulatory hardcode gate: pass, 0 active findings
    - demo/report trust gate: 0 active findings
    - raw error boundary gate: 0 active unsafe findings

Payroll immutability runtime evidence after this run:

- Required triggers present: 8/8
- Forbidden mutation checks blocked: 12/12
- Allowed lifecycle checks passed: 3/3
- Blockers: 0

## Production Meaning

Correction runs are now more than calculation artifacts. They can flow through accounting and downstream evidence as explicit correction financial events. A salary decrease or other negative delta no longer fails payroll-run posting just because the amount is negative; it posts as a reversal-side journal movement with signed amount metadata and original-run proof.

This is important for SMB operations because corrections can now be handled without reopening old payroll registers, hiding changes inside ordinary payroll, or forcing manual accounting work outside the evidence trail.

## Residual Risks

- Payment release for negative net correction runs remains intentionally blocked by existing positive allocation rules; refund/employee receivable workflows are still needed.
- Declaration amendment and statutory credit lifecycle still needs explicit provider/authority behavior instead of treating negative declaration deltas as fully automated filings.
- BI and finance dashboards still need to consume correction metadata as separate correction facts.
- Operator workflows still need fresh-auth correction actions, proof drawers, redacted views, denied states, and maker-checker approval around correction posting.

## Next Best Step

Build the statutory amendment and employee receivable/refund lane:

1. Add declaration amendment/credit states for correction runs.
2. Add payment/refund/receivable handling for negative net-pay correction runs.
3. Add tests proving correction declarations and payment exceptions preserve original-run proof.
4. Then expose correction run actions in operator UI only through service-backed, proof-backed workflows.
