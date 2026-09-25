# Stoquify Table Harmonization NOW Implementation Report

Date: 2026-08-28  
Status: Implemented and focused-contract verified  
Scope: NOW slice N0-N6 only

## Executive result

Stoquify now has one canonical governance layer for its existing TanStack table stack. The work does not add another grid library, replace service-owned business logic, or migrate unrelated tables. Inventory items, purchase orders, and payment reconciliation are the only canonical pilots.

The shared layer defines:

- A versioned canonical table contract with archetype, data ownership, stable row identity, query allow-lists, columns, selection, actions, access boundaries, built-in views, and export policy.
- Deterministic URL parsing and serialization, a typed server-query projection, debounced search updates, and abortable latest-request handling.
- Versioned local preferences for column visibility, column order, and comfortable or compact density. Stale contract versions and unknown columns are discarded.
- A permission-safe saved-view schema that rejects cross-tenant, private-owner, and under-permission hydration and removes unauthorized filters or columns.
- Explicit page, explicit-row, and all-matching selection scopes tied to the canonical query fingerprint, with query-change invalidation.
- Robust loading, refreshing, empty, no-results, error, forbidden, not-entitled, and ready semantics with polite screen-reader announcements.
- Known, estimated, and unknown result-count formatting that avoids invented totals.
- A two-stage export contract. Client intent records tenant, table version, query, scope, columns, locale, time zone, permission, module, redaction policy, source read model, and correlation ID. Server finalization additionally requires the requester, authorization decision, idempotency key, and accepted timestamp.

## Pilot outcomes

### Inventory items

- Bound the existing TanStack table to `inventory.items` without replacing protected create, edit, or delete flows.
- Uses the domain item ID as the stable row ID.
- Persists visibility, order, and density under a versioned table-specific key.
- Keeps the existing stock-filter URL behavior and adds canonical debounced search URL state.
- Announces loading, empty, no-results, ready, and explicit selection state.
- Adds `aria-sort` plus keyboard-operable sorting controls to sortable headers.
- Adds an Export Evidence worksheet to existing XLSX output. The worksheet is client intent evidence and does not claim server authorization.

### Purchase orders

- Bound the existing TanStack work queue to `purchasing.purchase-orders` while preserving service-provided capability guards for edit, approve, receive, cancel, and archive.
- Uses the purchase-order ID as the stable row ID.
- Persists visibility, order, and density and exposes bilingual density controls.
- Adds canonical debounced search URL state and fingerprints date-range state.
- Announces empty, no-results, ready, and explicit selection state and exposes `aria-sort` on headers.
- Adds an Export Evidence worksheet to existing XLSX output without changing mutation or permission paths.

### Payment reconciliation

- Bound the authenticated evidence workbench to `finance.payment-reconciliation`.
- Keeps the current service-supported query truth: location, period, start date, and end date only.
- Does not invent provider-account or reconciliation-status client filtering that the current capture read model cannot authorize or serve.
- Preserves tenant isolation, `payments.reconciliation.read`, the `payment_reconciliation` entitlement, proof redaction, fresh-auth certificate export, and existing protected actions.
- Passes the canonical client export request ID into the protected server certificate action as its correlation ID.

## Governance and scope controls

- Registered every current table-bearing source in the repository as shared core, public portal, canonical pilot, or registered legacy.
- The ratchet fails when a new table-bearing application source is introduced without a registry entry.
- Exactly three sources are marked as canonical pilots.
- Existing table surfaces outside these pilots remain registered but unmigrated.
- No payment, inventory, purchasing, RBAC, entitlement, tenant, redaction, or domain service implementation was changed.
- No translation catalog was changed. Existing EN/FR behavior is preserved, and new shared density, state, and selection semantics include EN/FR copy.

## Verification

Final focused result:

- 4 Jest suites passed.
- 24 tests passed.
- 0 focused failures remain.
- Suites covered canonical query sanitization, stable fingerprints, server projection, preference migration, saved-view authorization, selection invalidation, truthful result semantics, export finalization, table registry ratchet, purchase-order controls, and payment-reconciliation protected behavior.

Authenticated desktop, tablet, and mobile browser evidence was not captured. No approved credentials or seeded-data authorization was supplied for this task, so launching those sessions would have violated the evidence boundary.

## Deliberate residual boundaries

- Client-generated inventory and purchase-order XLSX files now carry canonical intent evidence, but they are not server-certified exports. The contract prevents treating them as authorization proof; a future server endpoint must finalize requests before certified export claims are allowed.
- Provider-account and reconciliation-status filtering remains deferred until the payment reconciliation read model and service contract expose authorized fields.
- Unrelated registered legacy tables are intentionally not migrated in this NOW slice.

## Changed shared surfaces

Shared files: `components/DataTableComponents/table-system-contract.ts`, `components/DataTableComponents/useCanonicalTablePreferences.ts`, `components/DataTableComponents/useCanonicalTableUrlState.ts`, `components/DataTableComponents/CanonicalTableBoundary.tsx`, `components/DataTableComponents/CanonicalTableDensityControl.tsx`, `components/DataTableComponents/pilot-table-contracts.ts`, `components/DataTableComponents/table-system-registry.ts`, and `components/DataTableComponents/index.ts`.

## Changed pilots

Pilot files: `components/ui/groups/inventory/ItemManagement.tsx`, `components/ui/groups/purchase-orders/PurchaseOrderManagement.tsx`, and `components/finance/PaymentReconciliationWorkbench.tsx`.

## Added focused tests

Test files: `components/DataTableComponents/__tests__/CanonicalTableContract.test.ts` and `components/DataTableComponents/__tests__/TableSystemRegistry.contract.test.ts`.
