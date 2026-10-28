---
name: stockflow-enterprise-pos
description: "Build, extend, or audit the StockFlow enterprise POS workflow. Use when implementing production POS features that connect Location, Terminal, Cash Drawer, Cashier Session, Sale, Inventory, Finance, customer A/R, receipt print/email/SMS/WhatsApp delivery, refunds, voids, X/Z shift close, POS UI shell, Prisma schema updates, service-layer actions, TanStack Query hooks, i18n, dark/light theming, and tests."
---

# StockFlow Enterprise POS

## Core Rule

Implement POS work as a production enterprise workflow, not as a demo screen or admin panel. Every transaction must keep inventory, finance ledgers, customer A/R, cash drawer balances, and cashier session totals in sync inside one Prisma transaction.

Read `references/enterprise-pos-requirements.md` before implementation when the request is larger than a narrow bug fix or when the affected workflow is unclear.

## Architecture

Use the canonical StockFlow stack:

- `services/pos/pos.service.ts`: server implementation. Use `db` directly. Throw `Error` or domain errors. No `"use server"`, no HTTP.
- `services/pos/pos.schemas.ts`: Zod schemas for every service function.
- `services/pos/money.ts`: Decimal or integer minor-unit helpers. Never use JS float math for persisted money.
- `services/pos/audit.service.ts`: override and sensitive-operation audit rows.
- `services/pos/pos.service.test.ts`: service tests for behavior, rollback paths, and money edge cases.
- `actions/pos/*.actions.ts`: thin server actions only: `auth()` or `requireOrg()` -> schema parse -> service call -> shared `ok()`/`err()` -> `revalidateTag()`.
- `hooks/posHooks/*.ts`: TanStack Query consumers of actions. Invalidate related query keys on success.
- `components/pos/*`: UI consumes hooks only. Never call actions or services directly from components.

Reuse `services/_shared/action-response.ts`. Do not create POS-specific response wrappers. Do not extend legacy fat `actions/*.ts` files.

## Workflow

Build in thin, verifiable slices:

1. Inspect Prisma models and existing service/action/hook conventions before editing.
2. Update schema only where the current models cannot represent the workflow.
3. Implement service functions first: open shift, cart, attach customer, discount, tender, commit sale, receipt print/email/SMS/WhatsApp delivery, refund, void, cash drop/pickup, X report, Z close.
4. Add action files grouped by workflow noun: `session.actions.ts`, `cart.actions.ts`, `tender.actions.ts`, `receipt.actions.ts`, `refund.actions.ts`, `shift.actions.ts`.
5. Add hooks under `hooks/posHooks/*` for catalog, stock by location, open session, customer A/R, daily tender totals, parked carts, receipt delivery, refunds, and shift close.
6. Build the POS shell at `app/[locale]/(dashboard)/dashboard/pos/` with `components/pos/*`.
7. Add EN/FR i18n keys and use existing theme tokens.
8. Run focused tests and a browser walkthrough before declaring done.

## Atomic Sale Contract

Commit sale must run inside one `prisma.$transaction`:

- Validate active terminal, cash drawer, and cashier session.
- Resolve walk-in or attached customer.
- Enforce stock availability per location.
- Enforce role gates and A/R credit limits before tendering.
- Create sale header, lines, tenders, receipt number, and receipt payload.
- Decrement inventory and create movement rows.
- Post balanced finance entries for revenue, tax payable, COGS, inventory, cash/card clearing, and A/R.
- Create customer ledger/A/R entries for `ON_ACCOUNT`.
- Update cash drawer tender totals and current balance.
- Update cashier session aggregates.
- Roll back everything if any step fails.

## WhatsApp Receipt

Include WhatsApp receipt delivery whenever receipt work is in scope:

- Add a generalized receipt delivery service with channel `WHATSAPP`, or a dedicated `sendReceiptViaWhatsApp` service.
- Keep provider-specific code behind an adapter interface such as `ReceiptDeliveryProvider.sendWhatsAppReceipt(input)`.
- Do not hardcode provider credentials or choose a real provider unless the user explicitly asks.
- Validate customer phone number, locale, consent when supported, and delivery eligibility.
- Record delivery attempt status, destination, provider reference, retryability, and actionable error details using a receipt delivery model or existing audit/notification primitives.
- Receipt content must include receipt number, location, terminal, cashier, item lines, taxes, discounts, tender summary, change, A/R carried, and digital receipt URL or QR when available.

## UI Bar

Reuse the StockFlow design language. The POS shell should feel like an enterprise cashier workstation:

- Desktop at 1366px and above: 320px left rail, fluid center work area, 420px right rail with bottom-anchored charge CTA.
- Compact mode below 1280px collapses the left rail.
- Touch mode increases targets to 56px and adjusts density.
- Include command bar, scanner-first focus, hotkey HUD, live shift HUD, parked carts, customer chip, stock badges, multi-tender panel, receipt preview with print/email/SMS/WhatsApp/no-receipt options, returns modal, and end-of-shift wizard.
- Keep UI uncluttered: one overflow per surface, no mock data, no hardcoded strings/colors, no decorative gradients or animations.

## Permissions

Enforce role checks in the service layer for:

- Discount above threshold.
- Tendered sale void attempt.
- Return without receipt.
- Opening another user's drawer.
- Force-close shift.
- Cash pickup/drop above threshold.
- Large refund.

Use existing step-up confirmation when available and write an audit row for every override.

## Verification

Do not finish without focused verification:

- Service tests for money math, split tender, change calculation, A/R credit limit, X/Z totals, and rollback paths.
- Integration test for a sale commit touching inventory, ledger, drawer, and session.
- Action tests for auth, schema validation, and revalidation tags.
- Browser walkthrough: open shift -> sale -> receipt including WhatsApp option -> refund/void -> close shift.
- Check EN/FR parity, dark/light parity, hotkeys, touch mode, scanner input, and reload survival.

## Out Of Scope

Do not add Presence/HR, AP/AR beyond customer A/R, ClientOrder, commercial agents, offline-first queueing, or real cash-drawer, scale, and printer hardware drivers unless explicitly requested.
