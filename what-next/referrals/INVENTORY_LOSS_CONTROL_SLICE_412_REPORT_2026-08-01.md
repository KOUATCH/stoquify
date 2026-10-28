# Inventory Loss Control Slice 412 Report

Date: 2026-08-01
Slice: Phase 3 / 412
Capability: Inventory Loss Deterministic Review Signal Contract
Status: Certified

## Decision

Slice 412 is certified as a contract-only bridge from the service-owned `inventory.loss` snapshot to Stoquify's deterministic business-signal and permission-filtered generic action-queue layers.

Before this slice, the normalized Inventory Loss snapshot existed but the shared signal rules did not recognize it. After this slice, recorded loss evidence can be represented as the neutral `inventory_loss_review` signal without making any product consumer load the snapshot.

## Implemented Contract

- Added `inventory_loss_review` with module `inventory`, permission `inventory.levels.read`, manager ownership, route `/dashboard/inventory/losses`, and a 48-hour review window.
- Admitted `SnapshotResult<InventoryLossMetrics>` to the deterministic rule input.
- Added snapshot kind and source-hash provenance to snapshot-derived signal facts and results.
- Emits no signal for a complete, non-truncated zero-record snapshot.
- Uses medium priority for complete bounded recorded-loss evidence.
- Uses high priority for truncation, missing evidence/valuation/approval attribution, a source-recorded theft category, or at least ten loss lines.
- Uses only aggregate metrics and a server-resolved tenant or location subject. No fixed currency threshold is used.
- States explicitly that approval attribution records authorization and does not identify who caused a loss.
- Added exhaustive compatibility mappings for Cash Command and Owner War Room. Neither service imports or loads the Inventory Loss snapshot.

## Trust Boundary

The rule consumes only the typed snapshot. It does not query Prisma, accept browser-supplied authority, persist an exception, identify a responsible actor, or infer fraud, fault, recovery, prevention, or resolution. Existing consumers remain responsible for tenant scope, module entitlement, and RBAC; the action queue additionally filters the signal by `inventory.levels.read`.

## Focused Evidence

- Final regression: 11 Jest suites, 61 tests passed.
- Focused implementation run: 4 suites, 27 tests passed.
- `npm run typecheck`: passed.
- Scoped ESLint: passed for all six product and test files.
- Prettier: passed for the formatter-clean rule, rule-test, and report files.
- Scoped `git diff --check`: passed.
- Direct database, browser-authority, sensitive-field, provenance, and consumer-activation scans: passed.
- No consumer outside the snapshot service or its test imports `getInventoryLossSnapshot`.

The first focused action-queue run correctly exposed that broad `inventory.read` satisfies `inventory.levels.read` under the repository's permission hierarchy. The negative fixture was corrected to `dashboard.read`; no permission logic was weakened.

The committed Owner War Room file already has formatter drift, so its one-line exhaustive-map addition was style-matched and verified by ESLint and scoped diff hygiene rather than reformatting unrelated code. Four global `git diff --check` EOF findings are in unrelated pre-existing files; the Slice 412 file set is clean.

## Non-Goals Preserved

No Daily Habit, Manager Action Center, Cash Command, or Owner War Room snapshot loader was added. No route, UI, persistence, notification, exception, incident, resolution, schema, migration, stock write, AI/copilot authority, WhatsApp authority, sharing, or production activation was added.

The inherited local Prisma `P3009` recorded during Slice 410 remains outside this contract-only slice and was not bypassed.

## Next Decision

No Slice 413 is selected. Run `stoquify-referral-war-room-orchestrator` for a fresh dependency and risk audit before authorizing another consumer or workflow.
