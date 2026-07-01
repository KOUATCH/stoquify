# AqStoqFlow HR/Payroll Wave 1 Formula-Reference Rubrique Engine Report

Date: 2026-06-28

## Decision

Status: PASS for the implemented formula-reference payroll rubrique slice.

This advances the statutory country-pack and payroll-engine hardening wave. It does not complete unrestricted full HR/payroll production readiness by itself.

## Implemented Scope

- `FORMULA_REFERENCE` payroll rubriques no longer fail solely because no runtime adapter exists.
- Formula-reference rubriques now calculate through reviewed country-pack resolution only.
- Supported runtime formula modes are intentionally narrow and generic:
  - `FIXED_AMOUNT`
  - `INPUT_AMOUNT`
  - `RATE_BPS`
  - `QUANTITY_RATE`
- Unsupported modes still fail closed.
- Formula-reference rubriques require:
  - active rubrique and active effective assignment;
  - assignment approval history;
  - matching assignment and contract currency;
  - statutory country-pack parameter path;
  - supported reviewed country-pack capability;
  - matching formula `payrollEffect` and rubrique kind;
  - matching optional formula flags for taxable base, social base, and employer charge.
- Runtime line snapshots now carry `formulaTrace` with parameter path, calculation mode, base/rate/quantity/unit/cap/floor evidence, country-pack version, resolution hash, legal reference, verification status, and capability status.
- Formula-reference provenance is added to the payroll line legal provenance chain.

## Guardrails Preserved

- No production legal formula or statutory amount was hardcoded.
- Country-pack values remain the source for formula logic and provenance.
- Missing statutory path, unsupported capability, mismatched effect, mismatched component code, and mismatched flags block calculation.
- Non-statutory formula employer charges do not inflate statutory declaration liability.
- POS/sales still do not own payroll truth.

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - PASS: 1 suite, 14 tests.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - PASS: 4 suites, 32 tests.
- `npm run typecheck`
  - PASS.
- `npm run prisma:validate`
  - PASS.
- `npm run regulatory:hardcode:fail`
  - PASS: active findings 0.
- `npm run service:boundary:fail`
  - PASS: active violations 0.
- `npm run policy:gates`
  - PASS: inventory boundary, service boundary, workflow assurance, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw error boundary gates.

## Remaining Production Work

- Add more country-pack golden fixtures for formula-reference allowances, deductions, benefits, caps, floors, and correction cases.
- Extend formula-reference support into retro/correction runs once correction-run lifecycle is implemented.
- Add route-level proof drawer surfacing for formula traces after operator run/payment/declaration routes are service-backed.
- Keep final full-production readiness blocked until the remaining roadmap blockers close and Prompt 19/21 release certification passes.
