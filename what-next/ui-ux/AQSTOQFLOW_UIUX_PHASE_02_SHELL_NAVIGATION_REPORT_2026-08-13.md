# AqStoqFlow UI/UX Phase 02 Shell Navigation Report

Date: 2026-08-13

## Outcome

The canonical supplier AP history route is now discoverable to every role already authorized by its server boundary. The change preserves tenant, module-entitlement, locale, and RBAC enforcement.

## Problem

`/dashboard/purchases/payables/history` accepts any of:

- `purchasing.ap.invoice.view`
- `finance.payables.read`
- `purchases.suppliers.read`

The sidebar entry previously checked only `finance.payables.read`. Users with AP-invoice or supplier-read authority could open contextual links but could not consistently discover the route through the desktop sidebar, mobile navigation, or command search.

## Implementation

- Extended the sidebar permission contract with optional `permissions` and `permissionMode` fields.
- Applied an explicit `any` rule to AP History using the same three permissions as the route and server action.
- Preserved the existing single-permission behavior for every other navigation item.
- Added a direct AP History workflow link to the Finance Payables surface.
- Added English and French labels for the new finance workflow action.
- Preserved the existing AP Workbench and supplier-detail history links.

Because desktop navigation, mobile navigation, and command search all consume the same filtered sidebar configuration, the corrected rule applies consistently across all three shell entry points.

## Architecture Evidence

- `graphify-out/graph_app.json` records `SupplierAPHistoryPage()` in community 146.
- `graphify-out/GRAPH_REPORT_actions.md` records `enforceAPHistoryModule()`, `getAPHistoryAction()`, and `prepareAPHistoryExportAction()` together in community 101.
- The page boundary, action boundary, and navigation rule now use the same three read permissions.

## Security And Governance

- No authentication, organization-scope, or module-entitlement checks were removed.
- The Purchasing module remains enforced by the page and server action.
- The page remains hidden from users who have none of the authorized permissions.
- Export retains its separate report-export permission, fresh-auth, watermark, and safety-decision controls.
- Locale-aware routing remains handled by the existing shell and finance-surface helpers.

## Verification

- Focused Jest: 5 suites passed, 32 tests passed.
- Targeted ESLint: passed.
- Targeted TypeScript project for the sidebar contract and tests: passed.
- Translation JSON parse for `messages/en.json` and `messages/fr.json`: passed.
- `git diff --check` for the touched files: passed.
- Full repository TypeScript check was attempted twice and exceeded 180 seconds and 360 seconds without emitting a diagnostic; it was replaced by the passing targeted compiler check.

## Acceptance Result

- Desktop sidebar: authorized AP, finance, and supplier readers can discover AP History.
- Mobile navigation: the same authorized users can discover AP History.
- Command search: the same authorized users can search for AP History, including supplier/payment/proof terms from its description.
- Finance Payables: users have a direct workflow action to the canonical AP-history route.
- AP Workbench and supplier detail: existing contextual links remain available.
- Unauthorized users: no new route access is granted.

