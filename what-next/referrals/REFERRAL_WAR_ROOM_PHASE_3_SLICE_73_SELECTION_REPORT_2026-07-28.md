# Referral War Room Phase 3 Slice 73 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 73 selects the POS cash-shortage production policy readiness review artifact digest contract.

## Evidence Reviewed

- Slice 72 certified `buildPosCashShortageProductionPolicyReadinessReviewArtifact` as a read-only artifact bundling policy readiness packet evidence and fingerprint.
- The status register still blocks production activation because no effective approved production threshold policy exists and browser evidence remains absent.
- The artifact has no compact digest for report/status consumers that need only status, counts, and fingerprint evidence.

## Scope

Add a compact read-only digest derived from the existing production policy readiness review artifact. The digest will expose status, policy readiness certification, fingerprint, missing/satisfied counts, and `activationAuthorized: false`.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REVIEW_ARTIFACT_DIGEST_REPORT_2026-07-28.md`

## Guardrails

- No policy seeding, production threshold configuration, migration, database call, detector, worker, scheduler, route, action, UI, browser, notification, rollback, AI, WhatsApp, or production activation behavior.
- The digest is derived from service-owned preflight evidence and does not become a source of truth.
- Preserve service-owned truth, RBAC assumptions, audit/evidence posture, redaction readiness, tenant isolation, module entitlement, and release gates.

## Focused Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`.
- Related cash-shortage policy/preflight bundle.
- `npm run typecheck`.
- Scoped lint for the touched source and test file.
- Static authority scan and whitespace/diff hygiene checks.

## Next Skill

Use `stoquify-cash-leakage-radar` for the Slice 73 implementation pass only.
