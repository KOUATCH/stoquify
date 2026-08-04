# Referral War Room Phase 3 Slice 46 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 46: POS cash-shortage browser certification readiness preflight.

Operating skill: `stoquify-cash-leakage-radar`

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_PRODUCT_CALLER_AUDIT_EVENT_PREFLIGHT_REPORT_2026-07-28.md`
- `app/[locale]/(dashboard)/dashboard/assurance/control-tower/incidents/[incidentId]/page.tsx`
- `components/assurance/AssuranceIncidentDetailView.tsx`
- `components/assurance/AssuranceIncidentActions.tsx`
- `actions/assurance/workflow-assurance-control-tower.actions.ts`
- `scripts/payroll-browser-smoke.js`
- `package.json`
- `playwright/.auth/`

## Decision

Slice 45 proved the product-caller audit/event chain without executing browser UI. The next blocker is browser certification. Current evidence shows no assurance-specific browser smoke wrapper and no assurance manager storage state under `playwright/.auth`, so a real browser certification would be dishonest. This slice adds a fail-closed readiness preflight that makes the missing browser prerequisites explicit.

## Scope

- Add a read-only preflight under `services/leakage/`.
- Prove the incident detail route and protected read action exist.
- Prove the detail view composes `AssuranceIncidentActions`.
- Prove the Slice 44/45 source contracts exist.
- Report browser certification as blocked until an assurance browser smoke script, package script, auth state, route id, screenshot evidence, and accessibility/layout evidence are present.
- Add focused tests with current blocked evidence and a certified fixture.

## Expected Files

- `services/leakage/pos-cash-shortage-browser-certification-readiness-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_BROWSER_CERTIFICATION_READINESS_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-browser-certification-readiness-preflight.test.ts`
- Related Slice 44/45 tests.
- `npm run typecheck`
- Focused ESLint.
- Source-only activation scan.

## Non-Goals

- Do not claim browser certification passed.
- Do not start a server or run a fake browser flow without auth state and fixture data.
- Do not add detector, worker, scheduler, alert, rollback, AI, or WhatsApp authority.
