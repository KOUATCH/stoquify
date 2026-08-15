# Stoquify Supplier Route-First Full-Page Remediation

Date: 2026-08-13  
Scope: purchasing supplier list, create, analytics/detail, and edit navigation  
Status: focused implementation and verification complete; authenticated browser smoke remains environment-blocked

## Outcome

Supplier workflows now use canonical, locale-aware routes instead of opening create, analytics, or edit page content in dialogs:

- `/{locale}/dashboard/purchases/suppliers`
- `/{locale}/dashboard/purchases/suppliers/create`
- `/{locale}/dashboard/purchases/suppliers/{supplierId}`
- `/{locale}/dashboard/purchases/suppliers/{supplierId}/edit`

The shared legacy `suppliersSystem` surface preserves its existing create route through `/{locale}/dashboard/suppliersSystem/new`.

## Implementation Evidence

- Replaced the supplier-table `View analytics` state mutation with a link to the supplier detail route.
- Consolidated `Edit supplier` and `Open edit page` into one permission-aware `Edit supplier` link.
- Removed the obsolete English and French `Open edit page` copy.
- Changed the list-level create action to a canonical route link.
- Changed top-purchase and top-balance cards from buttons that opened analytics state to supplier-detail links.
- Removed the supplier create/edit and analytics `Dialog` wrappers. Route content now renders in ordinary page sections identified by `data-supplier-page-content="form"` or `data-supplier-page-content="analytics"`.
- Preserved the archive confirmation as an `AlertDialog`; it is a destructive-action confirmation, not a routed page.
- Added controlled full-page missing-supplier states with recovery navigation.
- Preserved edit cancel navigation to supplier detail and successful create/edit navigation to the saved supplier detail route.
- Passed `canEdit` from server-owned permission context before rendering edit links.
- Restored supplier-specific RBAC denial titles and recovery destinations in the consolidated purchases route registry.

## Security and Control Boundaries

- Tenant-scoped supplier reads and writes remain in the existing actions and services.
- List, create, detail, and edit routes retain server-side purchasing permissions and module-access observation.
- The UI permission check controls visibility only; the edit route continues to enforce `purchases.suppliers.update` server-side.
- No supplier schema, monetary calculation, AP history contract, audit behavior, or database migration changed.

## Verification Results

### Passed

- Focused ESLint across the supplier component, focused tests, route registry, purchasing list page, and shared supplier-system list page.
- `SupplierManagementDashboard.presentation.test.tsx`: 8 tests passed.
- Supplier `page-boundary.test.tsx`: 9 tests passed.
- Combined focused run: 2 suites, 17 tests passed.
- `git diff --check` passed for the focused tracked changes.
- Static inspection found no supplier page `Dialog`, `DialogContent`, `setAnalyticsSupplierId`, duplicate `openEditPage`, or in-page analytics/edit action handlers. The only remaining supplier modal is the archive confirmation alert.
- An HTTP request to the list route returned the expected `307` redirect to `/en/login?callbackUrl=...`, confirming the local server is protected by authentication.

### Bounded limitations

- The repository-wide `npm run typecheck` did not complete within two bounded runs and emitted no compiler diagnostics before termination. Focused Jest compilation and ESLint completed successfully, but this report does not claim a full-repository typecheck pass.
- Authenticated browser smoke could not be completed because the available local browser session was not signed in; direct navigation was redirected to login, and a later browser navigation attempt timed out. The focused route and presentation tests provide the current executable evidence.

## Tests Added or Extended

- English canonical list, create, analytics, and edit links.
- French locale preservation for analytics and edit links.
- Exactly one edit action and removal of `Open edit page`.
- Full-page create, edit, and analytics rendering with no `dialog` role.
- Controlled missing-supplier edit state.
- Successful edit return to the supplier detail route.
- Direct route permission/resource-id boundaries.
- Localized fail-closed RBAC recovery states.

## Reviewer Lens Decisions

- Purchasing/AP, RBAC, tenant isolation, workflow UX, localization, accessibility semantics, and release assurance: applicable and addressed proportionally.
- Database migration, statutory configuration, payroll, POS/offline sync, payments-provider integration, billing/packaging, and AI governance: not applicable because this change only alters supplier page routing and presentation.

## Remaining Manual Check

With an authenticated local session, smoke-test the English and French list, create, existing supplier detail, and existing supplier edit routes. Confirm the URL changes on every action, browser refresh preserves the page, and no routed workflow appears as a dialog.
