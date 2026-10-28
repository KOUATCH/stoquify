# Referral War Room Phase 3 / Slice 10 Selection Report

Generated: 2026-07-27

## Selected Slice

**Workflow Assurance incident lifecycle policy foundation**

This slice hardens the generic incident lifecycle before any POS cash-shortage detector, worker, scheduler, action, route, dashboard, AI flow, or WhatsApp automation is activated.

## Evidence Reviewed

- `docs/referrals/stoquify-referral-worthy-war-plan-report.md`
- `docs/referrals/stoquify-referral-worthy-war-plan-prompt.md`
- `docs/referrals/stoquify-referral-worthy-execution-roadmap.md`
- `docs/referrals/stoquify-referral-worthy-executed-roadmap-report.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`
- `services/assurance/assurance-incident-contracts.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- `services/assurance/assurance-registry-persistence.service.ts`
- `services/leakage/pos-shift-cash-shortage-batch.service.ts`
- `services/leakage/pos-shift-cash-shortage-evaluator.ts`
- `prisma/schema.prisma`

## Current State

Slice 9 certified dormant transactional multi-finding persistence. It can persist source findings and converge repeated source evidence into stable `WorkflowAssuranceIncident` cases, but the downstream lifecycle remains generic:

- incident assignment accepts an `ownerId` without verifying that the owner is an active user in the same tenant;
- terminal resolution requires a note but does not require current source evidence confirmation;
- transition legality is only partially guarded by final-status checks;
- future POS money-protection cases could therefore be acknowledged, assigned, or resolved through stale or cross-tenant assumptions if a caller is later exposed without additional controls.

## Decision

Select one narrow foundation slice:

1. Define an explicit legal incident transition policy for generic Workflow Assurance cases.
2. Validate assignees as active users belonging to the same organization.
3. Require terminal resolution to present the current incident `sourceHash`, giving future source-owned recheck commands a stable contract to satisfy.
4. Preserve existing upsert, redaction, event, alert, audit, and waiver behavior.

## Non-Goals

- No POS cash-shortage registry definition.
- No detector activation.
- No worker, scheduler, checkpoint, lease, or retry contract.
- No production cash-shortage threshold or seeded policy.
- No route, action, dashboard, notification surface, AI authority, or WhatsApp authority.
- No schema migration unless the live service requires it.
- No POS-specific source re-evaluator in this slice.

## Expected Files

- `services/assurance/assurance-incident-contracts.ts`
- `services/assurance/assurance-incident.service.ts`
- `services/assurance/__tests__/assurance-incident.service.test.ts`
- `what-next/referrals/WORKFLOW_ASSURANCE_INCIDENT_LIFECYCLE_POLICY_REPORT_2026-07-27.md`
- `what-next/referrals/REFERRAL_WAR_ROOM_STATUS.md`

## Verification Plan

- `npm test -- --runInBand services/assurance/__tests__/assurance-incident.service.test.ts`
- `npm test -- --runInBand services/assurance/__tests__/assurance-registry-persistence.service.test.ts services/assurance/__tests__/assurance-registry-persistence-contracts.test.ts`
- `npx eslint services/assurance/assurance-incident-contracts.ts services/assurance/assurance-incident.service.ts services/assurance/__tests__/assurance-incident.service.test.ts`
- `npm run workflow:assurance:release-gate`
- `npm run workflow:assurance:runtime-check`

## Next Skill

Continue under `stoquify-referral-war-room-orchestrator`; consult `stoquify-cash-leakage-radar` only after this lifecycle foundation is certified and the war room selects detector integration.
