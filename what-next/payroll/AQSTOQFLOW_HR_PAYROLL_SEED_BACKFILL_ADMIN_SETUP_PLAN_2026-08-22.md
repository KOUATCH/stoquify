# AqStoqFlow HR/Payroll Seed, Backfill, and Admin Setup Plan

Date: 2026-08-22  
Selected skill: `aqstoqflow-hrpayroll-06-seed-backfill-setup`  
Prompt: Migration, Seed, Backfill, And Payroll Admin Setup  
Execution state: `COMPLETE_LOCAL_DEVELOPMENT_ONLY`

## Decision

The requested reseed is authorized only for the confirmed local development database. It will populate the 17 names from `COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_RECONCILED_WORKING_COPY_2026-08-19.docx` in the primary development tenant while retaining the complete extended 42-role catalog and a second synthetic tenant for isolation testing.

The reseed does not convert any candidate into a verified employee, governance appointee, qualified reviewer, signer, G1 approver, or production authority. Seeded HRIS employment and contracts remain synthetic development fixtures with unresolved authentic signatures and qualification evidence.

## Prerequisite gate

| Check | Dry-run result |
|---|---|
| Target environment | `NODE_ENV=development` |
| Database host | `localhost:5432` |
| Database name | `stoquify_dev_migrated_20260814` |
| Production/managed database | No |
| Source compliance document | Present and read-only |
| Prisma schema | PASS |
| Focused seed contract | PASS, 4/4 |
| Tenant strategy | Two `rds_org_` tenants; supplied candidates only in tenant 001 |
| Credential handling | Plaintext values remain under Git-ignored `.seed-artifacts/` |
| Backup | PASS — custom-format dump created before reset |

Dry-run decision: `PROCEED_AFTER_LOCAL_BACKUP`.

Execution decision: `COMPLETE_LOCAL_DEVELOPMENT_ONLY`. This decision does not authorize G0/G1, statutory, managed-environment, or production use.

## Pre-reseed inventory

| Record class | Count |
|---|---:|
| Organizations | 2 |
| `rds_org_` organizations | 2 |
| Users | 84 |
| `rds_org_` users | 84 |
| Payroll employees | 108 |
| `rds_org_` payroll employees | 108 |
| `rds_org_` roles | 84 |
| `rds_org_` payroll declaration evidence | 24 |
| `rds_org_` posted/paid/archived payroll runs | 0 |

The 24 immutable declaration-evidence rows are synthetic development fixtures. A complete local PostgreSQL dump must be created before reset so this reseed is recoverable.

## Document candidate mapping

| Role code | Source name | Seed treatment |
|---|---|---|
| `product_owner` | Arielle Yongwa | Supplied candidate, tenant 001 only |
| `financial_controller` | Tchami Jennifer | Supplied candidate, tenant 001 only |
| `payments_owner` | Yonga Junie | Supplied candidate, tenant 001 only |
| `retail_operations_owner` | Tamen Max | Supplied candidate, tenant 001 only |
| `pos_architect` | tchakoumiLorrain | Exact source spelling retained |
| `security_owner` | Yonga Springfield | Supplied candidate; authority/SoD unresolved |
| `treasury_owner` | Tamen Stanick | Supplied candidate, tenant 001 only |
| `risk_owner` | Tamen Martial | Supplied candidate, tenant 001 only |
| `qa_owner` | Sonkeng Steve | Supplied candidate, tenant 001 only |
| `support_owner` | Etoo Naomie | Supplied candidate, tenant 001 only |
| `qualified_cameroon_country_pack_reviewer` | Kouatchoua mMark | Exact source spelling; qualification pending |
| `sre_owner` | Ronald Djakou | Supplied candidate, tenant 001 only |
| `order_to_cash_product_owner` | Tamen Marceline | Supplied candidate; identity-role conflict unresolved |
| `qualified_accounting_reviewer` | Tchana Nikita | Qualification pending |
| `inventory_controller` | Tchana Rose | Supplied candidate, tenant 001 only |
| `fulfillment_owner` | Yonga Lysette | Supplied candidate, tenant 001 only |
| `accounting_owner` | Yongwa Eli | Supplied candidate, tenant 001 only |

Additional supplied development candidates already retained by the seed include Sango Malo, Maximilliano Bonga, Tamen Marceline, Yonga Springfield, Kouatchoua Mark, and Kouatchoua Marceline for migration, maker/checker, and approval test roles. Duplicate-name and source conflicts remain visible rather than being silently merged.

## Extended role catalog retained

The canonical seed continues to register 42 role personas per tenant:

- Administration and operations: `super_admin`, `admin`, `branch_manager`, `inventory_manager`, `sales_manager`, `cashier_pos_user`, `purchaser`, `accountant`, `hr_manager`, `auditor`, `read_only`, `user`.
- Controlled operations: `database_migration_operator`, `independent_migration_checker`, `maker`, `checker`, `product_approver`, `controller_approver`.
- G1/control roles: all 17 document roles listed above.
- Payroll/HRIS: `payroll_administrator`, `payroll_processor`, `payroll_approver`, `compensation_approver`, `attendance_time_administrator`, `manager`, `employee_self_service`.

## Mutation plan

1. Create a timestamped custom-format PostgreSQL dump under `.seed-artifacts/database-backups/`.
2. Run `prisma migrate reset --force --skip-seed` against the confirmed local development database.
3. Run the canonical `npm run seed`, which invokes `prisma/realistic-development-seed.ts`.
4. Verify 17/17 role/name bindings in tenant 001, 42/42 extended roles in each tenant, tenant-scoped HRIS links, and unresolved authority metadata.
5. Rerun the seed without reset and prove count stability/idempotent augmentation.
6. Regenerate the local credential inventory and credential DOCX without printing passwords.
7. Run focused seed, Prisma, tenant, and payroll gates.

## Stop conditions

- Database target ceases to resolve to local development PostgreSQL.
- Backup fails.
- Reset attempts a non-local or production-named database.
- Any document candidate is absent from its intended role.
- Tenant 002 receives tenant-001 supplied identities.
- Seed metadata claims appointment, signature, qualification, G1 approval, or production authorization.
- Rerun changes stable fixture counts or creates duplicate users/roles.
- Credential artifacts escape `.seed-artifacts/`.

## Authority and release boundary

Application RBAC and seeded HRIS rows are development access fixtures only. G0/G1 human identity verification, legal-employer binding, appointments, SoD/COI review, qualified-review evidence, fresh-auth approvals, provider/authority evidence, managed-database proof, and final production release remain open.

Production authorization: `NO`.

## Execution results

### Recoverability and migration replay

- Backup: `.seed-artifacts/database-backups/stoquify_dev_migrated_20260814_pre-g1-reseed_2026-08-22T15-42-16-256Z.dump`
- Backup size: `4,637,321` bytes
- Backup SHA-256: `75950b37fa7d22f591d108147c1127ed6ac08dbf7c672f765eb054167bd9d291`
- Reset target: local PostgreSQL `stoquify_dev_migrated_20260814`, `public` schema, `localhost:5432`
- Reset result: PASS; all 78 migrations applied and Prisma reports the schema up to date.

Fresh replay exposed a historical enum-creation ordering defect and same-named enum leakage from retained PostgreSQL schemas. Two additive, idempotent bridge migrations now create the workflow-assurance enum families in the current schema before the historical consumers run:

- `prisma/migrations/20260621102500_workflow_assurance_enum_bridge/migration.sql`
- `prisma/migrations/20260621112500_workflow_assurance_incident_enum_bridge/migration.sql`

No historical migration checksum was changed. Existing databases where the enums already exist in the current schema receive a no-op.

### Seeded result

| Record class | Final count | Verification |
|---|---:|---|
| Organizations | 2 | PASS |
| Extended roles | 84 | PASS — 42 per tenant |
| Users | 88 | PASS — 44 per tenant |
| Payroll employees | 108 | PASS |
| Payroll contracts | 108 | PASS |
| HRIS assignments | 84 | PASS |
| HRIS positions | 84 | PASS |
| HRIS organization units | 14 | PASS |
| Document candidates | 17 | PASS — exact role/name bindings in tenant 001 |
| Tenant-002 supplied-name matches | 0 | PASS |
| Development login personas | 88 | PASS — Git-ignored credential inventory |

Every document candidate is linked to an active verified application user and a tenant-scoped payroll employee in tenant 001. The source classification remains `SUPPLIED_CANDIDATE`; appointment status remains `RBAC_AND_HRIS_CONTEXT_ONLY`; signature evidence remains unclaimed; qualified-review roles remain fail-closed with `REQUIRES_QUALIFIED_HUMAN_REVIEW`.

The second seed completed as a no-op. Counts and sorted stable-ID hashes were identical across organizations, roles, users, payroll employees, payroll contracts, HRIS assignments, positions, and organization units. Secret-free verification evidence is stored in `.seed-artifacts/g1-reseed-idempotency-comparison.json`.

### Evidence documents

- Refreshed seeded reconciliation DOCX: `docs/blockers-and-gates/hris-payroll-compliance-prefill/COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_SEEDED_RECONCILIATION_REFRESHED_WORKING_COPY_2026-08-22.docx`
- Seeded reconciliation PDF: `docs/blockers-and-gates/hris-payroll-compliance-prefill/COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_SEEDED_RECONCILIATION_WORKING_COPY_2026-08-22.pdf`
- Secret-free manifest: `docs/blockers-and-gates/hris-payroll-compliance-prefill/COMPLIANCE_AUTHORIZATION_G1_EVIDENCE_SEEDED_RECONCILIATION_MANIFEST_2026-08-22.json`
- Sensitive credential DOCX source: `.seed-artifacts/SEEDED_DEVELOPMENT_LOGIN_CREDENTIALS_2026-08-22.docx`
- Requested password-document destination: `docs/blockers-and-gates/Development database roles and passwords.docx` — Git-ignored and hash-matched to the refreshed source
- Previous password-document backup: `.seed-artifacts/credential-document-backups/Development database roles and passwords.pre-g1-reseed-2026-08-22.docx`

The original generated reconciliation DOCX was open and Windows-locked. It was preserved; the regenerated DOCX was written to the `REFRESHED` path above. Validation retained all source content, appended the reconciliation evidence, covered 17 canonical and 4 additional controlled roles, produced 88 credential rows, and found zero password leakage in tracked outputs.

### Verification matrix

| Check | Result |
|---|---|
| TypeScript typecheck | PASS |
| Prisma schema validation | PASS |
| Prisma migration status | PASS — 78 migrations, schema up to date |
| Focused seed contract | PASS — 4/4 |
| Payroll tenant-boundary and privacy tests | PASS — 6/6 |
| Payroll presence gate | PASS — 14/14 |
| Payroll Trust Spine gate | PASS — 6/6 |
| Service-boundary gate | PASS — 0 active violations |

### Final disposition

Development reset/reseed: `COMPLETE`.

G0 human-input handoff: `OPEN`.  
G1 authority/authorization: `OPEN`.  
Statutory qualification and production authority: `NOT AUTHORIZED`.  
Managed-database and operational release proof: `NOT ESTABLISHED`.
