# Audit implementation report — May 2026

**Period:** 2026-05-22 → 2026-05-23
**Scope:** Full execution of the 27-ticket pro-grade-audit backlog
**Deliverable:** 30 atomic git commits, 73 new automated tests, 2 deploy runbooks, 3 ADRs, canonical ARCHITECTURE + RUNBOOK docs

---

## Executive summary

The audit produced a backlog of 27 prioritized tickets calibrated for a solo developer shipping publicly with a free-tier budget. Every ticket was executed and committed. Sixteen are fully done, two are code-ready pending one-time deploy steps documented in runbooks, and nine are partial — the infrastructure landed plus a representative pilot, with the bulk follow-up work tracked in the ticket resolutions.

The work closes the project's largest cross-tenant and authn/authz risks (the highest-severity findings from the prior security review), establishes a defence-in-depth layer at the Prisma query level, wires the missing production rails (CI, real readiness probe, request-ID correlation, audit-log integrity monitoring), and lays down the conventions and runbooks the next contributor needs to keep the bar from slipping.

Key headline numbers:

- **30 commits**, each atomic to one ticket, with `Closes docs/backlog/<file>.md` in every message.
- **73 new vitest cases** across 11 test files. All green (~8.8s total suite runtime).
- **9 new runtime/devtools dependencies** added — Upstash Ratelimit + Redis, otplib + qrcode, @next/bundle-analyzer, @playwright/test, @axe-core/playwright, eslint-plugin-jsx-a11y, vite-tsconfig-paths.
- **3 Architecture Decision Records** under `docs/adr/` codifying the actions→services convention, the org-scoped Prisma extension, and the MFA design.
- **2 deploy runbooks** under `docs/runbooks/` — invite-token migration (#001) and MFA rollout (#016) — both of which require user action before the relevant code paths become live.

---

## Backlog status — all 27 tickets

| # | Ticket | Commit | Status | Tests |
|---|---|---|---|---|
| 001 | createInvitedUser token redemption | `0651b00` | 🟡 code-ready (migration runbook) | 8 |
| 002 | Upstash rate limiter + in-mem fallback | `82a92c1` | ✅ done | 6 |
| 003 | Client-trusted IDs sweep | `80af5df` | ⚠️ partial (audit doc + 6 pilots) | — |
| 004 | `protect()` server-action wrapper | `d9d2620` | ✅ done | 5 |
| 005 | `parseInput` Zod helper + schemas | `1ba7d80` | ⚠️ partial (helper + 1 pilot) | 4 |
| 006 | `getAllUsers` cross-tenant dump fix | `16ca782` | ✅ done | 5 |
| 007 | `/api/v1/organisations/[id]/*` org boundary | `51312d6` | ✅ done | 7 |
| 008 | POS session client-trust closed | `974e198` | ✅ done | — |
| 009 | Per-org admin role on signup | `d97aed7` | ✅ done | 4 |
| 010 | Delete `listAllItems` mock + CI sweep | `d419509` | ✅ done | — |
| 011 | Permission notation unified | `215ccfd` | ✅ done | 9 |
| 012 | `/api/ready` 1s timeout + DB ping | `3d10850` | ✅ done | 4 |
| 013 | Audit-log integrity monitoring | `2de64d5` | ✅ done | — |
| 014 | Org-scoped Prisma extension | `1b518cb` | ✅ done | 9 |
| 015 | CSP tightened (XSS-Protection, unsafe-eval dropped) | `c3d6b54` | ⚠️ partial (nonce migration deferred) | — |
| 016 | MFA / TOTP service module | `1b88474` | 🟡 code-ready (Auth.js wiring runbook) | 12 |
| 017 | Playwright config + smoke suite | `eeec373` | ⚠️ partial (authz suite deferred to #018) | — |
| 018 | Integration tests + factories + Postgres CI job | `b22aedf` | ⚠️ partial (1 spec; more deferred) | — |
| 019 | GitHub Actions CI + Dependabot | `f7749e2` | ✅ done | — |
| 020 | Request-ID + Sentry user/org tags | `63d4281` | ✅ done | — |
| 021 | Clean `.env.example` + typo deps | `7dd5362` | ✅ done | — |
| 022 | `prisma migrate deploy` in `vercel-build` | `f2a273f` | ✅ done | — |
| 023 | tsconfig `target: ES2022` | `714e4f7` | ⚠️ partial (`noUncheckedIndexedAccess` deferred) | — |
| 024 | jsx-a11y eslint + axe-core | `1e81d40` | ✅ done | — |
| 025 | Bundle analyzer wired | `6a9e21f` | ✅ done | — |
| 026 | Canonical docs + repo cleanup | `3639d42` + `7ddef68` | ✅ done | — |
| 027 | actions→services pilot + CONTRIBUTING.md | `0cec370` + `310b0d7` | ⚠️ partial (1 domain pilot) | — |

**Totals:** ✅ done 16 · 🟡 code-ready 2 · ⚠️ partial 9

The "partial" status is honest about scope, not a placeholder for unfinished work. In each case the pattern is established, the infrastructure landed, a pilot proves the approach, and the remaining bulk work is documented in the ticket resolution.

---

## What changed architecturally

### Multi-tenant defence in depth (003, 004, 006, 007, 008, 009, 014)

Previously: every server action that touched tenant data relied on the author remembering to write `where: { organizationId }`. The prior audit found six P0 cases where that filter was missing or where the action accepted `organizationId` from the client and trusted it.

Now there are three layers:

1. **Action-level filters** — every action that gets fixed adds `requireOrg()` + explicit `organizationId` in every query.
2. **`protect()` wrapper** (`services/_shared/protect.ts`) — auth + permission check + Sentry context, in one call. The pattern for all new actions.
3. **`orgScopeExtension`** (`lib/prisma/extensions/org-scope.ts`) — automatic `organizationId` injection into every `findMany`/`update`/etc. for 35 tenant-scoped models, when running inside `withRequestContext()`. Catches the next action that forgets a filter.

Auth tables (`User`/`Account`/`Session`/`VerificationToken`) and `Organization` itself are deliberately excluded. The `dbUnscoped` escape hatch exists for super-admin tools, audit-log analytics, and Inngest functions that legitimately operate across tenants.

### Authentication hardening (001, 009, 015, 016)

- **Invite tokens** (#001) — `Invite` gains `token String @unique` + `roleId String`. Redemption looks the row up by opaque 64-char hex; `email`/`organizationId`/`roleId` resolved server-side. The old URL pattern that put `roleId` in a query parameter (letting recipients self-promote) is gone.
- **Signup** (#009) — per-org admin role on new-org signup; `isVerified: false` until OTP confirmation.
- **CSP** (#015) — `X-XSS-Protection` removed (deprecated), `unsafe-eval` removed from script-src. `unsafe-inline` remains pending the nonce migration deferred for a Vercel preview soak.
- **MFA scaffolding** (#016) — TOTP service + AES-GCM-encrypted secrets + Argon2id-hashed backup codes. Schema additions in `User`. Runbook covers the Auth.js callback wiring + admin-MFA enforcement schedule.

### Authorization (004, 011)

- **`protect()` wrapper** — `services/_shared/protect.ts` resolves session → checks permission → runs handler with Sentry context. New actions use it directly; existing actions get inline `can()` checks to preserve legacy return shapes.
- **Permission notation** (#011) — colon-style `"item:read"` + buggy naive pluraliser removed. Canonical dot-style throughout (`"items.read"`). `Permission` TypeScript union covers ~50 canonical strings, plus the `(string & {})` escape hatch for ad-hoc additions during migration.

### Security primitives (002, 005, 015, 020)

- **Rate limiting** (#002) — Upstash Ratelimit (sliding window) with an in-memory fallback for dev/CI. **Fail-open on Redis errors** logs a warning rather than locking everyone out. Effectively unbounded sign-in throttling on the previous in-memory Map-on-serverless approach.
- **Input validation** (#005) — `parseInput(schema, unknown)` helper, reusable Zod fragments (`trimmedString`, `emailLower`, `cuid`, etc.). Strict-schema rejections surface unrecognized keys in the error message.
- **CSP** (#015) — see above.
- **Request correlation** (#020) — `lib/context.ts` AsyncLocalStorage holds `requestId`/`userId`/`orgId`; middleware generates it; Sentry `beforeSend` stamps it onto every event. Pino's existing `child(bindings)` is ready to consume the same context.

### Observability (012, 013, 020)

- **Real readiness probe** (#012) — `/api/ready` now does a 1-second-timed `SELECT 1`. Uptime monitor (Better Stack / UptimeRobot free tier) can finally distinguish "the Node process is alive" from "the DB is responsive."
- **Audit-log integrity** (#013) — write failures escalate to Sentry (`fatal` for critical entity types). Daily Inngest function watches for >50% volume drop vs the 7-day baseline.
- **Request ID + tags** (#020) — covered above.

### Testing + CI (017, 018, 019, 023, 024)

- **Three test runners** — unit (vitest), integration (vitest + real Postgres), E2E (Playwright). Each on a separate config with appropriate isolation (per-test BEGIN/ROLLBACK for integration; reused dev server for E2E locally).
- **CI workflow** (#019) — `.github/workflows/ci.yml` with quality (lint/typecheck/format/anti-mock-data) → parallel unit-test/build/audit/integration-test. Dependabot grouped npm updates.
- **a11y** (#024) — `eslint-plugin-jsx-a11y` (warn-level baseline; ratchet to error per file) + axe-core Playwright spec for `/` and `/auth/login`.
- **tsconfig** (#023) — `target: ES2022`. `noUncheckedIndexedAccess` surfaced 258 new type errors when tried; deferred to its own ticket.

### Code organisation (027, 026)

- **Actions → services** (#027) — ADR-0001 codifies the convention. `actions/<domain>/<verb>.ts` is a thin wrapper; `services/<domain>/<domain>.service.ts` holds the logic. Pilot domain: categories (with permission checks added inline, since they were missing entirely).
- **Documentation** (#026) — canonical `docs/ARCHITECTURE.md` + `docs/RUNBOOK.md`; 3 ADRs; 20+ stale report files archived to `docs/archive/` with a README explaining the layer is historical only.
- **CONTRIBUTING.md** at repo root with the canonical pattern, permission rules, multi-tenancy guidance, and test layers.

### Deployment (021, 022)

- **`.env.example`** regenerated from `lib/env.ts`. Stale vars removed (`EMAIL_SERVER_*`, `REDIS_URL`, hardcoded `ARGON2_*`/`JWT_*`/`TWO_FACTOR_*`, feature-flag noise). Three typo dependencies (`add`, `init`, `or`) uninstalled.
- **Migrations on deploy** — `vercel-build` script runs `prisma migrate deploy && next build`. No more manual migration steps. Local `npm run build` is unchanged so dev never accidentally migrates prod.

---

## New test coverage

73 vitest cases across 11 new test files:

| File | Cases | Covers |
|---|---|---|
| `app/api/ready/route.test.ts` | 4 | DB ping, 503 on throw, 1s timeout, Cache-Control |
| `lib/api/guard.test.ts` | 7 | `requireApiSession` + `requireApiSessionForOrg` happy path, 401, 403, cross-org audit-event payload |
| `lib/permissions.test.ts` | 9 | `can()` direct match, wildcard, role-as-string admin, multi-role aggregation, regression guard for the removed normaliser bug |
| `lib/prisma/extensions/org-scope.test.ts` | 9 | `shouldScope` semantics, `mergeWhereWithOrg` caller-wins rule, TENANT_MODELS membership |
| `lib/security/rate-limit.test.ts` | 6 | In-memory fallback, per-IP isolation, `getClientIP` parsing |
| `actions/users/createInvitedUser.test.ts` | 8 | Forged token, single-use, expired, happy path, forged-orgId rejection, schema rejection |
| `actions/users/createUser.test.ts` | 4 | Per-org admin role, `isVerified: false`, duplicate slug + email rejection |
| `actions/users/getAllUsers.test.ts` | 5 | Caller-org-only result, permission gate, sensitive-field exclusion, regression on the `where: undefined` bug |
| `services/_shared/protect.test.ts` | 5 | No-session, forbidden, happy path, Sentry-on-throw, admin role bypass |
| `services/_shared/validate.test.ts` | 4 | `parseInput` happy path, structured error, strict-mode rejection, max-length enforcement |
| `services/auth/mfa.test.ts` | 12 | Encrypt round-trip, IV randomness, malformed payload, missing key, enrolment shape, TOTP accept/reject, backup-code generation + single-use |

Plus 5 Playwright smoke cases (`tests/e2e/smoke.spec.ts`) + 2 axe-core cases (`tests/e2e/a11y.spec.ts`) + 3 integration cases (`tests/integration/authz/org-scope.spec.ts`). E2E + integration suites require either a dev server or a disposable Postgres to run.

---

## Required user action before next deploy

Two runbooks must be followed in order for two pieces of code to function correctly:

### 1. Invite-token migration (#001)

**Runbook:** `docs/runbooks/001-invite-token-migration.md`

The `Invite` model gained `token` (required, unique) and `roleId` (required). Existing PENDING invite rows have neither. Without backfilling, the new code can't redeem them.

Steps:
1. Audit existing PENDING invites and snapshot the DB.
2. Generate the migration locally (`npx prisma migrate dev --name add_invite_token_and_role`) and inspect the SQL.
3. Apply to staging; smoke-test redemption.
4. Communicate with current invitees (their existing links no longer work — re-issue via `sendInvite`).
5. Deploy to prod (`vercel-build` auto-applies via #022).

### 2. MFA rollout (#016)

**Runbook:** `docs/runbooks/016-mfa-rollout.md`

The `User` model gained `mfaSecret`, `mfaEnabledAt`, `mfaBackupCodes`. The service module is in `services/auth/mfa.ts` but isn't reachable until the Auth.js credentials callback is extended.

Steps:
1. Migrate the schema (`npx prisma migrate dev --name add_user_mfa_fields`).
2. Generate and set `MFA_ENCRYPTION_KEY` in Vercel (`openssl rand -hex 32`).
3. Extend `lib/auth.ts` credentials `authorize()` to require an `mfaCode` when `user.mfaEnabledAt` is set.
4. Build the enrolment/disable/regenerate-codes UI under `/dashboard/settings/security/mfa`.
5. Communicate the admin-MFA-required policy 1-2 weeks ahead of enforcement.

### 3. Quick wins requiring redeploy

- `npm install` to reconcile `package-lock.json` after the dependency additions/removals across multiple commits.
- Set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel to activate Upstash rate limiting (otherwise it falls back to the in-memory limiter with a logged warning in prod).
- Verify the existing `SENTRY_DSN` populates `SENTRY_AUTH_TOKEN` for sourcemap uploads.
- Enable branch protection on `main` in GitHub UI; require the new CI checks.
- Configure an uptime monitor against `/api/ready` (Better Stack free tier handles 10 monitors at 3-min interval).

---

## Deferred work — what's NOT done

Each partial ticket's resolution documents its remaining scope. Aggregated:

1. **`#003` sweep** — ~10 remaining action directories need the same `protect()` + dropped-client-IDs + per-query `organizationId` treatment as the 6 pilots already fixed. Audit doc at `docs/audit/2026-05-client-trusted-ids.md` is the work breakdown. Estimate: 2 days focused.
2. **`#015` CSP nonces** — replace `'unsafe-inline'` with per-request nonces. Needs Tailwind/Sentry/framer-motion verified on a Vercel preview before promoting. Estimate: half a day.
3. **`#017` authz E2E specs** — `auth-sign-in`, `authz-cross-org`, `authz-roles`, `invite-flow`, `pos-cross-org` scenarios. Need seeded test DB fixtures (depends on #018 expansion). Estimate: 1 day.
4. **`#018` integration suite expansion** — additional specs for `protect()` wrapper, cross-org mutation, invite-token redemption, admin-role isolation, audit-log integrity. Factories already in place; each spec ~30 lines. Estimate: half a day.
5. **`#023` `noUncheckedIndexedAccess`** — 258 surfaced type errors to fix in batches. Most are mechanical (post-length-check array access); ~30-40% need real review. Estimate: 1 day.
6. **`#027` actions→services bulk migration** — pilot done on categories; ~10 more domains in flight. Following the documented pattern, each ~30 minutes. Estimate: 1 day.
7. **`documentations/` directory** — left untouched in `#026` because it contains substantive `.docx` and `.prisma` files that warrant human review before archiving.

Total deferred work estimate: ~6 days of focused execution, spread across short PRs.

---

## Risk register

What still keeps you up at night, ranked:

1. **The `#003` sweep — outstanding action files.** Until every server action runs inside `withRequestContext()` (typically via `protect()`), the org-scope Prisma extension can't help them. The audit doc tracks every file; each fix is small and mechanical, but the volume means it'll take real time. **Mitigation:** ship the ESLint rule from `#019` follow-up that flags `actions/**` files without a `protect` import. Until then, code review is the gate.
2. **`#001` migration hasn't been applied to prod.** The new `createInvitedUser` code is staged but won't work against the current schema. **Mitigation:** the runbook. Follow it.
3. **MFA isn't wired into sign-in.** The service exists; the credentials callback doesn't call it. **Mitigation:** the runbook. Schedule the work; don't tell auditors MFA is "available" until step 3 in the runbook is done.
4. **`unsafe-inline` is still in the CSP.** Drops a layer of XSS defence. **Mitigation:** complete the `#015` follow-up (nonce migration); the rest of the CSP hardening already landed.
5. **`noUncheckedIndexedAccess` revealed 258 type errors when tried.** These are real latent bugs, not noise — at least 30-40% of them. **Mitigation:** triage in batches; don't ignore.
6. **CI workflow not yet enforced as a required check on `main`.** Without branch protection set in GitHub UI, the workflow runs but doesn't gate merges. **Mitigation:** one-line config change in the GitHub repo settings.

---

## What this report is and isn't

**Is:** a faithful inventory of what the audit produced, where each piece landed in git, what tests cover it, what the user must do before deploying, and what the risk surface looks like at the end of this work.

**Isn't:** a substitute for reading `docs/ARCHITECTURE.md`, the ADRs, or the individual ticket resolutions under `docs/backlog/`. Those are the durable artefacts. This report is a snapshot.

**Cross-references for the reader:**
- [Backlog index](backlog/INDEX.md) — every ticket's status + commit reference, with the recommended ordering.
- [Architecture](ARCHITECTURE.md) — the system as it is today.
- [Runbook](RUNBOOK.md) — operations playbooks.
- [ADRs](adr/) — binding decisions (actions/services, Prisma extension, MFA design).
- [Client-trusted-IDs audit](audit/2026-05-client-trusted-ids.md) — the sweep work breakdown.
- [Security findings](security-findings/STOCKFLOW-VULNS-2026-05.md) — the original P0 list this work was responding to.
- [Invite-token migration runbook](runbooks/001-invite-token-migration.md)
- [MFA rollout runbook](runbooks/016-mfa-rollout.md)
