# AQSTOQFLOW UI/UX Phase 07 Workflow, HRIS, and Daily Control Report

**Date:** 2026-07-18
**Status:** Implemented and verified for the focused public landing scope
**Source prompt:** docs/landing page/landing-workflow-hris-daily-control-refinement-prompt.md

## Outcome

The Connected Workflow section now uses the same accessible Embla interaction model as Operating Scenarios while retaining a distinct module narrative. The operating-system section now includes HRIS as a ninth domain. A new People-to-Pay section explains the ownership boundary between HRIS, payroll, payments and declarations, and accounting close. Daily Control is now a seven-domain interactive workbench rather than a stack of repeated module panels.

## Implemented

### Connected Workflow

- Replaced native horizontal scroll with the repository's existing Embla carousel pattern.
- Presents 17 modules, including HRIS and payroll as separate responsibilities.
- Shows one card on mobile, two on tablet, and three on desktop.
- Adds previous, next, direct-position, keyboard, pointer, and touch operation.
- Adds English and French carousel, slide, position, and control labels.
- Replaces unsupported decorative progress bars with a truthful control signal for each module.
- Keeps manual movement only; no autoplay or pause-state burden was introduced.

### Operating System and HRIS

- Added HRIS and People to the live module grid with a localized link to dashboard/people.
- The grid now presents nine connected domains in a balanced three-column layout.
- Replaced abstract color strips with recognizable module icons and source-oriented metadata.
- Public wording identifies HRIS as a controlled foundation rather than unrestricted production-ready functionality.

### People-to-Pay

- Added a focused four-stage operating bridge:
  1. HRIS people truth.
  2. Payroll readiness.
  3. Payments and declarations.
  4. Accounting and close.
- States what is currently implemented in the repository.
- States the remaining unrestricted-production release boundary.
- Links to the protected people and payroll workspaces.

### Daily Control

- Replaced six repeated module panels with one seven-domain tabbed workbench.
- Adds HRIS alongside inventory, purchasing, finance, accounting, compliance, and payroll.
- Each domain now states:
  - Responsible operating role.
  - Daily decision.
  - Three control signals.
  - Evidence that should survive review.
- Supports click, focus, Arrow Left, Arrow Right, Home, and End tab behavior.
- Removes unsupported percentages and nested metric cards.
- Uses stable, responsive dimensions and horizontal tab scrolling on narrow screens.

## HRIS Capability Decision

Repository inspection found substantially more HRIS implementation than the previous landing presentation implied:

- People directory and profiles.
- Manager and employee self-service.
- Approval inbox and movement history.
- Organization scope.
- Contracts and lifecycle.
- Compensation.
- Time and leave.
- Document evidence and redaction.
- Payment-destination controls.
- Payroll-readiness integration.
- Dedicated HRIS permissions and focused tests.

The latest final-readiness report still records no-go for unrestricted production release. During this landing run, the full TypeScript compiler passed, so the historical typecheck OOM did not reproduce. That does not recertify the complete HRIS release chain or clear environment, provider, authority, deployment, and close-signoff dependencies.

Detailed boundary: what-next/ui-ux/AQSTOQFLOW_PUBLIC_HRIS_CAPABILITY_STATUS_2026-07-18.md

## Verification

| Check | Result |
| --- | --- |
| Focused ESLint | Pass |
| Full TypeScript compiler | Pass |
| Landing refinement content gate | 5 tests passed |
| Combined public regression suites | 23 tests passed |
| Refinement Playwright smoke | 6 locale and viewport checks passed |
| Public route smoke | 6 routes returned HTTP 200 |
| Workflow slide count | 17 in English and French |
| Workflow visible cards | 1 mobile, 2 tablet, 3 desktop |
| Workflow keyboard navigation | Position advanced from 1 to 2 with Enter |
| Workflow touch behavior | Computed touch-action is pan-y |
| HRIS links | /en/dashboard/people and /fr/dashboard/people |
| Daily Control tabs | 7 in English and French |
| Daily Control keyboard behavior | Arrow Right moved Inventory to Purchasing |
| Horizontal page overflow | None |
| Browser page errors | None |
| Screenshot pixel checks | 18 images nonblank |

## Evidence

- what-next/ui-ux/landing-refinement-browser-evidence-2026-07-18.json
- what-next/ui-ux/landing-refinement-screenshot-metrics-2026-07-18.json
- what-next/ui-ux/ui-route-smoke-2026-07-18.json
- what-next/ui-ux/screenshots/2026-07-18/workflow-en-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/workflow-en-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/workflow-en-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/workflow-fr-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/workflow-fr-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/workflow-fr-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-en-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-en-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-en-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-fr-mobile.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-fr-tablet.png
- what-next/ui-ux/screenshots/2026-07-18/daily-control-fr-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/people-to-pay-en-desktop.png
- what-next/ui-ux/screenshots/2026-07-18/people-to-pay-fr-desktop.png
- Refreshed full-page landing, login, and registration screenshots are saved in the same directory.

## Residual Launch Risk

1. HRIS unrestricted production readiness is not certified. The complete final-readiness chain must be rerun against the current tree and target environment.
2. Provider settlement, statutory authority, deployment, production database, and accounting-close signoff were not exercised by this public landing run.
3. Browser interaction evidence is Chromium-based. Broader Safari and Firefox verification remains advisable.
4. The French catalog still uses repository-wide ASCII transliteration. Native editorial and diacritic review remains outstanding.
5. The people and payroll CTAs lead to protected workspaces and still depend on authentication, organization scope, module access, and role permissions.
6. The landing page is longer and contains two manual carousels. No Lighthouse or production-bundle performance budget was run in this phase.
7. Production-build smoke should recheck hydration, external font loading, headers, CDN behavior, and analytics independently from the development server.
