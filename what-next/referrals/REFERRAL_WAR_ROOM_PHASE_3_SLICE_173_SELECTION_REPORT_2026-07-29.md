# Referral War Room Phase 3 Slice 173 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 173 POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row contract.

## Basis For Selection

Slice 172 certified a read-only status-line over the Slice 171 digest. The next smallest safe step is an evidence-row wrapper over that status-line, following the established status-line -> evidence-row sequence in the production activation preflight inventory.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_173_STATUS_LINE_EVIDENCE_ROW_CONTRACT_REPORT_2026-07-29.md`

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not add detector execution, scheduler authority, persistence writes, route/action surfaces, dashboard behavior, AI authority, WhatsApp authority, or production enablement.
- Keep the evidence row read-only and derived only from the certified production activation preflight input.
- Verify blocked, ready, and partial evidence-row states.

## Planned Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration|activationAuthorized: true|WhatsApp|copilot|AI" services\leakage\pos-cash-shortage-production-activation-preflight.ts`
