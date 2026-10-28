# Slice: Foundation and Inventory

## Scope

Establish the shared server result contract and prove it by migrating the existing inventory movement surface. Share read-model mechanics and UI behavior, never domain business truth or a universal write ledger.

Required lanes: `workbench`, `inventory`.

## Required outcomes

- Return rows, `nextCursor`, normalized `appliedFilters`, service-owned `summary`, `asOf`, and `partialSources`.
- Freeze traversal at `recordedThrough` and order cursor pages by `(effectiveAt DESC, recordedAt DESC, id DESC)` with no duplicate or missing traversal.
- Default to 50 rows and permit 25, 50, and 100.
- Preserve filters and selected row in URL state.
- Export the complete server-filtered result, not loaded browser rows.
- Make inventory KPI and table filters identical.
- Cover `WRITE_OFF` consistently.
- Define the inventory transaction proof subject before rendering proof badges.
- Render loading, empty, error, partial-source, permission, and no-organization states.

## Stage gates

- Stage 02: table, drawer, export, and action permissions are explicit; cursor and proof data cannot cross tenants.
- Stage 03: signed quantity, balance-after, valuation/source links, reversal/correction behavior, and write-off controls are explicit.
- Stage 04: query plan and index evidence support expected volume; summary and rows share one normalized filter contract.
- Stage 05: effective and recorded time are distinct; direction is not presented as risk.
- Stage 06: UI consumes the approved service contract without client-derived business arithmetic.
- Stage 07: pagination, export, RBAC, EN/FR, timezone, keyboard, 320px, desktop, and regression checks pass.

## Stop conditions

- Hidden fixed caps remain while the surface claims completeness.
- Proof badges lack an approved subject contract.
- `WRITE_OFF` data or labels diverge across schema, service, filters, and UI.
- Any cursor, export, or detail lookup can be reused across organizations.
- Existing inventory behavior regresses without an approved compatibility decision.

## Completion effect

Set `gates.foundationInventory.status` to `PASS` only after Stage 07 passes and evidence paths are recorded. Later slices must not infer this gate from code presence alone.
