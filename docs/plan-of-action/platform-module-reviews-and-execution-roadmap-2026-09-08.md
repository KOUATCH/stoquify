# Stoquify module reviews and execution roadmap

**Prepared:** 8 September 2026. **Deliverables:** 21 module/workflow reviews and 21 tailored execution prompts, shared risk/evidence registers and an 84-item conditional execution backlog. Accounting retains its existing roadmap.

## Executive assessment

The platform has reusable source-owned transaction, approval, event, scoped access and evidence controls. This run executed 19 focused unit suites: **292 passed and one failed, 293 assertions total; 18 suites passed and one failed**. These tests use mocks/injected clients. The failure concerns inventory conflict evidence; it does not demonstrate stock corruption.

The most concrete current issues are capped finance summaries, draft-inclusive/fixed-currency Business Pulse, and an HR approval field that exposes technical evidence hashes. Sensitive query keys need early same-browser identity-transition validation. Catalog availability needs reconciliation for commercial-agent/content/presence entries. Six observations are classified individually in [the risk register](platform-module-risk-register-2026-09-08.md); broader module scenarios are explicitly unverified.

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

## Coverage and reading order

The current catalog contains 19 entries. These packages cover its 18 non-accounting entries, grouping closely related surfaces and adding cross-module workflows absent as catalog modules. Catalog descriptions are not assertions of deployed availability. Shared source families intentionally overlap at contracts; correction ownership must not.

| Package | Review and action plan | Execution brief | Fresh selected checks |
|---|---|---|---|
| POS | [POS sales, refunds and shifts](pos-sales-review-and-action-plan-2026-09-08.md) | [Prompt](pos-sales-audit-execution-prompt-2026-09-08.md) | 35 pass / 0 fail |
| OFF | [Offline POS devices, sync and replay](offline-pos-review-and-action-plan-2026-09-08.md) | [Prompt](offline-pos-audit-execution-prompt-2026-09-08.md) | 22 pass / 0 fail |
| SAL | [Sales orders, reservations, delivery and billing](sales-fulfillment-review-and-action-plan-2026-09-08.md) | [Prompt](sales-fulfillment-audit-execution-prompt-2026-09-08.md) | 7 pass / 0 fail |
| CUS | [Customers, receivables, statements and settlement](customers-receivables-review-and-action-plan-2026-09-08.md) | [Prompt](customers-receivables-audit-execution-prompt-2026-09-08.md) | 6 pass / 0 fail |
| PUR | [Purchasing, supplier collaboration and AP](purchasing-suppliers-ap-review-and-action-plan-2026-09-08.md) | [Prompt](purchasing-suppliers-ap-audit-execution-prompt-2026-09-08.md) | 43 pass / 0 fail |
| INV | [Inventory, transfers, counts and valuation](inventory-valuation-review-and-action-plan-2026-09-08.md) | [Prompt](inventory-valuation-audit-execution-prompt-2026-09-08.md) | 8 pass / 1 fail |
| FIN | [Finance, cash drawers, expenses and treasury](finance-cash-treasury-review-and-action-plan-2026-09-08.md) | [Prompt](finance-cash-treasury-audit-execution-prompt-2026-09-08.md) | 3 pass / 0 fail |
| PAY | [Providers, statements, matching and suspense](payments-reconciliation-review-and-action-plan-2026-09-08.md) | [Prompt](payments-reconciliation-audit-execution-prompt-2026-09-08.md) | 49 pass / 0 fail |
| HR | [HRIS, presence, contracts and self-service](hris-presence-review-and-action-plan-2026-09-08.md) | [Prompt](hris-presence-audit-execution-prompt-2026-09-08.md) | 3 pass / 0 fail |
| PRL | [Payroll, payslips, obligations and payment](payroll-review-and-action-plan-2026-09-08.md) | [Prompt](payroll-audit-execution-prompt-2026-09-08.md) | 46 pass / 0 fail |
| CMP | [Fiscal documents, compliance and country packs](compliance-country-packs-review-and-action-plan-2026-09-08.md) | [Prompt](compliance-country-packs-audit-execution-prompt-2026-09-08.md) | 5 pass / 0 fail |
| CLS | [Close assurance, incidents and accountant collaboration](close-assurance-review-and-action-plan-2026-09-08.md) | [Prompt](close-assurance-audit-execution-prompt-2026-09-08.md) | 2 pass / 0 fail |
| ANA | [Dashboards, analytics, command views and reports](dashboards-analytics-reports-review-and-action-plan-2026-09-08.md) | [Prompt](dashboards-analytics-reports-audit-execution-prompt-2026-09-08.md) | 1 pass / 0 fail |
| IAM | [Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md) | [Prompt](identity-settings-admin-audit-execution-prompt-2026-09-08.md) | 10 pass / 0 fail |
| MOD | [Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md) | [Prompt](module-lifecycle-billing-audit-execution-prompt-2026-09-08.md) | 11 pass / 0 fail |
| ONB | [Onboarding, imports and migration readiness](onboarding-master-data-review-and-action-plan-2026-09-08.md) | [Prompt](onboarding-master-data-audit-execution-prompt-2026-09-08.md) | 9 pass / 0 fail |
| COM | [Notifications, collaboration and referral outcomes](communications-referrals-review-and-action-plan-2026-09-08.md) | [Prompt](communications-referrals-audit-execution-prompt-2026-09-08.md) | 12 pass / 0 fail |
| AI | [AI, command agents and proposal governance](ai-agent-governance-review-and-action-plan-2026-09-08.md) | [Prompt](ai-agent-governance-audit-execution-prompt-2026-09-08.md) | 13 pass / 0 fail |
| EVT | [Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md) | [Prompt](events-platform-reliability-audit-execution-prompt-2026-09-08.md) | 7 pass / 0 fail |
| WEB | [Public experience, content and marketing administration](content-public-experience-review-and-action-plan-2026-09-08.md) | [Prompt](content-public-experience-audit-execution-prompt-2026-09-08.md) | Not run |
| AGT | [Commercial agents and revenue channels](commercial-agents-review-and-action-plan-2026-09-08.md) | [Prompt](commercial-agents-audit-execution-prompt-2026-09-08.md) | Not run |

Accounting: [existing 28-item roadmap](accounting-correction-execution-roadmap-2026-09-08.md). The [user-supplied template](platform-module-audit-source-template-2026-09-08.md) is retained as provenance; its accounting mission is adapted in every module prompt.

## Dependency-ordered realization

| Wave | Packages / outcome | Entry and completion gate |
|---|---|---|
| 0 — Bind scope and candidate | All owners; IAM, EVT, MOD foundations | Stable source hashes, named reviewers, supported scope and isolated evidence environments. Reproduce before changing source. |
| 1 — Contain demonstrated or high-priority exposure | FIN/ANA totals and semantics; INV/EVT conflict diagnosis; IAM/shared cache validation | Current reproduction and data-exposure decision; no unreviewed historical changes. Shared fixes have one owner. |
| 2 — Prove core source workflows | INV → POS/OFF; PAY; SAL/CUS; PUR | Source/quantity/money identity and concurrency fixtures; durable exceptions and replay; ledger contract tied to ACC/ACR. Independent teams may proceed when actual contracts allow. |
| 3 — People, statutory and close | HR → PRL; CMP; CLS | Human-readable approvals, qualified supported pack scope, source-to-payment/declaration tie-outs and current close evidence. Start external review in wave 0 to reduce delay. |
| 4 — Complete operator experience | ONB, COM, ANA, WEB, AI and shared UI | Reconciled import/recovery; provider outcomes; scoped caches; accessible EN/FR workflows; measured task outcomes. AGT receives an availability decision before any product build. |
| 5 — Integrated release | All supported packages | Current DB/browser/provider/performance/restore evidence, closed or explicitly dispositioned findings, pilot cycle and operations handoff. |

Waves express dependencies and review order, not fixed calendar dates or blanket locks. There is no credible whole-platform delivery date without assigned capacity, isolated environments, statutory/provider evidence and reproduced defect scope. Module plans provide review effort and finding-level indicative engineering ranges; size the remaining implementation after diagnosis. Do not copy the accounting 12–16-week estimate to all other domains.

## First ten business days: proposed kickoff sequence

1. Days 1–2: bind current candidate, appoint owners/reviewers, map active versus legacy entry points and provision isolated two-tenant fixtures. Begin country/provider review requests through the organization's authorized process.
2. Days 3–4: reproduce the six observations; confirm finance overflow and analytical population/currency rules; diagnose the inventory test failure; exercise surviving-query-client identity transitions.
3. Days 5–6: assign shared correction ownership, define source-to-ledger and stock/payment reconciliation contracts, assess affected historical reports or records and estimate only confirmed work.
4. Days 7–8: prepare the smallest reviewed fixes and acceptance scenarios in the subsequent implementation task; rehearse high-risk data correction plans in isolation where justified.
5. Days 9–10: review evidence, update the machine backlog, unblock source-domain work and set a capacity-based delivery forecast. An unresolved external gate should block only the affected release scope.

This is a proposed plan, not a record of activities performed or authorization to mutate production.

## Work ownership and overlap rules

The [CSV backlog](platform-module-action-backlog-2026-09-08.csv) and [JSON backlog](platform-module-action-backlog-2026-09-08.json) contain four stages per package: bind scope; reproduce/contracts; conditional corrections; integrated evidence/pilot. The 84 items are planning records, not scheduled work or 84 confirmed defects. No-change dispositions are valid when review rules out a defect.

PM-FIN-001 reuses ACC-014/ACR-21. PM-CACHE-001 extends ACC-010/ACR-22 with one shared frontend/IAM owner. PM-ANA-001 aligns with STQ-RM-001; PM-HR-001 with STQ-RM-007. PM-INV-001 belongs to inventory/event verification and relates to ACC-015. Preserve earlier registers and link updates; do not count the same fix twice.

Use daily owner review for active blockers, weekly engineering/domain risk review and evidence-based milestone gates. Each proposed fix has an accountable engineer and a separate domain reviewer where financial/approval policy requires it. Record actual dates, assignees, evidence links and residual scope before marking an item complete.

## Common acceptance gates

- G0: candidate, ownership and supported scope bound; all advertised catalog entries disposed.
- G1: confirmed material defects reproduced and contained; no unsafe assumption about historical repair.
- G2: direct authorization, tenant isolation, source transitions, concurrency and retries proven in the appropriate environment.
- G3: source records, stock, money, events, ledgers and external outcomes reconcile with explainable timing differences.
- G4: tenant/actor cache transitions, mutations, exports and EN/FR keyboard/mobile workflows verified.
- G5: corrected data or reviewed no-repair disposition, restore/recovery, observability and pilot operating cycle accepted.

Stop expansion on duplicate financial/stock effects, unauthorized disclosure or writes, unexplained material balances, stale close/certification proof, or unrecoverable unknown provider outcomes. No legal/accounting/security/accessibility certification is made here.
