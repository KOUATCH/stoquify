Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Also act as an enterprise content-design team: senior UX writer, bilingual English/French editor, OHADA/SYSCOHADA-aware product communicator, conversion strategist, accessibility specialist, and localization reviewer.

Conduct an evidence-led implementation and content review to transform Stoquify’s use-cases section into a modern, innovative, highly attractive carousel containing at least 12 relevant use cases. At the same time, establish a professional content standard for all user-facing system copy so that it is targeted, captivating, concise, accurate, and grounded in capabilities that genuinely exist.

## Primary Objectives

1. Build an accessible, responsive, visually polished use-cases carousel with at least 12 proven scenarios.
2. Rewrite the use-case content around specific audiences, operating problems, product capabilities, evidence, and credible outcomes.
3. Audit the system’s broader user-facing copy and define a consistent enterprise content standard.
4. Improve high-impact landing and authentication copy in this implementation pass.
5. Produce a prioritized content backlog for authenticated modules instead of indiscriminately rewriting operational, accounting, legal, or compliance terminology.

## Evidence-First Discovery

Inspect before writing or implementing:

- `components/landing/use-cases.tsx`
- Other components under `components/landing/`
- `app/[locale]/(home)/page.tsx`
- `components/auth/`
- `components/auth/auth-copy.ts`
- `messages/en.json`
- `messages/fr.json`
- `docs/UI/UX/`
- `docs/product/user-experience/`
- Recent public-experience reports under `what-next/ui-ux/`
- Representative POS, inventory, purchasing/AP, sales, reconciliation, accounting, compliance, payroll, offline-sync, RBAC, and close-assurance implementations
- Existing carousel, slider, motion, and accessibility primitives already installed in the repository
- `graphify-out/` when needed to confirm which modules, routes, and capabilities are active

Do not present a capability merely because it appears in old documentation. Confirm it through current routes, components, services, tests, or recent verified reports.

## Use-Case Carousel

Implement at least 12 distinct, evidence-backed scenarios. Candidate themes include:

1. Multi-branch retail operating control
2. Fast and controlled point-of-sale operations
3. Offline or unreliable-connectivity POS continuity
4. Inventory truth, transfers, and stock-risk management
5. Purchasing and accounts-payable control
6. Sales, customer balances, and receivables follow-up
7. Cash, bank, mobile-money, and payment reconciliation
8. OHADA-aware accounting and period-close assurance
9. Compliance evidence and country-pack configuration
10. Payroll, attendance, declarations, and payment evidence
11. Owner and manager daily operating command
12. Accountant collaboration and trusted source evidence
13. Role-based access and maker-checker approvals
14. Multi-tenant or group-level operational oversight

Include only scenarios proven by the current system. Replace any unsupported candidate with another verified use case.

Each use case should contain:

- A short, role-specific label
- A compelling title of approximately three to seven words
- A concise problem or operational trigger
- The relevant Stoquify workflow or capability
- A truthful proof or control signal
- A credible business outcome without invented statistics
- A focused CTA where a real destination exists

## Carousel Experience

- Reuse the repository’s established carousel or slider library where available.
- Do not hand-roll gesture, focus, or scrolling physics when a proven dependency exists.
- Display approximately one item on mobile, two on tablet, and three on desktop.
- Support touch gestures, mouse interaction, keyboard navigation, previous/next icon controls, and clear position indicators.
- Use stable card dimensions so longer translated text does not shift the layout.
- Pause automatic movement on hover, focus, or interaction.
- Respect `prefers-reduced-motion`; disable automatic movement when reduced motion is requested.
- Never make autoplay the only way to explore the content.
- Give navigation controls accessible labels and visible focus states.
- Keep all text readable without clipping or overlap at mobile and desktop widths.
- Use the harmonized Stoquify semantic color system.
- Use restrained semantic accents, icons, and real product-state visuals where available.
- Avoid decorative gradients, oversized cards, nested cards, excessive animation, and generic stock imagery.

## Content Quality Standard

Apply the following rules to every rewritten text:

- Lead with the user’s operating reality, not a generic feature claim.
- Use active, direct, professional language.
- Explain the outcome before implementation details.
- Prefer precise domain language over exaggerated SaaS language.
- Keep operational controls calm and unambiguous; authenticated workflows must not read like advertising.
- Use proof, evidence, traceability, permissions, reconciliation, and close-readiness language only where the system supports them.
- Preserve established accounting, payroll, compliance, security, and status terminology.
- Do not claim certification, guaranteed compliance, statutory approval, automatic correctness, or specific performance improvements without evidence.
- Do not invent customers, testimonials, transaction volumes, countries, integrations, savings, accuracy percentages, or legal assurances.
- Clearly distinguish available capabilities, configurable capabilities, pilot features, and roadmap items.
- Write English and French as professionally equivalent experiences rather than literal word-for-word translations.
- Keep button labels command-oriented and short.
- Ensure success, warning, error, pending, blocked, and permission-denied language remains consistent throughout the system.

## System-Wide Content Scope

Audit all major user-facing copy categories:

- Landing and authentication
- Navigation and module names
- Page titles, descriptions, and command briefs
- Buttons and calls to action
- Empty, loading, error, locked, and permission-denied states
- Form labels, helper text, and validation messages
- Notifications and confirmations
- Status labels and approval terminology
- Dashboard metrics and evidence descriptions
- Onboarding and setup content
- Compliance, accounting, payroll, and security language

In this run, implement the carousel and improve high-impact public/auth copy. Produce a prioritized module-by-module backlog for deeper authenticated-product copy changes requiring domain review.

## Expected Artifacts

- The completed responsive use-cases carousel
- At least 12 verified English and French use cases
- Updated high-impact public/auth content
- A content standard under `docs/product/content/`
- A content audit and prioritized backlog under `what-next/ui-ux/`
- A dated implementation report under `what-next/ui-ux/`
- Desktop and mobile screenshots under `what-next/ui-ux/screenshots/`
- Focused tests for carousel navigation, item count, localization, and reduced-motion behavior

## Verification

- Validate `messages/en.json` and `messages/fr.json`.
- Run focused ESLint on every changed source file.
- Run focused carousel/component tests.
- Run the project typecheck where feasible.
- Confirm at least 12 use cases render in both languages.
- Verify previous/next controls, keyboard navigation, swipe behavior, and position indicators.
- Verify reduced-motion behavior and autoplay pause rules.
- Smoke-test `/en`, `/fr`, and the relevant login/register routes.
- Capture mobile and desktop screenshots.
- Check for clipping, horizontal overflow, unstable heights, inaccessible contrast, and overlapping content.
- Save command results and unresolved blockers in the dated report.

## Risk Controls

- Preserve the dirty worktree and do not revert unrelated changes.
- Do not change backend business logic, authorization, tenant isolation, module entitlement, or financial behavior.
- Do not clean up unrelated lint or type errors.
- Do not convert precise operational copy into promotional language.
- Do not modify statutory or accounting terminology without evidence and domain review.
- Do not expose unauthorized module capabilities through public links.
- Do not link a CTA to a route the visitor cannot access or that is not production-ready.

## Success Criteria

- The use-cases section contains at least 12 distinct, relevant, truthful scenarios.
- The carousel feels polished and engaging while remaining accessible and easy to control.
- Visitors can quickly recognize their role, problem, and expected outcome.
- English and French versions are equally persuasive and accurate.
- The public copy presents the strongest verified aspects of Stoquify without unsupported claims.
- Operational copy remains precise, calm, and trustworthy.
- The system has a reusable content standard and a practical backlog for subsequent module-level improvements.
- No localization, responsive-layout, accessibility, routing, or existing workflow regression is introduced.

## Execution Addendum

- Apply the same truthful, targeted content standard to the active login and register pages.
- Add a small number of compact trust, role, workflow, or evidence cards to authentication surfaces where they improve confidence and scanning. Keep the form dominant and avoid clutter or nested cards.
- Review the other active landing sections and introduce or restructure cards only where they improve comparison, workflow comprehension, use-case recognition, or proof visibility.
- Straighten high-impact landing and authentication language so it is concise, specific, professional, bilingual, and consistent with the verified product orientation.
- Preserve the shared product color contract, responsive behavior, localization, authentication behavior, and existing route semantics.
- Do not broaden this run into a mass rewrite of authenticated operational copy; record those opportunities in the prioritized content backlog.
