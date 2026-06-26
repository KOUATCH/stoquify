# Dashboard Inspiration — StockFlow Branch Manager Control Center

Persona is a branch manager opening the app at 8am. They are not a marketer or an exec. They need an operator control room — every glance answers "what's safe / what needs me / what's bleeding". Bias the seven references toward control rooms, trading terminals, NOC dashboards, mission control, and the few SaaS surfaces that have nailed the operator stance — not generic admin templates.

---

## 1. Linear — Inbox / Triage view — linear.app
**Why I picked it:** Operator-first triage UI that proves a "what needs me right now" feed can be visually calm. The opposite of bullet-pointed Bootstrap admin.
**Layout move:** Two-pane (rail + content) with the content pane subdivided into stacked "groups" (DRAFT / SUBMITTED / NEEDS REVIEW) that compress when not the focus. The whole page reads top-to-bottom in priority order.
**Type system:** Inter at three sizes only — 13/14/22. Numerals are tabular. Display weights stay quiet; the data is loud, not the chrome.
**Density choice:** Compressed. Row height ~32px, gap rhythm of 8px. Trades whitespace for "I can see 25 things without scrolling."
**Color strategy:** Monochrome neutrals + a single brand violet for "this is yours." Status badges use saturation-controlled greens/ambers/reds as signal, never decoration.
**Motion language:** Instant. State changes are the value; animation never gets in the way.
**One thing worth stealing:** Group headers double as filters — click "Pending approval (3)" and the rest collapses. Perfect for the purchase-approval zone.
**One thing to NOT copy:** Their keyboard-first chrome only works because their users are devs. Branch managers will mouse + touch.

## 2. Bloomberg Terminal (current redesign concept) — bloomberg.com/professional
**Why I picked it:** The original operator control room. Polarizing on purpose — taught me density done deliberately doesn't have to feel cluttered if every region is labeled, framed, and earns its pixels.
**Layout move:** Tiled regions, each with its own header bar (label + last-updated timestamp + tiny refresh affordance). No widget bleeds into another.
**Type system:** All-caps labels in a narrow sans; numeric content in a monospace; everything else is suppressed. The visual hierarchy IS the data hierarchy.
**Density choice:** Maximum — designed for users who keep the screen open for 8 hours. Trades discoverability for muscle memory.
**Color strategy:** Inverted (dark base) with the entire palette being "neutral / up / down / alert" — four states, nothing else.
**Motion language:** None except for a 1-frame flash on data change. The "ticked" feeling is the whole motion vocabulary.
**One thing worth stealing:** Every region has a 12px caption with the *last refreshed at*. Branch managers need to know "is this stale or current?" without clicking.
**One thing to NOT copy:** All-caps everywhere is hostile in French (longer words, capital diacritics ugly). Use sentence case for our labels.

## 3. Datadog — Service Map / Incident view — datadoghq.com
**Why I picked it:** Best-in-class "what's on fire right now" surface — the canonical NOC stance applied to SaaS.
**Layout move:** Top strip is health summary (4-6 KPIs across), then a "what's red" zone immediately below, then trends underneath. Operators triage top-down; they never have to scroll for the bad news.
**Type system:** Body 13px, KPI numerals 28-32px, single display weight. KPI captions are 11px UPPERCASE — used sparingly because they earn it.
**Density choice:** Balanced — denser than Linear, less than Bloomberg. Right for ~30-second glance, then drill.
**Color strategy:** Semantic only. Brand purple shows up exactly twice (logo + active nav). The rest is neutral + signal.
**Motion language:** Crossfade for skeleton→data (180ms). No bounce. Spinners only on user-initiated refreshes, never on initial load.
**One thing worth stealing:** The "incident strip" between KPIs and trends is collapsible — when there are no incidents it shrinks to a single line "All systems normal." Empty state is itself a status signal.
**One thing to NOT copy:** Their service map graph viz — overkill for a branch with 3 terminals and 1 cash drawer.

## 4. Stripe — Dashboard Home — stripe.com
**Why I picked it:** Most refined "post-login operator home" in SaaS. Everyone copies it; almost nobody gets the restraint right.
**Layout move:** Single column at narrow widths, asymmetric 2/3 + 1/3 split at wide. Hero KPIs are huge but never more than four. Activity feed lives in the narrow column.
**Type system:** Display serif for the hero number ("$12,847 today"), grotesk sans everywhere else, mono for transaction IDs. Three voices, three jobs.
**Density choice:** Generous — Stripe is designing for founders, not operators. Branch managers want more compression than this.
**Color strategy:** Almost monochrome — Stripe purple as the brand stamp, semantic greens for "settled" and ambers for "pending." Charts use a 4-color sequential ramp.
**Motion language:** Spring-eased number tickers on hero KPIs (just on first load). Hover states are color shifts, not transforms.
**One thing worth stealing:** The hero "today" number with comparison to yesterday and to target — exactly what branch managers want for "sales vs target."
**One thing to NOT copy:** The marketing-y "Welcome back, Alex" greeting. Branch managers don't need a hug at 8am.

## 5. NASA Eyes on the Solar System — eyes.nasa.gov
**Why I picked it:** A non-SaaS, non-financial control center. Cross-pollination pick. Teaches that "control room" doesn't mean "ugly admin."
**Layout move:** Full-bleed canvas with overlay panels that the operator can dismiss. The data is the page; chrome floats over it. Inverts the SaaS assumption.
**Type system:** Single condensed sans (Roboto Condensed) at four sizes. Labels are SHORT — every word earned its slot.
**Density choice:** Compressed in the overlays, generous in the canvas. Two density tiers in one design.
**Color strategy:** Black base, single accent (NASA blue + occasional warm amber for warnings). The vacuum is the brand.
**Motion language:** Staged — overlays slide in with 240ms ease-out; data updates pulse subtly. Generous motion because the canvas can absorb it.
**One thing worth stealing:** Status pills with a tiny pulsing dot for "live / polling now" vs static for "snapshot." Perfect for cash-drawer status freshness.
**One thing to NOT copy:** The full-bleed canvas — overkill for a tabular operator surface. Steal the floating-overlay idea for the cash-drawer detail sheet only.

## 6. rauno.me — rauno.me
**Why I picked it:** Personal site with editorial gravitas — proves that operator UIs can have *taste* without losing utility. Polarizing — initially reads "too quiet" but on second look every element is doing a job.
**Layout move:** Single column, generous margins, deliberate ragged-right type. Asymmetric blocks where information density warrants it. The page reads like a typeset essay.
**Type system:** Display serif + grotesk body + mono captions. The serif is reserved for moments that earn it (section openers, hero numerals). Everywhere else is restraint.
**Density choice:** Generous — but with sudden bursts of compression for tables. The contrast is the design.
**Color strategy:** Near-monochrome with one warm accent. Light/dark themes both feel inhabited, not generic.
**Motion language:** Subtle staged page entry, hover states that feel hand-tuned (no library defaults). Everything has a tiny ramp; nothing snaps.
**One thing worth stealing:** Section headers as small-caps with a hairline rule beneath. Gives the dashboard a publication feel without shouting.
**One thing to NOT copy:** The ragged-right body — wrong for tabular numeric content.

## 7. brutalistwebsites.com → submission: 'tradezella' style trader journals (e.g. tradervue.com)
**Why I picked it:** Polarizing pick. Trader journals are operator UIs for people who lose money if their dashboard misleads them. They are intentionally "wrong on purpose" — heavy borders, brutalist tables, no ornament — because the user values legibility over taste.
**Layout move:** Hard 1px borders everywhere. Tables look like spreadsheets, not "cards." Negative space is structural, never decorative.
**Type system:** Mono for everything numeric, sans for labels — and a hard rule that no decorative type appears anywhere. The number IS the design.
**Density choice:** Maximum compression with deliberate negative space *between* regions, not inside them.
**Color strategy:** Bone white / charcoal / single semantic green-red. No gradients. No shadows. Borders do all the elevation work.
**Motion language:** None. Operators trust a static UI more than an animated one.
**One thing worth stealing:** The "no shadow, hard border" cash table look — perfect for the cash-drawer strip where trust matters more than polish.
**One thing to NOT copy:** Zero ornament — we still want StockFlow to feel like it belongs to the brand. Borrow the spreadsheet honesty in *one* widget, not page-wide.

---

## Synthesis — what these 7 together suggest for our dashboard

The branch manager dashboard sits closer to Linear / Datadog / Bloomberg than to Stripe. The dominant stance is **operator control room, not executive overview**: dense, top-down by urgency, semantic color used only for meaning, motion only when it adds signal. Steal Stripe's hero-number-vs-target treatment for the sales card (it's the only marketing-grade moment we need); steal Linear's group-collapsing pattern for the alerts/approvals stack; steal Datadog's "incidents strip that shrinks when empty" so the dashboard rewards a quiet day with calm; steal Bloomberg's per-region "last refreshed at" caption so freshness is always legible; steal NASA's pulsing dot for live polling indicators; steal rauno.me's hairline-ruled small-caps section headers for publication feel; steal the trader-journal hard-border tabular honesty for the cash-drawer strip itself. Together: a dashboard that reads top-down (KPIs → live operations → alerts → approvals → trend strip → activity), uses the landing-page brand vocabulary at the edges (display serif for the hero numeral, the established `--ink-*` and `--signal-*` tokens for surface and semantics), and trusts the operator enough to be quiet when nothing is wrong.

---

## Existing Design Language (Phase 1 — Continuity Audit)

Read from `app/[locale]/(home)/landing.css`, `app/[locale]/(home)/landing-fonts.ts`, `app/[locale]/(home)/page.tsx`, and `app/[locale]/(home)/layout.tsx`.

### Type system already established
- `--font-display` → Instrument Serif (400, italic available) — used for editorial moments and hero numerals
- `--font-body` → IBM Plex Sans (300-700) — UI labels, body, dense content
- `--font-mono` → JetBrains Mono (400-700) — numbers, ticker output, "this is live data" voice
- Tabular numerals already wired via `.tabular` utility (`font-variant-numeric: tabular-nums`)
- The dashboard MUST reuse these three. Do not import new fonts.

### Color tokens already defined (scoped under `.landing-root` in landing.css)
- **Ink scale:** `--ink-0` through `--ink-4` (deepest → hovered panel)
- **Rules:** `--rule-1/2/3` (1px sharp; no soft borders by convention)
- **Brand:** `--accent` (electric blue `#2563eb`), `--accent-hi`, `--accent-glow`
- **Signals (operational, never decoration):** `--signal-up` (green), `--signal-warn` (amber), `--signal-down` (red), `--signal-info` (cyan)
- **Editorial:** `--editorial` (warm bone — use ONCE in dashboard, on the hero serif numeral)
- **Text:** `--text-hi / --text-mid / --text-lo / --text-faint / --text-dim`
- **Numeric voice:** `--num`, `--num-pos`, `--num-neg`

**Decision:** lift these into the global token layer (`app/[locale]/globals.css` or `tailwind.config.ts`) so the dashboard can use them without depending on `.landing-root` scope. Do this once, centrally — do NOT redefine in dashboard components.

### Stack conventions confirmed
- `next-intl` with `localePrefix: "as-needed"` — English at `/dashboard`, French at `/fr/dashboard`
- `next-themes` dark/light via `<Providers>` — must work in both
- shadcn/ui on Radix in `components/ui/` — reuse `Card`, `Badge`, `Skeleton`, `Sheet`
- TanStack Query v5 hooks calling server actions — match the existing pattern exactly
- No `services/` layer — `actions/` → `hooks/` → components (per project memory `feedback_architecture.md`)
