# Inventory item detail normalization

Date: 2026-10-04
Route: `/[locale]/dashboard/inventory/items/[id]`

## Changes

- Applied the canonical dashboard theme, surface classes, buttons, and `--dash-*` color tokens to `components/inventory/items/ItemOverview.tsx`.
- Added a clear item identity header, lifecycle badge, action group, and metadata strip.
- Used spruce for active status, warning for discontinued status, and muted colors for inactive/archived status.
- Presented authorized locations as responsive cards with prominent quantities, unit labels, and update timestamps. Available quantities use informational color; reservations use gold; negative quantities use danger; unknown quantities remain explicitly unknown.
- Added a count of locations on the displayed page without implying a global stock total.
- Preserved service calls, authority checks, archived editing restrictions, localized links, cursor pagination, and unknown-versus-zero semantics.
- Updated existing test icon mocks for the newly used visual components.

## Inspection

Reviewed the UI constitution, command-center primitives, inventory items list, detail route, and item overview read service. Existing component and route knowledge graphs contain no matching ItemOverview/detail-page nodes; current source informed this change. This is a focused detail-page pass, not certification of the whole module or earlier UI phases.

## Verification

- Focused Jest component and route suites: 2 suites, 9 tests passed.
- ESLint on the component and both affected test files: passed.
- Full `npm run typecheck -- --incremental false`: passed.
- Authenticated French desktop preview verified at `/fr/dashboard/inventory/items/rds_org_001_item_011`; the header, actions, quantities, and dashboard palette rendered successfully.
- Mobile screenshot verification could not complete because browser capture repeatedly timed out at the mobile viewport. The temporary viewport override was reset. Responsive classes are implemented; mobile visual verification remains unconfirmed.

No service, database, permission, global style, or translation-file edits were needed. Existing unrelated workspace changes were preserved.
