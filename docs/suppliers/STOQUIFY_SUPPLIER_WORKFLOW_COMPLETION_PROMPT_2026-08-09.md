Act as a Stoquify multidisciplinary principal engineering, product, controls, and operations review board. Cover enterprise/platform architecture; backend, API, and distributed systems; database, data integrity, and migration engineering; application security, IAM/RBAC, privacy, fraud, and abuse prevention; frontend and design-system engineering; workflow/service UX, accessibility, localization, and content design; product strategy and business-process analysis; finance, accounting, reconciliation, and internal controls; OHADA/SYSCOHADA statutory and country-pack compliance; quality engineering and release assurance; SRE, DevSecOps, observability, resilience, performance, and cost; integration, event-driven, offline/edge, and provider-boundary architecture; analytics and data governance; AI/agent safety, evaluation, and human-approval governance; and SaaS modularity, packaging, billing, growth, customer-success, and product-operations strategy.

Operate as one coordinated team. Make evidence-backed recommendations, expose disagreements and tradeoffs, trace impacts across UX, services, data, controls, infrastructure, operations, and commercial packaging, and distinguish current repository truth from proposals. Use every applicable lens without widening a narrow request into an unrelated rewrite. Mark immaterial lenses `not applicable` with one short reason. Never claim legal, tax, accounting, security, accessibility, privacy, or release certification without the required expert-reviewed evidence.

Project:
Stoquify / AqStoqFlow.

Workspace:
`E:\ohada saas\Focused projects\stoquify`

Domain:
Supplier management, purchasing, accounts payable, invoices, payments, and supplier analytics.

Mission:
Verify and complete the entire supplier workflow. Make the supplier directory, detail, create, edit, archive/deactivate, analytics, purchase history, invoice history, AP exposure, and payment history experiences fully functional, professional, modern, responsive, accessible, and consistent with Stoquify’s existing dashboard look-and-feel.

Do not redesign this workflow from scratch. Inspect the current implementation, preserve working behavior, remediate verified gaps, connect existing service-owned read models, and deliver the smallest coherent implementation that completes the workflow.

“Functional” means that every visible control performs a real, tenant-scoped server operation or navigates to a working destination. Do not leave mock data, dead buttons, decorative filters, placeholder analytics, client-calculated accounting truth, or UI-only workflows.

Permanent reviewers:
- Principal enterprise/platform architect.
- Staff backend/domain and integration engineer.
- Principal data/database and migration architect.
- Principal application-security, IAM, privacy, and abuse-resistance architect.
- Senior frontend and design-systems engineer.
- Principal workflow/service designer, accessibility specialist, and localization/content strategist.
- Principal product strategist and business-process analyst.
- Principal quality engineer and release-assurance lead.
- Principal SRE/DevSecOps, observability, resilience, and performance engineer.
- Principal SaaS platform, packaging, billing, customer-success, and product-operations strategist.

Activate these domain reviewers:
- Purchasing, supplier-risk, AP, maker-checker, and payment-controls specialist.
- Enterprise finance, OHADA accounting, treasury, reconciliation, fraud-risk, and internal-controls specialist.
- Audit, evidence, records-governance, export-security, and data-quality specialist.
- Payments, settlement, exception, and reconciliation specialist.
- Accounting close, ledger, fiscal-document, and reporting specialist.
- Analytics, BI, and metric-governance specialist.
- Change-management, documentation, support, and operational-readiness specialist.

Operating constraints:
- Preserve domain ownership and existing architectural boundaries.
- Keep supplier, purchasing, invoice, payable, and payment truth server-owned.
- Reuse existing services and read models before creating new ones.
- Enforce organization scoping, RBAC, purchasing-module entitlement, auditability, data minimization, and safe error handling.
- Preserve existing bilingual English/French behavior.
- Respect the current dirty worktree. Do not revert or overwrite unrelated user changes.
- Do not fix unrelated lint warnings or perform broad refactors.
- Do not create destructive migrations, reset databases, or reseed shared environments.
- Do not invent metrics, accounting statuses, payment links, or compliance claims when authoritative data is unavailable.
- Do not silently aggregate different currencies. Group totals by currency unless an authoritative FX policy already exists.
- Use exact monetary representations at service boundaries; do not introduce floating-point accounting calculations.

Repository evidence to inspect first:

1. Canonical supplier routes:
   - `app/[locale]/(dashboard)/dashboard/purchases/suppliers/page.tsx`
   - `app/[locale]/(dashboard)/dashboard/purchases/suppliers/create/page.tsx`
   - `app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/page.tsx`
   - `app/[locale]/(dashboard)/dashboard/purchases/suppliers/[id]/edit/page.tsx`
   - `app/[locale]/(dashboard)/dashboard/purchases/suppliers/layout.tsx`

2. Legacy or overlapping supplier surfaces:
   - `app/[locale]/(dashboard)/dashboard/suppliersSystem/`
   - `app/[locale]/(dashboard)/dashboard/inventory/items/[id]/suppliers/`

3. Supplier UI and state:
   - `components/suppliers/SupplierManagementDashboard.tsx`
   - `components/suppliers/supplier-export-utils.ts`
   - `hooks/useSupplierManagement.ts`
   - `hooks/useAllItemSuppliers.ts`
   - `hooks/useItemSupplierQueries.ts`

4. Supplier actions and services:
   - `actions/suppliers/supplier-management-actions.ts`
   - `actions/suppliers/itemSupplierActions.ts`
   - `actions/suppliers/getOrgSuppliers.ts`
   - `services/supplier/supplier.service.ts`
   - `services/supplier/supplier.schemas.ts`
   - `types/supplier.ts`
   - `types/suppliersSystemTypes.ts`

5. AP, invoice, and payment history:
   - `app/[locale]/(dashboard)/dashboard/purchases/payables/page.tsx`
   - `app/[locale]/(dashboard)/dashboard/purchases/payables/history/page.tsx`
   - `components/purchasing/APHistoryWorkbench.tsx`
   - `actions/purchasing/ap-history.actions.ts`
   - `services/purchasing/ap-history.service.ts`
   - `services/purchasing/ap-history.schemas.ts`
   - `services/purchasing/ap-control.service.ts`

6. Purchase-order workflow:
   - `app/[locale]/(dashboard)/dashboard/purchase-orders/`
   - `services/purchase-order/`
   - `actions/purchaseOrderWorkflow/`
   - `components/purchase-orders/`

7. Current review evidence:
   - `what-next/STOQUIFY_SUPPLIER_WORKFLOW_REVIEW_2026-08-08.md`
   - `what-next/STOQUIFY_SUPPLIER_WORKFLOW_REMEDIATION_PLAN_2026-08-08.md`
   - `what-next/STOQUIFY_SUPPLIER_WORKFLOW_SECURITY_RATIFICATION_2026-08-08.md`
   - `docs/domains/purchasing-ap/PURCHASE_SYSTEM_MODERNIZATION_ANALYSIS.md`
   - `what-next/purchasing-ap-consolidation-readiness.md`, if present.

8. Architecture evidence:
   - `graphify-out/POST_SLICE_438_GRAPH_REFRESH_2026-08-09.md`
   - `graphify-out/GRAPH_REPORT_app.md`
   - `graphify-out/GRAPH_REPORT_components.md`
   - `graphify-out/GRAPH_REPORT_actions.md`
   - `graphify-out/GRAPH_REPORT_hooks.md`
   - `graphify-out/GRAPH_REPORT_types.md`
   - Inspect action graph Community 15, which contains supplier management and analytics operations.
   - Inspect component graph Community 57, which contains supplier export utilities.
   - Treat source code and runtime tests as authoritative when graph reports are incomplete.

Known baseline to verify, not blindly assume:
- The 2026-08-08 review gave supplier RBAC and tenant isolation a conditional/provisional pass.
- The review identified unresolved default-export redaction and auditable-export requirements.
- Archive-versus-deactivate service branches lacked complete tests.
- The supplier service already exposes management and detail-analytics read models.
- AP history already supports `supplierId`, invoice/payment lanes, statuses, dates, payment methods, cursor integrity, summary values, and completeness metadata.
- Current repository state may have changed since that review; inspect before implementing.

Execution tasks:

1. Establish current truth
   - Run `git status --short`.
   - Trace supplier routes through components, hooks, actions, services, and Prisma models.
   - Produce a matrix for every workflow: `implemented`, `partial`, `broken`, `missing`, `duplicated`, or `intentionally deferred`.
   - Verify behavior through source, tests, and authenticated route execution—not filenames alone.
   - Identify which supplier route is canonical.
   - Treat `/dashboard/purchases/suppliers` as the current canonical candidate.
   - Inventory `/dashboard/suppliersSystem` and prevent divergent implementations. Preserve it as a compatibility redirect or delegating surface when required; do not delete it without evidence and approval.

2. Complete the supplier directory
   - Display tenant-scoped supplier records using the existing service-owned management read model.
   - Ensure search, sorting, pagination, status filters, risk filters, and clear-filter behavior work against real data.
   - Keep create, view analytics, edit, archive/deactivate, export, and navigation actions permission-aware.
   - Show useful summary cards derived from authoritative data, including active suppliers, outstanding balances, open purchase orders, linked items, and credit exposure where supported.
   - Provide complete loading, empty, filtered-empty, error, permission-denied, no-active-organization, stale-data, and retry states.
   - Preserve URL/deep-link behavior and browser history.

3. Verify and complete supplier creation
   - Direct navigation to `/dashboard/purchases/suppliers/create` must work after refresh.
   - Enforce `purchases.suppliers.create` and the purchasing module boundary.
   - Validate all existing supplier fields through shared server schemas.
   - Cover identity, contact information, address, tax identifier, payment terms, default currency, preferred language, credit limit, purchasing notes, and active status when supported by the current model.
   - Prevent accidental duplicate submission.
   - Display field-level and form-level validation messages.
   - Persist through the existing action-to-service boundary with organization scope.
   - After success, invalidate relevant queries and navigate to the created supplier’s detail or analytics page.
   - Confirm the new supplier appears in the directory and permitted supplier pickers.
   - Never expose another tenant’s supplier during duplicate checking or validation.

4. Verify and complete supplier editing
   - Direct navigation to `/dashboard/purchases/suppliers/[id]/edit` must load the correct supplier after refresh.
   - Enforce `purchases.suppliers.update`.
   - Prepopulate the form from the authoritative supplier record.
   - Handle nonexistent, inactive, archived, cross-tenant, and permission-denied suppliers safely.
   - Preserve validation parity between create and edit.
   - Persist changes through the existing update action and service.
   - Refresh the list, detail analytics, and supplier picker caches after success.
   - Provide saving, success, failure, retry, cancel, and unsaved-change behavior consistent with established Stoquify patterns.
   - Do not introduce a new concurrency/versioning mechanism unless a proven stale-write defect requires it.

5. Complete supplier lifecycle behavior
   - Verify detail, edit, archive, deactivate, and reactivation behavior.
   - Preserve the existing rule: suppliers with financial or purchasing history are deactivated; unused suppliers may be archived according to established policy.
   - Require a clear confirmation dialog explaining the consequence.
   - Prevent hard deletion when purchase orders, invoices, payments, item relationships, ledger history, or audit evidence must be retained.
   - Keep historical documents readable after supplier deactivation.
   - Add explicit tests for both the archive and deactivate branches.
   - Record auditable lifecycle events if the project’s existing audit/event facilities support them.

6. Complete the supplier detail and analytics experience
   Build a coherent supplier workspace rather than unrelated cards. Use accessible tabs or equivalent system-standard navigation for:

   A. Overview
   - Supplier identity, active state, terms, preferred currency, contact summary, and linked-item count.
   - Current payable balance, credit limit, credit utilization, open purchase orders, and total purchases where authoritative.
   - Clearly identify the metric period, source, currency, and freshness/as-of time.
   - Flag credit-limit breaches, inactive suppliers with open obligations, and other server-derived exceptions.

   B. Purchase history
   - Show supplier-filtered purchase orders with reference, order date, expected delivery date, status, currency, amount, receipt state, and navigable links.
   - Connect to existing purchase-order detail pages.
   - Show goods receipts or delivery performance only when authoritative receipt data exists.
   - Do not fabricate “on-time delivery” or similar KPIs from incomplete data.

   C. Invoices and AP
   - Reuse `services/purchasing/ap-history.service.ts` with `supplierId`; do not duplicate AP calculations inside the component.
   - Show invoice number, invoice date, due date, status, total, amount paid, open amount, currency, purchase-order reference, match/control state, ledger posting state, and exceptions where available.
   - Preserve effective-date and recorded-through semantics.
   - Expose AP completeness warnings instead of presenting operational history as certified accounting truth.

   D. Payment history
   - Reuse the AP history payment lane filtered by supplier.
   - Show payment reference, date, method, status, amount, currency, ledger posting evidence, and safe destination information.
   - Link payments to invoices only when the source model provides a trustworthy relationship.
   - Redact bank, mobile-money, and other sensitive destination data according to existing security policy.
   - Do not claim that a payment is reconciled, settled, or certified without the required evidence.

   E. Linked items
   - Show supplier-item associations, supplier SKU, cost, lead time, minimum order quantity, preferred status, and last update where supported.
   - Link back to the corresponding inventory item.
   - Preserve the compound inventory and supplier permissions for cross-domain writes.

7. UI and design-system quality
   - Match the established Stoquify shell, page header, cards, typography, spacing, colors, tables, filters, buttons, badges, dialogs, drawers, notifications, and error states.
   - Reuse shared design-system components instead of adding one-off primitives.
   - Make dense tables readable and responsive on desktop, tablet, and mobile.
   - Use progressive disclosure for financial proof and detailed history.
   - Maintain visible focus, logical keyboard order, accessible names, form associations, table semantics, dialog focus management, and screen-reader announcements.
   - Do not encode state using color alone.
   - Complete English and French copy; do not leave raw translation keys or mixed-language surfaces.
   - Preserve user context when returning from create, edit, purchase-order, invoice, or payment detail pages.

8. Security, privacy, and controls
   - Enforce organization scope at every service query and mutation.
   - Preserve supplier permissions such as `purchases.suppliers.read`, `.create`, and `.update`; use existing lifecycle permissions rather than inventing replacements.
   - Preserve AP-history authorization using the existing accepted permissions, including `purchasing.ap.invoice.view`, `finance.payables.read`, and `purchases.suppliers.read`.
   - Keep `moduleSlug: "purchasing"` entitlement observation on protected surfaces.
   - Add cross-tenant denial tests for detail, update, analytics, invoice history, payment history, export, and lifecycle operations.
   - Default supplier exports must omit or mask contact and tax-sensitive fields.
   - Allow sensitive export only when an existing privileged policy explicitly authorizes it and the user deliberately requests it.
   - Record export actor, organization, scope, selected fields, timestamp, and outcome through the established audit mechanism.
   - Keep clipboard actions minimal and prevent accidental copying of extra sensitive metadata.
   - Use fresh authentication or maker-checker only where existing policy requires it.
   - Do not expose raw database, provider, or internal error details to users.

9. Testing requirements
   Add or update focused tests for:
   - Create-route authorization and direct-load behavior.
   - Successful supplier creation and validation failure.
   - Edit-route authorization, correct prepopulation, successful persistence, and cross-tenant denial.
   - Supplier detail and analytics direct-load behavior.
   - Supplier-specific purchase, invoice, and payment filtering.
   - Summary and currency correctness.
   - Loading, empty, error, retry, inactive, and permission-denied states.
   - Archive versus deactivate semantics.
   - Default export redaction and privileged-export controls.
   - Auditable export behavior.
   - Query invalidation after create, update, and lifecycle mutations.
   - English and French content.
   - Keyboard and dialog behavior.
   - Responsive authenticated browser flows.

10. Browser verification
   Execute authenticated end-to-end verification for:
   - Opening the supplier directory.
   - Creating a uniquely identifiable test supplier.
   - Confirming it appears in the list.
   - Opening its detail analytics.
   - Editing it and confirming persisted changes after refresh.
   - Opening purchase history.
   - Opening supplier-filtered invoice/AP history.
   - Opening supplier-filtered payment history.
   - Exercising archive/deactivate behavior using appropriate fixtures.
   - Verifying permission-denied behavior for a restricted role.
   - Capturing desktop, tablet, and mobile screenshots.

   Store screenshot evidence under:
   `what-next/screenshots/supplier-workflow-completion-2026-08-09/`

Verification commands:
Run focused checks first, then wider gates in proportion to the changes.

- `npm test -- --runInBand services/supplier/__tests__/supplier.service.test.ts`
- `npm test -- --runInBand services/purchasing/__tests__/ap-history.service.test.ts`
- `npm test -- --runInBand actions/suppliers/__tests__/get-org-suppliers.test.ts actions/suppliers/__tests__/itemSupplierActions.test.ts`
- `npm test -- --runInBand components/suppliers/__tests__/supplier-management-dashboard-export.test.ts`
- Run all new supplier route, component, action, and browser tests added by this work.
- `npm run typecheck`
- `npm run lint`
- `npm run purchasing:ap:gate`
- `npm run policy:gates`
- `npm run build:app`
- Run `npm run prisma:validate` if Prisma files are touched.

Do not use `npm run reset`, destructive reseeding, or destructive migration commands.

Expected artifacts:
- Surgical implementation changes across the existing supplier workflow.
- Focused unit, action, service, component, route, and browser tests.
- Desktop, tablet, and mobile screenshot evidence.
- A completion report saved as:
  `what-next/STOQUIFY_SUPPLIER_WORKFLOW_COMPLETION_REPORT_2026-08-09.md`

The report must contain:
- Current-state and final-state workflow matrix.
- Files changed and why.
- Canonical-route decision and treatment of legacy supplier routes.
- Data-source map for every displayed metric and history table.
- RBAC, tenant-isolation, export-redaction, and audit evidence.
- Commands executed with passed, failed, skipped, timed-out, or blocked status.
- Screenshot locations.
- Remaining limitations and explicitly deferred work.
- No unsupported enterprise, security, accounting, privacy, accessibility, or release-certification claims.

Success criteria:
- Supplier create works through the real server path and persists organization-scoped data.
- Supplier edit loads and updates the correct record and remains correct after refresh.
- Directory, create, detail, edit, and lifecycle routes work when opened directly.
- Supplier analytics are derived from authoritative server read models.
- Purchase history is supplier-filtered and links to real purchase orders.
- Invoice/AP and payment histories reuse the existing AP history service with `supplierId`.
- Accounting totals retain currency and evidence context.
- Archive/deactivate behavior preserves financial and audit history.
- Every visible action is functional, permission-aware, and state-complete.
- The workflow matches Stoquify’s visual system across desktop, tablet, and mobile.
- English and French surfaces are complete.
- Default exports minimize supplier-sensitive data and export activity is auditable.
- Focused tests, typecheck, lint, purchasing/AP gate, policy gates, and application build pass, or blockers are documented with exact evidence.
- No unrelated files, warnings, modules, or user changes are modified.

Non-goals:
- Do not rebuild purchasing, accounting, inventory, or payment reconciliation broadly.
- Do not replace working services with component-local logic.
- Do not introduce speculative supplier scoring or AI recommendations.
- Do not create new financial metrics without authoritative inputs and definitions.
- Do not redesign the global Stoquify design system.
- Do not delete legacy routes until compatibility and navigation impact are proven.
- Do not perform unrelated cleanup or refactoring.
