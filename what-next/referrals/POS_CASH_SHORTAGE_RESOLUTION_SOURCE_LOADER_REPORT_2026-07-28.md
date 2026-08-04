# POS Cash-Shortage Resolution Source Loader Report - 2026-07-28

## Scope

Phase 3 / Slice 42 adds a service-owned source evidence loader for future POS cash-shortage terminal resolution callers.

This slice does not add a protected server action, route, UI, worker, scheduler, detector activation, alert dispatch, rollback execution, product-surface incident command invocation, AI authority, or WhatsApp authority.

## Before State

- Slice 41 certified a dormant idempotent resolution command wrapper.
- The wrapper required `sourceRecheckInput`, but a future protected caller must not accept POS event or policy evidence from the client.
- `loadPosShiftCashShortageEvaluationBatch` already proved service-owned POS event loading by time window.
- `resolveApprovedCashShortagePolicy` already proved approved policy evidence and approval-event verification.

## After State

- `services/leakage/pos-cash-shortage-resolution-source-loader.ts` now loads a single current POS close source for a POS cash-shortage incident.
- The loader derives source evidence from tenant, incident source type, POS session id, and current source hash.
- It accepts only applied `pos.shift.closed` / `CASH_DRAWER_CLOSE` business events with schema version 1 and verified payload hash.
- It resolves approved cash-shortage policy evidence by tenant, currency, and close time.
- It recomputes the cash-shortage evaluation and returns the exact Slice 37 `sourceRecheckInput` shape for the dormant Slice 41 command wrapper.
- It blocks stale incident/source hashes, missing source events, missing approved policy evidence, source payload hash drift, and non-triggered current source evidence.
- `activationAuthorized` remains `false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts`
  - Passed: 1 suite, 6 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts services/assurance/__tests__/assurance-incident.service.test.ts`
  - Passed: 5 suites, 44 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-resolution-source-loader.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|createSafeAction|resolveWorkflowAssuranceIncident\s*\(|transitionWorkflowAssuranceIncident|recordWorkflowAssuranceIncident|sendAlert|dispatchAlert|whatsApp|copilot" services/leakage/pos-cash-shortage-resolution-source-loader.ts`
  - No matches.
- Caller scan:
  - `rg -n "loadPosCashShortageResolutionSourceForIncident" services/leakage actions/assurance actions/pos app components -g "*.ts" -g "*.tsx"`
  - Matches only the loader source and focused tests.
- `git diff --check -- services/leakage/pos-cash-shortage-resolution-source-loader.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_42_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known status-register CRLF warning.

## Certification Decision

Slice 42 is certified as a service-owned POS cash-shortage resolution source loader contract. It makes a future protected resolution caller safer by removing the need for client-supplied POS event or policy evidence.

No Slice 43 is selected by this report.
