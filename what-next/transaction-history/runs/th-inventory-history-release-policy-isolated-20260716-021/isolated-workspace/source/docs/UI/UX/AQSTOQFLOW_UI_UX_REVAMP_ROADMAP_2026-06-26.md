# AqStoqFlow UI/UX Revamp Roadmap

Date: 2026-06-26

Source analysis: `docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md`

## Roadmap Purpose

This roadmap converts the UI/UX honest review into an execution plan for making AqStoqFlow uniform, modern, professional, robust, and immediately impressive without bloating the system.

The central objective is simple:

> Make AqStoqFlow feel like one trusted operating system, not a collection of individually impressive but visually uneven modules.

The target experience should help a user understand the state of the business in five seconds, know the next action in ten seconds, and trust the evidence behind the numbers without hunting through the system.

## Guiding Product Principle

Every primary experience should answer four questions:

1. What is the state of the business?
2. What changed or needs attention?
3. What should the user do next?
4. What proof backs this?

This principle should guide the dashboard shell, landing page, module pages, action queues, proof drawers, empty states, error states, and onboarding flows.

## Non-Goals

This roadmap should not become a broad rewrite.

- Do not rebuild unrelated backend services.
- Do not redesign payroll, POS, inventory, finance, and compliance all at once.
- Do not add decorative effects just to make the product look modern.
- Do not create parallel theme systems.
- Do not replace existing working workflows unless they block the unified experience.
- Do not make a marketing-first shell for authenticated operations.

The work should be surgical, sequenced, and governed.

## Target End State

AqStoqFlow should have:

- One authenticated dashboard visual system.
- One page anatomy for command-center pages.
- One navigation model with role-aware prioritization.
- One standard for empty, loading, error, locked, and permission states.
- One action queue pattern.
- One proof/evidence interaction model.
- One filter and detail-drawer pattern for workbench pages.
- A public landing experience that shows the product quickly and confidently.
- A default dashboard that feels screenshot-worthy from the first sign-in.

## Experience Architecture

### 1. Public Experience

Purpose: create immediate trust and desire.

Primary surfaces:

- Landing page
- Product hero preview
- Login page
- Trial/demo entry

Desired feeling:

- Premium
- Specific to OHADA SMB operations
- Product-led
- Calm and trustworthy
- Not generic SaaS

### 2. Authenticated Command Shell

Purpose: orient the user and give access to daily work.

Primary surfaces:

- Sidebar
- Topbar
- Dashboard layout
- Command/search entry
- Notifications and urgent actions
- Tenant/location context

Desired feeling:

- Focused
- Professional
- Fast
- Role-aware
- Less like a sitemap, more like an operating cockpit

### 3. Domain Command Centers

Purpose: let each function manage its operating truth.

Primary surfaces:

- Finance command center
- Payroll command center
- Inventory dashboards
- POS operational shell
- Purchasing and AP
- Sales and receivables
- Compliance and close assurance
- Owner war room

Desired feeling:

- Consistent structure
- Domain-specific content
- Shared interaction patterns
- Proof-led decisions

### 4. Workbench and Detail Flows

Purpose: complete daily work without visual friction.

Primary surfaces:

- Tables
- Forms
- Drawers
- Approval flows
- Detail pages
- Audit/proof trails

Desired feeling:

- Quiet
- Dense where needed
- Stable
- Predictable
- Fast to scan and act on

## Phase 0: Design-System Audit and Freeze

### Goal

Stop visual drift before adding new UI. Establish the single source of truth for authenticated product styling.

### Prerequisites

- Confirm the current dashboard theme tokens in `app/globals.css`.
- Identify all active theme-like systems, including dashboard theme, finance helpers, landing tokens, custom slate panels, light legacy cards, and alternate experiments.
- Decide which styling belongs to authenticated product screens versus public marketing pages.
- Agree that new authenticated work must use the selected product shell and primitives.

### What To Do

- Inventory current visual systems.
- Pick the authenticated product theme as the default.
- Document allowed colors, surfaces, typography scale, spacing, radius, shadows, and density rules.
- Mark legacy styling patterns that should not be copied.
- Define the acceptable use of dark surfaces, light surfaces, glass panels, gradients, and cards.

### How To Do It

- Review `app/globals.css` and identify the canonical dashboard variables.
- Review major shell components such as `components/dashboard/Sidebar.tsx`, `components/dashboard/Navbar.tsx`, and `components/dashboard/EnhancedEnterpriseDashboard.tsx`.
- Review module dashboards that already use the preferred theme and extract reusable patterns.
- Create a short "UI constitution" document under `docs/UI/UX/`.
- Add or update a small component registry that says which primitives should be used for new dashboard pages.

### Acceptance Criteria

- The team can answer: "What theme should a new authenticated dashboard page use?"
- There is one documented dashboard page anatomy.
- There is one documented semantic color system.
- Legacy visual patterns are identified and discouraged.
- No module needs to invent a new card, panel, filter, or error pattern for ordinary screens.

### Suggested Files

- `app/globals.css`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `docs/UI/UX/`
- `docs/product/user-experience/`

## Phase 1: Shell Simplification and Navigation Governance

### Goal

Make the authenticated shell feel focused, role-aware, and professional instead of exposing the whole product at once.

### Prerequisites

- Complete Phase 0 theme decision.
- Confirm primary user roles: owner, manager, accountant, cashier, stockkeeper, payroll admin, compliance/admin.
- Identify routes that are daily-use versus occasional admin routes.
- Identify routes that should be command-palette-first instead of always visible.

### What To Do

- Simplify the sidebar into five primary lanes:
  - Command
  - Operations
  - Finance
  - People
  - Governance
- Reduce first-level visible items.
- Move rare setup/admin routes under settings, search, or secondary sections.
- Keep role and permission filtering.
- Make topbar hierarchy calmer.
- Make tenant/location/search/action state clearer.

### How To Do It

- Update `config/sidebar.ts` so the information architecture is task-based, not just module-complete.
- Keep critical daily links visible for each role.
- Group advanced pages behind secondary menus.
- Keep the search or command palette as the escape hatch for power users.
- In `components/dashboard/Sidebar.tsx`, reduce competing badges, panels, and repeated chrome.
- In `components/dashboard/Navbar.tsx`, prioritize location/tenant, command/search, urgent alerts, and user controls.

### Acceptance Criteria

- A new user can understand the navigation in under ten seconds.
- Primary navigation does not feel like a full sitemap.
- Role-specific users see the most relevant work first.
- Search/command access still makes all authorized routes reachable.
- The shell remains usable on laptop and tablet widths.

### Suggested Files

- `config/sidebar.ts`
- `components/dashboard/Sidebar.tsx`
- `components/dashboard/Navbar.tsx`
- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`

## Phase 2: Define the Command-Center Page Anatomy

### Goal

Create one reusable page structure for all major operational dashboards.

### Prerequisites

- Phase 0 theme decision.
- Phase 1 shell simplification direction.
- Identify the first three pilot pages for normalization.
- Confirm which data can be displayed today without backend changes.

### What To Do

Standardize the page anatomy:

1. Command brief header
2. Status/KPI strip
3. Action queue
4. Proof/evidence strip
5. Domain workbench or analytics section
6. Detail drawer pattern

### How To Do It

- Create shared primitives for command-center pages.
- Keep primitives domain-neutral but flexible.
- Use semantic statuses and consistent labels.
- Make the action queue the central interaction model.
- Make proof/evidence accessible from important numbers and actions.
- Keep analytics below the action layer so the page does not become report-first.

### Proposed Primitives

- `CommandBriefHeader`
- `StatusStrip`
- `KpiTile`
- `ActionQueue`
- `ActionQueueItem`
- `ProofBadge`
- `EvidenceTimeline`
- `FilterBar`
- `DetailDrawer`
- `RouteState`
- `PermissionLockedState`

### Acceptance Criteria

- A command-center page can be assembled without custom layout decisions.
- All major dashboards share recognizable structure.
- Users know where to look for state, risk, action, and proof.
- Module-specific content still feels domain-aware.

### Suggested Files

- `components/dashboard/`
- `components/dashboard/primitives/`
- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/inventory/`
- `components/purchasing/`

## Phase 3: Rebuild the Default Dashboard Around "Today's Operating Truth"

### Goal

Make the first authenticated screen stunning, useful, and decisive.

### Prerequisites

- Shared command-center page anatomy exists.
- Shell simplification is underway or complete.
- Identify available cross-domain metrics.
- Define role-specific variants for the dashboard.
- Confirm fallback behavior when data is missing.

### What To Do

Reframe `/dashboard` as "Today's Operating Truth".

Recommended first screen:

1. One-sentence command brief.
2. Live status strip across POS, stock, cash, AP, close, payroll, and compliance.
3. Urgent action queue with owner, due state, risk, and proof link.
4. Evidence timeline showing recent trusted events.
5. KPI strip for revenue, margin, cash, stock risk, and obligations.
6. Role-specific shortcuts.
7. Secondary analytics below the first viewport.

### How To Do It

- Use existing dashboard data where possible.
- Do not wait for a perfect unified data service before improving hierarchy.
- Start with a static layout wired to current service data and well-labeled fallbacks.
- Make the page useful even when some modules have no data.
- Add role-based ordering rather than completely separate dashboards at first.
- Keep the first viewport clean and screenshot-worthy.

### Acceptance Criteria

- The dashboard answers the four core questions immediately.
- The page feels like the center of the product, not a collection of cards.
- A first-time viewer can understand AqStoqFlow's value without reading long copy.
- Empty or partial data states still look intentional.
- The top viewport can be used as a product screenshot.

### Suggested Files

- `components/dashboard/EnhancedEnterpriseDashboard.tsx`
- `app/[locale]/(dashboard)/dashboard/`
- `components/dashboard/primitives/`
- Existing dashboard data services and hooks used by the current page

## Phase 4: Standardize Robust States

### Goal

Make the system feel reliable even when data is loading, unavailable, unauthorized, or broken.

### Prerequisites

- Define shared route state components.
- Agree on copy tone for operational failures.
- Identify the most common failure modes:
  - loading
  - empty data
  - missing permission
  - locked module
  - network or server error
  - stale tenant/session
  - partial data

### What To Do

- Standardize loading states.
- Standardize empty states.
- Standardize error pages and inline errors.
- Standardize permission and locked-module states.
- Make recovery actions explicit.
- Ensure the agreed system error page appears on the right routes.

### How To Do It

- Use shared components instead of page-specific error markup.
- Keep tone practical: what happened, what it affects, what to do next.
- Include retry, return, contact/admin, or open command center actions where appropriate.
- Avoid scary generic errors for recoverable states.
- Avoid hiding failures behind blank cards.

### Acceptance Criteria

- Users never see a blank dashboard without explanation.
- Permission failures feel intentional, not broken.
- Loading does not shift layout badly.
- Error screens match the system visual language.
- Each state has a clear next action.

### Suggested Files

- `components/dashboard/DashboardRouteState.tsx`
- `components/dashboard/DashboardErrorState.tsx`
- `app/[locale]/(dashboard)/error.tsx`
- `app/[locale]/(dashboard)/not-found.tsx`
- Shared state components under `components/`

## Phase 5: Normalize Priority Modules

### Goal

Bring the most visible modules into the same experience language without rewriting them.

### Prerequisites

- Shared page anatomy exists.
- Default dashboard has been redesigned.
- Shell and state patterns are established.
- Identify the highest-traffic or highest-demo-value modules.

### Recommended Module Order

1. Finance command center
2. Payroll command center
3. Inventory dashboard and stock movement pages
4. POS operational shell
5. Purchasing and AP
6. Sales and receivables
7. Compliance and close assurance
8. Owner war room

### What To Do

- Convert each module to the shared page rhythm.
- Keep domain-specific workflows intact.
- Replace custom visual wrappers with shared primitives.
- Standardize filter bars.
- Standardize proof badges and drawers.
- Standardize detail drawers.
- Keep dense work surfaces where the job requires density.

### How To Do It

For each module:

1. Identify current command brief.
2. Identify top five KPIs or statuses.
3. Identify actions that should enter the action queue.
4. Identify proof or evidence sources.
5. Replace custom layout pieces with shared primitives.
6. Keep existing service and action calls.
7. Verify desktop and mobile layout.

### Acceptance Criteria

- Users can move between modules without relearning the interface.
- Each module still feels specialized.
- No page introduces a new theme.
- Proof interactions are consistent.
- Filters and detail drawers behave predictably.

### Suggested Files

- `components/finance/FinanceCommandCenterDashboard.tsx`
- `components/payroll/PayrollCommandCenter.tsx`
- `components/payroll/PayrollControlWorkbench.tsx`
- `components/pos/ProfessionalPOSSystem.tsx`
- `components/owner-war-room/OwnerWarRoomDashboard.tsx`
- `components/inventory/`
- `components/purchasing/`
- `components/sales/`
- `components/compliance/`

## Phase 6: Public Landing and Login Polish

### Goal

Make the public and authentication experience product-led, premium, and less copy-heavy.

### Prerequisites

- The target default dashboard direction is clear.
- A polished command-center screenshot or live preview state exists.
- Product positioning has been simplified into a short message.
- Login security and tenant/session behavior is understood.

### What To Do

- Replace copy-heavy first impression with product evidence.
- Show a real or realistic product state above the fold.
- Shorten repeated module explanations.
- Make the hero message sharper.
- Make login calmer and faster.
- Keep trust and security visible without overwhelming the user.

### How To Do It

- Update the landing hero to show the real command-center concept.
- Reduce repeated section copy.
- Use fewer but stronger proof points.
- Keep OHADA positioning prominent.
- Update login layout to prioritize the form, tenant trust, and secure workspace language.
- Avoid marketing-style ornamentation inside the authenticated product.

### Acceptance Criteria

- A first-time visitor can understand the product in one viewport.
- The landing page shows the actual system promise visually.
- Login feels secure, premium, and fast.
- Public pages and authenticated pages feel related but not identical.

### Suggested Files

- `app/[locale]/(home)/page.tsx`
- `components/landing/hero-dashboard.tsx`
- `components/auth/AuthLayout.tsx`
- `components/auth/BeautifulRegisterForm.tsx`
- Login-related route components

## Phase 7: First-Run Onboarding and Demo Workspace

### Goal

Make the system impressive even before the user has real business data.

### Prerequisites

- Default dashboard layout is stable.
- Public/demo positioning is stable.
- Required setup steps are known.
- Demo data boundaries are clear.

### What To Do

- Create a guided first-run setup path.
- Make empty states productive.
- Build a coherent demo workspace.
- Ensure screenshots and demos show realistic business activity.

### Recommended Onboarding Steps

1. Company profile and OHADA context.
2. Locations and warehouses.
3. User roles and permissions.
4. Inventory import or starter catalog.
5. POS setup.
6. Finance/accounts setup.
7. Payroll setup where enabled.
8. First proof/evidence checkpoint.

### How To Do It

- Use a setup checklist rather than a long wizard where possible.
- Let users skip advanced steps but keep visible completion state.
- Seed demo data that tells a coherent story: sales, stock, cash, AP, payroll, and compliance.
- Make empty dashboards explain what will appear and how to activate it.

### Acceptance Criteria

- New users know what to configure first.
- Empty states do not feel broken.
- Demo mode looks like a real OHADA SMB operating today.
- The first session produces visible progress.

### Suggested Files

- Onboarding routes and components
- Demo data seed scripts
- Dashboard empty states
- Module setup pages

## Phase 8: Accessibility, Responsiveness, and Performance Hardening

### Goal

Make the modernized UI robust, inclusive, and operationally dependable.

### Prerequisites

- Core shell and dashboard primitives exist.
- Priority modules have begun adopting shared primitives.
- Responsive breakpoints are known.
- Testing stack is available.

### What To Do

- Check contrast across dark and light surfaces.
- Verify keyboard navigation for menus, drawers, filters, and action queues.
- Ensure focus states are visible.
- Prevent text overflow in buttons, cards, tables, and sidebar labels.
- Validate mobile and tablet layouts for shell, dashboard, POS, and forms.
- Watch bundle size and avoid heavy visual dependencies.

### How To Do It

- Run browser smoke tests at desktop, tablet, and mobile widths.
- Capture screenshots for core routes.
- Add targeted component tests where behavior is non-trivial.
- Prefer CSS variables and existing component libraries over custom one-off code.
- Keep animation restrained and performance-safe.

### Acceptance Criteria

- Core routes are usable with keyboard.
- Important text does not overlap or truncate badly.
- Dashboard shell works on common viewport sizes.
- No page becomes visibly slower due to decorative UI.
- Visual regression screenshots can detect major layout drift.

### Suggested Verification

- `npm run lint`
- `npm run typecheck`
- Targeted component tests where available
- Playwright screenshot smoke tests for public landing, login, dashboard, finance, payroll, inventory, and POS

## Phase 9: Governance and Release Discipline

### Goal

Prevent the UI from drifting again after the revamp.

### Prerequisites

- UI constitution exists.
- Shared primitives exist.
- Priority modules have at least one normalized reference implementation.
- Review checklist is agreed.

### What To Do

- Add a UI/UX review checklist for new dashboard work.
- Add a route inventory for visual maturity.
- Track route modernization status.
- Require new dashboard pages to use shared primitives.
- Add screenshot evidence to major UI PRs.

### How To Do It

- Maintain a simple route matrix:
  - route
  - owner
  - current maturity
  - target pattern
  - blockers
  - verification status
- Add examples of accepted dashboard pages.
- Add examples of discouraged patterns.
- Keep the roadmap updated after each phase.

### Acceptance Criteria

- New UI work follows the system by default.
- Reviewers can identify visual drift quickly.
- The design system is documented enough for future contributors.
- Major UI changes ship with screenshots or route smoke evidence.

## Workstream Dependencies

### Product Dependencies

- Define target user roles.
- Define daily action priorities by role.
- Clarify the first-run business story.
- Decide which modules are demo-critical.

### Design Dependencies

- Freeze the authenticated visual language.
- Define semantic colors and status labels.
- Define spacing, radius, and density rules.
- Define what belongs above the fold.

### Engineering Dependencies

- Identify existing data sources for default dashboard metrics.
- Confirm route and permission behavior.
- Confirm shared state components.
- Confirm test and screenshot tooling.
- Avoid backend expansion unless a UI need cannot be met otherwise.

### Content Dependencies

- Shorten landing and login copy.
- Define consistent empty/error state copy.
- Define command brief sentence patterns.
- Define action queue labels.

## Route Modernization Matrix

Use this matrix to track progress.

| Area | Target Pattern | Priority | Notes |
| --- | --- | --- | --- |
| `/en/dashboard` | Today's Operating Truth | Critical | First signed-in impression |
| Finance | Command center + action queue + proof | Critical | High business credibility |
| Payroll | Command center + proof drawer | High | Must feel controlled and serious |
| Inventory | Workbench + status strip + detail drawers | High | Core SMB operations |
| POS | Fast operational shell | High | Needs tactile, high-contrast UX |
| Purchasing/AP | Approval/action queue pattern | High | Strong evidence workflow candidate |
| Sales/Receivables | Pipeline + cash impact + proof | Medium | Important for owner visibility |
| Compliance/Close | Assurance timeline + readiness state | Medium | Supports trust positioning |
| Owner War Room | Executive command layer | Medium | Demo and sales impact |
| Landing | Product-led hero | High | First external impression |
| Login | Secure, calm access | High | First return-user impression |

## Component Modernization Checklist

Before changing a page, answer:

- What is the user's primary job on this page?
- What is the command brief?
- What are the top five statuses or KPIs?
- What actions should be in the queue?
- What proof backs the page's numbers?
- What filters are needed?
- What details belong in a drawer?
- What happens when data is empty?
- What happens when data fails?
- What does the page look like on mobile?

## Page Acceptance Checklist

A page is considered modernized when:

- It uses the authenticated dashboard visual system.
- It has a clear command brief.
- It exposes next actions, not just metrics.
- It has consistent status colors.
- It uses shared empty, loading, error, and permission states.
- It uses a standard filter bar where filtering exists.
- It supports a proof/evidence interaction where trust matters.
- It does not introduce new decorative visual language.
- It works at desktop and common tablet/mobile widths.
- It has been verified with lint/typecheck and a visual smoke pass where practical.

## Suggested Delivery Sequence

### Sprint 1: Foundation

- Create UI constitution.
- Freeze theme and page anatomy.
- Simplify navigation model.
- Create primitive backlog.
- Identify top routes and owners.

### Sprint 2: First Impression

- Rebuild default dashboard concept.
- Polish landing hero around real product state.
- Simplify login.
- Standardize system states.

### Sprint 3: Core Modules

- Normalize finance.
- Normalize payroll shell.
- Normalize inventory dashboard.
- Start POS shell alignment without slowing operational flow.

### Sprint 4: Workflows

- Normalize purchasing/AP.
- Normalize sales/receivables.
- Normalize compliance/close assurance.
- Standardize proof drawers and detail drawers.

### Sprint 5: Robustness

- Add route screenshot checks.
- Test responsive behavior.
- Improve accessibility.
- Add route maturity matrix and review checklist.

## Verification Plan

Run verification at three levels.

### 1. Static Verification

- Lint changed files.
- Typecheck touched UI components.
- Check CSS variable usage.
- Search for forbidden legacy patterns in touched files.

### 2. Component Verification

- Test state components.
- Test drawers and filter bars.
- Test action queue behavior.
- Test permission and locked states where logic exists.

### 3. Browser Verification

- Capture screenshots for landing, login, default dashboard, finance, payroll, inventory, POS.
- Verify desktop, tablet, and mobile widths.
- Confirm no overlapping text.
- Confirm no blank panels.
- Confirm interactive controls are reachable.

## Definition of Done for the Revamp

The revamp is done when:

- The first signed-in dashboard feels like the product's command center.
- Major modules share one recognizable visual and interaction language.
- Navigation feels focused and role-aware.
- Public landing and login feel premium and product-led.
- Robust states are consistent across the dashboard.
- Proof/evidence interaction is visible and repeatable.
- New pages have a documented pattern to follow.
- The system looks impressive because it is clear, trusted, and decisive.

## Final Recommendation

The UI/UX revamp should not be treated as a cosmetic redesign. It should be treated as the process of making the product's operating model visible.

AqStoqFlow already has the raw material: modules, proof language, command centers, OHADA positioning, and serious business workflows. The roadmap is to consolidate that into one experience where every screen says:

> Here is the state. Here is the risk. Here is the action. Here is the proof.

That is how the product becomes uniform, modern, professional, robust, and stunning from the first moment.
