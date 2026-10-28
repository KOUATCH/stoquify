---
name: stoquify-landing-08-implementation-release-gate
description: Runs Stoquify landing-page implementation readiness checks, focused tests, production build, browser smoke, screenshot capture, claim safety checks, and 9+ go/no-go reporting. Use before calling the public landing page ready for launch, growth, or 9+ quality status.
---

# Stoquify Landing Implementation Release Gate

## Mission

Certify whether a landing-page implementation slice is ready, partially ready, or blocked. Prefer evidence over optimism.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `docs/landing page/skills-suite/skill-suite-map.md`
- changed files in the current worktree
- relevant `what-next/ui-ux/` reports
- package scripts and focused landing tests

## Workflow

1. Identify the implementation slice and owning skills.
2. Check git/worktree status and avoid reverting unrelated changes.
3. Run focused static checks and tests.
4. Run browser smoke and screenshot capture where UI is changed.
5. Run production build for release readiness.
6. Run policy gates when trust, public claims, compliance, demo data, or broad release status is touched.
7. Run accessibility, keyboard, reduced-motion, responsive screenshot, protected-route transition, and privacy/claims checks for P0/P1 changes.
8. Summarize pass, fail, skipped, timed out, or blocked checks.
9. Save a dated release-gate report.
10. Decide: READY, NEEDS WORK, or BLOCKED.

## Likely In Scope

- focused landing tests
- smoke scripts
- screenshot evidence
- release reports
- changed landing files

## Out Of Scope

- Fixing unrelated failing tests.
- Mutating data or resetting databases.
- Certifying unsupported compliance claims.
- Approving product strategy decisions.

## Acceptance Criteria

- Every selected roadmap item has acceptance evidence.
- Typecheck and focused tests pass or failures are documented.
- Production build passes before release status is claimed.
- Browser smoke covers EN/FR and mobile/desktop where relevant.
- Public claims and sample-data labels pass review.
- Protected-route transitions are explicit and do not create public dead ends.
- Analytics/privacy assertions contain no sensitive payloads.
- Accessibility has no Critical/Serious issues.
- Reduced-motion and keyboard gates pass.
- No 9+ status is claimed if a required gate is missing.

## Verification

```powershell
npm run typecheck
npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js
npm run build:app
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Use when public trust/compliance/demo claims change:

```powershell
npm run policy:gates
```

## Risk Controls

- Do not certify from partial evidence.
- Do not ignore hydration warnings.
- Do not mask failed route smoke.
- Do not broaden into unrelated fixes.
- Do not claim performance success without measurement.
- Do not ship P0/P1 changes that introduce unlabeled sample data, untranslated EN/FR copy, inaccessible controls, keyboard traps, motion without reduced-motion fallback, screenshot overflow, or undocumented performance regressions.

## Expected Artifacts

- `what-next/ui-ux/stoquify-landing-release-gate-YYYY-MM-DD.md`
- screenshot paths
- command results summary
- unresolved blockers

## Stop Conditions

Stop and mark BLOCKED if required browser tooling, dev server, proof approval, or build prerequisites are unavailable.

## Related Skills

Run after each implementation phase and at the end of the full 9+ roadmap.
