# Referral War Room Phase 4 Slice 427 Selection Report

Generated: 2026-08-02
Phase: Phase 4, Accountant Portal And Close Pack
Orchestrator: `stoquify-referral-war-room-orchestrator`
Selected skill: `013-aqstoqflow-data-trust-accountant-portal`
Communication control: `/caveman full`

## Decision

Select Slice 427: **Client Missing-Proof Request Read Model Foundation**.

Slice 426 created atomic missing-proof request truth. Next dependency is a typed, tenant-safe client-recipient queue contract. Action-center integration and UI remain blocked until this read model exists.

## Evidence

- Roadmap requires missing-evidence requests to flow into the client action center.
- Live command persists one typed `CLIENT_ACTION_REQUIRED` accountant comment, assigns the finding owner, and records immutable request metadata.
- Existing manager action center composes source-owned read models; it must not query raw accounting persistence or infer request truth in UI.
- No dedicated client missing-proof queue service or contract exists.
- Current close dashboard exposes generic comments but does not provide recipient filtering, typed metadata validation, bounded queue honesty, or client-specific redaction.
- Existing `CloseAssuranceFinding` index `[organizationId, ownerId, status, dueAt]` supports the planned queue without schema work.

## Candidate Comparison

1. Client missing-proof read model: direct roadmap dependency, high user value, bounded scope, no migration. Selected.
2. Action-center integration/UI: premature without service contract. Deferred.
3. Accountant portfolio pagination: useful, but less direct than making Slice 426 requests consumable. Deferred.
4. Organization-timezone policy: important for local due-day grouping; this slice avoids day-boundary classification. Deferred.
5. Identity FK, retention, deletion, and deployment constraints: high-risk migration/policy work. Deferred.

## Scope

- Add shared missing-proof persistence constants and typed client queue contracts.
- Reuse shared constants in the Slice 426 writer so read/write evidence cannot drift.
- Add service-owned queue read:
  - authenticated organization and actor required;
  - actor must be active in organization;
  - actor is recipient; no separate recipient authority input;
  - findings require organization, owner, and open lifecycle status;
  - comments require organization, typed visibility, request type, and matching requested recipient;
  - raw metadata never leaves service;
  - malformed stored evidence becomes an explicit blocker;
  - results are capped at 100 with truthful truncation;
  - absolute overdue and 72-hour urgency use service clock only.
- Add focused tests.
- Add report-trust release check and mutation coverage.
- Regenerate `what-next/report-trust-export-readiness.{md,json}`.

## Expected Files

- `services/accounting/missing-close-evidence-request-queue-contracts.ts`
- `services/accounting/missing-close-evidence-request-queue.service.ts`
- `services/accounting/__tests__/missing-close-evidence-request-queue.service.test.ts`
- `services/accounting/close-assurance.service.ts`
- `scripts/report-trust-export-gate.js`
- `scripts/__tests__/report-trust-export-gate.test.js`
- generated readiness evidence and Slice 427 reports/status.

## Acceptance Gates

- Missing organization or actor fails before DB work.
- Inactive or cross-tenant actor fails closed.
- Query scopes organization, owner, open statuses, typed visibility, request type, and requested recipient.
- Returned request contains no raw metadata.
- Corrupt due-date/request evidence is not treated as valid work and creates an explicit blocker.
- Latest valid request per active finding is returned.
- Service clock owns urgency classification.
- More than 100 candidate findings sets `truncated: true`.
- Static gate rejects caller clock, recipient override, missing tenant/owner/status filters, untyped comments, raw metadata leakage, silent malformed evidence, or unbounded query.
- Existing Slice 426 command gate remains green.

## Non-Goals

- No public server action.
- No manager action-center composition.
- No UI, route, hook, translations, browser test, or screenshots.
- No request response, upload, completion, dismissal, reassignment, or resolution command.
- No schema or migration.
- No cursor pagination or organization-local day classification.
- No external sharing, AI, WhatsApp, email, or POS activation.

## Baseline

- Accounting close-assurance service plus manager action-center service: 2 suites / 51 tests passed.
- Live report-trust gate before Slice 427: 21/21 ready.
- Slice 426 remains current-worktree certified; repository and production deployment remain NO-GO.

## Next Step

Run `013-aqstoqflow-data-trust-accountant-portal` for Slice 427 under war-room control. Add product code only inside selected scope.

