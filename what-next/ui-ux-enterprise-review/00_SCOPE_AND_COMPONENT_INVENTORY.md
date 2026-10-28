# Stoquify UI/UX Enterprise Review (non-table scope)

Date: 2026-08-24  
Owner: Multidisciplinary enterprise review board  
Scope: UI/UX modernization across non-table components only  

## 1) Scope confirmation

- Included: dashboard shell, navigation, command/search surfaces, modals/dialogs/drawers, forms/workflows, alerts/toasts, empty/loading/error states, global branding tokens, accessibility and localization touchpoints, and workflow ergonomics for high-frequency business tasks.
- Explicitly excluded: data table components and table-centric pages (already analyzed separately), including row-level bulk actions, table column metadata surfaces, and grid virtualization strategy.
- Included source signals:
  - `graphify-out/GRAPH_REPORT_*.md` (architecture and dependency context)
  - `app/globals.css` (token and interaction conventions)
  - `app/[locale]/(dashboard)/dashboard/layout.tsx`
  - `components/dashboard/Sidebar.tsx`
  - `components/dashboard/Navbar.tsx`
  - `components/dashboard/EnhancedEnterpriseDashboard.tsx`
  - `components/dashboard/primitives/command-center-primitives.tsx`
  - `components/finance/finance-dashboard-theme.ts`
  - `config/sidebar.ts`

## 2) Impacted feature families (non-table)

1. Shell & navigation  
   - Dashboard route shell and module-level navigation layout.
2. Module surface governance  
   - Permission-aware visibility in navigation + module route exposure.
3. Command/search surfaces  
   - Command inputs, quick actions, command palette, contextual search.
4. Stateful surfaces  
   - Empty, loading, and failure states; progress/feedback patterns.
5. Dialog and overlay system  
   - Modal/dialog, drawer, confirmation patterns, wizard-like workflows.
6. Feedback and action system  
   - Toasts, badges, alerts, callouts, and task queues.
7. Workflow ergonomics  
   - Form density, action grouping, error recovery, undo/confirmation flow.
8. Localization and copy  
   - `useTranslation` / locale-aware labels and user-facing microcopy.
9. Design tokens and visual system  
   - Color, spacing, radius, shadow, gradients, type scale.
10. Responsive behavior  
   - Desktop + mobile shell transitions, navigation persistence, density.

## 3) Usage graph (minimum dependency trace)

- `app/[locale]/(dashboard)/dashboard/layout.tsx`
  - composes `Sidebar`, `Navbar`, and dashboard shell behavior.
- `components/dashboard/Sidebar.tsx`
  - reads route groups and permission metadata (`config/sidebar.ts`) and controls module visibility.
- `components/dashboard/Navbar.tsx`
  - consumes pathname/session context and action shortcuts in top shell.
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
  - composes premium dashboard composition patterns and command-center primitives.
- `components/dashboard/primitives/command-center-primitives.tsx`
  - provides reusable command/wizard/filter building blocks reused by multiple surfaces.
- `components/finance/finance-dashboard-theme.ts`
  - applies domain-specific visual treatment and token overrides to finance pages.

## 4) Repository truth vs proposal

| Area | Repository truth | Proposal posture |
| --- | --- | --- |
| Navigation | Existing permission-aware shell and dashboard layout are already in place | Standardize IA and interaction contracts across modules; remove visual drift between modules |
| Command surfaces | Present in select modules with differing UX behavior | Consolidate into one reusable command contract with predictable keyboard, results, and empty/error behavior |
| Design system usage | Strong token base in `globals.css`, but variable drift in page modules | Tighten token governance and module override policy |
| State handling | Robust patterns exist for many states, but inconsistent semantics across surfaces | Introduce state-level rubric with mandatory mapping per component family |
| Accessibility | Not uniformly enforced across non-table overlays/forms | Align with WCAG-friendly baseline for focus, labels, contrast, and key handling |
| Localization | Locale-aware structure exists but copy consistency varies by module | Add per-surface copy quality checks and bilingual semantic taxonomy |

## 5) Immaterial lenses (not applicable)

- Offline/edge architecture: **Not applicable** in this pass because scope is desktop UI/UX surfaces.
- Deep distributed systems fault model: **Not applicable** for visual patterns; handled by backend-focused review stream.
- Raw accounting/tax interpretation: **Not applicable**; this review avoids legal/tax conclusions.

