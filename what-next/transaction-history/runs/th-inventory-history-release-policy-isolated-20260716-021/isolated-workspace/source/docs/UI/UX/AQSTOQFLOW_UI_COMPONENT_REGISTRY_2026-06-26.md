# AqStoqFlow UI Component Registry

Date: 2026-06-26

Phase: UI/UX Phase 01 - Design System Freeze

Companion document:
- `docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md`

## Purpose

This registry maps common AqStoqFlow UI needs to the preferred existing classes, components, and future primitives. It should prevent new dashboard pages from inventing their own shell, cards, filters, proof badges, or state handling.

## Canonical Route Shell

Use for authenticated dashboard routes:

- Root class: `.dashboard-landing-theme dark min-h-screen`
- Content class: `.dashboard-landing-content`
- Main background token: `--dash-canvas`
- Main text token: `--dash-text`

Reference surfaces:

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`

Do not use older light gradient route wrappers as a reference for new authenticated dashboard work.

## Existing Utilities To Prefer

| Need | Prefer | Notes |
| --- | --- | --- |
| Page shell | `.dashboard-landing-theme dark`, `.dashboard-landing-content` | Default for authenticated routes |
| High-level panel | `.dashboard-glass-panel` | Use for command brief, state panels, important grouped content |
| KPI/status card | `.dashboard-stat-card` with `--stat-accent`, `--stat-soft` | Stable card anatomy for summary metrics |
| Table/workbench shell | `.dashboard-table-shell`, `.dashboard-data-table` | Data-heavy pages should stay quiet and scannable |
| Text input/select trigger | `.dashboard-control` | Use in dashboard filters and forms |
| Primary action | `.dashboard-button-primary` | Main page action |
| Create action | `.dashboard-button-create` | Creation/action launch where applicable |
| Secondary action | `.dashboard-button-secondary` | Filters, secondary navigation, minor actions |
| Filter chip | `.dashboard-filter-chip` | Active filters and metadata chips |
| Floating overlay | `.enterprise-floating-surface` | Popover, select, menu, command overlay |
| Route state | `DashboardRouteState` | Permission, empty, partial, no active org, load failure |
| Error state | `DashboardErrorState` | Route-level dashboard error fallback |

## Existing Components To Treat As References

### Dashboard Shell

- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`

Use these for behavior, locale-aware navigation, permissions, shell density, and current dashboard style. Do not copy literal colors from Sidebar/Navbar into new components; use dashboard tokens instead.

### Robust States

- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`

Use these before creating route-local error, empty, no-active-org, or partial-data markup.

### Finance Theme Helper

- `components/finance/finance-dashboard-theme.ts`

This is the best current example of centralizing dashboard tones and semantic class mappings. Use it as a model for future shared primitives, but do not make finance own cross-module UI.

### Dashboard Overview

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`

Use as the current reference for:

- `.dashboard-landing-theme`
- `.dashboard-glass-panel`
- `.dashboard-stat-card`
- filter panel treatment
- semantic dashboard tokens
- compact KPI hierarchy

This page should evolve in Phase 04 into "Today's Operating Truth".

### Finance Command Center

- `components/finance/FinanceCommandCenterDashboard.tsx`

Use as a reference for:

- tokenized finance surface
- filter-heavy command center
- semantic tone helpers
- dashboard buttons and panels

Later phases should reduce breadth and align it to the shared command-center anatomy.

### Owner War Room

- `components/owner-war-room/OwnerWarRoomDashboard.tsx`

Use as a reference for:

- executive command surface
- proof-linked action queue
- module state and risk strips
- business-truth framing

### POS

- `components/pos/ProfessionalPOSSystem.tsx`

Use as a reference for:

- operational density
- tactile controls
- high-contrast live state

Do not force POS into a low-density executive dashboard pattern. POS must remain fast.

### Payroll

- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`

Use as a business-workflow reference, not as the final visual reference. Payroll has strong proof/privacy/workflow content but should be normalized to dashboard tokens during the payroll module pass.

## Future Shared Primitives

Create these in Phase 03 under an appropriate shared location, likely `components/dashboard/primitives/` unless the repo already has a better pattern.

| Primitive | Purpose | Inputs | Notes |
| --- | --- | --- | --- |
| `CommandBriefHeader` | Top state and purpose of a route | title, summary, metadata, actions, proof/source | Should answer state/risk/action/proof quickly |
| `StatusStrip` | Compact cross-domain or module statuses | status items, tone, href, source | Use for POS, stock, cash, AP, close, payroll, compliance |
| `KpiTile` | Reusable KPI/status card | label, value, tone, trend, detail, href, proof | Wrap `.dashboard-stat-card` |
| `ActionQueue` | Prioritized next actions | queue items, empty state, permissions | Central interaction model for command centers |
| `ActionQueueItem` | One actionable work item | title, risk, owner, due, href, proof, status | Keep fixed dimensions and clear CTA |
| `ProofBadge` | Compact evidence indicator | source, state, hash/id, href | Do not reveal sensitive hashes where not allowed |
| `EvidenceTimeline` | Recent trusted events | events, source, timestamp, state | Useful for default dashboard and assurance pages |
| `FilterBar` | Standard filter row | period, location, status, search, custom filters | Avoid route-specific filter chaos |
| `DetailDrawer` | Record/proof inspection | title, metadata, sections, actions | Keep drawers inspect-first, not dashboard replacements |
| `RouteStatePanel` | Shared robust state | kind, title, message, actions | Can wrap or extend `DashboardRouteState` |
| `PermissionLockedState` | Locked/permission UI | permission, module, action | Must not leak unauthorized details |

## Page Assembly Pattern

New command-center pages should assemble primitives in this order:

1. `CommandBriefHeader`
2. `StatusStrip` or KPI row
3. `ActionQueue`
4. `EvidenceTimeline` or proof strip
5. Workbench, table, charts, or analytics
6. `DetailDrawer` or proof drawer

## Standard Filter Contract

Default dashboard filters should appear in one compact area and use `.dashboard-control` or a future `FilterBar`.

Common filters:

- Period
- Location
- Status
- Search
- Owner
- Proof state
- Module/state where relevant

Do not create a new visual filter family per module.

## Standard Robust State Contract

Use shared state components for:

- `permission_denied`
- `no_active_org`
- `error`
- `empty`
- `partial`
- `locked_module`
- `stale_session`

State copy should be safe, concise, and actionable.

## Standard Proof Interaction Contract

Any important operational or financial number should provide one of:

- a proof badge
- a source note
- a drill-through link
- a drawer with source/evidence details
- a "pending proof" state

Proof must be permission-aware and redacted where needed.

## Standard Button Contract

Use:

- `dashboard-button-primary` for the main command action.
- `dashboard-button-create` for creation flows.
- `dashboard-button-secondary` for secondary route actions, filters, and low-risk controls.
- Destructive button styling only for destructive operations.

Avoid route-local blue/teal/gradient buttons.

## Standard Card Contract

Use cards only for:

- KPI/status cards.
- Action queue items.
- Repeated records.
- Proof/evidence entries.
- Drawer/modal sections.

Avoid:

- nested cards as page layout.
- `rounded-2xl` dashboard cards.
- large decorative cards that carry no action or proof.

## Standard Copy Contract

App copy should be short.

Use:

- direct labels
- action verbs
- source/proof notes
- status messages
- concise recovery instructions

Avoid:

- explaining obvious controls
- long marketing paragraphs inside authenticated workflows
- repeating the whole platform promise on every module page

## Maturity Labels

Use these labels in future route maturity matrices:

| Label | Meaning |
| --- | --- |
| `reference` | Can be copied as a pattern today |
| `aligned` | Uses the correct theme and mostly correct anatomy |
| `partial` | Uses dashboard tokens but still has structural drift |
| `legacy` | Uses older card/palette/layout patterns |
| `specialized` | Intentional special case, documented |
| `blocked` | Cannot be normalized until prerequisite data or route state exists |

## Current Reference Set

Use as references now:

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `components/finance/finance-dashboard-theme.ts`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `docs/product/user-experience/ui-registry.md`

Use cautiously:

- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/pos/ProfessionalPOSSystem.tsx`
- `components/payroll/PayrollCommandCenter.tsx`

Do not use as references for new dashboard styling:

- legacy light customer order surfaces
- old dashboard table header helpers with `bg-slate-*`
- route-local `bg-white/[...]` payroll/settings panels
- `.bee-eater-dashboard-theme` unless explicitly selected

## Review Checklist For New Dashboard Work

Before merging a new dashboard page, verify:

- It uses `.dashboard-landing-theme dark`.
- It uses `--dash-*` semantic tokens.
- It has a clear command brief.
- It exposes next actions, not just metrics.
- It includes proof/source access where trust matters.
- It uses shared route/error/empty states.
- It has a standard filter pattern if filtering exists.
- It avoids route-local palettes.
- It is keyboard reachable.
- It does not overflow at common desktop and mobile widths.

