# AqStoqFlow HR/Payroll Wave 1 Payroll Auditor Proof Pack Report

Date: 2026-07-02
Selected skill: aqstoqflow-payroll-accounting-close
Phase: Phase 7 - payroll accounting close and auditor assurance
Executable slice: redacted payroll auditor proof pack/read model for accountant trust-pack export

## Outcome

Implemented a payroll auditor proof-pack read model inside the accountant data-trust service. The pack is tenant-scoped, redacted, evidence-backed, and exportable through the accountant trust-pack payload without exposing employee identities, bank/mobile-money details, raw salary rows, or raw authority/provider payloads.

This slice strengthens the HR/payroll production-readiness spine by giving accounting, audit, and close workflows a single redacted payroll assurance surface for payroll posting, source-link, component proof, payslip tie-out, payment proof, and declaration proof.

## Files Changed

- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Design Decisions

- Added `PayrollAuditProofPack` as a first-class data-trust read model rather than leaking payroll row detail into exports.
- Used aggregate counts, blocker identifiers, source table names, proof-gate status, and hashed source-link references only.
- Kept tenant safety explicit through organization-scoped query inputs and a generated scope hash.
- Carried payroll blockers into proof-gate status so certified exports remain blocked when payroll register, ledger, payment, declaration, or component proof is missing.
- Included the proof pack in accountant trust-pack exports and row-count accounting so the exported evidence is complete and auditable.
- Avoided statutory formulas, provider claims, or authority automation claims in this slice.

## Proof Gates Added

- `payroll.accounting.posting`
- `payroll.accounting.source-link`
- `payroll.accounting.component-proof`
- `payroll.register.payslip-tieout`
- `payroll.payment.proof`
- `payroll.declarations.proof`

## Redaction Contract

The proof pack exposes hashes and aggregates only. It explicitly excludes:

- employee names
- employee identifiers
- bank and mobile-money details
- raw salary rows
- raw authority/provider payloads

## Verification

Passed:

- `npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand` - 13 tests passed
- `npm test -- --runTestsByPath services/accounting/__tests__/close-assurance-pack.service.test.ts --runInBand` - 8 tests passed
- `npm run typecheck` - passed
- `npm run prisma:validate` - passed
- `npm run service:boundary:fail` - passed, 0 active violations
- `npm run regulatory:hardcode:fail` - passed, 0 active findings
- `npm run policy:gates` - passed, including inventory, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates
- `npm run lint -- --quiet` - passed with 4 pre-existing warnings and 0 errors

## Gates Blocked

None for this slice.

Operational note: several commands had to be rerun with sandbox escalation because the Windows sandbox helper failed during setup refresh before the local test or gate command could start.

## Residual Risks

- This does not complete statutory country-pack breadth or authority/payment adapter automation.
- This does not add new operator UI proof drawers; it creates the redacted read model and export payload they should consume.
- This does not certify unrestricted production rollout by itself; full readiness still requires the remaining HR/payroll roadmap blockers, one reconciled controlled pilot cycle, and accounting/security/operations signoff.

## Next Recommended Slice

Use `aqstoqflow-payroll-command-center` to expose the proof-pack facts through service-backed operator and auditor workflows: payroll run proof drawers, payments proof drawers, declaration proof drawers, denied/redacted states, loading/error/empty states, and fresh-auth actions. Keep POS and sales as approved input feeders only; accounting remains the financial backbone.
