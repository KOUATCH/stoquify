# AqStoqFlow Compliance Center Action Entitlement Report

Generated: 2026-08-01

Selected skill: `008-aqstoqflow-compliance-center`

## Scope

Implemented a narrow compliance-center module enforcement pass for authority-facing compliance actions. This pass keeps legal, statutory, country-pack, live authority submission, and production certification behavior fail-closed unless the existing evidence and expert-approval gates pass.

## Files changed

- `actions/compliance/compliance-center.actions.ts`
- `actions/compliance/country-adapter-pilot.actions.ts`
- `actions/compliance/__tests__/compliance-center.actions.test.ts`
- `actions/compliance/__tests__/country-adapter-pilot.actions.test.ts`
- `what-next/module-surface-inventory.md`
- `what-next/module-surface-inventory.json`
- `what-next/country-adapter-pilot-readiness.md`
- `what-next/country-adapter-pilot-readiness.json`
- `what-next/statutory-country-pack-development-readiness.md`
- `what-next/statutory-country-pack-development-readiness.json`
- `what-next/statutory-country-pack-integration-readiness.md`
- `what-next/statutory-country-pack-integration-readiness.json`

## Enforcement added

- Added enforced `compliance` module checks to `getComplianceCenterKernelSnapshotAction` and `resolveEInvoicingMetadataAction` with read intent.
- Added enforced `compliance` module checks to `createFiscalDocumentFromPostedSourceAction` and `enqueueComplianceSubmissionAction` with write intent.
- Added enforced `compliance` module checks to country adapter pilot configure, credential rotation, review, and disable actions with write intent.
- Preserved the existing RBAC, fresh-auth, tenant context, and audit behavior around all touched compliance actions.

## Tests added or updated

- Added focused compliance-center action coverage for direct module denial, read/write intent, service-call prevention on denial, normalized country/date inputs, actor/org derivation, and revalidation on successful writes.
- Added country adapter pilot action coverage for compliance module denial and module gate assertions across configure, rotate, review, and disable flows.

## Verification results

- `npm test -- actions/compliance/__tests__/compliance-center.actions.test.ts actions/compliance/__tests__/country-adapter-pilot.actions.test.ts services/compliance/__tests__/fiscal-document.service.test.ts services/compliance/__tests__/fiscal-sequence.service.test.ts services/compliance/__tests__/certification-outbox-processing.test.ts services/compliance/__tests__/compliance-center.service.test.ts services/compliance/__tests__/country-adapter-pilot.service.test.ts scripts/__tests__/compliance-fiscal-evidence-immutability-migration.test.js --runInBand`
  - Passed: 8 suites, 38 tests.
- `npm run country:adapter:pilot:gate`
  - Passed for development sandbox readiness: 14/14 checks ready, 0 development blockers.
  - Production authority certified: no.
- `npm run regulatory:boundary:fail`
  - Passed: regulatory import boundary ready.
- `npm run regulatory:hardcode:fail`
  - Passed: active findings 0.
- `npm run statutory:country-pack:integration:gate`
  - Passed: `READY_FOR_CORE_INTEGRATION`.
- `npm run module:surface:inventory`
  - Passed: report-only inventory refreshed with 386 records.
- `git diff --check -- actions/compliance/compliance-center.actions.ts actions/compliance/country-adapter-pilot.actions.ts actions/compliance/__tests__/compliance-center.actions.test.ts actions/compliance/__tests__/country-adapter-pilot.actions.test.ts what-next/module-surface-inventory.md what-next/module-surface-inventory.json what-next/statutory-country-pack-development-readiness.md what-next/statutory-country-pack-development-readiness.json what-next/statutory-country-pack-integration-readiness.md what-next/statutory-country-pack-integration-readiness.json what-next/country-adapter-pilot-readiness.md what-next/country-adapter-pilot-readiness.json`
  - Passed: no whitespace errors.

## Expected blockers

- `npm run statutory:country-pack:dev:gate`
  - Blocked: `legal_and_approval_non_claims_preserved`.
  - Production gate remains blocked by `source_artifact_expert_approval`.
- `npm run module:surface:fail`
  - Blocked: module surface ratchet found 1 new gap.
  - Refreshed report-only inventory shows the most direct unmapped enforcement candidate as `actions/agents/agent-release-control.actions.ts`.

## Safety notes

- This pass does not certify statutory interpretations, live fiscal authority submissions, live declarations, production payroll, or country-pack production use.
- The country adapter remains internally development-ready only; production certification blockers remain explicit.
- Module entitlement remains report-only globally outside the narrow compliance action checks added in this pass.
- No unrelated workflows were intentionally changed.

## Next recommended numbered skill

`009-aqstoqflow-payment-reconciliation-moat`
