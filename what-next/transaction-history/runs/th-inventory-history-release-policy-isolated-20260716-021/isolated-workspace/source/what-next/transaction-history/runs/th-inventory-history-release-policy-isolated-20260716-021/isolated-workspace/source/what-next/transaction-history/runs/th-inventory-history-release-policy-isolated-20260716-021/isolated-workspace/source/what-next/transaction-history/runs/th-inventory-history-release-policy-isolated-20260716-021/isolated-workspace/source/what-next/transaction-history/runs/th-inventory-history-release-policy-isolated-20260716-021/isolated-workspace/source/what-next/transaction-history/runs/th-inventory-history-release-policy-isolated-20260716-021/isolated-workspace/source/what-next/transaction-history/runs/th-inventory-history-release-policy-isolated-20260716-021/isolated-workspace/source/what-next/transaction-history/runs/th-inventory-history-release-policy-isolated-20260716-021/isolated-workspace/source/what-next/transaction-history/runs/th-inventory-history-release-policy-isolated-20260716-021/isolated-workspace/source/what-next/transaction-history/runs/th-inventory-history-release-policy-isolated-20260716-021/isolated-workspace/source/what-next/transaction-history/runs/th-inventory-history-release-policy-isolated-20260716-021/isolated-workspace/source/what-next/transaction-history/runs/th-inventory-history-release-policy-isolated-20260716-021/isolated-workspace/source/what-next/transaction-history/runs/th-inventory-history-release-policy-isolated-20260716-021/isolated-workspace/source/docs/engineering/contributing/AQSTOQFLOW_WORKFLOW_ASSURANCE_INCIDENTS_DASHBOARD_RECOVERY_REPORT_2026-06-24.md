# Workflow Assurance Incidents Dashboard Recovery Report - 2026-06-24

## Scope

Diagnosed the `workflow_assurance_incidents` absence reported against the Owner War Room, Manager Action Center, and Workflow Assurance Control Tower load paths.

## What `workflow_assurance_incidents` Is

`workflow_assurance_incidents` is the durable incident table behind Prisma `WorkflowAssuranceIncident`. It is the cross-workflow control spine that turns failed, blocked, warning, or errored assurance checks into tenant-scoped, auditable work with dedupe fingerprints, status transitions, incident events, alert delivery history, waivers, evidence grade, action routes, and owner/manager routing metadata.

It is not mock dashboard storage. It is the persistence layer that lets workflow assurance checks become visible, permission-filtered, proof-linked manager and owner work.

## Failure Path

- Prisma schema already contained `WorkflowAssuranceIncident` mapped to `workflow_assurance_incidents`.
- Committed migrations already existed:
  - `20260621103000_workflow_assurance_registry_foundation`
  - `20260621113000_workflow_assurance_incident_spine`
- The live database had `_prisma_migrations`, but it only showed migrations through `20260619120000_backfill_purchase_receive_permission`.
- Direct database probes confirmed these tables were absent before repair:
  - `workflow_assurance_check_definitions`
  - `workflow_assurance_check_runs`
  - `workflow_assurance_incidents`
- The Control Tower route directly calls `getAssuranceControlTowerData`, which queries `db.workflowAssuranceIncident`.
- Manager Action Center has a safe bridge around Control Tower incidents, but both Manager Action Center and Owner War Room also build `getTenantOperatingSnapshotFromRelated`, which directly queries `db.workflowAssuranceIncident.count/findFirst` for ledger trust blockers. That made the missing table a shared dashboard load failure, not just a Control Tower empty-state issue.

## Remedy Chosen

Chosen remedy: third option, a schema catch-up plus existing stabilization bridge.

No rebuild was warranted. The page/service architecture is sound: domain snapshots remain the source of truth, the assurance spine carries cross-workflow incidents, Manager Action Center projects incidents into action items, and Owner War Room consumes the resulting action pressure through snapshots and action queues.

No broad refactor was warranted in this pass. The smallest permanent repair was to apply the committed workflow assurance migration chain so the runtime database matches the already-implemented schema and services. The existing Manager Action Center safe bridge remains useful as a last-resort degradation path, but it should not be the normal state.

## Applied Repair

`npx prisma migrate status` and `npx prisma migrate deploy` both failed locally with a schema-engine error before reporting or applying migrations. Direct Prisma database queries succeeded, and `psql`/`pg` were not available.

To avoid inventing a schema, I applied the exact committed SQL from the two pending migration files statement-by-statement through Prisma, then recorded both rows in `_prisma_migrations` with SHA-256 checksums matching the committed files.

Created/verified tables:

- `workflow_assurance_check_definitions`
- `workflow_assurance_check_runs`
- `workflow_assurance_incidents`
- `workflow_assurance_incident_events`
- `workflow_assurance_alert_deliveries`
- `workflow_assurance_waivers`

Migration rows recorded:

- `20260621103000_workflow_assurance_registry_foundation`, 13 statements, checksum matched file
- `20260621113000_workflow_assurance_incident_spine`, 22 statements, checksum matched file

## Dashboard Impact

Manager Action Center:

- Can now build tenant operating snapshots without crashing on `workflow_assurance_incidents`.
- Can show assurance incidents in the manager run sheet once check runs create incidents.
- With zero current incidents, it truthfully returns an empty assurance incident slice rather than hiding a database failure.

Owner War Room:

- Can now build the tenant operating snapshot and owner action queue without missing-table failure.
- Assurance incidents intervene indirectly through ledger trust blockers, BI snapshot trust, proof-linked action pressure, and the owner action queue.

Workflow Assurance Control Tower:

- Can now query incident, run, alert, suppressed, and waiver data directly.
- With no current definitions/runs/incidents, it returns healthy empty state instead of crashing.

## Verification

- `npm run prisma:validate` passed.
- Direct database probe confirmed the missing tables were absent before repair and present after repair.
- Migration history checksum check passed for both applied migration rows.
- Targeted Jest passed: 9 suites, 57 tests.
  - `services/snapshots/__tests__/tenant-operating-snapshot.service.test.ts`
  - `services/manager-action-center/__tests__/manager-action-center.service.test.ts`
  - `services/owner-war-room/__tests__/owner-war-room.service.test.ts`
  - `services/assurance/__tests__/assurance-incident.service.test.ts`
  - `services/assurance/__tests__/assurance-registry.service.test.ts`
  - `actions/assurance/__tests__/workflow-assurance-incident.actions.test.ts`
  - `actions/assurance/__tests__/workflow-assurance-control-tower.actions.test.ts`
  - `components/manager-action-center/__tests__/ManagerActionCenterDashboard.test.tsx`
  - `components/owner-war-room/__tests__/OwnerWarRoomDashboard.test.tsx`
- `npm run typecheck` passed.
- Live database smoke:
  - organization `cmp_org_001`
  - assurance table counts all query successfully
  - Owner War Room service returned without missing-table failure
  - Manager Action Center service returned `state: "partial"` with `assuranceIncidents: 0`
  - Assurance Control Tower service returned `open: 0`, `incidents: 0`, `recentRuns: 0`, `engineHealth: "healthy"`

## Remaining Risks

- Local Prisma schema-engine remains broken for `migrate status/deploy`; future release work should fix that path so migrations do not need a manual committed-SQL fallback.
- The assurance tables are present but currently empty. Full dashboard richness depends on registry seeding/runners creating check definitions, check runs, and incidents from real workflow failures.
- I did not run a browser/dev-server smoke in this pass; verification was database, service, component, action, and typecheck focused.

## Next Hardening

- Fix Prisma schema-engine execution in this Windows workspace and rerun `npx prisma migrate status`.
- Seed or register the workflow assurance check definitions expected by the current assurance registry.
- Run the assurance scheduler/runner in observe mode to populate check runs and incident examples from real data.
- Add a release gate that fails when Prisma schema includes workflow assurance models but the database is missing the registry or incident tables.
