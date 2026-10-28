# Dashboard Inspiration — StockFlow Redesign

Phase 0 deliverable for the dashboard glow-up. 7 references, all chosen with one bias the user gave us explicitly: **distinctive without being weird**. No brutalism, no animated experiments, no "wrong on purpose." We're looking for products that look like someone made deliberate, opinionated decisions — but the decisions still serve a working operator at 8am.

The result we want is: "this looks like StockFlow could ship it tomorrow and a finance buyer wouldn't flinch — but it doesn't look like the shadcn admin starter."

---

## 1. Linear — linear.app/method (and the in-app issue triage)

**Why I picked it:** The reference for "design-led SaaS that still works." Every micro-decision (key-style chips, mono caps for IDs, restrained shadows, perfect type rhythm) is opinionated, but the product remains scannable at the speed an engineering manager works.
**Layout move:** Generous vertical rhythm with a single dense data column; chrome is paper-thin so the content carries the visual weight. Right-rail panel for context instead of nested modals.
**Type system:** Inter Display for headers, Inter for body, mono caps for IDs/keys. Ratio ~1.20 — small steps, tight scale. Numbers in tabular figures.
**Density choice:** Balanced-leaning-compressed in tables; generous in the page header. They earn density by making borders 1px and very low-contrast.
**Color strategy:** Near-monochrome surface palette (0 / 4 / 8 / 12% luminance steps), single brand accent (purple), semantic colors used **only** for state (open/done/canceled).
**Motion language:** Instant. <120ms feedback on every interaction. No springy entrances. The only "animation" is the cursor presence indicator.
**One thing worth stealing:** The "low-contrast 1px rule" — every divider is hsl(border) at 100%, not at 50% of muted. Surfaces don't need shadows when the rules are this precise.
**One thing to NOT copy:** Their workspace switcher pattern is overkill for a single-tenant retail back-office.

## 2. Vercel — vercel.com (project dashboard, not marketing)

**Why I picked it:** Distinctive *because* it's almost aggressively neutral. The geometric logo, the perfect mono-for-data discipline, and the single accent color make every page feel like the same product. No gradients on KPI cards. No colored icons in stat tiles. It's confident enough to be plain.
**Layout move:** Top status bar (deployment state, branch, env) above the page header — a "what's true right now" strip we don't currently have.
**Type system:** Geist Sans for UI, Geist Mono for IDs/timestamps/numbers. Single weight per scale step. Caps on overlines, sentence case everywhere else.
**Density choice:** Compressed. Row heights are 32–36px on tables. Padding is restrained.
**Color strategy:** Black/white surfaces with ONE accent. Semantic = success-green and error-red only. Charts are monochromatic with opacity steps, not rainbow palettes.
**Motion language:** Almost none. Cards do not lift on hover. A button has a hover state, that's it.
**One thing worth stealing:** The **status strip** above the header — for StockFlow this becomes "open POS sessions / open drawers / last sync." Operator answer in one line before they scroll.
**One thing to NOT copy:** The pure black/white minimalism would feel cold for a small-business retail product. We need a hair more warmth.

## 3. Stripe Dashboard — dashboard.stripe.com

**Why I picked it:** The best example I know of "dense data, still calm." Stripe puts more information per square inch than any retail tool, but the page never feels noisy because of (a) ruthless typographic hierarchy, (b) every chart uses the same two colors, (c) numbers are tabular and right-aligned.
**Layout move:** Hero "today's number" with a thin spark, then a 12-col grid with widgets sized by importance (not all the same). Most-important widget is 8 cols wide. We currently give all 4 KPIs equal weight — that's a mistake.
**Type system:** Sohne/Inter, ~1.18 ratio. Numbers are LARGER than headers (the metric IS the headline). Currency symbol is muted.
**Density choice:** Generous around headers, compressed inside cards. Card padding stays consistent (24px).
**Color strategy:** Single brand purple. Charts: one accent + one muted version of the same hue. State colors only on badges and bars.
**Motion language:** Fade-in on data load (200ms), spark draws on mount. Otherwise still.
**One thing worth stealing:** The **asymmetric grid** where the hero metric is 2x wider than secondary KPIs. Hierarchy by size, not by color.
**One thing to NOT copy:** Their tooltip density. Operators don't read tooltips at 8am.

## 4. Raycast — raycast.com (the changelog/command center views)

**Why I picked it:** A masterclass in "opinionated typography as the whole brand." The serif italic for emphasis, the monospaced eyebrows, the deliberate use of warm off-white instead of pure white. It's distinctive because the type DOES the work that other apps try to do with color.
**Layout move:** A single column of dense content, no sidebar on most pages. The chrome retreats. Section eyebrows in mono caps act as visual anchors instead of underlines or background bands.
**Type system:** Mono eyebrow (~11px caps, +0.22em tracking) → serif italic for the "voice" line → sans body. Three voices, one rhythm. **This already aligns with StockFlow's landing page** (Instrument Serif + IBM Plex + JetBrains Mono).
**Density choice:** Balanced. Generous around prose, compressed in lists.
**Color strategy:** Warm neutrals. Off-white (#FAFAF7-ish) backgrounds, warm bone for the editorial accent, single coral/red for emphasis.
**Motion language:** Subtle (fade + 8–12px translate, 180ms ease-out). Never staged.
**One thing worth stealing:** The **mono caps eyebrow** as a section anchor across the entire dashboard. We already own this in the landing CSS as `.eyebrow` — drag it into the dashboard.
**One thing to NOT copy:** The single-column layout doesn't work for ops dashboards — we need the grid.

## 5. Datawrapper Data Vis Library — datawrapper.de (example charts)

**Why I picked it:** The non-SaaS reference. These are editorial charts built for newsrooms — they make data legible without decoration. ZERO 3D, ZERO gradients on bars, ZERO dual-axis trickery. If a chart is hard to read, they redraw it.
**Layout move:** Chart-first: the chart is the headline. Sub-caption explains the methodology in plain language. Source line at the bottom. No card chrome around it.
**Type system:** One sans (their own custom). Bold for the chart title, regular for body, mono for numbers. Type does the labeling — colored legends are last resort.
**Density choice:** Generous around each chart. They give a chart room.
**Color strategy:** Sequential or diverging palettes designed for both color-blindness AND grayscale print. No "red = bad" except when it actually IS bad.
**Motion language:** None on load. Hover reveals one number at a time.
**One thing worth stealing:** **Direct-label the line**, not the legend. End-of-line labels next to the data point, no chart legend below. Faster to read.
**One thing to NOT copy:** Their static newsroom aesthetic — we need interactive drill-down, they don't.

## 6. Rauno Freiberg — rauno.me (portfolio + the Vercel motion explorations)

**Why I picked it:** Polarizing pick — this is one designer's personal site, not a SaaS. But it is the cleanest example I know of "**craft visible in the details**" — perfect optical alignment, intentional letter-spacing per size, motion that follows physics. Looking at it recalibrates what "polished" means.
**Layout move:** Asymmetric — left-anchored content with breathing room on the right. Footnotes inline rather than at the bottom. Side-by-side comparisons use a shared baseline grid.
**Type system:** Display sans at 96px on landing, drops to 14px body in articles. The ratio is huge but the rhythm holds because vertical spacing scales with type size.
**Density choice:** Generous. Whitespace is a feature.
**Color strategy:** Light bone background, very dark ink for text, single accent for links. That's it.
**Motion language:** Physics-based springs (stiffness ~300, damping ~30). Things settle, they don't ease.
**One thing worth stealing:** **Optical alignment of metric numbers** — when a card shows "$24,380" the "$" is muted and slightly smaller; the number itself is the visual weight. This single move makes every KPI card look 2x better.
**One thing to NOT copy:** Personal-site flourishes (custom cursors, decorative artifacts) belong nowhere near a dashboard.

## 7. Land-book — land-book.com (current "data dashboards" gallery filter)

**Why I picked it:** The "current zeitgeist" check. Filtered to the dashboard category in the last 90 days to confirm what the design world is actually shipping right now and to deliberately *not* repeat the most common moves (the colored gradient stat card, the floating glass-morphism panel, the AI-purple gradient logo).
**Layout move:** Bento grids (irregular cell sizes) are dominant right now; **we'll use them sparingly**. The strongest dashboards in the current gallery share one trait: a single hero metric or sentence at the top, before any cards.
**Type system:** Two dominant patterns this season — (a) sans-only with extreme weight contrast (300 body, 700 display), and (b) serif display + sans body. The second is rarer, more distinctive, and matches StockFlow's landing already.
**Density choice:** The polished entries are balanced-to-generous. The cramped entries are last year's leftovers.
**Color strategy:** Dominant trend is muted neutrals + one saturated accent. Multi-color KPI cards (blue/green/purple/orange) read as outdated.
**Motion language:** Page-enter stagger (50ms per card) is everywhere — and it's already feeling overused. We'll skip it.
**One thing worth stealing:** **Hero sentence over hero cards.** "12 alerts need your attention" as a sentence at the top, then the cards drill into it. Operator reads one sentence and knows what today is.
**One thing to NOT copy:** Bento grids for their own sake. We use irregular sizing only when importance actually differs.

---

## Synthesis — what these 7 together suggest for StockFlow's dashboard

The current StockFlow dashboard fails the "distinctive" test because it uses every default move from 2021 SaaS admin templates: four equal-weight gradient stat cards, all-the-same-card-shadow, primary-color icons in colored circles, rainbow Recharts colors, and a sidebar that competes for attention with the content. Linear, Vercel, Stripe, and Raycast all reject those exact moves — and they do it not by being weird, but by being **disciplined**: monochromatic surfaces with one accent, mono caps eyebrows as the navigational anchor, **size as the only hierarchy device** (the most important number is the largest number — no decoration needed), and motion only when it carries information.

The strongest move available to us is to **inherit the landing page's typographic voice** (Instrument Serif display + IBM Plex Sans body + JetBrains Mono for numbers) into the dashboard. This is the single change that makes the dashboard feel like the same product as the marketing site — and it's a move other admin templates literally cannot make because they don't have an editorial voice to inherit. Combined with Stripe's asymmetric grid (one hero KPI 2x wider than peers), Vercel's status strip above the header, Datawrapper's direct-labeled charts, and Raycast's mono caps eyebrows as section anchors, we get a dashboard that is unmistakably StockFlow, immediately legible at 8am, and identifiably "designed" without being precious about it.

Three things we are explicitly NOT doing: (1) bento grids for their own sake — irregular sizing only when importance differs; (2) page-enter stagger animations — they've become the new spinner; (3) the colored-icon-in-a-colored-circle stat card — it's the most-copied 2021 move and the surest tell that no one designed the page.

---

## Existing Design Language (Continuity Audit)

Read of the StockFlow codebase before drawing anything new.

### Tokens (from `app/globals.css` + `tailwind.config.ts`)

- shadcn-style HSL CSS variables, dark mode via `.class`. Tokens are in place: `--background`, `--foreground`, `--card`, `--card-foreground`, `--muted`, `--muted-foreground`, `--border`, `--ring`, `--primary`, `--destructive`, plus `--chart-1` through `--chart-5`. All themed for light and dark.
- `--radius: 0.5rem`. Used everywhere via `lg`/`md`/`sm` borderRadius mapping.
- Chart palette already exists in both themes — **we don't need to add new chart tokens**, just stop hardcoding `#3B82F6` / `#10B981` etc.
- No spacing scale beyond Tailwind defaults; the landing page uses an implicit 4 / 8 / 16 / 24 / 48 rhythm — we will adopt it for the dashboard explicitly.

### Landing page typographic system (from `app/[locale]/(home)/landing-fonts.ts` and `landing.css`)

Three font families already loaded via `next/font` and exposed as CSS variables on the landing root:

- `--font-display` → **Instrument Serif** (display headlines, editorial italic accents)
- `--font-body` → **IBM Plex Sans** (body, UI labels)
- `--font-mono` → **JetBrains Mono** (numbers, tickers, "this is live data" voice)

Plus `landing.css` defines reusable classes scoped under `.landing-root`: `.eyebrow` (mono caps with 0.22em letter-spacing), `.display`, `.display-italic`, `.body-text`, `.data-text`, `.tabular` (tabular-nums), and the `.frame-glow` panel border. **These are scoped to `.landing-root` to prevent leaking.** The redesign needs to either (a) expand the CSS-variable scope so the dashboard can use the same fonts, or (b) hoist the three font-variable strings up to the root `<html>` element (in `app/layout.tsx`) so any descendant can pick them up. **Recommended: (b) — hoist the variables, scope the classes.** The fonts themselves are not landing-specific.

### Theme provider

`next-themes` is wired in `components/Providers.tsx` (confirmed via skill stack table). Dark/light toggle uses `class="dark"` on `<html>`. All semantic tokens already auto-flip. **The dashboard's job is to use ONLY semantic tokens** — no hex literals, no hardcoded `bg-slate-50`.

### i18n

`next-intl` with `localePrefix: "as-needed"`. Catalogs at `messages/en.json` and `messages/fr.json`. Already has a top-level `dashboard` namespace populated (the existing `DashboardOverview` uses `t("metrics.totalRevenue")`, `t("charts.salesOrdersTrend")`, etc.). **We will keep and extend that namespace, not replace it.**

### Data layer

Server actions in `actions/<domain>/` → TanStack Query hooks in `hooks/` → UI components. Confirmed in user memory (no services layer). `actions/analytics/` already exists with `requestDailySalesReport.ts` and `financial-reports.ts`. We will add new aggregation actions there (e.g. `todaySnapshot`, `lowStockSummary`, `recentPosActivity`) rather than querying Prisma directly from widgets.

### Component primitives

shadcn-style in `components/ui/`: `Card`, `CardHeader`, `CardContent`, `Button`, `Badge`, `Progress`, `Avatar`, `ScrollArea`, `Sheet`, `DropdownMenu`, etc. **Reuse these; do not introduce a parallel UI library.**

### Auth + chrome

`DashboardLayout` (the new server-component one at `app/[locale]/(dashboard)/dashboard/layout.tsx`, NOT the old `components/dashboard/DashboardLayout.tsx`) handles session check + Navbar. The Navbar already contains LocaleSwitcher, NotificationCenter, UserDropdownMenu, mobile Sheet. **The redesign does NOT touch chrome; it only replaces the page body.**

---

## Current Dashboard Audit — What's Actually Rendered Today

Read of:
- `app/[locale]/(dashboard)/dashboard/page.tsx` (10 lines — just composes the two below)
- `app/[locale]/(dashboard)/dashboard/layout.tsx` (server component — auth check + Navbar; **keep**)
- `components/dashboard/DashboardOverview.tsx` (383 lines — the widget body; **replace**)
- `components/dashboard/DashboardLayout.tsx` (350 lines — duplicate sidebar+chrome NOT wired through the current route; **delete or leave for cleanup, not our scope**)

### What's currently on the page (in `DashboardOverview.tsx`)

| # | Widget | Status | Data source | Verdict |
|---|---|---|---|---|
| 1 | Page header: "Overview" title with blue→indigo gradient text, Refresh button, Quick Action button | i18n keys exist | none | **REPLACE** — gradient text is the #1 "generic SaaS" tell. Replace with serif display + mono eyebrow. |
| 2 | KPI card: Total Revenue ($45,231, +12.5%) | i18n keys exist | **hardcoded** | **REPLACE** — wire to `actions/analytics/`. Promote to hero size (asymmetric grid). |
| 3 | KPI card: Total Orders (1,234, +8.2%) | i18n keys exist | **hardcoded** | **REPLACE** — wire to real action. Demote to secondary KPI size. |
| 4 | KPI card: Inventory Items (2,847, -2.1%) | i18n keys exist | **hardcoded** | **REPLACE** — wire to real action. Secondary KPI. |
| 5 | KPI card: Active Customers (892, +15.3%) | i18n keys exist | **hardcoded** | **CUT FROM HERO** — vanity metric. Move to a "this month at a glance" subsection or kill. |
| 6 | Chart: "Sales & Orders Trend" — stacked area, blue + green, 7 mock months | i18n keys exist | **hardcoded mock array `salesData`** | **REPLACE** — single-axis line, last 30 days from real action, direct-labeled. |
| 7 | Chart: "Inventory Distribution" — pie chart, 4 hardcoded categories with hardcoded hex colors | i18n keys exist | **hardcoded mock array `inventoryDataRaw`** | **CUT** — pie charts are bad for 4+ categories, and this is a vanity widget. Replace slot with the "Low Stock" widget promoted from below. |
| 8 | Card: "Recent Orders" — 4 hardcoded order rows (ORD-001 etc.) | i18n keys exist | **hardcoded** | **REPLACE** — real recent POS transactions from `actions/pos-session-actions.ts` or equivalent. |
| 9 | Card: "Low Stock Alerts" — 4 hardcoded items with progress bars | i18n keys exist | **hardcoded** | **REPLACE** — wire to `actions/inventory/` or `actions/stock/`. Promote to top half of page (it's the only widget that actually requires action today). |
| 10 | Card: "Quick Actions" — 6 buttons (New Order, Add Item, New Customer, Stock Transfer, Process Payment, View Reports) | i18n keys exist | n/a | **KEEP, but redesign** — flatten from "h-20 flex-col" oversized buttons into a discreet horizontal strip below the fold. RBAC-gate (Cashier doesn't need "View Reports"). |

### Anti-pattern inventory (what fails skill quality gates today)

1. **Hardcoded mock data everywhere** — `salesData`, `inventoryDataRaw`, `recentOrders`, `lowStockItems` are all inline arrays. The component is a demo, not a dashboard. Skill rule violated: "Zero mock data."
2. **Hex literals in JSX** — `#3B82F6`, `#10B981`, `#F59E0B`, `#EF4444` are passed directly to Recharts `<Cell fill>` and `<Area stroke>`. Skill rule violated: "Zero color hex literals."
3. **Tailwind palette colors instead of semantic tokens** — `bg-blue-50`, `bg-blue-100`, `text-blue-600`, `text-blue-900`, `bg-red-50`, `border-red-200`, `bg-slate-50`. These **do NOT auto-flip in dark mode** and they bypass the design system. Skill rule violated: "Zero color hex literals" (semantic equivalent).
4. **`"use client"` on the entire page** — forces every widget to client render even though most could be RSC + suspense. Skill rule violated: "Suspense per section."
5. **No skeletons, no empty states, no error states** — the component assumes data is always there. Skill rule violated: items 5, 6, 7 of the rules list.
6. **Decorative gradient text on the title** — the #1 generic SaaS tell. Drops the page into "looks like every Bootstrap admin."
7. **Equal-weight KPI grid** — all 4 cards are the same size, the same shadow, the same gradient pattern. Hierarchy is by color (each card is a different color), which is the weakest possible hierarchy.
8. **`p-3 bg-blue-600 rounded-full` icon chips** — the colored-icon-in-a-colored-circle pattern. Tell #2.
9. **`border-0 shadow-lg`** on every Card — pretending there's no border, then adding a soft shadow that doesn't render well in dark mode. Replace with `border` on `--border` token, ditch the shadow.
10. **No persona** — the page tries to serve owner, manager, cashier all at once. Owner wants today's revenue + alerts; cashier shouldn't see this page at all (they go to POS).

### What survives the redesign

- The **layout file** (`dashboard/layout.tsx`) — server-component auth check + Navbar. Untouched.
- The **i18n key namespace** (`dashboard.*` in `messages/en.json` + `fr.json`) — extend it, don't rename existing keys.
- The **Quick Actions concept** — keep the idea, redesign the execution. (Demoted, RBAC-gated, lower visual weight.)
- The **`useFormatters` hook** for currency/number/relative-time formatting — already locale-aware, reuse exactly.
- The **page-level chrome** (Navbar, LocaleSwitcher, NotificationCenter) — out of scope.

### What gets deleted (or marked for cleanup)

- `components/dashboard/DashboardOverview.tsx` — entire body replaced by widget-per-file pattern under `app/[locale]/(dashboard)/dashboard/_components/`.
- `components/dashboard/DashboardLayout.tsx` (the 350-line client-side one with InvenFlow branding and hardcoded "John Doe" avatar) — **orphan code**; not in our scope to delete, but worth flagging for cleanup.
- All hardcoded mock arrays.
- All hex literals.
- All `bg-blue-*`/`bg-green-*`/`bg-slate-*` palette uses in the dashboard page tree.

