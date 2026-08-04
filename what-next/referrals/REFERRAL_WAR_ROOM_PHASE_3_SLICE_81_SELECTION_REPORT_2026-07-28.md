# Referral War Room Phase 3 / Slice 81 Selection Report

Date: 2026-07-28
Program owner: `stoquify-referral-war-room-orchestrator`
Implementation skill: `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 81: POS cash-shortage source-owned resolution readiness review evidence-row contract.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md` shows Slice 80 certified and no Slice 81 selected.
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_REVIEW_ARTIFACT_REPORT_2026-07-28.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_REVIEW_ARTIFACT_DIGEST_REPORT_2026-07-28.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_REVIEW_ARTIFACT_STATUS_LINE_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`

## Scope

Add a compact read-only evidence-row representation derived from the existing source-owned resolution readiness review artifact status line. The row is intended for later review packets or tables and must preserve service-owned evidence, deterministic fingerprint identity, blocker counts, and `activationAuthorized: false`.

## Non-Goals

Do not implement source-owned recheck, terminal resolution, incident commands, detector activation, workers, schedulers, alerts, rollback, routes, actions, dashboards, browser automation, auth-state creation, fixture mutation, Prisma writes, migrations, AI authority, or WhatsApp authority.

## Expected Files

- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_REVIEW_EVIDENCE_ROW_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- Related resolution/production-activation Jest bundle covering the existing readiness, recheck, command-readiness, protected execution, and production activation contracts.
- `npm run typecheck`
- Scoped ESLint for the touched Slice 81 source and test files.
- Source-only authority scan proving no worker, scheduler, route/action, incident command, Prisma write, migration, browser, AI, or WhatsApp authority was introduced.
- Scoped trailing-whitespace and `git diff --check` hygiene.

## Selection Decision

Slice 81 is selected as a narrow read-only contract over certified Slice 80 evidence. It does not authorize production activation or terminal resolution.