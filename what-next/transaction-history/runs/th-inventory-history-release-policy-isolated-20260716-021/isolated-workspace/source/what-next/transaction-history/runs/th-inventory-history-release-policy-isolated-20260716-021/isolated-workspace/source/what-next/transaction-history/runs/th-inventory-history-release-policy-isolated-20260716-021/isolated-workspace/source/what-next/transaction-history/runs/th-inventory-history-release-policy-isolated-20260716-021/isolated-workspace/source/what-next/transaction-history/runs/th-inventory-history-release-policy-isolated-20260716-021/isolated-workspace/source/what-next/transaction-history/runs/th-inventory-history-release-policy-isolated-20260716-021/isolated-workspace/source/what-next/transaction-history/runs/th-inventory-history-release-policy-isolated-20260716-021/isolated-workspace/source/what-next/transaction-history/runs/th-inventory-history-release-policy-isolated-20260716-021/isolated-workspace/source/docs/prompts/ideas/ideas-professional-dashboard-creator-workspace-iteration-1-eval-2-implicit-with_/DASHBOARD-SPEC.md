# Dashboard Design Contract — StockFlow Admin Home

## Primary Persona
The **Owner / Branch Manager**. They own the shop. They open StockFlow at 8am from a desktop, sometimes from a phone in the back office. Success means: in under five seconds they know (a) whether yesterday closed clean, (b) what needs them today, (c) whether anything is broken right now. They are in this screen 5-10 minutes per day; the rest of the time they're in POS, inventory, or finance.

Cashiers, accountants, stock managers, and admins all have entry points elsewhere. This page is not designed to serve all of them.

## Promise
> *See yesterday's close, today's heartbeat, and what needs you next — in one live command center built on the same metal as the rest of StockFlow.*

## Inspiration Synthesis (1 paragraph)
The redesign takes its visual stance from the landing page's "operations terminal" register — ink palette, three-voice typography (Instrument Serif display, IBM Plex Sans body, JetBrains Mono numerals), 1px hairline borders, signal colors used as signals only — and applies it at desk density instead of marketing density. Layout draws from Vercel's hero-as-one-unit and Bloomberg's ticker pattern (instead of four colored cards), from Are.na's intentionally inconsistent block heights (instead of a uniform 2×2 grid), from Datawrapper's inline-annotated charts (instead of legend-below-chart), and from Stripe's discipline of brand color as chrome only (instead of decoration inside every widget). The result should feel like the landing page's hero preview grew up to do real work.

## Layout

- **Grid:** Asymmetric on desktop (`lg:` and up): two-column structure with a 2/3 main column and 1/3 right rail. Inside the main column, sections stack with intentionally varied heights. Mobile collapses to a single column with progressive disclosure.
- **Page chrome:**
  - Existing dashboard `Navbar` and `Sidebar` (do not redesign — out of scope for this pass; rework only the page surface).
  - New page-local header strip: page title (`display` serif) on the left + locale switcher + manual refresh button + "as of HH:mm" timestamp on the right.
  - Live ticker bar directly below — 4-5 numbers, mono, hairline-separated.
- **Section order top-to-bottom:**
  1. Page header strip (title + chrome)
  2. Live ticker bar (4-5 mono numbers)
  3. Hero KPI strip (one wide unit, 4 cells, hairline-divided, with sparklines)
  4. Two-column: trend chart (2/3) + alerts/needs-action stack (1/3)
  5. Two-column: activity feed (2/3) + shortcuts strip (1/3)
  6. System health row (full width, slim)
- **Mobile strategy:**
  - Ticker bar becomes a single-row horizontal scroll (snap)
  - Hero KPI strip collapses to a 2×2 mini-grid (still using hairlines, no card backgrounds)
  - Right-rail items move below their paired main-column section
  - Activity feed truncates to 5 items with "see all" link
  - System health row reduces to a single status pill

## Type Scale

| Role | Family | Size | Weight | Notes |
|---|---|---|---|---|
| Page title (h1) | `--font-display` (Instrument Serif) | 32px desktop / 24px mobile | 400 | Mixed with body voice for the second clause, per landing hero pattern |
| Section eyebrow | `--font-mono` (JetBrains Mono) | 11px | 500 | `.eyebrow` utility, uppercase, 0.22em letter-spacing, `--accent-hi` color |
| Hero numeral | `--font-mono` (JetBrains Mono) | 36px desktop / 28px mobile | 600 | Tabular numerals required |
| Card title | `--font-body` (IBM Plex Sans) | 14px | 600 | |
| Body | `--font-body` (IBM Plex Sans) | 14px | 400 | |
| Metadata / timestamps | `--font-mono` (JetBrains Mono) | 12px | 400 | Tabular |
| Status pill text | `--font-mono` (JetBrains Mono) | 11px | 500 | Uppercase, 0.08em letter-spacing |

**French-length tolerance:** every label budgeted for +20%. Hero KPI labels must wrap to two lines without breaking the cell. Status pills use mono so width is predictable; if a French label exceeds the +20% budget, abbreviate at the i18n layer (e.g., `dashboard.kpi.todaySales.short`).

## Color Usage

| Token | Use |
|---|---|
| `--ink-1` | Page background |
| `--ink-2` | Card/surface ground |
| `--ink-3` | Elevated card (alerts zone, hover surface) |
| `--ink-4` | Hover/active state |
| `--rule-1` | Hairline borders, ticker dividers, hero KPI dividers |
| `--rule-2` | Card borders (heavier) |
| `--rule-3` | Active border / focus ring |
| `--text-hi` | Numerals + primary headings |
| `--text-mid` | Body copy, labels |
| `--text-lo` | Secondary metadata |
| `--text-faint` | Eyebrows, timestamps |
| `--accent` | Active nav, CTAs only |
| `--accent-hi` | Eyebrow color, hover for CTAs |
| `--editorial` | Hero numeral italic accent — used twice on the page max |
| `--signal-up` | Positive deltas, success status, "live" dots |
| `--signal-warn` | Approaching threshold, pending |
| `--signal-down` | Below threshold, error, overdue |
| `--signal-info` | Informational badges |

**Chart palette** (add as new tokens in `landing.css` and reference from a dashboard CSS file; not inline):
```
--chart-primary: var(--accent-hi);     /* today's line, hero metric */
--chart-secondary: var(--text-lo);     /* prior-period, baseline */
--chart-band: rgba(37, 99, 235, 0.10); /* typical-range band fill */
--chart-grid: var(--rule-1);           /* gridlines */
--chart-up: var(--signal-up);
--chart-down: var(--signal-down);
```

**Hard rule:** zero hex literals in `.tsx`/`.jsx` files. Every color through a token.

## Density

**Tier: balanced — leaning compressed inside the hero strip and ticker, generous between sections.**

- Page padding: `px-8 py-10` desktop, `px-4 py-6` mobile
- Section gap: `space-y-12` desktop, `space-y-8` mobile (intentionally generous between sections, kills "template" feel)
- Card padding: `p-5` standard, `p-6` for hero strip cells
- Hairline gap (inside hero strip cells, between mono number and label): `gap-y-1`
- List row height: `h-12` for alerts, `h-10` for activity feed
- Inter-widget gap (within a grid row): `gap-6`

## Motion

- **Page enter:** none. The page renders in its final layout. Skeletons → data crossfade at 150ms only. (Bloomberg/Stripe rule: data appearing means data is real.)
- **Live ticker:** numbers update with a 200ms vertical-slide tick (reuse `@keyframes landing-num-tick` from `landing.css`). Pulse the `.live-dot` continuously (already defined).
- **Skeleton → data:** crossfade, 150ms, ease-out.
- **Hover/press feedback:**
  - Cards: subtle border lift `--rule-1` → `--rule-2` + cursor-pointer (only if interactive)
  - List rows: surface lift `--ink-2` → `--ink-3`
  - Buttons: existing shadcn behavior
- **No stagger animations.** No fade-on-scroll. No bounce.

## Widgets

For each widget: ID, title i18n key, data source, loading state, empty state, error state, real-time policy, permissions, click behavior.

---

### W1 — `<TickerBar />`
- **Title (i18n):** none (chrome only)
- **Data source:** new aggregation in `actions/analytics/dashboard-ticker.ts` returning `{ totalSalesToday, transactionsToday, cashOnHandTotal, activeSessionsCount, lastUpdatedAt }`. New hook `useDashboardTicker()` in `hooks/dashboard/useDashboardTicker.ts` wrapping it with `refetchInterval: 30_000`.
- **Loading state:** four mono dashes (`— — — —`) in place of numbers; labels visible.
- **Empty state:** if all zeros (new install), show `dashboard.ticker.noActivity` ("Quiet morning — open a POS session to start the day").
- **Error state:** inline yellow `--signal-warn` pill: "ticker offline — last value HH:mm." Doesn't crash the page.
- **Real-time:** poll 30s.
- **Permissions:** Owner, Branch Manager, Admin. Hidden for Cashier (they shouldn't see other terminals' totals from here).
- **Click behavior:** clicking a ticker cell jumps to that domain (sales cell → `/dashboard/finance`, sessions cell → `/dashboard/pos`).

### W2 — `<HeroKpiStrip />` (the sample widget being built in this evaluation)
- **Title (i18n):** `dashboard.hero.title` ("Today")
- **Data source:** new `actions/analytics/dashboard-today.ts` → `getTodayKpis(orgId, locationId)`. Returns 4 KPIs: today's sales, today's transactions, today's average ticket, and net cash flow today. Each with 7-day rolling average and delta. Hook: `useDashboardToday()`.
- **Loading state:** four hero-numeral skeletons (96×40px each) with label skeletons (80×12px).
- **Empty state:** new-install copy + CTA "Open POS session" (`dashboard.hero.empty`).
- **Error state:** inline retry row replacing the strip, mono error code + retry button.
- **Real-time:** poll 60s (less critical than ticker; the chart of the day is the heartbeat).
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** entire strip click-through to `/dashboard/analytics`; individual cells go to their domain detail page.

### W3 — `<SalesTrendChart />`
- **Title (i18n):** `dashboard.trend.title` ("Last 14 days")
- **Data source:** new `actions/analytics/dashboard-trend.ts` → `getSalesTrend14d(orgId, locationId)`. Returns array of 14 days with `{date, sales, transactions}` + computed typical-range band `{p25, p75}`. Hook: `useDashboardTrend()`.
- **Loading state:** chart-shaped skeleton (rect with axis ticks).
- **Empty state:** "Not enough history yet — come back in a few days."
- **Error state:** inline retry.
- **Real-time:** not polled — invalidated by sales actions elsewhere.
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** chart click → `/dashboard/analytics` with the same range.

### W4 — `<AlertsStack />`
- **Title (i18n):** `dashboard.alerts.title` ("Needs you")
- **Data source:** new composite action `actions/analytics/dashboard-alerts.ts` → `getDashboardAlerts(orgId, locationId)`. Internally queries: low-stock items (existing `actions/inventory/`), pending POs (existing `actions/purchaseOrderWorkflow/`), open POS sessions from prior day (existing `actions/pos-session-actions.ts`), cash drawer variances. Returns a unified `Alert[]` sorted by urgency. Hook: `useDashboardAlerts()` with `refetchInterval: 60_000` for stock-related entries.
- **Loading state:** three row-shaped skeletons.
- **Empty state:** quiet confirmation "All clear. Nothing needs you right now." with a `--signal-up` check icon.
- **Error state:** inline retry per alert category; partial success still shows what succeeded.
- **Real-time:** poll 60s for stock subset only; others invalidate on user action.
- **Permissions:** Owner, Branch Manager, Admin (Admin sees system alerts too).
- **Click behavior:** each row click-through to its source (low-stock → item page; PO → PO detail; session → close-session sheet).

### W5 — `<ActivityFeed />`
- **Title (i18n):** `dashboard.activity.title` ("Today's activity")
- **Data source:** new `actions/analytics/dashboard-activity.ts` → `getRecentActivity(orgId, locationId, limit=10)`. Pulls from POS transactions, PO state changes, stock receipts, user audit log. Hook: `useDashboardActivity()`.
- **Loading state:** 5 row skeletons.
- **Empty state:** "Quiet so far — activity will appear as it happens."
- **Error state:** inline retry.
- **Real-time:** not polled. Invalidated by mutation hooks.
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** row click → source object detail.

### W6 — `<QuickShortcuts />`
- **Title (i18n):** `dashboard.shortcuts.title` ("Jump to")
- **Data source:** no fetch — derived from server-side role check. The list of shortcut buttons varies by role.
- **Loading state:** N/A (rendered server-side from session).
- **Empty state:** N/A.
- **Error state:** N/A.
- **Real-time:** N/A.
- **Permissions:** all dashboard-eligible roles.
- **Click behavior:** direct route to the target page.

### W7 — `<SystemHealthRow />`
- **Title (i18n):** `dashboard.health.title` ("System")
- **Data source:** new `actions/analytics/dashboard-health.ts` → `getSystemHealth()`. Returns sync status, last data refresh, terminal connectivity count. Hook: `useDashboardHealth()` with `refetchInterval: 60_000`.
- **Loading state:** muted dashes.
- **Empty state:** N/A (always returns).
- **Error state:** itself becomes an alert ("system status unknown").
- **Real-time:** poll 60s.
- **Permissions:** Admin sees everything; Owner sees their org only.
- **Click behavior:** none (informational).

## i18n

- **Namespace:** `dashboard.*` already exists in `messages/en.json` and `messages/fr.json`. New keys go under:
  - `dashboard.ticker.{salesLabel, transactionsLabel, cashLabel, sessionsLabel, asOf, noActivity, offline}`
  - `dashboard.hero.{title, eyebrow, todayLabel, avgLabel, deltaUp, deltaDown, empty}`
  - `dashboard.trend.{title, todayLine, typicalBand, days}`
  - `dashboard.alerts.{title, empty, lowStock, pendingPO, openSession, drawerVariance, urgent}`
  - `dashboard.activity.{title, empty, types.{sale, poReceived, customerAdded, deposit, permission}}`
  - `dashboard.shortcuts.{title, openSession, approvePOs, reorder, recordDeposit, viewReport}`
  - `dashboard.health.{title, syncOk, syncStale, terminalsOnline, lastRefresh}`
  - `dashboard.errors.{loadFailed, retry}`
- **French length check:** all new keys reviewed against the +20% rule. `dashboard.hero.todayLabel` ("Today" / "Aujourd'hui") fits. `dashboard.alerts.drawerVariance` ("Drawer variance" / "Écart de caisse") fits.

## Theme

- All tokens through CSS variables. No hex literals in component files (skill quality gate).
- The dashboard route group needs a `.dashboard-root` wrapper class — either added to `app/[locale]/(dashboard)/layout.tsx` or to the page itself — that imports the same font variables as `.landing-root` and re-applies the ink palette + utility classes. Implementation note: the cleanest move is to factor the shared tokens out of `landing.css` into a `styles/tokens.css` and import it from both layouts. (Out of scope for this skill pass — for now we'd extend `landing.css` to also target `.dashboard-root` via a comma selector, and import it from the dashboard layout.)
- **Light theme:** all `--ink-*` and `--rule-*` need light-mode counterparts. Current `landing.css` only defines dark values. We must add `[data-theme='light'] .dashboard-root` overrides (or use the existing shadcn HSL system for the dashboard surface and only inherit the *typography* + *signal* tokens from landing). **Open question for the human reviewer:** does the dashboard stay dark-only like landing, or honor `next-themes`? IA-NOTES assumes the latter; this spec defers to a follow-up decision.

## Accessibility

- Color contrast verified for both themes at WCAG AA (4.5:1 for text, 3:1 for UI). The current `--text-lo` on `--ink-2` is ~6.5:1 — passes.
- Keyboard navigation order: header → ticker (skippable via `aria-hidden` if non-interactive) → hero strip cells → trend chart → alerts → activity → shortcuts → health row.
- Skip-to-content link added to the dashboard layout.
- Every icon-only button has an `aria-label` from the i18n catalog.
- Live regions: the ticker bar wraps numbers in `aria-live="polite"` with `aria-atomic="false"` so screen readers announce updates without re-reading the whole strip.
- Reduced motion: respect `prefers-reduced-motion` — `.live-dot`, `.landing-num-tick`, ticker tick all become no-ops.
- Focus rings: existing shadcn `ring-2 ring-offset-2 ring-[var(--accent-hi)]`.

## Performance Budget

- First contentful paint target: ≤ 1.2s on Fast 3G (the page can paint without any widget data — every widget skeletons in parallel).
- Per-widget query timeout: 5s, then degrades to error state with inline retry.
- Suspense boundaries: one per widget. The ticker, hero, trend, alerts, activity, health each get their own boundary so a slow query for one does not block the rest.
- Parallel fetch: all initial server-side fetches fire in parallel via the page's `Promise.all`-style composition or React 19 `use()` pattern. No waterfall.
- Bundle: re-use Recharts (already in the project for `DashboardOverview.tsx`); no new chart library.
- Polling cost: ticker (30s) + hero (60s) + alerts subset (60s) + health (60s) = 4 background pollers; acceptable for the operator persona.
