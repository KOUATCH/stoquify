# Referral War Room Phase 3 Slice 167 Selection Report

Date: 2026-07-29

## Selected Slice

Phase 3 / Slice 167 POS cash-shortage production activation review digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest status-line evidence-row table digest contract.

## Basis For Selection

Slice 166 certified a read-only one-row evidence table over the Slice 165 evidence row. The safest next step is a deterministic digest over that table so downstream reporting can consume row counts and requirement totals without touching activation, scheduling, persistence, notification, AI, WhatsApp, route, or UI authority.

## Expected Files

- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_SLICE_167_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_STATUS_LINE_EVIDENCE_ROW_TABLE_DIGEST_CONTRACT_REPORT_2026-07-29.md`

## Guardrails

- Preserve `activationAuthorized: false`.
- Do not add detector execution, scheduler authority, persistence writes, route/action surfaces, dashboard behavior, AI authority, WhatsApp authority, or production enablement.
- Keep the contract read-only and derived only from the certified production activation preflight input.
- Verify blocked, ready, and partial states.

## Planned Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-policy-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-scheduler-policy-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-production-activation-preflight.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction|recordWorkflowAssuranceIncident|transitionWorkflowAssuranceIncident|db\.|prisma|migrate|migration|activationAuthorized: true|WhatsApp|copilot|AI" services\leakage\pos-cash-shortage-production-activation-preflight.ts`
