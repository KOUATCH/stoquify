# Purchase-order analytics revamp evidence — 2026-08-14

Route: `/en|fr/dashboard/purchase-orders/analytics`

## Authenticated browser checks

- Authenticated purchaser workspace rendered four full-width table workbenches and zero dialogs.
- English and French routes rendered localized headings, date controls, table controls, and tenant data.
- Supplier sorting changed the first row from `Heaney - Hayes 040` to `Bechtelar, Tromp-Bayer and McGlynn 035` with `aria-sort="ascending"`.
- Supplier search reduced the visible result set to one matching row.
- Location pagination moved from page 1 of 3 to page 2 of 3.
- The custom `2026-01-01` to `2026-12-31` range updated the URL and persisted both values after refresh.
- The empty 30-day period retained preset and custom date controls after the live defect fix.
- At a 412 × 915 viewport, the document had no horizontal overflow (`397px` client and scroll width); the wide table stayed inside its own horizontal scroller (`330px` client, `878px` scroll width, `overflow-x: auto`).
- At desktop width, each list occupied the available content column; the document had no horizontal overflow.

## Automated checks

- Jest: 3 suites passed, 10 tests passed.
- Targeted ESLint: passed with no findings.
- Coverage includes date-window resolution, empty-period recovery, search, three-state sorting, default sorting, pagination, and the four-table full-width contract.

## Defect fixed during verification

Selecting a period with zero orders previously removed the date controls and trapped the user in the empty state. The empty state now keeps the same range navigation, custom dates, metadata, and reset action as populated periods.
