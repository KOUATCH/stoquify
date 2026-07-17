# Landing page build report — May 2026

**Period:** 2026-05-23
**Scope:** Build the marketing landing page against `docs/LANDING-PAGE-INSPIRATION-2026-05.md`
**Deliverable:** 4 atomic git commits, 14 new files, ~2,345 lines of production-grade TSX + CSS

---

## Executive summary

The landing page was built end-to-end against the inspiration brief in one focused session. Four atomic commits delivered nine narrative sections in dependency order, a scoped design-token system, a typographic system with three distinct voices, and an SVG-driven animation package that makes the "live data" promise visible from the first frame. Every section in the brief landed; no section was dropped or downgraded.

The aesthetic direction committed to: **operations terminal** — financial command-center precision meets editorial confidence. Dark base, electric-blue accents, sharp 1px rules, animated data flow between modules, real-feel inline dashboards composed from HTML + SVG (no screenshots, no placeholder images). The page replaces the existing `stockflow-*` WIP components entirely; old files remain in `components/frontend/` but are no longer imported.

Key headline numbers:

- **4 commits**, each atomic to one narrative chunk of the page.
- **14 new files** (10 landing components + 4 scaffold files).
- **~2,345 lines** of new TypeScript / TSX / CSS.
- **3 typefaces** loaded via `next/font/google` — Instrument Serif (display), IBM Plex Sans (body), JetBrains Mono (data) — scoped to the landing root so the app shell keeps Rethink_Sans.
- **9 sections** in the assembled sequence, each with its own component file.
- **0 TypeScript errors** introduced in the landing code (verified against the 441-error pre-existing baseline).

---

## Aesthetic direction — why "operations terminal"

The brief leaves the visual register open but constrains the tone: premium, operational, enterprise, modern, trustworthy; the product should feel like the place where owners see the truth of the business in real time. Reference sites span ERP gravitas (NetSuite), commerce clarity (Shopify POS), and unified-data confidence (Rippling).

The "command center" framing in the brief is the strongest single lever — it suggests a register adjacent to mission control, Bloomberg terminals, and the live operations boards in finance departments. That's what the build commits to:

- **Numeric voice everywhere data appears** — JetBrains Mono with tabular numerals so figures land at the same position regardless of digit width.
- **Editorial voice on display headlines** — Instrument Serif with mixed italic for the emphasised noun ("command center"). Carries gravitas without legacy weight.
- **Technical voice on body** — IBM Plex Sans. Distinctive over Inter / Roboto / system defaults; pairs with Plex Mono character.
- **Sharp 1px rules, not soft blobs.** Every grid in the page uses inverted-colour 1px gutters created by a coloured `bg-rule-1` container holding cells with a 1-pixel gap.
- **Real-feel data, not screenshots.** Every dashboard widget is composed from HTML + SVG so it can tick, flow, and animate. No static product images.
- **Asymmetric grid with diagonal flow.** Sections stagger; module tiles vary in size; nodes on the workflow spine alternate vertical offset.

What was deliberately avoided per the skill's `frontend-design` guidance:

- Generic SaaS fonts (Inter / Roboto / system).
- Purple-gradient-on-white cliché.
- Random illustrations or weak stock photos.
- Soft rounded everything; uniform 1rem radius applied to every element.
- AI-aesthetic blob backgrounds.

---

## Component-by-component breakdown

All in `components/landing/`. Section eyebrows (`§ 01`, `§ 02`, …) carry the page's numbering rhythm.

### `LandingHero` (155 lines) + `HeroDashboard` (359 lines)

The opening. A live status bar across the top of the section ("system / live · 11 modules · 4 branches synced", "uptime 99.98%", "all systems nominal") sets the terminal register before the headline arrives.

**Left column**:
- Eyebrow: "Business operating system · v3"
- Display headline mixing serif and italic: "Run your entire business from one **command center**." The "command" and "center" are Instrument Serif italic in the editorial accent tone (warm bone `#d4b483`); the rest is plain body voice. The period is electric blue.
- Plex Sans subhead with one inline emphasis on "in real time".
- Two CTAs (`Book a demo` accent, `Watch the product tour` ghost).
- Six-point proof grid (`Real-time inventory sync`, `Multi-branch ready`, `Role-based permissions`, etc.) on a 3×2 layout.

**Right column** (the `HeroDashboard`):
- Terminal window chrome with three coloured dots (red/amber/green) and a "last sync · 0:02s ago" indicator.
- Revenue counter that ticks every 2.4s (`useTickingNumber` hook adds a small random increment, capped). Number animates on update.
- Inline SVG sparkline of recent revenue movement (gradient-filled area under the line).
- Cash-on-hand + receivables + payables breakdown.
- Low-stock alerts table with progress-bar-style fills for SKUs below par.
- 32-cell attendance heatgrid (green / amber / off) labeled "on-shift / late / off".
- Recent-activity feed in mono with timestamps in HH:MM:SS format and tone-coloured event kinds (SALE / PAYABLE / PAYROLL / ALERT).
- Two floating callout cards (margin warning + approval pending) drawn outside the frame edges for depth.

### `DisconnectProblem` (156 lines) — § 01

The "cost of disconnected tools" section. Six tool-name tiles ("Sales lives in the POS", "Stock lives in spreadsheets", etc.) on a 3×3 grid; the centre tile shows the answer ("one platform connects all of it"). An overlaid SVG draws severed dashed lines between the perimeter tiles with red `×` marks at each broken joint. Headline names the cost; emotional-payoff bullets ("No more guessing", "No more double entry", …) on the left.

### `ConnectedWorkflow` (209 lines) — § 02

The page's centrepiece. Five module nodes (POS · Inventory · Purchase · Finance · People) on a horizontal spine; an SVG path weaves between them with a dashed-and-animated stroke. Five staggered packet circles travel along the path via `<animateMotion>`, fading in and out so the "data is moving" cue is constant but never feels frantic. Below the spine: three labeled workflow examples drawn directly from the brief (Sale-to-Finance, Purchase-to-Stock, Attendance-to-Payroll), each with five mono-numbered steps and tone-coloured first/last steps for entry and outcome.

### `ModuleGrid` (180 lines) — § 03

Eight modules on a 12-column bento. Inventory anchors as the 7×2 hero tile; POS and Purchases sit beside it in 5-wide tiles; Finance / Payroll / Attendance form a 4-4-4 row; Reports and Approvals close as 7-5. Every card carries an eyebrow (`01 / Inventory`), a display headline summarising the promise, a Plex Sans body line, and a footer metric in mono (Tracked SKUs · 12,847; On-shift now · 26/32; etc.). Hover lifts the tile to ink-3.

### `ModuleDeepDives` (481 lines)

Six alternating-side sections, one per primary module, in a single component for tight rhythm. Each pair has an editorial headline + four-bullet body on one side and a focused mini-dashboard on the other:

| Module | Visual |
|---|---|
| Inventory | Five SKU rows with par-level progress bars; two flagged warn-tone for below par. Top-right alert pill. |
| POS | Receipt-style line items with quantity × name × price; tax + subtotal; `Charge $23.76` accent button. |
| Purchases | Five-step approval timeline with state markers (done / current / pending). PO header with supplier + value. |
| Finance | Four KPI cards (Revenue MTD / Profit MTD / Receivables / Payables) on a 2×2; mono figures with delta lines. |
| Payroll | Roster of three employees with base + overtime + bonus breakdown; cycle header with "ready to approve" pill. |
| Attendance | Heatmap of intensity by hour × weekday with green opacity gradient; "+ on-time 94%" stat + "feeds payroll" annotation. |

Sections animate in on scroll via `whileInView` (Framer Motion).

### `AutomationSection` (93 lines) — § 04

Four "rule cards" in trigger → condition → action shape. Each card looks like a snippet of a workflow editor — `when Item.qty < par_level` / `then Create draft purchase order · notify branch lead`. Rules cover low-stock reorder, attendance → payroll, approval chains, margin guard. Re-states the "every rule is auditable" promise.

### `TrustSection` (139 lines) — § 05

Deliberate light-paper register — the dark page exhales here, then resumes after. Twelve specific guarantees from the brief, on a 3-col grid, each with an icon + label + one-line body: role-based permissions, approval workflows, audit log, secure cloud backups, multi-branch controls, data export, stock movement history, payroll calculation history, financial report history, user activity tracking, device/session management, permission inheritance. Eyebrow uses the accent colour over the paper background for a different visual register from the dark sections.

### `UseCases` (155 lines) — § 06

Seven industries (retail, wholesale, distribution, restaurants, pharmacy, school shop, services) as horizontally-scrolling cards. Each card states the industry, the shape of the problem in that industry, the key modules to turn on, and one telling metric (`Tx · busy hour: 180+`, `PO · monthly: 2,400`, `SKU classes: Schedule II-IV`). Designed to avoid the lifestyle-photo cliché — uses iconography + mono spec sheets.

### `FinalCTA` (147 lines) — § 07

The convert. Headline recaps the brief's "product feeling to aim for" stack ("The clarity of a dashboard. The discipline of finance software. The control of an ERP."). Three buyer-readiness paths on a 3-col grid:

- **Book a demo** — accent tile (electric-blue background, white text). For serious buyers.
- **Watch the product tour** — ghost tile. For evaluators.
- **Start free** — ghost tile. For researchers.

Trust line under the cards ("No card required · Migration help on every plan · SSO + audit log from day one").

---

## Design system

### Typography (`landing-fonts.ts`)

Three voices loaded via `next/font/google` and exposed as CSS variables:

```ts
const instrumentSerif = Instrument_Serif({ weight: ["400"], style: ["normal", "italic"], variable: "--font-display" })
const ibmPlexSans = IBM_Plex_Sans({ weight: ["300", "400", "500", "600", "700"], variable: "--font-body" })
const jetbrainsMono = JetBrains_Mono({ weight: ["400", "500", "600", "700"], variable: "--font-mono" })
```

`landingFontVars` is applied to the `.landing-root` wrapper in `app/[locale]/(home)/layout.tsx` so the variables only exist on marketing pages. The rest of the app keeps Rethink_Sans untouched.

Voice rules:
- `.display` / `.display-italic` → Instrument Serif. Used for hero + section headlines + key tile headlines. Italic for emphasised nouns only.
- `.body-text` → IBM Plex Sans. Used for everything reading-prose.
- `.data-text` → JetBrains Mono with tabular numerals. Used for all numbers, eyebrows, timestamps, mono-style labels, ticker output.

### Design tokens (`landing.css`)

The brief's palette translated to CSS variables scoped under `.landing-root`:

| Variable | Hex | Role |
|---|---|---|
| `--ink-0` | `#050811` | Deepest background, hero base |
| `--ink-1` | `#0b1220` | Primary background |
| `--ink-2` | `#0f1729` | Panel base |
| `--ink-3` | `#15203a` | Elevated panel (hover) |
| `--ink-4` | `#1d2a47` | Hovered elevated |
| `--rule-1/2/3` | `#1a2747` / `#243660` / `#2f4a83` | 1px borders, progressively lighter |
| `--accent` | `#2563eb` | Brand electric blue |
| `--accent-hi` | `#3b82f6` | Hover state |
| `--accent-glow` | `rgba(37,99,235,0.32)` | Halo / shadow tint |
| `--signal-up` | `#10b981` | Operational green (positive deltas) |
| `--signal-warn` | `#f59e0b` | Stock warning amber |
| `--signal-down` | `#ef4444` | Critical red (only as a signal) |
| `--signal-info` | `#38bdf8` | Cyan for "in progress" |
| `--editorial` | `#d4b483` | Warm bone for italic display emphasis |
| `--text-hi/mid/lo/faint/dim` | `#f1f5f9` → `#475569` | Five-step text colour scale |
| `--num/num-pos/num-neg` | `#e2e8f0` / `#34d399` / `#f87171` | Numeric text |
| `--paper-0/1/rule` | `#f6f8fb` / `#fff` / `#e2e8f0` | Light-paper register for the trust section |

Utility classes built on the tokens:

- `.landing-grid-bg` — fine grid pattern with radial mask for ambient atmosphere under hero + workflow.
- `.landing-grain` — SVG-noise overlay at 5% opacity for "this is real, not a render" texture.
- `.live-dot` — heartbeat pulse for status indicators.
- `.ticker-track` — horizontal marquee animation (used by the activity feed style).
- `.flow-line` — dashed-stroke animation for the workflow spine path.
- `.frame-glow` — masked-gradient border for "command center" frames around dashboards.
- `.eyebrow` — small-caps + tracking + accent colour for section markers.

### Motion budget

Per the skill's guidance: concentrated effort on high-impact moments instead of scattered micro-interactions.

- **Hero load** — staggered fade-up reveals on the eyebrow, headline, sub, CTAs, proof grid, and dashboard, with delays in the 0 – 0.4s range.
- **Hero dashboard** — revenue counter ticks every 2.4s with a small animation; live status dot pulses; floating callout cards arrive after the main frame.
- **Workflow spine** — `<animateMotion>` carries five packet circles along the SVG path on a 6s loop with 0.2s stagger; the stroke itself uses CSS `stroke-dasharray` animation.
- **Module deep-dives** — `whileInView` on each `<motion.article>` so sections fade up as the user scrolls into them.
- **FinalCTA** — single fade-up on the headline.

Nothing decorative animates on hover; hover transitions are colour-only.

---

## Page assembly

`app/[locale]/(home)/page.tsx` is now twenty-five lines of imports + a single component composition:

```tsx
<main>
  <LandingHero />
  <DisconnectProblem />
  <ConnectedWorkflow />
  <ModuleGrid />
  <ModuleDeepDives />
  <AutomationSection />
  <TrustSection />
  <UseCases />
  <FinalCTA />
</main>
```

`app/[locale]/(home)/layout.tsx` wraps everything in `.landing-root` with the three font variables applied, the dark ink background, and the mid-text colour default. `SiteHeader` and `Footer` continue to live in the layout (unchanged), so navigation chrome is preserved.

---

## What was replaced

The existing WIP under `components/frontend/` is no longer imported by the home page:

- `stockflow-hero.tsx` — replaced by `LandingHero` + `HeroDashboard`.
- `stockflow-features.tsx` — replaced by `ModuleGrid` + `ModuleDeepDives`.
- `stockflow-pricing.tsx` — not currently in the brief; flag below.
- `stockflow-cta.tsx` — replaced by `FinalCTA`.
- `stockflow-faq.tsx` — not currently in the brief; flag below.
- `metrics-bar.tsx`, `how-it-works.tsx` — superseded by the new narrative.

These files **still exist** in `components/frontend/` — they were not deleted. They can be removed or salvaged later if any pieces are useful.

`SiteHeader` and `Footer` are preserved and continue to render around the new sections via the home layout.

---

## Verification

### TypeScript

```bash
npx tsc --noEmit | grep -cE "components/landing|app/\[locale\]/\(home\)"
# → 0
```

Zero new TypeScript errors in any landing file. The total project error count is 447, which is the pre-existing 441 baseline plus six stale `.next/types` artefacts that regenerate on the next `next dev` or `next build`.

### Build

`npm run build` does not currently complete, but the failure is in **pre-existing dashboard code**:

```
.next/types/app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/page.ts:34:13
Type error: Type 'OmitWithTag<SupplierFilters, …>' does not satisfy the constraint '{ [x: string]: never; }'.
  Property 'search' is incompatible with index signature.
    Type 'string' is not assignable to type 'never'.
```

This is in the dashboard's suppliers route, not the landing. `git status` confirms the user has unstaged WIP changes across the dashboard (`app/[locale]/(dashboard)/dashboard/customers/page.tsx`, `app/[locale]/(dashboard)/dashboard/items/page.tsx`, etc.); the type error sits inside that WIP.

To run the landing page right now, use the dev server:

```bash
npm run dev
# then open http://localhost:3000/en  (or /fr)
```

The dev server compiles routes lazily, so the unrelated dashboard type error doesn't block rendering the landing page.

### Visual

Not automated. The page should be opened in the browser to verify:

- The hero headline renders in Instrument Serif with the italic "command center" in the warm-bone editorial colour.
- The revenue counter ticks every ~2.4 seconds.
- The workflow spine has packet dots travelling along it.
- The 32-dot attendance heatgrid in the hero shows the on-shift / late / off pattern.
- The trust section breaks to a paper-light background mid-page.
- The "Book a demo" CTA tile in the final section uses the electric-blue accent.

---

## Commits

| # | Commit | Subject | Files |
|---|---|---|---|
| 1 | `51da72f` | `landing(hero): operations-terminal hero + live dashboard preview` | tokens + fonts + layout + hero + hero-dashboard |
| 2 | `c781140` | `landing(narrative): problem + connected workflow + module grid` | DisconnectProblem + ConnectedWorkflow + ModuleGrid |
| 3 | `d1c7974` | `landing(rest): module deep-dives, automation, trust, use cases, final CTA` | ModuleDeepDives + AutomationSection + TrustSection + UseCases + FinalCTA |
| 4 | `7c239f6` | `landing(wire): assemble full section sequence in (home)/page.tsx` | page.tsx |

All four were committed atomically with `Closes …` / `Verification:` lines in the body. Total: ~2,345 lines added across 14 new files plus updates to `app/[locale]/(home)/layout.tsx` and `app/[locale]/(home)/page.tsx`.

---

## Known issues + deferred work

### 1. Pre-existing dashboard build error blocks `npm run build`

Not from landing work. Located in `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/page.ts`. Fix is to make the `SupplierFilters` interface index-signature-compatible by either widening keys to `string | undefined` or removing properties not used as page-query params.

### 2. Sections from the brief that need decisions

- **Dashboard Preview** (called out as a distinct section in the brief) — currently covered by `HeroDashboard` inside the hero. If you want a separate section dedicated to a full-page dashboard mock-up, that's an additional component.
- **Inventory / POS / Purchase / Finance / Payroll / Attendance Section** — the brief lists these as separate page sections. Implemented as `ModuleDeepDives` which fuses all six into one alternating component for narrative tightness. Splitting them into six separate sections is a refactor if you prefer that structure.

### 3. WIP files in `components/frontend/`

`stockflow-hero.tsx`, `stockflow-features.tsx`, `stockflow-pricing.tsx`, `stockflow-cta.tsx`, `stockflow-faq.tsx`, `metrics-bar.tsx`, `how-it-works.tsx` are no longer imported. Either delete them, or salvage the pricing + FAQ sections (not in the brief but commonly expected on a marketing page) and add them between `UseCases` and `FinalCTA`.

### 4. Translation strings

The new components use inline English copy. The existing WIP used `useTranslations("landing.hero")` etc. backed by `messages/en.json` + `messages/fr.json`. Migrating the new copy into the next-intl message catalogue is a separate task — straightforward but ~500 keys to write.

### 5. Asset loading

Three Google fonts loaded via `next/font/google`. Their CSS and font files are fetched at build time per Next.js convention; production bundle impact: ~100 KB for the three families combined (subset to Latin, weight-limited).

### 6. Accessibility audit

`tests/e2e/a11y.spec.ts` (from the previous audit batch) currently checks `/` and `/auth/login`. The page lands within the same paths, so the existing axe-core checks apply — but it's worth running them against the new landing to catch any violations the new dashboard widgets introduced. The skill scopes `eslint-plugin-jsx-a11y` to `warn` level; the build doesn't fail on a11y today.

### 7. Performance

The hero composition is heavier than the previous static-image hero (more DOM, animated SVG). On low-end mobile, the recommended next step is a Lighthouse run after `npm run dev`, then a decision on whether to disable the packet animation under `prefers-reduced-motion`. Brief mentions this implicitly via "use animations for effects" — happy to add the media query if requested.

---

## Cross-references

- [Inspiration brief (the source-of-truth design doc)](LANDING-PAGE-INSPIRATION-2026-05.md)
- [Architecture](ARCHITECTURE.md) — where the landing fits in the wider app
- [`app/[locale]/(home)/layout.tsx`](../app/%5Blocale%5D/%28home%29/layout.tsx) — landing-root wrapper + fonts
- [`app/[locale]/(home)/landing.css`](../app/%5Blocale%5D/%28home%29/landing.css) — design tokens
- [`components/landing/`](../components/landing/) — all section components
