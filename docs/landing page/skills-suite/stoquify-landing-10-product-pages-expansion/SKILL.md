---
name: stoquify-landing-10-product-pages-expansion
description: Plans or implements dedicated Stoquify public product pages for POS, inventory, purchasing, finance, reconciliation, OHADA accounting, compliance, HRIS/payroll extensions, use cases, accountant/partner content, and module-depth expansion after homepage clarity is fixed.
---

# Stoquify Landing Product Pages Expansion

## Mission

Move deep product detail out of the homepage into public, evidence-backed product pages so the homepage can stay clear while evaluators still find depth.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `app/[locale]/(home)/page.tsx`
- `components/landing/module-deep-dives.tsx`
- `components/landing/operations-map.tsx`
- `components/landing/use-cases.tsx`
- relevant route conventions under `app/[locale]/`
- messages and metadata patterns
- graph output only when routing or dependency analysis matters

## Workflow

1. Confirm homepage positioning and IA are stable.
2. Identify which deep modules should become public pages or routed sections.
3. Prioritize pages by buyer value:
   - POS
   - Inventory and purchasing
   - Finance and reconciliation
   - OHADA accounting and close
   - Compliance evidence
   - HRIS/payroll extension
4. For each page, define buyer, pain, capability, proof, trust controls, CTA, and readiness boundary.
5. Reuse existing landing components where appropriate.
6. Keep public pages separate from protected dashboard routes.
7. Add EN/FR copy and metadata only after capability claims are verified.
8. Run route smoke and localization checks.

## Likely In Scope

- new public routes under `app/[locale]/`
- public product components
- landing links to product pages
- localized messages
- route smoke tests

## Out Of Scope

- Authenticated dashboard module implementation.
- Billing/provisioning.
- Unsupported roadmap-only capability claims.
- Country-specific statutory pages without provenance.

## Acceptance Criteria

- Homepage no longer needs deep module catalogues for comprehension.
- Public product pages are accessible without auth.
- Each page has a clear buyer, proof, trust boundary, and CTA.
- Protected dashboard links are not used as product exploration.
- EN/FR routes and metadata are complete.

## Verification

```powershell
npm run typecheck
npm test -- scripts/__tests__/landing-navigation-localization.test.js
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Use `graphify-out/` reports for route/dependency impact analysis when product pages touch broader app routing.

## Risk Controls

- Do not create product pages for unverified capability.
- Do not duplicate large homepage content without purpose.
- Do not expose protected app data or routes.
- Do not overpromise HRIS/payroll or compliance readiness.

## Expected Artifacts

- Product-page IA plan.
- Route map.
- EN/FR copy inventory.
- Screenshot and route-smoke evidence.

## Stop Conditions

Stop if module readiness, public route strategy, or claim evidence is unresolved.

## Related Skills

Use after `stoquify-landing-04-information-architecture`. Pair with `stoquify-landing-07-localization-ohada` and `stoquify-landing-08-implementation-release-gate`.
