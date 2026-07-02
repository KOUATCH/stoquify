# AqStoqFlow HR/Payroll Declaration Country-Pack Register Proof Continuity Report

Generated: 2026-07-01

## Decision

Status: PASS for this execution slice.

This slice closes the declaration-side proof continuity gap between statutory country-pack review evidence, posted payroll register truth, declaration preparation, declaration workbench readiness, and declaration evidence recording.

This is not a full-production HR/payroll go-live decision. The broader roadmap still requires authority adapter production mappings, close/data-trust consumption, operator proof drawers, pilot reconciliation, and final release gates.

## Implemented Scope

- Declaration preparation now requires matched country-pack register proof before statutory declarations can be prepared.
- Posted payroll run lines are checked for country-pack provenance hashes and compared against statutory scenario coverage metadata.
- Prepared declaration payloads, declaration metadata, business events, and audit records now carry country-pack register proof metadata.
- Declaration workbench rows now expose redacted country-pack proof fields for operator review.
- Declaration workbench blockers now flag missing or non-matched country-pack register proof.
- Declaration evidence recording now propagates proof metadata into sensitive action metadata, evidence metadata, business events, and audit records.
- Tests now cover positive proof propagation, redacted proof display, lifecycle evidence propagation, and declaration preparation blocking when proof is missing.

## Proof Contract

Required declaration proof fields:

- `countryPackRegisterProofHash`
- `countryPackRegisterProofStatus`
- `countryPackRegisterProofLineCount`
- `countryPackRegisterProofMatchedLineCount`
- `countryPackRegisterProofMissingLineCount`
- `countryPackRegisterProofMismatchedLineCount`
- `countryPackLineProofHashes`
- `statutoryScenarioCoverageHash`
- `countryPackReviewEvidenceSourceHashes`
- `countryPackLegalRefs`

Blocking rule:

- Declarations cannot be prepared unless posted run-line country-pack provenance exists and the computed register proof status is `MATCHED`.

Workbench blocker:

- `PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_MISSING`

## Files Changed

- `services/payroll/payroll-control.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

## Validation Evidence

- `npx jest services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand`
  - PASS: 1 suite, 11 tests
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - PASS: 1 suite, 25 tests
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts --runInBand`
  - PASS: 4 suites, 52 tests
- `npx jest services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-payslip-self-service.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-statutory-scenario-coverage.service.test.ts services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts services/payroll/__tests__/payroll-country-pack-review-intake.service.test.ts services/payroll/__tests__/payroll-country-pack-review-intake-persistence.service.test.ts services/payroll/__tests__/payroll-final-release-readiness.service.test.ts --runInBand`
  - PASS: 10 suites, 96 tests
- `npm run regulatory:hardcode:fail`
  - PASS: active findings 0
- `npm run prisma:validate`
  - PASS: Prisma schema valid
- `npm run service:boundary:fail`
  - PASS: active service-boundary violations 0
- `npm run typecheck`
  - PASS
- `npm run policy:gates`
  - PASS: inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates all reported zero active blockers.

## Remaining Roadmap Work

Next execution priority:

1. Feed this proof chain into close/data-trust readiness so missing declaration country-pack proof blocks close certification.
2. Add operator proof drawers and denied states for declaration routes using only service-backed proof fields.
3. Complete authority adapter payload/response mappings, amendment flows, receipts, retries, idempotency, and provider rejection handling.
4. Run tenant-by-tenant pilot payroll reconciliation tying country-pack proof, register totals, declarations, payments, and accounting postings.
5. Re-run Prompt 19/21 assurance and final readiness gates before unrestricted rollout.
