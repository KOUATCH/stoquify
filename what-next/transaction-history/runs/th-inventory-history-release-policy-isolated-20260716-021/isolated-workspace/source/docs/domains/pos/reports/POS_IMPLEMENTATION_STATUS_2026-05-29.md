# StockFlow POS Implementation Status

Prepared: May 29, 2026

## Executive Summary

The StockFlow POS foundation is now in place for the core Location -> Terminal -> Cash Drawer -> Cashier Session -> Draft Cart -> Tender -> Completed Sale path. The implemented POS slice uses the canonical service/action/hook/UI structure and real Prisma models. It does not use mock data for the POS workflow.

The current POS cluster compiles cleanly in a focused TypeScript check. A full production build still fails because of broader project-level blockers outside the POS slice, mainly missing modules in older dashboard routes and a server-only auth import being pulled into an incompatible route tree.

## Implemented POS Slices

### 1. Canonical POS Service Foundation

Files:

- `services/pos/pos.service.ts`
- `services/pos/pos.schemas.ts`
- `services/pos/money.ts`
- `actions/pos/catalog.actions.ts`
- `actions/pos/session.actions.ts`
- `actions/pos/cart.actions.ts`
- `hooks/posHooks/usePosOperations.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `app/[locale]/(dashboard)/dashboard/pos/page.tsx`

Completed capabilities:

- List real active locations.
- List real active POS terminals by location.
- Read the active cashier session for a terminal.
- Open a shift with declared opening float.
- Create or reuse a cash drawer for the terminal.
- Record opening float in `CashDrawerTransaction`.
- Keep `POSStation.currentSessionId` in sync.
- Close a shift with declared closing count and variance.
- Browse real sellable inventory by location.
- Show stock badges from `InventoryLevel.quantityAvailable`.
- Create a persisted draft cart as `SalesOrder` with status `DRAFT`.
- Add, update, and remove persisted `SalesOrderLine` rows.
- Recalculate cart subtotal, discount, tax, and total from persisted lines.

### 2. Receipt Delivery Slice

Files:

- `services/pos/receipt.service.ts`
- `actions/pos/receipt.actions.ts`
- `hooks/posHooks/useReceiptDelivery.ts`
- `app/api/receipts/[receiptId]/route.ts`
- `components/receipts/ReceiptPreviewDialog.tsx`

Completed capabilities:

- Build receipts from real `SalesOrder`, `SalesOrderLine`, `Payment`, customer, location, terminal, and session data.
- Support receipt channels: print, email, SMS, WhatsApp, and no receipt.
- Include WhatsApp receipt delivery through a provider adapter method: `sendWhatsAppReceipt`.
- Avoid hardcoded provider credentials.
- Record receipt delivery attempts in `AuditLog`.
- Provide a public digital receipt lookup route.

Current limitation:

- Delivery providers are stubbed. Real email, SMS, WhatsApp, print, and QR provider integrations are not connected yet.

### 3. Atomic Tender and Commit Sale Slice

Files:

- `services/pos/pos.service.ts`
- `actions/pos/tender.actions.ts`
- `hooks/posHooks/usePosOperations.ts`
- `components/pos/ProfessionalPOSSystem.tsx`

Completed capabilities:

- Commit a draft POS cart into a completed sale inside one Prisma transaction.
- Validate active terminal, location, and cashier session.
- Validate non-empty draft cart.
- Support tenders:
  - `CASH`
  - `CARD`
  - `MOBILE_MONEY`
  - `BANK_TRANSFER`
  - `STORE_CREDIT`
  - `ON_ACCOUNT`
- Calculate cash over-tender and change due.
- Reject non-cash over-tender.
- Enforce that `ON_ACCOUNT` requires an attached non-walk-in customer.
- Enforce customer credit limit before creating A/R.
- Create `Payment` rows for each tender.
- Decrement inventory using an optimistic `InventoryLevel.version` guard.
- Create `InventoryTransaction` rows with type `SALE`.
- Update cash drawer balances for cash net received.
- Create `CashDrawerTransaction` rows for cash sales.
- Update POS session totals:
  - gross sales
  - tax
  - discounts
  - transaction count
  - cash total
  - card total
  - mobile money total
  - bank transfer total
  - credit total
  - expected balance
- Create `CustomerLedgerEntry` rows for on-account sales.
- Update customer running balance for A/R.
- Mark `SalesOrder` as `COMPLETED`.
- Store a balanced finance journal snapshot in `AuditLog`.
- Fetch the receipt payload after commit.
- Optionally trigger receipt delivery after commit, including WhatsApp.

Current finance limitation:

- The current Prisma schema has customer and supplier ledger tables but no dedicated general ledger journal table. For now, the sale posts operational rows directly and stores balanced finance journal details in `AuditLog` as a snapshot. A real `JournalEntry` / `JournalEntryLine` model should be added for production-grade finance reporting.

## POS UI Status

The POS shell now includes:

- Three-zone workstation layout.
- Location and terminal setup.
- Shift open/close controls.
- Live shift HUD summary.
- Category browsing.
- Scanner/search-first item search.
- Grid/list item modes.
- Real inventory-backed item cards.
- Stock badges.
- Persisted cart rail.
- Quantity increment/decrement.
- Line removal.
- Tender method selector.
- Tender amount entry.
- Cash exact and quick amount buttons.
- Paid, due, and change preview.
- Receipt channel selector including WhatsApp.
- Commit sale button.
- Last sale completion feedback.
- EN/FR i18n keys.

UI limitations still remaining:

- Customer attach/search is not wired into the POS shell yet.
- True multi-tender UI uses one tender at the moment, while the service supports multiple tenders.
- Discounts, promotions, and manager approval are not wired yet.
- Parked carts UI is not implemented.
- Return/refund flow is not implemented.
- Void flow is not implemented.
- X/Z close wizard and PDF/print report are not implemented.
- Cash drop, cash pickup, and no-sale actions are not implemented.

## Verification Completed

### Focused TypeScript Checks

The POS/action/hook/UI cluster returned:

```text
COUNT 0
```

Files included in the focused check:

- `services/_shared/require-org.ts`
- `services/pos/money.ts`
- `services/pos/pos.schemas.ts`
- `services/pos/receipt.service.ts`
- `services/pos/pos.service.ts`
- `actions/pos/tender.actions.ts`
- `actions/pos/cart.actions.ts`
- `actions/pos/session.actions.ts`
- `hooks/posHooks/usePosOperations.ts`
- `components/pos/ProfessionalPOSSystem.tsx`
- `app/[locale]/(dashboard)/dashboard/pos/page.tsx`

### i18n JSON Validation

Both message files parse cleanly:

- `messages/en.json`
- `messages/fr.json`

### Dev Server Route Check

The dev server starts at:

```text
http://localhost:3000
```

Unauthenticated POS route check:

```text
GET /en/dashboard/pos -> 307 /en/login?callbackUrl=%2Fen%2Fdashboard%2Fpos
```

This is expected because the POS dashboard route is protected.

### Database Seed Readiness

The local database has enough seeded data for a manual POS walkthrough:

```json
{
  "users": 50,
  "locations": 50,
  "terminals": 50,
  "drawers": 50,
  "activeSessions": 16,
  "sellableItems": 50
}
```

Known development seed credential:

```text
cashier@stockflow.test / Cashier@2026
```

Use only in local development/demo environments.

## Full Production Build Status

Command run:

```text
npm run build
```

Result:

```text
Build failed
```

Initial build failures fixed during verification:

- Invalid `"use server"` barrel re-export in `actions/analytics/get-sales-analytics.ts`.
- Invalid `"use server"` barrel re-export in `actions/cashSystem/reports/analytics-actions.ts`.
- Invalid `"use server"` barrel re-export in `actions/newPOSSession/reports/analytics-actions.ts`.
- Missing `components/notifications/EnhancedNotificationProvider.tsx`.
- Missing `components/notifications/EnhancedNotificationTest.tsx`.

Current remaining build blockers:

1. Missing module:

```text
@/components/sales/CompleteIntegratedDailySalesDashboard
```

Referenced by:

```text
app/[locale]/(dashboard)/dashboard/sales/page.tsx
```

2. Server-only auth import in an incompatible route context:

```text
config/useAuth.ts imports next/headers
```

Build trace:

```text
config/useAuth.ts
app/(dashboard)/dashboard/purchases/orders/[id]/receive-items/page.tsx
```

3. Missing module:

```text
@/actions/suppliers/getOrgSuppliers
```

Referenced by:

```text
app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/page.tsx
app/[locale]/(dashboard)/dashboard/purchase-orders/[id]/edit/page.tsx
```

4. Missing module:

```text
@/lib/i18n/formatters
```

Referenced by:

```text
app/[locale]/(dashboard)/dashboard/purchase-orders/page.tsx
```

## Authenticated Browser Walkthrough Status

An authenticated browser walkthrough was not completed.

Reasons:

- No active authenticated browser session was available in the current environment.
- No Playwright package is installed in this workspace.
- The app has production build blockers outside the POS slice that should be cleared before treating browser UAT as authoritative.

Recommended manual UAT path once the build blockers are fixed:

1. Start the dev server.
2. Log in with `cashier@stockflow.test`.
3. Navigate to `/en/dashboard/pos`.
4. Select location `CMP-TERM-001` location if not auto-selected.
5. Select terminal `CMP-TERM-001`.
6. Open a shift with a known opening float.
7. Add item `CMP-SKU-001`.
8. Commit a cash sale with exact amount.
9. Commit a second cash sale with over-tender to verify change.
10. Commit an on-account sale with a real non-walk-in customer.
11. Send a WhatsApp receipt attempt and verify an audit row is created.
12. Reload the page and verify cart/session state survives.
13. Verify inventory level decreased.
14. Verify `InventoryTransaction`, `Payment`, `CashDrawerTransaction`, `POSSession`, `SalesOrder`, and `CustomerLedgerEntry` rows.
15. Close the shift and verify variance.

## What Remains For A Complete Enterprise POS

### Build and App Stabilization

- Fix all global production build blockers until `npm run build` passes.
- Resolve duplicate legacy route trees so only canonical locale dashboard routes remain active.
- Add missing compatibility modules only when the referenced feature is still intended to ship.
- Remove or quarantine old demo routes that are no longer part of the product.

### POS Service Completion

- Attach customer workflow with credit and A/R summary.
- Customer quick-create from POS.
- Multi-tender service tests and full UI chips.
- Line and order discounts.
- Promotion engine hooks.
- Manager approval and step-up flow.
- Cash drop and cash pickup.
- No-sale drawer event.
- Refunds and returns.
- Pre-commit void.
- Tendered sale refund flow.
- X report.
- Z close report.
- Signed Z snapshot.
- PDF/print support for Z reports.

### Finance Completion

- Add dedicated general ledger models:
  - `JournalEntry`
  - `JournalEntryLine`
  - chart-of-account references
  - immutable posting metadata
- Move the finance audit snapshot into real ledger postings.
- Add same-day dashboard invalidation and reconciliation queries.
- Add A/R aging and customer statement views for POS-created A/R.

### Receipt Completion

- Add provider adapters for:
  - email
  - SMS
  - WhatsApp
  - browser print
  - receipt PDF
- Add phone/consent validation for WhatsApp where supported by the customer model.
- Persist delivery attempts in a dedicated receipt delivery table if audit logs are not enough.
- Add retry state and provider reference lookup.

### Testing Completion

- Unit tests for money math.
- Unit tests for split tender allocation.
- Unit tests for cash change calculation.
- Unit tests for A/R credit limit enforcement.
- Unit tests for inventory optimistic locking.
- Transaction rollback test for simulated mid-commit failure.
- Integration test for full happy-path sale.
- Action tests for auth and schema validation.
- Browser UAT script for open shift -> sale -> WhatsApp receipt -> refund/void -> close shift.

## Recommended Next Slice

The highest-value next slice is:

```text
Clear global production build blockers, then add POS commit-sale integration tests.
```

Reason:

- The POS service already contains the critical transactional path.
- The database is seeded enough for real verification.
- A clean production build is required before browser UAT is meaningful.
- Integration tests will protect the most important enterprise invariant: sale, inventory, drawer, session, A/R, and finance snapshot must commit or roll back together.

## Proposed Next Steps

The next phase should be handled as a stabilization and verification pass before adding more POS features. The POS transaction path now exists, but the wider application still has build blockers. That means the first priority is to make the application buildable again, because browser UAT, release packaging, and production deployment are not meaningful until `npm run build` passes.

### Step 1: Stabilize The Production Build

Start by clearing the current global build failures one by one. Restore or replace the missing modules referenced by sales, supplier, purchase-order, and i18n routes. Then separate server-only auth helpers from client or legacy route contexts so `next/headers` is only imported where Next.js allows it. This step is complete when `npm run build` passes without webpack, module-resolution, or server/client boundary errors.

This should stay surgical. If an old route is no longer part of the product, remove or quarantine that route instead of rebuilding its entire dependency tree. If a referenced component still matters, add a compatibility wrapper that points to the current canonical component.

### Step 2: Lock The POS Commit Transaction With Tests

Once the build is stable, write focused tests around `commitPOSSale()`. These tests should prove that a sale either commits every operational impact or rolls back everything. Cover exact cash, cash over-tender and change, card tender, on-account tender, credit-limit rejection, insufficient stock, optimistic inventory conflict, and simulated mid-transaction failure.

This step is complete when the POS service tests prove that `SalesOrder`, `Payment`, `InventoryTransaction`, `InventoryLevel`, `CashDrawerTransaction`, `POSSession`, `CustomerLedgerEntry`, and finance audit rows remain consistent across success and failure paths.

### Step 3: Complete The Cashier-Facing Sale Flow

After the transaction is protected by tests, finish the cashier workflow in the POS shell. Add customer search and attach, customer quick-create, visible A/R balance, credit-limit warning, multi-tender chips, removable tenders, and receipt preview after commit. The service already supports multiple tenders, so this step should focus on making the UI match the service contract.

This step is complete when a cashier can open a shift, attach or create a customer, add inventory items, split tender across supported methods, complete the sale, and choose print/email/SMS/WhatsApp/no receipt without leaving the POS screen.

### Step 4: Replace Finance Audit Snapshot With Real Ledger Postings

The current commit flow records a balanced finance journal snapshot in `AuditLog` because the schema does not yet expose a dedicated general ledger table. For production finance, add durable ledger models such as `JournalEntry` and `JournalEntryLine`, linked to sales, payments, inventory cost, tax payable, cash clearing, card clearing, mobile-money clearing, bank clearing, and A/R.

This step is complete when each committed sale creates balanced debit/credit ledger lines that finance dashboards can query directly, without depending on audit-log JSON.

### Step 5: Add Refunds, Voids, And Shift Close Reporting

Next, implement the operational controls around completed sales. Pre-commit drafts can be voided. Completed sales should use refund flows. Refunds must reverse inventory and finance according to the selected lines and tender method. Then complete X report and Z close reporting so each shift can be reconciled with expected versus declared cash and per-tender totals.

This step is complete when the POS supports partial refunds, full refunds, pre-commit voids, X report review, Z close, signed Z snapshot storage, and variance note requirements.

### Step 6: Connect Receipt Delivery Providers

The receipt delivery abstraction already supports WhatsApp. The next step is to connect real providers behind the adapter interface. Keep credentials in environment variables or a secrets manager, validate phone numbers and delivery eligibility, and persist delivery attempt status with provider references.

This step is complete when print, email, SMS, and WhatsApp delivery attempts produce clear success/failure states and receipts can be reprinted or resent from completed sales.

### Step 7: Run Authenticated Browser UAT

After the build, transaction tests, and cashier UI are stable, run a full authenticated walkthrough using seeded data. The local seed is ready for this with `cashier@stockflow.test / Cashier@2026`. The walkthrough should cover shift open, sale commit, cash change, multi-tender, on-account A/R, WhatsApp receipt attempt, reload survival, inventory decrement, finance postings, refund, void, and shift close.

This step is complete when the manual UAT script passes in both English and French, in light and dark themes, with keyboard and touch-mode interactions verified.

### Suggested Execution Order

Use this order for the next implementation sessions:

1. Fix production build blockers.
2. Add POS commit-sale tests.
3. Finish customer attach and multi-tender UI.
4. Add real finance ledger models and postings.
5. Implement refunds, voids, X report, and Z close.
6. Connect receipt providers, including WhatsApp.
7. Run and document authenticated UAT.

The key principle is to avoid adding more visible POS features until the current atomic sale path is protected by tests and the full application can build. That gives the team a stable base instead of a larger pile of unverified behavior.

## Progress Update: Build Stabilization Started

Work has started on Step 1 from the proposed next steps: stabilize the production build before adding more POS workflow surface area.

Completed in this stabilization pass:

- Added `components/sales/CompleteIntegratedDailySalesDashboard.tsx` as a compatibility wrapper to the current analytics dashboard component.
- Added `lib/i18n/formatters.ts` with `formatCurrency`, `formatNumber`, and `formatDate` helpers used by legacy purchase-order routes.
- Added `actions/suppliers/getOrgSuppliers.ts` as a tenant-scoped supplier listing action for routes that expected that module.
- Replaced a client-side import of `config/useAuth.ts` in `app/(dashboard)/dashboard/purchases/orders/[id]/receive-items/page.tsx` with the client-safe `useClientAuth()` hook.
- Replaced a dynamic client import of `config/useAuth.ts` in `app/(dashboard)/dashboard/settings/roles/new/page.tsx` with `useClientAuth()`.
- Fixed the Next 15 page-prop mismatch in `app/(dashboard)/dashboard/customers/page.tsx`.

Build status after the first stabilization batch:

- The build moved past the earlier missing-module and server/client boundary blockers.
- The build reached linting and type validation.
- The current remaining blockers are now concentrated in legacy route compatibility and stale export names rather than the canonical POS slice.

Current remaining blocker categories:

1. Legacy routes importing names that are no longer exported.
2. Old route trees under `app/(dashboard)` duplicating newer locale routes under `app/[locale]`.
3. Stale action names for inventory, item, supplier, unit, tax-rate, and commercial-agent modules.
4. A few old pages importing icon names that are not exported by the installed `lucide-react` version.
5. Old pages expecting default exports from modules that now expose named actions.

Recommended next stabilization batch:

1. Decide whether `app/(dashboard)` is still a supported route tree. If not, quarantine it so the build only validates the canonical locale dashboard.
2. If `app/(dashboard)` must remain supported, add compatibility exports for the stale action names in small batches.
3. Replace invalid Lucide icon imports with installed equivalents.
4. Fix remaining Next 15 page prop signatures as they surface.
5. Rerun `npm run build` after each batch and record the next first-order blocker.

Important note:

The POS cluster still has a clean focused TypeScript check. The production build is blocked by broader application drift, not by the new POS transaction, receipt, action, hook, or POS shell files.
