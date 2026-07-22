---
name: stoquify-landing-00-orchestrator
description: Coordinates the Stoquify public landing page 9+ roadmap across positioning, CTA, trust, information architecture, visual system, accessibility, localization, release gates, SEO, and product-page expansion. Use when planning, sequencing, auditing, or resuming the landing-page transformation from roadmap to implementation.
---

# Stoquify Landing Orchestrator

## Mission

Coordinate the 9+ landing-page transformation without broad rewrites. Choose the next phase, assign the right focused skill, preserve evidence, and prevent premature claims of completion.

## Evidence

Read these first:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `docs/landing page/skills-suite/skill-suite-map.md`
- `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`
- `app/[locale]/(home)/page.tsx`
- `messages/en.json`
- `messages/fr.json`
- latest relevant files in `what-next/ui-ux/`

Use `graphify-out/` only when the task involves route, dependency, or architecture impact analysis.

## Workflow

1. Identify the requested phase: P0, P1, P2, P3, or release certification.
2. Inspect current landing evidence and the roadmap mapping.
3. Pick the smallest skill set needed for the requested phase.
4. Define the write scope before editing.
5. Confirm no unrelated landing, dashboard, auth, or module work is included.
6. Track acceptance criteria for every selected skill.
7. Run focused checks or route smoke after implementation.
8. Save a dated evidence report under `what-next/ui-ux/` or `docs/landing page/`.

## Likely In Scope

- `app/[locale]/(home)/page.tsx`
- `app/[locale]/(home)/landing.css`
- `components/landing/*`
- `messages/en.json`
- `messages/fr.json`
- public landing assets
- focused landing tests and browser-smoke scripts

## Out Of Scope

- Authenticated dashboard refactors unless required for public-to-auth routing safety.
- Database schema changes.
- Pricing engine, billing, provisioning, or module entitlement implementation.
- Unrelated lint cleanup.
- Global skill installation.

## Acceptance Criteria

- The next phase is named and bounded.
- The selected skill order matches dependencies in `skill-suite-map.md`.
- P0 is complete before P1/P2/P3 growth work.
- No "9+" status is claimed without release-gate evidence.
- Every change has an evidence artifact or verification note.

## Verification

Use focused checks first:

```powershell
npm run typecheck
npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
```

Use release checks when the slice touches broad behavior, public claims, or readiness status:

```powershell
npm run build:app
npm run policy:gates
```

## Risk Controls

- Do not invent proof.
- Do not imply self-service provisioning unless it is production-ready.
- Do not remove OHADA/SYSCOHADA specificity.
- Do not flatten Stoquify into generic POS marketing.
- Do not change unrelated files.
- Preserve dirty-worktree safety.

## Expected Artifacts

- Phase plan or implementation report.
- Updated checklist of completed roadmap items.
- Command results summary.
- Screenshot or route-smoke evidence when UI changes occur.

## Stop Conditions

Stop and ask when the sales motion is unknown, proof claims lack owners, or required approval is needed for public customer/accounting/security claims.

## Related Skills

Use this skill before selecting any other suite skill. Use `stoquify-landing-08-implementation-release-gate` at the end of every implementation phase.
