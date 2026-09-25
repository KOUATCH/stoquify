# Stoquify Landing, Login and Registration: Execution Prompt

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses not applicable with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

## Mission

Review Stoquify’s landing, login, and registration pages against the product’s current capabilities and recent strategic direction. Determine whether their positioning, content, hierarchy, and visual design need updating.

Where changes are justified, implement them and verify the result within this task. Preserve sections that already communicate effectively; explain any decision to retain a page unchanged.

Deliver a professional, modern, uncluttered experience that makes these points immediately understandable:

1. Who Stoquify serves.
2. The central business problem it solves.
3. What users can accomplish when they begin.
4. Why connecting their daily operations matters.
5. The next useful action to take.
Treat “enterprise grade” as clarity, consistency, trustworthy claims, accessible interactions, and reliable workflows.

## Review Responsibilities

Use the permanent core reviewers: platform architecture; backend/domain integration; data and migrations; application security/IAM/privacy; frontend/design systems; workflow UX/accessibility/localization; product/business analysis; quality/release assurance; SRE/performance; and SaaS packaging/adoption.

Activate finance, accounting, reconciliation, payroll, country-pack, and AI reviewers only to validate claims about capabilities their domains own.

## Positioning to Investigate

Evaluate whether Stoquify’s strongest supported message is:

Help growing businesses connect sales, stock, purchasing, payments, and accounting so teams can see what needs attention, act with confidence, and trace the work behind their numbers.

Treat this as a hypothesis to validate against current implementation.

Assess the relevance of newer work around daily operational priorities, reconciliation, accountant collaboration, supplier/customer participation, people operations, and modular adoption. Distinguish available, conditional, incomplete, and planned capabilities.

Identify a primary audience from the evidence. Consider owners and managers of retail, trading, or distribution businesses, with supporting value for operations and finance teams. Avoid an indiscriminate “everything for everyone” message.

## Execution Checklist

### 1. Establish current truth

- Inspect the working tree and preserve existing changes.
- Read recent product, workflow, and UI reports; verify their claims against current source.
- Inspect all six public routes: English and French landing, login, and registration.
- Trace shared components, translations, navigation, and authentication dependencies.
- Review the rendered pages on desktop and mobile before deciding what to change.
- Record which capabilities are actually accessible after registration and which require setup, data, permissions, module activation, or supported country configuration.
Starting signals from the source: the landing page currently composes 12 sections, and the shared authentication layout defines six module highlights and three journey cards. Investigate whether those elements help users complete each page’s purpose.

### 2. Make a targeted content decision

Create a concise keep / simplify / remove / update assessment covering:

- Positioning and audience.
- Repeated messages and competing calls to action.
- Technical or internal terminology.
- Unsupported claims and misleading availability.
- Content density and navigation.
- Continuity from landing → registration → first useful workflow.
Choose one central problem and up to three principal benefits. Separate benefits available immediately from those requiring configuration or operational data.

### 3. Improve the landing page where justified

- Use one clear headline, a short supporting paragraph, one primary action, and at most one secondary action.
- Explain the business outcome before presenting the module catalogue.
- Show up to three concrete benefits, supported by working capabilities.
- Demonstrate one coherent workflow using an existing product view or clearly labelled sample.
- Consolidate overlapping sections. Aim for roughly five to seven major sections when the content supports that structure.
- Put secondary detail behind existing detail pages or accessible disclosure patterns.
- Explain modular adoption without implying that every module is automatically included or activated.
- Preserve useful navigation anchors and update links when sections move.
- Keep trust statements concise and relevant to the buyer’s decision.
Use plain language. For example, translate internal concepts such as “source-linked evidence” into an understandable outcome such as “trace a payment back to the transaction behind it,” where accurate.

### 4. Give login and registration distinct purposes

#### Login

- Prioritize returning users reaching their workspace.
- Make the form the dominant element.
- Retain concise reassurance and essential help links.
- Remove repeated sales content that competes with signing in.
- Preserve authentication, recovery, verification, redirects, and submission safeguards.

#### Registration

- Explain what account creation provides and what happens next.
- Keep the existing workflow understandable through clear steps, field labels, and useful validation.
- Use no more than three concise supporting benefits.
- Preserve required organization, identity, security, consent, and referral behaviour.
- Reduce surrounding clutter before changing required fields or workflow rules.
- Do not promise instant operational results that depend on configuration, imported data, or approvals.

### 5. Apply a coherent visual treatment

Reuse the established brand and design tokens. Improve typography, spacing, contrast, alignment, and responsive behaviour.

Reduce repetitive cards, badges, decorative effects, and competing headings. Keep essential content visible and readable rather than hiding it to create superficial simplicity.

Maintain natural English and French copy, theme consistency where offered, keyboard access, visible focus, accessible errors, password-manager support, and reduced-motion behaviour.

## Evidence to Inspect

- [Landing route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(home)/page.tsx>) and [landing components](<E:/ohada saas/Focused projects/stoquify/components/landing>).
- [Login route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(auth)/login/page.tsx>) and [registration route](<E:/ohada saas/Focused projects/stoquify/app/[locale]/(auth)/register/page.tsx>).
- [Authentication layout](<E:/ohada saas/Focused projects/stoquify/components/auth/AuthLayout.tsx>), [auth copy](<E:/ohada saas/Focused projects/stoquify/components/auth/auth-copy.ts>), and their active forms and hooks.
- [English translations](<E:/ohada saas/Focused projects/stoquify/messages/en.json>) and [French translations](<E:/ohada saas/Focused projects/stoquify/messages/fr.json>).
- [Enterprise roadmap](<E:/ohada saas/Focused projects/stoquify/what-next/2026-09-06-stoquify-enterprise-execution-roadmap.md>) and [user-value assessment](<E:/ohada saas/Focused projects/stoquify/what-next/ui-missing-capabilities-value-assessment.md>).
- Recent relevant reports under [what-next](<E:/ohada saas/Focused projects/stoquify/what-next>) and [innovation](<E:/ohada saas/Focused projects/stoquify/innovation>).
- Relevant route/component relationships in [graphify-out](<E:/ohada saas/Focused projects/stoquify/graphify-out>); use current source as the authority.

## Expected Artifacts

1. Targeted implementation and updated EN/FR copy.
2. A brief claims table connecting each principal benefit to implementation evidence and availability conditions.
3. Before-and-after screenshots for all three pages in both languages, on desktop and mobile.
4. A concise report saved to:
   E:/ohada saas/Focused projects/stoquify/what-next/public-experience-direction-review.md
Include the positioning decision, changes, retained elements, verification results, and unresolved blockers.

## Verification Commands

Run the existing focused checks:

```powershell
npm run ui:gate:public-color
npm run ui:gate:public-content
npm run ui:gate:landing-refinement
npm run ui:gate:landing-navigation-localization
npm run ui:smoke:public
```

Run affected authentication tests and package/adoption checks when those areas change. Update assertions that intentionally encode replaced copy or structure while preserving behavioural coverage.

Verify responsive layouts, keyboard navigation, 200% zoom, French text expansion, form validation, submission states, links, and redirects. Record passed, failed, skipped, and blocked checks accurately. Use synthetic data for any registration exercise.

## Risk Controls and Non-Goals

- Preserve unrelated working-tree changes; do not clean up unrelated lint warnings.
- Preserve authentication, tenant isolation, permissions, entitlement, privacy, and anti-abuse controls.
- Keep business rules server-owned.
- Do not turn this task into a dashboard redesign, schema migration, pricing revision, or authentication rewrite.
- Do not present roadmap items as shipped features.
- Do not invent customer logos, testimonials, performance figures, savings, free trials, or compliance guarantees.
- Label sample data and redact sensitive information in screenshots.
- Do not deploy or publish externally as part of this task.

## Success Criteria

- The first screen clearly communicates the audience, central problem, practical benefit, and next action.
- Landing content has fewer competing messages and a coherent progression.
- Login prioritizes access; registration explains a credible beginning.
- Major benefits are traceable to current capabilities, with material prerequisites stated.
- EN/FR pages remain consistent, readable, responsive, and functional.
- Relevant checks pass, and any remaining limitations are documented without overstating readiness.
