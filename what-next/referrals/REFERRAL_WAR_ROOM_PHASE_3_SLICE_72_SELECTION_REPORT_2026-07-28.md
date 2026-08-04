# Referral War Room Phase 3 Slice 72 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 72 selects the POS cash-shortage production policy readiness review artifact contract.

## Evidence Reviewed

- Slice 70 certified the production policy readiness review packet.
- Slice 71 certified the deterministic review packet fingerprint using the existing `hashBusinessPayload` helper.
- The status register still correctly blocks production activation because no effective approved production threshold policy exists and browser evidence remains absent.

## Scope

Add a read-only artifact that bundles the existing production policy readiness review packet and fingerprint. This gives future evidence reports a stable review artifact without creating policy truth or runtime authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REVIEW_ARTIFACT_REPORT_2026-07-28.md`

## Guardrails

- No policy seeding, production threshold configuration, migration, database call, detector, worker, scheduler, route, action, UI, browser, notification, rollback, AI, WhatsApp, or production activation behavior.
- The artifact is derived from service-owned preflight evidence and does not become a source of truth.
- Preserve service-owned truth, RBAC assumptions, audit/evidence posture, redaction readiness, tenant isolation, module entitlement, and release gates.

## Focused Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`.
- Related cash-shortage policy/preflight bundle.
- `npm run typecheck`.
- Scoped lint for the touched source and test file.
- Static authority scan and whitespace/diff hygiene checks.

## Next Skill

Use `stoquify-cash-leakage-radar` for the Slice 72 implementation pass only.
