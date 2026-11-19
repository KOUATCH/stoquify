# Command Center persistence and three-view integration

24 October 2026. Implemented behind `COMMAND_CENTER_PERSISTENCE_ENABLED=true`; default is off. No production access, application-database migration, deployment, seed, commit, external notification, or financial business command was performed. The user authorized disposable persistence and integration work and automatic continuation.

## Delivered behavior

The existing Daily Digest, Manager Action Center (tenant and location views), and Owner War Room now embed the same **Work & follow-up** panel. There is no fourth navigation destination. All three read the same occurrence, owner, coordination state, due date, and review evidence for the same authorized source/scope. Digest starts with the personal filter; the other views start with all permitted follow-ups. Authorized location selection permits Digest and Owner to open the same location occurrence as Manager. Selected location is safe navigation state in `followUpLocation`; every request independently validates it. Scope changes clear old private content and discard late responses.

Seven previously unpersisted aggregate families now have coordination storage: payment suspense, stock availability, overdue receiving, inventory loss, retained close obligations, payroll forecast proof, and employee balance recovery. Existing assurance assignment, accountant requests, reconciliation and branch-close workflows retain their existing owners and business commands. The panel supplies source links rather than inventing a universal completion action.

An assignment/date change commits its revision, immutable event and recipient notice together. Replay uses the same request and intent, checks current authority again and cannot duplicate the transition. Competing revisions conflict. A transport failure keeps the exact request and freezes edits until retry or refresh. Source evidence changes invalidate review while retaining the current owner; a positively cleared condition that recurs gets a new occurrence without inheriting the old assignment. Missing/deleted/filtered evidence is unknown, not complete.

Review receipts bind the actor, tenant, authorized scope, reporting interval, the fixed Work & follow-up projection and monotonic evidence revision. A -> B -> A does not revive an old receipt. Review requires the All view so hidden colleagues' work cannot be described as reviewed below. The receipt covers this shared panel, **not the Owner financial brief or financial approval**; the existing visit-only financial brief acknowledgement remains separately labelled.

Notifications reuse the existing business-signal preference/quiet-hour decision. Delivery is in-app on a subsequent authorized visit, with durable pending/published/read identity; there is no background email, webhook or worker. Failed publication rolls back and retries the same identity on the next permitted read. Recipient revocation hides the data and prevents publication. Preferences survive new sessions. See the exact delivery decision in [source and scope decisions](SOURCE_AND_SCOPE_DECISIONS.md).

## Evidence classes

| Class | Result | Evidence |
|---|---|---|
| Workflow contract | Passed; 196 commands remain unclassified, no registry bypass or blanket certification | Initial `npm run agent:workflow:check` |
| Real PostgreSQL | **64 tests passed, 0 skipped**, three suites; all seven adapters, tenant/location and new-session identity, replay, competing updates, actual revocation lock wait, rollback, recurrence, review invalidation and notice retry | [results](postgres-results.json), [target/shutdown](target-evidence.json), [runner](run-postgres.cjs) |
| Mocked/pure/component/actions | **590 tests passed, 0 skipped**, 36 suites | [results](mocked-results.json), [bounded config](jest.config.cjs) |
| Rendered synthetic browser | **8 journeys, 32 automated accessibility scans**, no reported violations or page errors; EN/FR, Digest/Owner/Manager/location Manager, 375/768/1440, keyboard/focus, 200% CSS reflow, uncertain retry, preference editing, authorized location selection, source Back, denial/refresh | [journeys](browser-results.json), [scans](accessibility-results.json), [runner](verify-browser.cjs) |
| Static | Scoped TypeScript, Prisma schema validation and lint results recorded in verification summary | [summary](verification-summary.json) |
| Preservation | Pre-turn files captured; schema additions isolated; package/registry and unrelated source baselines preserved | [manifest](preservation.json), [owned diff](phase6-owned.patch) |

The database runner creates a fresh PostgreSQL 17 loopback cluster, verifies the actual data directory and database identity, bootstraps the captured pre-turn schema, then applies the additive SQL migration. It strips inherited connection redirects and never loads the application's environment. The cluster was stopped successfully. This is an additive-migration rehearsal against a schema-model baseline, **not a full historical migration-chain or deployment certification**.

The browser runner uses actual components and Tailwind with synthetic DTOs and stubbed action transport. It does not sign into the application or prove a real browser-to-server-to-database journey. Database tests separately exercise real services, SQL, source readers, constraints and transactions; their source completion cases update synthetic fixture records directly, not real financial workflows. Automated axe and keyboard checks are not a human screen-reader audit or native browser zoom certification.

## Verification commands and repairs

Commands were inspected for side effects before execution. Exact runner configuration is retained in this directory. The database runner requires this workspace’s preserved `.codex-tmp/phase6-before/prisma/schema.prisma` capture; it is a controlled local rehearsal runner, not a generic CI migration job. Its capture digest is recorded in `before-files.json` and `target-evidence.json`.

- `node docs/command-center/phase-6-integration-2026-10-24/run-postgres.cjs`
- `node node_modules/jest/bin/jest.js --config docs/command-center/phase-6-integration-2026-10-24/jest.config.cjs --runInBand --json --outputFile=docs/command-center/phase-6-integration-2026-10-24/mocked-results.json`
- `node docs/command-center/phase-6-integration-2026-10-24/verify-browser.cjs`
- `node node_modules/typescript/bin/tsc -p docs/command-center/phase-6-integration-2026-10-24/tsconfig.json --pretty false`
- ESLint against the 22 changed application/test files; schema validation against an isolated copied schema/configuration with no dotenv and a nonconnecting placeholder URL.

The initial PostgreSQL run exposed UTC date shifting under the local server timezone; dates and new-table timestamps now use explicit UTC semantics. An intermediate run passed 58 tests; final coverage adds six regression/race cases. Review also found declaration-only disappearance, equal-total loss record replacement, tenant-only integration and filtered review scope; each was corrected with regression evidence. The first Node-only fixture setup and later ambiguous checkbox selector failures were corrected. The first sandboxed Edge launch failed; the reviewed local-only runner succeeded with sandbox escalation. Mobile visual inspection led to stacked search/save controls and a visible native calendar icon. Final recovery review added an EN/FR scope-reset control for revoked or invalid saved locations. These earlier attempts are not represented as passes.

## Rollout, rollback and remaining gates

Application changes are ready for further isolated acceptance; production is not enabled. The additive migration is `prisma/migrations/20261024180000_command_center_coordination/migration.sql`. Do not enable the flag in any environment before applying the reviewed migration through that environment's established release/schema controls. Existing Prisma client generation was deliberately untouched; the new store uses parameterized SQL, while source readers accept an optional transaction client and preserve existing callers.

Rollback is to unset the feature flag and redeploy through the normal release process. The old dashboards/source workflows remain available and coordination, event, review and notice rows remain intact. New tables restrict tenant deletion; immutable event/receipt triggers reject history mutation. Any future retention/purge process needs its own explicit reviewed design. No destructive down migration or financial backfill is part of this change.

Open Release B gates: a full authenticated disposable browser -> source business workflow -> refreshed three-center journey; full migration-history/artifact release rehearsal; human screen-reader and productivity acceptance; operational performance under representative tenant volumes. Do not claim all of Phase 7 or production readiness from the bounded evidence here. Source destination pages retain their own existing filters: locale and native Back are preserved, but there is no claim that every destination accepts this panel's location/window as a filter. Current-state counts are intentionally distinct from the old page-specific financial summaries.
