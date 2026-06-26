# Kontava Assurance Registry Foundation Run Report - 2026-06-21

## Scope

Implemented the observe-mode Workflow Assurance Registry foundation requested by the `kontava-assurance-registry-foundation` skill. This pass adds registry definitions, tenant-scoped check-run persistence, server-only execution helpers, and a protected manual runner. It does not create incidents, alerts, enforcement gates, or UI-owned check definitions.

## Implemented

- Added Prisma models and enums for `WorkflowAssuranceCheckDefinition` and `WorkflowAssuranceCheckRun`.
- Added migration `20260621103000_workflow_assurance_registry_foundation` with idempotent enum/table/index creation.
- Added code-owned initial check definitions:
  - `ledger.posted_source_link.required`
  - `business_event.applied_or_visible`
  - `business_event.outbox.stuck_sla`
- Added deterministic source hashing and result normalization for statuses, severity, evidence links, fingerprints, and counts.
- Added server-only registry service that upserts definitions, runs registered checks, records check-run history, and keeps first rollout in observe mode.
- Added permission-bounded execution: manual users only inspect a check when their RBAC permissions satisfy that check's `requiredPermission`.
- Added protected server action `runWorkflowAssuranceChecksAction` behind `controls.audit.read`.

## Verification

- `npm run prisma:validate` passed.
- `npx prisma generate --no-engine` passed. Plain `npm run prisma:generate` hit a Windows file lock on Prisma's query engine DLL.
- Focused Jest tests passed: 3 suites, 9 tests.
- `npm run typecheck` passed.
- `git diff --check -- prisma\schema.prisma` passed.

## Notes

This is intentionally not an incident system yet. The registry now gives the system a stable place to define invariants, execute checks, persist evidence-aware results, and later route confirmed anomalies into incidents, manager action queues, close gates, or BI trust indicators.
