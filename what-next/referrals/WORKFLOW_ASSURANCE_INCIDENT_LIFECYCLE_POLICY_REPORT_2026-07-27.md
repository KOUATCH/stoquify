# Workflow Assurance Incident Lifecycle Policy Report

Generated: 2026-07-27

## Scope

Phase 3 / Slice 10 certified a generic Workflow Assurance incident lifecycle policy foundation. This slice does not activate POS cash-shortage detection or any Leakage Radar runtime worker.

## What Changed

- Added `ResolveWorkflowAssuranceIncidentInput` with required `currentSourceHash`.
- Added an explicit legal transition policy for generic `WorkflowAssuranceIncident` commands.
- Enforced the transition policy inside `transitionWorkflowAssuranceIncident`.
- Required resolution to confirm the current incident source hash before terminal resolution.
- Validated assignment owners as active users in the same organization.
- Updated protected resolve action schema and UI caller to pass `incident.sourceHash`.
- Updated internal agent reconciliation healing to select and pass the current incident `sourceHash`.
- Added focused negative tests for stale resolution, illegal reopen from `OPEN`, and cross-tenant/inactive assignee rejection.

## Certified Behaviors

- `OPEN`, `ACKNOWLEDGED`, `ASSIGNED`, `IN_PROGRESS`, and `REOPENED` incidents can move only through the allowed active lifecycle.
- `RESOLVED`, `WAIVED`, `SUPPRESSED`, and `CLOSED` incidents remain final unless explicitly reopened.
- Resolution fails before mutation when the caller cannot present the incident's current `sourceHash`.
- Assignment fails before mutation when the owner is not an active same-tenant user.
- Events and audit logs are written only after lifecycle validation passes.
- Existing Slice 9 multi-finding persistence continues to persist and converge incidents.

## Verification

| Check | Result |
| --- | --- |
| `npm test -- --runInBand services/assurance/__tests__/assurance-incident.service.test.ts` | pass, 17 tests |
| `npm test -- --runInBand services/assurance/__tests__/assurance-incident.service.test.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts services/assurance/__tests__/assurance-registry-persistence.service.test.ts services/assurance/__tests__/assurance-registry-persistence-contracts.test.ts` | pass, 4 suites / 32 tests |
| `npm run typecheck` | pass |
| `npx eslint services/assurance/assurance-incident-contracts.ts services/assurance/assurance-incident.service.ts services/assurance/__tests__/assurance-incident.service.test.ts actions/assurance/workflow-assurance-incident.actions.ts actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts components/assurance/AssuranceIncidentActions.tsx services/agents/agent-control-plane-reconciliation.service.ts` | pass |
| `npm run workflow:assurance:release-gate` | pass, 37/37 checks, 11/11 indexes, 2/2 engine gates, 0 blockers |
| `npm run workflow:assurance:runtime-check` | pass, 7/7 tables, 3/3 migrations, 0 blockers |
| `npm run service:boundary:fail` | pass, 0 active violations |
| No-activation scan for cash-shortage registry/worker/scheduler integration outside the dormant leakage contracts | pass, no matches |

## Non-Goals Preserved

- No POS cash-shortage registry definition.
- No detector activation.
- No worker, scheduler, checkpoint, lease, or retry contract.
- No production threshold or seeded policy.
- No new migration.
- No dashboard, route, public API, notification, AI authority, or WhatsApp authority.
- No POS-specific source re-evaluator.

## Residual Risks

- `currentSourceHash` is a generic concurrency guard, not a full source-owned re-evaluation. A future POS money-protection command must still re-read the owning POS close evidence and approved policy before resolving a cash-shortage case.
- Maker-checker resolution for POS money-protection cases remains domain-specific and uncertified.
- Waiver approval already has requester/approver separation, but broader assignment and resolution permissions remain action-level controls until a dedicated product surface is selected.

## Next Handoff

Return to `/stoquify-referral-war-room`. The next likely candidate is still bounded POS cash-shortage integration planning, but no detector, worker, scheduler, product surface, production policy, AI, or WhatsApp behavior is preselected by this report.
