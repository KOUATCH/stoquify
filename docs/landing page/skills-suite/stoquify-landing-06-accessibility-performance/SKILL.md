---
name: stoquify-landing-06-accessibility-performance
description: Certifies Stoquify landing-page WCAG 2.2 AA accessibility, responsive behavior, keyboard support, reduced motion, text fit, no-overflow behavior, production rendering, asset optimization, and performance budgets. Use when auditing or changing landing-page UI quality gates.
---

# Stoquify Landing Accessibility Performance

## Mission

Make the landing page usable, stable, fast enough, and verifiable across devices before any 9+ quality claim.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `app/[locale]/(home)/landing.css`
- `components/landing/landing-section-navigation.tsx`
- `components/landing/module-deep-dives.tsx`
- `components/landing/use-cases.tsx`
- `scripts/public-content-browser-smoke.js`
- `scripts/landing-navigation-localization-browser-smoke.js`
- `scripts/product-command-screenshot-browser-smoke.js`
- `scripts/ui-route-smoke-gate.js`
- prior browser evidence under `what-next/ui-ux/`

## Workflow

1. Inspect landmarks, headings, names, roles, values, alt text, contrast, focus visibility, forms/CTAs, links, and status text.
2. Verify keyboard-only operation for header nav, section nav, CTAs, links, tabs, carousels, menus, and auth-aware transitions.
3. Confirm Enter/Space activation, Escape overlay closure, no keyboard traps, visual focus, and focus return to trigger.
4. Verify reduced-motion handling for animations, ticker effects, scroll behavior, carousels, product visuals, counters, transitions, and live indicators.
5. Check EN/FR text fit at mobile, tablet, desktop, wide desktop, 200% zoom, and 400% zoom where practical.
6. Confirm no horizontal overflow, section overlap, sticky-nav occlusion, clipped labels, or unreadable product screenshots.
7. Run production build when release readiness or rendering behavior is in scope.
8. Capture browser-smoke evidence and screenshots.
9. Record performance budgets and remediation if budgets are not met.

## Likely In Scope

- landing CSS and interactive landing components
- browser-smoke scripts
- landing tests
- image sizing and loading attributes
- route smoke reports

## Out Of Scope

- Authenticated dashboard accessibility unless linked from public flow.
- Broad app-wide performance refactors.
- Unrelated lint cleanup.

## Acceptance Criteria

- Keyboard navigation works for navigation, tabs, carousels, and CTAs.
- WCAG 2.2 AA audit has zero Critical/Serious issues, or release is blocked.
- Accessibility issues are mapped to WCAG criteria when found.
- Screen-reader/manual assistive review is completed when release readiness is claimed.
- Tab order follows visual order, focus is visible, no traps exist, Escape closes overlays, and focus returns to trigger.
- Reduced-motion preference is respected.
- Nonessential motion stops or becomes instant/fade-only under reduced motion.
- Mobile/tablet/desktop/wide screenshots show no clipping, overlap, unreadable text, sticky-nav occlusion, blank assets, or horizontal overflow.
- EN and FR text fit within components.
- Production build passes before release readiness is claimed.
- Lighthouse desktop 90+ and mobile 85+ are met, or a documented waiver and remediation plan exists.
- LCP is below 2.5s and CLS below 0.1 on production-like runs, or remediation is documented.
- Hydration warnings are absent in production-style runs.

## Verification

```powershell
npm run typecheck
npm run build:app
npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

## Risk Controls

- Do not mark accessibility complete without keyboard and responsive evidence.
- Do not hide failed performance checks.
- Do not rely only on development-server screenshots for release readiness.
- Do not break EN/FR text fit.
- Do not allow autoplay motion without pause or reduced-motion fallback.
- Do not hide performance-budget regressions behind visual polish.

## Expected Artifacts

- Browser evidence JSON.
- Screenshot set.
- Performance notes.
- Accessibility checklist.

## Stop Conditions

Stop if browser tooling or dev server access is unavailable and record the blocker rather than certifying readiness.

## Related Skills

Use with `stoquify-landing-08-implementation-release-gate` for go/no-go decisions.
