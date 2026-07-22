# Landing Workflow, HRIS, and Daily Control Refinement Prompt

Act as a multidisciplinary principal product, UX/UI, content, accessibility, and frontend engineering team. Review the recently revamped Stoquify landing page and refine it further while preserving the visual quality, enterprise tone, bilingual consistency, and evidence-based presentation already established.

## 1. Workflow Carousel

Redesign the carousel in the Connected Workflow section to follow the same interaction and presentation quality as the Operating Scenarios carousel.

- Reuse the existing Embla carousel implementation and established component patterns.
- Preserve the workflow section's module identity rather than duplicating operating-scenario cards.
- Support one visible card on mobile, two on tablet, and three on desktop.
- Include previous and next controls, position indicators, keyboard navigation, touch gestures, focus states, stable card dimensions, and accessible English/French labels.
- Avoid autoplay unless pause, focus, hover, visibility, and reduced-motion behavior are complete.
- Prevent uneven card heights, clipping, overlap, and page overflow.

## 2. HRIS Representation

Inspect the repository thoroughly to establish the actual implementation status of HRIS and workforce capabilities.

- Include HRIS in the relevant operating-system and module presentation where supported.
- Inspect people records, contracts, organization structure, compensation, attendance, leave, payroll inputs, documents, manager scope, self-service, approvals, and related workflows.
- Distinguish implemented, controlled-pilot, partially implemented, planned, and provider-dependent capabilities.
- Do not present incomplete HRIS functionality as unrestricted production-ready functionality.
- Explain how HRIS connects with payroll, payments, declarations, accounting, compliance, and access controls.
- Record important missing or release-gated capabilities in a follow-up status document.

## 3. Daily Control

Keep the operational focus of Daily Control while making the presentation more polished and useful.

- Improve hierarchy, spacing, typography, iconography, scanning, and responsive behavior.
- Present each module's role, operational question, control signals, and retained evidence.
- Remove decorative or unsupported metrics.
- Avoid nested cards and unnecessary visual density.
- Use an accessible segmented or tabbed interaction only where it improves comparison.
- Preserve a calm, enterprise-grade presentation.

## 4. Broader Landing Refinement

Introduce another section only when it clarifies the operating-system narrative. Suitable themes include HRIS-to-payroll lifecycle, evidence and audit trail, offline continuity, country-pack readiness, and accountant or management collaboration.

Avoid sections that only repeat existing claims.

## 5. Content and Design Standards

- Keep claims aligned with capabilities proven in the repository.
- Maintain professional English and equivalent natural French copy.
- Preserve the shared product color and semantic status system.
- Avoid guarantees, fake statistics, certification claims, internal jargon, card nesting, and visual clutter.
- Preserve landing, authentication, localization, theme, and navigation behavior.

## 6. Verification

- Run focused ESLint, TypeScript, content-contract, and interaction tests.
- Verify English and French at mobile, tablet, and desktop sizes.
- Test keyboard, pointer, and touch behavior for both carousels.
- Confirm there is no overflow, clipping, overlap, hydration error, or browser error.
- Save screenshots and runtime evidence under what-next/ui-ux.
- Save a dated report covering changes, HRIS status, deferred gaps, and residual launch risk.
