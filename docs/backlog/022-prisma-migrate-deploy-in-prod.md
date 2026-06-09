---
id: 022
title: Add prisma migrate deploy to the production deploy step
area: deployment
priority: P1
effort: S
phase: quick-wins
status: done
---

# Add prisma migrate deploy to the production deploy step

## Problem
`package.json` build script is `"build": "prisma generate && next build"`. It generates the Prisma client but does NOT apply pending migrations to the database. In production, migrations would only land if you run `prisma migrate deploy` by hand, which is easy to forget and easy to do wrong (e.g. running it from your laptop against prod, with an old branch checked out).

The current pattern works only because someone is presumably running migrations manually on each deploy. That's an outage waiting to happen.

## Acceptance criteria
- [ ] Either (a) `vercel.json` declares a `buildCommand` that runs migrations + build, or (b) `package.json` `build` script is updated to `prisma migrate deploy && prisma generate && next build`
- [ ] Recommendation: (a) — keeps `npm run build` usable for local builds (which shouldn't run migrations against prod), and isolates the prod-only step
- [ ] `vercel.json` example:
  ```json
  {
    "buildCommand": "prisma migrate deploy && next build",
    "framework": "nextjs"
  }
  ```
- [ ] `DATABASE_URL` for migrations and runtime is the same env var in Vercel — verify
- [ ] A safety check: `prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource $DATABASE_URL --exit-code` runs in CI on PRs — fails the PR if the schema is ahead of the DB without a migration file
- [ ] **Test:** create a new migration locally; push to a preview branch; verify the preview deployment applies it
- [ ] **Test:** modify `schema.prisma` without generating a migration → CI's `migrate diff` check fails the PR

## Implementation notes
- Vercel runs the buildCommand from the project root. `prisma migrate deploy` connects to `DATABASE_URL` and applies pending migrations.
- For staging vs prod separation: use Vercel preview vs production env vars. Preview branches should hit a *staging* DB if you have one (see #026 for staging environment); without one, preview branches share prod DB which is risky.
- `prisma generate` is already in `postinstall` — it runs on `npm ci`. The build doesn't need to re-generate, but the current script does. Either way, harmless.
- If a migration is destructive (column drop, type change), the pattern is:
  1. Migration A (additive): add new column, copy data
  2. Code change ships
  3. Migration B (cleanup): drop old column
  Document this convention in `prisma/MIGRATIONS.md`

## Out of scope
- Zero-downtime migration tooling (Atlas, Ariga) — overkill for current scale
- Migration rollback procedure (Prisma doesn't support down migrations natively; manual rollback scripts if needed)

## Resolution
Implemented 2026-05-23 via `package.json` `vercel-build` script. Vercel auto-detects this script and runs it instead of `next build` when present, per https://vercel.com/docs/projects/project-configuration#build-command.

- `npm run build` (local) — unchanged: `prisma generate && next build`. Does NOT run migrations.
- `npm run vercel-build` (production deploy) — `prisma generate && prisma migrate deploy && next build`. Runs migrations against production `DATABASE_URL` before the Next build.

Did not add `vercel.json` to keep the Vercel-dashboard buildCommand configuration as the source of truth; if a `vercel.json` is added later, it should call `npm run vercel-build`. The CI `migrate diff` check from the acceptance criteria is deferred to ticket #019 (CI workflow).
