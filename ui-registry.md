# UI Registry

Last updated: 2026-06-06

This registry captures the current StockFlow UI language for the dashboard/sidebar, categories, units, brands, login, and register surfaces. It records what exists today and highlights drift; it is not a fix list that has already been applied.

## Baseline - Enterprise Dashboard Theme

Files: `app/globals.css`, `tailwind.config.ts`, `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/input.tsx`, `components/ui/dropdown-menu.tsx`, `components/ui/select.tsx`, `components/ui/popover.tsx`
Family: Tokens/Primitive
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| app base | page | default | `bg-background text-foreground`, `border-border`, `bg-card text-card-foreground` |
| dashboard page | full viewport | default | `.dashboard-landing-theme dark`, `.dashboard-landing-content`, `max-w-[88rem]`, `px-4 sm:px-6` |
| dashboard surface | panel/card | default | `.dashboard-glass-panel`, `.dashboard-stat-card`, `.dashboard-table-shell` |
| dashboard input | h-9/h-10/h-11 | focus | `.dashboard-control`, `focus-visible` border and ring using `--dash-brand` |
| dashboard buttons | h-9/h-10 | default/hover | `.dashboard-button-primary`, `.dashboard-button-secondary`, `.dashboard-button-create` |
| floating overlay | popover/select/menu | open | `.enterprise-floating-surface`, `.enterprise-floating-item`, Radix animate-in/out classes |
| data table | compact enterprise | default/hover | `.dashboard-data-table`, table min-width, dark header, subtle row hover |

### Tokens Used

- App semantic tokens: `--background`, `--foreground`, `--card`, `--card-foreground`, `--popover`, `--popover-foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`.
- Dashboard semantic tokens: `--dash-canvas`, `--dash-chrome`, `--dash-surface`, `--dash-surface-raised`, `--dash-border`, `--dash-border-subtle`, `--dash-text`, `--dash-text-muted`, `--dash-text-soft`, `--dash-text-faint`, `--dash-brand`, `--dash-brand-strong`, `--dash-spruce`, `--dash-gold`, `--dash-warm`, `--dash-success`, `--dash-warning`, `--dash-danger`, `--dash-info` and their `*-soft` counterparts.
- Sidebar semantic tokens: `--sidebar-background`, `--sidebar-foreground`, `--sidebar-primary`, `--sidebar-accent`, `--sidebar-border`, `--sidebar-ring`, plus local `.dashboard-enterprise-sidebar` variables.
- Floating overlay tokens: `--floating-text`, `--floating-muted`, `--floating-faint`, `--floating-border`.
- Radius: standard primitives use `rounded-md`; enterprise dashboard/cards/tables use `rounded-lg`; auth intentionally uses softer `rounded-xl`.

### Motion

- Dashboard stat cards use `transition`/`duration-200` and icon `group-hover:scale-105`.
- Radix overlays use `animate-in`, `animate-out`, `fade-in/out`, `zoom-in/out`, and side slide classes.
- Reduced motion handling is not explicitly captured in these surfaces.

### Accessibility

- Focus-visible is present in shared button/input primitives and dashboard controls.
- Radix select/menu/popover primitives provide keyboard foundation.
- Sidebar search and auth forms use semantic inputs/buttons; sidebar collapse groups use `Collapsible`.
- Several custom clickable areas use anchors/buttons correctly, but some focus states rely on hover-like color only.

### Pattern Notes

The dominant dashboard language is a dark enterprise command-center style: deep blue-green surfaces, subtle grid/radial canvas, glass panels, compact rounded-lg controls, semantic dashboard variables, and accent families for brand, spruce, gold, warm, success, warning, danger, and info. Data-heavy pages should prefer dashboard tokens over literal Tailwind color families.

### Findings

- `components/dashboard/DashboardLayout.tsx:262` still represents an older light blue/indigo dashboard shell; do not use it as the reference for the active locale dashboard chrome.
- `app/globals.css:334` establishes dark enterprise floating overlays globally; auth select menus should be checked visually because auth pages otherwise use a lighter dual-theme vocabulary.
- `app/globals.css:122` hardcodes many dashboard hex/rgba values inside CSS variables. This is the current source of truth, but promotion into reusable design tokens would reduce drift.

## Navigation - Dashboard Sidebar

File: `components/dashboard/Sidebar.tsx`
Family: Navigation
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| shell | `w-[220px] lg:w-[280px]` | default | `.dashboard-enterprise-sidebar fixed left-0 top-0 h-full border-r` |
| brand mark | 44x44 | default | dark enterprise icon tile, blue soft fill, teal live dot |
| org card | compact | default | `rounded-xl border border-white/10 bg-white/[0.055]` |
| search | h-10 | focus | dark input, `focus:border-[#5796ff]/70`, `focus:ring-[#2f7df6]/20` |
| nav parent | h-auto | hover/active | `rounded-xl`, white translucent hover, brand/spruce active tones |
| child nav | compact | hover/active | nested dark surface, dot indicator, active spruce soft fill |
| footer actions | compact cards | hover | command cards, website link, user avatar, sign-out icon button |

### Tokens Used

- Surface: `.dashboard-enterprise-sidebar`, `#0f171d`, `#142129`, `#0e1a20`, `white/[0.055]`.
- Text: `text-white`, `#d3ddd8`, `#b9c8c3`, `#9fb4bb`, `#7f969f`.
- Accent: `#2f7df6`, `#5796ff`, `#2dd4bf`, `#d7a84f`, `#ef6a6a`.
- Border: `border-white/10`, `border-white/[0.06]`.

### Motion

- Nav items use `transition-all duration-200`.
- Dropdown chevrons switch between `ChevronDown` and `ChevronRight`; no rotation animation.

### Accessibility

- Main nav uses `Link`; dropdown parents use `CollapsibleTrigger`.
- Sign-out is a `button` with `aria-label`.
- Search has no explicit visible label beyond placeholder.

### Pattern Notes

Sidebar is visually aligned with the dashboard theme, but it is expressed mostly with literal colors instead of `--dash-*` or `--sidebar-*` tokens. Future sidebar changes should preserve the dark chrome, compact density, and live/secure/bilingual trust signals, while migrating repeated literals into tokens when practical.

### Findings

- `components/dashboard/Sidebar.tsx:142` uses literal brand/spruce hex values instead of semantic dashboard tokens.
- `components/dashboard/Sidebar.tsx:186` search input uses literal focus colors rather than `.dashboard-control`.
- `components/dashboard/Sidebar.tsx:220` and `components/dashboard/Sidebar.tsx:272` nav item states use repeated literal translucent classes; promote if this pattern spreads.

## Layout - Dashboard Overview

File: `components/dashboard/EnhancedEnterpriseDashboard.tsx`
Family: Layout/Data
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| page shell | full viewport | default/loading | `.dashboard-landing-theme dark min-h-screen` |
| hero/filter panel | responsive | default | `.dashboard-glass-panel rounded-lg p-5 sm:p-6` |
| KPI card | min-h 146px | hover/clickable | `.dashboard-stat-card`, top accent strip, `--stat-accent`, `--stat-soft` |
| section panel | variable | default | `dashboard-glass-panel`, header border, dark raised header |
| links/cards | compact | hover/focus | `Link` wrappers with `focus-visible:ring-[var(--dash-brand)]` |
| tabs | overview/inventory/operations | active | dashboard theme with dense cards and charts |

### Tokens Used

- Surface: `.dashboard-landing-theme`, `.dashboard-glass-panel`, `.dashboard-stat-card`, `--dash-surface-raised`.
- Text: `--dash-text`, `--dash-text-soft`, `--dash-text-faint`, `--dash-text-muted`.
- Accent: `--dash-brand`, `--dash-spruce`, `--dash-gold`, `--dash-warm`, `--dash-success`, `--dash-danger`, `--dash-info`.
- Focus: `focus-visible:ring-[var(--dash-brand)]`, `ring-offset-[var(--dash-surface)]`.

### Motion

- KPI card hover changes border/background and reveals external-link affordance.
- Charts use Recharts static fills/strokes based on dashboard tokens.

### Accessibility

- Clickable KPI/top-product/pending-action/stock-health/activity cards are anchors.
- The loading state uses skeleton blocks.
- Chart tooltips are styled, but chart accessibility metadata is not captured here.

### Pattern Notes

Dashboard overview is the strongest source of the modern StockFlow look. It should be treated as the visual reference for inventory management pages: dark canvas, glass panels, restrained rounded-lg cards, compact KPI stats, semantic accent stripes, and one-row table controls where space allows.

### Findings

- `components/dashboard/EnhancedEnterpriseDashboard.tsx:401` and `components/dashboard/EnhancedEnterpriseDashboard.tsx:578` correctly use the dashboard page shell.
- `components/dashboard/EnhancedEnterpriseDashboard.tsx:617` keeps filters in a glass panel, which should remain the canonical dashboard filter treatment.
- `components/dashboard/EnhancedEnterpriseDashboard.tsx` includes inline Recharts tooltip styles; if chart usage grows, promote a chart tooltip primitive.

## Data Display - Categories Table

Files: `app/[locale]/(dashboard)/dashboard/inventory/categories/page.tsx`, `components/inventory/EnhancedCategoriesManagement.tsx`, `components/DataTableComponents/DataTable.tsx`
Family: Data
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| route shell | full viewport | default/error | `.dashboard-landing-theme dark`, page header with `.dashboard-eyebrow` |
| page actions | h-10 | hover | `.dashboard-button-secondary`, `.dashboard-button-create` |
| summary cards | 6-card grid | hover | `.dashboard-stat-card`, icon tile, top accent strip |
| table shell | card panel | default | `.dashboard-glass-panel`, panel header, `DataTable variant="landing"` |
| toolbar | one row responsive | default | DataTable search, date filters, entity filters in a single flex row |
| filters | h-9 | focus/open | `.dashboard-control`, SelectContent dashboard raised surface |
| archive dialog | modal | default | `.dashboard-glass-panel`, destructive confirm button |

### Tokens Used

- Surface: `.dashboard-glass-panel`, `.dashboard-stat-card`, `.dashboard-table-shell`.
- Text: `--dash-text`, `--dash-text-soft`, `--dash-text-faint`.
- Border: `--dash-border-subtle`.
- Accents: `--dash-brand`, `--dash-success`, `--dash-info`, `--dash-gold`, `--dash-spruce`, `--dash-warm`.
- Toolbar: `dashboard-control`, `dashboard-button-secondary`, `dashboard-filter-chip`.

### Motion

- Stat icons scale on hover.
- Select menus use Radix open/close motion from the primitive.

### Accessibility

- Header actions are anchors wrapped by `Button asChild`.
- Filters use Radix Select.
- Archive dialog uses AlertDialog primitives.

### Pattern Notes

Categories are the reference inventory table surface. Brands and routed units should match this pattern: page header, one create button in the page action group, stat card strip, glass table card, one consolidated toolbar row, `DataTable variant="landing"`, and dashboard-token selects.

### Findings

- `components/inventory/EnhancedCategoriesManagement.tsx:208` is the current table card pattern to mirror.
- `components/inventory/EnhancedCategoriesManagement.tsx:268` and `components/inventory/EnhancedCategoriesManagement.tsx:278` show entity-specific filters embedded into the DataTable toolbar.

## Data Display - Units Table

Files: `app/[locale]/(dashboard)/dashboard/inventory/units/page.tsx`, `components/units/UnitsManagementDashboard.tsx`, `components/inventory/EnhancedUnitsManagement.tsx`
Family: Data/Form
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| active route shell | full viewport | default | `.dashboard-landing-theme dark`, `.dashboard-landing-content` |
| active page header | responsive | default | `.dashboard-eyebrow`, dashboard icon tile, h1/subtitle |
| active summary tiles | 4-card grid | hover | `SummaryTile` using `.dashboard-stat-card` and `--stat-*` |
| active table card | panel | default | `.dashboard-glass-panel`, dashboard table controls |
| active create/edit | dialog | default/error | `.dashboard-glass-panel`, `.dashboard-control`, `dashboard-button-primary/secondary` |
| legacy enhanced units | 6-card grid | drift | `bg-white/70 dark:bg-slate-800/70`, blue/purple/amber/rose gradients |

### Tokens Used

- Active units dashboard: `--dash-*`, `.dashboard-stat-card`, `.dashboard-glass-panel`, `.dashboard-control`, `.dashboard-button-*`, `.dashboard-filter-chip`.
- Active table: `DataTable variant="landing"`, select filters with `bg-[var(--dash-surface-raised)]`.
- Legacy enhanced units: literal Tailwind color families and gradients.

### Motion

- Active stat tiles scale icons on hover.
- Active dialog and dropdowns rely on UI primitives.
- Legacy enhanced units card hover includes `hover:-translate-y-1`, which is livelier than the current enterprise dashboard tone.

### Accessibility

- Active route uses real buttons and dialogs.
- DataTable search has `aria-label` via placeholder.
- Dialog forms use labels and required indicators.

### Pattern Notes

The routed units dashboard is now aligned with categories. Treat `components/units/UnitsManagementDashboard.tsx` as the active units reference. `components/inventory/EnhancedUnitsManagement.tsx` appears to be a stale or alternate surface and should not drive future visual decisions unless it is still rendered somewhere.

### Findings

- `components/units/UnitsManagementDashboard.tsx:780` matches the categories table card pattern.
- `components/units/UnitsManagementDashboard.tsx:863` and `components/units/UnitsManagementDashboard.tsx:874` match the dashboard-control select filter pattern.
- `components/inventory/EnhancedUnitsManagement.tsx:102` through `components/inventory/EnhancedUnitsManagement.tsx:207` use older light gradient cards that drift from categories/brands.
- `components/inventory/EnhancedUnitsManagement.tsx:256` uses a blue-to-purple create button instead of `dashboard-button-create`.

## Data Display - Brands Table

Files: `app/[locale]/(dashboard)/dashboard/inventory/brands/page.tsx`, `components/inventory/EnhancedBrandsManagement.tsx`, `components/DataTableComponents/DataTable.tsx`
Family: Data
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| route shell | full viewport | default/error | `.dashboard-landing-theme dark`, page header with `.dashboard-eyebrow` |
| page actions | h-10 | hover | `.dashboard-button-secondary`, `.dashboard-button-create` |
| summary cards | 6-card grid | hover | `.dashboard-stat-card`, icon tile, top accent strip |
| table shell | card panel | default | `.dashboard-glass-panel`, panel header, `DataTable variant="landing"` |
| toolbar filters | h-9 | focus/open | usage select + status select with `.dashboard-control` |
| archive dialog | modal | default | `.dashboard-glass-panel`, destructive confirm button |

### Tokens Used

- Surface: `.dashboard-glass-panel`, `.dashboard-stat-card`, `.dashboard-table-shell`.
- Text: `--dash-text`, `--dash-text-soft`, `--dash-text-faint`.
- Border: `--dash-border-subtle`.
- Accents: `--dash-brand`, `--dash-success`, `--dash-info`, `--dash-gold`, `--dash-spruce`, `--dash-warm`, `--dash-danger`.

### Motion

- Stat icons use `group-hover:scale-105`.
- Table row hover comes from DataTable landing variant.

### Accessibility

- Header buttons use anchor semantics through `Button asChild`.
- Filters use Radix Select.
- Archive confirmation uses AlertDialog primitives.

### Pattern Notes

Brands now follows the category look closely: same route shell, same page action treatment, same stat card anatomy, same table panel header, and same one-row toolbar strategy through DataTable.

### Findings

- `components/inventory/EnhancedBrandsManagement.tsx:207` matches the table card pattern.
- `components/inventory/EnhancedBrandsManagement.tsx:267` and `components/inventory/EnhancedBrandsManagement.tsx:277` match the dashboard-control filter pattern.
- Repeated category/brand table header markup is a candidate for a shared inventory table section primitive.

## Data/Form - Suppliers Dashboard

Files: `app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx`, `app/[locale]/(dashboard)/dashboard/suppliersSystem/page.tsx`, `components/suppliers/SupplierManagementDashboard.tsx`, `components/DataTableComponents/DataTable.tsx`
Family: Data/Form/Analytics
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| route shell | full viewport | default | `.dashboard-landing-theme dark`, `.dashboard-landing-content`, `max-w-[92rem]` |
| page header | responsive | default | `.dashboard-eyebrow`, supplier icon tile, h1/subtitle, one create button |
| summary cards | 6-card grid | hover | `.dashboard-stat-card`, icon tile, top accent strip, `--stat-accent`, `--stat-soft` |
| analytics cards | 2-card grid | hover/focus | `.dashboard-glass-panel`, supplier rows as buttons with `focus-visible:ring-[var(--dash-brand)]` |
| table shell | card panel | default | `.dashboard-glass-panel`, raised header, `DataTable variant="landing"` |
| toolbar | one row responsive | default | DataTable search, date filters, status/activity/language selects in one row |
| create/edit form | dialog | default/error | `.dashboard-glass-panel`, `.dashboard-control`, `dashboard-button-primary/secondary`, labelled fields |
| analytics detail | dialog | loading/error/default | `.dashboard-glass-panel`, recent orders, ledger entries, and linked item panels |

### Tokens Used

- Surface: `.dashboard-landing-theme`, `.dashboard-glass-panel`, `.dashboard-stat-card`, `.dashboard-table-shell`.
- Text: `--dash-text`, `--dash-text-soft`, `--dash-text-muted`, `--dash-text-faint`.
- Border: `--dash-border-subtle`.
- Accents: `--dash-brand`, `--dash-success`, `--dash-info`, `--dash-gold`, `--dash-spruce`, `--dash-warm`, `--dash-danger`.
- Controls: `dashboard-control`, `dashboard-button-primary`, `dashboard-button-secondary`, `dashboard-button-create`, `dashboard-filter-chip`.

### Motion

- Summary icons use the same `group-hover:scale-105` pattern as categories, brands, and units.
- Analytics list rows use subtle background changes on hover and visible focus rings.
- Dialogs, selects, and dropdown menus rely on the shared Radix primitive motion.

### Accessibility

- Create/edit fields use visible `Label` elements and required indicators.
- Supplier analytics cards are real buttons with focus-visible rings.
- Table row actions use `DropdownMenu` primitives with non-transparent dashboard raised surfaces.
- Destructive supplier archiving uses `AlertDialog`.

### Pattern Notes

Suppliers now follows the active inventory dashboard language rather than the older light supplier system forms. Both `/dashboard/purchases/suppliers` and `/dashboard/suppliersSystem` should stay routed to the same component so purchasing suppliers, create/edit states, and analytics remain visually and behaviorally consistent.

### Findings

- `components/suppliers/SupplierManagementDashboard.tsx` passed the imprint palette scan with no hardcoded Tailwind color-family or hex drift in the new surface.
- `app/[locale]/(dashboard)/dashboard/purchases/suppliers/layout.tsx` now gates on `purchases.suppliers.read`; the previous brand permission check was not aligned with the route.
- Future supplier-specific dropdowns should keep `bg-[var(--dash-surface-raised)]` and `border-[var(--dash-border-subtle)]` overrides where the global overlay class is not applied directly.

## Data/Form - Customers Dashboard

Files: `app/[locale]/(dashboard)/dashboard/customers/page.tsx`, `app/[locale]/(dashboard)/dashboard/customers/new/page.tsx`, `app/[locale]/(dashboard)/dashboard/customers/[id]/page.tsx`, `app/[locale]/(dashboard)/dashboard/customers/[id]/edit/page.tsx`, `components/customers/CustomerManagementDashboard.tsx`, `components/DataTableComponents/DataTable.tsx`
Family: Data/Form/Analytics
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| route shell | full viewport | default/error | `.dashboard-landing-theme dark`, `.dashboard-landing-content`, `max-w-[92rem]` |
| page header | responsive | default | `.dashboard-eyebrow`, customer icon tile, h1/subtitle, refresh/export/create actions |
| summary cards | 6-card grid | hover | `.dashboard-stat-card`, icon tile, top accent strip, `--stat-accent`, `--stat-soft` |
| analytics cards | 2-card grid | hover/focus | `.dashboard-glass-panel`, customer rows as buttons with `focus-visible:ring-[var(--dash-brand)]` |
| table shell | card panel | default | `.dashboard-glass-panel`, raised header, `DataTable variant="landing"` |
| toolbar | one row responsive | default | DataTable search, date filters, status/activity/language selects in one row |
| create/edit form | dialog | default/error | `.dashboard-glass-panel`, `.dashboard-control`, `dashboard-button-primary/secondary`, labelled fields |
| analytics detail | dialog | loading/error/default | `.dashboard-glass-panel`, recent sales orders, ledger entries, and payment panels |

### Tokens Used

- Surface: `.dashboard-landing-theme`, `.dashboard-glass-panel`, `.dashboard-stat-card`, `.dashboard-table-shell`.
- Text: `--dash-text`, `--dash-text-soft`, `--dash-text-muted`, `--dash-text-faint`.
- Border: `--dash-border-subtle`.
- Accents: `--dash-brand`, `--dash-success`, `--dash-info`, `--dash-gold`, `--dash-spruce`, `--dash-warm`, `--dash-danger`.
- Controls: `dashboard-control`, `dashboard-button-primary`, `dashboard-button-secondary`, `dashboard-button-create`, `dashboard-filter-chip`.

### Motion

- Summary icons use the same `group-hover:scale-105` pattern as categories, brands, units, and suppliers.
- Analytics list rows use subtle background changes on hover and visible focus rings.
- Dialogs, selects, and dropdown menus rely on the shared Radix primitive motion.

### Accessibility

- Create/edit fields use visible `Label` elements and required indicators.
- Customer analytics cards are real buttons with focus-visible rings.
- Table row actions use `DropdownMenu` primitives with non-transparent dashboard raised surfaces.
- Destructive customer archiving uses `AlertDialog`.

### Pattern Notes

Customers now follows the active inventory dashboard language. The dashboard, create route, edit route, and detail analytics route should keep routing through `CustomerManagementDashboard` so customer identity, receivables, sales orders, and ledger analytics stay visually and behaviorally consistent.

### Findings

- `components/customers/CustomerManagementDashboard.tsx` passed the customer-surface imprint palette scan with no hardcoded Tailwind color-family or hex drift after localization cleanup.
- `app/[locale]/(dashboard)/dashboard/customers/layout.tsx` gates customer management on `customers.read`.
- The older `/dashboard/customers/[id]/orders` page remains a legacy order-history surface and should be modernized separately if it becomes part of the customer dashboard contract.

## Auth - Login And Register

Files: `components/auth/AuthLayout.tsx`, `components/auth/EnhancedLoginForm.tsx`, `components/auth/BeautifulRegisterForm.tsx`, `components/auth/auth-copy.ts`, `app/globals.css`
Family: Layout/Input/Form
Last updated: 2026-06-06

### Anatomy

| Variant | Size | State | Token or class summary |
| --- | --- | --- | --- |
| auth shell | full viewport | light/dark | soft grid background, light `#dfe8eb`, dark `#0b1116`, two-column layout at lg |
| brand/header | h-10/h-11 controls | hover | StockFlow mark, locale switch, theme toggle |
| module showcase | card grid | hover | inventory/accounting/POS/purchasing/reporting cards with per-module accent |
| form card | min-h 720px lg | default | `AuthFormCard`, `rounded-xl`, translucent panel, blur, shadow |
| auth input | h-12 | focus/autofill/error | `.auth-input`, icon padding, focus ring, error/success border |
| login methods | 3-card grid | active/hover | custom `AuthMethodButton`, active password method |
| register wizard | 3 steps | active/complete | progress bar, step buttons, `personal/company/security` flow |
| auth select | h-12 | open | SelectTrigger styled for auth, SelectContent currently mostly `rounded-xl` |

### Tokens Used

- Auth surfaces: `#dfe8eb`, `#eef4f5`, `#e2ecef`, `#132028`, `#10181d`, `#142129`, `#0f171d`.
- Auth text: `#132028`, `#253943`, `#45606a`, `#58707a`, `#7f969f`, `#9fb4bb`, white.
- Auth accents: `#2f7df6`, `#2dd4bf`, `#d7a84f`, `#bf4b6a`, `#5c6df6`, `#ef6a6a`, `#2ec98a`.
- Auth input helper: `.auth-input` with explicit light/dark text, background, caret, placeholder, and autofill behavior.

### Motion

- Auth cards/buttons use `transition-all`; module cards hover slightly upward.
- Register progress bar uses `transition-all duration-500`.
- Loading states use spinner icons.

### Accessibility

- Inputs use `Label` and validation messages.
- Password visibility buttons use `aria-label`.
- Locale and theme controls use aria labels.
- Register step buttons are buttons; only completed/current steps are clickable.

### Pattern Notes

Auth intentionally uses a softer, lighter dual-theme language than the dashboard while retaining the same brand accents, module emphasis, and secure enterprise tone. Preserve the balanced two-column layout, module highlight cards, h-12 inputs, visible typed text, and rounded-xl card family. If auth dropdowns must blend more intimately, define an auth overlay variant instead of relying solely on the global dark `enterprise-floating-surface`.

### Findings

- `components/auth/AuthLayout.tsx:108` through `components/auth/AuthLayout.tsx:321` use repeated hardcoded auth colors; this should become an auth token group if the auth language keeps expanding.
- `components/auth/EnhancedLoginForm.tsx:34` and `components/auth/BeautifulRegisterForm.tsx:42` duplicate the same `inputClass`; promote to an `AuthInput` primitive or shared class wrapper if more auth forms are added.
- `components/auth/BeautifulRegisterForm.tsx:343`, `components/auth/BeautifulRegisterForm.tsx:368`, `components/auth/BeautifulRegisterForm.tsx:419`, `components/auth/BeautifulRegisterForm.tsx:434`, and `components/auth/BeautifulRegisterForm.tsx:449` use mostly `rounded-xl` SelectContent overrides; check the rendered dropdown against the auth palette because the primitive carries the enterprise floating overlay.

## Cross-Surface Recommendations

- Treat `components/dashboard/EnhancedEnterpriseDashboard.tsx`, `components/dashboard/Sidebar.tsx`, `components/inventory/EnhancedCategoriesManagement.tsx`, `components/inventory/EnhancedBrandsManagement.tsx`, and `components/units/UnitsManagementDashboard.tsx` as the current dashboard reference set.
- Treat `components/auth/AuthLayout.tsx`, `components/auth/EnhancedLoginForm.tsx`, and `components/auth/BeautifulRegisterForm.tsx` as the current auth reference set.
- Keep inventory tables on `DataTable variant="landing"` with one consolidated toolbar row: search, date range, date preset, entity filters, and view/filter controls as needed.
- Prefer `rounded-lg` for dashboard cards, controls, tables, overlays, and dialogs; reserve `rounded-xl` for auth cards and sidebar chrome where that family is already established.
- Promote repeated dashboard page headers, stat cards, table panels, and inventory table headers into shared primitives if more inventory pages are harmonized.
- Promote auth colors into variables before expanding login/register/forgot/verify further.
