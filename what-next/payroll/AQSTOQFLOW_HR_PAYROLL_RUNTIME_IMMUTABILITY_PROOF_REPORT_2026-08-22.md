# AqStoqFlow HR/Payroll Runtime Immutability Proof Report

Date: 2026-08-22

Skills applied: aqstoqflow-hrpayroll-02-immutability-boundary with 017-aqstoqflow-enterprise-release-gate.

## Decision

Passed for enterprise blocker B02 within the isolated non-production PostgreSQL runtime control.

The proof does not verify a production database, configure production infrastructure, authorize release, supply managed secrets, or provide statutory expert approval. Overall enterprise release status remains BLOCKED.

## Root cause

The fresh proof applied all 76 migrations successfully, then failed before its first SQL query with Prisma P6001. The pnpm-resolved generated Prisma client used by the script had copyEngine=false and required an Accelerate URL. The harness supplied the required direct local PostgreSQL URL, so the generated client rejected it before trigger discovery, seeding, forbidden-mutation attempts, or allowed lifecycle checks. That produced 0/9, 0/0, and 0/0.

## Correction

The standalone runtime proof now uses the repository's existing pg driver for its raw PostgreSQL transaction. Migration deployment, safe database selection, synthetic tenant-scoped identifiers, SQL fixtures, savepoints, trigger catalog, mutation matrix, lifecycle matrix, rollback, and evidence schema are unchanged.

The application Prisma client, payroll services, schema, migrations, RBAC, tenant boundary, payroll trust spine, and product workflows were not changed.

Focused regression coverage proves the runtime client is constructed from the direct PostgreSQL URL and that the proof runner no longer loads @prisma/client.

## Fresh runtime evidence

- Database: localhost/stockflow_immutability_test.
- Migrations: 76 applied successfully to the recreated isolated database.
- Trigger catalog: 9/9 present and enabled.
- Forbidden mutations: 14/14 rejected by PostgreSQL.
- Allowed lifecycle mutations: 3/3 succeeded.
- Runtime blockers: 0.
- Synthetic tenant rows after rollback: 0.
- Secret URL values printed: no.

Direct artifacts:

- what-next/payroll/payroll-immutability-runtime-check.json
- what-next/payroll/payroll-immutability-runtime-check.md
- what-next/payroll/payroll-immutability-migration-deploy-diagnostics.json
- what-next/payroll/payroll-immutability-migration-deploy-diagnostics.md

## Gates run

- node --check scripts/payroll-immutability-runtime-check.js: passed.
- npm run prisma:validate: passed.
- Focused immutability/harness/migration tests: 3 suites, 31 tests passed.
- Tenant/privacy/trust-spine tests: 6 suites, 31 tests passed.
- Enterprise blocker synthesizer tests: 1 suite, 10 tests passed.
- npm run payroll:immutability:runtime: passed with 9/9, 14/14, 3/3.
- WP-00 artifact manifest: 23/23 entries match; extension binding matches.
- Scoped JSON registers: parse successfully.

Not run: prisma generate, because the correction intentionally remains valid while the existing no-engine generated client is present; regenerating it would mask the regression condition. Typecheck, service-boundary, full policy gates, build, browser, and production gates were outside this JavaScript proof-only slice and would touch unrelated evidence or remain blocked on external inputs.

## Security, tenant, lifecycle, and accounting boundaries

- Synthetic data remains organization-scoped and is rolled back.
- No production or shared application database is accepted by the harness.
- Finalized run, run-line, payslip, payslip-line, payment, declaration, declaration-evidence, and employee-balance protections are exercised directly.
- Allowed metadata and forward lifecycle behavior remains separately verified.
- Tenant isolation, payroll privacy, trust-spine migration/readiness/certification contracts, and application authorization code were not weakened.
- No payroll legal or production claim was added.

## Evidence/register update

B02 is READY only for the isolated non-production control. The WP-00 status now records 3/12 blockers ready and 9 open. Production database verified remains false, production release authorized remains false, WP1 remains unauthorized, and all external configuration, managed secret, expert review, ownership, freeze, and promotion blockers remain fail-closed.

## Files changed

Implementation and tests:

- scripts/payroll-immutability-runtime-check.js
- scripts/__tests__/payroll-immutability-runtime-check.test.js

Runtime evidence and scoped status/register artifacts:

- what-next/payroll/payroll-immutability-runtime-check.json
- what-next/payroll/payroll-immutability-runtime-check.md
- what-next/payroll/payroll-immutability-migration-deploy-diagnostics.json
- what-next/payroll/payroll-immutability-migration-deploy-diagnostics.md
- docs/production-readiness/stoquify-production-unblocking/EXECUTION_REGISTER.md
- docs/production-readiness/stoquify-production-unblocking/execution-register.json
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/blocker-gate-map.json
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/enterprise-release-blocker-status.json
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/enterprise-release-blocker-status.md
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/wp0-verification.json
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/WP0_DECISION.md
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/artifact-manifest.json
- docs/production-readiness/stoquify-production-unblocking/evidence/WP-00/artifact-manifest-extension-01.json

## Handoff

B02 is resolved. The enterprise release gate remains blocked by B03, B04, B06-B12. The next ordered HR/payroll skill is aqstoqflow-hrpayroll-03-country-pack-gate, subject to its own prerequisites; it was not started here.
