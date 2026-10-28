# Table Presentation Browser Evidence Manifest

Audit date: 2026-08-23

Status: **blocked before route capture**

## Planned routes

- /en/dashboard/purchases/suppliers
- /en/dashboard/payroll/compensation
- /en/dashboard/payroll/employees
- /en/dashboard/people
- /en/dashboard/purchase-orders
- Representative brand and unit reference-data routes discovered in the workspace
- Representative finance, inventory, POS, evidence, and analytical routes selected from the static inventory

## Planned evidence

- Full-page and table-region screenshots at 375px, 768px, 1280px, and 1536px widths
- Toolbar wrapping, label association, and focus-order inspection
- Sort state and keyboard activation
- Search, filter, date-range reset, and pagination behavior
- Empty, loading, no-match, and error states where safely reachable
- Zoom/reflow and horizontal-overflow checks
- Automated accessibility smoke plus manual keyboard checks

## Blocker

The approved in-app browser bridge failed during its desktop sandbox setup before localhost could be opened. No page rendered and no screenshot, keyboard result, or accessibility result was produced. This is an evidence-collection failure, not evidence of an application runtime failure.

The browser-control instructions prohibit replacing the approved browser bridge with a standalone Playwright or other browser automation fallback. The audit therefore continued with static code, architecture graph, contract, and authoritative standards evidence only.

## Current contents

No screenshots are present. This manifest exists so the missing evidence cannot be mistaken for a passing visual review.

## Release gate

Before Phase 1 implementation begins:

1. Restore the desktop browser bridge.
2. Confirm the local application and authenticated test workspace are available.
3. Capture the planned route/viewport matrix.
4. Record keyboard and accessibility results with route, viewport, locale, dataset size, and timestamp.
5. Redact or avoid employee, payroll, supplier, and financially sensitive values in retained artifacts.

Before any route is declared normalized, capture before/after evidence using the same locale, data fixture, viewport, and table state.
