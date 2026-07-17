# AqStoqFlow HR/Payroll Wave 1 Component Register Proof Report

Date: 2026-06-27
Status: Implemented and verified for the focused statutory component register-proof slice.

## Scope

This slice closes a core production-readiness gap in the payroll truth chain: the payroll register no longer proves only high-level run, payslip, payment, declaration, ledger, and close evidence. It now also carries statutory component proof from the service-owned payroll calculation snapshot.

The register now exposes and hashes component proof for:
- Gross amount
- Taxable base
- Social base
- Employee pension contribution
- Employer pension contribution
- Family allowance contribution
- Occupational risk contribution
- IRPP/income-tax withholding amount when applied
- IRPP/income-tax calculation status when blocked or calculated
- Employee deduction total
- Employer charge total
- Net payable amount

## Files Changed

- `services/payroll/payroll-register.service.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`

## Implemented Behavior

- Added `PayrollRegisterComponentAmounts`, `PayrollRegisterComponentProof`, `PayrollRegisterComponentTieOut`, and `PayrollRegisterComponentTotals` to the register read model.
- Added per-line component extraction from `payroll_run_lines.calculationSnapshot`.
- Added deterministic `componentEvidenceHash` for each payroll line.
- Added component evidence hashes and component statuses into the immutable register hash payload, upgraded to register hash version 2.
- Added row-level `tieOut.components` and top-level `tieOut.components` with matched, missing, mismatched, and blocked statutory component counts.
- Added summary-level `componentTotals` for payroll, statutory, employer, deduction, and net-pay tie-out.
- Added readiness blockers when component proof is missing or mismatched:
  - `PAYROLL_REGISTER_COMPONENT_PROOF_MISSING`
  - `PAYROLL_REGISTER_COMPONENT_PROOF_MISMATCH`
- Preserved redaction: sensitive component amounts redact under payroll amount policy, while proof status and non-amount statutory state remain visible.
- Preserved explicit IRPP gap handling: current blocked/expert-review status is evidence-backed, not silently treated as calculated tax.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 1 suite passed, 6 tests passed.

```powershell
npm run typecheck
```

Result: TypeScript passed.

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 5 suites passed, 37 tests passed.

```powershell
npm run regulatory:hardcode:fail
```

Result: passed, 0 active findings.

## Production Impact

This makes the payroll register a stronger accounting and close-assurance source of truth. Finance can now consume register facts that prove statutory composition instead of trusting only aggregate deductions and employer charges.

This does not claim full HR/payroll production readiness. It advances Wave 1 by making calculation/register truth evidence-backed enough for the next accounting-close slices.

## Next Recommended Slice

Continue with payroll accounting component mapping and close blockers:
- Map each component to ledger classes: salary expense, employer charges, employee deductions, statutory liabilities, net-pay clearing, payment clearing, branch/location/cost-center allocation.
- Ensure posting source links carry component-register proof hash.
- Block close certification when component proof, ledger postings, payment evidence, or declaration proof diverge.