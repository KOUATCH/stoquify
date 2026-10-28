# Accountant Close Portal Grant Temporal Honesty Slice 423 Report

Date: 2026-08-02
Program: `stoquify-referral-war-room-orchestrator`
Execution skill: `013-aqstoqflow-data-trust-accountant-portal`

## Scope

Slice 423 completes the selected accountant-grant temporal-honesty boundary. It rejects elapsed consent, derives scheduled state, preserves expiry truth, makes revocation first-writer safe, excludes inactive client organizations, and binds the report-trust gate to executable authorization evidence.

The slice does not change Prisma schema or migrations, activate external sharing, create missing-proof requests, or grant AI, WhatsApp, or POS cash-shortage authority.

## Before State

- Future-effective grants were reported as `EXPIRED`.
- A fully elapsed grant window could be persisted as a fresh grant.
- Scheduled grants could not be revoked from the manager.
- A revocation attempted after expiry could replace expiry as the terminal cause.
- Concurrent revocations could overwrite actor, time, and reason attribution.
- Legacy rows revoked at or after expiry were reported as `REVOKED`.
- The UI always reported successful revocation even when the service returned `EXPIRED`.
- Delegated reads did not exclude inactive or soft-deleted client organizations.
- The report-trust gate accepted several accountant controls through detached source markers and did not prove ordered fresh-auth helper control flow.

## After State

- Valid future-effective consent is derived as `SCHEDULED`; exact expiry at `now` is `EXPIRED`.
- `expiresAt <= now` is rejected before user lookup, transaction entry, grant creation, or event emission.
- `ACTIVE` and `SCHEDULED` grants are revocable in the manager; terminal grants are not.
- Post-expiry revocation retires the scope and emits expiry evidence without a revocation event.
- A tenant-scoped `updateMany` transition allows only the first current grant revocation to write attribution. A losing caller rereads terminal state and cannot overwrite it or emit a second event.
- A persisted revocation at or after expiry is derived as `EXPIRED`; a valid pre-expiry revocation remains `REVOKED`.
- The manager uses the returned DTO state, reports an expiry race honestly, and renders an exact machine-readable cutoff plus local time and zone.
- Delegated access and portfolio queries require an active, non-deleted client organization.
- The report-trust gate now uses TypeScript AST evidence for protected grant/revoke action bindings and the delegated resolver's tenant, time, role, scope-key, and active-client predicates.
- Fresh-auth helper evidence now requires declaration, guard, and return ordering.
- Adversarial gate tests reject detached markers, unscoped revoke actions, unconditional revocation writes, legacy expiry mislabeling, return-before-guard, and misleading UI evidence.

## Files

- `services/accounting/accountant-access.service.ts`
- `services/accounting/__tests__/accountant-access.service.test.ts`
- `components/accounting/AccountantAccessManager.tsx`
- `components/accounting/__tests__/AccountantAccessManager.test.tsx`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- `what-next/report-trust-export-readiness.md`
- `what-next/report-trust-export-readiness.json`

No action, route, schema, or migration file was changed by this slice.

## Verification

- Pre-edit baseline: 2 suites / 12 tests passed.
- Final focused service, manager, and gate bundle: 3 suites / 35 tests passed.
- Expanded accountant access, data-trust, authorization, session, UI, and gate regression: 8 suites / 80 tests passed.
- Exact accountant portal route: 1 suite / 3 tests passed.
- Full `npm run typecheck`: passed.
- Scoped ESLint over six implementation/test files: passed.
- `npm run prisma:validate`: passed.
- `npm run report:trust:export:gate`: ready, 18/18 checks, zero blockers.
- JavaScript syntax checks: passed.

## Independent Review

The first independent review blocked certification because the gate could accept detached tenant/RBAC markers and concurrent revocations could overwrite attribution. It also identified legacy post-expiry mislabeling, misleading UI success text, inactive-client delegation, capped register/portfolio truth, and timezone ambiguity.

The gate, revocation transition, legacy status, UI result, exact cutoff display, and active-client filters were corrected and all verification was rerun. Portfolio pagination/truncation metadata and a formal organization-timezone input policy remain future work and are not claimed by this slice.

## Decision

Slice 423 is certified for the current worktree only.

Deployment remains NO-GO. Accountant-access foundation files and migration ownership are not yet repository-certified; user identity foreign keys, retention and organization-deletion policy, database lifecycle constraints, clean PostgreSQL deployment evidence, capped-register pagination, and the missing-proof request lifecycle remain unresolved. The certified report-trust gate is not an OHADA filing certification.

No Slice 424 is selected. Return to the war-room orchestrator for a fresh Phase 4 audit.
