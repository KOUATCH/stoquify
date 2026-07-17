# StockFlow Dashboard — Design Contract

Phase 3 deliverable. Lock this before writing code. Deviations after this point are expensive.

## Primary Persona

Branch Manager / Owner-Operator of a single retail location. Opens `/dashboard` at 8am on a phone or laptop before opening the shop. ~90 seconds to scan. Speaks French or English. Decides today's reorder, knows last night's close.

## Promise

> "See yesterday's close, today's pace, and what needs your attention — in one screen, before your first customer walks in."

## Inspiration Synthesis (1 paragraph)

We are stealing four moves: **(1)** Linear/Vercel's discipline — monochromatic surfaces with one accent, 1px low-contrast rules, no shadow theater; **(2)** Stripe's asymmetric hierarchy — the most important number is the largest number, not the most colorful; **(3)** Raycast's mono-caps eyebrow as the section anchor (which already exists in `landing.css` as `.eyebrow` and just needs to be hoisted); **(4)** the landing page's own three-voice typographic system (Instrument Serif display + IBM Plex Sans body + JetBrains Mono numbers), so the dashboard reads as the grown-up cousin of the marketing site. We are explicitly rejecting: gradient KPI text, the colored-icon-in-a-colored-circle stat card, equal-weight 4-up KPI grids, rainbow Recharts palettes, and stagger-fade page entrances.

---

## Distinctive Without Being Weird — Measurable Translation

The user gave us a binary requirement that's normally fuzzy: distinctive AND not weird. We make it measurable by defining the exact decisions that achieve each, and the boundaries between them.

### Distinctive (what makes someone say "this isn't the shadcn admin starter")

| Dimension | Decision | How it differs from defaults |
|---|---|---|
| **Display typeface** | Instrument Serif for hero sentence + KPI numbers ≥48px | Default admin uses sans-only. Serif on a dashboard is rare and recognizable. |
| **Eyebrow anchor** | Mono caps, 11px / +0.22em tracking, accent color, above every section | Default admin uses bold sans titles. Mono caps eyebrows are an editorial move. |
| **Asymmetric KPI grid** | Hero metric is 2x wider than secondary metrics (8/4 split, not 4-up equal) | Default is 4 equal stat cards. Asymmetric hierarchy by size is uncommon. |
| **Mono numerals** | Every visible number is JetBrains Mono with `tabular-nums` | Default admin uses proportional sans figures. Mono numerals say "data is real." |
| **Direct-labeled charts** | Line end labels in mono next to the data point — no chart legend | Default is colored legend below. Direct labels are an editorial chart move. |
| **Currency styling** | Currency symbol is `text-muted-foreground` and slightly smaller than the number | Default treats `$24,380` as one uniform glyph string. Muting the `$` makes the number itself the headline. |
| **Section dividers** | 1px `--border` rules, no surface boundaries between widgets above the fold | Default wraps everything in `Card` chrome. Removing chrome where it's redundant feels intentional. |
| **Single brand accent** | `--primary` only for the pinned "Open POS" action and the live-dot pulse; nowhere else | Default uses brand color on every primary button, every focused state, every icon. Restraint reads as confidence. |

### Not Weird (boundaries — what we DON'T do, with explicit reasons)

| Tempting move | Why it's weird | What we do instead |
|---|---|---|
| Brutalist Helvetica-only with raw HTML feel | Wrong tonality for retail SaaS; the buyer is a small-business owner, not a Berlin designer | Editorial-but-finished — serif IS the distinctive move, executed cleanly |
| Bento grid (irregular box sizes for their own sake) | Trendy and overused; cells of arbitrary size add noise | Asymmetric ONLY where importance differs (hero KPI 2x; sales chart 12-col) |
| Custom cursors / interactive backgrounds / mouse-follow lighting | Belongs on portfolio sites, not at 8am | None. The dashboard does not move unless data changes |
| Page-enter stagger animations | New version of the spinner; everyone uses it | Instant render. Suspense reveals data without fanfare |
| Maximalist data viz (3D, dual-axis, treemap) | Hard to read; not used by ops at 8am | One-axis line, one direct label, one signal color |
| Glassmorphism / backdrop blur on cards | Already dated; bad in dark mode | Solid surfaces on `--card`, 1px `--border` rules |
| Custom non-system color (e.g., warm bone background everywhere) | Fights the existing dark/light theme system | Stay on semantic tokens; the "distinctive" is in type and rhythm, not color |
| Sentence-case AND lowercase EVERYTHING | "Cool" until a French label breaks | Title case for headings, sentence case for body — standard, predictable |

### Quantitative bar

- **Type scale ratio:** **1.20 (minor third)** — small, tight steps. Distinctive because most admin templates use 1.25 or 1.333 (chunky, bootstrappy). 1.20 feels editorial.
- **Density tier:** **balanced-leaning-compressed**. Card padding 24px (`p-6`), row height 40px in lists, gap between widgets 24px. The hero strip is the only generous zone (48px vertical padding).
- **Color contrast strategy:** **Two-tier neutral + single accent**. Surface uses 3 luminance steps only (`--background`, `--card`, `--muted`). Borders at 100% `--border` opacity, not 50%. Brand accent (`--primary`) appears no more than 3 times on the page.
- **Semantic colors:** Used ONLY for meaning, never decoration. `--destructive` = real alert. Green = positive delta in a number that's measuring something good. Amber = "needs attention soon." No accent color used because it's "the page felt empty."

---

## Layout

- **Grid:** 12 columns at `lg+`, 8 columns at `md`, 4 columns at `sm`. Gap `24px` (`gap-6`). Container `max-w-7xl` centered.
- **Page chrome:** Existing Navbar (kept from `dashboard/layout.tsx`) at the top. Status strip directly below page header (NOT inside Navbar — it's data, not chrome).
- **Section order (top → bottom):**
  1. Status strip (open drawers · active POS sessions · last sync · current branch)
  2. Page header (eyebrow date + serif "Good morning, {name}" sentence + pinned Open POS action)
  3. Hero today panel (8 col) + Alerts inbox (4 col)
  4. Sales pace 14d (12 col, full-bleed line chart)
  5. Recent activity (8 col) + More actions overflow (4 col)
- **Mobile strategy:** Single column. Status strip collapses to a dropdown chip ("3 system items"). Hero KPI takes full width, secondary KPIs become a horizontal scroll strip. Sales chart hides the 14th-day label and shows only the current value. Recent activity virtualized.

## Type Scale

Hoist the landing-page font variables from `.landing-root` onto `<html>` so the dashboard inherits them. **Do not import the fonts a second time.**

| Token | Family | Size / Weight | Use |
|---|---|---|---|
| `display-hero` | Instrument Serif | 48px / 400, italic optional | "Good morning, {name}" sentence; hero KPI number |
| `display-md` | Instrument Serif | 32px / 400 | Section headings on full-page subviews (drill-downs) |
| `eyebrow` | JetBrains Mono | 11px / 500, +0.22em tracking, uppercase | Above every section ("TODAY", "ALERTS", "PACE — 14 DAYS") |
| `h2` | IBM Plex Sans | 18px / 600 | Widget titles |
| `body` | IBM Plex Sans | 14px / 400 | All body text, labels, list rows |
| `body-sm` | IBM Plex Sans | 12px / 400 | Captions, meta, timestamps |
| `metric-hero` | JetBrains Mono | 48px / 600, tabular-nums | The hero today number |
| `metric` | JetBrains Mono | 24px / 500, tabular-nums | Secondary KPIs |
| `metric-inline` | JetBrains Mono | 14px / 500, tabular-nums | Numbers inside lists/feeds |

**French length tolerance:** budget +20% character width on every label. Test `/fr/dashboard`. If a label wraps in French, shorten the EN copy or move to a tooltip.

## Color Usage

ALL colors via semantic tokens. ZERO hex literals in `.tsx` files in the dashboard tree.

| Token | Use |
|---|---|
| `bg-background` | Page |
| `bg-card` | Widget surfaces (use sparingly — many widgets are chromeless above the fold) |
| `bg-muted` | Status strip, hover states |
| `border-border` | All 1px rules |
| `text-foreground` | Primary text |
| `text-muted-foreground` | Secondary text, currency symbols, timestamps, eyebrow when not accented |
| `text-primary` | Accent (used ≤3 times per page) |
| `text-destructive` / `bg-destructive` | Real alerts only |
| `--chart-1` through `--chart-5` | Chart series — already themed for dark+light |

Brand accent (`--primary`) appears: (1) the pinned "Open POS" button, (2) the eyebrow color on the hero today panel, (3) the live-dot in the status strip. Nowhere else.

**Chart palette rule:** Sales pace 14d uses `--chart-1` only (single series). Sparks use `--muted-foreground` at 60% opacity. We do not need a 5-color palette today.

## Density

Tier: **balanced-leaning-compressed.**

- Card padding: `p-6` (24px) for widgets with chrome; `py-8` (32px) for the hero today panel
- Row height in lists: `h-10` (40px) for activity feed and alerts; `h-12` (48px) for alerts that have an inline action
- Widget gap: `gap-6` (24px) everywhere
- Section gap (between major page bands): `gap-y-10` (40px)
- Page padding: `px-6 py-8` mobile, `px-8 py-10` desktop

## Motion

- **Page enter:** **None.** No stagger, no fade-in.
- **Skeleton → data crossfade:** 160ms `ease-out`. Skeleton matches eventual content shape.
- **Hover on interactive elements:** instant `bg-muted` change. No scale, no shadow change.
- **Press feedback:** standard shadcn `Button` `:active` (slight darken). Nothing custom.
- **Live data updates** (cash drawer count, low stock count, recent activity): the number ticks down and fades the new number in over 200ms. Pulse dot animation already exists in `landing.css` as `.live-dot` — extract to a dashboard-scoped utility class.

## Widgets

### W1 — Status strip

- **i18n keys:** `dashboard.status.openDrawers`, `dashboard.status.activeSessions`, `dashboard.status.lastSync`, `dashboard.status.branch`
- **Data source:** Combined query `actions/analytics/systemStatus` (NEW) → `useSystemStatus` hook with `refetchInterval: 30_000`
- **Loading:** thin mono-text placeholder (4 dashes per slot)
- **Empty:** never empty — the branch and last-sync always exist
- **Error:** show last-known values with an inline "stale" badge
- **Real-time:** poll 30s
- **Permissions:** all roles
- **Click:** none

### W2 — Page header

- **i18n keys:** `dashboard.header.greeting` (with `{name}` interpolation), `dashboard.header.yesterdayClose`, `dashboard.actions.openPos`
- **Data:** `actions/analytics/yesterdayClose` (NEW)
- **Loading:** skeleton sentence
- **Empty:** "Welcome to StockFlow." (first-day-of-business case)
- **Error:** still render the greeting, drop the close line
- **Real-time:** no
- **Permissions:** all roles; "Open POS" hidden for Accountant/Admin
- **Click:** Open POS button → `/dashboard/pos`

### W3 — Hero today panel

- **i18n keys:** `dashboard.today.revenueLabel`, `dashboard.today.transactionsLabel`, `dashboard.today.paceVsYesterday`, `dashboard.today.paceVsAverage`
- **Data source:** `actions/analytics/todaySnapshot` (NEW) → `useTodaySnapshot` hook
- **Loading:** skeleton shaped like the hero number + 3 secondary metric rows
- **Empty:** "No transactions yet today" + calm icon + sub-link "Open POS to record the first sale"
- **Error:** inline error state with retry; doesn't crash the page
- **Real-time:** poll 60s
- **Permissions:** Owner, Branch Manager. Cashier sees a "shift summary" variant (their own transactions only) — out of scope for v1.
- **Click:** drill to `/dashboard/sales` filtered to today

### W4 — Alerts inbox

- **i18n keys:** `dashboard.alerts.title`, `dashboard.alerts.empty`, `dashboard.alerts.lowStock` (plural-aware: "{count, plural, one {# item} other {# items}} below reorder point"), `dashboard.alerts.openDrawer`, `dashboard.alerts.poOverdue`, action labels `dashboard.alerts.actions.createPo`, `dashboard.alerts.actions.reconcile`, `dashboard.alerts.actions.followUp`
- **Data source:** Aggregator `actions/analytics/operationalAlerts` (NEW) combining `inventory.lowStockSummary`, `cashDrawer.openSessions`, `purchaseOrders.overdue`
- **Loading:** 3 row-shaped skeletons
- **Empty:** "Nothing needs your attention." with a small calm icon — NOT "No data."
- **Error:** inline retry per source (so one failing source doesn't break the others)
- **Real-time:** poll 60s
- **Permissions:** Owner, Branch Manager, Stock Manager
- **Click:** each alert row → drill to the relevant subview; inline action button → server action call with optimistic UI + `notify.formSuccess`/`formError`

### W5 — Sales pace, last 14 days

- **i18n keys:** `dashboard.pace.title`, `dashboard.pace.todayLabel`, `dashboard.pace.empty`
- **Data source:** `actions/analytics/salesPace14d` (NEW) → `useSalesPace14d` hook
- **Loading:** skeleton of the chart shape (a faint line shape, not a gray box)
- **Empty:** "Not enough history yet — come back after your first week." with a calm icon
- **Error:** inline retry
- **Real-time:** no — refresh on user action
- **Permissions:** Owner, Branch Manager, Accountant
- **Click:** drill to `/dashboard/analytics`

### W6 — Recent activity feed

- **i18n keys:** `dashboard.activity.title`, `dashboard.activity.empty`, plus verb keys per event type (`activity.posSaleCompleted`, `activity.drawerOpened`, `activity.drawerClosed`, `activity.poReceived`, `activity.stockTransferred`)
- **Data source:** `actions/analytics/recentActivity` (NEW) merging recent rows from POS sessions, cash drawer events, PO receipts, stock movements
- **Loading:** 6 line-shaped skeletons
- **Empty:** "No activity in the last 24 hours." with a calm icon
- **Error:** inline retry
- **Real-time:** no — manual refresh button in widget header
- **Permissions:** all roles (rows filtered by RBAC — Cashier only sees their own)
- **Click:** each row drills to the relevant detail page

### W7 — More actions

- **i18n keys:** `dashboard.actions.title`, plus per-action labels reusing existing keys where possible (`dashboard.quickActions.newOrder` already exists)
- **Data:** none — static link list, RBAC-gated server-side
- **Permissions:** per-action gating; never render-then-hide
- **Click:** each link to the relevant route

## i18n

- **Namespace:** `dashboard.*` (extends existing namespace)
- **New keys to add** in both `messages/en.json` and `messages/fr.json`:
  - `dashboard.header.greeting`, `dashboard.header.yesterdayClose`
  - `dashboard.status.*` (4 keys)
  - `dashboard.today.*` (4 keys + plural-aware transactions count)
  - `dashboard.alerts.*` (title, empty, lowStock plural, openDrawer, poOverdue) + `dashboard.alerts.actions.*` (3 keys)
  - `dashboard.pace.*` (3 keys)
  - `dashboard.activity.*` (title, empty + 5 verb keys)
  - `dashboard.actions.openPos`, `dashboard.actions.title`
  - `dashboard.empty.noPermission`, `dashboard.errors.loadFailed`, `dashboard.errors.retry`
- **Plural forms** use ICU MessageFormat — `next-intl` supports it natively. Example: `"{count, plural, one {# élément} other {# éléments}} sous le seuil"`.
- **French length:** verify every label fits with +20% characters. If "Sales pace — last 14 days" becomes "Rythme des ventes — 14 derniers jours" and breaks the chart header, shorten to "Rythme — 14 jours."

## Theme

- ALL colors via semantic Tailwind tokens. No hex literals in `.tsx`.
- Chart series use `hsl(var(--chart-1))` etc. via Recharts `stroke={...}` (read from a CSS variable through a small helper).
- The `.live-dot` keyframe animation is hoisted from `landing.css` into `globals.css` (no longer scoped to `.landing-root`).
- Skeletons use `bg-muted` with a subtle pulse — visible in both themes.
- Borders: `border-border` at full opacity. **Do not** use `border-border/50` or `border-muted/30`.
- One known asymmetry: Recharts gridlines should be `stroke-muted` in light and slightly higher contrast in dark. Use a tokenized helper.

## Accessibility

- Color contrast ≥ WCAG AA in both themes for every text/background pair. Verified with axe.
- Keyboard navigation order: status strip → page header (greeting / Open POS) → hero panel → alerts → chart → activity → more actions.
- Skip-to-content link in the layout (already exists? If not, add).
- Every icon-only button has an `aria-label` from the i18n catalog.
- Alerts widget is wrapped in `role="region" aria-live="polite"` so screen readers announce new alerts after a poll.
- Charts have a text alternative summary (`aria-label` with the current value + trend description).
- Focus rings: use the existing shadcn `focus-visible:ring-ring focus-visible:ring-offset-2` pattern. Visible in both themes.

## Performance Budget

- **First contentful paint:** ≤ 1.2s on mid-range mobile (target the page header + status strip server-rendered, no waiting on TanStack Query)
- **Per-widget query timeout:** 5s; on timeout, show inline error with retry
- **Suspense boundaries:** one per widget. A slow `salesPace14d` query never blocks the alerts inbox.
- **Bundle:** dashboard route ≤ 80KB JS gzipped (Recharts is the biggest dependency — lazy-load it inside the chart widget only)
- **Polling cost:** 3 polled widgets (status strip 30s, hero 60s, alerts 60s) = ~5 requests/minute. Acceptable.

---

## Review checklist before implementation

- [ ] User has read this contract
- [ ] Persona, promise, and "distinctive without being weird" decisions agreed
- [ ] Layout sketch approved
- [ ] Type scale + color usage agreed (especially: ZERO new hex literals)
- [ ] Widget list final — nothing to add, nothing to cut
- [ ] i18n keys list final — both `en.json` and `fr.json` will be updated atomically
- [ ] Performance budget agreed
