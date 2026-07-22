---
name: stoquify-landing-02-cta-conversion-flow
description: Aligns Stoquify public landing-page CTAs, demo/discovery/register decisions, adoption flow, public-to-auth transitions, and conversion events. Use when changing CTA labels, links, header actions, pricing/adoption copy, or unauthenticated landing click paths.
---

# Stoquify Landing CTA Conversion Flow

## Mission

Make every CTA honest, intentional, and measurable. Align the landing page with the real sales motion instead of dropping visitors into confusing protected routes.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `what-next/ui-ux/landing-packages-adoption-report-2026-07-18.md`
- `components/landing/hero.tsx`
- `components/landing/landing-header.tsx`
- `components/landing/pricing-section.tsx`
- `components/landing/final-cta.tsx`
- `components/landing/operations-map.tsx`
- `messages/en.json`
- `messages/fr.json`

## Workflow

1. Identify the primary conversion goal: qualified demo/adoption intent, registration, or product exploration.
2. If self-service is not production-ready, use demo/discovery language as the primary CTA.
3. Keep one primary CTA and one secondary CTA pattern across header, hero, adoption, and final CTA.
4. Map every public link target.
5. Replace confusing public-to-auth links with public-safe exploration, an auth-aware transition, or explicit sign-in/workspace wording.
6. Block unexplained login walls, 401/403 dead ends, and protected dashboard destinations from landing cards.
7. Define conversion events without sensitive payloads when analytics are in scope.
8. Verify unauthenticated click paths on desktop and mobile.

## Likely In Scope

- landing CTAs and link targets
- `PricingSection`
- `FinalCTA`
- `LandingHeader`
- `OperationsMap` link behavior
- public route smoke scripts and tests

## Out Of Scope

- Building a CRM, scheduling, billing, or provisioning system unless explicitly requested.
- Adding tracking that sends personal, payment, payroll, or tenant-sensitive data.
- Changing protected dashboard authorization.

## Acceptance Criteria

- CTA intent is consistent across the page.
- No CTA implies instant provisioning unless it is true.
- Public users never hit a confusing login wall.
- Protected destinations are framed as sign-in or workspace-required.
- Adoption copy explains next steps plainly.
- One primary conversion metric is defined.
- Qualified demo/adoption intent is preferred over generic click volume unless self-service is confirmed ready.
- Public-to-auth transitions are explicit, reversible, and understandable before redirect.

## Verification

```powershell
npm test -- scripts/__tests__/landing-public-content.test.js scripts/__tests__/landing-navigation-localization.test.js
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
```

Manual checks:

- CTA click-path test while unauthenticated.
- Mobile touch-target review.
- EN/FR CTA parity review.

## Risk Controls

- Do not hide quote-led pricing behind vague copy.
- Do not create analytics payloads with sensitive data.
- Do not change auth/RBAC behavior to make marketing clicks pass.
- Do not overpromise rollout timing.

## Expected Artifacts

- CTA/link map.
- Conversion event map if analytics are touched.
- Browser smoke evidence.

## Stop Conditions

Stop if sales motion is undecided or if a CTA depends on a missing demo-booking/register workflow.

## Related Skills

Use after `stoquify-landing-01-positioning-clarity`. Pair with `stoquify-landing-03-proof-trust-claims` for adoption and trust CTAs.
