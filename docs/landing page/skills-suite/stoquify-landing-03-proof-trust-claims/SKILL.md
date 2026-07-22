---
name: stoquify-landing-03-proof-trust-claims
description: Governs Stoquify landing-page proof, trust signals, public claims, sample-data labels, screenshot provenance, security/privacy wording, and OHADA/SYSCOHADA overclaim prevention. Use when adding logos, metrics, testimonials, compliance claims, product screenshots, demo data, security language, or trust sections.
---

# Stoquify Landing Proof Trust Claims

## Mission

Increase public trust without inventing proof or overclaiming legal, accounting, security, product, or customer readiness.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`
- `components/landing/trust-section.tsx`
- `components/landing/product-gallery.tsx`
- `components/landing/hero-dashboard.tsx`
- `messages/en.json`
- `messages/fr.json`
- product screenshot provenance reports in `what-next/ui-ux/`

## Workflow

1. Inventory every public claim, metric, logo, testimonial, compliance statement, security statement, trust statement, and screenshot caption.
2. Assign each claim an owner, source file, approval status, locale coverage, and review/expiry date.
3. Move proof into the first 2-3 viewports when verified proof exists.
4. Classify every public visual as `real`, `redacted`, `sample`, `demo`, or `mockup`.
5. Label sample/demo dashboard data visibly.
6. Distinguish product screenshots from designed mockups.
7. Add trust language around RBAC, audit trails, redaction, tenant isolation, and evidence only where supported by implementation.
8. Replace unsupported phrases such as `certified`, `guaranteed`, `legally compliant`, or `tax-approved` unless approval and evidence are present.
9. Keep OHADA/SYSCOHADA language concrete but avoid statutory self-certification.
10. Document unresolved proof gaps instead of filling them with aspirational language.

## Likely In Scope

- `TrustSection`
- `ProductGallery`
- `HeroDashboard`
- landing copy in EN/FR
- public assets and screenshots
- claim inventory reports

## Out Of Scope

- Creating fake customers, logos, testimonials, certifications, or volume metrics.
- Publishing legal/accounting advice.
- Exposing tenant, payroll, payment, customer, or receipt data.
- Changing RBAC or privacy architecture.

## Acceptance Criteria

- Every public proof claim has a source.
- Every public claim has owner, source file, approval status, locale coverage, and review/expiry date.
- Every public visual is classified as real, redacted, sample, demo, or mockup.
- Sample/demo data is labeled.
- No sensitive data appears in public visuals.
- Trust language is specific, truthful, and implementation-backed.
- Unsupported guarantee/certification language is removed or blocked.
- OHADA/SYSCOHADA claims are reviewed for accuracy and provenance.
- Missing proof is recorded as a gap.

## Verification

```powershell
rg -n "certified|guarantee|guaranteed|legally compliant|tax-approved|customer|trusted by|SOC|ISO|sample|demo|OHADA|SYSCOHADA" "components" "messages" "public"
npm run policy:gates
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
```

Use `npm run policy:gates` when public trust, regulatory, demo, or security claims change.

## Risk Controls

- Default unsupported claims to "do not publish."
- Never use real customer or payroll/payment data in public screenshots.
- Do not imply regulatory certification unless documented.
- Keep audit/evidence wording tied to actual product capability.
- Block release if a claim lacks evidence, label, approved fallback wording, or a review owner.

## Expected Artifacts

- Public claims inventory.
- Screenshot provenance note.
- Trust/proof update report.
- Any unresolved approval blockers.

## Stop Conditions

Stop when a claim needs legal, customer, accountant, security, or commercial approval.

## Related Skills

Pair with `stoquify-landing-07-localization-ohada` for OHADA claims and `stoquify-landing-08-implementation-release-gate` before release.
