# Stoquify Slice 434 Release Evidence Report

Date: 2026-08-08
Slice: Customer Ledger Service-Owned Balance Integrity Kernel
Lifecycle state: implementation certified; repository integration and production release not certified

## Changed Boundary

- `services/accounting/customer-ledger.service.ts`
- `services/accounting/__tests__/customer-ledger.service.test.ts`
- `services/pos/pos.service.ts`
- `services/pos/__tests__/pos.service.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust Markdown and JSON evidence
- Phase 5 referral reports and status register

## Evidence Matrix

| Control | Evidence | Result |
| --- | --- | --- |
| Caller cannot supply running balance | input contract and release-gate mutation | pass |
| Tenant customer owns starting balance | scoped `findFirst` and focused service test | pass |
| Movement polarity is explicit | debit/credit type sets and mutation | pass |
| Negative balance is rejected | service test and gate mutation | pass |
| Credit limit is service owned | service/POS tests and gate mutation | pass |
| Concurrent writer loses safely | scoped `updateMany`, exact count check, conflict test | pass |
| Ledger append follows balance claim | implementation ordering and gate marker | pass |
| POS sale caller is migrated | on-account integration test | pass |
| POS void caller is migrated | credit-void integration test | pass |
| Regression boundary remains green | 6 suites / 273 tests | pass |
| Static verification | typecheck, lint, syntax, diff check | pass |
| Live readiness | report trust 28/28, zero blockers | pass |

## Commands Verified

```text
npm test -- --runInBand services/accounting/__tests__/customer-ledger.service.test.ts services/pos/__tests__/pos.service.test.ts
npm test -- --runInBand scripts/__tests__/report-trust-export-gate.test.js
npm test -- --runInBand services/accounting/__tests__/customer-ledger.service.test.ts services/pos/__tests__/pos.service.test.ts services/accounting/__tests__/ar-open-item.service.test.ts services/accounting/postings/post-sale.test.ts services/accounting/postings/post-payment.test.ts scripts/__tests__/report-trust-export-gate.test.js
npm run report:trust:export:gate
npm run typecheck
npx eslint services/accounting/customer-ledger.service.ts services/accounting/__tests__/customer-ledger.service.test.ts services/pos/pos.service.ts services/pos/__tests__/pos.service.test.ts scripts/report-trust-export-gate.js scripts/__tests__/report-trust-export-gate.test.js
node --check scripts/report-trust-export-gate.js
git diff --check -- <Slice 434 files>
```

## Release Decision

Current-worktree implementation: GO.

Repository integration and production deployment: NO-GO pending normal ownership review, integration, environment-backed concurrency verification, and release process.

Statement generation: NO-GO. Customer settlement and allocation truth remains a mandatory dependency.
