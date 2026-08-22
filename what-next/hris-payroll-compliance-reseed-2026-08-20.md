# HRIS/Payroll compliance reseed execution report

Date: 2026-08-20  
Scope: local development and synthetic evidence only  
Outcome: **data-remediable seed scope complete; production/external certification remains blocked**

## Safety boundary

- Database target: PostgreSQL `localhost:5432`, database `stoquify_dev_migrated_20260814`, schema `public`.
- Environment: `development`.
- No production, customer, payment-provider, bank, regulator, or real national-identifier data was introduced.
- Database roles prove application RBAC and HRIS context only. They do not prove an appointment, professional qualification, signature, regulator approval, or production authorization.
- Historical migrations, gate logic, security controls, and release thresholds were not weakened.

## Implemented scope

- Moved the compliance document to the canonical route `docs/blockers-and-gates/Compliance authorization validation.docx`; the former Compliance-directory route no longer exists and no text reference to it remains.
- Added an idempotent role/HRIS augmentation to the canonical realistic-development seed.
- Seeded 42 required role personas in each of two development organizations: 84 role records, 84 role-linked users, 84 payroll employees, 84 positions, 84 primary assignments, 84 active contracts, and 84 active schedules.
- Preserved and reused the existing realistic payroll chain, including payroll inputs, periods, attendance snapshots, runs, run lines, payslips, declarations, payment batches/allocations, compliance evidence, journals, accounting source links, close runs, close evidence, and workflow-assurance records.
- Seeded the supplied pilot location, terminal, and drawer using stable IDs and stocked the active pilot location so the POS semantic verification remains usable.
- Added database-backed evidence export and DOCX generation without placing plaintext passwords in JSON or console output.

The 42 role codes per organization are:

`super_admin`, `admin`, `branch_manager`, `inventory_manager`, `sales_manager`, `cashier_pos_user`, `purchaser`, `accountant`, `hr_manager`, `auditor`, `read_only`, `user`, `database_migration_operator`, `independent_migration_checker`, `maker`, `checker`, `product_owner`, `product_approver`, `financial_controller`, `controller_approver`, `payments_owner`, `retail_operations_owner`, `pos_architect`, `security_owner`, `treasury_owner`, `risk_owner`, `qa_owner`, `support_owner`, `sre_owner`, `order_to_cash_product_owner`, `qualified_accounting_reviewer`, `qualified_cameroon_country_pack_reviewer`, `inventory_controller`, `fulfillment_owner`, `accounting_owner`, `payroll_administrator`, `payroll_processor`, `payroll_approver`, `compensation_approver`, `attendance_time_administrator`, `manager`, and `employee_self_service`.

## Supplied identity mapping

The following names were mapped traceably in the primary development organization as `SUPPLIED_CANDIDATE`. No signature, qualification, or external authority was invented:

| Supplied identity | Application role |
|---|---|
| Sango Malo | `database_migration_operator` |
| Maximilliano Bonga | `independent_migration_checker` |
| Tamen Marceline | `maker` |
| Yonga Springfield | `checker` |
| Kouatchoua Mark | `product_approver` |
| Kouatchoua Marceline | `controller_approver` |

The accounting-review and Cameroon country-pack-review personas are explicitly classified as `SYNTHETIC_QUALIFICATION_PENDING`.

## Database evidence

| Domain | Observed rows |
|---|---:|
| Organizations | 2 |
| All users | 88 |
| Compliance roles | 84 |
| Payroll employees / active contracts | 108 / 108 |
| HRIS org units / positions / primary assignments / active schedules | 14 / 84 / 84 / 84 |
| Payroll periods / runs / run lines / payslips | 24 / 24 / 24 / 24 |
| Payroll declarations / declaration evidence | 24 / 24 |
| Payroll payment batches / allocations | 24 / 24 |
| Compliance adapter configs / submissions / evidence | 24 / 24 / 24 |
| Journal entries / accounting source links | 32 / 32 |
| Close runs / findings / evidence items | 24 / 24 / 24 |
| Workflow check runs / incidents / waivers | 24 / 24 / 24 |

Integrity results:

- Missing role codes: none in either organization.
- Roles without users or payroll employees: none.
- Role employees without active contracts, primary assignments, or active schedules: none.
- Cross-tenant employment assignments: 0.
- Self-reporting relationships: 0.
- Distinct-subject maker/checker pairs pass in both organizations for transaction maker/checker, migration operator/checker, payroll processor/approver, and payments owner/controller approver.
- Credential reconciliation: 84 role credentials plus 4 registration-test personas; all 88 credentials match database users and none is missing.

## Idempotency and focused verification

Two final consecutive `npm run seed` executions completed with exit code 0. Each reported:

> Existing realistic development seed is complete; no database rows were replaced.

Each pass regenerated 88 local login personas without printing passwords. The canonical seed's immutable-safe reuse checks accepted the existing evidence on both passes.

Additional results:

| Check | Result |
|---|---|
| `npm run prisma:validate` | PASS |
| `npm run typecheck` | PASS |
| Compliance seed contract Jest suite | PASS, 4/4 |
| `npm run seed:verify:realistic` | PASS; login, POS, stock decrement, payment, shift close |
| Payroll presence gate | PASS, 13/13 |
| Payments/declarations development gate | PASS, 9/9 |
| Accounting-close development gate | PASS, 10/10 |
| HRIS/payroll migration dry-run development gate | PASS, 11/11 |
| Current development DB `prisma:migrate:status` | Reports up to date |

The generated compliance DOCX contains 16 tables, including all 84 role rows, and has zero blank data cells. The credential DOCX contains all 88 login rows plus the 84-role authority matrix and has zero blank data cells.

## Correctly retained blockers

These items were not converted into database approvals:

- Qualified Cameroon country-pack review: **REQUIRES_HUMAN_REVIEW**.
- Qualified accounting review: **REQUIRES_HUMAN_REVIEW**.
- DGI/MINFI/CNPS signatures: **BLOCKED_EXTERNAL**.
- Production authorization: **BLOCKED_EXTERNAL**.
- Physical POS hardware certification: **NOT_APPLICABLE** to the simulated desktop POS scope.

Repository-level blockers observed outside the seed scope:

1. A fresh migration deploy fails at untracked migration `20260820100000_supplier_invoice_match_exception_boundary` with PostgreSQL `42P01` because its foreign key references `"Organization"`; the mapped table is `"organizations"`. The isolated payroll immutability runtime test therefore stops before executing its runtime assertions. The current development database reports migrations up to date, but fresh-database portability is not proven. The migration was not rewritten or falsely marked successful.
2. The repository-wide policy chain stops at the existing purchasing/AP blocker `goods_receipt_atomic_stock_posting` (10/11 checks ready). Earlier inventory, service-boundary, regulatory, public-identity, ledger-close, and payment-cash gates passed.
3. `prisma generate` encountered a Windows file lock (`EPERM` while replacing generated `edge.d.ts`). Existing generated client code remained sufficient for typechecking, seeding, database queries, and focused verification.

## Artifacts and provenance

| Artifact | SHA-256 | Handling |
|---|---|---|
| `docs/blockers-and-gates/Compliance authorization validation.docx` | `90F66B1F6AEB18B68662F8FEFCFCA244797ECEA9C810605D784344D24C49913D` | Repository compliance evidence |
| `docs/blockers-and-gates/Development database roles and passwords.docx` | `3C5C4AED6E63E06DFC734B88FC5565EFB39949A912B26C78583AC57FD442F9A0` | Development-only; explicitly Git-ignored |
| `what-next/hris-payroll-compliance-reseed-2026-08-20.json` | `A7C2A4F7837D3488482858B939E8ECABBB943D4AC6CF397795FBA9E1ADA00027` | Machine-readable database snapshot; contains no plaintext password |

Authoritative sources are recorded per field in the compliance document. Database-backed fields come from the local development database; credential plaintext comes only from the local Git-ignored seed credential artifact because the database correctly stores password hashes. This execution does not constitute legal, statutory, fiscal, security, accounting, regulator, or production release certification.
