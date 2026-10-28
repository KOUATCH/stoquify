# AqStoqFlow HR/Payroll Phase 5 Authority And Payment Adapter Proof Report

Date: 2026-06-27
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Roadmap anchor: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
Status: Phase 5 proof-hardening slice complete for manual evidence-gated declarations and payment release.
Production decision: Still not ready for unrestricted automated filing or automated provider disbursement. Ready as additional controlled-pilot evidence for manual authority/provider workflows.

## Purpose

This slice hardens the authority declaration and payment-provider adapter boundary without pretending that live regulator or bank/mobile-money automation exists. It makes declaration and payment evidence carry explicit adapter proof, blocks unsafe non-manual authority claims, and ensures payroll payment release cannot advance for bank/mobile-money flows without disbursement-file proof.

The slice preserves the roadmap spine:

`HR source data -> contracts/compensation/attendance -> payroll run -> immutable payroll register -> payslips, ledger, payments, declarations -> close assurance/data trust -> finance/BI/cash planning`

## Implementation Summary

### Authority declaration evidence

Implemented in `services/payroll/declaration-lifecycle.service.ts`.

- Added authority adapter readiness fields to declaration evidence input: adapter key, readiness, payload mapping hash, response mapping hash, credential proof hash, adapter request hash, adapter response receipt hash, adapter idempotency key, and adapter attempt.
- Added `AQSTOQFLOW_PAYROLL_DECLARATION_AUTHORITY_ADAPTER_PROOF` metadata generation for manual authority evidence.
- Kept production automation blocked unless a reviewed non-manual adapter path exists.
- Blocked non-manual authority environments with the explicit message that reviewed authority adapter proof is required.
- Required declaration lifecycle evidence to carry the source payroll register hash.
- Propagated authority adapter proof hash, key, readiness, and automation status through declaration evidence, declaration metadata, business event payloads, outbox metadata, close invalidation context, and audit after-state.

Key anchors:

- `authorityAdapterProofForEvidence`: `services/payroll/declaration-lifecycle.service.ts:283`
- non-manual adapter block: `services/payroll/declaration-lifecycle.service.ts:300`
- authority proof kind: `services/payroll/declaration-lifecycle.service.ts:305`
- source register proof requirement: `services/payroll/declaration-lifecycle.service.ts:350`

### Payment provider evidence

Implemented in `services/payroll/payroll-control.service.ts`.

- Added `AQSTOQFLOW_PAYROLL_PAYMENT_PROVIDER_ADAPTER_PROOF` metadata generation for payroll payment release.
- Required `bankFileHash` for bank-transfer and mobile-money release before provider settlement can be queued.
- Defaulted provider status to `MANUAL_PROVIDER_SETTLEMENT_REQUIRED` and `productionPaymentAutomationSupported: false`.
- Captured provider adapter key, disbursement-file hash, credential proof hash, payload mapping hash, settlement receipt hash, provider settlement requirement, and adapter proof hash.
- Propagated payment adapter proof through fresh-auth sensitive action metadata, payment batch metadata, allocation metadata, journal line metadata, ledger audit metadata, business event payload/metadata, outbox payloads, payment transaction metadata, and payment exception evidence.
- Kept payment release idempotency aware of bank-file/document proof so replay cannot silently ignore payment evidence differences.

Key anchors:

- payment adapter proof generator: `services/payroll/payroll-control.service.ts:384`
- disbursement-file blocker: `services/payroll/payroll-control.service.ts:411`
- payment proof kind: `services/payroll/payroll-control.service.ts:416`
- payment release proof construction: `services/payroll/payroll-control.service.ts:3538`

### Tests

Updated focused tests in:

- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/payroll/__tests__/payroll-completion.service.test.ts`

Coverage added or strengthened:

- declaration evidence carries register proof and authority adapter proof;
- non-manual authority evidence is blocked until reviewed authority adapter proof exists;
- declaration evidence without source register proof is blocked;
- bank/mobile-money release requires disbursement-file evidence;
- payment adapter proof reaches batch metadata, allocation metadata, journal metadata, payment transaction metadata, business events, outbox payloads, and released batch updates;
- payment release still blocks when posted run component proof is missing.

## Verification Evidence

Passed after final formatting:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand
```

Result: 2 suites passed, 11 tests passed. Jest emitted an open-handle warning after the pass; no test failed.

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
```

Result: 5 suites passed, 33 tests passed.

```powershell
npm run regulatory:hardcode:fail
```

Result: pass. Active findings: 0. No production regulatory hardcodes detected.

```powershell
npm run typecheck
```

Result: pass. `tsc --noEmit --pretty false` completed successfully.

## What This Closes

- Declaration/payment evidence no longer looks like generic manual notes; it carries explicit adapter-readiness proof.
- Bank/mobile-money payment release cannot proceed without disbursement-file proof.
- Non-manual authority submission cannot be represented as production-ready automation before reviewed adapter evidence exists.
- Payment proof is visible across accounting, payment reconciliation, business event, and audit surfaces.
- The controlled-pilot evidence chain is stronger for payroll-to-declaration and payroll-to-payment operations.

## What Remains Blocked

This slice does not close the full production blockers by itself.

- No live authority filing adapters were implemented.
- No live bank/mobile-money provider disbursement adapters were implemented.
- No credentials vault integration or provider credential rotation was added.
- No authority response parser, rejection lifecycle, amendment lifecycle, or receipt ingestion adapter was added.
- No provider settlement webhook/import adapter was added.
- No operator proof drawers were added for `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, or `/dashboard/payroll/declarations`.
- No migration/backfill exists for older declaration/payment evidence that lacks adapter proof metadata.
- No authenticated browser visual proof was produced for the new proof surfaces.

## Next Execution Slice

Recommended next slice: adapter registry and lifecycle contracts before UI expansion.

Build:

- authority adapter registry with reviewed payload and response mapping records;
- provider adapter registry with payment method, settlement proof contract, credential proof, retry/idempotency policy, and operational status;
- rejection, amendment, and receipt lifecycle for declarations;
- provider settlement proof ingestion path for bank/mobile-money proof;
- data-trust blockers for missing authority/provider adapter proof on post-pilot payroll facts;
- service-owned read models that expose proof status to future operator routes.

Do not build dashboards first. Operator routes should consume these service-owned proof states only after the adapter registry and lifecycle contracts exist.
