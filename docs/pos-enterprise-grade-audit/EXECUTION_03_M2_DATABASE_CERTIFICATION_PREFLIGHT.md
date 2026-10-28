# M2 PostgreSQL Certification Preflight — Safe Halt

Date: 2026-08-17  
Outcome: **BLOCKED BEFORE DATABASE CONNECTION OR MUTATION**

## Authorized target

- Host: `localhost`
- Port resolved from local configuration: `5432`
- Database: `stoquify_dev_migrated_20260814`
- Requested schema: `codex_pos_commit_result_cert_20260817`
- Allowed data: synthetic certification fixtures only
- Forbidden boundary: no access to or modification of `public` or production schemas

No credential, password, customer data, payment data, or connection string is recorded in this evidence.

## Preflight result

The selected target is not safe for an unchanged full-history `prisma migrate deploy` under the stated boundary. The local application connection points to the same database with `schema=public`, and nine historical repository migrations contain explicit `public` schema probes or operations. Changing the connection query parameter to the certification schema does not redirect those schema-qualified statements.

The highest-risk example is `20260726190000_retire_production_bom_capability/migration.sql`, which can rename and comment on `public.production_batches`, `public.recipe_ingredients`, and `public.recipes`. Multiple baseline-bridge migrations also inspect `public` and can refuse execution when existing public objects are present.

Therefore the migration command, fixture creation, and PostgreSQL tests were not run. This is a fail-closed result, not a failed migration. No database connection was opened and no database object or row was changed.

## Affected migration files

1. `20260611130000_accounting_auth_baseline_bridge/migration.sql`
2. `20260618160000_payroll_foundation_bridge/migration.sql`
3. `20260618161000_ap_stock_count_foundation_bridge/migration.sql`
4. `20260625110000_payroll_kernel_immutability/migration.sql`
5. `20260726140000_business_event_foundation_bridge/migration.sql`
6. `20260726190000_retire_production_bom_capability/migration.sql`
7. `20260730150000_organization_onboarding_entitlement_bridge/migration.sql`
8. `20260801153000_certified_fiscal_evidence_immutability/migration.sql`
9. `20260815190000_payment_reconciliation_evidence_immutability/migration.sql`

## Safe resolution paths

### Path A — controlled schema-rebound certification projection (recommended for this database)

Authorize a certification-only executor to copy the repository migration files into a temporary workspace, replace only explicit `public` schema references with `codex_pos_commit_result_cert_20260817`, verify a source-to-projection checksum manifest, and execute the projection against the requested isolated schema. The repository migration files remain unchanged. The outcome proves the projected target schema and POS controls, but it must not be represented as proof that the unchanged production migration chain is portable.

### Path B — dedicated disposable PostgreSQL instance

Authorize a separate local PostgreSQL instance/port and database with no application `public` objects. Execute the unchanged repository history there, then run the guarded certification suite. This isolates existing development data but the historical migrations still contain read-only `public` probes; the boundary wording must explicitly permit those probes against the empty disposable instance.

### Path C — migration-history remediation

Design a forward-compatible migration portability mechanism and formally disposition already-recorded checksums. This is the strongest long-term solution but is a separate governed migration project and should not be improvised inside M2 certification.

## Remaining authority and evidence gaps

- A named migration checker and role have not been supplied.
- Authentication attestation, before/after migration history, and restore-rehearsal evidence do not yet exist.
- M2-A05 through M2-A09 and M2-B01 through M2-B09 remain unauthorized.
- Pilot location, terminal, drawer, browser/OS, product approver, and controller approver remain unresolved.

## Exact continuation request

Authorize either Path A or Path B and provide the named migration checker. For Path A, the minimum authorization is:

```text
Authorize Path A controlled schema-rebound certification projection: YES
Target remains: localhost:5432 / stoquify_dev_migrated_20260814 / codex_pos_commit_result_cert_20260817
Public schema access or mutation: NO
Repository migration files may be copied to a temporary certification directory: YES
Only explicit schema references in the copy may be rebound to the target schema: YES
Migration checker: <actual name>
Migration checker role: <actual role>
```

