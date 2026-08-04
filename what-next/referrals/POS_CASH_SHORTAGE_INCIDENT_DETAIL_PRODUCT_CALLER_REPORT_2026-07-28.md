# POS Cash-Shortage Incident Detail Product Caller Report - 2026-07-28

## Scope

Phase 3 / Slice 44 wires the Slice 43 protected POS cash-shortage resolution action into the existing Workflow Assurance incident detail action panel for POS cash-shortage incidents only.

## Before

- Slice 43 certified `actions/assurance/pos-cash-shortage-resolution.actions.ts` as a protected server action wrapper.
- The protected action had no UI/product caller.
- Generic Workflow Assurance incident resolution remained the only product-surface resolution path.
- Production detector execution, worker activation, scheduling, alerts, rollback, AI, and WhatsApp authority remained unauthorized.

## After

- `components/assurance/AssuranceIncidentActions.tsx` imports `resolvePosCashShortageIncidentAction`.
- Only incidents with `checkKey === "pos.closed_shift_cash_shortage.review"` use the POS-specific protected action.
- Generic incidents continue to use `resolveWorkflowAssuranceIncidentAction`.
- The POS cash-shortage resolution call binds `currentSourceHash` to `incident.sourceHash`.
- The POS cash-shortage resolve dialog requires a `resolutionEvidenceHash`; the protected server action and service loader still derive source truth server-side.
- No new route, detector, worker, scheduler, alert dispatcher, rollback execution, production activation marker, AI authority, or WhatsApp authority was added.

## Verification

- `npm test -- --runInBand components/assurance/__tests__/AssuranceIncidentActions.test.tsx actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts`
  - Passed: 3 suites, 9 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint components/assurance/AssuranceIncidentActions.tsx components/assurance/__tests__/AssuranceIncidentActions.test.tsx`
  - Passed.
- Caller-footprint scan:
  - `rg -n "resolvePosCashShortageIncidentAction|pos-cash-shortage-resolution\.actions" app components hooks actions services scripts -g "*.ts" -g "*.tsx" -g "*.js"`
  - Product caller is limited to `components/assurance/AssuranceIncidentActions.tsx`; other references are the protected action source and focused tests.
- Runtime activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|runDormantPosShiftCashShortage|loadPosShiftCashShortageBatch|sendAlert|dispatchAlert|whatsApp|copilot|rollback" components/assurance/AssuranceIncidentActions.tsx components/assurance/__tests__/AssuranceIncidentActions.test.tsx`
  - Matches only existing `useRouter` / `router.refresh` UI refresh behavior; no detector, scheduler, worker, alert, rollback, AI, or WhatsApp wiring was introduced.
- `git diff --check -- components/assurance/AssuranceIncidentActions.tsx components/assurance/__tests__/AssuranceIncidentActions.test.tsx what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_44_SELECTION_REPORT_2026-07-28.md`
  - Passed with known CRLF normalization warnings.

## Residual Risks

- Browser/UI certification for the incident detail resolve flow is not yet completed.
- Product-caller audit/event verification should be selected as a later bounded slice before any production Leakage Radar resolution workflow is promoted.
- The live definition remains disabled with `productionActivationCertified: false`.
- No effective approved production threshold policy exists in the live policy table.
- Production detector execution, worker activation, scheduling, alert delivery, rollback execution, AI authority, and WhatsApp authority remain blocked.

## Handoff

Return to `/stoquify-referral-war-room` before selecting Slice 45. The next bounded slice should be chosen from current evidence, likely product-caller audit/event verification or browser certification, without inferring production activation.
