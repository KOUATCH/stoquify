---
name: stoquify-landing-01-positioning-clarity
description: Refines Stoquify landing-page hero positioning, category clarity, buyer promise, and first-viewport messaging. Use when updating or auditing the homepage promise, H1, subhead, hero metrics, buyer clarity, or POS plus inventory plus OHADA accounting positioning.
---

# Stoquify Landing Positioning Clarity

## Mission

Make the landing page instantly understandable while preserving the premium OHADA/SYSCOHADA operating-system identity.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `components/landing/hero.tsx`
- `messages/en.json`
- `messages/fr.json`
- `app/[locale]/(home)/page.tsx`
- relevant public first-impression reports in `what-next/ui-ux/`

## Workflow

1. Extract the current hero badge, H1, subhead, metrics, and CTA labels from EN and FR messages.
2. Confirm the current sales and product wedge before writing copy.
3. Lead with the concrete category: POS, inventory, and OHADA accounting in one controlled flow.
4. Keep "ledger-first operating system" as differentiating support, not the only category anchor.
5. Limit the first hero promise to one primary positioning sentence before CTA.
6. Treat HRIS, payroll, compliance, and automation as extensions unless the user explicitly wants them as the acquisition wedge.
7. Preserve EN/FR meaning parity and text fit.
8. Update tests or content checks when copy assertions exist.

## Likely In Scope

- `messages/en.json`
- `messages/fr.json`
- `components/landing/hero.tsx`
- `components/landing/final-cta.tsx`
- `components/landing/landing-header.tsx`
- focused landing content tests

## Out Of Scope

- Pricing implementation.
- Product capability changes.
- Deep module pages.
- Unsupported customer proof or metrics.

## Acceptance Criteria

- A first-time visitor can identify the product category in 5-10 seconds.
- The first viewport answers what Stoquify is, who it helps, and why OHADA matters.
- Hero copy uses fewer product nouns and avoids module-list overload.
- EN and FR preserve the same promise.
- The page still feels premium and finance-aware.

## Verification

```powershell
npm test -- scripts/__tests__/landing-public-content.test.js
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
```

Manual checks:

- Five-second comprehension test.
- Mobile hero screenshot review.
- EN/FR copy parity review.

## Risk Controls

- Do not make the page generic.
- Do not remove OHADA/SYSCOHADA.
- Do not overstate readiness.
- Do not add legal/accounting promises without approved evidence.

## Expected Artifacts

- Before/after copy notes.
- Screenshots when UI text changes.
- Dated report under `what-next/ui-ux/` for substantial updates.

## Stop Conditions

Stop if the primary market wedge or sales motion is unresolved. Ask for product strategy input before editing copy.

## Related Skills

Run before `stoquify-landing-02-cta-conversion-flow`, `stoquify-landing-04-information-architecture`, and `stoquify-landing-07-localization-ohada`.
