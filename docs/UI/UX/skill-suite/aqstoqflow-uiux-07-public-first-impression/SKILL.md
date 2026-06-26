---
name: aqstoqflow-uiux-07-public-first-impression
description: "Execute Phase 6 of the AqStoqFlow UI/UX revamp: make the landing and login experience product-led, premium, concise, and visually aligned with the operating system promise."
---

# AqStoqFlow UI/UX 07 Public First Impression

## Mission

Make the public landing and authentication experience feel premium, product-led, OHADA-specific, and calm without turning it into a bloated marketing page.

## Inspect First

- `app/[locale]/(home)/page.tsx`
- `components/landing/hero-dashboard.tsx`
- Landing section components
- `components/auth/AuthLayout.tsx`
- `components/auth/BeautifulRegisterForm.tsx`
- Login route components
- Dashboard screenshot or command-center preview source from Phase 04

## Prerequisites

- The default dashboard direction is clear.
- A real or realistic product preview state is available.
- Public positioning is simplified.
- Login security and tenant behavior is understood.

## What To Do

- Show actual product promise earlier.
- Reduce repeated explanatory copy.
- Make the hero sharper and more visual.
- Keep OHADA SMB operating-system positioning.
- Make login secure, calm, and fast.
- Show trust without overwhelming the user.

## How To Implement

- Prefer one strong product preview over many copy-heavy sections.
- Keep first viewport focused on product state, not abstract claims.
- Use public-page styling that feels related to the product without duplicating authenticated work surfaces.
- Shorten module lists into fewer proof points.
- Make login prioritize form completion and tenant trust.
- Do not add fake feature claims or unsupported compliance promises.

## Prompt Contract

```text
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Revamp AqStoqFlow's public landing and login first impression. Inspect landing, hero preview, auth layout, login/register components, and the current product dashboard direction. Make the experience product-led, concise, premium, OHADA-specific, and visually aligned with the operating-system promise. Reduce copy bloat, show real product state early, preserve accessibility and localization, and avoid unsupported claims.
```

## Acceptance Criteria

- A visitor understands the product in one viewport.
- The landing page shows the system promise visually.
- Login feels secure, premium, and fast.
- Public and authenticated pages feel related but not identical.
- Copy is shorter and more decisive.
- Localization and auth behavior are preserved.

## Verification

Run relevant checks:

- `npm run lint`
- `npm run typecheck`
- Browser smoke for `/en` and `/en/login`
- Desktop and mobile screenshot checks for landing and login

## Required Report

Save:

- `what-next/ui-ux/AQSTOQFLOW_UIUX_PHASE_07_PUBLIC_FIRST_IMPRESSION_REPORT_<date>.md`

