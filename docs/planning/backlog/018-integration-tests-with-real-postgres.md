---
id: 018
title: Add integration tests with a real Postgres in CI
area: testing
priority: P1
effort: M
phase: foundations
status: partial
---

# Add integration tests with a real Postgres in CI

## Problem
Unit tests at `services/*.test.ts` mock Prisma. They prove the business logic compiles and computes correctly, but they don't prove that the SQL Prisma generates does what we want — particularly that `where: { organizationId: ctx.orgId }` actually scopes results. Multi-tenant bugs hide in the gap between unit tests and Playwright E2E. An integration suite that hits a real Postgres closes that gap fast (per test in milliseconds, not seconds).

## Acceptance criteria
- [ ] `vitest.integration.config.ts` separate from `vitest.config.ts` (so unit + integration run distinctly)
- [ ] Test environment uses a real Postgres — pick one:
  - **GitHub Actions `services: postgres`** (simplest, free) — preferred
  - `@testcontainers/postgresql` (works locally too, slightly heavier) — fallback if you want local-CI parity
- [ ] `tests/integration/setup.ts` runs `prisma migrate deploy` against the test DB before suite
- [ ] Per-test isolation: each test runs in a transaction that's rolled back at teardown
- [ ] `tests/integration/factories.ts` provides typed factories for `User`, `Organization`, `Role`, `Item`, etc. using `@faker-js/faker` (already in devDeps)
- [ ] Initial suite (~12 tests):
  - `authz/org-scope.spec.ts` — every tenant-scoped model: `findMany` returns only the active org's rows
  - `authz/protect-wrapper.spec.ts` — `protect()` (from #004) denies non-permitted role
  - `authz/cross-org-mutation.spec.ts` — user A trying to update org B's resource fails
  - `auth/invite-token.spec.ts` — invite-token redemption (single-use, expiry)
  - `auth/admin-role-isolation.spec.ts` — new-org signup gets THIS org's admin role
  - `audit-log/integrity.spec.ts` — audit events are written under expected conditions
- [ ] CI runs integration tests on PRs (job in #019). Unit tests run on every push; integration on PR-to-main
- [ ] **Self-test:** comment out `where: { organizationId }` in any service method → org-scope spec fails

## Implementation notes
- GitHub Actions services block:
  ```yaml
  services:
    postgres:
      image: postgres:16
      env: { POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: stockflow_test }
      ports: ["5432:5432"]
      options: --health-cmd pg_isready --health-interval 10s
  env:
    DATABASE_URL: postgres://ci:ci@localhost:5432/stockflow_test
  ```
- Transaction rollback pattern:
  ```ts
  // tests/integration/setup.ts
  import { db } from "@/prisma/db"
  beforeEach(async () => { await db.$executeRaw`BEGIN` })
  afterEach(async () => { await db.$executeRaw`ROLLBACK` })
  ```
  — works because Prisma uses a single connection per client
- For Inngest-backed code paths, mock `inngest.send` in tests (don't trigger real events)
- Don't double-cover what Playwright already covers — integration tests focus on data-layer invariants, Playwright on user flows

## Out of scope
- Performance / load tests
- Migration round-trip tests (separate ticket if migrations get hairy)

## Resolution
**Partial** 2026-05-23. Infrastructure + the highest-value initial suite (org-scope invariant) landed. Expanding to the full ~12-case suite is incremental work as each domain gets exercised.

**Done:**
- `vitest.integration.config.ts`: separate config; `tests/integration/**/*.spec.ts` only; single-fork pool (per-test BEGIN/ROLLBACK assumes a shared connection); 30s timeouts.
- `tests/integration/setup.ts`: connectivity smoke + per-test transaction rollback via `dbUnscoped`. Skips when `DATABASE_URL` is missing with a clear error.
- `tests/integration/factories.ts`: typed factories using `@faker-js/faker` — `createOrg`, `createRole`, `createAdminRole`, `createUser`, and a `createTenant` convenience that wires all three.
- `tests/integration/authz/org-scope.spec.ts`: 3 cases proving the #014 extension works against a real Prisma client — cross-tenant rows are filtered out, create with mismatched orgId throws, dbUnscoped escape hatch returns everything.
- `vite-tsconfig-paths` added so `@/*` resolves inside the integration runner.
- `package.json`: `test:integration` script.
- `.github/workflows/ci.yml`: new `integration-test` job spins up Postgres 16 as a service, runs `prisma migrate deploy`, runs the suite.

**Deferred (per #018 acceptance criteria):**
- `tests/integration/authz/protect-wrapper.spec.ts`
- `tests/integration/authz/cross-org-mutation.spec.ts`
- `tests/integration/auth/invite-token.spec.ts` (needs the migration from #001 applied)
- `tests/integration/auth/admin-role-isolation.spec.ts`
- `tests/integration/audit-log/integrity.spec.ts`

The factory layer is the major time-saver — each remaining test is ~30 lines and follows the same pattern.
