# Stage 06 Frontend Delivery Authorization Request

Run: `th-inventory-history-public-uploadthing-pilot-20260716-014`
Slice: `foundation-inventory`
Requested stage: `06`
Skill: `stoquify-transaction-history-06-frontend-delivery`
Agent type: `Frontend Developer`
Status: `READY_FOR_FRONTEND_AUTHORIZATION`

## Why This Request Exists

Stage 06 is blocked in the current run because the manifest only allowlists:

- `what-next/transaction-history/runs/th-inventory-history-public-uploadthing-pilot-20260716-014/slices/foundation-inventory/06-frontend-delivery.json`

The run manifest also has `orchestratorPolicy.productCodeEdits: false`, and the shared run-manifest schema requires that value to remain false. Therefore a valid Stage 00 control-plane manifest cannot authorize frontend product edits without a deliberate suite-contract change or a separate implementation workflow outside this control-plane manifest.

## Upstream Readiness

- Stage 04 read-model optimizer: `PASS`
- Stage 05 workbench UX contract: `PASS`
- Stage 06 entry gate: `BLOCKED`, because frontend edits are not authorized
- Current validator result before this request: valid run evidence, `evidenceCount: 3`

## Proposed Exact Stage 06 Product Allowlist

These paths are the minimum practical frontend surface for the inventory movement complete-history workbench. They are selected from the Stage 05 handoff and Stage 06 eligible categories.

### Route

- `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`

Purpose: swap the visible page from the legacy recent-activity component to the server-owned history workbench route integration.

### Shared Workbench Shell

- `components/dashboard/history/TransactionHistoryWorkbenchShell.tsx`

Purpose: create the shared shell boundary for command context, same-filter KPIs, action queue, server filter controls, table region, pagination, robust states, and the page-level drawer.

### Inventory Domain Adapter

- `components/inventory/movements/InventoryMovementHistoryWorkbench.tsx`
- `components/inventory/movements/inventoryMovementHistoryAdapter.ts`

Purpose: keep inventory-specific row mapping, columns, row actions, status labels, permission-aware copy, export trigger binding, and drawer sections outside the shared shell.

### URL And Query Hook

- `hooks/useInventoryMovementHistoryWorkbench.ts`

Purpose: preserve locale-aware URL state for filters, page size, cursor, and selected row; reset cursor on filter changes; normalize server-action inputs.

### Messages

- `messages/en.json`
- `messages/fr.json`

Purpose: source all user-visible and accessible copy from EN/FR messages, including enum labels, robust states, drawer labels, export states, and proof-unavailable language.

### Focused Tests

- `components/dashboard/__tests__/TransactionHistoryWorkbenchShell.test.tsx`
- `components/inventory/movements/__tests__/InventoryMovementHistoryWorkbench.test.tsx`
- `hooks/__tests__/useInventoryMovementHistoryWorkbench.test.ts`

Purpose: cover envelope mapping, URL restoration and cursor reset, robust states, selected-row drawer behavior, no client-derived totals, no client-visible-row export, EN/FR copy, and organization-timezone boundary behavior.

## Dirty-Path Decision

Checked paths:

- `app/[locale]/(dashboard)/dashboard/inventory/movements/page.tsx`
- `components/inventory/movements/StockMovementDashboard.tsx`
- `components/dashboard/history`
- `hooks/useInventoryMovementHistoryWorkbench.ts`
- `messages/en.json`
- `messages/fr.json`
- `components/dashboard/__tests__`
- `hooks/__tests__`

Result:

- No dirty overlap was reported for the exact existing product files.
- `components/dashboard/history` does not exist yet.
- `hooks/useInventoryMovementHistoryWorkbench.ts` does not exist yet.
- `components/dashboard/__tests__` exists.
- `hooks/__tests__` exists.

## Required Suite Decision

Choose one execution model before Stage 06 implementation:

1. Create a deliberate frontend implementation workflow outside the Stage 00 control-plane manifest, using the exact allowlist above and preserving Stage 04/05 contracts.
2. Evolve the transaction-history run-manifest schema and orchestrator policy so a valid Stage 06 implementation run can explicitly authorize product-code edits.

Do not change the current run manifest to `productCodeEdits: true` under the existing schema; that would make the manifest invalid.

## Recommended Next Action

Proceed with option 1 for speed: run `stoquify-transaction-history-06-frontend-delivery` as a product implementation task using the exact allowlist above, while keeping the existing blocked Stage 06 evidence as the control-plane audit record.

Carry forward the go-live blocker from Stage 04: public UploadThing storage remains pilot-only and must be replaced before production launch.
