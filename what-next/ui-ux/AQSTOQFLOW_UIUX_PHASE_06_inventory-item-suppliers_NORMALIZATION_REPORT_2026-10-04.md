# Inventory item suppliers normalization

Date: 2026-10-04
Route: `/[locale]/dashboard/inventory/items/[id]/suppliers`

## Changes

- Applied the canonical dashboard theme and semantic colors to the page, supplier list, edit form, add-suppliers dialog, discard dialog, and calendar surface.
- Added a clearer item header, linked supplier count, organization currency, readable UTC update date, and a direct return link to the item overview.
- Replaced the fixed `100vh - 600px` layout with responsive columns that give the edit form more space and stack on smaller screens.
- Used brand color for selection and actions, gold for preferred suppliers, success for existing associations, and danger for errors/discarding changes.
- Flattened nested form cards into separated sections; aligned inputs, secondary actions, and save controls with the shared dashboard styles.
- Replaced dollar icons with neutral currency icons while preserving organization-aware money formatting.
- Added accessible names for search, clearing search, SKU generation, and notes; exposed the selected supplier with `aria-pressed`.
- Preserved data access, supplier mutations, validation, and existing business behavior. Existing English copy remains English; translation coverage was not expanded.

## Verification

- Focused supplier-list and page display tests: 2 suites, 3 tests passed.
- ESLint on the suppliers route directory: passed.
- Full `npm run typecheck -- --incremental false`: passed.
- `git diff --check` for the route directory: passed.
- Updated the page test's icon mock and isolated its display-context test from the route access dependency, matching the nearby edit-page test pattern. This display suite does not test authorization.
- Live desktop/mobile verification remains unconfirmed: navigation and tab recovery repeatedly timed out in browser automation.

Scope is limited to the five suppliers-page components, its existing page test setup, and this report. No shared theme, service, permission, database, or translation-file changes were made.
