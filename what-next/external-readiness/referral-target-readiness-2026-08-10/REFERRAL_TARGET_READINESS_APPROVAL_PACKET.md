# Referral Target Readiness Approval Packet

Date: 2026-08-10

Release revision: `7e46f40589390d837afd61bce26adf551a7e8cea`

Release branch: `codex/referral-release-20260809`

Target purpose: isolated non-production referral rehearsal only

## Decision boundary

This packet does not grant approval. Each accountable owner must complete the relevant section using provider-owned or independently verifiable evidence. Do not paste database URLs, API keys, bearer tokens, customer data, or secret values into this file.

## B13 — Non-production PostgreSQL target

Required owner: platform owner

Required provider access: authenticated Neon and deployment-provider control plane

Required evidence:

- [ ] Target resource identifier recorded outside the repository.
- [ ] Environment is classified as isolated non-production.
- [ ] The target does not share a database or branch with production.
- [ ] PostgreSQL connection is injected through the deployment provider or controlled CI secret store.
- [ ] TLS is required.
- [ ] Read-only migration-history connectivity has passed without printing the URL.
- [ ] Backup/restore and cleanup ownership are named.

Current result: blocked. No provider authentication or injected `DATABASE_URL` is available to the release worktree.

## B14 — Baseline migration adoption decision

Required owner: DBA/release owner

The exact candidate contains five guarded baseline/foundation bridges:

1. `20260611130000_accounting_auth_baseline_bridge`
2. `20260618160000_payroll_foundation_bridge`
3. `20260618161000_ap_stock_count_foundation_bridge`
4. `20260726140000_business_event_foundation_bridge`
5. `20260730150000_organization_onboarding_entitlement_bridge`

The roadmap referred to seven baselines. The exact revision contains five guarded bridges, so the target-specific review must reconcile that discrepancy before approval.

For every bridge, record one target-specific decision:

- `execute`: target is empty and the guard/preconditions prove execution is appropriate; or
- `resolve-applied`: the target already contains the verified schema/data and execution must not occur.

Required evidence:

- [ ] Read-only schema and row-presence inspection completed.
- [ ] `_prisma_migrations` history captured through the repository health checker.
- [ ] Each bridge has an explicit execute/resolve-applied decision and rationale.
- [ ] No `prisma migrate resolve` command is run before independent verification.

Current result: blocked by B13.

## B15 — Migration checksum decision

Required owner: DBA/security owner

Repository checksum approval registry: `prisma/migration-history-checksum-approvals.json`

Current registry entries: `0`

Required evidence:

- [ ] Read-only migration-history query succeeded.
- [ ] Applied checksums match the exact repository migration files; or every legacy mismatch has a reviewed exact database checksum and accepted repository checksum approval.
- [ ] Unknown, duplicate, unfinished, or rolled-back migrations are resolved before deployment.

Current result: blocked by B13. No database history is available, so no checksum approval can be truthfully issued.

## B16 — Accounting/auth bridge risk decision

Required owners: DBA/security and Accounting/security

Migration: `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`

Exact SHA-256: `2fde92f4ad0cbb1a2a517b12e71c38997dc4956c9d57d70ff1ae0c636ff2f191`

Detected rules: `drop_column`, `drop_table`

Detected operations: 13 total — twelve column drops and one table drop.

The migration drops legacy authentication-token/session columns and the `auth_sessions` table. Its guard refuses execution when application data or the target accounting/auth schema already exists. Existing databases must be verified and normally adopt the migration with `prisma migrate resolve --applied`; an empty target may execute only after exact-hash approval.

Approval requirements:

- [ ] Target data and schema state independently verified.
- [ ] Authentication compatibility window reviewed.
- [ ] Data-loss impact reviewed.
- [ ] Backup/restore evidence recorded.
- [ ] Fix-forward steps recorded.
- [ ] Exact-hash approval added to `prisma/migration-risk-approvals.json` by an accountable reviewer.

Current result: blocked. Static migration readiness is 8/9 with 13 unapproved risks.

## B17–B19 — Secret, origin, and provider readiness

Required owners: platform/security and integration owner

Required dedicated values in the provider secret store:

- `PUBLIC_IDENTITY_ABUSE_HASH_SECRET`
- `AQSTOQFLOW_RECEIPT_TOKEN_SECRET`
- `AQSTOQFLOW_HISTORY_CURSOR_SECRET`
- `AQSTOQFLOW_STATEMENT_TOKEN_SECRET`
- `AQSTOQFLOW_STATEMENT_DELIVERY_ENCRYPTION_KEY`
- `AQSTOQFLOW_ACCOUNTANT_INVITE_ENCRYPTION_KEY`

Required public/provider configuration:

- `NEXT_PUBLIC_BASE_URL` set to the canonical HTTPS non-production origin.
- Email-first rehearsal enabled with `STOQUIFY_STATEMENT_EMAIL_LIVE_SENDS` and `STOQUIFY_ACCOUNTANT_INVITE_LIVE_SENDS` only after a sandbox/test recipient is approved.
- `RESEND_API_KEY` and approved sender identity injected by the provider.
- WhatsApp remains disabled for the first rehearsal unless its sandbox credentials and consent path are separately approved.

Current result: blocked. Release-secret preflight is 5/21 with 16 blockers. The provider checks that appear ready are conditional/vacuous because live channels are disabled; they are not provider-readiness evidence.

## B20 — Accounting entitlement

Required owner: SaaS/admin owner

Required evidence:

- [ ] Exact non-production organization selected.
- [ ] Accounting entitlement granted through the audited module boundary.
- [ ] Permitted and denied authenticated sessions are available.
- [ ] Audit allow/deny records are captured.

Current result: blocked by B13; no target organization exists.

## Deployment authorization

Deployment may begin only when B13–B20 are ready.

- [ ] Deploy exact revision `7e46f40589390d837afd61bce26adf551a7e8cea`.
- [ ] Do not deploy the dirty main workspace at `4a6cc16b56f708fff1130573b60cb6ae6e80a2c6`.
- [ ] Preserve a rollback target and record the deployment identifier.
- [ ] Run migration, secret, ingress/logging, token, provider, entitlement, and authenticated-browser preflight.

## B21–B22 — Real cohort and 16/16 pilot gate

Required owners: product/pilot owner and independent release approver

Current result: blocked, 0/16.

The sealed security scan reports that the manifest currently accepts self-asserted approver, production, consent, and data-hygiene fields. A real pilot must therefore use authenticated or signed maker-checker evidence outside the self-authored manifest until the gate is hardened.

Required evidence:

- [ ] Consented cohort selected outside the repository; no PII is committed.
- [ ] Maker and checker are different accountable identities.
- [ ] Consent, environment, release revision, and evidence references are signed or otherwise independently verifiable.
- [ ] Exact deployed revision is attested.
- [ ] Read-only pilot query succeeds.
- [ ] All 16 checks pass.

No customer outreach, production claim, or 16/16 claim is authorized before these conditions are met.
