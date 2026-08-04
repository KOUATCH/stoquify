# Referral War Room Phase 3 Slice 43 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 43: POS cash-shortage protected resolution action wrapper.

Operating skill: `stoquify-cash-leakage-radar`

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `actions/assurance/workflow-assurance-incident.actions.ts`
- `actions/assurance/workflow-assurance-control-tower.actions.ts`
- `services/assurance/assurance-control-tower.service.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/leakage/pos-cash-shortage-resolution-source-loader.ts`
- `services/leakage/pos-cash-shortage-resolution-command.ts`

## Decision

Slice 42 certified the missing server-owned source loader. The next safe dependency is a POS-specific protected server action wrapper that derives tenant, actor, and permissions from `protect`, loads the incident through the existing control-tower read service, loads current POS source evidence through Slice 42, and then calls the dormant Slice 41 command.

The action must not accept POS event evidence, approved policy evidence, actor id, organization id, or actor permissions from the client.

## Scope

- Add a narrow protected server action file for POS cash-shortage resolution.
- Require `controls.manage`, fresh authentication, handler-derived tenant context, and audit posture.
- Accept only `incidentId`, `currentSourceHash`, `resolutionNote`, and `resolutionEvidenceHash`.
- Load incident detail server-side using the session organization and permissions.
- Load source evidence server-side using the Slice 42 source loader.
- Execute the dormant Slice 41 command only after source recheck input is server-derived.
- Return the command result while retaining `productSurfaceActivationAuthorized: false`.

## Expected Files

- `actions/assurance/pos-cash-shortage-resolution.actions.ts`
- `actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PROTECTED_RESOLUTION_ACTION_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
- Related protected action and resolution service verification.
- `npm run typecheck`
- Focused ESLint for the new action and test.
- Caller scan proving no UI route/component imports the new action.

## Non-Goals

- No UI caller.
- No route.
- No detector activation.
- No worker or scheduler.
- No alert dispatch or rollback.
- No AI or WhatsApp authority.
- No production activation marker.
