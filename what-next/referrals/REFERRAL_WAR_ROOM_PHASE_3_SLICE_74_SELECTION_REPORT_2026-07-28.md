# Referral War Room Phase 3 Slice 74 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 74: POS cash-shortage production policy readiness review artifact status-line contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 73 certified and no Slice 74 selected.
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` currently ends the policy readiness review chain at `PosCashShortageProductionPolicyReadinessReviewArtifactDigest`.
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts` has an adjacent certified pattern where a review artifact digest is followed by a compact display-safe status-line contract.
- `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts` already covers blocked, certified, and partial digest states that can feed the status-line contract.

## Scope

Add a read-only status-line type and helper derived from the existing production policy readiness review artifact digest.

The slice may add:

- `PosCashShortageProductionPolicyReadinessReviewArtifactStatusLine`.
- `describePosCashShortageProductionPolicyReadinessReviewArtifactStatusLine`.
- Focused tests for blocked, certified, and partial readiness states.
- Status register and certification report updates.

## Non-Goals

- No production detector, worker, scheduler, cron, alert delivery, rollback execution, browser automation, route, server action, Prisma write, migration, seed, policy promotion, AI authority, or WhatsApp authority.
- No new UI surface.
- No change to the production activation decision.
- No policy threshold mutation or approved-policy seeding.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts`.
- Related leakage policy/preflight Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test files.
- Static authority scan over the touched source file.
- Trailing whitespace and `git diff --check` hygiene over touched files.

## Selection Decision

Slice 74 is selected because it is the smallest safe continuation after Slice 73: it turns the digest into a compact, display-safe review line while preserving service-owned evidence and explicitly denying activation authority.
