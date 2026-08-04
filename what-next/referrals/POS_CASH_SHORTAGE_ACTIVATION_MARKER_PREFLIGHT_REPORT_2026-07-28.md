# POS Cash-Shortage Activation Marker Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 34 adds a fail-closed evidence preflight for the POS cash-shortage production activation requirements `service_activation_marker` and `release_gate_activation_marker`.

The slice validates marker evidence shape only. It does not set `metadata.productionActivationCertified: true` in the live definition, does not enable the definition, and does not authorize detector execution, worker activation, scheduling, notifications, incident command invocation, rollback execution, product UI, AI authority, or WhatsApp authority.

## Before State

- Slice 21 added the service-contract activation hold around `metadata.productionActivationCertified`.
- Slice 22 added the Workflow Assurance release-gate ratchet around the same marker.
- The production activation preflight accepted `serviceActivationCertified` and `releaseGateActivationCertified` booleans, but there was no POS cash-shortage-specific evidence contract describing what those booleans mean.
- The live definition remains disabled with `productionActivationCertified: false`.

## After State

- `services/leakage/pos-cash-shortage-activation-marker-preflight.ts` defines a versioned marker evidence contract.
- Certification requires:
  - correct marker evidence identity, check key, and definition version;
  - service activation marker present;
  - release-gate activation marker present;
  - both marker decisions certified;
  - shared release binding hash;
  - distinct marker and evidence references;
  - definition consistency with a marker-ready fixture definition;
  - registry-contract ratchet present;
  - release-gate ratchet present;
  - no activation authority.
- The current live disabled definition remains blocked even when a marker fixture is supplied.
- `composePosCashShortageActivationMarkerActivationEvidence` returns the two marker booleans only when the marker preflight certifies and always returns `activationAuthorized: false`.
- A certified fixture can satisfy only `service_activation_marker` and `release_gate_activation_marker` in the production activation preflight; all other absent activation requirements continue to block production readiness.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts`
  - Passed: 1 suite, 10 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts services/assurance/__tests__/assurance-registry-contracts.test.ts scripts/__tests__/workflow-assurance-release-gate.test.js`
  - Passed: 4 suites, 32 tests.
- `npm run typecheck`
  - Passed.
- `npm run lint -- --file services/leakage/pos-cash-shortage-activation-marker-preflight.ts --file services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts`
  - Passed with 0 errors; reported 4 existing warnings outside the touched Slice 34 files.
- Source-only activation scan:
  - `rg -n "CHECK_RUNNERS|scheduleWorkflow|router|createSafeAction|loadPosShiftCashShortageBatch|runDormantPosShiftCashShortage|queueWorkflowAssuranceWebhookDelivery\(|dispatchWorkflowAssuranceWebhookAlerts\(|resolveWorkflowAssuranceIncident\(|db\.|prisma" services/leakage/pos-cash-shortage-activation-marker-preflight.ts`
  - No matches.
- `git diff --check -- services/leakage/pos-cash-shortage-activation-marker-preflight.ts services/leakage/__tests__/pos-cash-shortage-activation-marker-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_34_SELECTION_REPORT_2026-07-28.md what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
  - Passed with the known CRLF notice on the status register.

## Certification Decision

Slice 34 is certified as a fail-closed service/release activation marker evidence preflight.

This certification does not mean live activation markers exist. Current live activation markers remain absent, the live POS cash-shortage definition remains disabled with `productionActivationCertified: false`, and production activation remains blocked and unauthorized.

## Next Handoff

Return to `stoquify-referral-war-room-orchestrator` before selecting Slice 35. No detector, scheduler, worker, route/action/UI, notification, incident command, rollback execution, AI, or WhatsApp behavior is authorized by this slice.