# Stoquify Landing Page Skill Suite Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
Stoquify / AqStoqFlow public landing page.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Mission:
Using the 9+ landing-page roadmap document, transform the roadmap into a comprehensive suite of Codex skills that can guide future agents through the full landing-page transformation toward a 9+/10 quality bar across UI/UX, frontend engineering, product clarity, conversion, trust, accessibility, performance, localization, and OHADA/SYSCOHADA market fit.

Primary source document:
- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- PDF version:
  `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.pdf`

Supporting documents:
- `docs/landing page/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.pdf`
- `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`
- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_PROMPT_2026-07-19.md`

Goal:
Create a skill-definition suite that helps future agents implement the roadmap in disciplined, high-quality phases. The suite should be valuable and respected by senior UI/UX specialists, frontend engineers, product strategists, accessibility reviewers, and SaaS growth practitioners.

## Agent Coordination

Use all available agent lenses. If multi-agent tools are available, delegate focused reviews to specialized agents. If not, execute sequentially using these roles:

1. Orchestrator agent: decomposes the roadmap into skill boundaries and dependency order.
2. UI/UX systems agent: owns information architecture, visual hierarchy, interaction design, and design-quality criteria.
3. Frontend engineering agent: owns component boundaries, implementation sequencing, code safety, responsiveness, and maintainability.
4. Product strategy agent: owns positioning, buyer clarity, pricing/adoption flow, and proof hierarchy.
5. SaaS growth agent: owns CTA strategy, conversion path, analytics, SEO, and experimentation readiness.
6. Trust/security agent: owns public claims, sample-data labeling, privacy, RBAC/trust language, and public-to-auth transitions.
7. Accessibility/performance agent: owns keyboard behavior, reduced motion, text fit, Lighthouse budgets, route smoke, and screenshot evidence.
8. Localization/OHADA agent: owns EN/FR parity, OHADA/SYSCOHADA wording, accounting-context accuracy, and regional buyer fit.
9. QA/evidence agent: owns verification commands, acceptance criteria, screenshots, saved reports, and release readiness.

## Evidence To Inspect

Inspect before designing the skills:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`
- `app/[locale]/(home)/page.tsx`
- `app/[locale]/(home)/landing.css`
- `app/[locale]/(home)/layout.tsx`
- `app/[locale]/(home)/landing-fonts.ts`
- `components/landing/*`
- `messages/en.json`
- `messages/fr.json`
- `public/`
- `what-next/ui-ux/`
- `scripts/public-content-browser-smoke.js`
- `scripts/landing-navigation-localization-browser-smoke.js`
- `scripts/product-command-screenshot-browser-smoke.js`
- `scripts/ui-route-smoke-gate.js`
- relevant tests under `scripts/__tests__/`

## Required Skill Suite

Create a coherent suite of skills, not one giant skill.

At minimum, design these skills:

1. `stoquify-landing-00-orchestrator`
   - Coordinates the full 9+ roadmap.
   - Chooses the next phase.
   - Prevents broad rewrites and unrelated cleanup.
   - Tracks evidence and completion status.

2. `stoquify-landing-01-positioning-clarity`
   - Reworks hero/category clarity.
   - Centers POS, inventory, and OHADA accounting.
   - Reduces first-viewport cognitive load.

3. `stoquify-landing-02-cta-conversion-flow`
   - Aligns CTAs with the real sales motion.
   - Handles demo, discovery, register, and public-to-auth paths.
   - Defines conversion events without sensitive payloads.

4. `stoquify-landing-03-proof-trust-claims`
   - Adds credible proof blocks.
   - Prevents invented claims.
   - Labels sample/demo data.
   - Maps every public claim to evidence.

5. `stoquify-landing-04-information-architecture`
   - Simplifies page structure.
   - Moves deep modules into progressive disclosure or dedicated pages.
   - Converts module overload into buyer pathways.

6. `stoquify-landing-05-ui-visual-system`
   - Preserves the premium visual identity.
   - Improves hierarchy, screenshot use, product proof, spacing, typography, and responsive polish.
   - Keeps the page impressive without becoming decorative or heavy.

7. `stoquify-landing-06-accessibility-performance`
   - Enforces keyboard, reduced-motion, text-fit, no-overflow, and performance budgets.
   - Defines screenshot and route-smoke gates.

8. `stoquify-landing-07-localization-ohada`
   - Ensures French and English parity.
   - Protects OHADA/SYSCOHADA accuracy.
   - Keeps regional specificity concrete and trustworthy.

9. `stoquify-landing-08-implementation-release-gate`
   - Runs focused tests, build checks, browser smoke, screenshot capture, and evidence reporting.
   - Certifies whether the page is ready for public growth push.

Optional skills if useful:

10. `stoquify-landing-09-seo-growth-experiments`
    - Defines SEO, content clusters, analytics, and controlled A/B tests.

11. `stoquify-landing-10-product-pages-expansion`
    - Guides creation of dedicated POS, inventory, accounting, compliance, HRIS/payroll, and module pages after homepage clarity is fixed.

## For Each Skill

Each skill must include:

- Name
- Description
- Trigger conditions
- Mission
- Required evidence to inspect
- Step-by-step workflow
- Files/routes likely in scope
- Files/routes out of scope
- Acceptance criteria
- Verification commands
- Risk controls
- Expected saved artifacts
- Stop conditions and escalation criteria
- Relationship to other skills in the suite

## Output Requirements

Save the suite under a dedicated docs folder first:

`docs/landing page/skills-suite/`

Expected files:

- `README.md`
- `skill-suite-map.md`
- `stoquify-landing-00-orchestrator/SKILL.md`
- `stoquify-landing-01-positioning-clarity/SKILL.md`
- `stoquify-landing-02-cta-conversion-flow/SKILL.md`
- `stoquify-landing-03-proof-trust-claims/SKILL.md`
- `stoquify-landing-04-information-architecture/SKILL.md`
- `stoquify-landing-05-ui-visual-system/SKILL.md`
- `stoquify-landing-06-accessibility-performance/SKILL.md`
- `stoquify-landing-07-localization-ohada/SKILL.md`
- `stoquify-landing-08-implementation-release-gate/SKILL.md`

Add optional skills only if they are genuinely useful and not redundant.

Also save a summary report:

`docs/landing page/STOQUIFY_LANDING_PAGE_SKILL_SUITE_REPORT_2026-07-19.md`

If PDF generation is available, create:

`docs/landing page/STOQUIFY_LANDING_PAGE_SKILL_SUITE_REPORT_2026-07-19.pdf`

## Validation

After creating the skill suite:

1. Check every `SKILL.md` has a clear description and executable workflow.
2. Confirm the skills do not duplicate each other excessively.
3. Confirm the suite maps back to every P0/P1/P2/P3 roadmap item.
4. Confirm no skill encourages invented testimonials, fake proof, unsupported compliance claims, or broad refactors.
5. Confirm the suite protects the existing premium OHADA/SYSCOHADA positioning.
6. Confirm each skill includes verification and evidence-output requirements.

Recommended verification commands:

```powershell
rg -n "name:|description:|Mission|Evidence|Workflow|Acceptance criteria|Verification|Risk controls" "docs/landing page/skills-suite" -g "SKILL.md"
rg -n "invent|fake|unsupported|sample data|OHADA|SYSCOHADA|CTA|route smoke|screenshots" "docs/landing page/skills-suite" -g "*.md"
```

If a local Codex skill validator is available, run it against each generated skill. If validation is blocked, document the blocker in the report.

## Risk Controls

- Do not implement landing-page code changes in this run.
- Do not install the skills into the global Codex skills folder unless explicitly requested.
- Do not overwrite existing local skills.
- Do not create one oversized skill that tries to do everything.
- Do not invent customer proof, metrics, logos, certifications, testimonials, or legal/accounting claims.
- Do not remove OHADA/SYSCOHADA specificity.
- Do not make the page generic while simplifying it.
- Do not touch unrelated files.
- Preserve dirty-worktree safety.

## Success Criteria

The task is complete when:

- A complete landing-page skill suite exists under `docs/landing page/skills-suite/`.
- The suite maps directly to the 9+ roadmap.
- The suite gives future agents a disciplined path to transform the landing page phase by phase.
- Every skill is useful to a senior UI/UX or frontend reviewer.
- The suite includes verification, acceptance criteria, and risk controls.
- A summary report is saved under `docs/landing page/`.
- No landing-page implementation files are changed.
```
