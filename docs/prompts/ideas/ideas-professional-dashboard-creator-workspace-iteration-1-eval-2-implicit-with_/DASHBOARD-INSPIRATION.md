# DASHBOARD-INSPIRATION.md — StockFlow Admin Home Redesign

> The user's complaint: "looks really generic — basically four colored stat cards and a chart."
> The reference set below is deliberately tilted toward polarizing, non-template-like work. None of these is a "safe SaaS dashboard." That's the point.

---

## 1. Linear — linear.app/method
**Why I picked it:** Linear is the touchstone for "every pixel is decided," and the `/method` page applies that to a content surface, not a marketing fold. It proves dense, opinionated information design can coexist with calm.
**Layout move:** A constrained center column with full-bleed contextual bands. Reads like a long-form essay punctuated by data. NOT a 12-col grid.
**Type system:** One geometric sans, tightly tuned. Display weight is the *same family* as body — they earn hierarchy through size + tracking, not by switching typefaces.
**Density choice:** Generous between sections, tight inside each block. The opposite of "evenly spaced cards."
**Color strategy:** Near-monochrome with one signature accent (Linear purple). Status earns color; nothing else does.
**Motion language:** Almost none. Subtle scroll-tied opacity. The restraint reads as confidence.
**One thing worth stealing:** Asymmetric vertical rhythm — section to section, no two gaps are equal. Kills the "template" feel instantly.
**One thing to NOT copy:** The brand purple. We have a brand (electric blue + editorial bone), don't co-opt theirs.

---

## 2. Vercel Dashboard (Observability) — vercel.com/dashboard
**Why I picked it:** It's an actual product dashboard that doesn't look like an admin template. The team clearly fought "four stat cards in a row."
**Layout move:** Hero KPI strip is *one wide unit* (revenue, requests, edge-time, errors) — not four cards with borders. Beneath it: an asymmetric pairing of a tall chart and a short list, then a single-column activity feed.
**Type system:** Geist Sans for chrome, Geist Mono for every number. Numbers always tabular. Reads as a control surface, not a spreadsheet.
**Density choice:** Compressed — they trust you to read small. Tabular nums make 10pt feel correct.
**Color strategy:** Monochrome + brand black/white. Charts use 1-2 accent stops; everything else is grayscale.
**Motion language:** Instant. No springs, no fades on data. Data appearing means data is real.
**One thing worth stealing:** Hero KPI as a single wide unit (subdivided by hairline dividers), not four bordered cards. This single move kills 80% of "generic dashboard" smell.
**One thing to NOT copy:** Their grayscale-everywhere — StockFlow already has an editorial bone accent and a brand blue we should keep using.

---

## 3. Stripe Dashboard (Atlas / Sigma views) — stripe.com
**Why I picked it:** Stripe is the masterclass in "make money data feel calm." The Sigma surface in particular treats a number like an essay subhead, not a digit on a billboard.
**Layout move:** Sidebar-as-navigation that's quiet (no gradients, no badges shouting). Main content is column-major with a strong rag-right text rhythm. Tables earn their space.
**Type system:** Sohne / Camphor. Big numerals use the *same* face as body — no separate "display number font." Tracking and weight do the work.
**Density choice:** Balanced. Tables are tight; cards breathe. The asymmetry of density is itself information.
**Color strategy:** Stripe purple is *page chrome only*. Inside the data surface: black/gray/green/red. Charts: brand-aware accent, never decorative palette.
**Motion language:** Staged on first paint, instant after. Data updates don't animate — they replace. This makes "the data is real" the dominant feeling.
**One thing worth stealing:** Treat the brand color as a chrome accent, not a decoration *inside* widgets. (Our current dashboard puts brand color into every card background — that's why it feels generic.)
**One thing to NOT copy:** Their sidebar density assumes a power user who lives in Stripe daily. Our owner persona is in StockFlow 10 minutes a day at 8am.

---

## 4. Rauno Freiberg — rauno.me
**Why I picked it:** A personal site that treats interaction itself as the design. Polarizing on purpose. Forces me to think about feedback, not just layout.
**Layout move:** Floating, near-overlapping panels with editorial typography for chrome and mono for data. Borders are 1px hairlines, never soft shadows.
**Type system:** Editorial serif for chrome + tight sans for body + mono for metadata. Three voices, each doing one job. (StockFlow's landing already does exactly this — Instrument Serif + IBM Plex + JetBrains Mono. We must extend it here.)
**Density choice:** Compressed and confident. Trusts the reader.
**Color strategy:** Near-monochrome ink, single accent, signal colors only for actual signals.
**Motion language:** Spring-physics on hover, but only for items the user *can* act on. Static items don't move.
**One thing worth stealing:** Hover/press should *teach the user what is interactive*. Currently the dashboard has every card hovering identically — none of them teach.
**One thing to NOT copy:** The serifs-everywhere approach. Our serif is reserved for hero numerals + section eyebrows; mono carries the operational voice.

---

## 5. Bloomberg Terminal (and the modernized Bloomberg.com/markets) — bloomberg.com/markets
**Why I picked it:** This is the polarizing one. Bloomberg's terminal aesthetic — black ground, mono numerals, status colors that mean something — is what a *real* operations cockpit looks like before designers prettify it. The brief calls for "operations terminal." We should look the part.
**Layout move:** Ticker bands across the top. Data tables, not cards. Sparklines inline with rows, not in separate cards. Every number is tabular and right-aligned.
**Type system:** Mono for numbers, sans for chrome, never any decorative type. The lack of editorial flourish IS the design statement.
**Density choice:** Compressed to the point of discomfort for non-operators — but operators love it because every glance returns ten facts.
**Color strategy:** Black ground + green up + red down + amber warn. Used exclusively as signals. Never decoration.
**Motion language:** Counters tick. Status pulses. Nothing else animates.
**One thing worth stealing:** A live ticker strip under the page header carrying the 4-5 numbers an owner glances at hourly (today's sales, transactions, cash on hand, open sessions, low-stock count). This *replaces* the four colored stat cards entirely.
**One thing to NOT copy:** The maximalist density. We're designing for a small-business owner, not a trader. Bloomberg uses 11px; we use 13-14px.

---

## 6. Are.na — are.na (and the Are.na block view)
**Why I picked it:** A non-SaaS reference. Are.na is what happens when designers refuse the 12-column grid and refuse hero imagery. Every block earns its place by content alone.
**Layout move:** A masonry-like content grid with intentionally inconsistent block heights. Negative space is treated as content. NO hero, NO above-the-fold sales pitch.
**Type system:** One serif, one sans, both used at small sizes. Italics carry meaning (not decoration). Numbers don't get special treatment because the site isn't about numbers.
**Density choice:** Generous. They'd rather show fewer things well than many things half-baked.
**Color strategy:** Monochrome + a single editorial cream/bone. (Coincidentally close to our `--editorial: #d4b483`. Validates that direction.)
**Motion language:** Instant.
**One thing worth stealing:** Inconsistent block heights, on purpose. Our current dashboard uses 4×equal cards, then 2×equal charts, then 2×equal lists. That uniform rhythm is the template smell. Mix tall/short/wide blocks intentionally.
**One thing to NOT copy:** Negative space as content — a dashboard at 8am has to *answer questions fast*; we can't ask the operator to "appreciate the whitespace."

---

## 7. Datawrapper case studies — datawrapper.de/blog
**Why I picked it:** Data-dense done well. They've published dozens of editorial chart redesigns where the "before" looks like our current dashboard and the "after" looks like a New York Times graphic. Concrete vocabulary for fixing charts.
**Layout move:** Charts breathe. Annotations live next to data, not in legends below. Tooltip is replaced by direct labels wherever possible.
**Type system:** One sans, one mono. Mono ONLY on the data; sans everywhere else. Captions in italic body.
**Density choice:** Balanced — they let one chart claim the page.
**Color strategy:** ColorBrewer-style sequential or diverging palettes for chart data; brand color reserved for highlighting "the bit the editor wants you to notice." Most chart marks are neutral gray; one mark is brand color.
**Motion language:** None on chart load — chart appears in its final state. The point is reading, not entertainment.
**One thing worth stealing:** Charts annotate themselves inline. A sales-trend chart should show "this is today" with a label on the line, not in a separate legend. Our current AreaChart hides everything in a Recharts tooltip — the chart is dead until you hover.
**One thing to NOT copy:** Editorial chart styling for *every* widget. Some widgets (the alerts table) need to be terse, not chart-y.

---

## Synthesis — what these 7 together suggest for StockFlow's dashboard

Five moves rise to the top:

1. **Replace the four colored stat cards with a single hero KPI strip** subdivided by hairline rules (Vercel + Bloomberg). The strip uses our existing `--ink-2` ground, `--rule-1` dividers, mono numerals (JetBrains Mono — already loaded for the landing), and editorial serif italics for the section eyebrow ("today's command"). One unit, four data points, zero generic-card aesthetic.
2. **Adopt the landing page's ink palette and three-voice typography on the dashboard.** Instrument Serif for hero numerals + eyebrows, IBM Plex Sans for chrome and body, JetBrains Mono for every number. This is the single highest-impact continuity move — the dashboard currently uses none of these. (Linear + Rauno + landing audit.)
3. **Inconsistent block heights, on purpose.** Tall trend chart paired with a short sparkline tile; wide alerts table next to a tall activity feed. The current uniform 2×2 + 2×2 grid is what reads as "Bootstrap." (Are.na move.)
4. **Color used for signals only, brand for chrome only.** Strip the gradient backgrounds out of every card; reserve `--signal-up`, `--signal-warn`, `--signal-down` for actual operational meaning; reserve `--accent` for navigation and hero CTAs. Cards default to `--ink-2` surface with `--rule-1` border. (Stripe + Bloomberg.)
5. **Charts annotate themselves.** Inline labels on lines ("today," "yesterday avg"). Drop the legend-below pattern. Static after load. Tooltip is enrichment, not the primary read. (Datawrapper.)

The synthesis: the dashboard should look like the landing page's hero preview *grew up*. Same ink, same fonts, same restraint — applied to real operator data, at desk density instead of marketing density.

---

## Existing Design Language — audit of what to inherit

Read these StockFlow files during Phase 1:

- `app/[locale]/(home)/page.tsx` — landing composition (Hero → DisconnectProblem → ConnectedWorkflow → ModuleGrid → ModuleDeepDives → AutomationSection → TrustSection → UseCases → FinalCTA)
- `app/[locale]/(home)/layout.tsx` — `.landing-root` wrapper sets fonts + tokens
- `app/[locale]/(home)/landing-fonts.ts` — Instrument Serif (display), IBM Plex Sans (body), JetBrains Mono (mono)
- `app/[locale]/(home)/landing.css` — `--ink-0..4`, `--rule-1..3`, `--accent`, `--signal-{up,warn,down,info}`, `--editorial`, `--text-{hi,mid,lo,faint,dim}`, `--num`, `.landing-grid-bg`, `.landing-grain`, `.eyebrow`, `.display`, `.display-italic`, `.body-text`, `.data-text`, `.live-dot` keyframes, `.frame-glow` border treatment
- `components/landing/hero.tsx` — atmosphere, eyebrow, mixed serif/sans headline, accent CTA pill
- `components/landing/hero-dashboard.tsx` — sparkline pattern, ticking-number pattern, status dots — the visual language we should extend into real widgets

### What to inherit verbatim
- `--ink-0..4` surface scale → use as background + card ground in the dashboard
- `--rule-1..3` borders → 1px hairlines, no soft shadows
- `--accent` + `--accent-hi` + `--accent-glow` → CTAs and active nav only
- `--signal-{up,warn,down,info}` → operational signals only
- `--editorial` → reserved for hero numerals + section eyebrows (used 2-3 times max per page)
- Instrument Serif → display + numerals + section eyebrows
- JetBrains Mono → every number, every metadata pill, every timestamp
- IBM Plex Sans → body, button labels, chrome
- `.live-dot`, `.landing-grain`, `.eyebrow`, `.display`, `.display-italic`, `.data-text` utility classes — port to the dashboard scope or restate under a `.dashboard-root`

### What NOT to bring over
- The `.landing-grid-bg` background grid (too marketing-y inside the app shell)
- Animated tickers (the ticker concept is great, the marquee animation is not — a static row of fresh numbers reads better at 8am)
- Hero gradients (radial glows belong in marketing, not in working surfaces)
- Framer Motion stagger on every element — the dashboard should *be there* when the user lands, not stage in

### What's missing and must be added (centrally, not inline)
- `--chart-*` token mapping for our palette — currently the existing global tokens use HSL `--chart-1..5` but values are unset for our ink theme. Either map them to a sequential palette derived from `--accent` and `--signal-info`, or add `--chart-accent-{0..4}` to `landing.css` and reference both from a shared dashboard CSS file.
- A `.dashboard-root` wrapper class mirroring `.landing-root` so the same CSS variables and font variables apply in the `(dashboard)` route group. (Currently the dashboard has none of these; that's why it falls back to default Tailwind colors.)
