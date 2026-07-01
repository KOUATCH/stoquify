# AqStoqFlow HR/Payroll Wave 1 Adapter Operations Read Model Report - 2026-06-29

## Decision

CONTROLLED PILOT SCOPE ADVANCED. This slice adds a service-owned payroll adapter operations read model and wires its summary into the payroll command read model. Operators can now see provider health, authority adapter dead-letter status, certification harness gaps, and payment adapter proof gaps without reading raw provider payloads, salary details, employee identities, credentials, or authority payloads.

This does not complete unrestricted HR/payroll production readiness. It reduces the operational blind spot around authority/provider automation and gives the command center a truthful blocker signal for pilot and release triage.

## Implemented

- Added `services/payroll/adapter-operations-read-model.service.ts`.
- Added `services/payroll/__tests__/adapter-operations-read-model.service.test.ts`.
- Extended `services/payroll/command-read-model.service.ts` with `adapterOperations` summary, blockers, readiness, next action, and source-service evidence.
- Updated `services/payroll/__tests__/payroll-command-read-model.service.test.ts` for adapter operations command-center integration.
- Updated `docs/operations/runbooks/hr-payroll-operations.md` with adapter operations command triage steps and stop conditions.

## Operational Signals Added

The new read model reports:

- provider account readiness and blocker state;
- stale statement evidence;
- lagging provider callbacks;
- failed or dead-letter reconciliation inbox items;
- replay, tamper, and invalid-signature provider events;
- open payment exceptions and duplicate/replay risk;
- latest reconciliation run status per provider;
- authority adapter execution status, retries, dead letters, attempts, redacted error codes, and certification harness hash gaps;
- payment adapter proof gaps, provider certification harness gaps, and linked payment exceptions;
- hash-only incident digest for provider events, inbox rows, and payment exceptions.

## Command Center Integration

`getPayrollCommandReadModel` now:

- calls the adapter operations read model through the service boundary;
- adds critical blockers for provider operations and authority dead letters;
- adds high-severity blockers for authority/payment adapter certification gaps;
- adds `review-payroll-adapter-operations` as a command-center next action;
- exposes a redacted `adapterOperations` section with summary, provider cards, authority execution cards, payment adapter gaps, and redaction policy.

## Safety Properties

- Every query is tenant-scoped by `organizationId`.
- Access requires payroll command/payment/declaration/reconciliation permissions and respects module entitlement denial.
- No raw provider payload, credential secret, salary detail, employee identity, external account value, or payment destination is returned.
- Provider incidents expose payload hashes and redacted error presence only.
- Command read model surfaces operator action without letting UI own provider or payroll truth.

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/adapter-operations-read-model.service.test.ts --runInBand`
  - 1 suite passed, 3 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts --runInBand`
  - 2 suites passed, 6 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/payroll/__tests__/payroll-command-read-model.service.test.ts services/payroll/__tests__/payroll-adapter-certification-harness.service.test.ts services/payroll/__tests__/payroll-adapter-registry.service.test.ts --runInBand`
  - 4 suites passed, 19 tests passed.
- `npm run typecheck`
  - Passed.
- `npm run prisma:validate`
  - Passed.
- `npm run lint`
  - Passed with 5 existing unrelated warnings.
- `npm run policy:gates`
  - Passed.

## Remaining Production Blockers

- Add visible UI cards to `/dashboard/payroll/payments`, `/dashboard/payroll/declarations`, and Cash Command using this read model.
- Add scheduled provider health checks and alert routing for stale statements, callback lag, failed inbox rows, and dead letters.
- Add reconciliation run dedupe and concurrency guards for provider replay flows.
- Add live provider/authority adapter implementations and reviewed payload/response samples.
- Complete a controlled pilot payroll cycle that reconciles register, declarations, payments, ledger, close, provider evidence, and data-trust signoff.

## Next Recommended Slice

Build the operator UI cards and action drawers for adapter operations using this read model, then add provider replay/dedupe/concurrency guards around reconciliation runs and provider inbox processing.