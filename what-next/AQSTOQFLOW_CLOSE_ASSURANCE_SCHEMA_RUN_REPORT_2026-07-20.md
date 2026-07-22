# AqStoqFlow Close Assurance Schema Run Report

Date: 2026-07-20
Skill: `019-aqstoqflow-close-assurance-schema`
Workspace: `E:\ohada saas\Focused projects\stoquify`
Verdict: `COMPLETED_WITH_MIGRATION_TRAIL_FIX`

## Scope

Executed the close-assurance schema foundation skill after the 018 readiness audit. The active datamodel, permissions, contracts, DTOs, and domain errors were inspected before making changes.

## Result

The close-assurance Prisma models and enums were already present in `prisma/schema.prisma`, and the close-assurance permissions, service DTOs, Zod contracts, and domain errors were already present in the application code.

The missing gap was the durable migration trail for those schema objects. This run added the additive migration:

- `prisma/migrations/20260720090000_close_assurance_schema_foundation/migration.sql`

No schema models, service contracts, or permission files were otherwise changed by this run.

## Models And Enums Covered

Enums covered by the migration:

- `CloseRunStatus`
- `CloseChecklistStatus`
- `CloseFindingSeverity`
- `CloseFindingStatus`
- `CloseFindingDomain`
- `CloseEvidenceType`
- `AccountantReviewStatus`

Models covered by the migration:

- `CloseRun`
- `CloseChecklistItem`
- `CloseAssuranceFinding`
- `CloseEvidenceItem`
- `ClosePackExport`
- `AccountantReview`
- `AccountantComment`

`CloseCertification` remains intentionally absent because the skill classifies it as optional, and the current implementation uses certified close-pack exports rather than a separate certification table.

## Permission Coverage

The required `accounting.close.*` permissions were already present:

- `accounting.close.read`
- `accounting.close.run`
- `accounting.close.finding.assign`
- `accounting.close.finding.comment`
- `accounting.close.waiver.request`
- `accounting.close.waiver.approve`
- `accounting.close.certify`
- `accounting.close.export`
- `accounting.close.accountant.review`
- `accounting.close.accountant.comment`
- `accounting.close.accountant.invite`

The permissions are also mapped in RBAC severity/legacy-permission bridging.

## Contract Coverage

The following close-assurance service contract surface was already present:

- `services/accounting/close-assurance.schemas.ts`
- Close-assurance Zod input schemas
- Close-assurance DTO usage in `services/accounting/close-assurance.service.ts`
- Domain error codes including `CloseBlocked`, `EvidenceMissing`, `OpenSuspenseBlocksClose`, `UnsignedReconciliationBlocksClose`, `SoDViolation`, and `RecertificationRequired`

## Validation

Passed:

- `npm run prisma:validate`
- `npm run typecheck`

Focused Jest tests were not added or rerun for this skill because the implementation change was limited to an additive SQL migration and did not introduce new runtime helpers.

## Safety Notes

- No destructive migration, reset, reseed, or data rewrite was performed.
- No unrelated dirty worktree changes were reverted or modified.
- No statutory or regulatory certification evidence was fabricated.
- External statutory/country-pack validation remains outside this run unless backed by real source authority or expert review.

## Gates For Skill 020

Before implementing the close-assurance engine:

- The engine must be ledger-first and blocker-first.
- High and critical open blockers must prevent certification.
- Open suspense, unsigned reconciliation, stale hashes, unavailable evidence, and unresolved close-impacting findings must produce explicit findings.
- Close-impacting writes must invalidate or require recertification of affected evidence.
- Tenant boundaries, actor permissions, safe error mapping, correlation IDs, and idempotency must be tested.
- Posted accounting facts must remain distinct from operational drafts or estimates.
- Statutory/OHADA/SYSCOHADA claims must remain advisory until validated by authoritative country-pack evidence or qualified experts.
