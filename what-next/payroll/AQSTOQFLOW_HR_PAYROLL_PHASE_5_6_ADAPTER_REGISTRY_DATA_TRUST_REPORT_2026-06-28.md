# AqStoqFlow HR/Payroll Phase 5/6 Adapter Registry And Data-Trust Report

Date: 2026-06-28
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Roadmap anchor: `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_FULL_PRODUCTION_ROADMAP_2026-06-27.md`
Selected skills: `aqstoqflow-payroll-declaration-compliance`, `aqstoqflow-payroll-payment-recon`
Executable slice: authority/payment adapter registry contracts, proof propagation, and close/data-trust blockers.
Status: complete for this slice. Full HR/payroll production roadmap remains active and incomplete.

## Decision

AqStoqFlow now has a service-owned payroll adapter registry contract layer for declaration authority workflows and payment-provider workflows. The implementation deliberately does not claim live authority filing or live provider disbursement automation. It records stable contract hashes and blocks close certification when payroll facts lack authority/provider adapter proof.

This moves the system closer to the roadmap standard:

`HR source data -> contracts/compensation/attendance -> payroll run -> immutable payroll register -> payslips, ledger, payments, declarations -> close assurance/data trust -> finance/BI/cash planning`

## What Changed

### Adapter Registry Service

Added `services/payroll/payroll-adapter-registry.service.ts`.

- Introduces `PAYROLL_ADAPTER_REGISTRY_VERSION`.
- Adds `resolvePayrollAuthorityAdapterContract` for authority declaration evidence.
- Adds `resolvePayrollPaymentProviderAdapterContract` for payroll payment provider evidence.
- Produces stable contract hashes:
  - `authorityAdapterContractHash`
  - `paymentProviderAdapterContractHash`
- Captures review/certification requirements without logging raw salary, employee identity, credentials, provider payloads, or authority payloads.
- Keeps manual workflows explicit:
  - authority manual workflows remain `AUTOMATION_BLOCKED` and `MANUAL_CAPTURE_ONLY`.
  - provider payments remain `MANUAL_PROVIDER_SETTLEMENT_REQUIRED` with `productionPaymentAutomationSupported: false`.

Key anchors:

- Authority registry resolver: `services/payroll/payroll-adapter-registry.service.ts:79`
- Authority contract kind: `services/payroll/payroll-adapter-registry.service.ts:112`
- Payment registry resolver: `services/payroll/payroll-adapter-registry.service.ts:149`
- Payment contract kind: `services/payroll/payroll-adapter-registry.service.ts:171`

### Declaration Evidence Propagation

Updated `services/payroll/declaration-lifecycle.service.ts`.

- Declaration lifecycle proof now resolves authority adapter contract metadata through the registry.
- Evidence payloads carry `authorityAdapterContractHash`, registry version, registry decision, and certification requirements.
- Declaration metadata now exposes both generic registry fields and latest aliases for future read models:
  - `latestAuthorityAdapterContractHash`
  - `latestAuthorityAdapterRegistryDecision`
- Business event payloads, event metadata, outbox payloads, sensitive-action metadata, and audit changes now carry adapter registry proof.

Key anchors:

- Registry import: `services/payroll/declaration-lifecycle.service.ts:32`
- Declaration proof registry resolution: `services/payroll/declaration-lifecycle.service.ts:277`
- Declaration contract hash in proof: `services/payroll/declaration-lifecycle.service.ts:305`
- Latest declaration contract alias: `services/payroll/declaration-lifecycle.service.ts:625`

### Payment Provider Proof Propagation

Updated `services/payroll/payroll-control.service.ts`.

- Payroll payment release now resolves provider adapter contracts through the registry.
- Payment proof carries `paymentProviderAdapterContractHash`, registry version, accepted settlement evidence, and provider retry policy metadata.
- Payment ledger journal lines and payment ledger audit events carry provider adapter contract proof.
- Existing bank/mobile-money disbursement-file proof gate remains enforced before provider settlement.

Key anchors:

- Payment registry import: `services/payroll/payroll-control.service.ts:61`
- Payment release registry resolution: `services/payroll/payroll-control.service.ts:386`
- Payment contract hash in proof: `services/payroll/payroll-control.service.ts:421`
- Journal line contract propagation: `services/payroll/payroll-control.service.ts:2117`
- Ledger audit contract propagation: `services/payroll/payroll-control.service.ts:2170`

### Data-Trust And Close Certification

Updated `services/accounting/data-trust.service.ts`.

- Adds close/data-trust blocker when close-impacting declaration evidence lacks authority adapter proof or authority adapter contract hash.
- Adds close/data-trust blocker when released/settled payroll payment batches lack provider adapter proof or provider adapter contract hash.
- Adds payroll module evidence facts:
  - `Declaration adapter proof gaps`
  - `Payment adapter proof gaps`
- Updates certificate evidence wording to include provider-adapter and authority-adapter proof scans.

Key anchors:

- Declaration adapter proof blocker: `services/accounting/data-trust.service.ts:1483`
- Payment provider adapter proof blocker: `services/accounting/data-trust.service.ts:1553`
- Declaration adapter proof fact: `services/accounting/data-trust.service.ts:1881`
- Payment adapter proof fact: `services/accounting/data-trust.service.ts:1902`
- Certificate evidence wording: `services/accounting/data-trust.service.ts:2023`

## Tests Added Or Strengthened

- Added `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`.
- Strengthened `services/payroll/__tests__/declaration-lifecycle.service.test.ts` to assert authority adapter contract hash propagation.
- Strengthened `services/payroll/__tests__/payroll-completion.service.test.ts` to assert provider adapter contract hash propagation.
- Strengthened `services/accounting/__tests__/data-trust.service.test.ts` to assert adapter-proof blockers and payroll module facts.

## Verification Evidence

Passed:

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-adapter-registry.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand
```

Result: 3 suites passed, 15 tests passed.

```powershell
npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand
```

Result: 1 suite passed, 10 tests passed.

```powershell
npm test -- --runTestsByPath services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/payroll-tenant-boundary.service.test.ts actions/payroll/__tests__/payroll-control.actions.test.ts --runInBand
```

Result: 5 suites passed, 33 tests passed.

```powershell
npm run typecheck
```

Result: pass. `tsc --noEmit --pretty false` completed successfully.

```powershell
npm run service:boundary:fail
```

Result: pass. Active service-boundary violations: 0.

```powershell
npm run regulatory:hardcode:fail
```

Result: pass. Active findings: 0.

```powershell
npm run policy:gates
```

Result: pass. Inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo/report trust, and raw-error boundary gates all passed.

## Files Changed

- `services/payroll/payroll-adapter-registry.service.ts`
- `services/payroll/__tests__/payroll-adapter-registry.service.test.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/__tests__/declaration-lifecycle.service.test.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-completion.service.test.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md` refreshed by `npm run policy:gates`
- `what-next/payroll/payroll-immutability-runtime-check.json` refreshed by `npm run policy:gates`

## What This Closes

- Authority/payment adapter proof is now anchored to explicit service-owned contracts, not loose metadata only.
- Declaration evidence and payment release proof now carry stable adapter contract hashes.
- Close/data-trust certification blocks when payroll declarations or payments lack adapter proof.
- Future operator routes can consume contract hashes and registry decisions without inventing client-side payroll truth.
- The system still fails closed on non-manual authority automation and manual provider settlement requirements.

## Still Blocked For Full Production

This does not complete full HR/payroll production readiness.

- No live authority submission adapter was implemented.
- No live bank/mobile-money provider disbursement adapter was implemented.
- No credential vault integration was added.
- No adapter inbox/outbox retry worker was added for delayed provider/authority responses.
- No authority rejection/amendment parser or receipt ingestion adapter was added.
- No provider settlement webhook/import adapter was added.
- No operator proof drawers were added for `/dashboard/payroll/runs`, `/dashboard/payroll/payments`, or `/dashboard/payroll/declarations`.
- No production migration/backfill exists for older payroll evidence lacking adapter contract hashes.

## Next Recommended Slice

Implement the declaration and provider lifecycle inbox/outbox contract before UI expansion:

1. Authority adapter submission queue model using business outbox or service-owned adapter inbox records.
2. Authority response mapping contract for accepted, rejected, amended, paid, and reconciled declaration states.
3. Provider settlement ingestion contract for provider events, statement files, approved matches, duplicate responses, and retry/idempotency proof.
4. Read-model fields that expose adapter registry decision, latest proof hash, contract hash, blocker reason, and next action to future payroll operator routes.
5. Focused tests proving no automated filing/payment claim can appear without certified mappings and sandbox evidence.

Do not build the runs/payments/declarations dashboards before these service-owned lifecycle contracts are stable.
