# AqStoqFlow HR/Payroll Phase 1 Statutory Country-Pack Expansion Report

Date: 2026-06-27

Skill applied: `aqstoqflow-hrpayroll-13-country-pack-expansion`

Prompt name: Statutory Country-Pack Expansion

Architecture source: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_INTEGRATION_ARCHITECTURE_GAP_REPORT_2026-06-27.md`

Predecessor:

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_CENTER_UX_REPORT_2026-06-27.md`

## Decision

Prompt 13 was completed as a statutory provenance expansion, not a new formula expansion.

The safe implementation path was to strengthen traceability around the existing Cameroon CNPS calculation inputs that are already `REGULATOR_CONFIRMED` in the country pack. No new statutory math, declaration submission adapter, tax rule, filing automation, or hidden production legal claim was added.

## Prerequisite Gate

Status: passed for this narrow provenance slice.

- Compensation/rubrique foundation exists and supports statutory parameter provenance.
- The regulatory hardcode gate passes with 0 active findings.
- Cameroon CNPS pension, family allowance, occupational risk, and employer-rules inputs resolve from the country pack with regulator-confirmed provenance.
- Payroll calculation already blocks missing CNPS tenant classification before calculating.
- E-invoicing and other unsupported legal automation states remain expert-review gated.

## Files Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-13-country-pack-expansion\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_COMMAND_CENTER_UX_REPORT_2026-06-27.md`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/compensation.service.ts`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `scripts/regulatory-hardcode-gate.js`

## Implementation Summary

- Added a compact `PayrollStatutoryLegalProvenanceEntry` evidence shape in `services/payroll/payroll-control.service.ts`.
- Derived legal provenance from resolved country-pack parameters only after the existing expert/regulator review gate passes.
- Attached statutory legal provenance to:
  - payroll country-pack status;
  - payroll run line `ruleProvenance`;
  - payroll run line `calculationSnapshot`;
  - payroll run calculated business-event payload;
  - payroll ledger posting metadata;
  - payslip hash inputs and payslip metadata;
  - payroll run posted business-event payload;
  - payroll payment posting metadata;
  - payroll declaration payload and declaration metadata;
  - payroll declaration prepared business-event payload and audit changes.
- Added `legalProvenanceHash` where downstream accounting, payment, declaration, and close evidence can compare compact statutory provenance without parsing full rule objects.
- Updated payroll control tests to assert regulator-confirmed provenance on calculation line evidence, calculated events, payslip metadata, and posted events.

## Security And Privacy

- The new provenance entries contain legal parameter path, legal reference, effective dates, verifier, verification status, capability status, and resolution hash.
- No salary, employee personal details, bank/mobile destination values, or payment credentials were added to reports or logs.
- Existing payroll redaction, fresh-auth, maker-checker, tenant isolation, and immutability controls were not weakened.
- Unsupported or expert-review states remain visible as blockers instead of becoming production legal claims.

## Accounting And Finance Decisions

- Payroll posting metadata now carries `legalProvenanceHash` alongside country-pack version/schema/resolution evidence.
- Payslips and posted payroll events preserve country-pack provenance before register, posting, payment, reconciliation, declaration, and close workflows consume them.
- Declaration payloads carry the same legal provenance summary and keep expert-review flags.
- No accounting posting rule, payment release rule, declaration submission adapter, or close mutation behavior was changed.

## UI/UX Decisions

No UI was changed in this Prompt 13 slice.

The command center and downstream payroll surfaces can now rely on clearer service-owned provenance if they need to display unsupported or expert-review statutory states later.

## Verification

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts scripts/__tests__/regulatory-hardcode-gate.test.js --runInBand
npm run regulatory:hardcode:fail
npm run typecheck
npm test -- --runTestsByPath services/payroll/__tests__/payroll-tenant-boundary.service.test.ts services/payroll/__tests__/payroll-privacy.service.test.ts --runInBand
npm run service:boundary:fail
npm run lint -- --quiet
npm run prisma:validate
```

Results:

- Payroll control, country-pack, and hardcode tests: 3 suites passed, 20 tests passed.
- Regulatory hardcode fail gate: passed, 0 active findings.
- Typecheck: passed.
- Payroll tenant/privacy tests: 2 suites passed, 6 tests passed.
- Service boundary gate: passed, 0 active violations.
- ESLint: passed with 0 errors and 5 existing unrelated warnings.
- Prisma schema validation: passed.

Skipped:

- `npm run prisma:generate`: no schema or migration changes.
- Browser smoke: no UI changed in this slice.
- New declaration-preparation test: not added in this narrow pass because the existing suite does not currently fixture that flow; declaration provenance was typechecked and the payroll control suite still exercises calculation/posting provenance.
- New formulas: intentionally not implemented because Prompt 13 forbids unreviewed statutory formulas.

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_STATUTORY_COUNTRY_PACK_EXPANSION_REPORT_2026-06-27.md`

## Source-Of-Truth Risks Avoided

- No hardcoded statutory values in runtime services.
- No declaration adapter or authority submission automation without expert-reviewed inputs.
- No legal certainty for unsupported states.
- No client-side payroll truth or UI-derived statutory output.
- No mutation of finalized payroll evidence in place.

## Handoff

Payslip, register, declaration, payment, posting, reconciliation, and close workflows now have a stronger country-pack legal-provenance trail to rely on. The next safe slice is Prompt 14 only if own-data restriction, immutability, redaction/audit, and statutory provenance gates remain green.