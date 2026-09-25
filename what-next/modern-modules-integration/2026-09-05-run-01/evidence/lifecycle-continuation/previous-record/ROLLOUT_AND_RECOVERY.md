# Rollout and recovery

## Database changes

Apply in order through the repository migration process:

1. `20260905170000_add_tenant_module_composition`: configuration, distinct grants, immutable submitted command/review evidence, indexes and checks.
2. `20260905173000_protect_module_configuration_authority`: foreign keys linking grants/history to their retained configuration.

Neither migration issues a tenant grant, activates a customer, changes statutory records or modifies requested module intent. The first authorized configuration write captures existing legacy authority transactionally. The migration catalogue records both additions; existing migration names and SQL remain unchanged.

## Controlled target sequence

1. Identify the exact target and authorized operator. Follow `docs/migrations/MIGRATION_CONTROL_PLANE_DECISION_RECORD_2026-08-28.md` and the inspected production migration gate. Ordinary `npm run build` includes deployment and must not be used casually.
2. Back up through the target's established process and validate migration history/catalogue. A target with orphan authority must be reconciled; do not delete retained evidence to make the migration pass.
3. Apply both migrations in the approved maintenance/release window.
4. Generate the client from the final schema, then start the matching application version. On Windows, release an old app's engine handle during that controlled restart. This run used an isolated generated client and a byte-identical retained engine to avoid interrupting an unrelated development process; that is local verification tooling, not a production rollout prescription.
5. Verify a narrowly authorized tenant: baseline effective grants, selected workspace, no-op/duplicate apply, history/reopen, denied user and direct access to retained obligations.
6. Compare effective grants before/after. Review failures, conflict frequency, route loading and setup notices. Expand only with an approved cohort and retained evidence.

The new authority reader is used by the dashboard shell and existing enforcing actions/APIs. An unmigrated database or stale generated client can prevent authenticated pages from rendering. Migration/client readiness is therefore a release prerequisite for the whole authenticated application. Do not catch a missing-table/read failure and restore broad legacy access.

## Recovery

- Unsaved draft: remains browser/session/user scoped when storage is available. A browser draft is not authority.
- Saved draft: reopen from the configuration page. It cannot modify the active workspace by itself.
- Stale review: refresh current state, compare consequences, review again and submit a new command.
- Password step-up or unknown network outcome: repeat the same reviewed command/idempotency key; the server returns its existing result if it already committed.
- Terminal failed command: retain the failed evidence; correct the selection/setup/authority and create a fresh review and command.
- Earlier configuration: reopen the historical record as a new draft, review current permissions, eligibility and dependencies, then apply. History is never rewritten.
- Authority-store outage: fail closed with a recoverable error. Restore database/client availability; never substitute zero rows or legacy access for a failed query.

## Rollback boundary

Prefer a presentation rollback that retains the durable grant reader and both database migrations. Do not roll back to code that ignores managed grants: an old empty registration list could restore broad legacy access. Keep the last verified configuration and history while repairing the UI/service. Do not drop module tables, truncate evidence, disable append-only controls or edit old commands. A corrective forward release is the safe default.

No business data, ledger entries, provider configuration or commercial subscription is removed by workspace deselection. Operational deactivation is not offered until all affected new-work and continuation boundaries are implemented and verified.

## Isolated verification only

- Browser database: `stoquify_local_modern_modules_20260905_01`; app `http://127.0.0.1:3107`; private random fixture credentials under ignored `playwright/.auth/modern-modules-local.json`.
- Separate controls database: `stoquify_local_modern_modules_controls_20260905_01`; real service transactions and PostgreSQL negative tests; no authenticated customer claim.
- Helpers refuse remote/production targets and existing database creation. No reset or cleanup is automatic; retained test evidence explains its synthetic origin.
- Existing app port 3000, its database and existing sessions are not test targets. No live customer activation or production deployment has been performed.
