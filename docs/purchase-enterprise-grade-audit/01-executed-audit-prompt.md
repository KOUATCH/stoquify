# Stoquify Purchase Page Enterprise-Grade Audit Prompt

**Execution date:** 2026-08-17  
**Workspace:** `E:\ohada saas\Focused projects\stoquify`  
**Requested output override:** The source prompt names `what-next/purchase-page-enterprise-readiness-audit.md`; the user's execution request supersedes that destination and requires all deliverables under `docs/purchase-enterprise-grade-audit/` in Markdown and PDF.

---

Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

## Project

Stoquify

## Workspace

`E:\ohada saas\Focused projects\stoquify`

## Domain

Purchasing and accounts payable

## Mission

Inspect the existing purchase page and determine why it may fall short of professional, modern, enterprise-grade product standards. Evaluate the rendered user experience together with its supporting code, workflow contracts, permissions, and business semantics. Produce an evidence-backed, prioritized modification plan that can bring the page to enterprise-grade quality without implementing changes during this audit.

Do not judge the page from visual styling alone. Assess whether it enables purchasing users to complete real operational workflows safely, efficiently, accessibly, and with sufficient context, controls, traceability, and recovery paths.

## Permanent core reviewers

- Principal enterprise/platform architect: assess domain ownership, dependencies, tenancy boundaries, modularity, and integration contracts.
- Staff backend/domain and integration engineer: validate server-owned business truth, APIs, transactional boundaries, concurrency, idempotency, and failure handling.
- Principal data/database architect: assess data integrity, monetary precision, provenance, retention, and schema implications.
- Principal application-security, IAM, privacy, and abuse-resistance architect: assess tenant isolation, RBAC, module entitlement, segregation of duties, fresh authentication, redaction, auditability, and least privilege.
- Senior frontend and design-systems engineer: assess component quality, consistency, responsiveness, performance, maintainability, and state completeness.
- Principal workflow/service designer, accessibility specialist, and localization/content strategist: assess user journeys, ergonomics, WCAG behavior, bilingual copy, localization, recoverability, and human factors.
- Principal product strategist and business-process analyst: connect the page to purchasing outcomes, lifecycle states, operating procedures, and measurable user value.
- Principal quality engineer and release-assurance lead: define the browser, accessibility, workflow, failure-path, and regression evidence needed for safe implementation.
- Principal SRE/observability engineer: assess performance, telemetry, diagnosability, resilience, and operational supportability.
- Principal SaaS platform and product-operations strategist: assess module entitlement, tenant safety, packaging boundaries, adoption, and supportability.

## Activated domain reviewers

- Purchasing, supplier-risk, accounts-payable, maker-checker, and payment-controls specialist.
- Enterprise finance, OHADA accounting, treasury, reconciliation, fraud-risk, and internal-controls specialist.
- Audit, evidence, records-governance, and data-quality specialist.
- API, webhook, event/outbox, import/export, and third-party-boundary specialist.
- Change-management, training, support, and operational-readiness specialist.

## Scope and discovery

1. Locate the canonical purchase page and confirm its route, entry points, roles, module entitlement, and intended business purpose.
2. Inspect the page in the running application at representative desktop, tablet, and mobile widths.
3. Exercise every visible workflow and important state that can be reached safely.
4. Inspect the page implementation and relevant components, hooks, actions, services, permissions, schemas, tests, and design-system primitives.
5. Consult relevant architecture graphs:
   - `graphify-out/graph_components.json`
   - `graphify-out/graph_app.json`
   - `graphify-out/graph_actions.json`
   - `graphify-out/graph_hooks.json`
   - associated `GRAPH_REPORT_*.md` reports
6. Inspect relevant recent artifacts under `what-next/` and `innovation/` when they describe purchasing, AP, dashboard, design-system, workflow, or release constraints.
7. Distinguish:
   - implemented and effective;
   - implemented but inconsistent;
   - partial or misleading;
   - missing;
   - technically present but unusable;
   - intentionally deferred;
   - blocked by missing service or data contracts.

## Audit dimensions

### A. First impression and visual quality

- Does the page immediately communicate its purpose, scope, current state, and primary action?
- Assess hierarchy, spacing, alignment, density, typography, color, contrast, iconography, whitespace, borders, elevation, and visual consistency.
- Identify visual clutter, weak hierarchy, excessive card usage, decorative metrics, inconsistent controls, and generic “template dashboard” patterns.
- Verify alignment with Stoquify’s existing design system instead of proposing an unrelated visual language.

### B. Information architecture and workflow usability

- Evaluate whether information and actions follow the user’s purchasing workflow.
- Assess page title, breadcrumbs, navigation context, summaries, tabs, sections, action placement, progressive disclosure, and preservation of user context.
- Measure how easily users can answer: what needs attention, why, who owns it, what is blocked, what is due, and what action should happen next.
- Identify excessive clicks, dead ends, hidden dependencies, ambiguous actions, duplicated information, and context switching.

### C. Purchasing and AP workflow completeness

- Assess relevant lifecycle stages such as draft, request, approval, ordering, partial receipt, complete receipt, supplier invoice, matching, exception, cancellation, closure, and archival.
- Verify that statuses have precise business meaning and permitted transitions.
- Assess supplier identity and risk, line items, quantities, taxes, discounts, currency, delivery, receipt progress, commitments, budget impact, invoice linkage, payment readiness, and accounting consequences where applicable.
- Evaluate maker-checker controls, approval thresholds, rejection/revision paths, segregation of duties, immutable history, evidence attachments, comments, and actor/timestamp visibility.
- Do not recommend UI controls unless the corresponding server-owned action and state transition can exist safely.

### D. Data tables and operational productivity

- Assess search, filters, sorting, pagination, column usefulness, column resizing, density, saved views, row selection, bulk actions, export, and keyboard use.
- Verify that totals, counts, badges, and KPIs have clear definitions and reconcile with the visible data.
- Assess large-dataset behavior, overflow, truncation, sticky headers, scanability, and preservation of filters or pagination after navigation.
- Determine whether the page supports both occasional users and high-volume operators.

### E. Forms, actions, and feedback

- Assess labels, field grouping, defaults, required fields, inline validation, monetary input, date handling, supplier/product selection, duplicate prevention, and unsaved-change protection.
- Review action hierarchy and wording, including primary, secondary, destructive, and irreversible actions.
- Verify confirmations, impact summaries, fresh-auth requirements, optimistic updates, success feedback, actionable error messages, retry behavior, and safe recovery.
- Identify actions that appear available but cannot succeed because prerequisites are not explained.

### F. State completeness

Inspect and assess:

- initial loading;
- background refresh;
- empty state;
- no search results;
- validation errors;
- server or network failure;
- stale data or concurrency conflict;
- partial service failure;
- insufficient permission;
- unavailable module entitlement;
- archived or locked record;
- offline or degraded behavior where relevant;
- long-running action;
- success and post-action state.

### G. Accessibility and inclusive operation

- Evaluate against WCAG 2.2 AA expectations without claiming certification.
- Inspect semantic structure, landmarks, headings, labels, focus order, focus visibility, keyboard navigation, screen-reader naming, contrast, target sizes, reduced motion, zoom, reflow, status announcements, and error association.
- Ensure status and priority are not conveyed by color alone.
- Identify accessibility failures separately from aesthetic preferences.

### H. Responsiveness and localization

- Assess desktop, tablet, and mobile behavior, including dense tables, dialogs, side panels, action bars, filters, and long content.
- Verify French and English copy where supported.
- Assess locale-aware currencies, numbers, dates, time zones, plurals, truncation, and translated-label expansion.
- Flag hard-coded copy or formatting assumptions.

### I. Security, privacy, and control integrity

- Verify organization scoping, tenant isolation, RBAC, module entitlement, and server-side authorization.
- Assess exposure of supplier banking, fiscal, audit, pricing, approval, or attachment data.
- Review destructive actions, exports, audit events, redaction, download authorization, and sensitive error messages.
- Identify UI elements that falsely imply authorization or control guarantees.
- Do not claim the page is secure based on client-side checks.

### J. Performance, resilience, and observability

- Assess loading latency, unnecessary requests, waterfalls, over-fetching, render churn, table scalability, asset weight, and interaction responsiveness.
- Review caching and refresh behavior for stale or financially material data.
- Identify missing telemetry for failed loads, failed mutations, authorization denials, approval exceptions, and slow interactions.
- Distinguish measured problems from suspected risks.

### K. Enterprise trust and product credibility

- Assess whether copy, metadata, provenance, timestamps, ownership, approval history, and data freshness create confidence.
- Flag fake precision, decorative KPIs, placeholder content, ambiguous statuses, misleading automation claims, and actions without evidence or explanation.
- Determine whether the surface looks impressive but fails real purchasing work.

## Required output

### 1. Executive assessment

- State the page’s current maturity: prototype, functional SMB, professional, enterprise-capable, or enterprise-grade.
- Provide a short evidence-backed explanation.
- Identify the five most important obstacles to enterprise readiness.

### 2. Evidence inventory

- Record the canonical route, inspected files, relevant services/actions, permissions, tests, architecture graph nodes or communities, viewport sizes, and workflows exercised.
- Include screenshots for major page regions and material states.
- Clearly label anything that could not be verified.

### 3. Findings register

For every finding include:

- unique ID;
- audit dimension;
- precise evidence and location;
- affected user or role;
- affected workflow;
- severity: critical, high, medium, low;
- consequence;
- probable root cause;
- recommendation;
- dependencies;
- implementation effort: S, M, L, XL;
- confidence: confirmed, strongly inferred, speculative.

### 4. Target experience

Describe the recommended page structure and interaction model:

- page header and operating context;
- attention or exception summary;
- filters and saved views;
- main work queue or purchase register;
- contextual details;
- lifecycle and approval history;
- evidence and linked documents;
- action placement;
- state, feedback, and recovery behavior.

Use a compact text wireframe or Mermaid flow only when it materially clarifies the recommendation.

### 5. Prioritized remediation roadmap

Group modifications into:

- P0: correctness, authorization, data integrity, destructive-action, or blocked-workflow defects;
- P1: high-impact workflow, accessibility, state-completeness, and trust improvements;
- P2: productivity, visual refinement, responsiveness, and performance improvements;
- P3: optional enhancements supported by demonstrated user value.

For each phase, identify frontend, service/API, data, permission, testing, and operational implications. Do not disguise missing backend contracts as cosmetic UI work.

### 6. Acceptance criteria

Provide measurable acceptance criteria for the recommended target state, including:

- task completion and action clarity;
- workflow and lifecycle correctness;
- tenant, RBAC, and entitlement enforcement;
- accessibility;
- responsive behavior;
- localization;
- loading and mutation performance;
- complete robust states;
- auditability and evidence;
- regression protection.

### 7. Verification plan

Recommend focused:

- unit tests;
- service/action integration tests;
- authorization and tenant-isolation tests;
- purchasing lifecycle and approval-transition tests;
- browser tests at representative viewports;
- keyboard and accessibility checks;
- failure, timeout, stale-data, and concurrency tests;
- visual-regression checks;
- performance measurements.

### 8. Save the completed audit as

`what-next/purchase-page-enterprise-readiness-audit.md`

Include a command/evidence appendix listing checks as passed, failed, skipped, timed out, or blocked.

## Risk controls

- Audit and propose only; do not modify production code, schema, configuration, dependencies, or data.
- Do not perform destructive database operations or reset/reseed environments.
- Preserve the dirty worktree and do not overwrite or revert unrelated user changes.
- Do not touch unrelated lint warnings or broaden the audit into unrelated modules.
- Treat client-side visibility as presentation, not authorization.
- Do not invent server capabilities, workflow states, KPIs, compliance rules, or user evidence.
- Require dated provenance and qualified human review for legal, tax, OHADA/SYSCOHADA, or accounting claims.
- Separate confirmed defects from design preferences and speculative opportunities.
- Prefer surgical reuse of existing design-system patterns over wholesale redesign.

## Success criteria

- The canonical purchase surface and its supporting contracts are identified.
- The rendered page is evaluated at representative viewports and across material workflow states.
- Every material conclusion is supported by code, runtime, screenshot, test, or architecture evidence.
- Findings are prioritized by business risk and user impact rather than visual taste.
- Recommendations distinguish UI changes from required service, data, permission, and control work.
- The target experience is specific enough for a later implementation run without requiring major design guesses.
- Accessibility, security, tenant isolation, purchasing controls, localization, resilience, and performance are explicitly covered.
- The audit report is saved at the required path with unresolved blockers clearly identified.

## Non-goals

- Do not implement the recommendations during this run.
- Do not redesign the entire Stoquify application.
- Do not replace the established design system without evidence that it is inadequate.
- Do not introduce speculative purchasing capabilities unrelated to observed workflows.
- Do not claim enterprise, accessibility, security, accounting, or compliance certification.
