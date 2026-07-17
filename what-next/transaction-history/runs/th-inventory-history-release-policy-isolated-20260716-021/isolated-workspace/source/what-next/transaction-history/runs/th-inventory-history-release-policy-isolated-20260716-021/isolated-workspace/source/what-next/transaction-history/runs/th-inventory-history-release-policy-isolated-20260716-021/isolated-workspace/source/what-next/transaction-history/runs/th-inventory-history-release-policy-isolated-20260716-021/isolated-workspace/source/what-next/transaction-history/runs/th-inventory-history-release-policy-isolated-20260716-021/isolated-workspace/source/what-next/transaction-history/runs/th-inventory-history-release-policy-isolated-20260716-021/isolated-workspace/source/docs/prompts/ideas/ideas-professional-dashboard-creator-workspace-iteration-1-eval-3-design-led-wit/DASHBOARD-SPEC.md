# Dashboard Design Contract — Stats Page

## Primary Persona

Owner / General Manager of a small-to-mid retail business running StockFlow. Opens this page on Monday morning or after closing on Sunday, on a 13–15" laptop, with one cup of coffee, asking *"how are we doing?"* Success means leaving the page with 3 concrete answers and 1 decision they want to act on this week. Branch Managers see the same page scoped to their branch.

## Promise

"See **revenue, margin, and basket volume** for any range — with the trend, the pulse, and the anomalies — in one calm, editorial command screen."

## Inspiration Synthesis

The visual stance is **financial-newspaper-meets-operations-terminal**. Type-led, restrained, narrative-aware. Linear and Vercel set the 1px hairline discipline and bento header rhythm. Stripe contributes sparkline-inside-KPI tiles. Rauno and The Pudding contribute the editorial italic takeaway under each chart title — the page reads like it was written, not just rendered. Datawrapper sets the desaturated chart palette. Arc contributes a single polarizing move: a faint accent-tinted page canvas so neutral chart panels visibly float. Continuity with the landing page is preserved by reusing Instrument Serif (display), IBM Plex Sans (body), and JetBrains Mono (data) — the same three voices that carry the marketing site.

## Layout

- **Grid:** 12-column at desktop (>=1024px), `gap-6` (24px). Mobile (<768px) stacks single-column with `gap-4`.
- **Page chrome:** existing dashboard sidebar (collapsed by default on this route so the chart has room) + topbar (locale switcher + theme toggle + user menu). No new sidebar.
- **Section order top-to-bottom:**
  1. Page header — title (`<h1>` Instrument Serif) + italic deck + right-aligned range selector (24h / 7d / 30d / 90d / YTD) + actions menu (Export PDF, Compare Branches, Open Finance, Schedule Email)
  2. Hero KPI strip — 3 tiles, equal width, each with sparkline + delta vs. prior period
  3. Revenue trend chart — full width, with italic takeaway caption under title
  4. Two-up row — Hour×Day heatmap (7 columns) + Top 5 items (5 columns)
  5. Watchlist — 3–5 anomaly rows
  6. Category mix — small stacked horizontal bar, secondary visual weight
- **Mobile strategy:** Hero strip stacks 1-col. Range selector collapses to a sheet. Hour×Day heatmap collapses behind a `<details>` ("View hourly pattern") because it's desk-class. Watchlist + top items stack. Footer note: "For full analytics, open StockFlow on desktop."

## Type Scale

| Role | Font | Size / weight | Tracking |
|---|---|---|---|
| Page title (`h1`) | Instrument Serif | `text-4xl` (36px), 400 | -0.02em |
| Italic deck word | Instrument Serif italic | inherits, 400 | -0.02em |
| Section title (`h2`) | IBM Plex Sans | `text-lg` (18px), 600 | -0.01em |
| Italic takeaway | Instrument Serif italic | `text-sm` (14px), 400 | -0.01em, color `text-muted-foreground` |
| Body / label | IBM Plex Sans | `text-sm` (14px), 400 | normal |
| Micro label / eyebrow | IBM Plex Sans uppercase | `text-xs` (12px), 500 | 0.14em |
| KPI numeral | JetBrains Mono tabular | `text-5xl` (48px), 500 | -0.02em |
| Table numeral | JetBrains Mono tabular | `text-sm` (14px), 500 | -0.01em |
| Sparkline label | JetBrains Mono | `text-[10px]`, 500 | normal |

**French length tolerance:** every label tested at +20% character count. KPI labels capped at 24 characters; longer labels stack to two lines without breaking layout (`min-h` on label area reserves the second line slot).

## Color Usage

Using existing global shadcn HSL tokens. **No hex literals in `.tsx`.**

- **Backgrounds:** page canvas = `bg-background` with a 4% accent wash overlay (`bg-[hsl(var(--primary)/0.04)]` — the Arc move). Card surface = `bg-card`. Card surface elevated (hero tiles) = `bg-card` with `ring-1 ring-border`.
- **Borders:** `border-border` everywhere. 1px, never thicker. No shadows on cards (Linear discipline).
- **Text:** primary = `text-foreground`. Secondary = `text-muted-foreground`. Muted/metadata = `text-muted-foreground/70`.
- **Brand accent:** `text-primary` reserved for: (a) the italic editorial word in the page title, (b) the moving-average line on the revenue chart, (c) the active range selector tab. Used three times on the page — that's the budget.
- **Editorial accent (NEW token):** `--accent-editorial` (a warm bone tone, HSL form added to `globals.css`) used ONCE on the page — on the italic word in the title. Borrowed from the landing page's `--editorial`.
- **Semantic:**
  - Positive delta = `text-[hsl(var(--signal-up))]` (NEW token, sage green, desaturated)
  - Negative delta = `text-destructive` (existing)
  - Warning (watchlist amber) = `text-[hsl(var(--signal-warn))]` (NEW token, muted amber)
  - Info/neutral = `text-muted-foreground`
- **Chart palette:** uses existing `--chart-1..5`. Verified in both themes:
  - Revenue line: `--chart-1`
  - Moving average: `--primary` (brand blue)
  - Prior-period band: `--chart-1` at 12% opacity
  - Heatmap scale: 5 steps interpolated from `--muted` to `--primary`
  - Top-items bars: `--chart-1` (single color — these are the same metric, ranked)
  - Category mix stacked: `--chart-1..5`
- Chart gridlines: `stroke="hsl(var(--border))"` so they flip with theme.

## Density

- **Tier:** balanced, with intentional density contrast — hero strip is *generous* (large numerals, lots of whitespace), tables and watchlist are *compressed* (32px row height, 12–14px labels). The contrast directs the eye.
- Card padding: `p-6` (24px) standard. Hero tiles: `p-8` (32px).
- Gap between widgets: `gap-6` (24px) desktop, `gap-4` (16px) mobile.
- Hero KPI strip uses an internal 4-row grid: eyebrow / numeral / sparkline / delta — totals ~180px tall.

## Motion

- **Page enter:** 60ms staggered fade-up on each section. `framer-motion` with `initial={{ opacity: 0, y: 8 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.24, delay: i * 0.06 }}`.
- **Skeleton → data:** 200ms crossfade. Skeletons match the eventual shape (sparkline = a 32px tall pill, KPI numeral = a 48px tall pill).
- **Number ticks (when range changes):** subtle slot-tick — number translates up 4px and fades, new number translates in from below. 180ms total.
- **Hover/press:** rings, not shadows. KPI tiles: `hover:ring-1 hover:ring-border-strong` (a second tier of border, NEW token, deeper than `--border`). Chart hover: tooltip with 1px hairline, no shadow.
- **No bouncing.** No springs. We're not Arc. (We just borrowed the canvas tint.)

## Widgets

### W1 — Page header

- **ID:** `stats-header`
- **i18n keys:** `dashboard.stats.title`, `dashboard.stats.deck`, `dashboard.stats.range.{24h,7d,30d,90d,ytd}`, `dashboard.stats.actions.{export,compare,finance,schedule}`
- **Data source:** none (UI state only — range selector pushes to URL `?range=7d&from=…&to=…`)
- **Loading state:** N/A (renders immediately)
- **Empty state:** N/A
- **Error state:** N/A
- **Real-time:** no
- **Permissions:** visible to all roles that reach the page
- **Click behavior:** range tabs update URL; actions dropdown opens menu

### W2 — Hero KPI Strip (3 tiles)

- **ID:** `stats-hero-kpis`
- **i18n keys:** `dashboard.stats.kpi.revenue.{label,tooltip}`, `dashboard.stats.kpi.margin.{label,tooltip}`, `dashboard.stats.kpi.transactions.{label,tooltip,aovLabel}`, `dashboard.stats.kpi.delta.{up,down,neutral}`, `dashboard.stats.kpi.comparison`
- **Data source:** new server action `actions/analytics/getStatsHeroKpis.ts` — accepts `{ from, to, locationId? }`, returns `{ revenue, revenueDelta, margin, marginDelta, transactions, transactionsDelta, aov, aovDelta, sparklineRevenue: number[] }`. Hook: new `hooks/useStatsHeroKpis.ts`.
- **Loading state:** three tiles with skeleton numerals + sparkline pill placeholders
- **Empty state:** zeros with "No comparable period yet — come back after your first week of sales." in muted text
- **Error state:** inline tile error with retry button, other tiles still render
- **Real-time:** no, range-driven
- **Permissions:** all stats-page roles see all three tiles
- **Click behavior:** tile click → drill into `/dashboard/finance` filtered to that metric

### W3 — Revenue Trend Chart

- **ID:** `stats-revenue-trend`
- **i18n keys:** `dashboard.stats.trend.{title,takeawayUp,takeawayDown,takeawayFlat,takeawayWeekendDriven,axisRevenue,axisDate,seriesDaily,seriesMA7,seriesPrior}`
- **Data source:** new server action `actions/analytics/getSalesTrendSeries.ts` — accepts `{ from, to, locationId? }`, returns `{ daily: Array<{date, revenue}>, ma7: Array<{date, value}>, priorPeriod: Array<{date, revenue}>, summary: { deltaPct, weekendShare } }`. Hook: new `hooks/useSalesTrendSeries.ts`.
- **Loading state:** chart-shaped skeleton (200px tall, gridline placeholders)
- **Empty state:** flat hairline with centered illustration + CTA "Open the POS to ring your first sale"
- **Error state:** inline retry button replacing chart
- **Real-time:** no
- **Permissions:** all stats-page roles
- **Click behavior:** brushing a date range pushes to URL `?from=…&to=…`

### W4 — Hour×Day Heatmap

- **ID:** `stats-hour-day-heatmap`
- **i18n keys:** `dashboard.stats.heatmap.{title,deck,hourLabel,dayLabel,tooltipFormat,empty,legendLow,legendHigh}`
- **Data source:** extend `actions/analytics/getSalesTrendSeries.ts` to also return `hourDayMatrix: Array<{day, hour, revenue}>` — or split into `actions/analytics/getHourDayMatrix.ts` if the cost is too high. Default: split.
- **Loading state:** 7×24 grid of pulsing muted cells
- **Empty state:** muted grid + "Not enough data yet to see your hourly pattern."
- **Error state:** inline retry
- **Real-time:** no
- **Permissions:** Owner, Branch Manager, Stock Manager
- **Click behavior:** click a cell → drill into `/dashboard/sales?date=…&hour=…`

### W5 — Top 5 Items

- **ID:** `stats-top-items`
- **i18n keys:** `dashboard.stats.topItems.{title,deck,columnItem,columnRevenue,columnQty,columnDelta,empty,viewAll}`
- **Data source:** reuse `topSellingItems` from existing `FinancialSummaryReport` — new hook `hooks/useTopSellingItems.ts` (range-aware wrapper).
- **Loading state:** 5 skeleton rows
- **Empty state:** "No sales in this range. Try a longer window or open the POS."
- **Error state:** inline retry
- **Real-time:** no
- **Permissions:** all stats-page roles
- **Click behavior:** row click → `/dashboard/items/[id]`

### W6 — Watchlist (anomalies)

- **ID:** `stats-watchlist`
- **i18n keys:** `dashboard.stats.watchlist.{title,deck,empty,itemVelocityDropped,categoryMarginCompressed,bestDay,investigateCTA}`
- **Data source:** new server action `actions/analytics/getStatsAnomalies.ts` — runs the rule-based detector server-side, returns `Array<{ type, severity, message, href }>`.
- **Loading state:** 3 skeleton rows
- **Empty state:** "Nothing to investigate this period. The boring weeks are the best weeks."
- **Error state:** inline retry; failure of this widget is non-fatal
- **Real-time:** no
- **Permissions:** Owner, Branch Manager (others hidden)
- **Click behavior:** row → context-appropriate drill (item page, category page, day page)

### W7 — Category Mix

- **ID:** `stats-category-mix`
- **i18n keys:** `dashboard.stats.categoryMix.{title,deck,empty,viewAll}`
- **Data source:** new server action `actions/analytics/getCategoryRevenueMix.ts`, hook `hooks/useCategoryRevenueMix.ts`.
- **Loading state:** stacked bar skeleton
- **Empty state:** "Tag your sales with categories to see your mix."
- **Error state:** inline retry
- **Real-time:** no
- **Permissions:** Owner, Branch Manager
- **Click behavior:** segment click → `/dashboard/items?category=…`

## i18n

- **Namespace:** `dashboard.stats` (new sibling under existing `dashboard.*`)
- **New keys to add** (both `en.json` and `fr.json`): see complete key list in each widget above. Total estimated: ~55 keys.
- French translations reviewed for length (+20% budget enforced).

## Theme

- All tokens listed in **Color Usage** above. **No hex literals anywhere in components.**
- New tokens added to `app/[locale]/globals.css` (both `:root` and `.dark` blocks):
  - `--accent-editorial: 36 39% 68%;` (light) / `36 35% 60%;` (dark) — the bone tone
  - `--signal-up: 158 64% 38%;` (light) / `158 50% 50%;` (dark)
  - `--signal-warn: 38 92% 50%;` (light) / `38 85% 58%;` (dark)
  - `--border-strong: 220 13% 75%;` (light) / `220 13% 32%;` (dark) — for hover rings
- Chart gridlines: `stroke="hsl(var(--border))"` — flips with theme automatically.
- Heatmap color scale: `interpolate('hsl(var(--muted))', 'hsl(var(--primary))')` evaluated in 5 steps — both themes verified.
- Skeleton fill: `bg-muted` with the existing `animate-pulse` (visible in both themes).

## Accessibility

- Color contrast verified WCAG AA for both themes (4.5:1 body, 3:1 large/numeric).
- Keyboard navigation: range tabs are a `role="tablist"` with arrow-key navigation; KPI tiles are focusable buttons (drill-down); watchlist rows are buttons; chart hover tooltips have keyboard-accessible focus equivalents (focus a data point with Tab).
- Skip-to-content link in the dashboard layout (verify it exists; if not, add).
- `aria-label` for icon-only buttons (range selector chevrons, action menu trigger, refresh).
- `aria-live="polite"` region for the italic auto-takeaway under the trend chart, so screen readers hear the summary update when the range changes.
- All charts have a `<title>` and a hidden `<desc>` summarizing the trend ("Daily revenue from May 19 to May 26. Up 14% vs. prior 7 days. Highest day Saturday.").

## Performance Budget

- First contentful paint target: < 1.0s on a warm cache, < 2.0s cold.
- Per-widget query timeout: 5s server-side; hook surfaces error state at 6s client-side.
- Each widget wrapped in its own `<Suspense>` boundary so a slow heatmap query does not block the hero KPIs.
- Queries fire in parallel (RSC + `Promise.all` in the action layer where multiple aggregations share input).
- Charts use `<dynamic>` import for Recharts components (lazy boundary) so the initial JS payload stays lean.
- Watchlist is the lowest priority — wrapped in its own Suspense with a longer-running tolerance (8s).

---

## Out of scope for v1

- Branch-comparison view (the action exists but the UI is a separate page)
- Scheduled-email job (action exists, the toggle UI lands in a v1.1)
- PDF export styling (we ship the basic action wiring; the templated PDF design is a separate ticket)
- WebSocket real-time updates (the operator dashboard handles real-time; the stats page is range-driven and explicitly *not* live)
