# Isolated next-level database baseline — blocker register

- Decision ID: `USER-DIRECTIVE-20260830-ISOLATED-RESEED`
- Captured at: `2026-08-30T20:52:55+01:00`
- Authorized technical scope: create, reset, migrate, seed, and verify only `localhost:5432/stoquify_replay_next_20260830`
- Tenant scope: `rds_org_001`, `rds_org_002`
- Previous database: `stoquify_dev_migrated_20260814` — preserved and not reset
- Evidence source: the user's instruction in the current Codex task to proceed using the supplied blocker list
- Approval classification: `UNVERIFIED_CHAT_DIRECTIVE`
- Approver identity/control role: `UNVERIFIED`

The chat directive is sufficient evidence for the requested local development operation, but it is not an authenticated control-owner approval, signed ticket, or production authorization.

## Verification summary

- Fresh replay: 80 of 80 migrations applied; no missing, unknown, unfinished, rolled-back, or checksum-mismatched migration.
- Migration status after final seed: database schema is up to date.
- Seed: completed for two isolated demo tenants; 98 login personas generated without printing plaintext passwords.
- Read-only verification: `PASS`; PostgreSQL reported `transaction_read_only=on` inside the verification transaction.
- Inventory: 20 active, valid, stocked items at every active location.
- Finance: DRAFT, POSTED, REVERSED, and VOIDED journals; XAF, EUR, and USD; open and closed periods; balanced non-void journals; AR/AP, payments, refunds, match/suspense, cash history, close evidence, and accounting source links.
- RBAC: all ten required personas exist in both tenants. `external_accountant` has an explicit finance read/export allow-list and no journal mutation, approval, reversal, or period-close permission.
- Contract tests: 10 passed.

## Blocker disposition

| Blocker | Status | Evidence / residual |
| --- | --- | --- |
| TRB-001 | CLOSED | Dedicated local replay database created; destructive operations were restricted to its exact name. |
| TRB-002 | CLOSED | Exact bilingual `external_accountant` role and explicit permission contract seeded and verified. Export is permitted only through the finance-export permission; its role policy requires server-finalized, audited, and redacted output. |
| TRB-003 | OPEN — GOVERNANCE | This record captures the user directive, exact target, tenants, timestamp, and decision. The approver's authenticated identity and control-owner role remain unverified and must not be inferred. |
| TRB-004 | PARTIAL | Required accounts, roles, active state, credential hashes, and login verification are complete. The credential artifact is local and git-ignored; an approved external secret-manager location has not been supplied. |
| TRB-005 | OPEN — UI EVIDENCE | Authenticated desktop/tablet/mobile, EN/FR, persona, and accessibility browser evidence was not produced by this database operation. |
| TRB-006 | CLOSED — DATA | Finance fixture coverage and balances passed the read-only data gate. Rendered/exported statement UI evidence remains part of TRB-005. |
| TRB-007 | CLOSED | Canonical verification is database-enforced read-only; the write-capable POS flow is a separately named smoke command. |
| TRB-008 | OPEN — PROCESS LOCK | Prisma generation remains blocked by a Windows `EPERM` lock held by the running application process. No Prisma schema change was made, so the existing generated client remains compatible. Stop the locking process and rerun `npm run prisma:generate`. |
| TRB-009 | MITIGATED | Certification artifacts were written to unique report paths. The generic Windows lock condition may recur while another process holds a report file. |
| TRB-010 | CLOSED | The seed and verifier require and confirm 20 curated products per active location with valid stock arithmetic and references. |

## Evidence artifacts

- `what-next/migrations/isolated-next-level-fresh-replay-20260830.md`
- `what-next/migrations/isolated-next-level-fresh-replay-20260830.json`
- `scripts/verify-realistic-development-seed-readonly.ts`
- `.seed-artifacts/seed-login-credentials.json` (local secret-bearing artifact; never attach to reports or commit)
