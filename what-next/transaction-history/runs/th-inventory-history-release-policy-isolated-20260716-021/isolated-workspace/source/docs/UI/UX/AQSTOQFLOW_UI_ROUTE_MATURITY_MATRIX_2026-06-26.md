# AqStoqFlow UI Route Maturity Matrix

Date: 2026-06-26
Phase: 09 - Accessibility and visual regression governance

## Purpose

This matrix keeps the UI/UX revamp from drifting after the first modernization phases. It records each high-value route's maturity, accessibility posture, responsive target, visual smoke requirement, and next action.

Maturity labels follow `AQSTOQFLOW_UI_COMPONENT_REGISTRY_2026-06-26.md`:

- `reference`: canonical example for new work.
- `aligned`: follows the constitution and shared route anatomy.
- `partial`: useful business workflow but still has design-system or accessibility gaps.
- `legacy`: route exists but should not be copied.
- `specialized`: intentionally different because the workflow demands it.
- `blocked`: cannot be certified until a product, data, auth, or tooling blocker is removed.

## Smoke Tiers

| Tier | Scope | Required evidence |
| --- | --- | --- |
| Tier 0 | `/en`, `/en/login`, `/en/dashboard` | HTTP route smoke on every UI governance pass; desktop and mobile screenshots when Playwright is available. |
| Tier 1 | Finance, payroll, inventory items, POS | HTTP route smoke for every major UI change; at least desktop screenshot evidence before large releases. |
| Tier 2 | Module detail routes, settings, reports | Smoke the changed route and one nearby parent route. Add screenshot evidence when the layout or navigation changes. |

## High-Value Route Matrix

| Route | Surface | Files inspected | Maturity | Accessibility and keyboard posture | Responsive posture | Smoke target | Next governance action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/en` | Public first impression | `app/[locale]/(home)/page.tsx`, `components/landing/*` | `aligned` | Header exposes nav landmarks and mobile menu text through `sr-only`; decorative icons are generally hidden. Continue checking CTA focus rings and color contrast on editorial sections. | Landing sections use constrained max-widths and responsive grids. Desktop and mobile are required because this route sells the product. | Tier 0: mobile, desktop. | Keep public copy and screenshots grounded in real command-center capability. Do not add a marketing-only hero without product signal. |
| `/en/login` | Authentication | `app/[locale]/(auth)/login/page.tsx`, `components/auth/AuthLayout.tsx`, `components/auth/EnhancedLoginForm.tsx` | `aligned` | Email/password fields have labels; password toggle has an `aria-label`; language/theme controls have labels. Check keyboard order whenever auth cards or side panels change. | Auth shell collapses the side narrative and keeps the form centered on small screens. | Tier 0: mobile, desktop. | Add screenshot evidence for both light and dark theme only when theme behavior changes. |
| `/en/dashboard` | Today's Operating Truth | `app/[locale]/(dashboard)/dashboard/page.tsx`, `components/dashboard/EnhancedEnterpriseDashboard.tsx` | `reference` | Uses shared command-center primitives, actionable states, recovery state, and visible setup/checklist actions. Select controls and tabs come from accessible primitives. | Uses `dashboard-landing-theme`, `dashboard-landing-content`, stable grids, `min-w-0`, truncation, and line clamps. | Tier 0: mobile, tablet, desktop. | Treat this as the route anatomy reference for authenticated command-center work. |
| `/en/dashboard/finance` | Finance command center | `app/[locale]/(dashboard)/dashboard/finance/page.tsx`, `components/finance/FinanceCommandCenterDashboard.tsx` | `aligned` | Uses `CommandBriefHeader`, `KpiTile`, `StatusStrip`, `ActionQueue`, and `EvidenceTimeline`. Custom filter headings are visible, but custom date inputs should receive explicit labels before accessibility certification. | Uses dashboard tokens, responsive grids, and a dense desktop command layout. | Tier 1: tablet, desktop. | Normalize remaining custom controls through shared filter primitives when finance filters are touched. |
| `/en/dashboard/payroll` | Payroll command center | `app/[locale]/(dashboard)/dashboard/payroll/page.tsx`, `components/payroll/PayrollCommandCenter.tsx` | `partial` | Permission and module denial states use `DashboardRouteState`. Proof drawer is keyboard-addressable through sheet primitives and proof buttons have visible text. Still relies on hard-coded slate/white/violet styles outside the shared token set. | Dense grids, truncation, and break-all proof rows protect most layouts. Needs mobile screenshot review before certification. | Tier 1: tablet, desktop. | Move toward shared command-center primitives and dashboard tokens when the payroll UI is next touched. |
| `/en/dashboard/inventory` | Inventory root | `app/[locale]/(dashboard)/dashboard/inventory/page.tsx` | `specialized` | Route intentionally redirects to the canonical item list; no standalone accessibility review is needed beyond redirect smoke. | N/A because this route has no page surface. | Tier 1: HTTP redirect smoke. | Keep the redirect documented so future reviewers smoke `/inventory/items` as the real surface. |
| `/en/dashboard/inventory/items` | Inventory items workspace | `app/[locale]/(dashboard)/dashboard/inventory/items/page.tsx`, `components/ui/groups/inventory/ItemManagement.tsx` | `aligned` | Table row selection has labels; clear-search and menu controls expose screen-reader text. Some item table actions should be rechecked when row menus change. | Uses dashboard theme, responsive stat grid, overflow-safe table shell, truncation, and line clamps. | Tier 1: mobile, desktop. | Keep search, pagination, and table actions keyboard-verifiable in every table change. |
| `/en/dashboard/pos` | Point of sale | `app/[locale]/(dashboard)/dashboard/pos/page.tsx`, `components/pos/ProfessionalPOSSystem.tsx` | `specialized` | Inputs are wrapped in visible labels; grid/list mode controls have titles and visible icons/text context. Because POS is a high-density touch workflow, keyboard-only checkout needs explicit manual review. | Intentionally dense; desktop and tablet are primary. Mobile is not a certification target until the POS product scope requires phone checkout. | Tier 1: tablet, desktop. | Maintain tablet/desktop screenshot smoke and document any deliberate mobile limitations in release notes. |
| `/en/dashboard/settings/company` | Company settings | `app/[locale]/(dashboard)/dashboard/settings/company/page.tsx` | `partial` | Uses dashboard theme but not the full command-center anatomy. Needs standard robust state and form review when updated. | Basic responsive shell. | Tier 2: changed-route smoke. | Modernize through shared route states and form controls during the next settings pass. |
| `/en/dashboard/settings/roles` | Role management | `app/[locale]/(dashboard)/dashboard/settings/roles/page.tsx`, `app/[locale]/(dashboard)/dashboard/settings/roles/columns.tsx` | `partial` | Selection controls include labels. Needs table keyboard regression checks when RBAC columns or bulk actions change. | Table-heavy route; overflow behavior must be reviewed on mobile. | Tier 2: changed-route smoke. | Do not copy this table pattern into new command-center pages without modernization. |

## Certification Rules

- A route cannot move to `reference` without visible focus states, keyboard-reachable controls, no color-only status meaning, responsive checks at the required tier, and route smoke evidence.
- A route cannot move from `partial` to `aligned` if it still uses hard-coded one-off colors where constitution tokens already exist.
- Protected routes may pass unauthenticated HTTP smoke by returning or redirecting to a safe auth state. Authenticated screenshot certification still requires a real browser session or saved Playwright storage state.
- Screenshot smoke is deliberately small. It is meant to catch blank pages, broken redirects, layout overflow, and first-viewport drift, not pixel-perfect design churn.
