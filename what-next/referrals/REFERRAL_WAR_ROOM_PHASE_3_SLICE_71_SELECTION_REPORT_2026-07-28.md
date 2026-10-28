# Referral War Room Phase 3 Slice 71 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 71 selects the POS cash-shortage production policy readiness review packet fingerprint contract.

## Evidence Reviewed

- Slice 70 certified `buildPosCashShortageProductionPolicyReadinessReviewPacket` as a read-only packet bundling production policy readiness preflight evidence and its derived status line.
- `services/events/business-event.service.ts` already provides `hashBusinessPayload`, which is used by the policy readiness preflight for policy and approval-event hash verification.
- The status register still correctly blocks production activation because no effective approved production threshold policy exists and browser evidence remains absent.

## Scope

Add a deterministic read-only fingerprint over the existing policy readiness review packet. This allows future evidence reports to reference a stable packet hash without creating policy truth or runtime authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_POLICY_READINESS_REVIEW_PACKET_FINGERPRINT_REPORT_2026-07-28.md`

## Guardrails

- No policy seeding, production threshold configuration, migration, database call, detector, worker, scheduler, route, action, UI, browser, notification, rollback, AI, WhatsApp, or production activation behavior.
- The fingerprint is derived from service-owned preflight evidence and does not become a source of truth.
- Preserve service-owned truth, RBAC assumptions, audit/evidence posture, redaction readiness, tenant isolation, module entitlement, and release gates.

## Focused Verification

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`.
- Related cash-shortage policy/preflight bundle.
- `npm run typecheck`.
- Scoped lint for the touched source and test file.
- Static authority scan and whitespace/diff hygiene checks.

## Next Skill

Use `stoquify-cash-leakage-radar` for the Slice 71 implementation pass only.
