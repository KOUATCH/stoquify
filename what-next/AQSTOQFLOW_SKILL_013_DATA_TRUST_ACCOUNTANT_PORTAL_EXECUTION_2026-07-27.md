# AQSTOQFLOW Skill 013 — Data Trust and Accountant Portal Execution

Date: 2026-07-27  
Status: Implemented and development-gate ready  
Selected skill: `013-aqstoqflow-data-trust-accountant-portal`

## Outcome

Stoquify now has a governed accountant-client delegation boundary around its existing ledger-backed reporting and trust-pack foundation.

The implementation adds:

- explicit client consent with a signed-evidence SHA-256 reference;
- accountant firm identity and role assignment;
- effective and expiry dates;
- one active grant per client/accountant boundary;
- tenant-scoped grant and revocation operations;
- immediate revocation with preserved history;
- an accountant client portfolio containing only active, effective, unexpired mandates;
- delegated client portal reads resolved on the server;
- export denial for read-only accountant mandates;
- fresh-auth protection for grant and revoke operations;
- `ACCOUNTANT_ACCESS_GRANTED`, `ACCOUNTANT_ACCESS_REVOKED`, and `REPORT_EXPORT_CREATED` business events;
- notification/report-export outbox messages;
- a versioned accountant trust-pack export with filters hash, source tables, period, row count, and content hash;
- client access-management and accountant portfolio UI surfaces.

## Architectural Decision

The existing report and accountant portal stack was retained because it already reads posted/reversed ledger entries, exposes source links, reports period status and confidence, and creates tamper-evident exports.

The missing capability was implemented as a separate authorization layer:

1. A client owner records a time-bound accountant mandate.
2. The mandate stores role, firm identity, consent evidence hash, effective period, and audit identity.
3. The accountant portfolio queries only active and unexpired mandates for the signed-in accountant.
4. A delegated portal request supplies a client identifier, but the server resolves it against the mandate register.
5. A client identifier without a matching mandate is denied.
6. `READ_ONLY` grants can view but cannot export.
7. Revocation clears the unique active-scope key while retaining the historical grant record.

This preserves tenant isolation without duplicating reporting logic or weakening the existing organization guard.

## Files Changed

### Data model and migration

- `prisma/schema.prisma`
- `prisma/migrations/20260727090000_accountant_access_portfolio/migration.sql`

### Services and schemas

- `services/accounting/accountant-access.schemas.ts`
- `services/accounting/accountant-access.service.ts`
- `services/accounting/data-trust.schemas.ts`
- `services/accounting/data-trust.service.ts`

### Server actions

- `actions/accounting/accountant-access.actions.ts`
- `actions/accounting/data-trust.actions.ts`

### User interfaces and navigation

- `components/accounting/AccountantAccessManager.tsx`
- `components/accounting/AccountantPortfolio.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-access/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.tsx`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/page.tsx`
- `config/sidebar.ts`

### Gates and tests

- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `services/accounting/__tests__/accountant-access.service.test.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `actions/accounting/__tests__/accountant-access.actions.test.ts`
- `actions/accounting/__tests__/data-trust.actions.test.ts`
- `app/[locale]/(dashboard)/dashboard/accounting/accountant-portal/__tests__/page.test.tsx`
- `what-next/skill-013-report-trust-export-readiness.json`
- `what-next/skill-013-report-trust-export-readiness.md`

## Gate Results

All 17 report/data-trust checks passed:

- ledger-owned accounting export data;
- versioned, self-describing export manifest;
- tenant-scoped period status;
- balance/redaction/certification disclosure;
- tamper-evident content and audit evidence;
- permission and fresh-auth boundaries;
- service-owned currency;
- no hardcoded USD UI formatting;
- trust-banner and policy wiring;
- ledger-backed accountant data;
- explicit consent, role, and expiry;
- server-resolved cross-client access;
- role-governed delegated export;
- accountant portfolio and client register surfaces;
- access grant/revoke events;
- trust-pack export event and hash contract;
- statutory, payroll, and inventory evidence coverage.

Gate result: `ready`, 17/17, zero blockers.

## Verification

- Prisma schema validation: passed.
- Prisma client generation: passed.
- Schema-to-schema migration diff: matched the migration; the generated PostgreSQL-safe index name was adopted.
- ESLint on all Skill 013 implementation files: passed.
- Full TypeScript check: passed.
- Focused Jest bundle: 7 suites passed, 30 tests passed.
- Report-trust gate test: 3 tests passed.
- Enforced Skill 013 gate: 17/17 passed in fail mode.
- `git diff --check` on touched tracked files: passed.

The canonical readiness output files were externally locked during execution, so the identical fail-mode gate was written to the Skill 013-specific readiness files listed above.

## Certification Boundary

This implementation establishes development and integration readiness. It does not:

- apply the database migration to production;
- certify any export as an OHADA statutory filing;
- replace close-assurance certification;
- create a filing draft when no filing-draft workflow is invoked;
- bypass country-pack production approval.

`FILING_DRAFT_PREPARED` remains an event for the filing workflow to emit when a filing draft is actually prepared. It was not emitted speculatively.

Country-pack production approval remains a separate parallel workstream and does not block this Skill 013 development tranche.

## Next Numbered Step

Proceed to Skill 014: offline POS synchronization and replay assurance.
