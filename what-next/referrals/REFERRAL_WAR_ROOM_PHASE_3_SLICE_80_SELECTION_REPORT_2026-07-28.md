# Referral War Room Phase 3 Slice 80 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 80: POS cash-shortage source-owned resolution readiness review artifact status-line contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 79 certified and no Slice 80 selected.
- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts` currently exposes the source-owned resolution readiness review artifact digest but no display-safe status line over that digest.
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` has an adjacent certified pattern where a review artifact status line is derived from the artifact digest and preserves `activationAuthorized: false`.
- `services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts` already has blocked, certified, and partial readiness fixtures suitable for status-line tests.

## Scope

Add a compact read-only status-line type and helper derived from the existing source-owned resolution readiness review artifact digest.

The slice may add:

- `PosCashShortageResolutionReadinessReviewArtifactStatusLine`.
- `describePosCashShortageResolutionReadinessReviewArtifactStatusLine`.
- Focused tests for blocked, certified, and partial readiness states.
- Status register and certification report updates.

## Non-Goals

- No terminal incident command execution.
- No source-owned recheck implementation.
- No route, server action, UI surface, worker, scheduler, alert delivery, rollback execution, Prisma write, migration, browser automation, AI authority, or WhatsApp authority.
- No production activation decision change.

## Verification Plan

- Focused Jest for `services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`.
- Related resolution and production-activation Jest bundle.
- `npm run typecheck`.
- Scoped ESLint for the touched source and test files.
- Static authority scan over the touched source file.
- Trailing whitespace and `git diff --check` hygiene over touched files.

## Selection Decision

Slice 80 is selected because it is the smallest safe continuation after Slice 79: it turns source-owned resolution readiness digest evidence into a compact display-safe review line without implementing terminal resolution or granting runtime authority.
