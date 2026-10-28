# AqStoqFlow HR/Payroll Wave 1 Downstream Composite Register Proof Propagation Report

Date: 2026-07-02
Status: Implemented and locally verified

## Decision

Wave 1 now treats composite payroll register proof as a downstream production gate, not only as a payroll register read-model detail.

The implemented scope binds component register proof, country-pack register proof, statutory scenario coverage evidence, and payroll component mapping into a deterministic composite proof hash. That hash is now produced during payroll posting and declaration preparation, carried into payment release and settlement evidence, surfaced in declaration/payment command read models, and enforced by accounting data-trust blockers.

## Implemented Scope

- Added `PayrollCompositeRegisterProof` construction in `services/payroll/payroll-control.service.ts`.
- Payroll posting now requires matched statutory component proof and matched country-pack register proof before ledger posting.
- Posted payroll run metadata now includes `compositeRegisterProofHash`, `compositeRegisterProofStatus`, composite line counts, and composite issues.
- Payroll payment release now rejects posted runs without matched composite register proof.
- Payroll payment batch metadata, allocation metadata, ledger posting metadata, events, audit changes, and notification payloads now carry the composite proof through `runProofMetadata`.
- Declaration preparation now includes composite proof metadata in declaration payloads, metadata, business events, and audit changes.
- Declaration lifecycle evidence now propagates composite proof from prepared declaration metadata into lifecycle evidence metadata.
- Declaration workbench proof views now expose composite proof hash, status, and proof-present state with redaction support.
- Payment reconciliation now requires matched composite proof before settlement evidence can be recorded.
- Payment reconciliation read models now expose redacted composite proof identifiers and present-state flags.
- Settlement updates now persist latest composite proof fields on payment transactions and payment batches.
- Accounting data-trust now blocks certification when declaration evidence, settled payment evidence, or posted payroll runs lack matched composite proof.

## Accounting / Close Impact

New blocker families:

- `payroll-declaration-composite-register-proof-missing`
- `payroll-payment-settlement-composite-proof-missing`
- `payroll-posted-runs-composite-proof-missing`

New module evidence facts:

- Declaration composite register proof gaps
- Payment composite proof gaps
- Posted run composite proof gaps

The accountant trust-pack evidence wording now explicitly includes composite proof for payment settlement and declaration lifecycle evidence.

## Validation

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/accounting/__tests__/data-trust.service.test.ts --runInBand`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
- `npm run typecheck`
- `npm run lint -- --quiet` with 0 errors and 4 pre-existing warnings
- `npm run prisma:validate`
- `npm run regulatory:hardcode:fail`
- `npm run policy:gates`
- `git diff --check` with line-ending warnings only

## Residual Risk / Next Slice

This closes the downstream propagation gap for the composite register proof. The next implementation slice should continue the roadmap by expanding statutory country-pack breadth and payroll engine hardening: reviewed formulas, golden fixtures, effective dating, caps, IRPP/income tax, employer/employee contributions, allowances, benefits, leave/overtime, YTD, corrections, and jurisdiction expansion without hardcoded legal logic.

The full read-model composite register proof still includes post-settlement and close-readiness dimensions that are only fully known after downstream actions complete. This wave intentionally carries a deterministic core composite proof through the downstream lifecycle, then lets settlement and close assurance add their own latest evidence fields.