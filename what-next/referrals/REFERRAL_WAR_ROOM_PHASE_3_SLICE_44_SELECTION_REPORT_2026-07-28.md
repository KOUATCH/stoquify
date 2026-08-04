# Referral War Room Phase 3 Slice 44 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 44: POS cash-shortage incident detail product caller.

Operating skill: `stoquify-cash-leakage-radar`

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `actions/assurance/pos-cash-shortage-resolution.actions.ts`
- `components/assurance/AssuranceIncidentActions.tsx`
- `components/assurance/AssuranceIncidentDetailView.tsx`
- `services/assurance/assurance-control-tower-contracts.ts`

## Decision

Slice 43 certified a protected server action wrapper but intentionally left it unimported by product surfaces. The next smallest movement is to wire that protected action into the existing Workflow Assurance incident detail action panel for POS cash-shortage incidents only.

Generic Workflow Assurance incidents must keep the existing generic resolve action path.

## Scope

- Import the POS-specific protected action in `AssuranceIncidentActions`.
- Route only `pos.closed_shift_cash_shortage.review` incidents through the POS-specific action.
- Preserve `incident.sourceHash` binding for `currentSourceHash`.
- Require a resolution evidence hash in the resolve dialog for POS cash-shortage incidents.
- Keep existing generic resolve behavior for all other incidents.
- Add focused component tests proving the POS-specific action is called only for POS cash-shortage incidents and that generic incidents stay on the generic action.

## Expected Files

- `components/assurance/AssuranceIncidentActions.tsx`
- `components/assurance/__tests__/AssuranceIncidentActions.test.tsx`
- `what-next/referrals/POS_CASH_SHORTAGE_INCIDENT_DETAIL_PRODUCT_CALLER_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand components/assurance/__tests__/AssuranceIncidentActions.test.tsx`
- Related protected action and resolution action tests.
- `npm run typecheck`
- Focused ESLint for the component and test.
- Runtime wiring scan proving no detector, worker, scheduler, alert, rollback, AI, or WhatsApp behavior is introduced.

## Non-Goals

- No new route.
- No detector activation.
- No worker or scheduler.
- No alert dispatch or rollback.
- No production activation marker.
- No AI or WhatsApp authority.
