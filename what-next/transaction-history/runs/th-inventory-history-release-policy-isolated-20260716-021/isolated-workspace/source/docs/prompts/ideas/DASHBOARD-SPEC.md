# Dashboard Design Contract

## Primary Persona

**Branch Manager / Owner-operator** of a small-to-mid retail store using StockFlow. Opens this page first thing in the morning, on phone or office laptop, with 30-90 seconds to assess overnight + start the day. Success for them = they walk away knowing (a) is yesterday's number where it should be, (b) is anything broken right now, (c) what's the most important thing to do first. They then either resolve an alert, create a purchase order, or close the tab.

## Promise

> See **last night's close, today's pulse, and what needs you** — in one glance, in your language, in your theme.

## Inspiration Synthesis

Calm, dark-by-default operations console with one editorial accent that ties back to the landing page's serif identity. Lead with **one large KPI** + sparkline (Stripe), keep numerics in mono with tabular figures (Raycast + the landing's existing JetBrains Mono voice), let the alerts list be the dashboard's real working surface (Linear's "the list IS the dashboard" discipline), and annotate the trend chart with a one-sentence takeaway (Pudding). Avoid the Bootstrap-admin four-colored-cards row at all costs — three KPIs at deliberately *different* scales is the move.

## Layout

- **Grid:** 12-column desktop (`lg+`); collapses to 8-column at `md`, 1-column at `sm`. Bento with intentional asymmetry — lead KPI tile spans 6 cols, secondary KPIs 3 cols each. Alerts inbox 8 cols, activity feed 4 cols.
- **Page chrome:** existing `<Navbar>` from `dashboard/layout.tsx` (already includes LocaleSwitcher, NotificationCenter, UserDropdownMenu). No new chrome. No sidebar — Navbar handles global nav.
- **Section order top-to-bottom:**
  1. Greeting band + Quick Actions strip (one row)
  2. Hero KPI band (3 tiles)
  3. Trend strip (1 wide tile)
  4. Alerts inbox (left) + Activity feed (right)
  5. System health strip (1 wide tile, low-contrast)
- **Mobile:** Stacks in same order. Quick Actions collapse to FAB. Trend strip becomes a tab-switcher (Sales / Transactions / Avg ticket). Alerts + Activity stack vertically.
- **Page width:** `max-w-screen-2xl mx-auto` matching the Tailwind container config (`2xl: 1700px`).
- **Outer padding:** `px-4 sm:px-6 lg:px-8 py-6` (matches existing dashboard pages' rhythm).

## Type Scale

| Role | Font | Size | Weight | Notes |
|---|---|---|---|---|
| Display (lead KPI value) | `font-display` (Instrument Serif) | 56px desktop / 40px mobile | 400 | Italic for "command" moment, once per page max |
| H1 (page title — "Good morning, {name}") | `font-body` (IBM Plex Sans) | 30px | 600 | |
| H2 (section title) | `font-body` | 18px | 600 | Tracking -0.01em |
| Eyebrow (uppercase mono mini-labels) | `font-mono` (JetBrains Mono) | 11px | 500 | Tracking 0.18em, uppercase |
| Body | `font-body` | 14px | 400 | line-height 1.5 |
| Body small / metadata | `font-body` | 12px | 400 | `text-muted-foreground` |
| Metric (medium KPI value) | `font-mono` | 28px | 600 | tabular-nums |
| Metric small (table cells, deltas) | `font-mono` | 14px | 500 | tabular-nums |

**French-length tolerance:** every label budget = source × 1.20. Inspect every KPI title, badge, button — French is consistently 15-20% longer than English. Specific risk strings audited:
- "Sales today" → "Ventes du jour" (+30% — uses 2-line allowance, or shortened to "Ventes")
- "Low stock items" → "Articles en rupture" (~+20%)
- "View all" → "Tout voir" (shorter, no problem)
- "Reorder suggested" → "Réapprovisionnement suggéré" (+90% — translate to "Réappro suggéré" colloquial)
- "New purchase order" → "Nouveau bon de commande" (+70% — quick action chips need to either wrap or use abbreviated label "Nouveau BC")

## Color Usage

All from shadcn HSL tokens already in `app/globals.css` — no hex literals.

- **Background:** `bg-background` (page)
- **Surface:** `bg-card` (each widget)
- **Surface elevated:** `bg-card` + `shadow-sm` + `border-border` (1px hairline; no soft shadows on the elevated tier)
- **Border:** `border-border`
- **Text primary:** `text-foreground`
- **Text secondary:** `text-muted-foreground`
- **Text muted (metadata):** `text-muted-foreground/70` (composed; do not introduce new token)
- **Brand accent:** `text-primary`, `bg-primary` — for the lead KPI delta when positive, for primary CTA buttons. (Note: shadcn `primary` token is near-black in light, near-white in dark — that's the intentional Linear-esque restraint. Distinct from landing's electric-blue accent.)
- **Semantic — used for meaning ONLY, never decoration:**
  - Success: `text-emerald-500` (Tailwind built-in — distinguishable in both themes)
  - Warning: `text-amber-500`
  - Danger: `text-rose-500` or `text-destructive` (shadcn token, also semantic)
  - Info: `text-sky-500`
- **Chart palette:** `chart-1` through `chart-5` (already defined in `globals.css` for both themes). Sparklines use `chart-1` solo.

## Density

- **Tier:** Balanced. Generous top (lead KPI breathes), compressed below (alerts + activity rows pack).
- **Card padding:** `p-6` (24px) for KPI tiles, `p-4` (16px) for activity / alert list rows.
- **Gap between widgets:** `gap-4` (16px) at base, `gap-6` (24px) on `lg+`.
- **Row height in lists:** ~52px (alert item), ~44px (activity item).
- **Border radius:** `rounded-lg` (uses `--radius`, currently 0.5rem) for cards. No rounded-2xl exuberance.

## Motion

- **Page enter:** Staged fade-up — `opacity 0→1 + y 4px→0` over 200ms, cascaded 50ms per widget for max 5 widgets. After that, instant.
- **Skeleton → data:** Crossfade 150ms.
- **Hover/press:** No transition on hover for static cards (Linear-style instant). 100ms ease on button hover. Focus ring is `ring-2 ring-ring ring-offset-2` (uses existing `--ring` token).
- **Number changes (polling):** No count-up animation. Numbers replace silently to avoid stealing attention. Color flash on delta change ONLY for the lead KPI (50ms).
- **Reduced motion:** `prefers-reduced-motion` disables the staged enter cascade entirely.

## Widgets

### W1 — `<GreetingBar>`
- **Title (i18n key):** `dashboard.greeting.morning` / `afternoon` / `evening` (with `{name}` interpolation), plus `dashboard.greeting.subtitle` (date + branch context).
- **Data source:** session (`useSession()` from next-auth) for name; client-local `Date` for time-of-day branch (no server roundtrip needed for "morning vs afternoon").
- **Loading state:** none — renders instantly from session.
- **Empty state:** N/A.
- **Error state:** N/A.
- **Real-time:** no.
- **Permissions:** any authenticated user.
- **Click behavior:** none (display only).

### W2 — `<QuickActionsStrip>`
- **Title:** `dashboard.actions.title` — visually-hidden h2 for screen readers, not displayed.
- **Data source:** RBAC-gated action list — gate server-side via `actions/roles/` pattern. Send only the allowed actions list to the client.
- **Loading state:** skeleton chips matching the action count (read role on server, render).
- **Empty state:** no actions visible if role has zero permissions — show nothing (do not render an empty strip).
- **Error state:** silently degrade — do not render the strip.
- **Real-time:** no.
- **Permissions:** per-action.
- **Click behavior:** each chip navigates via `<Link>` from `@/i18n/navigation` (locale-aware).

### W3 — `<TodaySalesCard>` (LEAD KPI — the sample widget delivered)
- **Title:** `dashboard.kpi.todaySales.label`, tooltip: `dashboard.kpi.todaySales.tooltip`.
- **Data source:** **NEW hook** `useTodaySales(locationId?: string)` calling **NEW server action** `getTodaySales(locationId?)` to be added to `actions/analytics/today-sales.ts`. Returns `{ today: number; yesterdaySameHour: number; spark: Array<{ts: string; value: number}>; currency: string }`.
- **Loading state:** skeleton — large rect (matches value), small rect (matches delta), thin rect (matches sparkline). NOT generic gray boxes.
- **Empty state:** "No sales yet today." — `dashboard.empty.noSalesToday`. With a one-line CTA "Open POS to record the first sale" linking to `/dashboard/pos`.
- **Error state:** inline retry button — "Couldn't load today's sales" + retry icon-button. Sentry breadcrumb sent. Other widgets unaffected.
- **Real-time:** poll every 60s (per override skill's real-time strategy).
- **Permissions:** Owner, Branch Manager, Stock Manager, Admin. Cashier sees their own shift summary instead (different widget, future scope).
- **Click behavior:** navigate to `/dashboard/sales` with today's date pre-filtered.

### W4 — `<ActiveSessionsKpi>` (secondary)
- **Title:** `dashboard.kpi.activeSessions.label`.
- **Data source:** **NEW hook** `useActiveSessions()` → **NEW action** `getActiveSessionsCount()` in `actions/analytics/active-sessions.ts`. Returns `{ open: number; openDrawers: number; locations: Array<{name: string; sessionCount: number}> }`.
- **Loading state:** small rect skeleton.
- **Empty state:** "No POS open right now."
- **Error state:** inline retry.
- **Real-time:** poll every 30s.
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** navigate to `/dashboard/cashDrawer`.

### W5 — `<StockPainKpi>` (secondary)
- **Title:** `dashboard.kpi.stockPain.label`.
- **Data source:** **NEW hook** `useStockPain()` → **NEW action** `getStockPain()` in `actions/analytics/stock-pain.ts`. Returns `{ lowStockCount: number; outOfStockCount: number; topItems: Array<{id, name, qty, reorderPoint}> }` (top 3 for hover preview).
- **Loading state:** small rect skeleton.
- **Empty state:** "All stock above reorder points." with a calm green check icon.
- **Error state:** inline retry.
- **Real-time:** poll every 60s.
- **Permissions:** Owner, Branch Manager, Stock Manager, Admin.
- **Click behavior:** navigate to `/dashboard/inventory?filter=low-stock`.

### W6 — `<SalesTrendStrip>`
- **Title:** `dashboard.trends.title`.
- **Data source:** **NEW hook** `useSalesTrend(range: '7d' | '30d')` → **NEW action** `getSalesTrend(range)` returning `{ points: Array<{date, value}>; takeaway: string }` (the takeaway sentence is computed server-side to keep i18n consistent — pass keys + params, not concatenated strings).
- **Loading state:** chart skeleton — series of bars matching final density.
- **Empty state:** "Not enough sales history yet" with an icon.
- **Error state:** inline retry.
- **Real-time:** no — load on mount, manual refresh button in widget header.
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** navigate to `/dashboard/analytics`.
- **Chart:** Recharts `<AreaChart>` using `chart-1` token. Grid lines `border-border/40`. Tooltip uses `bg-popover text-popover-foreground border-border`.

### W7 — `<AlertsInbox>`
- **Title:** `dashboard.alerts.title`.
- **Data source:** **NEW hook** `useDashboardAlerts()` → **NEW action** `getDashboardAlerts()` aggregating from `actions/inventory/`, `actions/purchaseOrderWorkflow/`, `actions/cashDrawer/`. Returns `Array<{ id, severity: 'warn'|'danger', kind, title, body, timestamp, primaryHref }>`.
- **Loading state:** 5 row skeletons matching real row height.
- **Empty state:** "Nothing needs your attention." — `dashboard.alerts.empty`. With a calm illustration (single icon).
- **Error state:** inline retry banner above the list.
- **Real-time:** poll every 60s.
- **Permissions:** Owner, Branch Manager, Stock Manager, Admin.
- **Click behavior:** each row → its `primaryHref`. "View all" → `/dashboard/notifications-demo` (or a dedicated alerts page if/when built).

### W8 — `<RecentActivityFeed>`
- **Title:** `dashboard.activity.title`.
- **Data source:** **NEW hook** `useRecentActivity(limit: 10)` → **NEW action** `getRecentActivity(limit)` reading from a unified audit/event source. Returns `Array<{ id, kind, actorName, entityName, amount?, timestamp, href? }>`.
- **Loading state:** 8 row skeletons matching real density (timestamp + sentence).
- **Empty state:** "Nothing happened recently." with a quiet icon.
- **Error state:** inline retry.
- **Real-time:** no — manual refresh button. Invalidate on completion of any mutation elsewhere.
- **Permissions:** all roles (filtered to events they can see).
- **Click behavior:** row → its `href` if present.

### W9 — `<SystemHealthStrip>`
- **Title:** `dashboard.health.title`.
- **Data source:** **NEW hook** `useSystemHealth()` → **NEW action** `getSystemHealth()` returning `{ branchesOnline: number; branchesTotal: number; lastSyncAt: ISOString; drawersOpen: number }`.
- **Loading state:** thin row skeleton.
- **Empty state:** N/A (always shows status).
- **Error state:** muted "Status unavailable" — does not block page.
- **Real-time:** poll every 60s.
- **Permissions:** Owner, Branch Manager, Admin.
- **Click behavior:** none — informational only.

## i18n

- **Namespace:** `dashboard` (top-level, extends existing key at line 651 of `messages/en.json` and matching key in `fr.json`).
- **New keys to add** (must exist in BOTH `en.json` and `fr.json` before any widget renders):

```jsonc
{
  "dashboard": {
    "greeting": {
      "morning": "Good morning, {name}",
      "afternoon": "Good afternoon, {name}",
      "evening": "Good evening, {name}",
      "subtitle": "{date} · {branch}"
    },
    "kpi": {
      "todaySales": {
        "label": "Today's sales",
        "tooltip": "Net sales recorded today across all branches",
        "deltaVsYesterday": "{percent} vs same time yesterday"
      },
      "activeSessions": {
        "label": "Open POS sessions",
        "withDrawers": "{open} sessions · {drawers} open drawers"
      },
      "stockPain": {
        "label": "Items needing attention",
        "breakdown": "{low} low · {out} out of stock"
      }
    },
    "trends": {
      "title": "Net sales — 30 days",
      "range": { "7d": "7 days", "30d": "30 days" },
      "takeaway": "Today is tracking {percent} {direction} the average {weekday}.",
      "directionAhead": "ahead of",
      "directionBehind": "behind"
    },
    "alerts": {
      "title": "Needs your attention",
      "empty": "Nothing needs your attention right now.",
      "lowStock": "{count, plural, one {# item} other {# items}} below reorder point",
      "openDrawer": "Cash drawer open for {duration} at {branch}",
      "pendingPO": "{count, plural, one {# purchase order} other {# purchase orders}} awaiting approval",
      "viewAll": "View all"
    },
    "activity": {
      "title": "Recent activity",
      "empty": "Nothing happened recently.",
      "viewAll": "View all"
    },
    "actions": {
      "title": "Quick actions",
      "newPurchaseOrder": "New purchase order",
      "receiveShipment": "Receive shipment",
      "openPos": "Open POS",
      "newTransfer": "New transfer",
      "createItem": "Create item"
    },
    "health": {
      "title": "System status",
      "branchesOnline": "{online}/{total} branches online",
      "lastSync": "Last sync {ago}",
      "drawersOpen": "{count, plural, =0 {No drawers open} one {# drawer open} other {# drawers open}}",
      "unavailable": "Status unavailable"
    },
    "empty": {
      "noSalesToday": "No sales yet today.",
      "noPermission": "You don't have access to this widget.",
      "openPos": "Open POS to record the first sale"
    },
    "errors": {
      "loadFailed": "Couldn't load",
      "retry": "Retry"
    }
  }
}
```

French translations are committed in the same change. **French-length audit** done on every label above — French translations validated to fit in their containers; long ones (e.g. "Réapprovisionnement suggéré") shortened colloquially.

## Theme

- All colors via tokens. **Zero hex literals** in `.tsx`. Verified by grep in Phase 5.
- Dark mode auto-flips via `next-themes` `class` strategy; no per-widget code.
- Chart-specific:
  - Gridlines: `border-border/40` (visible in both themes — borders are HSL with alpha-compatible literal-form).
  - Tooltip surface: `bg-popover`.
  - Series stroke: `text-chart-1` (or use `var(--chart-1)` in Recharts `stroke` prop).
- Skeleton: shadcn `<Skeleton>` primitive which uses `bg-muted` (visible in both themes — confirmed).

## Accessibility

- Color contrast: all token combos verified WCAG AA in both themes by reading `globals.css` values (foreground/background contrast > 7:1 in both; muted-foreground/background > 4.5:1).
- Keyboard navigation: Quick Actions chips → KPI tiles (focusable, navigate on enter) → trend strip (focus on chart container) → alerts list (each row focusable, Enter activates) → activity feed (each row focusable).
- Skip link: existing global skip-to-content in `app/layout.tsx` (verify it exists — if not, add to dashboard layout).
- ARIA:
  - KPI tiles: each is a `<button>` (or `<Link>` styled as tile) with `aria-label` including value + label + delta.
  - Real-time polls: wrap the KPI value in `<span aria-live="polite">` so screen readers announce changes.
  - Icon-only buttons (retry, refresh, dismiss): all have `aria-label` from i18n keys.
- Focus rings: `ring-2 ring-ring ring-offset-2` on all interactive elements. Never `outline-none` without replacement.

## Performance Budget

- **First Contentful Paint:** < 1.2s on a fast 4G connection.
- **Per-widget query timeout:** 5s — after which the widget shows error state with retry.
- **Suspense boundaries:** every widget wrapped in its own `<Suspense>` (or, since we're using TanStack Query client-side, each widget owns its own `useQuery` — slow ones do not block fast ones).
- **Bundle:** chart library (Recharts) is dynamically imported in the trend strip widget — not in the initial dashboard bundle.
- **Polling discipline:** maximum 3 widgets poll. Total network: 1 request every 30s (sessions, drawers), 2 every 60s (sales, alerts), staggered to avoid simultaneous fan-out.

---

## Deliverable for this evaluation

Phase 4 produces **one sample widget** (`<TodaySalesCard>`) demonstrating every pattern this contract requires:
- i18n via `useTranslations("dashboard")`.
- Theme tokens (no hex).
- Real-data hook reference (`useTodaySales` — references a server action that would live in `actions/analytics/today-sales.ts`).
- Skeleton matching content shape.
- Designed empty state.
- Graceful error state with inline retry.
- aria-live for real-time updates.
- French-length-tolerant labels.

The full dashboard build is OUT OF SCOPE for this evaluation; only the sample widget ships.
