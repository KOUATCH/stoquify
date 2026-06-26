# AqStoqFlow UI Constitution

Date: 2026-06-26

Phase: UI/UX Phase 01 - Design System Freeze

Source roadmap:
- `docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md`
- `docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md`

## Purpose

This constitution freezes the authenticated AqStoqFlow product UI direction before broader visual work begins. It gives future dashboard, module, state, and command-center work one source of truth so the product becomes uniform, modern, professional, robust, and impressive without becoming bloated.

The rule is:

> AqStoqFlow should look stunning because it is clear, trusted, decisive, and consistent.

Not because every screen adds a new palette, gradient, glass treatment, or card style.

## North Star

Every primary product surface should answer four questions:

1. What is the state?
2. What is the risk?
3. What is the action?
4. What is the proof?

This applies to the default dashboard, finance, payroll, POS, inventory, purchasing/AP, sales, compliance, close assurance, manager action center, owner war room, and robust states.

## Canonical Authenticated Product Theme

The canonical authenticated product theme is:

- Page root: `.dashboard-landing-theme dark`
- Content wrapper: `.dashboard-landing-content`
- Dashboard token family: `--dash-*`
- Primary surface classes:
  - `.dashboard-glass-panel`
  - `.dashboard-stat-card`
  - `.dashboard-table-shell`
  - `.dashboard-control`
  - `.dashboard-button-primary`
  - `.dashboard-button-secondary`
  - `.dashboard-button-create`
  - `.dashboard-filter-chip`
  - `.enterprise-floating-surface`
  - `.dashboard-data-table`
  - `.dashboard-enterprise-sidebar`

Evidence:

- `app/globals.css` defines `.dashboard-landing-theme` and the `--dash-*` token layer.
- `components/dashboard/EnhancedEnterpriseDashboard.tsx` uses the canonical dashboard shell and stat-card rhythm.
- `components/finance/finance-dashboard-theme.ts` centralizes dashboard tone, severity, panel, row, empty-state, and stat-card mappings.
- `components/dashboard/DashboardRouteState.tsx` and `components/dashboard/DashboardErrorState.tsx` already use the dashboard theme for robust states.
- `docs/product/user-experience/ui-registry.md` identifies the current dashboard reference set and warns against legacy drift.

## Theme Boundaries

### Authenticated Product Surfaces

Authenticated product surfaces must use the dashboard theme unless a later architecture decision explicitly grants a special-purpose variant.

Examples:

- `/dashboard`
- Finance command center
- Payroll command center
- Owner war room
- Manager action center
- Inventory dashboards
- POS operational shell
- Purchasing/AP
- Sales/receivables
- Compliance and close assurance
- Settings surfaces inside the authenticated shell

### Public Marketing Surfaces

Public landing pages may use a related but more expressive product-led marketing treatment. They should still borrow brand tone and semantic meaning from the product, but they do not need to use every dashboard surface class.

Examples:

- `app/[locale]/(home)/page.tsx`
- `components/landing/hero-dashboard.tsx`

### Auth Surfaces

Login and register may keep the softer auth family already documented in `docs/product/user-experience/ui-registry.md`. Auth should feel secure, premium, and related to the product, but it can remain calmer and lighter than command-center work surfaces.

Examples:

- `components/auth/AuthLayout.tsx`
- `components/auth/EnhancedLoginForm.tsx`
- `components/auth/BeautifulRegisterForm.tsx`

### Alternate Themes

`.bee-eater-dashboard-theme` exists in `app/globals.css`, but it is not the default authenticated product direction. Do not apply it to new dashboard work unless a specific product decision says a route needs that variant.

## Semantic Color Contract

Use color to communicate meaning, not decoration.

| Meaning | Token | Use |
| --- | --- | --- |
| Brand / primary focus | `--dash-brand`, `--dash-brand-strong`, `--dash-brand-soft` | Primary navigation focus, command actions, active filters, links |
| Success / healthy | `--dash-success`, `--dash-success-soft` | Completed, reconciled, posted, approved, healthy |
| Info / neutral signal | `--dash-info`, `--dash-info-soft` | Informational state, neutral live data, secondary status |
| Trust / attention | `--dash-gold`, `--dash-gold-soft` | Proof, evidence, review, certification, partial state |
| Operational freshness | `--dash-spruce`, `--dash-spruce-soft` | Live, active, synced, current, POS readiness |
| Warm business accent | `--dash-warm`, `--dash-warm-soft` | Secondary accent, non-critical business emphasis |
| Danger / blocking | `--dash-danger`, `--dash-danger-soft` | Failed, blocked, overdue, destructive, critical |
| Warning | `--dash-warning`, `--dash-warning-soft` | At risk, due soon, stale, needs attention |
| Text primary | `--dash-text` | Primary content |
| Text secondary | `--dash-text-muted`, `--dash-text-soft`, `--dash-text-faint` | Labels, metadata, helper text |
| Borders | `--dash-border`, `--dash-border-subtle` | Surface separation, table lines, control borders |

Do not create module-local color meanings that conflict with these semantics. Finance, payroll, inventory, POS, and compliance may choose which semantic tone applies, but they should not invent unrelated palettes.

## Surface Contract

### App Canvas

Use `.dashboard-landing-theme dark min-h-screen` for authenticated routes. Use `.dashboard-landing-content` to constrain content and apply consistent horizontal rhythm.

The dashboard canvas may carry subtle atmospheric texture. Do not add new decorative orbs, bokeh, heavy gradients, or route-specific background art to authenticated work surfaces.

### Sidebar and Topbar

Use `.dashboard-enterprise-sidebar` for the left navigation shell and dashboard tokens for topbar controls.

Sidebar and topbar may remain dense, but they should not become product brochures. The shell should prioritize navigation, tenant/location context, command search, urgent alerts, and user controls.

### Command Brief Panels

Use `.dashboard-glass-panel` sparingly for high-level command briefs, route states, and important summary sections.

A command brief should contain:

- One clear title.
- One concise state sentence.
- Critical metadata such as period, tenant, location, or generated time.
- Primary action or proof access when relevant.

### KPI and Status Tiles

Use `.dashboard-stat-card` with `--stat-accent` and `--stat-soft`.

KPI tiles must be compact and stable. They should not expand because labels change. Keep values, labels, trend, and proof/source notes readable without overloading the card.

### Workbench and Table Surfaces

Use `.dashboard-table-shell`, `.dashboard-data-table`, `.dashboard-control`, and standard filter bars for data-heavy work.

Tables should be quiet, dense, and scannable. Prefer detail drawers or route drilldowns for expanded context.

### Drawers, Dialogs, and Floating Surfaces

Use `.enterprise-floating-surface` or dashboard-token overrides for overlays inside authenticated product surfaces.

Drawers should be used for:

- Proof/evidence details
- Detail records
- Approvals
- Secondary inspection
- Linked events

Avoid turning drawers into full dashboards.

### Cards

Use cards for repeated items, KPI/status tiles, action queue items, proof records, and compact work units.

Do not wrap page sections in decorative nested cards. Avoid stacking cards inside cards unless the inner item is a repeated record or a modal/drawer content block.

## Page Anatomy

New command-center pages should use this default order:

1. Command brief header
2. Status or KPI strip
3. Action queue
4. Proof/evidence strip or timeline
5. Domain workbench, table, chart, or analytics
6. Detail drawer or proof drawer

Do not make analytics the first decision layer unless the route is explicitly an analytics route.

## Density Rules

| Surface | Density |
| --- | --- |
| Default dashboard | Medium, highly hierarchical |
| Finance and accounting | Dense but ordered |
| POS | Dense, tactile, high contrast, fast |
| Payroll | Medium-dense, proof-heavy, privacy-aware |
| Inventory | Dense table/workbench after a compact status layer |
| Owner war room | Executive density, high signal, low clutter |
| Landing | Spacious and product-led |
| Login/register | Calm, concise, secure |

## Typography Rules

- Use hero-scale type only for actual heroes and top-level command briefs.
- Use compact headings inside panels, cards, sidebars, tables, and drawers.
- Do not use viewport-based font scaling.
- Keep letter spacing normal unless using small uppercase metadata labels.
- Keep metadata labels short.
- Avoid long instructional paragraphs inside app controls.

## Radius and Shape Rules

- Default dashboard cards, controls, tables, and dialogs: `rounded-lg`.
- Standard primitives may keep `rounded-md`.
- Auth cards and existing sidebar chrome may keep `rounded-xl`.
- Avoid `rounded-2xl` on authenticated dashboard work surfaces unless preserving a legacy surface before modernization.

## Motion Rules

Motion should reinforce state, not decorate.

Allowed:

- Subtle hover color change.
- Small icon scale on repeated cards.
- Radix overlay open/close motion.
- Loading skeletons that preserve layout.

Discouraged:

- Route-specific floating objects.
- Large transform animations in enterprise dashboards.
- Motion that changes layout or distracts from financial/operational decisions.

## Accessibility Rules

- Every interactive icon-only control needs an accessible label.
- Focus states must be visible on dark surfaces.
- Search fields need labels or `aria-label`.
- Tables and drawers must remain keyboard reachable.
- Error and permission states must expose a clear action.
- Text must not rely on color alone for status meaning.
- Text must not overlap or overflow its container at common viewport widths.

## Robust State Rules

Use dashboard state components for:

- Loading
- Empty
- Error
- Permission denied
- Locked module
- No active organization
- Partial data
- Stale/session recovery

State copy should explain:

1. What happened.
2. What is affected.
3. What action is available.

Do not leak sensitive internal error details.

## Discouraged Patterns

Do not copy these patterns into new authenticated dashboard work:

- Route-local palettes based on raw `text-slate-*`, `bg-white/[...]`, `border-white/10`, or `from-slate-*` without dashboard tokens.
- Light gradient dashboard pages such as `from-slate-50 via-blue-50`.
- `rounded-2xl` dashboard cards for standard work surfaces.
- Repeated literal hex colors in component JSX when a dashboard token exists.
- Multiple custom filter layouts per module.
- Page-specific error markup when shared route state components exist.
- Marketing-style sections inside authenticated workflows.
- Client-derived business truth or decorative metrics disconnected from server read models.

Existing occurrences are not automatically wrong; many are legacy or pending surfaces. They should not be used as references for new work.

## Current Known Drift

The following drift exists and should be handled in later phases:

- Sidebar and topbar still contain repeated literal colors and translucent white utility classes even though dashboard tokens exist.
- Payroll command surfaces use many `text-slate-*`, `bg-white/[...]`, and `border-white/10` utilities. They should be normalized during the payroll module pass, not in Phase 01.
- Some customer order, purchasing, settings, and table helper surfaces still use older light card/gradient language.
- `.bee-eater-dashboard-theme` is an alternate dashboard variant and must not become a second default.
- Finance has a useful theme helper in `components/finance/finance-dashboard-theme.ts`; later primitives should generalize the useful parts instead of making finance the permanent owner of shared dashboard styling.

## Governance Rules

- New authenticated dashboard work must use this constitution and the component registry.
- New exceptions must be documented in `docs/UI/UX/`.
- New route work should record whether it follows the command-center anatomy.
- UI reviews should check for token use, state handling, accessibility, proof/action visibility, and route smoke evidence.
- Later implementation phases should edit code in small route/module slices, not through a broad visual sweep.

## Phase 01 Decision

The authenticated dashboard system is frozen around `.dashboard-landing-theme dark` and the `--dash-*` token family. Public landing and auth surfaces may keep their related but separate identities. Alternate and legacy patterns are documented as drift, not removed in this phase.

