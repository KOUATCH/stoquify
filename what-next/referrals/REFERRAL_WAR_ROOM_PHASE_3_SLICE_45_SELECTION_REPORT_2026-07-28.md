# Referral War Room Phase 3 Slice 45 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 45: POS cash-shortage product-caller audit/event preflight.

Operating skill: `stoquify-cash-leakage-radar`

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_INCIDENT_DETAIL_PRODUCT_CALLER_REPORT_2026-07-28.md`
- `components/assurance/AssuranceIncidentActions.tsx`
- `actions/assurance/pos-cash-shortage-resolution.actions.ts`
- `services/leakage/pos-cash-shortage-resolution-command.ts`
- `services/assurance/assurance-incident.service.ts`

## Decision

Slice 44 certified the intended product caller but left audit/event verification as an explicit blocker. The next smallest safe movement is a read-only preflight proving the product caller remains routed through the protected POS action and that terminal mutation, event history, and audit history remain owned by the generic Workflow Assurance incident service.

## Scope

- Add a read-only Slice 45 preflight under `services/leakage/`.
- Prove the incident detail product caller is POS-check-key gated.
- Prove the caller passes `incident.sourceHash` as `currentSourceHash` and includes a resolution evidence hash.
- Prove the POS protected action keeps `controls.manage`, fresh auth, handler-derived tenant context, and audit posture.
- Prove the action derives incident/source evidence server-side before invoking the POS command wrapper.
- Prove the POS command delegates only prepared command input to the generic resolver.
- Prove the generic resolver records durable incident event and audit history.
- Add focused tests for the certified chain and fail-closed regressions.

## Expected Files

- `services/leakage/pos-cash-shortage-product-caller-audit-event-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-product-caller-audit-event-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-product-caller-audit-event-preflight.test.ts`
- Related verification with component, protected action, command wrapper, and generic incident service tests.
- `npm run typecheck`
- Focused ESLint for the new preflight and test.
- Runtime activation scan proving no detector, worker, scheduler, route, alert, rollback, AI, or WhatsApp behavior is introduced.

## Non-Goals

- No browser certification in this slice.
- No detector activation.
- No worker or scheduler.
- No alert dispatch or rollback.
- No new route or new product surface.
- No AI or WhatsApp authority.
