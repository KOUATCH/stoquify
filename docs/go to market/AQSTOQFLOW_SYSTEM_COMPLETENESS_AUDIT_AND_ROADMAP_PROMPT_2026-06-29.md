# AQSTOQFLOW System Completeness Audit and Roadmap Prompt

Date: 2026-06-29

## Refined Professional Prompt

```md
Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, and SaaS growth advisor.

Project:
AqStoqFlow / Kontava platform.

Workspace:
`E:\ohada saas\newStockFlow\aqstoqflow`

Domain:
Whole-platform architecture, completeness, source-of-truth maturity, role-based BI, OHADA/SYSCOHADA SMB operating system readiness, and go-to-market adoption roadmap.

Mission:
Analyze the AqStoqFlow system thoroughly, module after module, to determine how complete, coherent, and adoption-ready it is for its intended direction: a single source of truth and instant business intelligence platform for OHADA-zone SMB owners, managers, accountants, finance officers, POS cashiers, operators, and auditors.

Produce an evidence-led status report that states what is functioning well, what is partial, what is broken, what is missing, and what must be built next. Then propose a stage-by-stage roadmap that moves the system toward its goal: trusted daily business truth, OHADA-ready accounting/compliance evidence, finance-grade controls, and role-specific BI surfaces.

Domain lens:
Act as a senior enterprise platform architecture team:
- Senior enterprise software architect: preserve module boundaries, service ownership, dependency order, platform modularity, integration contracts, and source-of-truth ownership.
- Structural UI/UX design expert: evaluate workflow-first, role-aware, ergonomic surfaces for owners, managers, accountants, finance officers, POS cashiers, and operational staff.
- Cybersecurity and RBAC specialist: enforce tenant isolation, RBAC, module entitlement, fresh auth, maker-checker where appropriate, audit trails, redaction, privacy, and safe error handling.
- Business logic expert: protect correctness, traceability, approval history, source-of-truth records, evidence links, lifecycle state transitions, and operational invariants.
- Enterprise finance and controls expert: evaluate ledger posting, payment reconciliation, payroll-to-finance, close assurance, statutory compliance, audit evidence, cash controls, and release gates.
- OHADA/SYSCOHADA-aware platform architect: keep statutory, country-pack, tax, payroll, accounting, and regulatory configuration separated from code. Require expert-reviewed provenance where legal or accounting rules are involved.
- SaaS modularity specialist: ensure modules are entitlement-aware, tenant-safe, scalable, observable, commercially packageable, and not implemented as isolated dashboard-only features.
- SaaS growth advisor: connect each technical gap to market adoption, owner trust, accountant adoption, payment-provider/bank partnerships, and OHADA SMB go-to-market value.

Universal operating principles:
- Produce evidence, not assumptions.
- Inspect the repo before scoring modules.
- Do not treat a dashboard as a complete module unless service-owned data, actions, permissions, tests, and evidence flows exist.
- Prefer service-owned read models and server-side business truth before UI surfaces.
- Distinguish real source-of-truth records from mock data, demo data, derived summaries, and UI-only state.
- Preserve tenant isolation, RBAC, module entitlement, auditability, redaction, and safe errors.
- Do not perform broad refactors, database resets, destructive migrations, or unrelated lint cleanup.
- Do not invent regulatory claims; mark legal/statutory uncertainty as needing expert review.
- If the worktree is dirty, ignore unrelated changes and do not revert user work.

Language locked:
- "Single source of truth" means source-owned, tenant-scoped records with lifecycle state, evidence/provenance, service-owned read models, and finance/control links where applicable. It does not mean a dashboard that aggregates unverified data.
- "Instant BI" means near-real-time role-specific operating insight backed by trusted source records, not static charts or mock summaries.
- "Complete module" means the module has schema/data model, services, actions/API, permissions, module entitlement, UI workflow, tests, audit/evidence behavior, error states, and integration contracts.
- "OHADA-ready" means the platform can support OHADA/SYSCOHADA accounting and statutory workflows through configurable, expert-reviewed country packs and evidence trails. It does not mean hard-coded legal advice.
- "Adoption-ready" means the module solves a visible SMB pain, is safe for non-technical users, works under realistic local operating conditions, and gives owners/accountants a reason to trust it.

The spine:
- State: Identify the authoritative source of truth for each module. Separate canonical records from read models, cached aggregates, dashboard summaries, and demo/mocks.
- Data model and invariants: Inspect Prisma schema, domain services, lifecycle states, uniqueness constraints, indexes, foreign keys, tenant scoping, and evidence hashes.
- Contract: Inspect service contracts, server actions, API routes, hooks, permissions, pagination, error shapes, and client-facing types.
- Trust boundary: Verify where user input enters, where tenant/RBAC/module entitlement checks occur, where redaction occurs, and where proof/evidence is attached.
- Sync model: Identify request/response flows, background jobs, offline sync, replay, webhooks, imports, exports, reconciliation flows, and stale-data behavior.
- Failure handling: Identify fail-closed behavior, safe errors, retry/compensation, idempotency, audit logging, monitoring, and user-facing blocked states.

Evidence to inspect first:
- `AGENTS.md` or current system instructions if present.
- `docs/go to market/`
- `what-next/`
- `innovation/`
- `graphify-out/`
- `GRAPH_REPORT_components.md`, `GRAPH_REPORT_actions.md`, `GRAPH_REPORT_app.md`, `GRAPH_REPORT_hooks.md`, `GRAPH_REPORT_types.md` if present.
- `prisma/schema.prisma`
- `app/[locale]/(dashboard)/dashboard/`
- `app/api/`
- `actions/`
- `services/`
- `components/`
- `hooks/`
- `lib/`
- `config/`
- `scripts/`
- `tests/`, `__tests__/`, and focused test files near each module.

Required module-by-module audit coverage:
1. Platform shell, navigation, localization, dashboard layout, role surfaces, and design system.
2. Authentication, tenant membership, RBAC, module entitlement, fresh auth, and session claims.
3. Organization, branch/location, user, team, and operating setup workflows.
4. POS, cashier workflows, cash drawer, shifts, receipts, returns, discounts, and offline POS sync/replay.
5. Inventory items, stock movements, adjustments, write-offs, batches/lots, warehouses/locations, stock status, and valuation.
6. Sales, customers, receivables, invoices, credit, collections, and customer ledger.
7. Purchasing, suppliers, AP, supplier invoices, goods receipt, payment approvals, and supplier ledger.
8. Payments, bank/mobile money/cash reconciliation, provider evidence, settlement matching, suspense, and payment proof.
9. Accounting ledger, journal posting, chart of accounts, OHADA/SYSCOHADA readiness, posting rules, audit trail, and close locks.
10. Cash command, owner war room, tenant operating snapshot, executive BI, manager BI, finance BI, accountant BI, and role-specific drilldowns.
11. Payroll, HR source data, contracts, compensation, payment evidence, statutory declarations, payroll accounting, and payroll-to-finance forecasts.
12. Compliance center, country packs, tax/VAT, statutory workflows, certification, assurance, and legal provenance.
13. Close assurance, close packs, certification, findings, accountant portal, review workflows, and evidence export.
14. AI/copilot, guardrails, redaction, source grounding, action recommendations, and human approval.
15. Notifications, error handling, observability, audit logs, support diagnostics, and incident workflows.
16. Reporting/export/import, data quality, backup/restore, migration/seed safety, and customer onboarding/demo workspace.
17. Commercialization: packages, billing provider boundary, module activation/deactivation, trials, tenant provisioning, and go-to-market packaging.
18. Security, privacy, data protection, abuse resistance, secrets, rate limits, auditability, and release gates.

For each module, produce:
- Current completeness status: `Complete`, `Mostly working`, `Partial`, `Prototype/demo`, `Missing`, or `Blocked`.
- Confidence level: `High`, `Medium`, or `Low`, based on evidence quality.
- What is functioning well.
- What is not functioning, incomplete, risky, or missing.
- Source-of-truth maturity: `Canonical`, `Mostly canonical`, `Mixed`, `UI/read-model only`, `Mock/demo`, or `Absent`.
- BI readiness: what owners, managers, accountants, finance officers, POS cashiers, and operators can currently know instantly.
- Accounting/control readiness: ledger links, reconciliation links, close controls, evidence, audit trails, maker-checker, and fail-closed behavior.
- Security/readiness: tenant scoping, RBAC, module entitlement, redaction, and safe errors.
- Adoption value: the direct SMB pain solved today and what must be added for market trust.
- Evidence references: list specific files, routes, services, actions, tests, reports, graph nodes/communities, or commands reviewed.
- Recommended next actions: 3-7 ordered improvements with dependency notes.

Completeness scoring:
Use a 0-5 score per module:
- 0 = Absent or only named in docs.
- 1 = Prototype, mock, or UI-only.
- 2 = Partial workflow with major missing service/data/security pieces.
- 3 = Functional core workflow with gaps in tests, controls, BI, evidence, or edge states.
- 4 = Production-near with source-of-truth records, controls, tests, and role-aware UX.
- 5 = Enterprise-ready with full evidence, observability, controls, adoption fit, and release gates.

Also produce platform-level scores:
- Source-of-truth maturity.
- Instant BI maturity.
- OHADA/SYSCOHADA readiness.
- Accountant adoption readiness.
- Owner/manager adoption readiness.
- POS/cashier adoption readiness.
- Finance/control readiness.
- Security/RBAC readiness.
- Offline/local operating resilience.
- Commercial/package readiness.

Roadmap requirements:
Create a stage-by-stage roadmap that is practical, dependency-aware, and adoption-driven. Each stage must state:
- Goal.
- Modules touched.
- User value delivered.
- Source-of-truth upgrade.
- BI upgrade.
- Accounting/control upgrade.
- Security/compliance upgrade.
- Tests/gates required.
- Exit criteria.

Use this roadmap structure unless the evidence strongly suggests a better order:

Stage 0: Current-state truth inventory and release-gate baseline.
Stage 1: Tenant/RBAC/module entitlement, service-boundary, and audit foundation hardening.
Stage 2: Core SMB operating truth: POS, cash drawer, inventory, sales, purchases, customers, suppliers, and payments.
Stage 3: Finance trust layer: ledger posting, payment reconciliation, AP/AR, payroll-to-finance, tax/VAT, and close controls.
Stage 4: Role-specific instant BI: owner war room, cash command, manager dashboards, accountant portal, finance officer command center, cashier daily control.
Stage 5: OHADA/country-pack adoption: SYSCOHADA, declarations, close packs, evidence exports, accountant review, and statutory provenance.
Stage 6: Adoption and scale: onboarding, demo workspace, mobile/offline reliability, bank/payment-provider integrations, embedded finance readiness, and packaging.
Stage 7: AI copilot and predictive operations: only after trusted evidence and guardrails are mature.

Required final artifacts:
1. Save the full audit report under `what-next/platform/` or `docs/go to market/` with a dated filename.
2. Include a module status matrix.
3. Include an executive summary for the founder/owner.
4. Include a technical architecture summary for engineers.
5. Include a go-to-market implications section.
6. Include a roadmap table with stages, dependencies, gates, and exit criteria.
7. Include a top-20 prioritized backlog.
8. Include unresolved blockers and verification gaps.

Suggested output filename:
`docs/go to market/AQSTOQFLOW_PLATFORM_COMPLETENESS_AUDIT_AND_ADOPTION_ROADMAP_YYYY-MM-DD.md`

Verification commands:
Run only commands that are safe and useful for the audit. Prefer read-only and focused checks first.

```powershell
npm run prisma:validate
npm run typecheck
npm run policy:gates
npm run workflow:assurance:runtime-check
npm run build:app
```

Also run focused tests only when the report makes claims about a module's test-backed behavior. If a command is blocked by environment, generated files, timeouts, missing dependencies, or unrelated repo drift, record the exact blocker instead of pretending success.

Risk controls:
- Do not modify code unless explicitly asked after the audit.
- Do not reset databases, delete files, run destructive migrations, or revert unrelated changes.
- Do not infer that a module is production-ready from route presence alone.
- Do not expose person-level payroll, payment-provider secrets, customer private data, or tenant-sensitive records in the report.
- Do not make legal/tax claims without marking them as requiring expert review.
- If graph files exist, use them to support architecture/dependency claims.
- If graph files are missing or stale, say so and rely on direct repo inspection.
- Treat missing tests, missing permissions, missing tenant scope, missing evidence, and mock data as material gaps.

Success criteria:
- The report gives a clear, module-by-module completeness picture.
- Every score is backed by evidence.
- The roadmap is staged, dependency-aware, and aligned with single-source-of-truth and instant-BI goals.
- The recommendations help AqStoqFlow move toward adoption by OHADA SMB owners, managers, accountants, finance officers, POS cashiers, and operators.
- The output is specific enough that future Codex runs can implement one roadmap stage at a time without rediscovering the whole system.
```

## Execution Checklist For The Future Audit Run

1. Read this prompt fully.
2. Inspect `docs/go to market/`, `what-next/`, `innovation/`, `graphify-out/`, and core repo folders before making claims.
3. Build an inventory of modules from routes, services, actions, schema models, hooks, components, tests, and reports.
4. Score every module using the 0-5 rubric.
5. Separate real source-of-truth records from mocks, demos, summaries, and UI-only workflows.
6. Identify the current BI surfaces and the roles they actually serve.
7. Identify missing proof chains: ledger, reconciliation, statutory, payroll, cash drawer, approvals, evidence, close, and exports.
8. Create the staged roadmap with dependencies and release gates.
9. Save the final report under `docs/go to market/` or `what-next/platform/`.
10. Report commands run, commands blocked, and confidence level.

## Non-Goals

- Do not implement roadmap items during the audit unless explicitly requested.
- Do not rewrite modules during discovery.
- Do not clean unrelated lint or formatting noise.
- Do not create a generic SaaS roadmap that ignores the actual repository.
- Do not market the product as OHADA-compliant unless the evidence and expert-reviewed provenance support that claim.

## Optional Next Prompts

1. "Execute Stage 0 from the platform completeness roadmap and produce the baseline module inventory with graph-backed evidence."
2. "Implement the highest-priority source-of-truth hardening item from the roadmap, with focused tests and a saved run report."
3. "Turn the roadmap into a 90-day founder execution plan with weekly milestones and acceptance gates."
4. "Create the accountant adoption package: close pack, evidence export, review workflow, and SYSCOHADA readiness checklist."
5. "Create the owner daily truth package: cash command, stock truth, receivables/payables, payroll obligations, and anomaly alerts."

Blueprint ready.
