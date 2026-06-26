---
id: 017
title: Add Playwright E2E for auth/authz boundary cases
area: testing
priority: P1
effort: M
phase: foundations
status: partial
---

# Add Playwright E2E for auth/authz boundary cases

## Problem
There are 8 unit tests in `services/*.test.ts` covering business logic. There are zero tests covering the auth/authz boundary — the most security-critical surface. Tickets #001–#011 introduce non-trivial logic changes (token-based invites, `protect()` wrapper, query-level org scoping). Without E2E coverage of the boundary, a single typo in the rollout silently re-opens a cross-tenant hole.

## Acceptance criteria
- [ ] `@playwright/test` installed; `playwright.config.ts` configured; `tests/e2e/` directory created
- [ ] Test database is per-run (Testcontainers from #018, or a dedicated test DB seeded via `prisma migrate reset` + custom fixtures)
- [ ] Test specs:
  - `auth-sign-in.spec.ts`: sign in with credentials, sign in with GitHub OAuth (mocked), sign out
  - `auth-mfa.spec.ts` (depends on #016): enroll, sign in with code, sign in with backup code, disable
  - `authz-cross-org.spec.ts`: user A creates an invoice, user B (different org) cannot read/edit/delete it (separate test per verb)
  - `authz-roles.spec.ts`: `viewer` cannot call `deleteUser`, `cashier` cannot call `roles.create`, `admin` can do everything
  - `invite-flow.spec.ts` (depends on #001): redeem valid invite; expired invite fails; reused invite fails; forged token fails
  - `pos-cross-org.spec.ts` (depends on #008): cashier from org A cannot open a session against org B's terminal
- [ ] Test data: two seeded orgs with three users each (admin/member/viewer) plus a few items, customers, terminals
- [ ] CI runs Playwright on PRs to `main` (job in #019)
- [ ] **Self-test:** comment out the auth check in any `protect()`-wrapped action → corresponding authz test fails

## Implementation notes
- Mock OAuth: use Playwright's route interception to stub `accounts.google.com` callbacks, or use a test-only OAuth provider in Auth.js config gated by `NODE_ENV === "test"`
- Page Object Model for sign-in / dashboard navigation — keeps tests readable
- Each test starts from a fresh sign-in to avoid session pollution
- Parallel test runs use unique org IDs per worker (suffix with `worker-${id}`)
- Auth.js session: prefer cookie-based session over JWT in test config — easier to inspect

## Out of scope (separate tickets)
- Visual regression tests
- Full feature E2E (POS sale, purchase order, etc.) — separate testing strategy ticket
- Cross-browser testing (Chromium only is fine for now)

## Resolution
**Partial** 2026-05-23 — infrastructure + smoke suite landed. The authz/cross-org test cases are sketched in the smoke file as TODO; they need a seeded test DB (#018) to be meaningful.

**Done:**
- `@playwright/test` installed; `playwright.config.ts` with Chromium-only project, dev-server reuse, screenshots + traces on failure, GitHub reporter in CI.
- `tests/e2e/smoke.spec.ts` — 5 cases: landing renders, `/dashboard` redirects unauthenticated users to `/auth/login`, login form is visible, `/api/health` returns 200, `/api/ready` returns 200|503 with a `checks.db` field.
- `package.json`: `test:e2e` and `test:e2e:ui` scripts.
- `.gitignore`: `test-results/`, `playwright-report/`, `playwright/.cache/`.
- `eslint.config.mjs`: report dirs added to ignore list.

**Deferred to #018 (needs seeded DB):**
- `auth-sign-in.spec.ts` — credentials sign-in, OAuth (mocked), sign-out.
- `authz-cross-org.spec.ts` — user A creates an invoice, user B fails to read/edit/delete it.
- `authz-roles.spec.ts` — viewer/cashier/member/admin permission matrix.
- `invite-flow.spec.ts` — depends on #001's invite token redemption + DB fixtures.
- `pos-cross-org.spec.ts` — depends on POS terminals seeded across two orgs.

Run locally: `npm run test:e2e` (auto-starts dev server). In CI, a separate job will spin up Postgres + run the dev server in headless mode — wire into `.github/workflows/ci.yml` once #018 lands.
