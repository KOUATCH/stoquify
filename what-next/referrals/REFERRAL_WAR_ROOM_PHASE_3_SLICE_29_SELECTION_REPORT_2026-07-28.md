# Referral War Room Phase 3 Slice 29 Selection Report - 2026-07-28

## Selected Slice

Phase 3 / Slice 29 is selected as the POS cash-shortage incident command integration preflight.

## Evidence Reviewed

- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `what-next/referrals/POS_CASH_SHORTAGE_WORKER_CHECKPOINT_PERSISTENCE_ACTIVATION_EVIDENCE_REPORT_2026-07-28.md`
- `services/leakage/pos-cash-shortage-production-activation-preflight.ts`
- `services/leakage/pos-cash-shortage-incident-lifecycle-policy.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/assurance-incident-contracts.ts`
- `what-next/referrals/CASH_LEAKAGE_RADAR_REPORT_2026-07-19.md`
- `what-next/referrals/WORKFLOW_ASSURANCE_INCIDENT_LIFECYCLE_POLICY_REPORT_2026-07-27.md`

## Selection Rationale

The production activation preflight still lists `incident_command_integration` as unresolved. The platform has a generic Workflow Assurance incident command foundation and a POS-specific cash-shortage lifecycle policy, but no read-only contract that defines when those two pieces together are sufficient activation evidence.

The safest next step is a preflight that certifies representation only: generic command foundation plus POS-specific command-input policy plus separation from runtime invocation. It must not call incident commands or activate the detector.

## In Scope

- Add a read-only incident command integration preflight.
- Require generic incident command capabilities: resolve command, current source-hash confirmation, legal transition guard, event history, and audit history.
- Require POS-specific policy capabilities: POS cash-shortage check key, POS session source, current source-hash confirmation, independent reviewer guard, resolution evidence hash, and deterministic generic command input.
- Compose `incidentCommandIntegrationCertified` activation evidence only when both generic command and POS policy preflights certify.
- Keep `activationAuthorized: false`.
- Prove the production activation preflight can satisfy only `incident_command_integration` while remaining blocked by other requirements.

## Out Of Scope

- No call to `resolveWorkflowAssuranceIncident`.
- No call to generic incident transition commands from POS leakage code.
- No worker, scheduler, detector execution, registry activation, route, action, dashboard, notification, AI, or WhatsApp behavior.
- No production activation marker change.

## Expected Files

- `services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts`
- `services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
- `what-next/referrals/POS_CASH_SHORTAGE_INCIDENT_COMMAND_INTEGRATION_PREFLIGHT_REPORT_2026-07-28.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts services/leakage/__tests__/pos-cash-shortage-incident-lifecycle-policy.test.ts services/assurance/__tests__/assurance-incident.service.test.ts services/leakage/__tests__/pos-cash-shortage-production-activation-preflight.test.ts`
- `npm run typecheck`
- `npx eslint services/leakage/pos-cash-shortage-incident-command-integration-preflight.ts services/leakage/__tests__/pos-cash-shortage-incident-command-integration-preflight.test.ts`
- Source-only activation scan over the new preflight source.
- Broad activation scan over POS cash-shortage surfaces.
- Scoped diff hygiene over touched files.

## Handoff

Run Slice 29 under `stoquify-cash-leakage-radar` guardrails. Return to war-room review after certification. No Slice 30 is preselected.
