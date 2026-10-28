# Stoquify Slice 435 Release Evidence Report

Date: 2026-08-08
Slice: Customer Settlement And Allocation Source Foundation
Lifecycle state: implementation certified; repository integration and production release not certified

## Changed Boundary

- `prisma/schema.prisma`
- `prisma/migrations/20260808120000_customer_settlement_allocation_foundation/migration.sql`
- `services/accounting/customer-settlement.schemas.ts`
- `services/accounting/customer-settlement.service.ts`
- `services/accounting/__tests__/customer-settlement.service.test.ts`
- `services/accounting/default-posting-rules.ts`
- `services/controls/sensitive-action.service.ts`
- `lib/security/rbac-permissions.ts`
- `lib/security/__tests__/customer-settlement-security.test.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust Markdown and JSON evidence
- Phase 5 referral reports and status register

## Evidence Matrix

| Control | Evidence | Result |
| --- | --- | --- |
| Dedicated source aggregate | Prisma schema, migration, direct service scan | pass |
| Legacy POS payment remains separate | gate exclusion and direct authority scan | pass |
| Exact allocation conservation | command tests and gate mutation | pass |
| Tenant/customer sales-order scope | service tests and gate mutation | pass |
| Open-balance limit | ledger aggregation tests and gate mutation | pass |
| Balance mutation uses Slice 434 kernel | service mock assertions and gate mutation | pass |
| Allocation has one required ledger link | non-null unique schema/migration FK and tests | pass |
| Replay revalidates linked ledger evidence | exact/missing/mismatched replay tests | pass |
| Idempotency and serialization | replay, conflict, `P2034`, and `P2002` tests | pass |
| Critical authorization and fresh auth | RBAC/sensitive-action tests | pass |
| Accounting fails closed | posting-rule service tests | pass |
| Audit, event, outbox, and close invalidation | transaction assertions and gate markers | pass |
| Regression boundary remains green | 13 suites / 343 tests | pass |
| Static verification | Prisma, typecheck, lint, syntax, diff check | pass |
| Live readiness | report trust 29/29, zero blockers | pass |

## Commands Verified

```text
npx jest services/accounting/__tests__/customer-settlement.service.test.ts lib/security/__tests__/customer-settlement-security.test.ts --runInBand
npx jest scripts/__tests__/report-trust-export-gate.test.js --runInBand
npx jest <13 affected-boundary suites> --runInBand
npm run report:trust:export:gate
./node_modules/.bin/prisma.cmd format --schema prisma/schema.prisma
./node_modules/.bin/prisma.cmd generate --no-engine
./node_modules/.bin/prisma.cmd validate --schema prisma/schema.prisma
npm run typecheck
npx eslint <Slice 435 TypeScript and JavaScript files>
node --check scripts/report-trust-export-gate.js
git diff --check -- <Slice 435 files>
```

## Release Decision

Current-worktree implementation: GO.

Repository integration and production deployment: NO-GO pending ownership review, migration-history repair/certification, PostgreSQL migration and concurrency verification, and the normal release process.

Statement generation: NO-GO. A compensating settlement reversal command and the remaining invoice/statement truth audit are required first.
