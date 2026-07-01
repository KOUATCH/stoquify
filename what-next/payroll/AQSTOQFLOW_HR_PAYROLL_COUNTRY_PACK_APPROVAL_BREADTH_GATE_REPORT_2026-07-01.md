# AqStoqFlow HR/Payroll Country-Pack Approval Breadth Gate Report

Date: 2026-07-01
Prompt: 13 - Statutory Country-Pack Expansion
Roadmap wave: Wave 1, statutory country-pack and payroll engine hardening
Decision: Implemented and verified for this slice. Full HR/payroll production remains not approved.

## Expert Lenses Applied

- OHADA/SYSCOHADA payroll specialist
- Compliance architect
- Accounting controls reviewer
- Enterprise release gate reviewer
- Cybersecurity and redaction reviewer

## Source Prerequisites

Read and applied:

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_PRODUCTION_READINESS_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_COUNTRY_PACK_FIXTURE_PROVENANCE_INGESTION_REPORT_2026-07-01.md`

Prerequisite gate:

- Compensation/rubrique and statutory fixture infrastructure are present in the current codebase.
- Regulatory hardcode gate passed before implementation.
- No new statutory formula values were introduced.
- Active Cameroon pack remains honest: CNPS executable coverage exists; IRPP and wider statutory coverage remain blocked unless reviewed proposed packs supply evidence.

## Problem Closed

Final release readiness already checked that every country-pack legal-owner approval target family was READY in setup statutory coverage proof. It did not check the inverse: every setup-ready statutory family also had to be named in the legal-owner country-pack approval.

That created a future full-production risk: once a tenant/setup proof has multiple READY statutory families, a partial legal-owner approval could still be over-read as enough country-pack approval evidence.

## Implementation

Added an inverse approval breadth gate to final release readiness:

- Compute setup-ready statutory families from proof-backfill setup statutory scenario coverage.
- Compute legal-owner approved country-pack target families from the latest country-pack review intake approval.
- Block final release when any setup-ready statutory family is missing from the legal-owner country-pack approval.

New blocker:

- `FINAL_COUNTRY_PACK_REVIEW_INTAKE_READY_FAMILY_COVERAGE_MISSING`

New evidence fields on the country-pack review intake evidence pack:

- `setupReadyFamilyCount`
- `setupReadyFamiliesMissingApproval`

New gate summary fields:

- `setupReadyFamilyCount`
- `setupReadyFamiliesMissingApproval`
- `readyFamiliesMissingCountryPackApproval`

## Files Changed

- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/__tests__/payroll-final-release-readiness.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Tests And Validation

Passed:

- `npm run regulatory:hardcode:fail`
  - Status pass, active findings 0.

- `npx jest services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
  - 1 suite passed, 10 tests passed.

- `npx jest services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-setup-readiness.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 8 suites passed, 73 tests passed.

- `npm run typecheck`
  - TypeScript clean.

- `npm run prisma:validate`
  - Prisma schema valid.

- `npm run service:boundary:fail`
  - Active service-boundary violations 0.

- `npm run policy:gates`
  - Inventory boundary pass.
  - Service boundary pass.
  - Workflow assurance runtime check ready.
  - Payroll immutability runtime ready, required triggers 9/9, blocked mutations 14/14, allowed lifecycle checks 3/3.
  - Hard-delete gate pass.
  - Regulatory hardcode gate pass.
  - Demo/report trust gate pass.
  - Raw error boundary gate pass.

## Security, Privacy, And Accounting Decisions

- No raw salary, person, payment destination, provider payload, authority payload, or legal source document was added to final release evidence.
- The new evidence is family-level and hash/count oriented.
- The release gate fails closed when approval breadth is incomplete.
- No finance, BI, POS, payment, declaration, or operator workflow was given new authority to infer payroll truth.
- No country-pack legal formula was hardcoded or promoted without reviewed provenance.

## Handoff

This slice strengthens statutory country-pack approval breadth but does not close the full statutory production blocker by itself.

Next safe statutory work remains one of:

1. Add reviewed proposed-pack fixtures for additional statutory families through the existing provenance/review-intake path.
2. Harden payroll run/register calculation evidence so every calculated component carries country, pack version, schema version, capability, resolution hash, and legal provenance into run lines, payslips, declarations, ledger, and close evidence.
3. Keep active Cameroon production claims limited to reviewed CNPS scope until qualified IRPP/allowance/benefit/leave/overtime inputs are supplied.