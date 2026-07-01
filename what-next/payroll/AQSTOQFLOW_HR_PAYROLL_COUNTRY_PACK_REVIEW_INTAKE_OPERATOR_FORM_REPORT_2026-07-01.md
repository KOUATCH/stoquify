# AqStoqFlow HR/Payroll Country-Pack Review Intake Operator Form Report - 2026-07-01

## Decision

Status: READY FOR CONTROLLED PILOT SCOPE.

This slice closes the missing operator workflow around the payroll country-pack review-intake evidence gate. It does not declare full HR/payroll production readiness. It makes the legal-owner country-pack review path usable from the payroll command center while preserving service-owned calculation/register truth and fresh-auth protected approvals.

## Implemented Scope

- Added a country-pack review intake panel to the payroll command center.
- Wired the panel to protected server actions for evaluation, certificate recording, and legal-owner approval.
- Preserved server-side country-pack validation and persistence as the source of truth.
- Added operator fields for proposed country-pack JSON, base pack version, country code, target statutory families, review-topic evidence, certificate hash, and approval evidence hash.
- Surfaced loading, success, validation error, and fresh-auth denial states.
- Kept statutory values out of the client; the UI captures evidence and payloads but does not calculate payroll or embed legal formulas.

## Files Touched

- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/__tests__/PayrollCommandCenter.test.tsx`
- Existing supporting actions/services from the prior slice remain in use:
  - `actions/payroll/payroll-country-pack-review-intake.actions.ts`
  - `services/payroll/payroll-country-pack-review-intake.service.ts`
  - `services/payroll/payroll-country-pack-review-intake-persistence.service.ts`
  - `services/payroll/payroll-final-release-readiness.service.ts`
  - `services/payroll/command-read-model.service.ts`

## Verification

Passed:

- `npx jest components/payroll/__tests__/PayrollCommandCenter.test.tsx actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand`
  - 3 suites, 13 tests.
- `npm run typecheck`
- `npx jest actions/payroll/__tests__/payroll-country-pack-review-intake.actions.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts components/payroll/__tests__/PayrollCommandCenter.test.tsx services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/regulatory/__tests__/country-pack.service.test.ts --runInBand`
  - 9 suites, 64 tests.
- `npm run regulatory:hardcode:fail`
- `npm run service:boundary:fail`
- `npm run prisma:validate`
- `npm run policy:gates`
- `node scripts/ui-route-smoke-gate.js --mode fail --base-url http://127.0.0.1:3003 --timeout-ms 180000 --require-screenshots --route payroll --storage-state playwright/.auth/payroll.json --screenshots-dir what-next/payroll/screenshots/payroll-country-pack-review-intake-form-command-center --out what-next/payroll/AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_FORM_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`

Browser smoke evidence:

- `what-next/payroll/AQSTOQFLOW_PAYROLL_COUNTRY_PACK_REVIEW_INTAKE_FORM_COMMAND_CENTER_UI_ROUTE_SMOKE_BROWSER.json`
- `what-next/payroll/screenshots/payroll-country-pack-review-intake-form-command-center/`

## Release Notes

This moves the first execution wave forward because statutory country-pack breadth and payroll-engine readiness now have a proof-backed operator intake route. The system still needs continued country-pack expansion, payroll calculation/register hardening, accounting tie-out breadth, authority/payment adapter completion, migration/backfill proof, and Prompt 19/21 final release gates before unrestricted full production rollout.