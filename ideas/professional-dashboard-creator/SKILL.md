---
name: professional-dashboard-creator
description: Use whenever the user wants to design, build, redesign, or "make professional" a dashboard, admin home, control center, overview page, analytics/stats/KPI view, or post-login landing screen — even when they don't say "dashboard." Triggers on "build me a dashboard", "overview page", "control panel", "admin home", "stats page", "metrics view", "show all my data on one screen", "glow-up the dashboard", "dashboard looks generic", "page after login." Produces a modern, enterprise-grade, design-led dashboard that (1) inherits the typography, spacing, color tokens, and motion of the existing landing page, (2) is wired to REAL database data through the project's existing ORM / server actions / hooks — never mocked, (3) treats i18n and dark/light theme as first-class, and (4) is preceded by a hard-blocking research phase against 7 radically distinctive design references so the result is not a generic admin template. Do NOT skip the research phase or the design contract.
---

# Professional Dashboard Creator

## Why This Skill Exists

The world has enough generic admin templates. What's rare is a dashboard that (a) looks like it belongs in the *same product* as its marketing site, (b) answers the questions real operators have at 8am, (c) speaks the user's language, and (d) is wired to real data — not Lorem-Ipsum-shaped JSON. This skill exists to produce that.

Three failure modes you are explicitly preventing:

1. **The Bootstrap Admin Look** — generic sidebar + four colored stat cards + one big chart. Forgettable. Avoid by doing real design research first.
2. **The Disconnected Island** — a dashboard that uses different typography, color, density, and motion than the rest of the product. Avoid by reading the landing page and existing design tokens *before* designing.
3. **The Demo Dashboard** — beautiful but powered by hardcoded mock arrays. Avoid by mapping real data sources and binding through the existing data layer before writing components.

## The Workflow Is Sequential and the Order Matters

Do not jump to implementation. The order — research → continuity audit → information architecture → design contract → implementation → quality gates — is the value of this skill. Reorder it and you produce another generic admin.

---

## Phase 0 — Inspiration Research (BLOCKING)

**You may not write any dashboard code until this phase is complete and `DASHBOARD-INSPIRATION.md` exists with 7 entries.** If the user pushes to skip it, explain that this is the single highest-leverage step for design quality and ask them to choose: (a) do the research now (~20 min), or (b) explicitly accept that the result will be generic.

### What "radically innovative" means here

You are not looking for "the most popular SaaS dashboards." You are looking for sites that take a *deliberate, distinctive design stance* — sites where someone clearly made decisions other people would have been afraid to make. The point is to expose yourself to a wider visual language than the default Tailwind/shadcn aesthetic.

Pick 7 from a mix of these categories (current equivalents — the names below age, the categories don't):

- **Design-led product sites:** linear.app, vercel.com, stripe.com, raycast.com, framer.com, arc.net, railway.app
- **Personal/portfolio sites with radical layout:** rauno.me, basement.studio, mmm.page, igloo.inc, exposure.co
- **Design galleries (filter for current Site of the Day / app category):** awwwards.com, godly.website, minimal.gallery, siteinspire.com, land-book.com
- **Data-dense done well:** observablehq.com examples, datawrapper case studies, the-pudding.com, flowingdata.com
- **Brutalist / experimental / "wrong on purpose":** brutalistwebsites.com, gridindex.com selections

**Rules of thumb:**
- At least 2 must be non-SaaS (portfolios, galleries, editorial). Cross-pollination is the point.
- At least 1 must be visually polarizing — something where you initially think "this is too much," because that's where you find moves nobody else is making.
- No two picks should share the same template family. If two of your picks look interchangeable, swap one.

### Capture format — `DASHBOARD-INSPIRATION.md`

For each of the 7, write a short structured note. Don't paste images you can't host — describe in words.

```markdown
## 1. [Site name] — [URL]
**Why I picked it:** one sentence on what makes it distinctive
**Layout move:** how the page is divided (full-bleed? asymmetric grid? sidebar variant? floating panels?)
**Type system:** display vs body, scale ratio, where they break the rules
**Density choice:** generous / balanced / compressed — and what they trade for it
**Color strategy:** monochrome + accent? full palette? semantic-only?
**Motion language:** instant / spring / staged / none
**One thing worth stealing:** the single move you'd port into the dashboard
**One thing to NOT copy:** what works only in their context
```

After all 7 are documented, write a final section: **Synthesis — what these 7 together suggest for our dashboard**. Three to five sentences. This is what you'll actually use.

---

## Phase 1 — Codebase Continuity Audit

The dashboard must feel like the landing page's grown-up cousin, not a separate product. Read these files and document findings in `DASHBOARD-INSPIRATION.md` under a new section `## Existing Design Language`:

| What to read | What to extract |
|---|---|
| Landing page route(s) — usually `app/page.tsx`, `app/(home)/page.tsx`, or `app/(marketing)/` | Typography pairings, button styles, color usage, spacing rhythm, hero patterns, motion |
| `tailwind.config.*` / `theme.css` / design token files | Color tokens (semantic names, not hex), font families, spacing scale, radii, shadows |
| Theme provider (`next-themes`, custom `ThemeProvider`, CSS-vars) | How dark/light is toggled; which tokens auto-flip; what doesn't |
| i18n setup (`next-intl`, `i18next`, `react-i18next`, etc.) | Locale list, default locale, dictionary file shape, translation hook (`useTranslations`, `t()`), where keys live |
| ORM schema (`prisma/schema.prisma`, drizzle schema, sequelize models) | Available tables that could feed dashboard widgets |
| Server actions / API routes / RPC layer | Existing query functions you can call vs. queries you'd need to add |
| Data-fetching layer (TanStack Query hooks, SWR, RSC) | The project's convention for fetching — match it exactly |
| Existing component library (shadcn/ui? custom? Mantine? MUI?) | Card, Button, Badge, Skeleton, Sheet, Dialog primitives you must use |

**Rule:** No new design tokens, no new color values, no new font imports unless absolutely necessary. The dashboard reuses the design system. If a token is missing (e.g., no `chart-*` colors yet), add it to the central tokens file — not inline in the dashboard.

---

## Phase 2 — Information Architecture

The hardest design work is deciding what to leave out. Before drawing anything, answer in writing:

1. **Who opens this dashboard at 8am, and what are the 3 questions they need answered in 5 seconds?** Those answers become the hero KPIs.
2. **What requires action today?** That becomes the alerts/inbox zone.
3. **What's the one trend the operator should always be watching?** That becomes the trend strip.
4. **What are the 3-5 actions they'll most likely take from here?** Those become shortcuts.
5. **What recently happened that they should know about?** That becomes the live feed.

The rule: **if a widget cannot answer a real, frequently-asked operator question, cut it.** Vanity metrics (total users ever, total transactions ever) belong on a "stats" subpage, not the operator dashboard.

If the product has multiple personas (owner, manager, cashier, accountant, HR, admin), do not try to serve them all from one screen. Either pick the primary persona and design for them, or design role-switched variants — but each variant must be focused.

---

## Phase 3 — Design Contract (`DASHBOARD-SPEC.md`)

Before writing any component, produce a design contract. This is non-negotiable — it prevents mid-implementation drift and makes review possible.

```markdown
# Dashboard Design Contract

## Primary Persona
[Who. What they do. When they open this page. What success means for them.]

## Promise
[One sentence: "See X, Y, Z in one live command center."]

## Inspiration Synthesis (1 paragraph)
[Distilled from DASHBOARD-INSPIRATION.md — what visual stance we're taking and why.]

## Layout
- Grid: [12-col? asymmetric? bento? specify breakpoints]
- Page chrome: [topbar contents, sidebar/no-sidebar, footer]
- Section order top-to-bottom
- Mobile strategy: [stack? collapse to tabs? hide non-essentials?]

## Type Scale
- Display / H1 / H2 / H3 / body / mono / metric — exact sizes and weights
- French-length tolerance: [labels must fit at +20% length]

## Color Usage
- Background / surface / surface-elevated / border
- Text: primary / secondary / muted
- Brand / accent
- Semantic: success / warning / danger / info — used ONLY for meaning, never decoration
- Chart palette: [3-5 colors, distinguishable in both themes]

## Density
- Tier: [compact / balanced / generous]
- Card padding, row height, gap between widgets — exact tokens

## Motion
- Page enter: [none / fade / stagger]
- Skeleton → data: [crossfade duration]
- Hover/press feedback: [scale, shadow, ring]

## Widgets (the actual content)
For each widget:
- ID, title (i18n key)
- Data source (which server action / hook / query)
- Loading state (skeleton shape)
- Empty state (illustration? message? CTA?)
- Error state (inline? toast?)
- Real-time? (poll interval, websocket, manual refresh only)
- Permissions (who can see this)
- Click behavior (drill-down route)

## i18n
- Namespace: [e.g., "dashboard"]
- New keys to add: [list]

## Theme
- Tokens used (no hex literals anywhere in components)
- Anything that must render differently in dark vs light (e.g., chart gridlines)

## Accessibility
- Color contrast verified for both themes
- Keyboard navigation order
- Skip-to-content link
- aria-labels for icon-only buttons
- Live regions for real-time updates

## Performance Budget
- First contentful paint target
- Per-widget query timeout
- Suspense boundaries (so slow widgets don't block fast ones)
```

Show this contract to the user before implementing. Five minutes of contract review saves an hour of rework.

---

## Phase 4 — Implementation

Now and only now, write code.

### Non-negotiable rules

1. **Zero mock data.** Every value visible on the page comes from a real query through the project's existing data layer. If a query doesn't exist yet, add it to the appropriate file (server actions, API route, hook) — don't inline it in the component.
2. **Zero string literals in JSX.** Every user-visible string goes through the i18n system. If a key doesn't exist, add it to both locale files (e.g., `en.json` and `fr.json`) before using it.
3. **Zero color hex literals in components.** Every color comes from a token. If a needed token doesn't exist, add it to the central token file first.
4. **Suspense per section.** A slow query for one widget must not block the rest of the page. Wrap each independent widget in its own Suspense boundary (or its equivalent in the project's fetching library) with a skeleton fallback.
5. **Skeletons, not spinners.** Skeleton shapes that match the eventual content. Spinners feel slower because they convey no information about what's coming.
6. **Empty states are designed, not default.** Every widget needs an explicit empty state with: a calm illustration or icon, a one-sentence explanation, and a clear next action.
7. **Error states are graceful.** A failed widget shows an inline retry — it doesn't crash the page.
8. **Mobile is not "responsive by accident."** Decide what hides, what stacks, what collapses to tabs, and what becomes a sheet. The mobile dashboard should still be useful, not just rendered.
9. **Real-time only where it matters.** Polling everything is wasteful; polling nothing makes the dashboard feel dead. Pick the 1-3 widgets that truly need freshness and poll those.

### Component patterns

- Keep widgets as self-contained components: `<TodaySalesCard />`, `<LowStockTable />`. Each owns its query, its skeleton, its empty state, its error state. The dashboard page becomes a layout file that arranges them.
- Co-locate the query, the component, and the skeleton in the same file (or same folder). This makes them easy to move and reason about.
- Type the data shape strictly. Don't `any` your way through `result.data.whatever`.

---

## Phase 5 — Quality Gates (all must pass before "done")

Run through this checklist explicitly before claiming the dashboard is complete.

- [ ] **Zero mock data.** Grep the dashboard folder for `mockData`, `fakeData`, `placeholder`, `lorem`, hardcoded numeric arrays. Zero hits.
- [ ] **i18n complete.** Every visible string has a key in every locale file. Grep for bare strings inside JSX (e.g., `>[A-Z][a-z]+ [a-z]+<`).
- [ ] **Theme parity.** Toggle dark and light. Every widget renders sensibly in both. Chart colors are distinguishable in both. Borders are visible in both.
- [ ] **No hex literals.** Grep the dashboard folder for `#[0-9a-fA-F]{3,8}` in `.tsx`/`.jsx` files. Zero hits (or all in the theme tokens file).
- [ ] **Continuity check.** Side-by-side screenshot of the landing page and the dashboard. They feel like the same product — same fonts, same spacing rhythm, same button language, same motion vocabulary.
- [ ] **Operator question test.** Ask: "If I were the primary persona at 8am, could I answer my 3 questions in 5 seconds?" If not, the IA is wrong.
- [ ] **8am test passed for every widget.** No widget exists "to fill space." Every widget answers a question or enables an action.
- [ ] **Skeletons match content shape.** Not generic gray boxes — shapes that match the eventual layout.
- [ ] **Empty states designed.** Every widget has a hand-crafted empty state, not "No data."
- [ ] **Loading is non-blocking.** A slow widget doesn't block the rest of the page.
- [ ] **Mobile is usable.** Open on a phone-sized viewport. The dashboard is still useful, not just rendered.
- [ ] **a11y sanity.** Tab through the page — focus order is logical, focus rings are visible, icon-only buttons have aria-labels, color contrast meets WCAG AA in both themes.
- [ ] **Performance.** Network tab shows no waterfall of dependent queries; queries fire in parallel. Skeleton-to-data transitions feel snappy.

If any box is unchecked, the dashboard is not done. Don't claim it is.

---

## How to Communicate Progress

Tell the user what phase you're in and what they should review at each gate:

- After Phase 0: "Here's `DASHBOARD-INSPIRATION.md` — 7 references and a synthesis. Skim it and tell me which references resonate before I move on."
- After Phase 1: "Here's the existing design language summary — tokens, fonts, components I'll reuse. Anything I should override?"
- After Phase 2: "Here's the proposed information architecture — primary persona, hero KPIs, alert zone, trends, shortcuts, feed. Any cuts or additions before I write the design contract?"
- After Phase 3: "Here's `DASHBOARD-SPEC.md`. Review it carefully — once we move to implementation, deviations are expensive."
- During Phase 4: Commit per-widget with descriptive messages so the user can review the build incrementally.
- After Phase 5: Walk through the quality-gate checklist with checkmarks. Show screenshots of dark + light, desktop + mobile.

## Anti-Patterns to Refuse

If you find yourself doing any of these, stop:

- Generating a dashboard with `useState([{...mock data...}])` in any widget.
- Using hex colors directly in components instead of tokens.
- Writing English strings directly in JSX and "we'll translate later."
- Producing four colored stat cards in a row because that's the default. (If you do four cards, they earned it — they answer the 8am questions.)
- Skipping the inspiration research because "I know what dashboards look like."
- Skipping the design contract because "we can iterate in code." (You can't — without a contract, every reviewer disagrees with every change.)
- Designing for "all users" instead of a primary persona.
- Adding a widget because the page "looked empty." Empty space is a design choice.

## When to Read the Project Override

If the current project has a sibling skill folder also named `professional-dashboard-creator` (e.g., `<project>/skills/professional-dashboard-creator/SKILL.md`), read it after this file. It hardcodes the project's specific stack conventions, file paths, and data sources, so you don't have to rediscover them every invocation. The project override takes precedence on stack-specific details; this global skill remains the source of truth on workflow, research rigor, and quality gates.
