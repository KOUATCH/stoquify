# Table Remediation Reseed Readiness

**Run date:** 2026-08-30  
**Repository:** `E:\ohada saas\Focused projects\stoquify`  
**Mode:** Rerun of readiness and verification instructions  
**Execution status:** Comprehensive reseed not executed; the existing realistic verifier performed a scoped POS test write

## Executive decision

The current populated development database must not be reseeded yet. No isolated disposable target, target-specific approval, authenticated credentials, or control-owner approval reference was supplied. The repository is migration-current and the focused finance/table contract tests pass. The realistic seed verifier passed its own POS flow on this rerun, but it is write-capable and created scoped POS test records in the current development database. Its output also reported only 12 catalog items and 12 stocked items, which does not prove the required 20 items per location.

No role, user, tenant, permission, or entitlement was modified by this run. The verifier did modify business data by creating a POS session, sale, payment, inventory decrement, and audit records.

## Verification results

| Check | Result | Evidence |
|---|---|---|
| Prisma schema validation | PASS | `npm run prisma:validate`; schema valid |
| Migration status | PASS | 80 migrations found; database schema up to date |
| Prisma Client generation | BLOCKED | `EPERM` replacing `node_modules/.prisma/client/index.js` |
| Migration history health | BLOCKED | `EPERM` writing configured `what-next` report files |
| Realistic seed verification | PASS WITH SIDE EFFECT | Verifier completed POS flow but wrote a session, sale, payment, inventory decrement, and audit records |
| Finance/table contract tests | PASS | 5 suites, 19 tests passed |
| Comprehensive reseed | NOT RUN | No isolated disposable target and approval supplied |

## Rerun side effect

The existing `seed:verify:realistic` command is not a read-only verifier. It reported a successful POS flow for `rds_org_001`, including 12 catalog items, 12 stocked items, 7 distinct items sold, a completed paid sale, inventory decrement verification, and a closed shift result. Because the command creates transactional and audit records, it must not be used again against the current populated database. The current database should no longer be treated as a clean baseline for evidence without an owner-approved reconciliation or restore decision.

## Reconciled tenant and persona data

These values are database observations from prior read-only reconciliation and must remain subject to revalidation before any write operation.

| Tenant | Database identity | Current role/persona observations |
|---|---|---|
| `rds_org_001` | `Wilkinson - Feeney 001`; slug `cmp-rds-org001-convergence`; `CM`; `XAF`; active | `accounting_owner`: Yongwa Eli; `accountant`: Nadia Essomba; `support_owner`: Etoo Naomie; `auditor`: Helene Mbarga; `qualified_accounting_reviewer`: Tchana Nikita |
| `rds_org_002` | `McDermott, Greenholt and Johnson 002`; slug `cmp-rds-org002-e-commerce`; `CM`; `XAF`; active | `accounting_owner`: Francis Mbe; `accountant`: Nadia Essomba; `support_owner`: Pascal Ekotto; `auditor`: Helene Mbarga; `qualified_accounting_reviewer`: Blandine Menye |

The exact `external_accountant` role was not found in either tenant. `Tamen Marceline` is present in the canonical role-seed source as the `order_to_cash_product_owner` source name, but that does not independently establish an external-accountant assignment. No approximate role may be silently substituted.

For `rds_org_001`, the read-only profile showed accounting setup `IN_PROGRESS`, 14 journal entries all `POSTED`, entries only in `XAF`, 12 periods all `OPEN`, and payments consisting of 11 `PAID` and 2 `REFUNDED`. This does not satisfy the full draft/posted, multi-currency, open/closed-period fixture requirement.

## Blocker register

| blocker_id | description | classification | source | tenant_scope | owner | required_input | status | evidence_reference | safe_next_action | release_impact |
|---|---|---|---|---|---|---|---|---|---|---|
| TRB-001 | Exact isolated disposable database/branch is not identified | missing approval | execution safeguards; database target | all | environment owner | Target name, isolation proof, lifecycle, and approval | BLOCKED | This run targeted populated `stoquify_dev_migrated_20260814` | Provide an approved disposable target; do not reset current target | Prevents reseed execution |
| TRB-002 | External-accountant persona and exact role are absent from current tenants | missing implementation/fixture | certification manifest; read-only role reconciliation | `rds_org_001`, `rds_org_002` | IAM/control owner | Approved role code, user identity, tenant, scope, and read/export permissions | BLOCKED | No exact `external_accountant` role observed | Add only to the isolated fixture after approval; do not remap another role | Blocks external-accountant evidence |
| TRB-003 | Document `Approved` labels have no independently traceable approval metadata | external evidence requirement | blocker documents | stated finance scope | security/control owner | Approval ID, approver, date, scope, decision, signature or system record | BLOCKED | No approval IDs/signatures supplied | Attach traceable approval record | Blocks certification claims |
| TRB-004 | Authenticated credentials for approved personas are absent | credential requirement | blocker documents | approved test tenant only | test owner/security owner | Secret-manager reference for non-production credentials | BLOCKED | No credentials used or exposed | Provision through approved secret manager | Blocks authenticated evidence |
| TRB-005 | Authenticated desktop/tablet/mobile evidence artifacts are absent | evidence requirement | blocker documents | finance/table pilots | QA/accessibility owner | Run IDs, timestamps, device/browser, locale, tenant, persona, artifact links | BLOCKED | No authenticated evidence supplied | Capture only after seeded data and credentials are approved | Blocks UI evidence claims |
| TRB-006 | Current finance fixture lacks draft journals, multi-currency data, and closed periods | fixture gap | read-only database profile | `rds_org_001` | finance seed owner | Approved fixture manifest covering required states | OPEN FOR ISOLATED RESEED | All observed entries posted/XAF; all periods open | Seed states in dependency order on disposable target | Blocks complete finance evidence |
| TRB-007 | Existing realistic seed verifier is write-capable and is unsafe as a read-only check on the populated target | verification safety issue | `seed:verify:realistic` rerun | selected POS tenant/terminal | seed/test owner | Read-only verifier or isolated disposable target; owner decision on generated test records | OPEN | Rerun created POS session, sale, payment, inventory decrement, and audit records | Do not rerun on current target; use an isolated fixture or add a transaction-safe/read-only verification mode | Blocks clean evidence baseline |
| TRB-008 | Prisma Client generation cannot replace a locked generated file | environment blocker | `prisma:generate` output | local workspace | developer environment owner | Release file lock or clean disposable workspace | BLOCKED | `EPERM` unlinking `node_modules/.prisma/client/index.js` | Close locking process and rerun generation | Blocks generated-client refresh |
| TRB-009 | Migration history report cannot write to configured output path | environment blocker | `prisma:migration:history:health` output | local workspace | developer environment owner | Writable report path or released lock | BLOCKED | `EPERM` opening `what-next/prisma-migration-history-health.md` | Use a writable output path or release file lock | Blocks that report artifact only |
| TRB-010 | At least 20 valid inventory items per location has not been proven | fixture gap | reseed success criteria; realistic verifier output | approved fixture tenants | inventory seed owner | Location/item/stock assertion output | OPEN FOR ISOLATED RESEED | Verifier reported 12 catalog and 12 stocked items for the exercised location | Add deterministic count and stock assertions in the isolated fixture | Blocks inventory evidence |

## Work that can proceed from repository/database truth

- Preserve the current database and migration state.
- Repair the local file-lock conditions.
- Extend the existing seed path rather than creating a second seed system.
- Prepare deterministic role, permission, entitlement, redaction, and fixture manifests.
- Add isolated-database assertions for tenant isolation, foreign keys, inventory, finance, purchasing, payments, payroll/HRIS boundaries, exports, and bilingual labels.
- Produce a redacted blocker register and dependency-order report.

## Work that requires external inputs

- Target-specific approval for an isolated disposable database.
- Exact external-accountant persona approval and role mapping.
- Security/control-owner approval reference.
- Authenticated non-production credentials.
- Authenticated evidence artifacts.
- Approved redaction-policy version and finance entitlement source.

## Required reseed order

1. Organizations and tenant configuration.
2. Canonical roles, permissions, entitlements, and redaction policies.
3. Users, identities, and role assignments.
4. Accounting control-plane and country-pack settings.
5. Reference and master data.
6. Locations, items, warehouses, and opening inventory.
7. POS locations, terminals, drawers, and history.
8. Suppliers, customers, purchase orders, receipts, and approvals.
9. Sales, invoices, payments, refunds, and reconciliation.
10. Inventory movements and stock effects.
11. Journals, entries, balances, periods, and close evidence.
12. Finance statements and drill-to-evidence links.
13. Payroll and HRIS fixtures with separate privacy policies.
14. Audit events, evidence manifests, and operational metadata.

## Decision

The remediation can continue as a readiness and implementation activity, but the comprehensive reseed and authenticated evidence phase cannot safely proceed until TRB-001, TRB-003, and TRB-004 are resolved. TRB-002, TRB-005, TRB-006, TRB-007, TRB-008, TRB-009, and TRB-010 must be resolved or explicitly accepted for the corresponding evidence scope. The current target must not be used as a clean reseed baseline until the POS verifier side effect is reviewed by the environment owner.
