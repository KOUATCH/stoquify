# Stage 07 Browser Smoke Review

Run: `th-inventory-history-browser-smoke-20260716-018`  
Review target: `th-inventory-history-release-matrix-20260716-017`  
Route: `/en/dashboard/inventory/movements`  
Scoped verdict: `BLOCKED`  
Generated: `2026-07-16T08:34:34.691Z`

## What Ran

- Started local dev server on port 3000. Log: `what-next/transaction-history/runs/th-inventory-history-browser-smoke-20260716-018/logs/07-dev-server.log`.
- Ran authenticated Playwright smoke using existing `playwright/.auth/payroll.json` without reading raw storage-state contents. Log: `what-next/transaction-history/runs/th-inventory-history-browser-smoke-20260716-018/logs/07-browser-smoke.log`.
- Captured mobile and desktop screenshots: `what-next/transaction-history/runs/th-inventory-history-browser-smoke-20260716-018/screenshots/inventory-movements-mobile.png`, `what-next/transaction-history/runs/th-inventory-history-browser-smoke-20260716-018/screenshots/inventory-movements-desktop.png`.

## Result

The route loaded as an authenticated session and did not show application error markers or horizontal overflow at 390px or 1440px. However, the only available saved auth state is payroll-scoped and lacks inventory permission. The rendered page emitted Next's unauthorized redirect meta tag: `<meta id="__next-page-redirect" http-equiv="refresh" content="1;url=/en/unauthorized">`. Axe reports that meta refresh as a critical violation on both viewports.

This is not accepted as a product accessibility pass for the inventory workbench because the actual inventory-authorized route state was not reached.

## Verdict

BLOCKED. Stage 07 still needs an inventory-authorized Playwright storage state or seeded inventory operator fixture before the browser/mobile/a11y gate can certify the workbench.
