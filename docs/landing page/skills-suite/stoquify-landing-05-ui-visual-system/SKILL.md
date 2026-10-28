---
name: stoquify-landing-05-ui-visual-system
description: Improves Stoquify landing-page visual hierarchy, premium UI system, product screenshots, responsive polish, spacing, typography, interaction treatment, and section composition. Use when changing landing CSS, visual density, cards, product imagery, hero dashboard, or UI polish toward a 9+ design bar.
---

# Stoquify Landing UI Visual System

## Mission

Preserve Stoquify's premium command-center identity while making the page more legible, product-grounded, and respected by senior UI/UX and frontend reviewers.

## Evidence

Read:

- `docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`
- `app/[locale]/(home)/landing.css`
- `app/[locale]/(home)/landing-fonts.ts`
- `components/landing/hero.tsx`
- `components/landing/hero-dashboard.tsx`
- `components/landing/product-gallery.tsx`
- `components/landing/*`
- screenshot reports under `what-next/ui-ux/`

## Workflow

1. Identify the dominant message of each viewport before changing visual weight.
2. Preserve the existing premium palette and typography unless there is a proven issue.
3. Increase real product proof moments before adding decorative visual weight.
4. Avoid nested cards and decorative clutter.
5. Ensure each repeated card has stable dimensions and text fit.
6. Make product screenshots readable on mobile, tablet, and desktop.
7. Use progressive visual hierarchy: hero, product proof, workflow, buyer paths, trust, adoption.
8. Keep animations subtle, purposeful, and reduced-motion safe.
9. Check CSS colors so the page does not collapse into a one-note palette.

## Likely In Scope

- `landing.css`
- hero dashboard visual treatment
- product-gallery assets and captions
- section spacing and card layouts
- responsive rules
- landing components

## Out Of Scope

- Brand redesign from scratch.
- Replacing the landing page with a generic SaaS template.
- Creating unapproved images or product mockups.
- Authenticated dashboard redesign.

## Acceptance Criteria

- Each viewport has one clear dominant message.
- Product proof appears early and is readable.
- No nested-card visual clutter.
- Mobile/tablet/desktop screenshots show no clipping, overlap, unreadable buttons, or cramped labels.
- Text does not require viewport-based font scaling.
- Reduced-motion users do not receive distracting animation.
- Visual sophistication remains higher than generic SMB SaaS.

## Verification

```powershell
node scripts/public-content-browser-smoke.js --base-url http://localhost:3001
node scripts/product-command-screenshot-browser-smoke.js --base-url http://localhost:3001
node scripts/ui-route-smoke-gate.js --base-url http://localhost:3001 --require-screenshots
```

Manual checks:

- Desktop, tablet, and mobile screenshot review.
- Product screenshot readability review.
- CSS color/theme review.

## Risk Controls

- Do not add visual assets that imply unsupported product capability.
- Do not hide important content behind interaction.
- Do not use purely decorative visuals where product proof is needed.
- Do not degrade accessibility for polish.

## Expected Artifacts

- Screenshot set.
- Visual review note.
- Asset provenance note when images change.

## Stop Conditions

Stop when a visual change requires new product screenshots, customer data, or brand assets that are not approved.

## Related Skills

Pair with `stoquify-landing-03-proof-trust-claims` for screenshot trust and `stoquify-landing-06-accessibility-performance` for verification.
