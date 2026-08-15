# Database, schema, migration, and seed reconciliation — 2026-08-15

## Decision

Status: **complete**. The repository schema, migration history, disposable replay, realistic seed, configured-database installation, login verification, and POS transaction proof are complete.

No additional reconciliation migration was created. The two latest repository migrations are the complete incremental representation of yesterday's development:

- `20260815120000_supplier_po_acknowledgement_pilot`
- `20260815130000_governed_master_data_onboarding`

The schema-to-fresh-database comparison found no missing table, column, enum, constraint, or index requiring a 65th migration. Its residual output consisted of legacy/default and constraint-name metadata, so creating an empty or cosmetic migration would have reduced rather than improved migration truth.

## Evidence summary

| Control | Result |
| --- | --- |
| Prisma schema | PASS — 184 models, 187 enums; `prisma validate` succeeded |
| Repository migrations | PASS — 64 non-empty migrations |
| Fresh replay | PASS — all 64 migrations applied to `stoquify_local_reconcile_20260815_03` |
| Configured database status | PASS — `stoquify_dev_migrated_20260814` is at 64/64 |
| Migration history health | PASS — 9/9 checks, no missing, unknown, unfinished, duplicate, or checksum-mismatched rows |
| Schema drift decision | PASS — no missing physical schema; no new migration justified |
| Seed execution on disposable DB | PASS — first installation plus validated second-run no-op |
| Immutable evidence behavior | PASS — rerun preserves payroll evidence; partial datasets fail closed |
| Credential verification | PASS — Admin, Branch Manager, Cashier, Inventory Manager, and Accountant authenticated through the application password verifier |
| POS readiness | PASS — 12 stocked catalog items; seven distinct lines sold in one paid transaction; inventory decremented exactly once |
| Configured DB seed | PASS — complete `rds_` dataset installed and canonical no-op rerun verified |

## Migration history and safety

The configured local target reports 64 applied migrations and no pending migration. The read-only migration-history gate is ready (9/9).

The production migration safety gate remains correctly blocked by 13 unapproved destructive statements in `20260611130000_accounting_auth_baseline_bridge`. This is a pre-existing release-control finding; no approval was invented and no gate was weakened. It does not indicate drift in the current local database, where that historical migration is already applied.

## Seed architecture

- Canonical entry point: `prisma/realistic-development-seed.ts`
- Dataset builder: `prisma/comprehensive-seed.ts`
- Full-model coverage builder: `prisma/comprehensive-seed-coverage.ts`
- Immutable-safe rerun verifier: `prisma/realistic-seed-rerun.ts`
- Runtime proof: `scripts/verify-realistic-development-seed.ts`
- Credential artifact: `.seed-artifacts/seed-login-credentials.json` (Git-ignored, local plaintext, development only)
- Faker seed: `20260527`
- Versioned database ID prefix: `rds_`

The versioned ID, email, phone, document, session, and invite namespaces prevent collision with older fixtures. A complete `rds_` dataset is verified and retained on rerun. A partial dataset is rejected by the canonical entry point. Recovery utilities either refuse to delete immutable evidence or add missing coverage rows with duplicate-safe creation.

## Verification commands

- `npm run prisma:generate` — PASS
- `npm run prisma:validate` — PASS
- `npm run prisma:migrate:status` — PASS, 64/64
- `node scripts/prisma-migration-history-health-check.js ...` — PASS, 9/9
- `node scripts/prisma-local-fresh-bootstrap.js --database stoquify_local_reconcile_20260815_03` — PASS
- `npm run seed` against the disposable target, run 1 — PASS
- `npm run seed` against the disposable target, run 2 — PASS, validated no-op
- `npm run seed:verify:realistic` against the disposable and configured targets — PASS
- focused ESLint for the seed/verification files — PASS
- focused Jest credential/POS suites — PASS, 23/23 tests
- `npm run typecheck` after all final seed and verification changes — PASS

## Review record

Architecture, backend ownership, data quality, security, migration safety, accounting, inventory, and test concerns were reviewed against repository code and database evidence. Independent delegated reviewer findings are N/A because this execution was constrained to the primary agent; no independent sign-off is claimed.

## Remaining action

No database or seed action remains. Production deployment remains independently blocked by the pre-existing unapproved destructive-migration safety finding described above.
