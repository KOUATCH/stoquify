---
id: 019
title: Add .github/workflows/ci.yml (typecheck → lint → test → build) + Renovate config
area: ci-cd
priority: P1
effort: S
phase: foundations
status: done
---

# Add .github/workflows/ci.yml (typecheck → lint → test → build) + Renovate config

## Problem
There is no `.github/workflows/` directory in the repo. Vercel auto-builds on push, which provides a build check, but it does not run `tsc --noEmit`, lint, vitest, or the integration suite. Without CI, broken types, lint warnings (which the `--max-warnings 0` script would fail on locally), and broken tests can sit in `main` until someone happens to run them by hand. Funding due-diligence will ask "what's your CI?"

## Acceptance criteria
- [ ] `.github/workflows/ci.yml` exists, runs on push + PR
- [ ] Jobs (in this order, fail-fast):
  - `setup` — checkout, Node 20, npm ci, `prisma generate`
  - `lint` — `npm run lint` (already configured with `--max-warnings 0`)
  - `typecheck` — `npx tsc --noEmit`
  - `format-check` — `npm run format:check`
  - `unit-test` — `npm test` (vitest unit suite)
  - `integration-test` — Postgres service + integration suite from #018
  - `e2e-test` — Playwright from #017 (PR-to-main only, not every push, to save minutes)
  - `build` — `npm run build`
  - `security-check` — `npm run security:audit` (the existing script)
- [ ] Branch protection on `main`: required status checks for all jobs above
- [ ] `.github/dependabot.yml` (or `renovate.json`) — weekly updates, grouped (`@types/*`, `@radix-ui/*`, `@tiptap/*`), patch/minor auto-merge if CI green, majors require manual review
- [ ] Cache `node_modules` via `actions/setup-node@v4` `cache: npm`
- [ ] Cache Next.js build via `actions/cache@v4` keyed on `package-lock.json` + source tree
- [ ] CI total runtime under 8 minutes (Playwright is the slowest at ~3-4 min)
- [ ] **Self-test:** open a PR with a deliberate type error → CI fails, merge blocked

## Implementation notes
- Skeleton:
  ```yaml
  name: CI
  on: [push, pull_request]
  concurrency:
    group: ${{ github.workflow }}-${{ github.ref }}
    cancel-in-progress: true
  jobs:
    ci:
      runs-on: ubuntu-latest
      services:
        postgres:
          image: postgres:16
          env: { POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: test }
          ports: ['5432:5432']
          options: --health-cmd pg_isready
      env:
        DATABASE_URL: postgres://ci:ci@localhost:5432/test
        AUTH_SECRET: ci-test-secret-32-chars-minimum-______
        NEXTAUTH_SECRET: ci-test-secret-32-chars-minimum-______
        NEXTAUTH_URL: http://localhost:3000
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with: { node-version: 20, cache: npm }
        - run: npm ci
        - run: npx prisma generate
        - run: npm run lint
        - run: npx tsc --noEmit
        - run: npm run format:check
        - run: npm test
        - run: npx prisma migrate deploy
        - run: npm run test:integration
        - run: npm run build
        - run: npm run security:audit
  ```
- Dependabot config: schedule `weekly`, `package-ecosystem: npm`, group all `@radix-ui/*` etc.
- Renovate (alternative, more flexible): `renovate.json` with `groupSlug: "radix"` for `@radix-ui/*`, `prConcurrentLimit: 5`
- The existing `npm run security:audit` script combines `npm audit && node scripts/security-check.js` — keep both
- Vercel: if you're not already enforcing "deploy only on green CI", configure that in Vercel project settings → Git → "Require checks"

## Out of scope
- Release workflow / changelog generation
- Deploy workflow — Vercel handles that on its own
- Coverage thresholds (separate decision)

## Resolution
Implemented 2026-05-23.

- `.github/workflows/ci.yml`: 4 jobs, fail-fast — `quality` (format check, lint, tsc, anti-mock-data sweep), then `unit-test`, `build`, `audit` in parallel after `quality` passes. Node 20, `npm ci --legacy-peer-deps` (cmdk-react-19 peer conflict still unresolved upstream).
- `.github/dependabot.yml`: weekly npm + GitHub Actions updates, grouped (`@types`, `@radix-ui`, `@tiptap`, `@sentry`, `@tanstack`, `eslint*`), max 5 open PRs. React 19 major bumps explicitly ignored until cmdk catches up.
- `scripts/check-no-mock-data.sh` made executable.

Integration test job (Postgres service) is in ticket #018 (separate). Playwright E2E job is in ticket #017. Branch protection / required status checks on `main` are GitHub UI configuration — not committable.

The Vercel "Promote-only on green CI" toggle should be enabled in the Vercel project settings to prevent pushing to prod when CI is red.
