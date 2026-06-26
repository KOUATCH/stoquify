# Dashboard Inspiration — StockFlow Stats Page

The user named two references explicitly: **Linear** and **Vercel**. Those are 2 of the 7 — honored verbatim. The remaining 5 are chosen to (a) cross-pollinate beyond SaaS, (b) include 2 non-SaaS picks, and (c) include 1 deliberately polarizing pick, per the skill's rules.

The brief is a *stats page* (trend-heavy, not a CRUD home), so the synthesis tilts toward "editorial data terminal" rather than "operator cockpit." This complements — does not replace — the operator dashboard at `/dashboard`.

---

## 1. Linear — https://linear.app (USER-SPECIFIED)

**Why I picked it:** Sets the modern bar for "calm interface that hides complexity." The Linear aesthetic is the dictionary entry for premium SaaS density.
**Layout move:** Single-column-feel even when multi-column. Generous left rail, content body that *breathes* at desktop widths, almost no chrome. Section dividers are 1px hairlines, never shadows.
**Type system:** Inter (their custom variant) at extremely tight tracking. Display is sans, never serif. Numerals are tabular. The labels are smaller than you'd expect (12–13px) — they trust the user to lean in.
**Density choice:** Balanced — leaning compressed. Rows are 32–36px tall. Spacing scale is small but consistent (4 / 8 / 12 / 16 / 24, rarely larger).
**Color strategy:** Near-monochrome. One accent (their indigo/violet). Status colors are *desaturated* — green is a sage, red is a brick, never poster colors. Background and surface differ by ~3% lightness.
**Motion language:** Instant. ~120ms ease-out on hover, ~180ms on enter. No springs. Nothing bounces. Trust comes from speed.
**One thing worth stealing:** The "everything is 1px hairline" rule. No shadows on cards, no glassmorphism — just rules that disappear when ignored and snap to attention when needed.
**One thing to NOT copy:** Their density assumes a power user with a 27" monitor. Our 8am operator may be on a 13" laptop. We borrow the rhythm, not the row height.

---

## 2. Vercel — https://vercel.com (USER-SPECIFIED)

**Why I picked it:** The reference for "developer-tool meets editorial design." Vercel's dashboard makes deployment status feel like reading a well-set table of contents.
**Layout move:** Bento-style asymmetric grid for the project home — one large hero tile (the deployment) flanked by smaller stat tiles. Charts get full-bleed cards with title floated top-left and a tabbed range selector top-right.
**Type system:** Geist (their own sans + mono). Display sizes are restrained — even h1 rarely exceeds 28px in app shell. Mono is used for any identifier (commit SHA, URL, env var) — earns its place.
**Density choice:** Balanced. Card padding is generous (24–32px), but the data inside is dense. The page never feels cluttered because the *gaps between cards* do the breathing.
**Color strategy:** True monochrome (white/black + slate). Status uses 4 colors max: success green, warning amber, error red, info blue. No brand color inside the dashboard surface — brand lives on the marketing site.
**Motion language:** Staged on page enter (cards fade-up in a 40–60ms cascade). Hover is instant. Number changes use a subtle slot-machine tick.
**One thing worth stealing:** The "title left, controls right" header pattern on every chart card. And the *tabbed* time-range selector that doesn't open a popover — the ranges (24h / 7d / 30d) are visible inline.
**One thing to NOT copy:** Their reliance on Geist locks you into their font. We have Instrument Serif + IBM Plex Sans + JetBrains Mono already — those three pull the same weight.

---

## 3. Stripe Dashboard — https://dashboard.stripe.com (Stripe.com mockups for unauthenticated reference)

**Why I picked it:** The gold standard for *financial* data density. Stripe figured out how to make a row of numbers feel like the lede of a news article.
**Layout move:** Hero KPI strip at the top — but the KPIs *include a sparkline inside the tile*. The sparkline is muted (5–10% opacity fill) so the number still wins; the line just adds context. Below the strip: one wide trend chart, then tabular breakdowns.
**Type system:** Sohne (custom). Numbers are oversized relative to their labels (3:1 ratio is typical — number is 32px, label is 11px). Tabular numerals everywhere.
**Density choice:** Compressed in tables, generous in the hero strip. The contrast in density tiers tells the user where to look first.
**Color strategy:** Monochrome ink + a single Stripe purple accent. Charts use a *desaturated rainbow* — never the pure tailwind palette. Green = "+", red = "-", everything else gets a neutral gray-blue.
**Motion language:** Almost none. Hovers reveal a 1px ring; clicks navigate. The dashboard *feels fast* because nothing animates that doesn't need to.
**One thing worth stealing:** Sparkline-inside-KPI-tile. It's a 4-second-comprehension win — the operator gets both the number and its 7-day shape in one glance.
**One thing to NOT copy:** Their sidebar is enormous (220px). On a stats page where the chart needs every pixel of horizontal room, we let the sidebar collapse.

---

## 4. Rauno Freiberg — https://rauno.me (NON-SaaS #1)

**Why I picked it:** Personal site of one of the most influential interaction designers working today. Cross-pollination from "portfolio" into "dashboard" forces us to think about *narrative* and *editorial pacing*, not just info density.
**Layout move:** Asymmetric, deeply considered. Long-form text columns sit beside narrow margin notes (à la Tufte). Tables are *typeset* like editorial — rules between rows, never zebra stripes.
**Type system:** Serif body (Tiempos) with a sans label voice. The serif elevates everything around it — even a tiny "Last updated" tag feels intentional.
**Density choice:** Generous. The page *breathes*. Trades information density for editorial confidence. Works because every element earns its place.
**Color strategy:** Off-white + ink-black. Color is reserved for one thing per page — a chart, a link hover, a single interactive demo. Restraint as a brand value.
**Motion language:** Staged, intentional. Page enters cascade from top. Hovers feel like a magazine — restrained, slightly slowed.
**One thing worth stealing:** *Margin notes* — small annotations to the right of charts that explain anomalies ("Black Friday spike — +340% vs prior week"). Operators love these; they convert raw numbers into narrative.
**One thing to NOT copy:** The reading-list pacing. A stats page can be calm, but it can't be a *long read*. Cap the scroll at 2 viewport heights.

---

## 5. Datawrapper Gallery — https://www.datawrapper.de/charts (NON-SaaS #2, data-dense done well)

**Why I picked it:** Datawrapper's chart gallery is the antidote to "ship the default Chart.js theme." Every example demonstrates restraint, type-led labeling, and color use that a newsroom would publish.
**Layout move:** Every chart is laid out as if it were a magazine figure: title, deck (subtitle), chart, caption, source line. The *caption* is the trick — it answers "so what?" in one line.
**Type system:** Lyon (serif) for titles, source-sans for body. The serif title makes a bar chart feel like it has authority — the Financial Times effect.
**Density choice:** Generous in the figure margin, compressed inside the chart. The chart is small but the surrounding white space frames it.
**Color strategy:** Print-publication palette — desaturated, accessible, intentionally muted. Datawrapper has color presets explicitly tuned for colorblind users. Steal the palette wholesale.
**Motion language:** None in print mode; subtle hover tooltips when interactive. The point: data doesn't need to animate to be impressive.
**One thing worth stealing:** *Caption-as-conclusion*. Below every chart, a one-line takeaway ("Sales grew fastest on weekends. Staffing follows."). It turns a stats page from a wall of charts into a story.
**One thing to NOT copy:** The print aesthetic is sometimes too quiet for a web product — we need a touch more interactive affordance (hover states, click-through to drill).

---

## 6. Arc Browser — https://arc.net (Polarizing pick)

**Why I picked it:** Arc is *polarizing on purpose*. Their sidebar replaces tabs. Their colors are saturated gradients. Their motion is bouncy. People either love it or refuse it. That tension is where genuinely new design moves come from.
**Layout move:** Floating side panels with rounded corners *inside* a colored "canvas" background — chrome contains content, content doesn't fill chrome. Inverts the modern dashboard default.
**Type system:** Larger than expected for a productivity tool. Body is 16–18px in places. Display uses unusual weights (300 with very loose tracking on headlines). They lean *editorial-tech*, not pure-tech.
**Density choice:** Generous to a fault. Trades efficiency for *spatial calm*. Their bet: a calm app is a frequently-opened app.
**Color strategy:** Saturated gradients as canvas color. Brand peach + plum that shift through the day. The work area itself is neutral, but the *frame* is alive.
**Motion language:** Springy. Bouncy. Things scale on press. It's the opposite of Linear. It's also memorable.
**One thing worth stealing:** The *colored canvas behind a neutral content panel* idea. Apply once: the StockFlow stats page sits inside a faint accent-tinted page background (var(--ink-1) with a 4% accent wash), and the chart panels float on top in neutral surface tokens. Subtle, but it kills the "white page with floating cards" generic look.
**One thing to NOT copy:** The bounce. Our brand voice on the landing page is "operations terminal" — bouncy motion would feel wrong.

---

## 7. The Pudding — https://pudding.cool (NON-SaaS #3, editorial data)

**Why I picked it:** Editorial data journalism. Every Pudding piece is a stats page disguised as a story. They prove that *narrative scaffolding* makes data stickier.
**Layout move:** Scrollytelling — the chart sits sticky on the right, the explanatory text on the left scrolls past, the chart updates as the text crosses thresholds. Overkill for an everyday dashboard, but the *vocabulary* (chart-as-protagonist, text-as-guide) translates.
**Type system:** Serif headlines, sans body. Massive section breaks. The type sets a *pace* — slow and confident — that matches reading data.
**Density choice:** One idea per viewport. They cut everything that isn't load-bearing. The page is taller than it is dense.
**Color strategy:** One distinctive accent per story (varies). Everything else is muted. The accent earns its loudness by being the only loud thing.
**Motion language:** Staged with scroll. Charts animate *on enter*, never on a loop. Once it's drawn, it stays.
**One thing worth stealing:** *Section headers that include a takeaway in italic underneath the title*. ("Revenue · last 30 days / *up 14%, driven by weekend volume*"). The italic line is the editorial voice — pure information, but it reads warm.
**One thing to NOT copy:** The full scrollytelling treatment. A dashboard user doesn't want to scroll a story to get a number. We steal the *headline-with-italic-summary* pattern, not the scroll-bound chart updates.

---

## Synthesis — what these 7 together suggest for our stats page

The pattern across the seven is consistent: **type-led, restrained, narrative-aware**. From Linear and Vercel we take the 1px-hairline discipline and the bento header layout. From Stripe we steal the sparkline-inside-KPI tile — the four-second comprehension win. From Rauno and The Pudding we take editorial gestures we'd normally reject as "too much" for an admin: italic takeaway lines under chart titles, margin notes for anomalies, captions that answer "so what?" From Datawrapper we take a print-quality color palette and per-chart deck/caption pairs. From Arc we steal one polarizing move — a tinted page canvas that makes neutral chart panels float — applied exactly once. The dashboard should feel like *a financial newspaper that happens to be live*: deep, calm, opinionated about what matters, and aesthetically continuous with StockFlow's "operations terminal" landing-page voice. The numbers are the protagonists. Everything else is supporting cast.

---

# Existing Design Language (Phase 1 — Continuity Audit)

Read against the StockFlow codebase. The landing page sets a strong, distinctive register; the stats page must echo it without copying it.

## Typography

Three font voices already loaded via `app/[locale]/(home)/landing-fonts.ts`:

| Voice | Font | When to use |
|---|---|---|
| Display | **Instrument Serif** (`--font-display`) | Page titles, hero KPI numerals, italic editorial accents ("command", "today") |
| Body / UI | **IBM Plex Sans** (`--font-body`) | All body copy, button labels, table cells, form inputs |
| Data / mono | **JetBrains Mono** (`--font-mono`) | All numerals in tables, ticker, badges, identifiers, timestamps. Tabular numerals (`font-feature-settings: "tnum"`) |

**Constraint:** the dashboard route group does NOT currently load these fonts (only `(home)/layout.tsx` does). If the stats page wants to use Instrument Serif for hero numerals, the dashboard layout must opt-in. The lazy path is system fonts; the right path is to add the display + mono variables to `(dashboard)/layout.tsx`. **Recommend:** add display + mono only (skip the serif body); the body stays IBM Plex Sans (already the default).

## Color tokens

Two color systems exist in parallel — they must coexist and not collide:

1. **Global shadcn HSL tokens** (`tailwind.config.ts` + `app/[locale]/globals.css`): `--background`, `--foreground`, `--card`, `--border`, `--primary`, `--muted`, `--accent`, `--destructive`, `--chart-1..5`. Used by every component in `components/ui/`. Auto-flips dark/light via `next-themes` class on `<html>`.
2. **Landing-scoped tokens** (`landing.css`, scoped under `.landing-root`): `--ink-0..4`, `--rule-1..3`, `--accent` (electric blue `#2563eb`), `--signal-up/warn/down/info`, `--editorial` (warm bone `#d4b483`), `--num`, `--num-pos`, `--num-neg`. **Dark-only.**

**Decision:** the dashboard uses the **global shadcn HSL tokens** as primary (so dark/light theme switching just works), but borrows two visual ideas from the landing layer:
- The `--editorial` warm bone color → added as a new global token `--accent-editorial` (HSL form), used once per page on the page title's italic word.
- The `--signal-up/warn/down` semantic color *concept* → mapped onto existing `--primary` / `--destructive` and two new tokens `--signal-up` / `--signal-warn` (HSL form) for delta indicators.

No hex literals in `.tsx`. Any net-new tokens land in `globals.css` first.

## Spacing rhythm

Tailwind default scale, used predictably. Landing uses a 64px grid (`landing-grid-bg`). Dashboard inherits the 4 / 8 / 12 / 16 / 24 / 32 / 48 rhythm. Card gaps are `gap-4` (16px) at mobile, `gap-6` (24px) at desktop. Card padding is `p-6` (24px) standard, `p-8` for the hero strip.

## Components reused (shadcn primitives — all present in `components/ui/`)

`Card`, `CardHeader`, `CardTitle`, `CardContent`, `Button`, `Badge`, `Skeleton`, `Tabs`, `Separator`, `Tooltip`, `Select`, `ScrollArea`. **Charts:** `chart.tsx` wraps Recharts — use it, do not add a second chart library.

## Theme system

`next-themes` via `<Providers>`. Class-based dark mode (`darkMode: ["class"]`). The user can toggle. Every chart palette must work in both themes — Recharts gridlines need explicit `stroke="hsl(var(--border))"` so they flip with the theme.

## i18n system

`next-intl` with `localePrefix: "as-needed"` — English has no prefix, French gets `/fr/`. Catalogs in `messages/en.json` and `messages/fr.json`. A `"dashboard"` namespace already exists; the stats page will add a sibling `"dashboard.stats"` sub-namespace. **French length tolerance: budget +20% for every label.**

## Data layer

Pattern is strict: **server actions (`actions/`) → TanStack Query hooks (`hooks/`) → UI components**. No services layer. For the stats page:

- **Sales trends:** `actions/analytics/financial-reports.ts` already has `FinancialSummaryReport` (revenue, profit, top items, hourly breakdown). A new action `actions/analytics/getSalesTrendSeries.ts` is needed for *daily series over N days* — that aggregation isn't there yet.
- **Inventory snapshot:** `actions/inventory/inventoryAlerts.ts` + `actions/stock/` cover low-stock counts.
- **Top items / categories:** existing `topSellingItems` field on `FinancialSummaryReport`.
- **Hourly heatmap:** `hourlyBreakdown` field already exists.
- **Hook:** `hooks/useDailySalesReporting.ts` currently a stub — note in `IA-NOTES.md` that the stats page query layer must add a real `useSalesTrendSeries` hook, *not* extend the stub.

## Existing dashboard `i18n` keys

`messages/en.json` already has a `"dashboard"` block with `overviewTitle`, `metrics`, `charts`, `quickActions`, etc. The stats page adds a **new** sibling `"stats"` namespace under `"dashboard"` rather than overloading the existing keys — keeps the operator dashboard and stats page independently translatable.
