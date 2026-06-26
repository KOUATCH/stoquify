# StockFlow — operations runbook

> Last updated: 2026-05-23. Per-feature runbooks live in [`runbooks/`](runbooks/) (e.g. invite-token migration, MFA rollout, HR/Payroll operations). This file covers cross-cutting operational scenarios.

## Feature runbooks

- [HR/Payroll operations](hr-payroll-operations.md)
- [Invite-token migration](001-invite-token-migration.md)
- [MFA rollout](016-mfa-rollout.md)

## Deploy procedure

1. Open a PR. CI (`.github/workflows/ci.yml`) runs quality → unit-test/build/audit/integration in parallel. **All must be green** before merging.
2. Merge to `main`. Vercel auto-deploys.
3. Vercel runs `npm run vercel-build` → `prisma generate && prisma migrate deploy && next build`. Migrations apply automatically.
4. Watch the deploy log for migration output. If a migration fails, the deploy fails — production stays on the previous build.

## Rolling back

- **Code-only**: Vercel → previous deployment → Promote. ~30s.
- **Schema rollback**: Prisma doesn't generate down-migrations. Either (a) write a manual reverse migration and apply it, or (b) restore from snapshot (last resort).

If a destructive migration just landed and is causing issues, prefer "fix forward" — write a new migration that compensates rather than reverting.

## Incident playbooks

### "Site returns 500s"

1. Open Sentry → filter by the last 15 minutes. Look for a spike in event volume on a single tag (`tags.organizationId`, `tags.request_id`, route).
2. If the error is concentrated on one org: check `/api/ready` (uptime monitor); confirm the DB is up.
3. If errors span all orgs: check the latest deploy. Promote previous deploy if the regression is fresh.
4. Cross-reference the request ID against Pino logs and `AuditLog` rows for the timeline.

### "DB is unreachable"

1. `/api/ready` returns 503. Uptime monitor pages.
2. Check the DB provider's status page (Neon / Supabase / AWS RDS).
3. If provider is down: announce, wait, retry. The app fails open on rate-limit Redis but NOT on DB — every page will 500 until DB comes back.
4. If provider is up: check `DATABASE_URL` in Vercel; check connection pool exhaustion (Prisma Accelerate dashboard if used).

### "Sentry stops receiving events"

1. Audit-log integrity job (`auditIntegrityCheck` Inngest fn, daily 02:00 UTC) will eventually fire on the volume drop.
2. Verify `SENTRY_DSN` is set in Vercel env.
3. Force a test error via `logger.error("ops.sentry.test", { test: true })` in a temporarily-deployed test route.

### "OAuth provider is down"

- GitHub/Google sign-in fails. Auth.js logs the provider error.
- Mitigation: tell users to use credentials sign-in (email + password). No code change required.
- If credentials is also broken: page on-call.

### "Inngest webhook stops processing"

1. Check Inngest dashboard for failed runs.
2. Confirm `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in Vercel env.
3. Failed jobs auto-retry per Inngest's policy; manually requeue from the dashboard if needed.

## Customer-facing requests

### "Delete my account" (GDPR / CCPA)

1. Verify identity (email match against the User record).
2. Manual SQL pending a dedicated UI — until that ships, in a transaction:
   ```sql
   UPDATE "User" SET email = concat('deleted-', id, '@deleted.invalid'), password = NULL, image = NULL, "firstName" = NULL, "lastName" = NULL, phone = NULL WHERE id = '<id>';
   DELETE FROM "Account" WHERE "userId" = '<id>';
   DELETE FROM "Session" WHERE "userId" = '<id>';
   ```
3. Audit-log via `recordAuditEvent` (manual until automated).
4. Reply to the requester within the legal SLA (30 days EU/CA, 45 days CA-USA).

### "Export my data" (data portability)

- No automated tool yet. Until it lands: SQL-export the user's data per request. Format as JSON. Email a download link.
- Track as a feature ticket once these requests start arriving regularly.

### Adding a user (manual invite)

- Preferred: admin sends an invite via `/dashboard/settings/users/invite`. Invitee redeems via the token-based URL. See [`runbooks/001-invite-token-migration.md`](runbooks/001-invite-token-migration.md) for the migration history.
- Fallback (no UI available): seed via `prisma/comprehensive-seed.ts` modifications or direct SQL.

## Backups

- **Provider managed** — confirm with Neon/Supabase that point-in-time recovery is enabled and retention ≥ 7 days.
- **Off-host snapshots** — weekly `pg_dump` to S3/R2 via a GitHub Actions cron (TODO — write this).
- **Restore drill** — quarterly: restore the latest snapshot to a throwaway DB, run row-counts vs prod baseline, confirm `auth/login` succeeds for a known test user. Record date of last successful drill below.
  - Last drill: _none yet_

## Secret rotation

- `NEXTAUTH_SECRET` — rotating invalidates every active session. Schedule during off-hours. Update Vercel env → redeploy.
- `MFA_ENCRYPTION_KEY` — **never rotate** without a migration script that re-encrypts every `User.mfaSecret` with the new key. Otherwise every MFA-enabled user is locked out.
- `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_AUTH_TOKEN` — rotate freely; update Vercel env → redeploy.
- `OAUTH_*` (Google / GitHub) — rotate via the provider's console; update Vercel; redeploy.

## On-call

- **Primary**: TBD (single-developer right now; future hire splits this)
- **Escalation**: TBD

## Severity definitions

- **SEV1** — production down, customer data leak, or active security incident. Page immediately.
- **SEV2** — degraded service (slow, partial outage, important feature broken). Respond within 1 business hour.
- **SEV3** — bug affecting some customers. Respond within 1 business day.

## Post-mortem template

For SEV1 and SEV2, write a post-mortem in `docs/post-mortems/<YYYY-MM-DD>-<slug>.md`:

```
# Post-mortem: <one-line summary>

**Date / time**: <ISO>
**Severity**: SEV<n>
**Duration**: <T+0 to T+X>
**Customer impact**: <orgs affected / users affected / data lost?>

## Timeline
- T+0: ...
- T+5m: ...

## Root cause
<what actually broke>

## What went well
- <thing 1>

## What went poorly
- <thing 1>

## Action items
- [ ] <owner — fix — by date>
```
