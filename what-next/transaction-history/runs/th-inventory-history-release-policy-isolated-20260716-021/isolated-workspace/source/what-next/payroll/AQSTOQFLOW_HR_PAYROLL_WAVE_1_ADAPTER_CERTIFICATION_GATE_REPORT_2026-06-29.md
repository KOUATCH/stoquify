# AqStoqFlow HR/Payroll Wave 1 Adapter Certification Gate Report - 2026-06-29

## Decision

Status: controlled-scope production-readiness hardening verified.

This slice advances the authority/payment adapter blocker without pretending live government or provider integrations are complete. The system can now represent certified production adapter evidence only when complete reviewed proof exists; incomplete production claims fail closed with explicit blocker codes.

## Implemented Scope

- Hardened payroll authority adapter contracts with certification requirements for reviewed payload mapping, reviewed response mapping, credential proof, adapter request hash, authority response/receipt hash, and adapter idempotency key.
- Added authority certification blocker codes and proof-complete flags to the authority adapter contract and declaration evidence metadata.
- Changed declaration lifecycle gating so non-manual authority evidence remains blocked unless the adapter is `SUPPORTED_CERTIFIED` and all required proof is present.
- Preserved manual evidence behavior while allowing a complete certified production adapter evidence path to produce `PRODUCTION_ADAPTER_READY`.
- Hardened payroll payment provider adapter contracts with provider credential proof, payload mapping, response/settlement mapping, request hash, response hash, settlement receipt hash, idempotency key, and retry policy evidence.
- Extended payment release proof metadata to carry provider response mapping, request/response hashes, provider idempotency key, provider attempt count, registry decision, certification blockers, and proof-complete state.
- Added focused tests proving both successful certified adapter paths and fail-closed incomplete certification claims.

## Primary Files

- `services/payroll/payroll-adapter-registry.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`

## Certification Gates Added

Authority adapter production evidence requires all of:

- `AUTHORITY_PAYLOAD_MAPPING_REVIEWED`
- `AUTHORITY_RESPONSE_MAPPING_REVIEWED`
- `AUTHORITY_CREDENTIAL_PROOF_PRESENT`
- `AUTHORITY_REQUEST_HASH_PRESENT`
- `AUTHORITY_RESPONSE_RECEIPT_PRESENT`
- `AUTHORITY_IDEMPOTENCY_KEY_PRESENT`

Payment provider adapter production evidence requires all of:

- `PAYMENT_DISBURSEMENT_FILE_PRESENT` when file-backed disbursement applies
- `PROVIDER_CREDENTIAL_PROOF_PRESENT`
- `PROVIDER_PAYLOAD_MAPPING_REVIEWED`
- `PROVIDER_RESPONSE_MAPPING_REVIEWED`
- `PROVIDER_REQUEST_HASH_PRESENT`
- `PROVIDER_RESPONSE_HASH_PRESENT`
- `PROVIDER_SETTLEMENT_RECEIPT_PRESENT`
- `PROVIDER_IDEMPOTENCY_KEY_PRESENT`

## Verification Passed

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts --runInBand` - 2 suites, 18 tests passed.
- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand` - 2 suites, 12 tests passed.
- `npm run typecheck` - passed.
- `npm run prisma:validate` - passed.
- `npm run lint` - passed with 5 existing warnings outside this slice.
- `npm run policy:gates` - passed, including payroll immutability runtime checks.

## Production Readiness Impact

Closed one important sub-gap: AqStoqFlow no longer has a binary manual-only adapter registry. It now has a fail-closed certification gate that can distinguish manual evidence, incomplete production claims, and complete certified adapter evidence.

Still not full production-ready: this does not implement actual external authority/provider clients, credential vaulting, network retries, signed live submissions, or real provider settlement APIs. Those remain required before claiming fully automated filing or payment automation.

## Next Roadmap Move

Build the execution/outbox layer for certified adapters:

1. Add payroll authority submission attempt creation from certified declaration evidence.
2. Persist retry state, lease state, correlation id, request hash, response hash, authority reference, rejection reason, and receipt evidence.
3. Add provider payment automation attempt records or reuse existing payment transaction/reconciliation primitives with a payroll-specific adapter execution contract.
4. Keep all live automation disabled unless adapter config, credential proof, country-pack provenance, idempotency, and sandbox/live evidence are present.