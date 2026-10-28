# AqStoqFlow UI/UX Phase 06 — Customer Action Routes Normalization

Date: 2026-08-11

Module: Customers / sales and receivables

## Outcome

The customer create, profile/analytics, edit, orders, and statement surfaces now operate as independent App Router pages. The create, profile, and edit routes no longer depend on opening stateful dialogs inside the full customer dashboard.

## Primary Job

Give an authorized operator a stable URL for each customer task:

- Create a customer.
- Review the customer operating profile and analytics.
- Edit customer identity and commercial controls.
- Review customer orders.
- Generate and deliver an immutable customer statement.

## Route Contract

| Route | Independent surface | Permission boundary |
| --- | --- | --- |
| /[locale]/dashboard/customers/new | Customer create form | customers.read, customers.create |
| /[locale]/dashboard/customers/[id] | Customer operating profile and analytics | customers.read, customers.analytics.read |
| /[locale]/dashboard/customers/[id]/edit | Customer edit form | customers.read, customers.update |
| /[locale]/dashboard/customers/[id]/orders | Customer order workbench | customers.read, customers.orders.read |
| /[locale]/dashboard/customers/[id]/statement | Customer statement workflow | Existing accounting export and module-entitlement gates |

## Technical Profile

- Added a tenant-scoped single-customer management read model in the customer service.
- Exposed the read model through the existing protected server-action boundary.
- Added a dedicated TanStack Query key and useManagedCustomer hook.
- Preserved the existing protected create/update actions and customer service write behavior.
- Invalidates dashboard, list, detail, analytics, and legacy customer query keys after writes.
- Permission-filtered edit, order, statement, export, and sales actions remain server-enforced at their destination routes.

## Presentation Contract

- Uses .dashboard-landing-theme and .dashboard-landing-content.
- Uses the shared CommandBriefHeader, StatusStrip, and RouteStatePanel primitives.
- Uses only the --dash-* semantic token family for state, risk, text, border, and surface colors.
- Shows state, next actions, service-owned proof/source, loading, error, and missing-customer states.
- Keeps authenticated surfaces at the standard rounded-lg radius and command-center density.

## Dashboard Entry Points

- The primary create action links to /customers/new.
- Table analytics actions link to /customers/[id].
- Table edit actions link to /customers/[id]/edit.
- Top-customer analytics entries navigate to the independent profile route.
- Statement and orders actions are shown only when their RBAC capabilities are present.

## Verification

- next typegen: passed.
- Focused ESLint across the changed customer service, action, hook, route, component, and test files: passed.
- Exact Jest paths: 5 suites passed, 47 tests passed.
- Semantic-color/dead-route gate includes the new customer action and profile pages.
- Full npm run typecheck initially identified and cleared two customer contract errors. After route-type regeneration, the repository-wide pass produced no diagnostics but exceeded the five-minute command limit, so final full-project completion remains timing-inconclusive.

## Edit Customer Presentation Refinement

The edit route now presents action readiness above the edit workspace at every viewport size. The previous desktop sidebar layout was removed.

The readiness band now converts the service-owned customer row and live form state into immediate operating value:

- Profile completeness across name, code, email, phone, address, and tax reference.
- Current balance versus the edited credit limit, including utilization and over-limit severity.
- Total, open, and unpaid sales-order activity.
- Live unsaved-change count with a current-versus-pending save state.

The edit workspace now uses one full-width card beneath readiness, with:

- Clear identity/contact, commercial-control, and operational-note sections.
- Section descriptions, localized examples, and concise field guidance.
- Human-readable language choices.
- Last-updated context from the service-owned customer record.
- A persistent save bar that disables the update command when the record has no changes.
- Address and tax reference share one identity row from the small breakpoint upward.
- Payment terms, credit limit, preferred language, and active status are stacked vertically in the commercial-controls column.
- Operational notes sits directly beneath Commercial controls and remains constrained to the right column.

Business behavior remains unchanged: the protected update mutation, tenant scope, permissions, validation, query invalidation, navigation, and customer service write path are preserved.

## Refinement Verification

- Focused ESLint for `CustomerActionPage.tsx` and its regression test: passed.
- Focused Jest regression: 1 suite passed, 1 test passed.
- Regression covers readiness-before-form source order, completeness and credit-utilization signals, initial no-change state, and save enablement after an edit.
- Repository `npm run typecheck`: blocked by five pre-existing locale typing errors in finance cash-command, stock-to-cash, and tax-rate route files; no customer-action diagnostic was emitted.
## Known Boundary

Archive/deactivate remains a confirmation dialog because it is a destructive command rather than a navigable work surface. Copy, export, email, and phone remain immediate commands. No customer accounting, sales, or receivable business logic was rewritten for this normalization.
