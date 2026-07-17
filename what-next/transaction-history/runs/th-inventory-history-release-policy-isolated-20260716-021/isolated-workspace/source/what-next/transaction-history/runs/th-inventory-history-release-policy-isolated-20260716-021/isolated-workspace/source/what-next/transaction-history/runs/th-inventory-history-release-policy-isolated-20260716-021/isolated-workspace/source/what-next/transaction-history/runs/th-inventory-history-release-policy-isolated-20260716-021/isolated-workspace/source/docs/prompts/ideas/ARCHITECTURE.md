# StockFlow Dashboard — Architecture

## Where each piece lives (drop-in paths)

| Artifact in `outputs/sample-widget/` | Drop-in path in repo |
|---|---|
| `getDashboardSummary.ts` | `actions/analytics/getDashboardSummary.ts` |
| `useDashboardSummary.ts` | `hooks/useDashboardSummary.ts` |
| `DashboardOverviewPro.tsx` | `components/dashboard/DashboardOverviewPro.tsx` |
| `dashboard.i18n-additions.json` (merge) | `messages/en.json` + `messages/fr.json` (`dashboard.*`) |

Then update `app/[locale]/(dashboard)/dashboard/page.tsx`:
```diff
-import DashboardOverview from '@/components/dashboard/DashboardOverview'
+import DashboardOverviewPro from '@/components/dashboard/DashboardOverviewPro'

 export default function DashboardPage() {
   return (
     <DashboardLayout>
-      <DashboardOverview />
+      <DashboardOverviewPro />
     </DashboardLayout>
   )
 }
```

## Data flow

```
Browser
  └─ DashboardOverviewPro  (client component, "use client")
       └─ useDashboardSummary()       hooks/useDashboardSummary.ts
            └─ TanStack Query, 60s stale, visibility-gated polling
                 └─ getDashboardSummary()   "use server" action
                      ├─ getAuthenticatedUser()   org/location scoping
                      ├─ db.salesOrder.findMany   (single ranged query, 14d)
                      ├─ db.location.findFirst    (resolve default location)
                      └─ getInventoryAlerts()     existing action — single source of truth
```

One round-trip per refresh. The 14-day range uses the existing composite
index `@@index([organizationId, locationId, orderDate])` on `sales_orders`.

## Dark mode

The original `DashboardOverview.tsx` uses hard-coded colors like
`bg-gradient-to-br from-blue-50 to-blue-100`, `text-blue-900`,
`bg-slate-50`, and `bg-red-50` that turn into washed-out, illegible cards
in dark mode. The new component uses **semantic tokens only**:

- Surfaces: `bg-card`, `bg-muted/30`, `bg-popover`
- Borders: `border-border`, `border-border/60`
- Text: `text-foreground`, `text-muted-foreground`
- Brand accents: applied through tinted backgrounds (`bg-emerald-500/10`)
  + `dark:text-emerald-400` overrides, so the icon stays legible on both
  light and dark backgrounds.

Recharts `<Tooltip>` reads `hsl(var(--popover))` / `hsl(var(--border))`
directly so the chart popover follows the theme.

## i18n

- Component uses `useTranslations("dashboard")`. **All** strings come from
  the catalog — no inline English.
- Numbers, currency, dates, and relative time use `useFormatters()` which
  already respects `useLocale()` from next-intl. So "$1,234.56" in English
  becomes "1 234,56 XAF" in French automatically.
- RTL-safe spacing (`me-2`, `ms-1`, `text-end`) — consistent with the
  existing codebase.
- New keys live in the `dashboard` namespace; merge `dashboard.i18n-additions.json`
  into both message files.

## Multi-tenant / multi-location

The action **always** scopes by `organizationId` (from session, never from
client input) and `locationId` (resolved server-side from the user's first
active location, or from an explicit override). The header is ready to
take a `<LocationSwitcher>` that calls `useDashboardSummary(locationId)` —
just pass the selected ID.

## Performance budget

- Server action: ~1 query for the 14-day window + 1 small lookup for
  default location + 1 cached `getInventoryAlerts`. Sub-100ms on a warm DB.
- Client: chart points are 14, recent orders capped at 5, low-stock capped
  at 6 → no virtualization needed.
- TanStack Query keeps the previous payload visible during background
  refresh — no layout shift on poll.

## What this dashboard does NOT do (intentional)

- No real-time websocket push — 60s poll covers "at a glance".
- No deep analytics (cashier ranking, hourly heatmap, item P&L) — those
  live on `/dashboard/analytics` so the post-login page stays scannable.
- No per-widget date-range picker — the widget *is* "today + recent".
  Drill-down happens by clicking through to the dedicated module pages.
