---
name: stoquify-landing-04-information-architecture
description: Restructures Stoquify landing-page information architecture, section order, buyer pathways, progressive disclosure, module density, navigation labels, and homepage-vs-product-page boundaries. Use when simplifying the homepage, moving deep modules, adding buyer paths, or reducing cognitive load.
---

# Stoquify Landing Information Architecture

## Mission

Make the homepage easy to understand without shrinking Stoquify's platform ambition. Convert module overload into a clear buyer journey and move deep material into progressive or dedicated surfaces.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `app/[locale]/(home)/page.tsx`
- `components/landing/landing-section-navigation.tsx`
- `components/landing/operations-map.tsx`
- `components/landing/module-deep-dives.tsx`
- `components/landing/people-to-pay.tsx`
- `components/landing/use-cases.tsx`
- `messages/en.json`
- `messages/fr.json`

## Workflow

1. Map the current section order and navigation labels.
2. Define the first 3 viewport story: what it is, who it helps, how it works, why trust it.
3. Cap primary navigation to about 5 main choices unless the design proves more are necessary.
4. Convert dense module lists into 3-4 buyer pathways.
5. Keep 3-5 strongest homepage use cases and move extras to deeper pages or disclosure.
6. Demote HRIS/payroll to extension language unless it is the target acquisition wedge.
7. Ensure no critical product understanding depends on hidden tabs, carousel interaction, or a long module catalogue.
8. Preserve anchor behavior, scroll margins, and localization.

## Likely In Scope

- page composition in `app/[locale]/(home)/page.tsx`
- `LandingSectionNavigation`
- `OperationsMap`
- `ModuleDeepDives`
- `PeopleToPay`
- `UseCases`
- landing messages

## Out Of Scope

- Deep product-page implementation unless explicitly paired with `stoquify-landing-10-product-pages-expansion`.
- Dashboard module refactors.
- Broad design-system changes.

## Acceptance Criteria

- First 3 viewports answer what, who, how, and why trust.
- Module catalogue content is not required for basic comprehension.
- Buyer pathways do not list nine modules.
- Deep modules remain available but do not dominate the homepage.
- Navigation is scan-friendly on desktop and mobile.
- EN/FR section labels remain equivalent.

## Verification

```powershell
npm test -- scripts/__tests__/landing-navigation-localization.test.js
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Manual checks:

- First 3 viewport screenshot review.
- Mobile scan review.
- Five-second comprehension test.

## Risk Controls

- Do not remove important capability proof; move or disclose it.
- Do not break anchor navigation.
- Do not create a generic landing page.
- Do not bury OHADA/SYSCOHADA positioning.

## Expected Artifacts

- Before/after section map.
- Buyer-pathway rationale.
- Screenshot evidence.
- Navigation smoke result.

## Stop Conditions

Stop if page structure decisions conflict with unresolved product strategy or if moving modules requires new public routes not yet approved.

## Related Skills

Use after `stoquify-landing-01-positioning-clarity`. Pair with `stoquify-landing-05-ui-visual-system` for section treatment.
