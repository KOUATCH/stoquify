# StockFlow Enterprise POS Requirements

Use this reference when implementing or auditing the production POS workflow. Keep changes surgical, schema-aware, and aligned with existing StockFlow patterns.

## Objective

Build a production-grade Point-of-Sale workflow for StockFlow that ties together:

Location -> Terminal -> Cash Drawer -> Cashier Session -> Sale -> Inventory/Finance impact.

The workflow must be atomic and real time. The UX must feel like a modern enterprise POS comparable to Square for Retail, Lightspeed, Toast, or Shopify POS Pro. Every transaction must keep inventory, finance ledgers, customer A/R, and cashier shift totals in sync.

## Architectural Constraints

Stack: Next.js App Router, Prisma, TanStack Query.

Canonical layers:

- `services/pos/pos.service.ts`: implementation using Prisma `db` directly. No `"use server"`, no HTTP. Throw errors or domain subclasses.
- `services/pos/pos.schemas.ts`: Zod schemas for every service function, including open shift, add line, tender, commit, receipt delivery, refund, void, and close shift.
- `services/pos/pos.service.test.ts`: tests for every service function, transaction rollback paths, and money edge cases.
- `services/pos/money.ts`: centralized Decimal or integer minor-unit money helpers.
- `services/pos/audit.service.ts`: override and sensitive-operation audit events.
- `services/_shared/action-response.ts`: reuse `ok()`, `err()`, `okPaginated()`, and `errPaginated()`.
- `actions/pos/*.actions.ts`: thin handlers, one file per workflow noun.
- `hooks/posHooks/*.ts`: TanStack Query hooks that call actions and invalidate on success.
- `components/pos/*`: UI components consume hooks only.

Hard rules:

- No mock data. Every number, list, badge, and balance must read/write through real Prisma models via the service layer.
- No legacy fat action extension. New logic flows through services.
- Persisted money uses Decimal or integer minor units, never JS floats.
- All state mutations happen inside `prisma.$transaction`.
- All strings use `next-intl`; add EN and FR keys together.
- Dark/light theming uses existing tokens.

## Required Domain Model

Reuse existing models when they already fit. Extend Prisma only where necessary.

- Location: existing model.
- Terminal/Register: named device at a location, for example `LOC-PAR-T01`.
- CashDrawer: one per terminal, opening float, current balance, per-tender totals, denomination breakdown on close.
- CashierSession/Shift: opened by a user at a terminal with declared opening float. Exactly one open session per terminal.
- Sale/Order: location, terminal, session, cashier, optional customer, status, subtotal, discount, tax, total, amount paid, change due, balance due.
- SaleLine: item, quantity, unit price, line discount, tax rate, line total, cost at sale, inventory lot reference when supported.
- Payment/Tender: CASH, CARD, MOBILE_MONEY, BANK_TRANSFER, STORE_CREDIT, ON_ACCOUNT, GIFT_CARD.
- AccountsReceivable entry: created for ON_ACCOUNT tender; links Customer -> Sale -> outstanding balance; enforces credit limit at tender time.
- InventoryMovement: SALE, RETURN, VOID_REVERSAL rows; decrement stock per location and respect costing method.
- FinanceLedger postings: balanced debit/credit rows for Sales Revenue, Tax Payable, COGS, Inventory, Cash/Card Clearing, and A/R using existing finance primitives.

## Service Functions

Implement each as service + action + hook + UI step:

- Open shift.
- Build cart.
- Add item by barcode, SKU, category, or search.
- Update quantity.
- Apply line discount.
- Apply order discount or promotion.
- Void line.
- Park sale.
- Recall sale.
- Attach customer.
- Quick-create customer.
- Tender sale.
- Commit sale.
- Generate, print, email, SMS, WhatsApp, reprint, or skip receipt.
- Lookup receipt.
- Return/refund full or partial sale.
- Void pre-commit sale.
- No-sale drawer event.
- Cash drop.
- Cash pickup.
- X report during open shift.
- Z report and close shift.

## Atomic Commit Details

Within one transaction:

1. Validate active terminal, drawer, and cashier session.
2. Validate tender rules.
3. Resolve customer or walk-in.
4. Enforce A/R credit limit when ON_ACCOUNT is used.
5. Validate stock per location.
6. Create sale header and lines.
7. Create tender rows.
8. Issue per-terminal monotonic receipt number.
9. Decrement inventory and create movement rows.
10. Post finance ledger entries.
11. Update cash drawer totals.
12. Update cashier session aggregates.
13. Create receipt record or payload.

If any step fails, nothing commits.

## WhatsApp Receipt Requirements

Receipt delivery must support WhatsApp alongside print, email, SMS, reprint, and no-receipt.

Implementation guidance:

- Add `sendReceiptViaWhatsApp` or a generalized `sendReceipt` service with channel `WHATSAPP`.
- Keep provider integration behind an adapter interface such as `ReceiptDeliveryProvider.sendWhatsAppReceipt(input)`.
- Do not hardcode provider credentials.
- Validate phone number, locale, customer consent if present, and delivery eligibility.
- Include receipt number, location, terminal, cashier, item lines, taxes, discounts, tender summary, change due, balance due or A/R carried, and digital receipt URL.
- Record delivery status: pending, sent, failed, retryable, provider reference.
- Return actionable errors so the UI can retry or choose another receipt channel.

Provider integrations are out of scope unless explicitly requested. Stubs are acceptable if the adapter contract, persisted status/audit trail, and UI recovery path are complete.

## Real-Time Behavior

- Stock badges refresh immediately after line add/remove with optimistic update and per-location stock invalidation.
- Cashier session totals refresh after commit.
- Customer A/R balance refreshes after tender.
- Finance dashboard widgets reading same-day totals stay consistent through relevant invalidations.
- All updates survive hard reload because state lives in the database, not memory.

## UI Requirements

Macro layout at desktop:

- Left rail, 320px: categories, parked sales, recent customers, quick actions for no-sale, cash drop, cash pickup, and open drawer.
- Center: pinned search/scanner input, item grid or cart line table, grid/list toggle.
- Right rail, 420px: cart summary, customer chip, discount/promo, tender panel, totals, bottom-anchored charge CTA.

Modes:

- Touch mode: 56px targets, keyboard hints hidden, adjusted grid density.
- Compact mode: left rail collapses below 1280px.

Functional UI features:

- Universal command bar with Ctrl/Cmd K for items, customers, past sales, parked sales, settings, and hotkeys.
- Scanner-first autofocus and barcode enter handling.
- Hotkey HUD: F2 qty, F3 discount, F4 customer, F5 park, F6 recall, F7 no-sale, F8 tender, F9 cash exact, F10 split, Esc clear.
- Smart quantity pad.
- Inline price-check on right-click or long-press.
- Live stock badges: green above min, amber at/below min, red out, with tooltip by location.
- Discount governor with manager approval for threshold breaches.
- Multi-tender panel with Paid/Total/Due and cash quick pad.
- Change due pane with denomination suggestion.
- Customer 360 chip with A/R balance and last receipts.
- Parked carts dock with low-stock conflict handling on recall.
- Promo lines and eligible promo hints.
- Returns flow inline.
- Receipt preview pane with print, email, SMS, WhatsApp, no receipt, QR/digital receipt.
- Live shift HUD.
- End-of-shift wizard: denomination count, variance by tender, A/R created, print Z report.
- Offline-aware API health banner that disables tender if API health fails.
- Error states with retry or park/investigate recovery.
- Tabular numerics for money columns.

Anti-clutter:

- Maximum three primary visual weights: cart total, CTA, customer chip.
- Secondary actions behind one overflow per surface.
- Empty states must be helpful, not decorative.
- No emoji.
- No marketing gradients.
- No animated illustrations.
- Motion is functional only.
- Use color for state, not decoration.

## Accessibility And I18n

- WCAG AA contrast in both themes.
- Every interactive element keyboard reachable.
- Visible focus rings.
- All strings via `next-intl`.
- EN/FR parity.
- Currency, date, and number formatting from locale.
- Touch targets at least 44px, 56px in touch mode.

## Permissions And Safeguards

Role checks in the service layer:

- Discount above threshold.
- Void after tender.
- Return without receipt.
- Opening another user's drawer.
- Force-close shift.
- Cash drop/pickup.
- Large refund.

Use existing `lib/security/step-up.ts` if available for sensitive operations. Write audit rows for every override.

## Testing

Required verification:

- Service unit tests for money math, tender split, change calculation, A/R credit-limit logic, X/Z totals, and transaction rollback paths.
- Integration test for full happy-path sale committing inventory, ledger, drawer, and session in one transaction.
- Integration test for simulated mid-transaction failure and full rollback.
- Action tests for auth gating, schema validation, and revalidation tag emission.
- Manual UAT script covering open shift, cart, customer attach, multi-tender, A/R sale, receipt including WhatsApp option, partial refund, and close shift.
- Run the dev server and walk the flow in browser before declaring done.
- Verify hotkeys, theme parity, EN/FR parity, touch mode, scanner input, and reload survival.

## Deliverable Checklist

- Prisma migration for terminal/register, cash drawer, cashier session, tender, A/R link, and inventory movement extensions.
- `services/pos/pos.service.ts`, `pos.schemas.ts`, `pos.service.test.ts`, `money.ts`, and `audit.service.ts`.
- `actions/pos/{session,cart,tender,refund,shift}.actions.ts`.
- `hooks/posHooks/*` for catalog, stock by location, open session, customer A/R, daily tender totals, parked carts.
- POS shell at `app/[locale]/(dashboard)/dashboard/pos/`.
- `components/pos/*` for three-zone shell, cart, tender panel, command bar, shift HUD, close wizard, receipt preview, and returns modal.
- X/Z report screen and PDF/print support.
- WhatsApp receipt option in the receipt preview and delivery service.
- EN/FR i18n keys.
- Passing tests and manual walkthrough notes.

## Out Of Scope

Do not add:

- Presence/HR.
- AP/AR beyond customer A/R.
- ClientOrder.
- Commercial agents.
- Offline-first/PWA queueing.
- Real cash-drawer kick, scale, or printer drivers.

Design adapter interfaces for hardware integrations only when the requested slice needs them.
