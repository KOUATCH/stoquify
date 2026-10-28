# AqStoqFlow HR/Payroll Wave 1 Adapter Chaos Proof Persistence Report

Date: 2026-06-30
Status: IMPLEMENTED AND VERIFIED

## Decision

Adapter chaos readiness is now not just surfaced as an operations blocker. It is a real certified proof hash that must be present before production-grade automated declaration filing or payment-provider automation can be evidenced, released, bridged, or settled.

This closes the product-truth gap where a read-model blocker could identify missing adapter chaos proof, but live authority/payment workflows did not yet require or propagate that proof.

## Scope Completed

- Created a redacted adapter chaos release-gate certificate with a stable `adapterChaosReleaseGateHash`.
- Required `adapterChaosReleaseGateHash` for certified production declaration adapter evidence.
- Propagated the hash through declaration evidence metadata, latest declaration metadata, business events, outbox payloads, and audit trails.
- Required the hash before certified production authority adapter queue execution can be created.
- Required the hash before certified production payment-provider automation can be released.
- Propagated the hash into payment adapter proof metadata, payment ledger/audit metadata, provider settlement bridge submit payloads, and payment settlement proof extraction.
- Extended provider fixture summaries so callback evidence keeps the chaos gate proof redacted and traceable.
- Added focused regression tests for missing chaos proof failures and successful proof propagation.

## Touched Runtime Surfaces

- `services/payroll/payroll-adapter-chaos-release-gate.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-payment-provider-fixture-runner.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/payment-reconciliation.service.ts`

## Verification

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-chaos-release-gate.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/authority-adapter-execution.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts --runInBand`
  - Result: 8 suites passed, 58 tests passed.
- `npm run typecheck`
  - Result: passed.
- `npm run lint`
  - Result: passed with 4 pre-existing warnings outside this payroll slice.
- `npm run policy:gates`
  - Result: passed.
- `git diff --check -- <touched payroll files>`
  - Result: passed.
- `rg -n "[ \t]+$" <touched payroll files>`
  - Result: no trailing whitespace matches.

## Residual Production Note

This slice hardens proof propagation and release blocking. Full production readiness still requires the broader final readiness blockers to stay closed across a controlled pilot cycle, including statutory breadth, authority/payment adapter credentials, migration/backfill signoff, operational runbooks, tenant isolation, and close/accounting signoff.

## Recommended Next Slice

Use this persisted `adapterChaosReleaseGateHash` as the required handoff artifact in the production migration/backfill dry run and final release gate pack, so every tenant pilot cycle can prove:

- certified adapter chaos gate passed,
- declaration filing evidence references the same gate hash,
- payment release evidence references the same gate hash,
- provider settlement evidence references the same gate hash,
- accounting close/data-trust blockers clear only when all four match.
