# AqStoqFlow HR/Payroll Wave 1 Provider Inbox Lease Token Hardening Report - 2026-06-30

## Decision

Status: implemented for the controlled-pilot, evidence-gated payroll adapter scope.

This slice hardens `PaymentReconciliationInboxItem` processing beyond timestamp-only leasing. Inbox workers now persist lease ownership, require the owning worker/token before completion or failure handling, clear lease ownership when work is completed/retried/dead-lettered, and fail closed when a payload summary contains unsafe provider or payroll-sensitive keys.

## Scope Implemented

- Added `leasedBy` and `leaseToken` to `PaymentReconciliationInboxItem`, with indexes for worker visibility and lookup.
- Updated the inbox worker to issue lease tokens, guard completion/failure by `leasedBy + leaseToken`, and preserve the existing `PROCESSING + nextAttemptAt` lease marker.
- Added fail-closed redaction handling: unsafe payload summary keys dead-letter the inbox row with `PAYLOAD_SUMMARY_REDACTION_REQUIRED`; worker output still excludes raw payloads, payload summaries, credentials, salary, employee identity, and payment destination detail.
- Fed outcomes back into adapter operations by exposing only `leasedBy` in the redacted inbox incident digest; lease tokens are not exposed through the read model.
- Fed outcomes into Workflow Assurance by flagging `PROCESSING` inbox rows missing `leasedBy` or `leaseToken` as aggregate redacted SLA warnings.
- Updated the HR/payroll operations runbook with the lease ownership requirement.

## Files Changed

- `prisma/schema.prisma`
- `prisma/migrations/20260630100000_payment_reconciliation_inbox_worker_leases/migration.sql`
- `services/payments/payment-reconciliation-inbox-worker.service.ts`
- `services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts`
- `services/payroll/adapter-operations-read-model.service.ts`
- `services/payroll/__tests__/adapter-operations-read-model.service.test.ts`
- `services/assurance/assurance-registry.service.ts`
- `services/assurance/assurance-registry-contracts.ts`
- `services/assurance/__tests__/assurance-registry.service.test.ts`
- `docs/operations/runbooks/hr-payroll-operations.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_WAVE_1_PROVIDER_INBOX_LEASE_TOKEN_HARDENING_REPORT_2026-06-30.md`

## Verification

Passed:

```powershell
npx prisma generate --no-engine
npm test -- --runTestsByPath services/payments/__tests__/payment-reconciliation-inbox-worker.service.test.ts services/payroll/__tests__/adapter-operations-read-model.service.test.ts services/assurance/__tests__/assurance-registry.service.test.ts --runInBand
npm run prisma:validate
npm run typecheck
npm run lint
```

Results:

- Focused Jest: 3 suites, 51 tests passed.
- Prisma schema validation: passed.
- Typecheck: passed.
- Lint: passed with 4 existing unrelated warnings in image usage/default export files.

Blocked or environment-limited:

```powershell
npm run prisma:generate
npm run policy:gates
```

- `npm run prisma:generate` hit the known Windows Prisma query-engine DLL rename lock; `npx prisma generate --no-engine` succeeded.
- `npm run policy:gates` passed `inventory:boundary:fail` and `service:boundary:fail`, then stopped at `workflow:assurance:runtime-check` because the local datasource URL is not a runnable `prisma://` or `prisma+postgres://` URL and runtime Workflow Assurance tables are not available in this shell.

## Residual Risks

- This does not certify live bank, mobile-money, or authority provider automation.
- A deployed database still needs the new migration applied before token-owned inbox leases can run outside local generated-client checks.
- Full policy gates should be rerun in an environment with a valid Workflow Assurance datasource and migrated runtime tables.

## Next Recommended Slice

Continue with statutory country-pack breadth and payroll engine hardening, or rerun the Workflow Assurance release gates in a valid runtime database after this migration is deployed.
