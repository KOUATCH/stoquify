# Stoquify Early-Stage Founder Landing Experience Execution Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

## Project

Stoquify

## Workspace

`E:\ohada saas\Focused projects\stoquify`

## Domain

Public landing-page positioning, early-stage business adoption, and OHADA-ready operational control.

## Mission

Study the "For Early-stage founder" experience on `https://www.accio.com/work` and adapt its underlying product-presentation idea to Stoquify's landing page.

Do not copy Accio's wording, branding, assets, visual composition, sourcing promises, or implementation. Extract only the useful interaction and storytelling pattern: turning an early business idea into a concise, progressive journey from validation and setup to launch, control, and measurable growth.

Create a professional Stoquify experience provisionally titled:

- EN: "From your first sale to controlled growth"
- FR: "Du premier encaissement à une croissance maîtrisée"

The experience must explain how an early-stage founder or growing SMB can progressively establish:

1. Operating model, branches, roles, products, prices, and responsibilities.
2. Sales, POS, inventory, purchasing, receipts, and payment capture.
3. Reconciliation, daily control, OHADA-ready accounting records, and audit evidence.
4. Multi-branch visibility and controlled adoption of payroll, compliance, automation, and intelligence extensions.

All public statements must reflect implemented or explicitly qualified Stoquify capabilities.

## Mandatory Planning Gate

Before editing code, produce a Plan of Action containing:

- Accio pattern observations and the Stoquify adaptation principle.
- Current landing-page architecture and content-density findings.
- Proposed placement and rationale.
- Files, translations, tests, browser evidence, and rollback boundaries.
- Risks, dependencies, non-goals, and measurable completion criteria.

Maintain an execution table after every phase:

`Phase | Status | Changes completed | Verification | Evidence | Blockers | Next action`

## Placement Decision

Inspect the existing landing page before choosing the location.

Prefer integrating the founder journey into `components/landing/operations-map.tsx` or another existing buyer/adoption section. Create a new top-level section only if evidence shows that it replaces weaker or duplicated content and does not increase homepage overload.

Respect the nine-section target and density constraints in:
`docs/landing page/STOQUIFY_LANDING_PAGE_FINAL_9_PLUS_COMPLETION_PLAN_2026-07-20.md`

Do not weaken the Product Command proof, trust placement, four-scenario target, seven-stage workflow, or qualified adoption model.

## Execution Phases

### Phase 0: Evidence and pattern analysis

Inspect the Accio experience, current landing components, EN/FR messages, tests, smokes, recent landing reports, and relevant `graphify-out/` architecture files. Separate inspiration from claims Stoquify can truthfully make.

### Phase 1: Information architecture decision

Compare integration into OperationsMap, PricingSection, DisconnectProblem, or a replacement section. Select the smallest option that improves founder comprehension without violating the nine-section target.

### Phase 2: Content and interaction design

Create targeted EN/FR copy, a four-stage founder journey, supporting proof references, readiness boundaries, and one qualified CTA to `/#pricing`. Do not introduce another direct `/register` link.

### Phase 3: Surgical implementation

Implement the selected design using existing landing tokens, typography, icons, spacing, and responsive patterns. Avoid an auto-advancing carousel. If tabs or segmented controls are used, make them keyboard-accessible and ensure the core journey remains understandable without interaction.

### Phase 4: Focused contract tests

Update or add assertions for EN/FR parity, four journey stages, truthful capability language, CTA destination, section count, protected-route avoidance, sample-data boundaries, and absence of unsupported launch, compliance, automation, or financial claims.

### Phase 5: Browser certification

Verify EN and FR at 390x844, 834x1112, and 1440x1000. Check keyboard navigation, focus visibility, reduced motion, overflow, text fit, hydration errors, CTA behavior, and surrounding section continuity.

### Phase 6: Evidence and report

Save screenshots, command results, design decisions, and residual launch risks under:
`what-next/ui-ux/landing-founder-journey/<YYYY-MM-DD>/`

## Focused Verification

Run:

- `npm run ui:gate:public-content`
- `npm run ui:gate:landing-refinement`
- `npm run ui:gate:landing-navigation-localization`
- Relevant updated browser smoke, preferably a dedicated founder-journey smoke
- `npm run typecheck`
- `npm run build:app` only after focused gates pass

Report every command as PASS, FAIL, BLOCKED, SKIPPED, or TIMED OUT.

## Risk Controls

- Preserve the dirty worktree and avoid unrelated refactors or lint cleanup.
- Do not invent customer metrics, statutory guarantees, AI autonomy, instant deployment, country support, integrations, certifications, or financial outcomes.
- Maintain EN/FR semantic parity, accessibility, responsive stability, OHADA/SYSCOHADA centrality, evidence provenance, and the quote-led rollout boundary.

## Completion Criteria

The work is complete only when the founder journey is immediately understandable, visually consistent, truthful, responsive, localized, accessible, connected to the qualified adoption path, protected by focused tests, supported by saved browser evidence, and introduced without increasing homepage clutter or weakening the landing-page 9+ roadmap.

## Expected Artifacts

- Updated existing landing component, not a speculative standalone application.
- Equal-scope English and French copy.
- Focused Jest contract and dedicated Playwright smoke.
- EN/FR screenshots at mobile, tablet, and desktop widths.
- Browser evidence JSON with layout, focus, CTA, error, and reduced-motion results.
- Concise execution report with phase progress and residual launch risk.

## Non-Goals

- Do not copy Accio's trade dress, assets, testimonials, metrics, or claims.
- Do not add another homepage carousel.
- Do not add a top-level section when the journey can be integrated safely.
- Do not refactor unrelated landing, dashboard, service, database, or policy code.
- Do not imply instant self-service activation or bypass current rollout qualification.
