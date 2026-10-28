# Aqstoqflow HR/Payroll Prompt 13 Country-Pack Expansion Blocker Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-13-country-pack-expansion`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Decision: `blocked`.

Prompt 13 must not expand production statutory payroll formulas in this run because the available Cameroon payroll inputs are source-checked, but not expert-reviewed or regulator-confirmed.

The country-pack, payroll calculation, compensation/rubrique, and hardcode-gate foundations are inspectable and passing focused validation. The blocker is legal/statutory provenance, not code health.

## Expert Lenses Applied

- OHADA/SYSCOHADA payroll specialist
- Compliance architect
- Expert accountant
- SaaS source-of-truth reviewer
- Security and privacy reviewer

## Source Prerequisite IDs

- P3.01
- P3.02
- P3.03
- P3.04

## Files And Reports Inspected

- `C:\Users\J COMPUTER\.codex\skills\aqstoqflow-hrpayroll-13-country-pack-expansion\SKILL.md`
- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_03_COUNTRY_PACK_GATE_REPORT_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_09_COMPENSATION_APPROVAL_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_10_PAYMENT_EVIDENCE_READINESS_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_11_COMMAND_READ_MODEL_REPORT_2026-06-26.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_12_COMMAND_CENTER_UX_REPORT_2026-06-26.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.json`
- `services/regulatory/country-packs/schemas.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/cameroon.constants.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `prisma/schema.prisma`

## Prerequisite Gate

| Gate | Status | Evidence |
|---|---|---|
| Compensation/rubrique foundation exists | Passed | Prompt 09 implemented `PayrollRubrique`, employee assignments, salary-change maker-checker workflow, service actions, tests, and country-pack provenance metadata. |
| Hardcode gate passes | Passed | `npm run regulatory:hardcode:fail` passed with 0 active findings on 2026-06-26. |
| Country-pack resolver and validation are inspectable | Passed | Resolver returns pack version, schema version, legal reference, verification status, capability status, and resolution hash. Validation checks published packs, legal refs, effective windows, capability declarations, and golden fixtures. |
| Existing payroll calculation path is inspectable | Passed | `calculatePayrollRun` resolves CNPS pension rates and employer rules through the country-pack resolver and stores provenance on run and line evidence. |
| Expert-reviewed inputs exist for new production formulas | Failed | Cameroon payroll values in `cameroon.ts` use `verificationStatus: "SOURCE_CHECKED"` and `verifiedBy` states legal-owner approval is required before statutory publication. No `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` payroll formula inputs were found for expansion. |

## Failed Prerequisite

Prompt 13 requires expert-reviewed inputs for any production statutory formula. That requirement is not met.

The Cameroon pack currently contains useful source-checked data for:

- CNPS pension rates
- CNPS family allowance rates
- CNPS occupational risk rates
- CNPS employer rules
- payroll labels and filing references

However, the pack-level verifier text is:

`Codex regulatory source pass; legal-owner approval required before statutory publication`

That means the data can support readiness gates, fixtures, provenance review, and blocked states, but it must not be used to expand production legal claims or additional statutory payroll formulas.

## Why Implementation Must Stop

Implementing additional payroll statutory mechanisms now would turn source-checked values into production legal behavior without the required expert-reviewed provenance.

That would violate these non-negotiable rules:

- No statutory legal claims without expert-reviewed country-pack provenance.
- Services own HR/payroll business truth.
- Statutory outputs must be traceable before posting, declaration, register, or close use.
- UI and downstream workflows must not hide expert-review states.

## Risk If Forced

If Prompt 13 is forced before expert review:

- Payroll calculations could present legally unsupported results.
- Payslips, registers, declarations, postings, and close evidence could inherit false statutory certainty.
- Audit evidence would show country-pack hashes but not expert-approved legal provenance.
- Future self-service or register views could expose unsupported statutory claims to employees, accountants, or auditors.
- Tenant payroll liability could be created by software behavior rather than reviewed country-pack policy.

## What Was Not Implemented

- No new statutory formula was added.
- No declaration adapter was added.
- No payslip/register legal claim was added.
- No production payroll calculation behavior was expanded.
- No UI route or command-center workflow was added.
- No country-pack values were promoted from `SOURCE_CHECKED` to `EXPERT_REVIEWED`.

## Tests And Validation Run

Passed:

- `npm run regulatory:hardcode:fail`
  - Status: pass
  - Active findings: 0
- `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts --runInBand`
  - Test suites: 3 passed
  - Tests: 25 passed
- `npm run prisma:validate`
  - Prisma schema valid
- `npm run typecheck`
  - TypeScript passed

Note: npm validation commands were run outside the managed sandbox because the sandbox repeatedly failed with `windows sandbox: helper_unknown_error: setup refresh had errors`.

## Files Changed In This Run

- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_BLOCKER_REPORT_2026-06-26.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.json`

No production code was intentionally changed by this Prompt 13 run.

## Source-Of-Truth Controls Preserved

- Services remain the payroll truth owners.
- Country-pack data remains the statutory source boundary.
- Dashboards remain render-only.
- No client-computed payroll truth was introduced.
- No duplicated statutory metrics were introduced.
- No dashboard-specific shadow payroll service was introduced.
- No unsupported statutory UI claim was introduced.
- No salary/person data was exposed in validation or this report.

## Exact Next Safe Action

Before rerunning Prompt 13, obtain a reviewed statutory input package for the intended Cameroon payroll expansion.

Minimum required package:

1. Legal-owner or qualified payroll/accounting expert review of the exact formulas to support.
2. Country-pack updates marking approved formula envelopes as `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED`.
3. `verifiedBy`, `verifiedOn`, legal references, source URLs, effective windows, and applicability notes for each formula.
4. Golden fixtures for each approved formula and edge case.
5. Explicit unsupported-state entries for formulas not approved.
6. Fixture tests proving the pack resolves only approved formulas.
7. A hardcode-gate run proving statutory values remain in country packs or reviewed configuration, not application logic.

Recommended first reviewed expansion target:

- CNPS pension calculation confirmation, including employee rate, employer rate, monthly ceiling, annual ceiling behavior, and rounding.

Recommended second reviewed target:

- CNPS family allowance and occupational risk employer charges, including employer risk group classification rules and unsupported-state behavior when tenant risk group is missing.

## Handoff

Prompt 13 handoff criteria are not satisfied.

Do not proceed to Prompt 14 payslip/self-service as a production statutory surface until Prompt 13 has either:

- implemented only expert-reviewed statutory expansion with golden fixtures, or
- explicitly defines a non-statutory/blocker-only payslip scope that makes no legal payroll claims.

Next skill remains `aqstoqflow-hrpayroll-13-country-pack-expansion` after expert-reviewed statutory inputs are available.
