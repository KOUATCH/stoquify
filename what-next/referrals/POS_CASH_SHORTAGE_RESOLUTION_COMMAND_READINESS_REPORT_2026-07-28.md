# POS Cash-Shortage Resolution Command Readiness Report - 2026-07-28

## Scope

Phase 3 / Slice 38 adds a pure terminal resolution command-readiness contract for POS cash-shortage incidents.

The contract is implemented in `services/leakage/pos-cash-shortage-resolution-command-readiness.ts`. It composes certified source-owned recheck evidence from Slice 37 with the POS incident lifecycle policy and prepares the generic incident resolution command input only when every guard passes.

This slice does not call the generic incident resolver, write audit logs, write incident events, call the database, start workers, schedule jobs, send alerts, expose routes/actions/UI, execute rollback, or grant AI/WhatsApp authority.

## Before State

- Slice 37 certified source-owned resolution recheck.
- Live terminal resolution remained blocked because no command-readiness contract composed source recheck with lifecycle policy, maker-checker, RBAC, note, and resolution evidence hash.
- The existing POS lifecycle policy could produce a deterministic generic command input, but no POS-owned readiness boundary required certified recheck before exposing it.

## After State

- `preparePosCashShortageResolutionCommandReadiness` requires certified source recheck evidence with `activationAuthorized: false`.
- The helper invokes the existing POS lifecycle policy for:
  - POS cash-shortage incident identity.
  - resolvable lifecycle state.
  - current source hash confirmation.
  - POS permission.
  - independent reviewer / maker-checker separation.
  - resolution note.
  - resolution evidence hash.
  - triggered shortage metadata.
- The result exposes a prepared `ResolveWorkflowAssuranceIncidentInput` only when readiness certifies.
- Blocked readiness returns `commandInput: null` and a policy blocker message.
- The result always returns `activationAuthorized: false`.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts`
  - Passed: 1 suite, 6 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-source-recheck.test.ts services/leakage/__tests__/pos-cash-shortage-resolution-readiness-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
  - Passed: 5 suites, 35 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-resolution-command-readiness.ts services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts`
  - Passed.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage|queueWorkflowAssuranceWebhookDelivery\(|dispatchWorkflowAssuranceWebhookAlerts\(|resolveWorkflowAssuranceIncident\(|transitionWorkflowAssuranceIncident\(|recordWorkflowAssuranceIncident\(|upsertWorkflowAssuranceIncidentFromResult\(|db\.|prisma\." services/leakage/pos-cash-shortage-resolution-command-readiness.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-resolution-command-readiness.ts services/leakage/__tests__/pos-cash-shortage-resolution-command-readiness.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_38_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known CRLF warning on `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`.

## Certification Decision

Slice 38 is certified as a pure POS cash-shortage terminal resolution command-readiness contract.

This certification does not authorize live terminal resolution. A future command-execution slice must still wire the generic incident resolver with RBAC-protected caller context, audit/event verification, idempotency/concurrency rules, and release gates. Production activation remains blocked and unauthorized.

## Handoff

Return to `stoquify-referral-war-room-orchestrator` before selecting Slice 39. No detector, scheduler, worker, route/action/UI, notification, live incident command execution, rollback execution, AI, or WhatsApp behavior is authorized by this slice.
