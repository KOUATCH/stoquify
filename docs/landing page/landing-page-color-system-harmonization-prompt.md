# Landing Page Color-System Harmonization Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Conduct an evidence-led review and implementation pass to harmonize the color system of the Stoquify landing page with the authenticated application and its broader design system.

## Objective

Create one coherent, enterprise-grade visual language across the landing page, login/register experience, and authenticated product. The public experience should remain polished and expressive, but it must clearly feel like the entrance to the same product.

## Tasks

1. Inspect the existing design tokens, global styles, Tailwind configuration, UI registry, landing components, authentication surfaces, and representative authenticated workflows.
2. Identify the application's canonical color system before making changes. Document:
   - Brand and primary action colors
   - Neutral backgrounds, surfaces, borders, and text hierarchy
   - Success, warning, error, information, pending, and disabled semantics
   - Focus, hover, selected, active, and destructive states
   - Light- and dark-theme behavior
3. Locate hard-coded colors, conflicting palettes, gradients, shadows, and semantic inconsistencies in the landing and authentication components.
4. Establish or reuse shared semantic tokens instead of duplicating raw color values inside components.
5. Update the landing page so its navigation, hero, product demonstrations, workflow sections, pricing, trust content, calls to action, and footer use the same brand and semantic color language as the application.
6. Harmonize login and registration surfaces where they share the public visual system, ensuring a natural transition from landing page to authentication and then into the product.
7. Preserve sufficient visual distinction between marketing content and operational interfaces through composition, spacing, typography, imagery, and density rather than an unrelated color palette.
8. Preserve existing functionality, localization, responsive behavior, accessibility, tenant isolation, RBAC, and application state semantics.
9. Do not redesign unrelated authenticated workflows or replace established colors solely for novelty.

## Evidence To Inspect

- `docs/UI/UX/`
- `docs/product/user-experience/ui-registry.md`
- Relevant reports under `what-next/ui-ux/`
- Global CSS and design-token definitions
- Tailwind and theme configuration
- `components/landing/`
- `components/auth/`
- Representative authenticated components for dashboards, POS, finance, inventory, compliance, payroll, and reconciliation
- Relevant route files under `app/[locale]/`

## Implementation Requirements

- Prefer semantic tokens such as brand, surface, foreground, muted, success, warning, error, and information over raw hexadecimal values.
- Do not collapse the product into a one-note palette.
- Maintain WCAG-compliant contrast for text, controls, focus indicators, links, and state messaging.
- Ensure status colors retain consistent meanings across public examples and authenticated workflows.
- Avoid excessive gradients, decorative color effects, or marketing colors that do not exist elsewhere in the product.
- Preserve the dirty worktree and do not modify unrelated files or clean up unrelated lint warnings.

## Verification

- Run focused linting for every changed file.
- Run the project typecheck where feasible.
- Verify localization files remain valid.
- Smoke-test the landing, login, and registration routes at desktop and mobile viewports.
- Check light and dark themes where supported.
- Confirm hover, focus, active, disabled, success, warning, error, and destructive states remain distinguishable.
- Capture before-and-after or final screenshots under `what-next/ui-ux/evidence/`.

## Expected Artifacts

- The focused implementation changes.
- A concise color-token and semantic-state inventory.
- Desktop and mobile screenshot evidence.
- A report under `what-next/ui-ux/` explaining:
  - What was inspected
  - Which palette was selected as canonical
  - Which inconsistencies were corrected
  - Verification results
  - Any remaining visual or accessibility risks

## Success Criteria

- The landing, authentication, and authenticated application visibly belong to one product family.
- Public calls to action match application action semantics.
- Colors communicate the same meaning throughout the system.
- Light and dark experiences remain accessible and coherent.
- The landing page remains attractive and distinctive without introducing a separate visual identity.
- No unrelated product behavior or styling is regressed.
