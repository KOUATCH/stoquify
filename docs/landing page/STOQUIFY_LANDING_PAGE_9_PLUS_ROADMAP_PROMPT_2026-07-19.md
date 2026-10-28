# Stoquify Landing Page 9+ Roadmap Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
Stoquify / AqStoqFlow public landing page.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Mission:
Using the existing landing-page competitive review document, propose a practical roadmap to raise Stoquify's public landing page to a 9+/10 quality level across every evaluated dimension: first impression, product clarity, visual quality, messaging, trust, conversion flow, responsiveness, accessibility, performance posture, and OHADA/SYSCOHADA market fit.

Primary source document:
- `docs/landing page/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.pdf`
- Also use the source Markdown if easier:
  `what-next/STOQUIFY_LANDING_PAGE_COMPETITIVE_REVIEW_2026-07-19.md`

Evidence to inspect:
- `app/[locale]/(home)/page.tsx`
- `app/[locale]/(home)/landing.css`
- `app/[locale]/(home)/layout.tsx`
- `app/[locale]/(home)/landing-fonts.ts`
- `components/landing/*`
- `messages/en.json`
- `messages/fr.json`
- `public/`
- `docs/landing page/`
- `what-next/ui-ux/`
- Relevant existing screenshots, UI audits, and landing-page reports

Do not redo the full competitive audit unless a claim needs verification. Use the existing document as the baseline.

Tasks:
1. Extract every recommendation, weakness, opportunity, and score gap from the competitive review document.
2. Convert the recommendations into a phased roadmap that can realistically move each evaluated area to 9+/10.
3. Separate the roadmap into:
   - P0: must-fix before public growth push
   - P1: conversion and trust upgrades
   - P2: premium differentiation and growth improvements
   - P3: optional experiments and future optimization
4. For each roadmap item, include:
   - Problem it solves
   - Target landing-page dimension
   - Expected impact
   - Effort level: Small / Medium / Large
   - Dependencies
   - Recommended owner lens: frontend, UX, product, growth, security, compliance, content, or architecture
   - Acceptance criteria
   - Verification method
5. Propose the ideal future landing-page structure, including:
   - Above-the-fold hero
   - Product clarity section
   - Buyer pathway section
   - OHADA/SYSCOHADA trust section
   - Product proof/screenshots
   - Use cases
   - Pricing/adoption CTA
   - Security/compliance proof
   - Final conversion CTA
6. Provide revised scoring targets showing how the roadmap moves each dimension from its current score to 9+.
7. Identify which current sections should be kept, simplified, moved to dedicated pages, or removed from the main landing page.
8. Include a concise implementation sequence that avoids broad rewrites and protects the existing premium visual identity.

Expected artifact:
Save the roadmap as:

`docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.md`

Also create a PDF version in the same folder if PDF tooling is available:

`docs/landing page/STOQUIFY_LANDING_PAGE_9_PLUS_ROADMAP_2026-07-19.pdf`

Success criteria:
- The roadmap directly maps back to the review document.
- Every evaluated landing-page dimension has a clear path to 9+/10.
- Recommendations are practical, prioritized, and implementation-ready.
- The plan preserves Stoquify's premium OHADA/SYSCOHADA positioning.
- The plan reduces cognitive overload without making the page feel generic.
- The artifact is saved under `docs/landing page/`.

Non-goals:
- Do not implement landing-page code changes yet.
- Do not redesign the whole product brand from scratch.
- Do not remove OHADA/SYSCOHADA specificity.
- Do not invent customer proof, metrics, testimonials, or compliance claims.
- Do not touch unrelated files.
```
