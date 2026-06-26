# Branch Manager Control Center — Design Contract

## Primary Persona
**Branch Manager.** Owns one physical branch (one `Location`). Opens the dashboard at 8am before the doors open. Success = (a) walks onto the floor knowing yesterday closed clean and today's drawers are safely open, (b) sees if today's pace is making target, (c) clears the action queue (approvals, restock) before opening.

## Promise
> See open cash drawers, today's sales vs target, low stock at risk of stockout, and purchase orders waiting on you — in one live control room scoped to your branch.

## Inspiration Synthesis
Linear's triage, Datadog's "incidents strip that shrinks when empty," Bloomberg's per-region last-refreshed caption, Stripe's hero-numeral-vs-target treatment, and a trader-journal hard-border honesty on the cash-drawer strip. Top-down by urgency; semantic color only; quiet when nothing is wrong. The landing page's brand vocabulary (Instrument Serif for the one hero numeral, IBM Plex Sans for body, JetBrains Mono for live data, the `--ink-*` and `--signal-*` token families) carries continuity without aping the marketing surface.

## Layout
- **Grid:** 12-column at `lg+`, asymmetric 2/3 + 1/3 split for the main row. Bento-style on `xl+` where the trend strip can run inline.
- **Page chrome:** existing dashboard topbar + sidebar. No bespoke chrome.
- **Section order top-to-bottom:**
  1. Hero strip — branch name + today's date + locale-aware greeting (text-mid weight, not large)
  2. Hero KPI row — Today's Sales vs Target (the only display-serif numeral on the page)
  3. **Live operations strip** — Cash drawers status (the one operational widget always at-a-glance)
  4. **Action zone (collapses when empty)** — Pending approvals + Low stock alerts, side-by-side at lg+, stacked below
  5. **14-day revenue trend** — line chart, target overlay
  6. **Recent activity feed** — last 10 POS opens/closes + inventory adjustments, single column
- **Mobile strategy:** Sections stack. Live ops strip collapses to a single pill that opens a sheet. Trend chart hidden below `sm`. Action zone widgets become tabs.

## Type Scale
| Role | Token | Size / weight | Voice |
|---|---|---|---|
| Hero numeral (today's sales) | `--font-display` Instrument Serif | 56px / 400 | Editorial confidence — appears ONCE |
| Section header | `--font-body` IBM Plex Sans | 14px / 600 small-caps + 1px rule under | rauno.me-style publication feel |
| Card title | `--font-body` | 13px / 500 | quiet |
| Body | `--font-body` | 13px / 400 | dense content |
| Metric (medium) | `--font-mono` JetBrains Mono | 22px / 500 tabular | live-data voice |
| Caption / last-refreshed | `--font-body` | 11px / 400 `--text-faint` | timestamp + meta |

**French-length tolerance:** every label budgeted at +20% length. Test at `/fr/dashboard`. Where space is tight (cash-drawer pill), use icon + tooltip rather than truncating.

## Color Usage
All from the landing token set, lifted into `app/[locale]/globals.css` so the dashboard reaches them without `.landing-root` scoping.

- **Background / surface / elevated / hovered:** `--ink-1 / --ink-2 / --ink-3 / --ink-4` (dark theme); equivalent paper tokens (`--paper-0 / --paper-1`) in light
- **Borders:** `--rule-1` default, `--rule-2` for elevated, `--rule-3` for active/focused. **No soft borders.** 1px sharp throughout.
- **Text:** `--text-hi / --text-mid / --text-lo / --text-faint / --text-dim` per hierarchy
- **Brand:** `--accent` electric blue — sparingly. Active nav, primary buttons, hero KPI accent.
- **Semantic (signals only):**
  - `--signal-up` for healthy / on-pace / closed-clean
  - `--signal-warn` for "needs attention soon" (low stock, behind pace by <10%)
  - `--signal-down` for "needs attention now" (stockout imminent, drawer over variance threshold, approval >24h old)
  - `--signal-info` for live polling indicators
- **Editorial:** `--editorial` warm bone — appears once, italicizing the word "today" next to the hero numeral
- **Chart palette:** sequential ramp from `--accent` to `--accent-hi` plus `--text-faint` for the target overlay. Distinguishable in both themes.

## Density
- **Tier:** Balanced overall, compressed in the cash-drawer strip and activity feed.
- **Card padding:** 16px (`p-4`)
- **Row height (tables):** 36px
- **Gap between widgets:** 16px (`gap-4`)
- **Gap inside cards:** 12px (`gap-3`)

## Motion
- **Page enter:** none (operators don't need a stagger every morning)
- **Skeleton → data:** 180ms crossfade
- **Live-poll indicator:** 2s pulse on a 4px dot (signal-info), pauses on tab blur
- **Hover/press:** background lift to `--ink-4` only; no transforms, no shadows
- **Number ticker:** disabled (this isn't a marketing surface; numbers settle on first paint and stay)

## Widgets

### W1 — Cash Drawers Strip
- **Title (i18n):** `dashboard.cashDrawers.title` — "Cash drawers" / "Tiroirs-caisse"
- **Data source:** NEW `actions/analytics/getBranchOpenDrawers.ts` → NEW `hooks/dashboard/useBranchOpenDrawers.ts`
- **Loading:** skeleton row per terminal (drawer count from server-rendered shell), shaped like the eventual pill
- **Empty:** "No terminals configured for this branch" with link to terminal settings (only shown to users with permission)
- **Error:** inline retry button with the failure reason in a tooltip; Sentry breadcrumb
- **Real-time:** poll every 30s (per override skill)
- **Permissions:** `pos.read`
- **Click behavior:** drawer pill → opens a Sheet with that drawer's transactions for today

### W2 — Today's Sales vs Target (hero KPI)
- **Title:** `dashboard.todaySales.title` — "Today" / "Aujourd'hui"
- **Data source:** NEW `actions/analytics/getBranchTodaySales.ts` → NEW `hooks/dashboard/useBranchTodaySales.ts`
- **Loading:** skeleton showing the eventual numeral shape (56px tall block) + caption blocks
- **Empty:** "No sales yet today" — quiet, no CTA (the cashiers will fix this themselves)
- **Error:** inline retry; never blocks the rest of the page
- **Real-time:** no polling — invalidate via TanStack Query when a POS session closes (existing mutation already revalidates `revalidatePath("/pos")`; add `/dashboard` to the revalidation set)
- **Permissions:** `pos.read`
- **Click behavior:** → `/dashboard/sales` for the day's detail

### W3 — Low Stock Alerts
- **Title:** `dashboard.lowStock.title` — "Low stock" / "Stock bas"
- **Data source:** EXISTING `actions/inventory/inventoryAlerts.ts::getInventoryAlerts` → NEW thin TanStack wrapper `hooks/dashboard/useBranchLowStock.ts`
- **Loading:** skeleton table with 5 rows
- **Empty:** "Nothing below reorder point" with `--signal-up` checkmark (rewarding the quiet state, per Datadog inspiration)
- **Error:** inline retry
- **Real-time:** poll every 60s
- **Permissions:** `inventory.read`
- **Click behavior:** row → `/dashboard/items/[id]`; section header → `/dashboard/inventory?filter=low-stock`

### W4 — Pending Purchase Approvals
- **Title:** `dashboard.pendingApprovals.title` — "Awaiting your approval" / "En attente de votre approbation"
- **Data source:** EXISTING `actions/purchaseOrderWorkflow/purchase-order.actions.ts::getPurchaseOrdersRequiringAttention` (org-scoped today; needs branch filter — see IA notes) → NEW `hooks/dashboard/useBranchPendingApprovals.ts`
- **Inline approve action:** EXISTING `hooks/purchaseOrderWorkflowHooks/usePurchaseOrderWorkflow.ts::executeAction("approve")`
- **Loading:** skeleton row per PO
- **Empty:** "No purchase orders waiting on you" — `--signal-up` checkmark; this is a good 8am.
- **Error:** inline retry
- **Real-time:** no polling; refetch on approve mutation success
- **Permissions:** `purchase-order.approve`
- **Click behavior:** row → `/dashboard/purchase-orders/[id]`; inline "Approve" button triggers the workflow's confirmation flow

### W5 — 14-day Revenue Trend
- **Title:** `dashboard.trends.title` — "Last 14 days" / "14 derniers jours"
- **Data source:** NEW `actions/analytics/getBranchRevenueTrend.ts` ({ locationId, days: 14 }) → NEW `hooks/dashboard/useBranchRevenueTrend.ts`
- **Loading:** skeleton line at ~30% opacity
- **Empty:** "Not enough sales history yet" — calm, no CTA
- **Real-time:** none; cache 5 minutes
- **Permissions:** `pos.read`

### W6 — Recent Activity Feed
- **Title:** `dashboard.activity.title` — "Recent activity" / "Activité récente"
- **Data source:** NEW `actions/analytics/getBranchRecentActivity.ts` unioning recent POS sessions + inventory adjustments → NEW hook
- **Loading:** 5 row skeletons
- **Empty:** "Nothing to show yet"
- **Real-time:** refetch on focus
- **Permissions:** `pos.read OR inventory.read`

## i18n
- **Namespace:** `dashboard` (top-level in `messages/en.json` and `messages/fr.json`)
- **New keys to add (all listed; add to both locales before any component uses them):**
```
dashboard.title
dashboard.subtitle
dashboard.greeting.{morning|afternoon|evening}
dashboard.todaySales.title
dashboard.todaySales.target
dashboard.todaySales.paceLabel
dashboard.todaySales.vsLastWeek
dashboard.cashDrawers.title
dashboard.cashDrawers.open
dashboard.cashDrawers.closed
dashboard.cashDrawers.variance
dashboard.cashDrawers.empty
dashboard.lowStock.title
dashboard.lowStock.belowReorder
dashboard.lowStock.empty
dashboard.lowStock.viewAll
dashboard.pendingApprovals.title
dashboard.pendingApprovals.approve
dashboard.pendingApprovals.decline
dashboard.pendingApprovals.empty
dashboard.trends.title
dashboard.activity.title
dashboard.empty.noData
dashboard.empty.noPermission
dashboard.errors.loadFailed
dashboard.errors.retry
dashboard.lastRefreshed
dashboard.live
```
Plural rules used where appropriate (`{count, plural, one {# item} other {# items}}`).

## Theme
- All values from semantic tokens (lifted from landing.css into global token layer). Zero hex literals in `.tsx` files.
- Dark-vs-light differences: chart gridlines use `--rule-1` (visible in both); the pulsing live-dot uses `--signal-info` directly (works in both); the editorial bone accent is theme-flipped in the global token file.

## Accessibility
- Color contrast ≥ WCAG AA in both themes (verify with Lighthouse)
- Keyboard tab order: greeting → hero KPI → cash drawers strip (first focusable pill) → action zone (first row) → trend → activity feed → footer
- Skip-to-content link
- Icon-only buttons get `aria-label` (refresh, dismiss, approve)
- Live regions: `aria-live="polite"` on the cash-drawers strip (announces drawer state changes); off everywhere else
- Pulsing live-dot has `prefers-reduced-motion: reduce` fallback to a static dot
- Inline approve confirmation uses native dialog semantics (Radix)

## Performance Budget
- FCP target: under 1.2s on the dashboard route
- Per-widget query timeout: 8s; widget surfaces an error state past that
- Each widget wrapped in its own Suspense boundary so a slow PO query doesn't block the cash drawers strip
- Parallel queries (no waterfall); use `Promise.all` if any server component composes multiple
- Sentry breadcrumb per widget mount + error
- Lighthouse a11y ≥ 95 on `/dashboard` and `/fr/dashboard`

## StockFlow-specific quality items (in addition to the global skill's gates)
- Both `/dashboard` and `/fr/dashboard` render correctly
- No new `services/` layer
- No duplicate server actions added — grepped `getBranchOpenDrawers`, `getBranchTodaySales`, etc. in `actions/` before creation
- No widgets for excluded domains (Presence/HR, AP/AR, ClientOrder, commercial agents)
- French labels fit at +20% length
- At least one Playwright happy-path test under `tests/`
- Sentry error boundary per widget
