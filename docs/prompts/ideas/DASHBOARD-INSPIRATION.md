# Dashboard Inspiration & Continuity Audit

> Phase 0 + Phase 1 artifact for the StockFlow main-dashboard build.
> Web fetches were not used in this run — references are documented from
> direct prior knowledge of these sites' design language. This is the
> documented fallback per Phase 0 of the global skill.

---

## 1. Linear — https://linear.app

**Why I picked it:** Linear is the canonical example of "we are not a generic SaaS" — every surface is opinionated about density, motion, and information hierarchy. Their cycle view is essentially a domain-tuned dashboard.
**Layout move:** Persistent left rail (deeply nested but never noisy) + content area that defaults to a *table-as-dashboard* rather than card grid. The "Inbox" and "My Issues" views are KPI-free on purpose: the list **is** the dashboard.
**Type system:** A single tight sans (Inter-derived, slightly condensed) at 13/14/15px body. Display weight comes from layout space, not type scale. They almost never go above ~22px.
**Density choice:** Compressed — but it never feels cramped because row heights and gutters are tuned to one tick of the 4px grid.
**Color strategy:** Near-monochrome neutrals + a single brand purple-blue used very sparingly. Status colors (orange/red/green) only on issue state pills. The whole product looks like one mood.
**Motion language:** Instant. Hover states have no transition. The only motion is the command-K palette and progress bars. This is a deliberate "we respect your time" stance.
**One thing worth stealing:** The discipline to let the *primary list* be the dashboard. For StockFlow, an operator probably wants "what needs my attention" as a list, not four hero KPIs.
**One thing to NOT copy:** The pure-monochrome restraint. A retail dashboard needs operational color signals (low-stock amber, drawer-open green) — Linear can be monochromatic because their state is in pills, not values.

---

## 2. Vercel Dashboard — https://vercel.com/dashboard

**Why I picked it:** Vercel's dashboard treats the project list as the primary surface and pushes analytics down. The decision to lead with *what you actually do here* instead of vanity numbers is the move.
**Layout move:** Wide topbar with org switcher and global search; below it, a project grid card per deployment with a tiny inline status (build state, latest commit, time). No left sidebar in the main view. The "feed" is implicit in the card metadata.
**Type system:** Geist Sans for everything; numerics in a tabular variant. They use weight (400→500→600) more than size to create hierarchy.
**Density choice:** Balanced — generous outer padding, compressed inner content. Their cards have a lot of whitespace at the edge that absorbs the eye.
**Color strategy:** Black/white absolute extremes + grayscale + one electric green-cyan accent for "ready" state. Errors are a single muted red.
**Motion language:** Staged — items fade-up in a 50ms cascade on first load. Nothing animates after that.
**One thing worth stealing:** The status pill on every card. StockFlow can do this for every location/branch: a card per branch with one health pill.
**One thing to NOT copy:** No left rail. StockFlow has too many module sections (inventory, finance, suppliers, POS, settings) — global nav has to live somewhere persistent.

---

## 3. Stripe Dashboard — https://dashboard.stripe.com

**Why I picked it:** Stripe is the gold standard for "data-dense done with grace." Their dashboard handles dozens of metrics without feeling like a heat-map.
**Layout move:** Bento-style top row of three large metric tiles (each with a sparkline INSIDE the tile), then a wider chart below, then a list. The bento is asymmetric — the leftmost tile is wider because it carries the lead metric.
**Type system:** Stripe Sans (their custom) display weight for KPI values (~40px), thin body for labels (~12px caps-locked). Big contrast between the number and its label is the move.
**Density choice:** Generous at the top (let the lead numbers breathe), then compressed as you scroll down into transactions.
**Color strategy:** Off-white background, deep navy text, purple-indigo brand. Up/down deltas in green/red but at low saturation. Sparklines use a single brand color — they never go rainbow.
**Motion language:** Spring on tooltip reveal; instant on tab switches. Numbers count up on first paint (subtle but it draws the eye to the data).
**One thing worth stealing:** Sparkline-inside-the-KPI-tile. Hero metric for "Today's sales" should show a tiny 30-day spark beside the number.
**One thing to NOT copy:** Count-up animation on every value. Once per page-load max; on real-time polls it would be distracting.

---

## 4. Raycast — https://raycast.com

**Why I picked it:** Raycast's marketing site uses a *typographic* hierarchy — a serif display paired with an impossibly clean sans for body — that StockFlow's landing page actually echoes (Instrument Serif + IBM Plex Sans). Useful confirmation of continuity.
**Layout move:** Full-bleed gradient with a tight content well in the center. Hero KPIs in their product shots use the "big-number-tiny-label" pattern with the label in monospace.
**Type system:** Editorial serif for the headline word, sans for everything else. The serif is the *emotional* voice; the sans is the operational voice. This is exactly the move StockFlow's landing made.
**Density choice:** Generous for marketing, but the product screenshots show genuinely compressed lists with a luxurious mono numeric voice.
**Color strategy:** True black + warm off-white + one signal red (their brand). Cmd-key palette is the only place color clusters.
**Motion language:** Spring on hover, staged on enter. Tasteful, never showy.
**One thing worth stealing:** Mono-uppercase mini-label above every metric value. The label is small, the number is huge — the eye goes to the data, not the chrome.
**One thing to NOT copy:** Marketing-level gradient washes. A dashboard at 8am does not need rainbow gradients.

---

## 5. Rauno Freiberg — https://rauno.me

**Why I picked it:** Personal site (NON-SaaS pick #1). Rauno's site is essentially a portfolio dashboard with extreme attention to micro-interactions. It demonstrates that even radically minimal layouts can carry density when the type and rhythm are right.
**Layout move:** A single thin column with no decoration whatsoever. Sections are separated only by spacing and a tiny mono-label. This is the anti-bento.
**Type system:** One serif, one sans, one mono. Three voices, no fourth. The mono is used for metadata (dates, tags, status) which doubles as semantic punctuation.
**Density choice:** Compressed text, generous outer margins. The page reads vertically like a feed.
**Color strategy:** Pure black/white with red used exactly once on the page (a "live" indicator).
**Motion language:** Instant scroll-driven reveals. Cursor-level hover micro-interactions on every interactive element. The motion is *small* but everywhere.
**One thing worth stealing:** Mono-as-metadata. Every timestamp, branch name, status word in the recent-activity feed should be mono.
**One thing to NOT copy:** Single-column-only layout. A dashboard needs at-a-glance, which means horizontal density.

---

## 6. The Pudding — https://pudding.cool

**Why I picked it:** Editorial data journalism (NON-SaaS pick #2). The Pudding shows what a dashboard could be if you treated data viz as *narrative*, not chartjunk. Their charts have annotations baked in.
**Layout move:** Magazine-spread layouts with a chart per "page." Each chart is annotated with a sentence-long callout — the reader doesn't have to interpret.
**Type system:** Display serif (different per story) + workhorse sans. They use scale aggressively — headlines at 60px+, captions at 11px, no middle weights.
**Density choice:** Sparse on purpose. One idea per screen.
**Color strategy:** Custom palette per story, but always 3-4 colors max with one as the "this is the point" color. Background tints set mood.
**Motion language:** Scroll-driven storytelling. Sections lock into focus as you scroll.
**One thing worth stealing:** Annotated trends. Don't ship a chart of "sales over 30 days" — ship a chart with a tiny sentence: "Best Tuesday since launch." That sentence is the actual product.
**One thing to NOT copy:** Story-pacing. A dashboard cannot wait for the user to scroll-reveal — everything has to be present on first paint.

---

## 7. Arc — https://arc.net

**Why I picked it:** Polarizing pick. Arc's brand identity is intentionally over-the-top — colorful, playful, almost toy-like — in a category (browsers) that defaults to gray. Their settings dashboard manages to keep that personality without becoming illegible.
**Layout move:** Floating panels with soft shadows on a tinted background. The panels feel like cards you could rearrange — and you can.
**Type system:** One rounded sans (their custom) at three weights. The roundness is the brand voice.
**Density choice:** Generous, with intentional whitespace as "breathing room" — the brand is calm, not corporate.
**Color strategy:** A LOT of color: gradient backdrops, color-per-space, mood-tinted surfaces. Color is part of identity, not just signal.
**Motion language:** Spring everywhere, with deliberate slight overshoot. Things feel "alive."
**One thing worth stealing:** Tinted surface elevation — instead of stacking pure-white cards on a gray background, use *very-slightly* tinted surfaces that pick up the brand accent. Adds warmth without screaming.
**One thing to NOT copy:** Heavy color saturation as background. StockFlow operators need to stare at this dashboard for 9 hours — color exuberance becomes fatigue.

---

## Synthesis — what these 7 together suggest for our dashboard

The dashboard should be **a calm, dark-by-default operations console with one editorial accent that ties it back to the landing page's serif identity** — closer in spirit to Linear + Stripe than to a Bootstrap admin template. The hero zone is *not* four colored stat cards in a row; it is **one large lead KPI** (today's sales, with a tiny in-tile sparkline à la Stripe) paired with **two secondary KPIs** at smaller scale, then a wide **trend strip** with a Pudding-style one-sentence annotation, then a **list-as-dashboard** for what needs attention (low stock, recent transactions, open drawers) — Linear's discipline. Numerics live in JetBrains Mono everywhere they appear — that's the "this is live data" voice the landing established. Color usage is monochromatic neutrals + Stockflow's electric-blue brand accent for emphasis, with semantic green/amber/red reserved strictly for operational state (never decoration). Motion is instant or 200ms spring max — no rainbow gradients, no count-up cascades on every poll. Density is **balanced**: generous top zone so the lead number commands, then compressing into a single-screen scannable layout below. Mobile collapses the bento into a vertical stack but keeps the lead KPI, the alerts list, and the activity feed visible above the fold; cuts the trend strip into a swipe-tab.

---

## Existing Design Language

> Phase 1 audit. Files inspected (read-only):
>
> - `app/[locale]/(home)/page.tsx`
> - `app/[locale]/(home)/layout.tsx`
> - `app/[locale]/(home)/landing-fonts.ts`
> - `app/[locale]/(home)/landing.css`
> - `components/frontend/stockflow-hero.tsx` (legacy hero — still in repo, not currently wired into the landing route)
> - `components/landing/hero.tsx` (new `LandingHero`, actually wired)
> - `tailwind.config.ts`
> - `app/globals.css`
> - `components/Providers.tsx`
> - `i18n/routing.ts`
> - `app/[locale]/(dashboard)/dashboard/layout.tsx`
> - `app/[locale]/(dashboard)/dashboard/page.tsx`
> - `app/[locale]/(dashboard)/dashboard/analytics/dashboard/dashboard-stats.tsx` (existing analytics widget — uses MOCK data; pattern to replace)
> - `actions/analytics/financial-reports.ts`
> - `actions/analytics/requestDailySalesReport.ts`
> - `actions/customers/getOrgCustomers.ts`
> - `hooks/useCustomerQueries.ts`

### Typography — landing has its own font stack scoped to `.landing-root`

- **Display:** Instrument Serif (`--font-display`) — editorial serif, weight 400, used for landing headlines.
- **Body:** IBM Plex Sans (`--font-body`) — technical-warm sans, weights 300-700.
- **Mono/data:** JetBrains Mono (`--font-mono`) — "this is live data" voice, tabular numerals enabled (`font-variant-numeric: tabular-nums`).
- Three CSS vars (`--font-display`, `--font-body`, `--font-mono`) are exposed by `landing-fonts.ts` and joined into `landingFontVars`, applied via `className="landing-root ${landingFontVars}"` in `app/[locale]/(home)/layout.tsx`.

**Dashboard inheritance decision (per skill):** Inherit the same three fonts. The dashboard root applies the same `landingFontVars` className so:
- Section titles + lead KPI value can use `font-display` (Instrument Serif italic for the editorial moment — once or twice per page, never more).
- Body / labels use `font-body` (IBM Plex Sans).
- Every numeric value (KPIs, table cells, deltas, counts) uses `font-mono` with tabular-nums.

This way the dashboard *echoes* the landing without aping it — exactly as the override skill prescribes.

### Color tokens — TWO systems live in this repo

1. **Dashboard / shadcn system** (`app/globals.css` + `tailwind.config.ts`):
   - HSL-as-vars, semantic names: `--background`, `--foreground`, `--card`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`.
   - Chart palette: `--chart-1` through `--chart-5` (exists in both light + dark blocks). The dashboard can use these for sparklines without adding tokens.
   - Dark mode flips every token via the `.dark` class (next-themes `class` attribute).

2. **Landing-only token system** (`app/[locale]/(home)/landing.css`, scoped to `.landing-root`):
   - Ink scale: `--ink-0` through `--ink-4` (`#050811` → `#1d2a47`) — for layered dark surfaces.
   - Rule scale: `--rule-1` through `--rule-3` — 1px borders, "sharp not soft."
   - Brand: `--accent` (#2563eb electric blue), `--accent-hi` (hover), `--accent-glow` (rgba glow).
   - Signals: `--signal-up` (#10b981), `--signal-warn` (#f59e0b), `--signal-down` (#ef4444), `--signal-info` (#38bdf8).
   - Text scale: `--text-hi` → `--text-dim` (5 levels of dim).
   - Numeric: `--num`, `--num-pos`, `--num-neg`.
   - Editorial accent: `--editorial` (#d4b483 warm bone — used max twice per page).

**Continuity decision:**
- The dashboard uses the **shadcn HSL tokens** (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `chart-1..5`) because they're the ones already wired to dark/light theme toggle. This satisfies the "respect dark mode" requirement out of the box.
- For **chart colors specifically**, reuse `chart-1..chart-5` (already present in both themes — no new tokens needed).
- For **semantic signals** in the dashboard (low-stock amber, drawer-open green, error red), use the existing `--destructive` token plus map to landing's signal palette as Tailwind extensions ONLY IF the existing tokens prove insufficient. First attempt: lean on `text-amber-500/text-emerald-500/text-rose-500` *only* in the central `tailwind.config.ts` extension (NOT inline hex). If a `text-signal-warn` semantic token is needed, add it centrally — do not inline.
- **No hex literals** in any new dashboard `.tsx` file.

### Theme system — next-themes, `class` attribute

- `components/Providers.tsx` wires `NextThemesProvider` (re-export of `next-themes`'s `ThemeProvider`). `attribute="class"` is the standard config (passed via props from `app/layout.tsx`).
- Dark mode is enabled in `tailwind.config.ts` via `darkMode: ["class"]`.
- The dashboard renders inside `<Providers>`, so theme tokens auto-flip — no per-widget work required.
- **Action:** Verify chart gridlines / skeletons are visible in both themes during Phase 5.

### i18n system — next-intl with `as-needed` prefix

- `i18n/routing.ts` exports `routing` with `localePrefix: "as-needed"`. Default locale `en` has no URL prefix (`/dashboard`); `fr` does (`/fr/dashboard`).
- Locale cookie: `STOCKFLOW_LOCALE` (1-year max-age).
- Catalogs: `messages/en.json` + `messages/fr.json`. There is already a top-level `"dashboard"` key in both (line 651 in en.json) — new dashboard keys nest under it.
- Hook: `useTranslations("dashboard")` returns `t("...")` resolving from the active catalog. Forms also have a wired `installZodErrorMap` in `<Providers>` for validation messages.
- **Direction map:** Both EN/FR are LTR. Components should still prefer logical-property utilities (`ms-*`, `me-*`, `ps-*`, `pe-*`) per `i18n/routing.ts` guidance.

### Data layer — server actions → TanStack Query hooks → components

- Server actions live in `actions/<domain>/*.ts`, are `"use server"`, validate with Zod, return `{ success, data | error }` via `services/_shared/action-response` helpers (`ok`, `err`, `okPaginated`).
- Hooks live in `hooks/*.ts` or `hooks/<domain>Hooks/` folders. Convention:
  - Export a `<Domain>Keys` const for query keys (e.g., `CustomerKeys.all`, `CustomerKeys.list(params)`).
  - One hook per query (e.g., `useCustomers`, `useCustomer(id)`).
  - Mutations use `notify.formSuccess` / `notify.formError` / `notify.error` from `lib/notification-utils` for user feedback — these are already i18n-bound via `<NotifyI18nBridge>` in Providers.
- **Pattern noted (from memory):** there is NO services layer for the dashboard — it's strictly `actions/` → `hooks/` → components. Don't introduce one.
- **Existing analytics actions:** `actions/analytics/financial-reports.ts` exposes `FinancialSummaryReport`, `CashierPerformanceReport` types and presumably a `getFinancialSummary(...)` function (TBC by reading the rest of the file at impl time). `requestDailySalesReport` is a fire-and-forget Inngest job kickoff, NOT a query — different shape.

### Existing dashboard widgets — current state

- `app/[locale]/(dashboard)/dashboard/page.tsx` is 11 lines: it renders `<DashboardLayout><DashboardOverview /></DashboardLayout>` — both in `components/dashboard/`. The actual current dashboard lives in `components/dashboard/DashboardOverview.tsx`.
- `app/[locale]/(dashboard)/dashboard/analytics/dashboard/*.tsx` contains widget components (alerts-card, cashier-performance-card, dashboard-stats, quick-actions-card, recent-transactions-card, revenue-chart, top-products-card) — these are the closest existing prior art and SOME of them use mock arrays (`dashboard-stats.tsx` line 8 hardcodes a `stats = [{...}]`). These are exactly the anti-pattern the skill calls out.
- The `(dashboard)` route group exists and shares `Navbar` chrome via `dashboard/layout.tsx`. Anything new lives under `dashboard/` and inherits the navbar automatically.

### Components library — shadcn-on-Radix

- `components/ui/` contains the shadcn primitives: `card.tsx`, `badge.tsx`, `button.tsx`, `skeleton.tsx`, etc. Use these — do not invent parallel primitives.
- Notification UX goes through `EnhancedNotificationProvider` (already mounted in `<Providers>`) via the `notify.*` helpers in `lib/notification-utils.ts`. Do not introduce react-hot-toast or sonner.

### Concrete decisions feeding Phase 2/3

1. Dashboard root applies `landingFontVars` so the three font CSS vars are in scope, *but* the dashboard sits OUTSIDE `.landing-root` — it uses the shadcn HSL tokens (which flip with theme), not the landing-only ink/rule/signal palette.
2. Chart palette: `chart-1..5` (already exist in both themes).
3. Numeric display: `font-mono` with `font-variant-numeric: tabular-nums` (utility class needed: `tabular-nums` — Tailwind has it built-in via `font-variant-numeric` support, no config change required).
4. i18n namespace: extend the existing `"dashboard"` key in both `messages/en.json` and `messages/fr.json`. New subkeys: `dashboard.kpi.*`, `dashboard.trends.*`, `dashboard.alerts.*`, `dashboard.activity.*`, `dashboard.actions.*`, `dashboard.empty.*`, `dashboard.errors.*`.
5. Data sources: lean on `actions/analytics/financial-reports.ts` for today's sales / hourly breakdown; net-new aggregations (low-stock list, recent POS transactions, active sessions count) go into NEW `actions/analytics/*.ts` files — never inline Prisma in components.
