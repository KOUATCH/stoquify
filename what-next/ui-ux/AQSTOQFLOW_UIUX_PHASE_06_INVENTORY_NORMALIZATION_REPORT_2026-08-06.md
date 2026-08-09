# AqStoqFlow UI/UX Phase 06 — Inventory Item Form Normalization

Date: 2026-08-06
Module: Inventory
Skill: `aqstoqflow-uiux-06-module-normalization`
Outcome: **Implemented and focused-test verified; entitlement enforcement parity requires an explicit control decision.**

## Executive Result

The create and edit item workflows now share the field-level primitives that are genuinely common without pretending they are the same transaction. The create-only component is explicitly named `CreateItemWizard`; unused `initialData`, `isEditMode`, and `itemId` inputs and every edit-only branch were removed. Both item forms now use one tenant-reference selector and shared validation primitives for item identity, non-negative numbers, images, nullable text, and stock-range validation.

The legacy `/dashboard/inventory/items/new` route no longer loads a second item-management surface. It performs the existing create permission check and redirects to `/dashboard/inventory/items/create`.

## Preserved Workflow Distinction

| Concern | Create item | Edit item |
|---|---|---|
| Primary UX | Five-step guided wizard | One scrolling page with section navigation |
| Transaction | Creates the item and may post opening stock atomically | Updates the existing item master only |
| Identity | New SKU/barcode and tenant relations | Existing identity plus optimistic `updatedAt` version |
| Inventory quantity | Optional opening-stock event | Never changes on-hand quantity |
| Tracking safety | Serial-tracked opening stock is deferred to receipt workflows | Existing evidence can block unsafe tracking-policy changes |
| Persistence trigger | Explicit `Create Product` click | Explicit `Save changes` click |

This difference is intentional. Reusing the whole create wizard for edit would couple an item-master update to create-only step progression, image requirements, SKU generation, and opening-stock semantics. The shared boundary is field controls and validation, not the entire page workflow.

## Normalization Changes

- Renamed `ModernCreateItemForm` to `CreateItemWizard` and updated its route and focused tests.
- Removed create-component edit props and initialization/submission branches.
- Extracted `ItemReferenceSelect` and reference-label normalization for category, brand, unit, and tax fields.
- Extracted client-safe validation primitives used by both create and edit schemas.
- Corrected the SKU label association discovered during accessibility-focused testing.
- Preserved dashboard constitution tokens, compact authenticated surfaces, error messaging, unsaved-change handling, and explicit submission boundaries.
- Redirected the legacy `/dashboard/inventory/items/new` route to the canonical wizard.
- Deferred low-priority cosmetic convergence between the wizard and scrolling editor.

## Supported Edit Contract

The edit workflow supports names/descriptions, primary and retained images, SKU/barcode, dimensions/weight, cost/sell/MSRP, category/brand/unit/tax, inventory tracking and min/max/reorder policy, active/discontinued lifecycle, and serial/batch/expiry tracking.

UPC, EAN, MPN, ISBN, color, and size are Prisma-backed but are not rendered, accepted by `updateItemFromFormSchema`, or written by `updateItemFromForm`. The edit implementation report now states this explicitly.

## Module Access State

Inventory is a canonical commercial module, but durable commercial entitlement truth and an approved enforcement pilot are not present. The create page and action now record observe-mode decisions before reference-data access and mutation. Existing edit page/action enforcement was not weakened, and new create hard denials were not introduced.

True create/edit enforcement parity remains a control decision: explicitly approve either a bounded create enforcement pilot or a rollback of edit to observe mode, with tenant scope, unavailable/read-only UX, audit evidence, and rollback.

## Verification

| Check | Result |
|---|---|
| Focused create/edit and legacy-route Jest matrix | PASS — 9 suites, 35 tests |
| Focused ESLint | PASS |
| `npx tsc --noEmit --pretty false` | PASS |
| `npm run module:surface:inventory` | PASS — 387 records generated |
| `git diff --check` on scoped files | PASS; line-ending warnings only |
| Authenticated browser matrix | Not rerun; the existing inventory test sessions still lack required item permissions |

## Next Handoff

Obtain an explicit entitlement-mode decision before changing runtime parity. Separately, seed an authorized inventory editor browser fixture if visual desktop/tablet/mobile convergence evidence is required. Cosmetic convergence remains low priority and should not replace the distinct transaction-specific information architecture.
