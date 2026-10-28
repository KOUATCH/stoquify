# Stoquify HRIS Organization-Scope Schema and Resolver Tranche

Date: 2026-07-19  
Status: Next executable prerequisite  
Parent skill: `aqstoqflow-hris-payroll-04-org-structure-manager-scope`

## Goal

Introduce the smallest relational, tenant-owned, effective-dated organization spine required to prove manager authority without duplicating employee identity or weakening current Payroll compatibility controls.

## Proposed aggregate

### `HrisOrgUnit`

- `id`, `organizationId`, `code`, `name`, `type`
- Optional tenant-constrained parent relationship
- `effectiveFrom`, optional `effectiveTo`, lifecycle status
- Unique tenant/code rule and hierarchy indexes

### `HrisPosition`

- `id`, `organizationId`, `orgUnitId`, `code`, `title`
- Optional operational `locationId`
- `effectiveFrom`, optional `effectiveTo`, lifecycle status
- Tenant-constrained org-unit relationship

### `HrisEmploymentAssignment`

- `id`, `organizationId`, existing compatibility `employeeId`, `positionId`, `orgUnitId`
- `effectiveFrom`, optional `effectiveTo`
- Primary/secondary assignment classification and status
- One active primary assignment per employee at a given effective time

### `HrisReportingRelationship`

- `id`, `organizationId`, manager employee/assignment, report employee/assignment
- Relationship type: direct, matrix, or scoped approver
- `effectiveFrom`, optional `effectiveTo`
- Approval/evidence hash, actor, reason, and supersession lineage
- No self-reporting or cross-tenant relationship

### `HrisManagerDelegation`

- `id`, `organizationId`, delegator, delegate, bounded authority scope
- `effectiveFrom`, `effectiveTo`
- Approval evidence, revocation, and supersession lineage
- No implicit tenant-wide delegation

## Compatibility rules

- Reuse existing `PayrollEmployee.id` during transition; do not create another employee identity.
- Treat `PayrollEmployee.locationId`, `department`, `jobTitle`, and `costCenter` as migration inputs only.
- Treat `Location.managerId` as operational location responsibility only.
- Never infer a reporting relationship from navigation, permission assignment, shared location, metadata, or a submitted identifier.
- Payroll reads organization facts only from a certified HRIS snapshot after the later snapshot phase.

## Resolver contract

`resolveHrisPeopleAccessScope` must accept an `asOf` value and return an explicit authority kind:

- `TENANT_HRIS_ADMIN`
- `REPORTING_RELATIONSHIP`
- `DELEGATED_MANAGER_AUTHORITY`
- `LOCATION_RESPONSIBILITY_COMPATIBILITY`
- `OWN_RECORD`

The result must include relationship/evidence identifiers for server-side audit but exclude them from ordinary UI payloads. Reporting and delegated scopes return resolved employee IDs. Missing or ambiguous scope fails closed.

## Migration sequence

1. Add schema and non-destructive migration.
2. Add repository/service interfaces and focused unit tests.
3. Produce a redacted dry-run candidate map from compatibility fields.
4. Require explicit approval before creating certified reporting relationships.
5. Rerun idempotently and reconcile hashes/counts.
6. Switch manager reads to the new as-of resolver.
7. Switch approval decisions only after decision-time scope tests pass.
8. Retain location compatibility scope until all consumers migrate.

## Acceptance tests

- Active direct report included; unrelated employee excluded.
- Cross-tenant IDs rejected at every relationship edge.
- Cross-branch access denied unless an explicit active relationship grants it.
- Future and expired relationships excluded.
- Historical queries reproduce pre-transfer authority.
- Delegation starts and expires exactly at its effective boundaries.
- No assignment produces no manager scope and never tenant fallback.
- Scalar location membership alone never produces a direct-report claim.
- HRIS administrators remain tenant admins without being labeled managers.
- Approval reads and decisions filter and re-resolve the same employee scope.
- Maker-checker, audit, and redaction behavior remains intact.
- Dry-run and apply are idempotent and preserve correction/rollback evidence.

## Edit boundary

Expected future changes are limited to the new Prisma models/migration, an HRIS organization repository/resolver, focused HRIS tests, and narrowly necessary approval-scope callers. Do not combine this tranche with contract, compensation, payment-destination, time/leave, Payroll calculation, module packaging, UI redesign, or production backfill.

## Entry blocker

Before implementation, reconcile this schema addition with the existing dirty changes around `User`, `Organization`, and `Location` in `prisma/schema.prisma`. Preserve those changes and add relations deliberately rather than regenerating or rewriting adjacent models.
