# Stoquify — operations runbook

> Last reviewed: 2026-09-30 for account-data handling and restore evidence. Other deployment and incident procedures still require environment-specific rehearsal. Per-feature runbooks live in this directory (e.g. invite-token migration, MFA rollout, HR/Payroll operations).

## Feature runbooks

- [HR/Payroll operations](hr-payroll-operations.md)
- [Invite-token migration](001-invite-token-migration.md)
- [MFA rollout](016-mfa-rollout.md)
- [Release secret provisioning](release-secret-provisioning.md)
- [Prisma production migrations](prisma-production-migrations.md)
- [CI release gates](ci-release-gates.md)
- [Release cohort operations rehearsal](release-cohort-rehearsal.md)

## Deploy procedure

1. Open a PR. CI provisions isolated PostgreSQL databases and runs `npm run verify:ci`. Verify the actual required-check policy and current results before merging; repository YAML alone does not establish branch protection.
2. Prepare the reviewed artifact with `release:artifact` in an isolated build environment without deployment-target credentials. `npm run build` runs secret preflight, lint and compilation; it does not promote schemas.
3. Retain the trusted manifest digest and exact artifact in controlled storage. Follow [artifact and schema promotion](../../release/ARTIFACT_SCHEMA_PROMOTION.md) for source/content verification and the separate serialized `release:schema:promote` stage, including all existing target/history/destructive-change gates.
4. The approved hosting hook must promote those exact artifact bytes after schema success. Its wiring and protected-environment controls require environment-specific evidence; do not assume merging to `main` provides this sequence or lets the provider rebuild afterward.
5. Verify cohort health, domain balances, worker backlog and alert receipt before widening rollout. A local rehearsal does not establish hosted rollback behavior or authorize production activation.

## Rolling back

- **Code-only**: promote the reviewed prior artifact only after its compatibility with the expanded schema is verified. Measure recovery time during the approved deployment rehearsal; no fixed duration is established here.
- **Schema/data recovery**: reverting source does not reverse SQL. Use a reviewed fix-forward or restore plan, reconcile writes since the backup, and rehearse first on a separate target. Never overwrite the source during a rehearsal.

If a destructive migration just landed and is causing issues, prefer "fix forward" — write a new migration that compensates rather than reverting.

## Incident playbooks

### "Site returns 500s"

1. Open the deployment host's runtime logs for the last 15 minutes. The shared logger emits JSON to stdout/stderr by default; search `context.correlationId`, `context.code`, and `context.permission`. Verify host retention and collection for the environment being investigated.
2. If the error is concentrated on one org: check `/api/ready` (uptime monitor); confirm the DB is up.
3. If errors span all orgs: check the latest deploy. Promote previous deploy if the regression is fresh.
4. Cross-reference the correlation ID returned by a failed protected action against runtime logs. Security audit calls can also persist an explicit correlation ID in `AuditLog.changes`. Successful financial audit rows remain transactional; a `payroll settlement rejected` operational log does not mean a settlement committed.

### "DB is unreachable"

1. `/api/ready` returns 503. Uptime monitor pages.
2. Check the DB provider's status page (Neon / Supabase / AWS RDS).
3. If provider is down: announce, wait, retry. The app fails open on rate-limit Redis but NOT on DB — every page will 500 until DB comes back.
4. If provider is up: check `DATABASE_URL` in Vercel; check connection pool exhaustion (Prisma Accelerate dashboard if used).

### "Expected runtime logs are missing"

1. Check the correct deployment, runtime, time range and host log retention. Local stdout/stderr tests prove emission, not delivery to a hosted collector or alerting service.
2. Inspect any `setLoggerSink` integration. Synchronous exceptions and rejected promises fall back to console with `context.logSinkFailed: true`; console failure itself is best effort and cannot interrupt the operation.
3. In an approved nonproduction environment, emit a synthetic event with a unique correlation ID and verify receipt in the actual host logs. Record deployment ID, timestamp, correlation ID and destination. Do not log credentials, payroll details or raw request bodies. No Sentry/Pino transport or Inngest audit-volume detector is established by this logger change.

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

1. Verify the requester through the approved identity-verification process and establish the affected tenant/account scope. An email match alone is not authorization to erase records.
2. Have the privacy/records owner identify applicable retention obligations, legal holds, payroll/accounting evidence and the response deadline for this request. Prepare a reviewed account-data disposition plan before any deletion or anonymization.
3. Rehearse the approved plan on an isolated copy, including identity-provider links, session revocation, media, audit evidence and retained business references. Current Prisma mappings are `User → users`, `Account → accounts`, and `Session → sessions`; the former SQL against quoted `User`, `Account` and `Session` tables was incorrect and has been removed.
4. Use the supported service workflow or a separately reviewed, tenant-scoped migration with before/after checks. Preserve required financial records and legal holds; a three-table SQL edit is not a complete account-erasure workflow.
5. Record the authorized actions and retained-data reasons without copying unnecessary personal data into the audit log. Provide the requester the approved outcome through an authorized channel.

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
  - Recorded local structural rehearsal: [2026-08-29 restore evidence](../../../what-next/migrations/staging-primary-restore-rehearsal-2026-08-29.md). It restored a populated local source into a new restore-only database and verified the then-current 80/80 migration chain and table profiles.
  - Current local structural rehearsal: [2026-09-30 restore evidence](../../../what-next/platform-remediation/2026-09-30-run-01/data-impact/restore/restore-rehearsal.md). The source was dumped read-only into a new restore-only local database. All 87/87 migration names/checksums and Prisma migration status passed; the schema-diff fingerprint and nine auth/accounting table-count profiles matched. The temporary dump was removed. The full rehearsal took 290.865 seconds; this is not a deployed recovery-time objective measurement.
  - Neither structural rehearsal establishes functional login, accounting correctness, deployed point-in-time recovery or achieved RPO/RTO. The September 30 read-only scan found missing base amounts and out-of-period POS-sale entries; restoring them faithfully does not repair them.
  - Pending current release proof: fresh and populated-upgrade migration replay, authenticated test-user access, domain balance checks, worker recovery and confirmation of deployed backup/PITR retention and recovery objectives. Assign the environment and recovery owners before a deployment drill; never restore over the source database. The September 30 disposable clone lifecycle is recorded in its execution evidence.

## Secret rotation

- `PUBLIC_IDENTITY_ABUSE_HASH_SECRET`, `AQSTOQFLOW_RECEIPT_TOKEN_SECRET` — follow the [release-secret provisioning runbook](release-secret-provisioning.md); both have domain-specific rotation effects.

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
