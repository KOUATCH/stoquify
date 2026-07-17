# AqStoqFlow HRIS/Payroll Country-Pack Provenance

Date: 2026-07-12
Skill: `aqstoqflow-hris-payroll-12-country-pack-provenance`
Status: Completed as a fail-closed provenance verification slice
Next handoff: `aqstoqflow-hris-payroll-13-payments-declarations-proof`

## Executive Decision

The current country-pack posture is safe to keep wired into payroll because unsupported or unreviewed statutory automation remains fail-closed and explicit.

This slice does not promote any new statutory formula to production. The active Cameroon pack still keeps IRPP and several statutory automation surfaces under `REQUIRES_EXPERT_REVIEW`. That is the correct result until qualified review supplies legal references, source evidence hashes, executable golden fixtures, and final-release approval evidence for each family.

## Scope

Inspected the HRIS/payroll blueprint, roadmap, current engine-integration report, country-pack services, statutory scenario coverage, fixture runner, country-pack review intake, final-release readiness, payroll-control runtime tests, regulatory hardcode gate, and statutory country-pack production gate.

No statutory formulas were changed.

## Files Inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_COUNTRY_PACK_FIXTURE_PROVENANCE_INGESTION_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_STATUTORY_REVIEW_TOPICS_EVIDENCE_CHAIN_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FINAL_RELEASE_STATUTORY_TARGET_FAMILY_BINDING_REPORT_2026-07-01.md`
- `what-next/payroll/payroll-regulatory-hardcode-gate.md`
- `services/regulatory/country-packs/cameroon.ts`
- `services/regulatory/country-packs/registry.ts`
- `services/regulatory/country-packs/resolve.ts`
- `services/regulatory/country-packs/validation.ts`
- `services/payroll/payroll-country-pack-fixture-runner.ts`
- `services/payroll/payroll-statutory-scenario-coverage.service.ts`
- `services/payroll/payroll-country-pack-review-intake.service.ts`
- `services/payroll/payroll-country-pack-review-intake-persistence.service.ts`
- `services/payroll/payroll-final-release-readiness.service.ts`
- `services/payroll/payroll-control.service.ts`

## Current Blockers

- Full Cameroon statutory payroll breadth is still not production-ready.
- IRPP remains `REQUIRES_EXPERT_REVIEW` in the active Cameroon country pack.
- Unrestricted statutory production claims remain blocked until reviewed formulas, legal references, source hashes, fixture inputs, fixture outputs, effective dates, and approval evidence are present.
- This slice verifies the fail-closed proof boundary; it does not certify legal correctness of any statutory rule.

## Data Ownership

- HRIS owns employee, contract, compensation, attendance, document, and approval truth.
- Payroll consumes certified HRIS snapshots and country-pack provenance.
- Regulatory/country-pack services own statutory rule provenance and source-hash state.
- Assurance/final-readiness services decide whether the evidence chain is sufficient for release.

## Tenant, RBAC, Audit, And Redaction Decision

- No UI, route, action, or permission surface was changed.
- No tenant boundary was widened.
- No raw employee, payment, or private statutory evidence payload was exposed.
- Runtime statutory proof remains metadata/hash-oriented: country-pack version, schema version, resolution hash, review evidence hashes, legal refs, fixture evidence, and coverage hash.

## Verification

Passed:

- `npm run regulatory:hardcode:fail`
  - Status: `pass`
  - Active findings: `0`
- `npm run statutory:country-pack:gate`
  - Status: `ready`
  - Checks ready: `10/10`
  - Blockers: `0`
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 7 suites passed
  - 91 tests passed

## Generated Evidence Changes

Running `npm run statutory:country-pack:gate` refreshed:

- `what-next/statutory-country-pack-production-readiness.md`
- `what-next/statutory-country-pack-production-readiness.json`

The refresh updated generated gate evidence only.

## Skipped Checks

- Full `npm run typecheck` was not rerun in this slice because no TypeScript source was edited.
- Browser validation was not run because this slice touched no UI route.
- No external legal/regulator validation was attempted.

## Residual Risk

The main residual risk is statutory knowledge completeness, not code wiring. The current implementation safely records and blocks incomplete statutory areas, but the product still needs qualified country-pack work before unrestricted payroll production:

- expert-reviewed Cameroon IRPP formulas;
- allowance, benefit, leave, overtime, YTD, and correction scenarios where production support is claimed;
- source evidence hashes for every statutory formula;
- legal-owner approval evidence bound to executable fixture hashes;
- regulator-confirmed or expert-reviewed golden outputs for each production family.

## Landing Recommendation

This step is ready as a provenance verification and blocker report. Do not change statutory formulas until the required expert-reviewed country-pack evidence exists.

Recommended next step: run `aqstoqflow-hris-payroll-13-payments-declarations-proof` to verify that payments and declarations consume only posted, proof-backed payroll outputs and keep authority/provider integrations fail-closed where production evidence is missing.
