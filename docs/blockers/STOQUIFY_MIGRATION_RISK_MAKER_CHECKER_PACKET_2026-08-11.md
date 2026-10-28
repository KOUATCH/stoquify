# Stoquify Migration Risk Maker-Checker Decision Packet

- Packet ID: `MIG-RISK-20260611130000-F7DE8DC7-2026-08-11`
- Prepared: `2026-08-11`
- Status: `BLOCKED_AWAITING_MAKER_CHECKER_DECISION`
- Recommended decision: `HOLD_AND_REWORK`
- Production execution authorized: `false`
- Legal or accounting certification claimed: `false`

## Exact artifact identity

- Migration: `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`
- SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`
- UTF-8 byte length: `24674`
- Gate findings: `13` (`12 drop_column`, `1 drop_table`)
- Existing exact-hash approvals: `0`

The hash binds this packet to the current migration text. Any byte change invalidates this decision packet and requires a new scan, new hash, and new maker-checker review.

## Gate result

`npm run prisma:migration:safety:gate` failed closed on `destructive_sql_is_exact_hash_approved`. The local deployment action was safely skipped; no database was targeted or mutated.

## Destructive operations

| Lines | Object | Operation | Observed data risk |
|---:|---|---|---|
| 80-88 | `accounts` | Drop nine legacy authentication columns | Existing tokens, provider identity, provider account identity, token type, session state, and account type can be lost before replacement columns are populated. |
| 101-102 | `sessions` | Drop `expires` and `sessionToken` | Existing session expiry and token values can be lost before `expiresAt` and `token` are populated. |
| 112 | `users` | Drop and recreate `emailVerified` | Existing verification state can be reset to `false`. |
| 116 | `auth_sessions` | Drop table | All retained rows and their provenance can be lost. |

## Technical assessment

The current migration performs destructive renames as drop/add operations without an in-file backfill. Several old-to-new mappings are apparent (`access_token` to `accessToken`, `providerAccountId` to `accountId`, `provider` to `providerId`, `sessionToken` to `token`, `expires` to `expiresAt`), but the SQL does not preserve their values. Approval of the current hash would therefore authorize data loss unless independent evidence proves the affected columns and table contain no required data.

## Required maker evidence

The maker must assemble one immutable evidence bundle containing:

1. Deployment census: whether this exact migration hash has run in every controlled environment. If it has run anywhere, do not rewrite its history; use a forward-only remediation migration.
2. Pre-migration profiles for every affected column/table: row counts, non-null counts, distinct/collision checks, and retained-data classification.
3. A lossless field mapping and transformation for every renamed field, including timestamp and uniqueness semantics.
4. A cryptographically hashed backup or snapshot plus a verified restore exercise on an isolated database.
5. An isolated dry run with before/after row counts and deterministic reconciliation queries showing zero unexplained loss.
6. A rollback or forward-recovery runbook with tested recovery time and named operator.
7. Focused authentication regression evidence for account linking, refresh/access tokens, email verification, and active sessions.
8. The resulting migration hash, safety-gate JSON, test logs, and evidence-bundle hash.

## Required checker decision

The checker must be a different identified person from the maker and must independently verify the evidence bundle, the environment census, the exact SHA-256, recovery proof, and reconciliation results. The checker must choose exactly one decision:

- `REJECT_AND_REWORK` (recommended): keep the approval registry unchanged. If the migration is unexecuted everywhere, replace it with a staged additive/backfill/constraint/drop sequence and rescan. If it has executed anywhere, preserve history and create forward-only remediation.
- `APPROVE_EXACT_HASH`: allowed only when the evidence proves the destructive operations are intentionally safe and recoverable. The checker may then add one registry entry covering `drop_column` and `drop_table`, with `approvedBy` set to the checker identity and `reason` referencing this packet and its evidence-bundle hash.

## Maker-checker sign-off fields

| Field | Required value | Current state |
|---|---|---|
| Maker identity | Named data/platform engineer | Pending |
| Maker evidence bundle hash | SHA-256 | Pending |
| Checker identity | Named independent finance/security control owner | Pending |
| Decision | `REJECT_AND_REWORK` or `APPROVE_EXACT_HASH` | Pending |
| Decision timestamp | ISO-8601 | Pending |
| Recovery proof reference | Immutable artifact reference and hash | Pending |
| Reconciliation proof reference | Immutable artifact reference and hash | Pending |

## Unblocking rule

This blocker is resolved only when either (a) the migration is made non-destructive or safely staged and the refreshed safety gate passes, or (b) an authorized maker-checker decision approves this exact hash with the required evidence. Preparing this packet does not itself approve the migration.

## Release boundary

Production database targeting, credentials, deployment, statutory approval, and live authority conformance remain on the separate release-only track. This packet must not be used to target or mutate a production database.
