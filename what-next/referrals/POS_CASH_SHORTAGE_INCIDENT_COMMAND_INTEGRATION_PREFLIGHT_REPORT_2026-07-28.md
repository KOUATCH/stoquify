# POS Cash-Shortage Incident Command Integration Preflight Report - 2026-07-28

## Scope

Phase 3 / Slice 29 added a read-only POS cash-shortage incident command integration preflight. The slice certifies that the existing generic Workflow Assurance incident command foundation and the POS-specific cash-shortage incident lifecycle policy can be represented as activation evidence without activating the detector, worker, scheduler, route, action, UI, or any incident command invocation.

## Before

- The production activation preflight listed `incident_command_integration` as unresolved.
- The generic incident command service already owned source-hash validation, legal transitions, event history, and audit history.
- The POS cash-shortage lifecycle policy already produced deterministic command input and enforced an independent reviewer with resolution evidence hash.
- No narrow preflight existed to prove those two surfaces were sufficient evidence for the production activation checklist.

## After

- Added `services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts`.
- Added `services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`.
- The new preflight requires:
  - Generic resolve command representation.
  - Generic current source-hash guard.
  - Generic legal transition guard.
  - Generic event history.
  - Generic audit history.
  - POS policy command input.
  - POS session source identity.
  - POS independent reviewer guard.
  - POS resolution evidence hash.
  - No direct POS-side generic incident command invocation.
- `composePosCashShortageIncidentCommandIntegrationActivationEvidence` emits `incidentCommandIntegrationCertified: true` only when the preflight certifies and always keeps `activationAuthorized: false`.
- Production activation can now satisfy only `incident_command_integration`; it remains blocked by service activation marker, release gate, worker checkpoint persistence, scheduler policy, alert delivery, rollback, observability runbook, and owner/security approval requirements when those are absent.

## Verification

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
  - Passed: 1 suite, 7 tests.
- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/assurance/__tests__/assurance-incident.service.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
  - Passed: 4 suites, 35 tests.
- `npm run typecheck`
  - Passed.
- `npx eslint services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
  - Passed.
- Source-only activation scan over the new preflight source
  - No matches.
- Broad activation scan over POS cash-shortage surfaces
  - Matched only existing and new test guardrail assertions.
- `git diff --check -- services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md what-next/referrals/REFERRAL_WAR_ROOM_PHASE_3_SLICE_29_SELECTION_REPORT_2026-07-28.md`
  - Passed with the known CRLF notice on `REFERRAL_WAR_ROOM_STATUS.md`.

## Decision

Slice 29 is certified as a read-only incident command integration evidence preflight. It does not authorize production activation. No Slice 30 is selected; return to the war-room orchestrator before choosing the next bounded contract.
