# Stoquify POS 9+ Evaluation and Roadmap Prompt

Date: 2026-07-20

## Purpose

Use this prompt to evaluate the authenticated Stoquify Point of Sale without implementing changes. It applies the reusable `$stoquify-workflow-uiux-evaluator` skill and specializes it for cashier throughput, transaction correctness, shift integrity, tender safety, offline recovery, receipts, device ergonomics, RBAC, accessibility, accounting evidence, and OHADA-market fit.

## Ready-to-run prompt

~~~text
Use $stoquify-workflow-uiux-evaluator to conduct a comprehensive, evidence-backed evaluation of Stoquify's authenticated Point of Sale and produce a practical roadmap for raising it to a genuine 9+/10 operational quality level.

Workspace:
E:\ohada saas\Focused projects\stoquify

Target:
- Route: /[locale]/dashboard/pos
- Entry: app/[locale]/(dashboard)/dashboard/pos/page.tsx
- Main surface: components/pos/ProfessionalPOSSystem.tsx

Mode:
- Evaluation, evidence collection, scoring, and roadmap only.
- Do not modify product code.
- Do not stage or commit files.
- Preserve every unrelated working-tree change.

Mission:
Apply the same rigor used for the Stoquify landing-page 9+ roadmap: current-state assessment, current competitive benchmarking, dimension-by-dimension scoring, exact evidence references, P0-P3 priorities, acceptance criteria, verification methods, release gates, and no-go conditions. Adapt the framework to cashier throughput, transaction correctness, shift integrity, tender safety, offline recovery, receipts, device and touch ergonomics, RBAC, accessibility, accounting evidence, and OHADA-market fit.

Coordinate bounded, read-only specialist agents when available:
1. POS UX and cashier workflow reviewer.
2. Frontend, design-system, accessibility, responsive, and performance reviewer.
3. POS business-truth, inventory, tender, receipt, and accounting reviewer.
4. Security, RBAC, privacy, and tenant-isolation reviewer.
5. Offline reliability, idempotency, replay, conflict, and recovery reviewer.
6. Product, localization, hardware, and OHADA-market-fit reviewer.
7. Test, evidence, and release-readiness reviewer.

Tell every agent that it is not alone in the repository, owns only its assigned read-only lens, must not edit files, and must return exact paths and evidence labels. The lead agent must deduplicate findings, resolve conflicts, and produce one coherent verdict.

Inspect at minimum:
- app/[locale]/(dashboard)/dashboard/pos/page.tsx
- app/[locale]/(dashboard)/dashboard/pos/error.tsx
- components/pos/ProfessionalPOSSystem.tsx
- components/pos/offline/OfflineSyncStatusStrip.tsx
- components/pos/ReceiptTokenControlStrip.tsx
- components/pos/ReceiptTokenHistoryPanel.tsx
- components/pos/TerminalManagementDashboard.tsx
- components/pos/CashDrawerManagementDashboard.tsx
- hooks/posHooks/usePosOperations.ts
- hooks/posHooks/useOfflineSync.ts
- lib/pos/offline-local-queue.ts
- actions/pos/
- services/pos/
- config/sidebar.ts
- config/permissions.ts
- lib/security/rbac-permissions.ts
- messages/en.json
- messages/fr.json
- app/globals.css

Trace adjacent workflows that affect POS truth:
- /dashboard/settings/terminals
- /dashboard/finance/cash-drawer
- /dashboard/finance/cash-payment-history
- Public and protected receipt routes
- Inventory, payment, reconciliation, accounting, and close-assurance effects of a completed sale

Use current architecture evidence when available:
- graphify-out/graph.json
- graphify-out/ordered-code-graph.json
- graphify-out/GRAPH_REPORT.md
- graphify-out/ORDERED_GRAPHIFY_RUN_2026-07-14.md

Verify graph freshness against source before relying on inferred relationships.

Reconcile current source with relevant reports, including:
- docs/UI/UX/AQSTOQFLOW_UI_UX_HONEST_REVIEW_2026-06-26.md
- docs/UI/UX/AQSTOQFLOW_UI_UX_REVAMP_ROADMAP_2026-06-26.md
- docs/UI/UX/AQSTOQFLOW_UI_CONSTITUTION_2026-06-26.md
- docs/UI/UX/AQSTOQFLOW_UI_REVIEW_CHECKLIST_2026-06-26.md
- docs/UI/UX/AQSTOQFLOW_UI_ROUTE_MATURITY_MATRIX_2026-06-26.md
- docs/posoffline/AQSTOQFLOW_OFFLINE_POS_EVALUATION_AND_REVAMP_ROADMAP_2026-06-28.md
- docs/offline pos/STOQUIFY_OFFLINE_POS_FULL_FUNCTIONALITY_REPORT_2026-07-16.md
- docs/domains/pos/reports/POS_IMPLEMENTATION_STATUS_2026-05-29.md
- docs/domains/pos/reports/STOCKFLOW_ENTERPRISE_POS_RUN_REPORT_2026-05-30.md
- docs/domains/pos/KONTAVA_POS_SALE_TRUTH_ASSURANCE_RUN_REPORT_2026-06-21.md
- docs/domains/pos/KONTAVA_OFFLINE_POS_REPLAY_ASSURANCE_RUN_REPORT_2026-06-21.md
- Relevant POS release gates and current what-next readiness evidence

Treat historical reports as leads, not proof. Resolve material claims against current code, tests, and browser behavior.

Inspect relevant route, component, hook, action, service, offline-queue, permission, inventory, payment, reconciliation, and ledger tests. State whether each important test was merely inspected or was executed and passing.

If an authenticated environment is available, evaluate English and French POS routes at desktop, tablet, and narrow-touch sizes. Exercise keyboard-only navigation and the primary sale journey. Capture loading, empty, denied, error, offline, reconnecting, partial, and conflict states. Record persona, permission, viewport, locale, data state, and exact steps for every screenshot. If credentials, representative data, browser access, or hardware simulation is unavailable, report the evidence gap and do not fabricate observations.

Benchmark 6-10 current POS products selected for comparable jobs: fast checkout, inventory-connected retail, offline operation, multi-location control, SMB usability, and Francophone or African-market relevance. Use current official documentation and primary sources. Cite every external feature claim and extract transferable principles rather than proposing imitation.

Map and evaluate these end-to-end journeys:
- Enter POS and select location and terminal.
- Open a shift.
- Find or scan an item.
- Add, update, and remove cart lines.
- Attach or remove a customer.
- Apply supported price, discount, tax, quantity, and rounding behavior.
- Accept cash and calculate change.
- Accept non-cash and split tenders.
- Commit a sale atomically.
- Produce, deliver, retrieve, and control access to a receipt.
- Continue safely during network loss.
- Replay offline sales without duplicates.
- Close a shift and reconcile expected cash.
- Recover from validation, permission, inventory, payment, ledger, receipt, and synchronization failures.
- Perform or escalate refunds, returns, cancellations, voids, and manager overrides.

For every journey record persona and permission, preconditions, UI steps, components and server boundaries, business invariants, evidence produced, failure modes, recovery path, current friction, safety risk, and untested gaps.

Score each dimension from 0-10 with High, Medium, or Low confidence:
1. Cashier speed and task efficiency.
2. Visual hierarchy and operational density.
3. Catalog search, scanning, and item discovery.
4. Cart accuracy and editability.
5. Customer selection and data safety.
6. Tender, split-payment, cash, change, currency, tax, and rounding handling.
7. Shift and cash-drawer control.
8. Receipt and fiscal evidence.
9. Refund, void, cancellation, and return safety.
10. Offline resilience, idempotency, replay, conflict handling, and recovery.
11. Loading, empty, error, denied, stale, partial, and conflict states.
12. Keyboard, touch, tablet, barcode-scanner, printer, and device readiness.
13. Accessibility.
14. Responsiveness.
15. Performance posture.
16. English/French localization and OHADA-market fit.
17. Security, RBAC, privacy, and tenant isolation.
18. Inventory, payment, reconciliation, ledger, and accounting truth.
19. Manager observability and auditability.
20. Test coverage and release readiness.
21. Product coherence and competitive differentiation.

For every score provide current score, evidence, confidence, main gap, 9+ target condition, required improvement, and verification needed to award 9+. Do not average away a critical safety defect or award 9+ based on visual appearance alone.

Label every material finding as Code-confirmed, Test-confirmed, Browser-observed, Report-derived, Externally sourced, Inference, or Untested gap. Distinguish implemented, tested, currently passing, browser-observed, documented but unverified, UI-present but backend-gated, missing, and intentionally out of scope.

Produce a report containing:
1. Executive verdict.
2. Scope, personas, methodology, and limitations.
3. Agent assignments and synthesis method.
4. Evidence reviewed.
5. Architecture, dependency, and trust-boundary map.
6. Persona and job-to-be-done matrix.
7. End-to-end workflow assessment.
8. Browser evidence or observation blockers.
9. Competitive benchmark.
10. Dimension scorecard.
11. UI/UX, accessibility, responsive, device, and performance findings.
12. Transaction, accounting, inventory, security, privacy, and offline findings.
13. State and failure-mode matrix.
14. Test and evidence-gap matrix.
15. Keep / Refine / Split / Move / Replace / Remove decisions for major POS components.
16. Ideal future POS page and workflow anatomy.
17. P0-P3 9+ roadmap.
18. Implementation sequence and dependencies.
19. Verification plan.
20. Release gates and no-go conditions.
21. Residual risks and unresolved questions.
22. Recommended immediate next prompt.

Prioritize the roadmap as:
- P0: correctness, security, data-loss, duplicate-sale, payment, inventory, ledger, offline, and release blockers.
- P1: cashier efficiency, recovery, accessibility, responsive behavior, and core workflow clarity.
- P2: premium differentiation, manager visibility, hardware depth, localization, and market fit.
- P3: optional experiments and future optimization.

For every roadmap item include problem, evidence, affected score, impact, effort, dependencies, owner, likely files or boundaries, business and security risks, acceptance criteria, verification, and rollback or containment considerations.

Save the comprehensive report as:
docs/pos/STOQUIFY_POS_9_PLUS_EVALUATION_AND_ROADMAP_<YYYY-MM-DD>.md

If PDF tooling is available, also create:
docs/pos/STOQUIFY_POS_9_PLUS_EVALUATION_AND_ROADMAP_<YYYY-MM-DD>.pdf

Optionally save a machine-readable scorecard as:
docs/pos/STOQUIFY_POS_9_PLUS_SCORECARD_<YYYY-MM-DD>.json

Success requires exact evidence or explicit uncertainty for every material conclusion, equal attention to cashier usability and financial correctness, mapped transaction and trust boundaries, objective conditions for 9+, an implementation-ready P0-P3 roadmap, explicit release blockers, and no product-code or unrelated working-tree changes.

Do not invent customer proof, hardware compatibility, compliance status, performance results, fiscal certification, payment-provider support, or offline guarantees. Do not move business truth into the client, weaken authorization, or recommend visual polish at the expense of transaction safety and cashier throughput.
~~~

## Reuse for another workflow

For another route, workflow, or component, invoke `$stoquify-workflow-uiux-evaluator` and replace:

- the target route and source boundaries;
- personas and permissions;
- domain invariants and irreversible actions;
- relevant optional score dimensions;
- browser journeys and state matrix;
- evidence paths and prior reports;
- output location and artifact names.

