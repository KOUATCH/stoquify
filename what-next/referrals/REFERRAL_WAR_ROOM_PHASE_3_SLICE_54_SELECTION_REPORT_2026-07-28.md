# Referral War Room Phase 3 Slice 54 Selection Report

Date: 2026-07-28
Skill: `stoquify-referral-war-room-orchestrator` with `stoquify-cash-leakage-radar`

## Selected Slice

Phase 3 / Slice 54: POS cash-shortage production activation source-owned resolution readiness ratchet.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_POLICY_READINESS_RATCHET_REPORT_2026-07-28.md`
- `what-next/referrals/POS_CASH_SHORTAGE_RESOLUTION_READINESS_PREFLIGHT_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-resolution-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`

## Decision

The production activation preflight now requires production policy readiness and browser certification gate evidence, but it does not yet require the previously certified source-owned resolution readiness family as top-level activation evidence.

The next safest step is a ratchet only: add `source_owned_resolution_readiness` to the production activation preflight evidence contract. This prevents production activation from being considered ready unless terminal resolution safety is explicitly represented alongside policy, browser, worker, scheduler, incident, alert, rollback, observability, and owner/security requirements.

## Non-Goals

- Do not execute or activate the POS cash-shortage detector.
- Do not create workers, schedulers, leases, routes, actions, dashboards, or alerts.
- Do not mutate Workflow Assurance incidents.
- Do not implement browser auth state, fixtures, screenshots, or production browser certification.
- Do not add AI, WhatsApp, rollback execution, or production enablement.
- Do not compose runtime evidence from the resolution command/action; this slice only ratchets the activation preflight requirement.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCTION_ACTIVATION_RESOLUTION_READINESS_RATCHET_REPORT_2026-07-28.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- Related POS cash-shortage resolution and production activation tests.
- `npm run typecheck`
- Scoped ESLint for touched files.
- Static source scan proving no worker, scheduler, route, action, incident command, Prisma/DB, AI, or WhatsApp authority was added.
- Scoped diff and direct whitespace hygiene.