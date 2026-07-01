# AqStoqFlow HR/Payroll Wave 1 Provider Inbox Settlement Worker Report

Date: 2026-06-30
Decision: production-readiness hardening advanced, but unrestricted HR/payroll rollout remains not approved until live provider/authority integrations, pilot-cycle reconciliation, authenticated browser smoke, and accounting/security/operations signoff are complete.

## Scope Completed

This wave connected leased provider inbox processing to the payroll provider settlement bridge. The system now has a service-owned worker path that only completes a provider inbox item after payroll settlement evidence or exception evidence has been recorded, and schedules retries when the provider outcome is retryable or bridge validation fails before proof is recorded.

Implemented changes:

- Added `services/payroll/payroll-provider-inbox-settlement-worker.service.ts`:
  - validates the inbox item exists, is `PROCESSING`, and is guarded by the expected `leasedBy` + `leaseToken`;
  - accepts only `PROVIDER_EVENT` and `STATEMENT_FILE` inbox sources for payroll settlement processing;
  - calls `recordPayrollProviderMatchedSettlement` with tenant-scoped payroll batch, match, actor, fresh-auth, and source-register context;
  - completes the inbox item only after settlement evidence is recorded (`SETTLED` / `PARTIALLY_SETTLED`);
  - completes the inbox item after exception evidence is recorded for reversal or terminal-failure outcomes;
  - fails/schedules retry for provider retryable outcomes without settlement mutation;
  - fails/schedules retry with safe error codes when bridge validation rejects before proof is recorded;
  - rejects stale leases and non-provider inbox sources before invoking the bridge or mutating inbox state.
- Added `services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts`:
  - settlement evidence completion path;
  - reversal exception completion path;
  - retryable provider outcome fail path;
  - bridge validation failure fail path;
  - stale lease rejection;
  - non-provider inbox source rejection.

## Files Changed

- `services/payroll/payroll-provider-inbox-settlement-worker.service.ts`
- `services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`

Related untracked roadmap files from prior waves remain part of the active worktree context:

- `services/payroll/payroll-payment-provider-fixture-runner.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- their focused tests and reports.

## Verification Evidence

Passed:

- `npm test -- --runTestsByPath services/payroll/__tests__/payroll-provider-inbox-settlement-worker.service.test.ts services/payroll/__tests__/payroll-provider-settlement-bridge.service.test.ts services/payroll/__tests__/payroll-payment-provider-fixture-runner.service.test.ts services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts --runInBand`
  - 5 suites passed
  - 35 tests passed
- `npm run typecheck`
- `npm run lint`
  - passed with 4 existing warnings outside this payroll slice
- `npm run service:boundary:fail`
- `npm run regulatory:hardcode:fail`
- `npm run policy:gates`

Policy gate highlights:

- Inventory boundary active violations: 0
- Service boundary active violations: 0
- Workflow assurance blockers: 0
- Payroll immutability blockers: 0
- Payroll immutability forbidden mutation checks blocked: 14/14
- Hard-delete active unsafe findings: 0
- Regulatory hardcode active findings: 0
- Demo/report trust active findings: 0
- Raw error boundary active unsafe findings: 0

## Why This Matters

Before this wave, the provider settlement bridge could convert approved provider evidence into payroll settlement or exception evidence, but the generic provider inbox worker did not know when it was safe to mark provider inbox work complete. This worker closes that operational gap.

The new workflow makes these production claims more true:

1. Provider inbox items are not completed before payroll settlement or exception evidence exists.
2. Retryable provider outcomes do not double-settle or double-post; they return to the inbox retry path.
3. Bridge validation failures before proof is recorded are fail/retry outcomes, not silent completions.
4. Stale lease tokens cannot process or complete provider inbox work.
5. Non-provider inbox sources cannot be routed through payroll settlement by mistake.

## Remaining Blockers

Full production remains blocked by:

1. Real provider adapters with credential handling, signing, transport, settlement receipts, reversals, retries, and dead-letter operation.
2. Real authority adapters with declaration payload/response mappings, payment-due receipts, rejections, amendments, and authority reconciliation.
3. Expanded regulator/expert-reviewed country packs and golden fixtures for every claimed jurisdiction/component.
4. Full controlled pilot payroll cycle reconciled through HR master data, payroll register, declarations, payments, ledger postings, close assurance, employee/operator self-service, and BI facts.
5. Authenticated browser smoke and proof-drawer validation for the final payroll route surface.
6. Accounting, security, and operations signoff after reviewing the pilot evidence pack.

## Recommended Next Slice

Expose this provider inbox settlement worker state in the adapter operations read model and payroll command-center proof drawers:

- show leased provider inbox items awaiting payroll settlement bridge processing;
- show last retry/dead-letter reason without leaking raw payloads;
- surface settlement evidence, exception evidence, and stale lease risks;
- add operator route smoke for the proof drawer states.
