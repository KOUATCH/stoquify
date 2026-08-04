# POS Cash-Shortage Protected Resolution Action Report - 2026-07-28

## Scope

Phase 3 / Slice 43 adds a POS-specific protected server action wrapper for cash-shortage incident resolution.

This slice does not add a UI caller, route, worker, scheduler, detector activation, alert dispatch, rollback execution, production activation marker, AI authority, or WhatsApp authority.

## Before State

- Slice 41 certified a dormant idempotent resolution command wrapper.
- Slice 42 certified a service-owned source loader so future callers would not pass POS event or policy evidence from the client.
- The generic Workflow Assurance resolve action required `currentSourceHash`, but it did not perform the POS source loader/recheck sequence before resolution.

## After State

- `actions/assurance/pos-cash-shortage-resolution.actions.ts` defines `resolvePosCashShortageIncidentAction`.
- The action is protected with `controls.manage`, fresh authentication, audit posture, and handler-derived tenant context.
- Client input is limited to `incidentId`, `currentSourceHash`, `resolutionNote`, and `resolutionEvidenceHash`.
- Client-supplied organization, actor, permissions, POS event, policy, or source recheck evidence is rejected by the strict schema.
- The action loads incident detail through `getAssuranceIncidentDetailData` using the session organization and permissions.
- The action loads current POS source evidence through `loadPosCashShortageResolutionSourceForIncident`.
- The action calls `executePosCashShortageResolutionCommand` only with server-derived incident, actor, permissions, and source recheck input.
- The returned command result still carries `productSurfaceActivationAuthorized: false`.

## Verification

- `npm test -- --runInBand actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
  - Passed: 1 suite, 5 tests.
- `npm test -- --runInBand actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts actions/assurance/__tests__/workflow-assurance-control-tower.actions.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-loader.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-command.test.ts services/assurance/__tests__/assurance-incident.service.test.ts`
  - Passed: 6 suites, 39 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint actions/assurance/pos-cash-shortage-resolution.actions.ts actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
  - Passed.
- Caller scan:
  - `rg -n "resolvePosCashShortageIncidentAction|pos-cash-shortage-resolution\.actions" app components hooks actions services scripts -g "*.ts" -g "*.tsx" -g "*.js"`
  - Matches only the new action source and focused test.
- Runtime wiring scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|cron|router|runDormantPosShiftCashShortage|loadPosShiftCashShortageBatch|sendAlert|dispatchAlert|whatsApp|copilot" actions/assurance/pos-cash-shortage-resolution.actions.ts actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts`
  - Matches only focused test guardrail assertions.
- `git diff --check -- actions/assurance/pos-cash-shortage-resolution.actions.ts actions/assurance/__tests__/pos-cash-shortage-resolution.actions.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_43_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known status-register CRLF warning.

## Certification Decision

Slice 43 is certified as a protected server action wrapper for POS cash-shortage resolution. It closes the protected-action gap while keeping product UI, production activation, detector execution, workers, schedulers, alerts, AI, and WhatsApp unauthorized.

No Slice 44 is selected by this report.
