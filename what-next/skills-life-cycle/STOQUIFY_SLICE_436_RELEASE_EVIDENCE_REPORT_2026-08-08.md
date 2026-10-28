# Stoquify Slice 436 Release Evidence Report

Date: 2026-08-08
Slice: Customer Settlement Compensating Reversal Foundation
Lifecycle state: service-foundation implementation certified; authenticated execution, repository integration, and production release not certified

## Changed Boundary

- `prisma/schema.prisma`
- `prisma/migrations/20260808133000_customer_settlement_compensating_reversal_foundation/migration.sql`
- `services/accounting/customer-settlement.schemas.ts`
- `services/accounting/customer-settlement-reversal.service.ts`
- `services/accounting/customer-ledger.service.ts`
- `services/accounting/ar-open-item.service.ts`
- `services/accounting/posting.service.ts`
- `services/controls/sensitive-action.service.ts`
- `config/permissions.ts`
- `lib/security/rbac-permissions.ts`
- focused accounting and security tests
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated report-trust Markdown and JSON evidence
- Phase 5 referral reports and status register

## Evidence Matrix

| Control | Evidence | Result |
| --- | --- | --- |
| Compensating reversal vocabulary | Prisma enum, relations, migration | pass |
| Complete reversal aggregate invariant | schema and migration check | pass |
| Database maker-checker guard | migration constraint | pass |
| Critical permission and L1 freshness | RBAC and sensitive-action tests | pass |
| Actor/tenant/assurance binding | service tests and ratchet | pass |
| Service-owned clock | service test clock and ratchet mutation | pass |
| Actor-bound idempotency | hash assertion, replay tests, mutation | pass |
| Bounded serialization | retry success and exhaustion tests | pass |
| Exact uniqueness-race recovery | `P2002` replay test | pass |
| Allocation ledger compensation | kernel assertions and CAS count checks | pass |
| AR open-item reopening | projection tests and mutation | pass |
| Journal mirror and source link | service assertions and regression tests | pass |
| Applied event/outbox replay evidence | tenant-scoped query, hash checks, missing-event test | pass |
| Final aggregate CAS | exact `updateMany` and count assertion | pass |
| Generic reversal bypass refused | durable redacted audit and posting test | pass |
| Bounded result/redaction | no persistence-row result and redaction test | pass |
| Static release ratchet | 262 mutation tests | pass |
| Live readiness | report trust 30/30, zero blockers | pass |
| Type and schema verification | TypeScript, Prisma validate/generate | pass |
| Focused hygiene | lint, syntax, diff, whitespace, temp scan | pass |

## Commands Verified

```text
npm test -- --runInBand services/accounting/__tests__/customer-settlement-reversal.service.test.ts
npm test -- --runInBand <8 focused accounting/event/security suites>
npm test -- --runInBand scripts/__tests__/report-trust-export-gate.test.js
npm run report:trust:export:gate
npm run typecheck
npx eslint <Slice 436 implementation, tests, and gate files>
npx prisma validate
npx prisma generate --no-engine
node --check scripts/report-trust-export-gate.js
node --check scripts/__tests__/report-trust-export-gate.test.js
git diff --check -- <Slice 436 tracked files>
```

## Release Decision

Current-worktree service foundation: GO.

Authenticated product execution and production deployment: NO-GO pending a server-session-derived action boundary, ownership review, migration-history repair/certification, PostgreSQL migration and concurrency verification, rollback evidence, and the normal release process.

The static report-trust ratchet detects required source markers and mutations; it does not establish runtime reachability or replace integration and production evidence.
