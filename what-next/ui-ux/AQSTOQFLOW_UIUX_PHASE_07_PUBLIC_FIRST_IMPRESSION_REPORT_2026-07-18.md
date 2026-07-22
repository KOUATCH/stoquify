# AQSTOQFLOW UI/UX Phase 07 Public First Impression Report

**Date:** 2026-07-18
**Status:** Verified for the focused landing and authentication scope
**Source prompt:** docs/landing page/landing-use-cases-content-and-auth-revamp-prompt.md

## Outcome

The landing page now presents fourteen evidence-oriented operating scenarios through an accessible Embla carousel. Login and registration use clearer business language and three compact context cards without competing with the forms. Selected landing sections were refined where the previous presentation repeated generic copy or used unsupported decorative metrics.

## Implemented

### Use-Case Carousel

- Replaced the five-card static grid with fourteen verified operating scenarios.
- Covers multi-branch operations, point of sale, offline continuity, inventory, purchasing and payables, receivables, payment reconciliation, OHADA accounting and close, compliance and country context, payroll evidence, owner oversight, accountant collaboration, role approvals, and group oversight.
- Uses the repository's installed Embla carousel package.
- Provides one mobile, two tablet, and three desktop cards.
- Supports previous, next, direct-position, pointer, touch-pan, and Enter-key operation.
- Exposes carousel, slide, position, and control labels in English and French.
- Uses stable card heights and proof signals.
- Does not autoplay, so reading control stays with the user and no pause-state burden is introduced.

### Landing Presentation

- Rewrote the fragmentation section so each operating area has its own risk and evidence relationship.
- Reframed automation, assurance, adoption, and final CTA language around controlled outcomes.
- Removed decorative percentages from module deep dives because they were not backed by computed product evidence.
- Replaced nested metric cards in the deep dives with unframed control-signal rows.
- Kept existing card-rich sections restrained rather than adding panels everywhere.

### Login and Registration

- Removed visible internal terms such as tenant, module gates, permission-aware, and command-center phrasing where business language is clearer.
- Added three compact context cards to login.
- Added three compact setup cards to registration.
- Preserved existing forms, themes, localization, authentication, and responsive behavior.

### Durable Controls

- Added scripts/__tests__/landing-public-content.test.js.
- Added scripts/public-content-browser-smoke.js.
- Added ui:gate:public-content and ui:smoke:public-content package commands.
- Expanded ui:smoke:public to cover English and French landing, login, and registration routes.
- Added a product content standard and deferred authenticated-product copy backlog.

## Verification

| Check | Result |
| --- | --- |
| Focused ESLint on edited TypeScript | Pass |
| TypeScript compiler | Pass |
| Public content, color, and route-gate Jest suites | 18 tests passed |
| Public route smoke | 6 routes returned HTTP 200 |
| Full-page screenshot capture | 12 screenshots saved |
| Focused carousel runtime smoke | Pass in English and French |
| Carousel slide count | 14 in each locale |
| Visible cards | 1 mobile, 2 tablet, 3 desktop |
| Keyboard navigation | Position advanced from 1 to 2 with Enter |
| Touch behavior | Computed touch-action is pan-y |
| Horizontal overflow | None on tested landing and auth routes |
| Browser page errors | None |
| Auth journey cards | 3 on login and 3 on registration in each locale |

## Evidence

- what-next/ui-ux/ui-route-smoke-2026-07-18.json
- what-next/ui-ux/public-content-browser-evidence-2026-07-18.json
- what-next/ui-ux/screenshots/2026-07-18/public-home-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/public-home-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/public-home-fr-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/public-home-fr-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-en-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-en-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-en-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-fr-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-fr-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/use-cases-fr-desktop.png
- Full-page English and French login and registration screenshots are saved in the same directory.
- Focused auth-card screenshots are saved as auth-journey-en-login.png, auth-journey-en-register.png, auth-journey-fr-login.png, and auth-journey-fr-register.png.

## Residual Launch Risk

1. Public and auth claims were constrained to capabilities visible in the repository, but product, accounting, compliance, and payroll owners should approve campaign-level claims before external launch.
2. The French catalog follows the repository's ASCII transliteration style. A coordinated native-language and diacritic pass remains advisable.
3. This phase did not mass-rewrite authenticated operational copy. High-risk payment, close, compliance, payroll, and denial-state terminology remains in the dated backlog.
4. The smoke validates structure, interaction, overflow, page errors, and captured pixels. Final design and native-language review should still inspect the evidence on representative physical devices.
5. One development-server capture recorded a transient landing-header hydration mismatch while the build was recompiling. It did not reproduce in the settled final run, but the production-build smoke should explicitly recheck hydration.
6. Browser verification ran against the local development server. Production headers, CDN behavior, external providers, analytics, and deployment-specific font loading were outside scope.
