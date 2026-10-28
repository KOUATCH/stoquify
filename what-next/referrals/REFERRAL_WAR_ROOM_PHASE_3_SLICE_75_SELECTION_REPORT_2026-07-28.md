# Referral War Room Phase 3 Slice 75 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Selected skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 75: POS cash-shortage source-owned resolution readiness status-line contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 74 certified and no Slice 75 selected.
- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts` currently exposes the source-owned resolution readiness preflight and activation-evidence composer, but no compact read-only status-line representation.
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_REPORT_2026-07-28.md` certifies the fail-closed resolution readiness preflight while explicitly keeping live terminal resolution blocked.
- `services/leakage/pos-cash-shortage-production-policy-readiness-preflight.ts` now provides an adjacent display-safe readiness status-line pattern that preserves `activationAuthorized: false`.

## Scope

Add a read-only status-line type and helper derived from the existing source-owned resolution readiness preflight result.

The slice may add:

- `PosCashShortageResolutionReadinessStatusLine`.
- `describePosCashShortageResolutionReadinessStatusLine`.
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

Slice 75 is selected because it is the smallest safe continuation after Slice 74: it gives the source-owned resolution readiness preflight the same display-safe, read-only status-line treatment without implementing terminal resolution or granting runtime authority.
