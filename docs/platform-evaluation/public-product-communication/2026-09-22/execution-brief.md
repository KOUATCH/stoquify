Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

**Mission**

Refine and implement Stoquify’s landing, login, and registration experiences so they communicate the platform’s important capabilities, their practical value, and how they work together.

Deliver a professional, modern, visually attractive, polished enterprise experience that helps visitors understand the product, recognize its relevance to their responsibilities, and confidently take the appropriate next step.

Make the platform’s breadth understandable through connected business journeys, clear explanations, and purposeful visual storytelling. Educational content is a core requirement on all three surfaces, with depth appropriate to each page.

Workspace: `E:\ohada saas\Focused projects\stoquify`.

**Review responsibilities**

Apply the permanent core reviewers: enterprise/platform architecture; backend/domain/integration engineering; data/database/migration architecture; application security/IAM/privacy; frontend/design systems; workflow UX/accessibility/localization/content; product/business-process strategy; quality/release assurance; SRE/DevSecOps/performance; and SaaS packaging/growth/customer success.

Activate relevant domain reviewers to validate public explanations of inventory/POS, purchasing/AP, payments/reconciliation, HR/payroll, accounting/close, country-specific obligations, evidence, analytics, and AI assistance. Their role is to check the accuracy of the communication; implementation remains focused on public pages and their supporting presentation components.

**1. Establish the current product and page truth**

Inspect the active routes, shared components, copy sources, localization, public navigation, registration workflow, and focused tests before making changes.

Start with:

- [Landing page](</E:/ohada saas/Focused projects/stoquify/app/[locale]/(home)/page.tsx>).
- [Landing copy](</E:/ohada saas/Focused projects/stoquify/components/landing/landing-message-copy.ts>) and [workflow explorer data](</E:/ohada saas/Focused projects/stoquify/components/landing/workflow-atlas-data.ts>).
- [Public authentication copy](</E:/ohada saas/Focused projects/stoquify/components/auth/public-auth-copy.ts>), [login route](</E:/ohada saas/Focused projects/stoquify/app/[locale]/(auth)/login/page.tsx>), and [registration route](</E:/ohada saas/Focused projects/stoquify/app/[locale]/(auth)/register/page.tsx>).
- [Previous messaging decisions](</E:/ohada saas/Focused projects/stoquify/docs/landing-message/implementation-decisions-2026-09-19.md>), [claims assessment](</E:/ohada saas/Focused projects/stoquify/docs/landing-message/results-2026-09-19/claims-assessment.md>), and [verification report](</E:/ohada saas/Focused projects/stoquify/docs/landing-message/results-2026-09-19/final-report.md>).
- Relevant material under [what-next](</E:/ohada saas/Focused projects/stoquify/what-next>), [innovation](</E:/ohada saas/Focused projects/stoquify/innovation>), and [knowledge graphs](</E:/ohada saas/Focused projects/stoquify/graphify-out>).

Use graph nodes and communities to locate related functionality, then verify important relationships against current routes, actions, services, configuration, and tests. Historical reports and graph connections are discovery aids, not proof of present availability.

The earlier messaging work intentionally simplified the pages. Preserve its useful clarity and accurate claims, while fulfilling this request for broader capability visibility and stronger education.

Build an internal coverage matrix containing:

`Capability → audience → problem solved → user action → connected workflow → resulting record/outcome → prerequisites → supporting evidence → public placement`.

Distinguish implemented behavior, conditional availability, partial implementation, and proposals. Every crucial verified capability must receive an intentional placement; record the reason for any omission.

**2. Define a clear audience and message hierarchy**

Use owners and managers of retail and distribution businesses in OHADA markets as the initial primary audience, consistent with existing positioning. Also help cashiers, stock teams, purchasing teams, finance/accounting teams, HR/payroll teams, and administrators recognize their responsibilities.

Organize explanations around:

- What the user needs to accomplish.
- What Stoquify helps them do.
- What information or work passes to another team.
- What outcome becomes easier to review or act on.
- What setup or availability condition materially affects that promise.

Cover the relevant verified capabilities across sales/POS, inventory and locations, purchasing and suppliers, customers and receivables, payments and reconciliation, accounting and close, HR/payroll, reporting and operational oversight, access and approvals, and supported country features.

Include offline operation, integrations, automation, and AI assistance only at the scope supported by current evidence. Avoid implying that every module or connection becomes available immediately after registration.

**3. Explain how the system connects**

Create a readable “How your business works together” experience with concrete workflow examples.

Candidate journeys to verify include:

- **Sell and collect:** sale → stock movement → recorded payment → payment review/reconciliation → accounting review.
- **Purchase and receive:** purchase request/order → approval → goods receipt → stock update → supplier invoice/payable → payment evidence.
- **Manage stock across locations:** receipt/transfer/adjustment → location quantities → valuation and exceptions → management review.
- **Manage people and payroll:** employee and contract information → attendance/payroll inputs → payroll review → payslips, payment evidence, and accounting.
- **Review and close:** operational records → accounting entries and exceptions → reconciliation and close checks → reporting and accountant collaboration.

Treat these as candidates to validate, not preapproved claims.

For each published journey, show the starting action, responsible role, information carried forward, important review or approval, and practical result. Distinguish automatic updates from actions requiring a person, configuration, imported evidence, or an external service.

Use familiar language and labeled visual connections. Explain technical terms when unavoidable.

**4. Give each page a distinct role**

| Surface | Main purpose | Required communication |
|---|---|---|
| Landing | Explain the product and establish relevance | Clear positioning, principal outcomes, capability coverage, connected workflows, product evidence, setup expectations, and a logical next action. |
| Login | Help returning users enter and regain orientation | Prominent sign-in form, a concise reminder of the connected workspace, and an optional route to deeper workflow guidance. |
| Registration | Explain the value and the next steps | Clear account-creation expectations, a compact explanation of the connected capabilities, and accurate guidance on verification and workspace setup. |

For the **landing page**:

- Lead with who Stoquify serves, the central problem, and the practical benefit.
- Provide a clear primary action and a secondary action for exploring how the product works.
- Group capabilities into understandable business areas.
- Make important functionality discoverable through a concise overview and accessible expandable detail.
- Include connected workflow storytelling and representative product visuals.
- Reuse or improve the existing workflow explorer where it meets this purpose.
- Explain how teams can begin with relevant workflows and expand within supported packages and setup conditions.

For **login**:

- Keep credentials, submission, recovery, and error feedback immediately usable.
- Add restrained educational content that reminds users how their work connects across the business.
- Use a compact supporting panel or short linked explanation.
- On small screens, prioritize the form and keep supporting education available without obstructing access.
- Do not require a tour, carousel, or feature selection before signing in.

For **registration**:

- Explain who is creating the account and what successful registration actually produces.
- Describe the verified sequence for email verification, sign-in, and setup.
- Connect account creation to a small number of meaningful business outcomes.
- Clarify setup-dependent capabilities near the relevant claims.
- Preserve existing fields, consent, validation, referrals, invitation context, and submission protections where applicable.
- Add no mandatory marketing questions or extra steps solely to support the new presentation.

**5. Establish the visual and editorial direction**

Build a coherent visual language across all three pages using the existing brand and design system.

Use deliberate typography, generous spacing, strong hierarchy, consistent icons, readable contrast, and purposeful product illustrations. Make workflow relationships a recognizable part of the visual identity.

Innovation should improve understanding. Use a lightweight role or outcome selector, connected workflow highlighting, or progressive explanation when it helps visitors answer a concrete question. Provide keyboard access, reduced-motion behavior, and a usable static explanation.

Keep the experience polished at mobile, tablet, and desktop sizes. Prevent dense diagram labels, excessive scrolling, competing calls to action, and decorative motion that distracts from the task.

Write natural English and French with equivalent meaning. Use confident, specific language, active verbs, and concrete examples. Avoid internal implementation language, unsupported superlatives, and repetitive feature descriptions.

Use concise qualifications beside affected claims. Keep internal evidence classifications in the implementation report.

**6. Preserve product truth and existing behavior**

- Preserve authentication, authorization, tenant boundaries, module entitlements, redirects, verification, recovery, and session behavior.
- Use approved public assets or clearly labeled synthetic examples. Exclude private business and employee information.
- Identify historical screenshots and illustrative figures accurately.
- Do not invent testimonials, customer counts, performance gains, provider coverage, certifications, or compliance guarantees.
- Preserve distinctions between account creation, module availability, workspace configuration, and operational readiness.
- Recheck previously reported broken policy links and authentication verification limitations before treating them as current. Repair presentation links when an approved destination exists; document missing approved destinations without inventing policies.
- Inspect the working tree first. Preserve unrelated changes and do not touch unrelated lint warnings.

**7. Execute and verify**

Follow this sequence:

1. Inspect the current implementation and capture baseline screenshots.
2. Produce the capability coverage and claim-evidence matrix.
3. Define the message hierarchy and page-specific content.
4. Implement the focused copy, layout, navigation, and educational interactions.
5. Verify English/French rendering, responsive layouts, accessibility behavior, and authentication regressions.
6. Save results and remaining limitations.

Review the current scripts before running these focused checks from the workspace:

```powershell
npm run typecheck
npm run ui:gate:public-content
npm run ui:gate:landing-refinement
npm run ui:smoke:public
npm run build:app
```

Run relevant existing authentication and workflow-explorer tests for affected components. Update tests when presentation requirements intentionally change while preserving meaningful behavior and security assertions.

Use the safe application build; avoid build commands that trigger migrations.

Verify:

- All six English/French landing, login, and registration routes.
- Every call to action, section link, disclosure, and workflow interaction.
- Keyboard navigation, visible focus, form labels, error associations, contrast, and reduced motion.
- Layout at 320, 390, 768, and 1440 pixels, plus browser zoom.
- Representative form validation, loading, failure, recovery, and existing success behavior.
- No hidden essential explanation on touch devices.
- No unnecessary authenticated API calls or substantial new client-side dependencies.

Separate real browser observations, mocked scenarios, live authentication evidence, and untested behavior. Record existing baseline failures distinctly from regressions.

**Expected artifacts**

Save the implementation report and supporting evidence under:

`E:\ohada saas\Focused projects\stoquify\what-next\public-product-communication\<run-date>\`

Include:

- Capability coverage and claim-evidence matrix.
- Page purpose, content hierarchy, and final English/French copy.
- Connected workflow explanations and their evidence.
- Focused implementation changes.
- Before/after desktop and mobile screenshots.
- Verification results, unresolved limitations, and concise follow-up actions.

**Success criteria**

The work is complete when:

- A first-time visitor can explain who Stoquify serves, its principal benefits, and at least one connected business journey.
- Every crucial verified capability has a clear place in the public information structure.
- Users can understand what moves between workflows and where human review or setup is required.
- Landing, login, and registration feel visually coherent and each fulfills its distinct educational purpose.
- Login remains quick to use, and registration expectations match actual behavior.
- English and French provide equivalent information.
- Claims are traceable to evidence, key interactions work, and relevant checks pass or have explicit unresolved blockers.

Limit implementation to these public experiences and necessary shared presentation code. Exclude backend feature expansion, authentication redesign, schema changes, pricing changes, unrelated dashboard work, and deployment.