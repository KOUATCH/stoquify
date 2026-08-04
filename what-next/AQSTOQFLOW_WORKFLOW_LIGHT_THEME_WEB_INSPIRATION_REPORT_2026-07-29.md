# Aqstoqflow Workflow Light Theme Web Inspiration Report

Date: 2026-07-29
Scope: Landing workflow section only (`#workflow`).

## Sources Inspected

- Linear homepage: light product-system presentation, product workflow language, agent-era operating patterns. https://linear.app/homepage
- Stripe homepage: light editorial infrastructure framing, strong proof metrics, modular business capability cards. https://stripe.com/
- Vercel homepage: crisp platform modules, agentic infrastructure framing, high-contrast light system cards. https://vercel.com/
- Notion product page: approachable light workspace surfaces, task cards, AI/team collaboration framing. https://www.notion.com/product
- SaaS design pattern scan: current landing pages lean on product evidence, bento-like layouts, and screenshots/proof instead of vague decoration.

## Applied Direction

The previous workflow section was a dark carousel with all modules carrying equal visual weight. The revised section uses a light product-board treatment:

- A light section band separates workflow from the darker surrounding landing rhythm.
- A large synchronized spotlight panel shows the active module, copy, and control signal.
- A compact five-step route highlights the operating path from POS to inventory, purchasing, finance, and close.
- The full 17-module carousel remains, but now works as a module navigation rail instead of doing all the storytelling alone.
- Existing `landing.workflow` translation keys were reused; no new locale copy was introduced.

## Files Changed

- `components/landing/connected-workflow.tsx`
- `app/[locale]/(home)/landing.css`

## Verification

Static checks:

- `npx eslint components\landing\connected-workflow.tsx` passed.
- `npm run typecheck` passed.
- `npm run lint` passed with 0 errors and 4 unrelated existing warnings:
  - `components/dashboard/items/ModernItemFormForEditing.tsx`: `<img>` warning.
  - `components/frontend/custom-carousel.tsx`: `<img>` warning.
  - `components/ui/groups/inventory/ItemManagement.tsx`: `<img>` warning.
  - `config/permissions.ts`: anonymous default export warning.

Browser verification:

- Verified against `http://localhost:3002/en` using a fresh Turbopack dev server.
- Desktop screenshot: `what-next/workflow-light-theme-screenshots-2026-07-29/desktop.png`.
- Mobile screenshot: `what-next/workflow-light-theme-screenshots-2026-07-29/mobile.png`.
- Metrics JSON: `what-next/workflow-light-theme-screenshots-2026-07-29/metrics.json`.

Observed browser metrics:

- Desktop 1440x1100: 17 workflow slides, 5 route cards, spotlight present, next button moved spotlight from `pos` to `inventory`, no horizontal overflow.
- Mobile 390x1100: 17 workflow slides, 5 route cards, spotlight present, next button moved spotlight from `pos` to `inventory`, no horizontal overflow.
- Route-card scroll checks reported no hidden overflow on desktop or mobile.

## Diagnostic Notes

- Existing server on port `3000` eventually responded but had intermittent long navigation timeouts.
- A temporary webpack dev server on port `3001` hit a Next dev cache/runtime error in `product-gallery.tsx`: `__webpack_modules__[moduleId] is not a function`.
- The final browser verification used a fresh Turbopack server on port `3002`, which rendered and passed the workflow checks.