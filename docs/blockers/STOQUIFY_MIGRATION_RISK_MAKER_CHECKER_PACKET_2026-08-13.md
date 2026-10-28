# Stoquify destructive Prisma migration maker-checker packet

- Packet ID: `MIG-RISK-20260611130000-F7DE8DC7-RECONCILED-2026-08-13`
- Reconciled: `2026-08-13`
- Status: `BLOCKED_EVIDENCE_INCOMPLETE_NO_DECISION`
- Recommended disposition: `REJECT_AND_REWORK` unless the evidence below proves the exact hash is safe for the selected deployment path
- Production execution authorized: `false`
- Approval claimed: `false`
- Migration modified by this packet: `false`

This packet reconciles, and does not overwrite, the 2026-08-11 packet. The predecessor Markdown is bound at SHA-256 `39a29b2a0250de247fa9c8770afcb8bb36952ffb81db181c782cea45a0010d69`; its JSON is bound at SHA-256 `d5985fe42be044a91d493315191e169dcfe1d83411f635dd63a0ba7604f631a5`.

## Exact migration identity and execution boundary

- Migration: `prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql`
- SHA-256: `f7de8dc7ace0a5e063cdb7ecd9527e77807b7f872e474546819e9fca13a273d4`
- Byte length: `24674`
- SQL statements containing destructive operations: `4`
- Destructive operations reported by the gate: `13` (`12 drop_column`, `1 drop_table`)
- Destructive-operation inventory SHA-256: `55d332c3319b65acfdf415e64042a15504d12861b664429af7e63155296e1ad1`
- Exact-hash approvals currently present: `0`

The migration declares itself a baseline-only bridge. Lines 1-4 say an existing database must use `prisma migrate resolve --applied` after schema and data verification and must not execute the file. The guard at lines 7-29 aborts when target objects already exist or when `organizations`, `users`, `accounts`, `sessions`, or `auth_sessions` contains a row. This guard is meaningful evidence, but it is not rehearsal, backup, rollback, or approval evidence.

Any byte change to the migration invalidates the file hash and this packet. Any change to an operation's canonical SQL invalidates its operation hash. The machine-readable companion defines the hash canonicalization and binds the consumer and evidence-source files.

## Inventory of all 13 destructive operations

The gate counts destructive operations, not top-level SQL statements: nine drops occur within one `ALTER TABLE accounts` statement, two within one `ALTER TABLE sessions` statement, one within `ALTER TABLE users`, and one is a `DROP TABLE` statement.

| ID | Line | Canonical operation | Operation SHA-256 | Replacement in this migration | Affected data and current consumers | Assessment |
| --- | ---: | --- | --- | --- | --- | --- |
| D-001 | 80 | `ALTER TABLE "accounts" DROP COLUMN "access_token"` | `5f9f80a6ef931e002134e4e2aa220ea9acf22c3c2134496e0671affe147988c0` | Adds `accessToken` at line 89; no copy | OAuth bearer/access tokens. Better Auth's Prisma adapter and OAuth/API auth boundary use the current `Account` model. | Rename-like drop/add; existing values are not preserved. |
| D-002 | 81 | `ALTER TABLE "accounts" DROP COLUMN "expires_at"` | `b7eab3bc9315a06e40938ff57ded5c5431ed2222fe68dd09b3f587aa7c69090f` | Adds `accessTokenExpiresAt TIMESTAMP(3)` at line 90; no conversion | Legacy integer token-expiry values versus current timestamp expiry. Better Auth OAuth token lifecycle is the consumer. | Transformation units and timezone semantics are unproved; no backfill exists. |
| D-003 | 82 | `ALTER TABLE "accounts" DROP COLUMN "id_token"` | `9617601b5fa48b23905e69ab0709e24ac42a9aeac346621a19f4af0d4fa46889` | Adds `idToken` at line 93; no copy | OAuth/OpenID identity tokens used through Better Auth account persistence. | Rename-like drop/add; existing values are not preserved. |
| D-004 | 83 | `ALTER TABLE "accounts" DROP COLUMN "provider"` | `8b5c158498132b69a3f1d9ee8fb82ccc46676000e296d6beead2cf6356a8b26d` | Adds required `providerId` at line 95; no copy | Provider identity and the current `providerId_accountId` uniqueness contract. Consumers include Better Auth, credential-account lookup, and account linking. | Required replacement would fail on a non-empty table if the guard were bypassed; identity mapping is unproved. |
| D-005 | 84 | `ALTER TABLE "accounts" DROP COLUMN "providerAccountId"` | `4e87e6a7aa428e2c1ff064889c6b7c140a9e458bbf99ca558d7fe461ad111252` | Adds required `accountId` at line 91; no copy | Provider-side subject/account identifier and the current composite unique key used by Better Auth and credential upsert. | Required replacement would fail on a non-empty table if the guard were bypassed; account-link identity can be lost. |
| D-006 | 85 | `ALTER TABLE "accounts" DROP COLUMN "refresh_token"` | `eb731b37536517b7ff029fb4029e0413b15b95911de15c47d49adee177966cfc` | Adds `refreshToken` at line 96; no copy | OAuth refresh tokens persisted through the Better Auth adapter. | Rename-like drop/add; users may have to reconnect or reauthenticate. |
| D-007 | 86 | `ALTER TABLE "accounts" DROP COLUMN "session_state"` | `d78e048f5e398174730608db403aac86b2e829c97c731ef3e872a88683db3b82` | None | Legacy OAuth session-state metadata. No direct current field or direct runtime consumer was found in the traced current code. | Retention/deletion decision is still required; absence of a current consumer is not proof that stored values are disposable. |
| D-008 | 87 | `ALTER TABLE "accounts" DROP COLUMN "token_type"` | `0f20190067a5fe024673fb1985a6d656ac380dca7266d2469ade5831a37a1f3b` | None | Legacy OAuth token-type metadata. No direct current field or direct runtime consumer was found. | Retention/deletion decision is required, especially for provider evidence and incident review. |
| D-009 | 88 | `ALTER TABLE "accounts" DROP COLUMN "type"` | `d57e56dd40511f3240b0efd4eeeb8483d2589e5bef799c7d1fd458a0c8b3a8d6` | None | Legacy account/provider classification. The current model distinguishes providers through `providerId` and credential-account behavior. | Classification values are discarded; mapping or intentional-deletion evidence is absent. |
| D-010 | 101 | `ALTER TABLE "sessions" DROP COLUMN "expires"` | `84c1f1c438a50d09814575e756f95e636c4d0cbd0b7814eecb622e500bd31a95` | Adds required `expiresAt` at line 104; no copy | Active-session expiry used by Better Auth, `requireSession`, revocation, security settings, and password step-up. | Required replacement would fail on a non-empty table if the guard were bypassed; active sessions would not be preserved. |
| D-011 | 102 | `ALTER TABLE "sessions" DROP COLUMN "sessionToken"` | `eba142f101ee62145d06759f392bea86a325dade07838aeff2d52be93ac73076` | Adds required unique `token` at line 106; no copy | Active session tokens used by Better Auth, session verification, revocation, security settings, and step-up assurance. | Required replacement would fail on a non-empty table if the guard were bypassed; all active sessions can be invalidated. |
| D-012 | 112 | `ALTER TABLE "users" DROP COLUMN "emailVerified"` | `6ee6d1bbaa68a1cba355923e93db7f5489648b2dbe4d3685a0c865d1c36f7d88` | Re-adds Boolean `emailVerified NOT NULL DEFAULT false` at line 113; no transform | Legacy nullable verification timestamps. Current Boolean is enforced by Better Auth, RBAC, user lifecycle, security settings, and user-management UI. | Verified timestamps are reset to `false`; users relying on this field can be denied sign-in/access. |
| D-013 | 116 | `DROP TABLE "auth_sessions"` | `0f5eb881cca0bd115195a7aa7f27045beb5d02b8d6dde09684cc190c3a5df3bd` | None | Legacy session/security rows: JTI, user, organization, last-auth time, IP, user agent, revocation actor/reason, expiry, and last-seen time. No direct current runtime consumer was found; the current schema instead uses `sessions` with assurance fields. | Complete loss of security provenance and revocation history unless zero-row or retention evidence proves deletion is acceptable. |

## Codebase consumer map

| Consumer group | Current evidence | Destructive IDs | Operational impact |
| --- | --- | --- | --- |
| Better Auth persistence and API/client boundary | `lib/auth.ts`, `app/api/auth/[...all]/route.ts`, `lib/auth-client.ts`, `lib/auth-server.ts` | D-001-D-012 | Sign-in, OAuth account linking, token persistence, session creation/read, and verification behavior. |
| Credential account and password lifecycle | `lib/security/auth-credentials.ts`, `services/security/security-settings.service.ts` | D-004, D-005, D-009-D-011 | Credential upsert/lookup, password verification, password-change session revocation, and security-account status. |
| Session assurance, revocation, and fresh-auth controls | `lib/security/auth-session.ts`, `services/security/step-up-auth.service.ts`, `actions/security/step-up-auth.actions.ts` | D-010, D-011, D-013 | Active-session validation, expiry, token matching, step-up assurance, lockout, and session revocation. |
| Email-verification/RBAC and user administration | `lib/security/rbac.ts`, `lib/security/server-authz.ts`, `services/users/user-identity.service.ts`, `services/users/user-lifecycle.service.ts`, settings security/users UI | D-012 | Email-verification gate, safe-user projections, lifecycle updates, verified-user counts and status display. |
| Legacy security provenance | Source definition in `20260528124341_refine_item_barcode`; current schema has no `AuthSession` model and the scoped runtime search found no direct `auth_sessions` access | D-013 | Not an active runtime dependency, but retained security/audit data may still be required. |

Graph evidence corroborates the breadth of this boundary: `graphify-out/GRAPH_REPORT.md` places auth/RBAC hardening in Community 3, tenant-boundary auth controls in Community 12, registration/auth flows in Community 25, and the authentication architecture in Community 30. The current file trace above is authoritative because that graph was generated on 2026-06-14.

## Evidence already present

| Evidence ID | Present evidence | Result and limitation |
| --- | --- | --- |
| P-01 | Exact current migration hash and byte length match the predecessor packet | Present. This binds the SQL but says nothing about database contents. |
| P-02 | Live static scan on 2026-08-13 | Present. `62` migrations, `13` findings, `0` approved findings; status remains blocked on `destructive_sql_is_exact_hash_approved`. No database was targeted. |
| P-03 | Baseline-only comment and transactional guard | Present. It prevents execution on detected non-empty/auth-target databases. No proof exists that every controlled environment will follow the resolve-only path. |
| P-04 | Empty risk and checksum approval registries | Present. They prove no approval has been recorded. |
| P-05 | Gate implementation and focused tests | Present. Whole-file exact-hash binding is enforced; the focused suite passed `10/10` on 2026-08-13, including changed-hash rejection and secret non-disclosure. |
| P-06 | Current schema validation | Present. `npm run prisma:validate` passed on 2026-08-13. Schema validity does not prove migration safety or data preservation. |
| P-07 | Source-to-target schema and consumer trace | Present in this packet and its JSON companion, with per-file hashes. Database row counts and actual values remain unknown. |
| P-08 | Production migration runbook | Present. It requires backfill, lock/compatibility review, backup/restore, and fix-forward evidence before approval. It does not contain completed evidence for this hash. |
| P-09 | Prior blocker reports | Present. They request environment census, affected-data profiles, restore proof, rehearsal, recovery, and independent review; they do not supply those artifacts. |

## Exact evidence still required

### Rehearsal evidence

The maker must select and attest exactly one path for each controlled environment.

1. `EXECUTE_EMPTY_BASELINE`: prove from a redacted environment census and preflight query output that `organizations`, `users`, `accounts`, `sessions`, and `auth_sessions` contain zero rows and that the target objects checked by the guard are absent. On an isolated production-like database, apply the full migration chain from zero; archive command transcript, migration status, schema diff, lock/duration telemetry, and auth smoke results. Acceptance requires the guard to pass, all migrations to apply once, a second deploy to be a no-op, and the resulting schema to match the bound Prisma schema.
2. `RESOLVE_EXISTING_DATABASE`: do not execute this SQL. Restore or clone a production-like database, prove it already has the target `Account`, `Session`, `User`, verification, and accounting objects with compatible columns, types, indexes, constraints, and row-level data; record before/after row counts and deterministic checksums; rehearse `prisma migrate resolve --applied 20260611130000_accounting_auth_baseline_bridge`; then prove migration status is clean and the operation changes only migration history. Acceptance requires zero application-table DDL/DML and unchanged control totals.

For either path, attach:

- environment census with redacted target identity, current migration-history row/checksum, chosen path, and accountable operator;
- preflight profiles for every affected field/table: total rows, non-null rows, distinct values, duplicate/collision checks for `(provider, providerAccountId)` and `sessionToken`, timestamp conversion rules, verified-user counts, active-session counts, and `auth_sessions` retention classification;
- an isolated rehearsal log bound to the migration SHA-256, schema SHA-256, database clone/snapshot reference, tool versions, start/end timestamps, exit codes, lock observations, and post-rehearsal migration status;
- reconciliation output proving the intended mapping or intentional zero-row/deletion decision for each D-001-D-013;
- focused authentication tests covering credential sign-in, configured OAuth account linking/token refresh, email-verification enforcement, active-session continuity or intentional revocation, password-change revocation, and password step-up.

No hash-bound environment census, affected-row profile, execution rehearsal, resolve-only rehearsal, lock-impact result, data reconciliation, or production-like auth smoke artifact is currently present.

### Backup, restore, rollback, and forward-recovery evidence

Before any decision that could permit execution or history mutation, attach all of the following:

- encrypted backup/snapshot reference taken immediately before the rehearsed action, with target identity, timestamp, retention/PITR window, operator, SHA-256 or provider integrity identifier, byte size where available, and access-control/KMS reference; credentials and token values must be redacted;
- successful restore into a separate isolated database, with restore transcript, integrity verification, table/row/control totals for `accounts`, `sessions`, `users`, `auth_sessions`, and `_prisma_migrations`, plus measured restore time and accepted RPO/RTO;
- tested recovery runbook selecting either snapshot restore plus previous compatible application artifact, or a reviewed forward-only remediation. Prisma has no generated down migration, so a statement that transaction rollback exists is insufficient after a successful deployment;
- failure-injection result showing the transaction leaves no partial DDL when the guard or a required-column operation fails;
- for resolve-only adoption, a tested metadata-recovery procedure and independent verification that changing migration-history state does not alter application tables;
- named rollout and recovery operators, stop conditions, monitoring window, and post-action authentication/migration-health checks.

Generic runbook language exists, but no backup identifier, backup hash, restore test, RPO/RTO result, recovery rehearsal, previous-application artifact, or operator acceptance is bound to this migration hash.

### Independent maker-checker approval evidence

Approval remains absent. A complete decision record must include:

- maker identity and role, preparation timestamp, chosen path per environment, D-001-D-013 disposition, and one SHA-256 evidence-bundle manifest that binds every rehearsal, profile, backup/restore, recovery, test, and source artifact;
- checker identity, role/authority, conflict/independence declaration, and proof the checker is not the maker or execution operator;
- checker verification of the migration hash, destructive inventory hash, packet hash, evidence-bundle hash, environment census, recovery proof, reconciliation results, and all acceptance criteria;
- exactly one explicit decision: `REJECT_AND_REWORK` or `APPROVE_EXACT_HASH`, with rationale and ISO-8601 decision timestamp;
- if and only if `APPROVE_EXACT_HASH` is chosen, a separately reviewed entry in `prisma/migration-risk-approvals.json` for this exact path/hash and both `drop_column` and `drop_table`, with the checker identity and reason referencing the immutable evidence-bundle hash.

The current registry format records one `approvedBy` identity but does not itself prove maker/checker separation or bind rehearsal/restore artifacts. The signed or otherwise immutable decision artifact must carry that evidence. This packet leaves all maker and checker fields null and does not add an approval-registry entry.

## Gate disposition

| Gate | Result |
| --- | --- |
| Architecture/context | Passed for packet construction: migration, predecessor schema, current schema, graph report, guard, runbook, and consumers were reviewed. |
| Tenant/RBAC/security impact | Blocked: environment data profiles and auth/session/verification rehearsal are absent. |
| Data integrity and recoverability | Blocked: no mapping reconciliation, backup/restore proof, or tested recovery exists. |
| Evidence/observability | Blocked: no hash-bound environment/rehearsal/restore bundle exists. |
| Independent approval | Blocked: maker and checker are unnamed; no decision exists; approval registries are empty. |
| Static verification | Passed for the evidence available: schema validation passed, gate tests passed, and the live scan failed closed exactly as expected. |

## Non-claim and unblocking rule

This packet is an inventory and evidence-gap record. It does not approve the migration, authorize production database targeting, mutate migration history, certify data loss as acceptable, or claim legal/accounting approval.

The blocker closes only when either:

1. the migration strategy is reworked and the refreshed safety gate passes without an unsupported destructive approval; or
2. an authorized independent checker records an evidence-backed decision for this exact migration hash and exact evidence-bundle hash after every required item above passes.
