# AqStoqFlow HR/Payroll Wave 1 Adapter Chaos Backfill Continuity Report

Date: 2026-06-30
Status: IMPLEMENTED AND VERIFIED

## Decision

Production migration/backfill certificates now require adapter chaos release-gate continuity. A tenant proof-backfill execution certificate must carry `adapterChaosReleaseGateHash`, and the reconciliation certificate validates that source hash before it can reach `READY_FOR_CLOSE_RECHECK`.

This connects adapter chaos proof persistence to the production seed/backfill blocker in the final readiness report.

## Scope Completed

- Added `adapterChaosReleaseGateHash` to payroll proof-backfill execution certificate input/output.
- Treated a missing adapter chaos release-gate hash as a missing execution signoff artifact.
- Persisted the hash in proof-backfill execution audit payloads.
- Added source-certificate validation for missing or mismatched adapter chaos release-gate hash during proof-backfill reconciliation.
- Added source certificate fields:
  - `adapterChaosReleaseGateHash`
  - `adapterChaosReleaseGateHashMatches`
- Added `payroll-adapter-chaos-proof-continuity` to reconciliation release-gate requirements.
- Updated reconciliation reports to show the redacted source adapter chaos hash and match status.
- Added regression coverage for ready continuity and missing-hash close recheck blocking.

## Touched Runtime Surfaces

- `services/payroll/payroll-proof-backfill-executor.service.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand`
  - Result: 2 suites passed, 10 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/payroll-proof-backfill-executor.service.test.ts services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts --runInBand`
  - Result: 10 suites passed, 68 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 4 pre-existing warnings outside this payroll slice.
- `npm run policy:gates`
  - Result: passed.
- `rg -n "[ \t]+$" <proof-backfill touched files>`
  - Result: no trailing whitespace matches.

## Production Impact

The backfill handoff is now stricter:

- A dry-run execution certificate without adapter chaos proof remains signoff-incomplete.
- A persisted execution certificate missing the hash cannot clear reconciliation.
- A reconciliation run with a mismatched expected hash is blocked by source-certificate validation.
- Close recheck is only reachable when source certificate, dry-run evidence, data-trust proof gaps, setup readiness, and adapter chaos proof continuity all agree.

## Residual Production Note

This closes a proof-continuity gap. It does not enable production mutation mode. Production seed/backfill mutation remains unavailable until tenant-by-tenant migration execution, rollback/correction strategy, and signoff workflow are explicitly approved and tested.
