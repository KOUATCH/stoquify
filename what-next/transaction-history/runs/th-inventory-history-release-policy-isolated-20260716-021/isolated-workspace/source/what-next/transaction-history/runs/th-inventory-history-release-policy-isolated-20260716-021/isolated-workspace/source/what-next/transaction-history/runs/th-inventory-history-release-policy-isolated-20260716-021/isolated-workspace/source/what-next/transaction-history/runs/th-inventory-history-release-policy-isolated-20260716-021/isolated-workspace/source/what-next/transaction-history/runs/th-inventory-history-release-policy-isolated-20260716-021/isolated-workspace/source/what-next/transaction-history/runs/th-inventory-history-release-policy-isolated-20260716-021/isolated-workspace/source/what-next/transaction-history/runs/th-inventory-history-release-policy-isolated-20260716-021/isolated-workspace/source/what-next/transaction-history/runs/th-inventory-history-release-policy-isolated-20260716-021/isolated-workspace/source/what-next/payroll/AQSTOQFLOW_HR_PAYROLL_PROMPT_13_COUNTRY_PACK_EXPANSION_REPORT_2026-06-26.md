# Aqstoqflow HR/Payroll Prompt 13 Country-Pack Expansion Report

Date: 2026-06-26

Source skill: `aqstoqflow-hrpayroll-13-country-pack-expansion`

Source prompt suite: `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`

## Decision

Prompt 13 is implemented for the Cameroon CNPS statutory expansion slice.

The expansion is intentionally narrow. It promotes only the CNPS payroll parameters evidenced by official CNPS sources to `REGULATOR_CONFIRMED`, adds golden fixtures for those parameters, and expands payroll calculation to consume CNPS pension, family allowance, and occupational-risk components from the country pack.

No IRPP, declaration submission adapter, e-invoicing adapter, unsupported payslip legal claim, or client-computed statutory truth was added.

## Official Source Evidence

Official sources used:

- CNPS employer rules page: `https://www.cnps.cm/fr/employeurs/regles-generales-pour-les-employeurs1.html`
- CNPS contribution-scale PDF linked from that page: `https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes.pdf`

Scope accepted as regulator-confirmed:

- Family allowance contribution rates by sector.
- Pension contribution employee/employer rates and ceiling.
- Occupational-risk contribution rates by group.
- Employer responsibility and registration/declaration rules.

Scope still not accepted as implemented statutory behavior:

- IRPP/personal income tax.
- Declaration submission mappings.
- Authority adapter automation.
- E-invoicing/fiscal certification.
- Tenant sector/risk classification assignment workflow.

## Expert Lenses Applied

- OHADA/SYSCOHADA payroll specialist
- Compliance architect
- Accountant
- SaaS source-of-truth reviewer
- Security and privacy reviewer

## Source Prerequisite IDs

- P3.01
- P3.02
- P3.03
- P3.04

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_BLOCKER_REPORT_2026-06-26.md`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `services/payroll/__tests__/payroll-compensation.service.test.ts`
- `prisma/schema.prisma`

## Prerequisite Gate

Status: passed for the narrow CNPS slice.

Evidence:

- Compensation/rubrique foundation exists from Prompt 09.
- Regulatory hardcode gate passed with 0 active findings.
- Official CNPS sources exist for the accepted CNPS contribution parameters.
- Unsupported or unconfigured tenant states are blocked rather than guessed.

## Implemented

### Country-Pack Provenance

File: `services/regulatory/country-packs/cameroon.ts`

Updated CNPS payroll envelopes to `REGULATOR_CONFIRMED` for:

- `payroll.cnps.familyAllowanceRatesBps`
- `payroll.cnps.pensionRatesBps`
- `payroll.cnps.occupationalRiskRatesBps`
- `payroll.cnps.employerRules`

Added golden fixtures for:

- CNPS family allowance rates
- CNPS occupational-risk rates
- CNPS employer rules

Existing e-invoicing and other review-required areas remain review-gated.

### Tenant Statutory Setup Fields

Files:

- `prisma/schema.prisma`
- `prisma/migrations/20260626123000_payroll_cnps_country_pack_expansion/migration.sql`

Added tenant accounting setup fields:

- `payrollCnpsFamilyAllowanceSector`
- `payrollCnpsOccupationalRiskGroup`

Enums added:

- `PayrollCnpsFamilyAllowanceSector`: `GENERAL`, `AGRICULTURE`, `PRIVATE_EDUCATION`
- `PayrollCnpsOccupationalRiskGroup`: `A`, `B`, `C`

### Payroll Calculation Expansion

File: `services/payroll/payroll-control.service.ts`

Expanded payroll calculation to resolve and prove:

- CNPS pension rates
- CNPS family allowance rates
- CNPS occupational-risk rates
- CNPS employer rules

Calculation now:

- Requires `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` provenance before production statutory calculation.
- Blocks Cameroon payroll calculation when CNPS family sector or occupational-risk group is missing.
- Calculates employee pension deduction from the pension employee rate.
- Calculates employer charge as employer pension plus family allowance plus occupational risk.
- Stores all resolved country-pack parameters, tenant classification, pack version, schema version, capability, and resolution hash in run-line rule provenance.
- Stores line-level statutory component amounts in the calculation snapshot.

### Setup Readiness Gate

File: `services/payroll/payroll-setup-readiness.service.ts`

Setup readiness now checks:

- `payroll.cnps.pensionRatesBps`
- `payroll.cnps.familyAllowanceRatesBps`
- `payroll.cnps.occupationalRiskRatesBps`
- `payroll.cnps.employerRules`

For Cameroon tenants, setup readiness blocks when CNPS family sector or occupational-risk group is missing.

## Security And Privacy Decisions

- No salary/person data was exposed in reports or logs.
- Statutory facts remain in country packs and server-side services.
- Tenant classification is stored as accounting setup configuration, not as UI state or client metadata.
- Payroll calculation refuses unreviewed statutory resolutions.
- No client-computed payroll truth was introduced.

## Accounting And Finance Decisions

- Employer charge now separates statutory components in calculation snapshot evidence.
- Existing posting logic continues to consume aggregate employer charge and remains balanced.
- Payroll run, run-line, payslip, declaration, and close evidence continue to pin country-pack provenance.
- New statutory outputs are traceable before later payslip/register/declaration use.

## UI/UX Decisions

No UI was added.

The command center and future setup UI should surface the new blockers from service-owned readiness facts. It must not infer tenant CNPS sector or occupational-risk group from industry text.

## Tests And Validation

Passed:

- `npm run prisma:validate`
- `npx prisma format`
- `npm run prisma:generate`
  - First failed with Windows `EPERM` because the local Next dev server held the Prisma query engine DLL.
  - `npx prisma generate --no-engine` was used temporarily to update types.
  - Repo-local Node/Next processes were then stopped and full `npm run prisma:generate` passed.
- `npm test -- --runTestsByPath services/regulatory/__tests__/country-pack.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/payroll/__tests__/payroll-compensation.service.test.ts --runInBand`
  - 4 suites passed
  - 31 tests passed
- `npm run regulatory:hardcode:fail`
  - 0 active findings
- Focused ESLint on touched TypeScript files
- `npm run typecheck`
- `npm run service:boundary:fail`
  - 0 active violations
- `npm run policy:gates`
  - inventory boundary passed
  - service boundary passed
  - workflow assurance runtime check ready
  - payroll immutability runtime check ready, 7/7 triggers present, 9/9 forbidden mutations blocked, 3/3 allowed lifecycle checks passed
  - hard-delete gate passed
  - regulatory hardcode gate passed
  - demo/report trust gate passed
  - raw error boundary gate passed

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260626123000_payroll_cnps_country_pack_expansion/migration.sql`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/__tests__/country-pack.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-setup-readiness.service.test.ts`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.json`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_13_COUNTRY_PACK_EXPANSION_REPORT_2026-06-26.md`

## Source-Of-Truth Controls

Preserved:

- Services own HR/payroll business truth.
- Country packs own statutory parameters and provenance.
- Server-side payroll services own calculation.
- Setup readiness exposes missing tenant CNPS classification as blockers.
- Dashboards remain render-only.
- No client-computed payroll truth was introduced.
- No duplicated statutory metrics were introduced.
- No dashboard shadow payroll service was introduced.
- No unsupported legal claim was introduced.

## Remaining Risks And Boundaries

- Tenant setup still needs an admin/operator workflow to choose and evidence CNPS family allowance sector and occupational-risk group.
- IRPP and other payroll taxes remain unimplemented until official/expert-reviewed formulas and fixtures are added.
- Payslip/register/declaration phases must continue to show unsupported states honestly.
- No authority submission automation is approved by this slice.

## Handoff

Prompt 13 handoff criteria are satisfied for the narrow Cameroon CNPS statutory expansion slice.

Prompt 14 may proceed only within this proven statutory scope. It must not present unsupported IRPP, declaration, or authority-adapter claims as complete payroll law.

Recommended next skill: `aqstoqflow-hrpayroll-14-payslip-self-service`.