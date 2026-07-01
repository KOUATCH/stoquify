# AqStoqFlow HR/Payroll Wave 1 Component Mapping Tie-Out Report

Date: 2026-06-27
Status: Implemented with one unrelated verification blocker.

## Slice

Implemented the next Wave 1 payroll hardening slice after the tax evaluator and IRPP capability reports: reviewed-by-default-blocked payroll component mapping plus register tie-out coverage for taxable base, income-tax withheld, statutory payable, declaration liability, and payroll ledger posting lines.

Cameroon IRPP withholding remains disabled. The current Cameroon `payroll.irpp.incomeTaxRules` path still produces `BLOCKED_REQUIRES_EXPERT_REVIEW`, `incomeTaxApplied: false`, `incomeTaxWithholdingAmount: 0.00` in mapping evidence, and `incomeTaxWithholdingEnabled: false` until reviewed fixtures exist.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_COMPONENT_MAPPING_TIEOUT_REPORT_2026-06-27.md`

## Implementation Summary

- Added a payroll component mapping artifact with a stable hash, default review posture, taxable base, income-tax withheld, statutory payable, declaration liability, IRPP calculation status, withholding-enabled flag, blocked statutory component count, and required payroll ledger mapping keys.
- Stamped calculation snapshots with component mapping evidence while preserving IRPP as blocked and not withheld.
- Carried the mapping hash/status into payroll posting metadata, payroll run business events, payroll run metadata, and payroll journal entry line metadata.
- Added per-ledger-line component coverage for gross expense, employer charges, employee payable, withholding payable, and social contribution payable lines.
- Enriched payroll declaration payloads and metadata with component register proof hash, component mapping hash/status, taxable base, income-tax withheld, statutory payable, and declaration liability.
- Extended the payroll register read model with `tieOut.componentMapping`, comparing service-owned component proof to declaration liability and payroll journal line metadata.
- Added register blockers for missing or mismatched component mapping evidence.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 2 suites passed, 17 tests passed.

```powershell
npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts --runInBand
```

Result: 5 suites passed, 40 tests passed.

```powershell
npm run typecheck 2>&1
```

Result: passed.

```powershell
git diff --check -- services/payroll/payroll-control.service.ts services/payroll/payroll-register.service.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts
```

Result: passed with a line-ending normalization warning on `services/payroll/payroll-control.service.ts`.

Blocked:

```powershell
npm run regulatory:hardcode:fail
```

Result: failed due existing active findings outside this slice:

- `scripts/seed-payroll-e2e-user.js:265` mobile-money provider literal
- `scripts/seed-payroll-e2e-user.js:370` mobile-money provider literal

## Residual Risks

- Cameroon IRPP remains blocked until reviewed formulas, taxable-base rules, exemptions, caps, rounding, YTD regularization, and golden fixtures exist.
- The hardcode gate cannot be treated as green until the unrelated seed-script mobile-money provider findings are remediated or explicitly excluded by policy.
- The component mapping now proves coverage and disabled IRPP state; it does not enable production IRPP withholding.

## Next Recommended Slice

Remediate the unrelated hardcode gate findings, then add reviewed Cameroon IRPP golden fixtures and only then enable income-tax withholding through the existing country-pack evaluator boundary.