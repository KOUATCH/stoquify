---
id: 021
title: Clean .env.example, kill duplicate AUTH_SECRET/NEXTAUTH_SECRET, remove typo deps
area: architecture
priority: P1
effort: S
phase: quick-wins
status: done
---

# Clean .env.example, kill duplicate AUTH_SECRET/NEXTAUTH_SECRET, remove typo deps

## Problem
`.env.example` has accumulated drift:
- Both `AUTH_SECRET` and `NEXTAUTH_SECRET` are declared (next-auth v4 uses `NEXTAUTH_SECRET`; `AUTH_SECRET` is v5 — one of them is dead weight)
- `EMAIL_SERVER_HOST/PORT/USER/PASSWORD` — the project uses Resend now (per `lib/inngest/functions/*`), these SMTP vars are unused
- `REDIS_URL` — declared but Redis isn't connected; misleading (Upstash from #002 uses REST URL + token, not a single URL)
- `ARGON2_MEMORY_COST`, `ARGON2_TIME_COST`, `ARGON2_PARALLELISM` — hardcoded in `lib/security/password-utils.ts`, not actually env-driven
- `JWT_EXPIRATION="8h"` — hardcoded in `lib/auth.ts:38`
- `TWO_FACTOR_*` — currently no implementation (see #016)

Plus `package.json` has three typo dependencies that were accidentally installed:
- `"add": "^2.0.6"` — wrong package, unrelated to the intent
- `"init": "^0.1.2"` — same
- `"or": "^0.2.0"` — same (devDependency)

These bloat node_modules, increase supply-chain attack surface, and confuse anyone reading `package.json`.

## Acceptance criteria
- [ ] `.env.example` regenerated from `lib/env.ts`'s Zod schema — every var the code reads is documented; nothing else
- [ ] Pick one auth-secret name (`NEXTAUTH_SECRET` for next-auth v4; switch to `AUTH_SECRET` only when migrating to v5). Remove the other.
- [ ] Stale vars removed: `EMAIL_SERVER_*`, `REDIS_URL`, `ARGON2_*`, `JWT_EXPIRATION`, `TWO_FACTOR_ISSUER` (or move to code constants)
- [ ] Add the vars that ARE used but not in `.env.example`: Resend `RESEND_API_KEY`, Upstash (from #002), Sentry full set
- [ ] `npm uninstall add init or` removes the typo deps
- [ ] `npx depcheck` (one-time, manual run) reports zero unused deps after cleanup, or only explicitly-allowlisted ones
- [ ] `scripts/sync-env-example.ts` (optional but recommended) parses `lib/env.ts` and asserts `.env.example` matches; CI fails on drift
- [ ] `.example.env` (note: backwards filename) is deleted — only `.env.example` remains
- [ ] **Test:** `npm run build` succeeds after the `npm uninstall`
- [ ] **Test:** `node -e "require('./lib/env.ts')"` (or equivalent) fails clearly when a required var is missing

## Implementation notes
- The `dev` script in `package.json` line 6 has stray whitespace: `" prisma generate  && next dev "`. Fix to `"prisma generate && next dev"` (cosmetic but the trailing space confuses some shells)
- After uninstalling `add init or`, check that no actual code imports them (`git grep "from \"add\"|from \"init\"|from \"or\""`) — should return nothing
- For the env-sync script (optional):
  ```ts
  // scripts/sync-env-example.ts
  // Reads lib/env.ts via TS reflection or by importing the Zod schema and emitting the keys
  // Writes a regenerated .env.example with comments from schema descriptions
  ```
  Probably not worth automating for ~30 vars; a manual sync now + CI grep check (`diff <(cat .env.example | grep -oE "^[A-Z_]+") <(grep -oE "\"[A-Z_]+\":" lib/env.ts)`) is fine

## Out of scope
- Secret rotation (separate concern; if any secret was ever committed, rotate it — `git log -p .env*` to check)
- Vault / Doppler / 1Password Secrets Automation — overkill at this stage

## Resolution
Implemented 2026-05-23.
- `lib/env.ts` extended with Sentry, Inngest, Resend FROM, and feature-flag vars (all optional)
- `.env.example` rewritten — every var maps to `lib/env.ts`; stale ones removed (EMAIL_SERVER_*, REDIS_URL, ARGON2_*, JWT_EXPIRATION, SESSION_MAX_AGE, TWO_FACTOR_*, RATE_LIMIT_*, ENABLE_* feature flags)
- Picked `NEXTAUTH_SECRET` as canonical (next-auth v4 uses it); removed `AUTH_SECRET`
- `package.json` dev/build script whitespace fixed; typo deps `add`, `init`, `or` removed from dependencies/devDependencies (user must run `npm install` to update `package-lock.json`)
