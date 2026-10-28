---
name: stoquify-landing-07-localization-ohada
description: Protects Stoquify landing-page English/French parity, Francophone business copy quality, OHADA/SYSCOHADA accuracy, accounting-context wording, country-pack provenance, and regional buyer fit. Use when editing localized landing copy or OHADA/SYSCOHADA positioning.
---

# Stoquify Landing Localization OHADA

## Mission

Make Stoquify's OHADA/SYSCOHADA positioning concrete, accurate, and compelling in both English and French without legal or accounting overclaiming.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `messages/en.json`
- `messages/fr.json`
- `components/landing/*`
- OHADA/SYSCOHADA-related public claims in the competitive review and roadmap
- country-pack or statutory provenance reports when claims reference specific rules

## Workflow

1. Inventory EN and FR landing strings affected by the change.
2. Confirm the English promise is approved before localizing.
3. Translate meaning, not literal sentence structure.
4. Keep POS, inventory, payments, reconciliation, OHADA accounting, close evidence, and compliance terms understandable to business buyers.
5. Preserve OHADA/SYSCOHADA specificity while avoiding statutory guarantees.
6. Ban unsupported jurisdiction-sensitive phrases such as `compliance guaranteed`, `tax-approved`, or `legally compliant` unless evidence and reviewer sign-off exist.
7. Check French text fit in hero, nav, cards, CTAs, tabs, carousels, 200% zoom, and 400% zoom where practical.
8. Document any terms requiring accountant or legal review.

## Likely In Scope

- `messages/en.json`
- `messages/fr.json`
- landing components that structure localized copy
- route metadata if language-specific
- screenshot review for EN/FR

## Out Of Scope

- Hardcoding statutory rules.
- Creating country-specific pages without provenance.
- Translating unsupported product claims.
- Changing accounting logic.

## Acceptance Criteria

- EN and FR pages express the same product promise.
- French copy reads as native business French.
- OHADA/SYSCOHADA claims are concrete and source-backed.
- No translation creates a stronger claim than the English source.
- Text fits on mobile and desktop.
- Regional specificity remains visible in hero, trust, workflow, and adoption sections.
- Country-specific promises have provenance or are removed.

## Verification

```powershell
npm test -- scripts/__tests__/landing-navigation-localization.test.js
node scripts/landing-navigation-localization-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Manual checks:

- Human French review when high-stakes claims change.
- Accountant/compliance review for OHADA/SYSCOHADA wording.

## Risk Controls

- Do not present legal/accounting advice as product fact.
- Do not invent country support.
- Do not make French copy secondary or cramped.
- Do not overpromise regulatory certification.
- Do not allow localization to intensify compliance claims.

## Expected Artifacts

- EN/FR parity notes.
- OHADA claim provenance notes.
- Responsive screenshot evidence.

## Stop Conditions

Stop when a phrase requires legal, accountant, or country-pack provenance and the source is missing.

## Related Skills

Pair with `stoquify-landing-01-positioning-clarity`, `stoquify-landing-03-proof-trust-claims`, and `stoquify-landing-09-seo-growth-experiments`.
