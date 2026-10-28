---
name: stoquify-landing-09-seo-growth-experiments
description: Guides Stoquify landing-page SEO, analytics event maps, growth measurement, content clusters, A/B tests, calculators, and controlled experiments after baseline positioning, CTA, and proof gates are stable. Use for SaaS growth readiness work on the public landing page.
---

# Stoquify Landing SEO Growth Experiments

## Mission

Make landing-page growth measurable and discoverable without destabilizing the core positioning or inventing proof.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `app/[locale]/(home)/layout.tsx`
- landing metadata and messages
- CTA/link map from `stoquify-landing-02-cta-conversion-flow`
- claim inventory from `stoquify-landing-03-proof-trust-claims`
- public routes and product-page plans

## Workflow

1. Confirm P0 positioning, CTA, and proof labeling are stable.
2. Define growth goals before adding tracking or experiments.
3. Create an analytics event map for hero CTA, workflow click, buyer path, trust link, adoption CTA, language switch, and public-to-auth transition.
4. Ensure events carry no personal, tenant, customer, payroll, payment, receipt, or financial payloads.
5. Improve metadata around the concrete category: POS, inventory, OHADA accounting, reconciliation, close evidence.
6. Plan content clusters only where product truth supports the claim.
7. Defer A/B testing until baseline conversion tracking exists.
8. Document experiment hypotheses, success metrics, and stop rules.

## Likely In Scope

- route metadata
- analytics event specs
- content/SEO plans
- public page copy and headings
- experiment reports

## Out Of Scope

- Installing analytics vendors without approval.
- Sending personal, tenant, payroll, payment, or customer data.
- Running experiments before baseline gates pass.
- Creating country-specific legal claims without provenance.

## Acceptance Criteria

- Analytics event map is privacy-safe.
- Consent requirements are respected before analytics activation.
- One primary conversion goal is named.
- SEO language does not contradict product truth.
- Growth experiments have hypotheses and stop rules.
- No experiment removes OHADA/SYSCOHADA differentiation.
- P0 release gate is complete before growth experiments begin.

## Verification

```powershell
rg -n "metadata|title|description|analytics|event|track" "app" "components" "lib"
npm run typecheck
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
```

Manual checks:

- Privacy review for event payloads.
- SEO metadata review.
- Experiment readiness review.

## Risk Controls

- Do not optimize for clicks at the cost of qualified buyer clarity.
- Do not add tracking without privacy review.
- Do not create fake urgency, fake proof, or unsupported ROI claims.
- Do not make calculators promise savings without transparent assumptions.

## Expected Artifacts

- Analytics event map.
- SEO/content cluster plan.
- Experiment brief or readout.
- Privacy review notes.

## Stop Conditions

Stop if analytics consent, privacy posture, baseline CTA, or proof evidence is unresolved.

## Related Skills

Use after `stoquify-landing-01-positioning-clarity`, `stoquify-landing-02-cta-conversion-flow`, and `stoquify-landing-03-proof-trust-claims`.
