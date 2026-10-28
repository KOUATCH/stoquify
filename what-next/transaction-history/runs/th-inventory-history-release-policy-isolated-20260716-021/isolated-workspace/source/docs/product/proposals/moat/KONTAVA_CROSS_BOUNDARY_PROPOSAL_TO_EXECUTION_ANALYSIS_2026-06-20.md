# Kontava Cross-Boundary Proposal-To-Execution Analysis

Generated: 2026-06-20

Primary source: `moat proposals/KONTAVA_CROSS_BOUNDARY_INNOVATION_MOAT_REPORT_2026-06-19.md`

Supporting sources inspected:

- `moat proposals/KONTAVA_MOAT_FOUNDATION_EXECUTION_ROADMAP_2026-06-19.md`
- `moat proposals/KONTAVA_TECHNICAL_READINESS_BEFORE_MOAT_EXECUTION_2026-06-19.md`
- Current foundation services, actions, components, Prisma schema, and release gate output.

## 1. Executive Summary

The Kontava Cross-Boundary Innovation and Moat Proposal contains 15 major innovation tracks. They are not independent feature ideas. They are a coordinated product strategy for turning Kontava into an evidence-backed OHADA SMB operating system where sales, stock, purchasing, payments, payroll, compliance, close assurance, and accounting become one trusted operating truth.

The correct execution path is not to build the biggest dashboards first. The system should proceed through disciplined layers:

1. Harden the trust foundation: evidence grades, proof trails, snapshots, module observe mode, redaction, release gates.
2. Install the BI baseline: Manager Action Center, evidence-backed KPI contract, Cash Command Intelligence.
3. Extend the current Owner War Room into a daily operating command center.
4. Build Cash Leakage Radar and OHADA Close Autopilot MVPs.
5. Productize Business Evidence Graph and Accountant Trust Pack.
6. Add deeper intelligence: Stock-to-Cash Twin, Payroll-to-Profitability, Supplier Risk Shield, Compliance Radar.
7. Only then build Partner Evidence API and AI Operating Copilot.

Current system readiness is strong for foundation work and early product surfaces. The following foundations already exist in the current codebase:

- Evidence grade/proof trail services and UI.
- Snapshot/read-model services for tenant, branch, payment truth, inventory cash, and close readiness.
- Module control plane in observe mode.
- Business signal and action queue services.
- Redaction/export/composite guard services.
- Owner War Room MVP.
- Durable operational models for reconciliation, payments, inventory, purchasing, payroll, close, accounting source links, business events, fiscal documents, compliance submissions, and audit logs.

Current validation status:

- `node scripts/kontava-moat-release-gate.js --mode fail`: ready, 0 blockers.
- Focused Kontava foundation tests: 17 suites passed, 56 tests passed.
- `npm run typecheck`: passed.

Main gap: the foundation is mostly service-contract/read-model based. It is ready for BI baseline and controlled MVPs, but not yet ready for full graph persistence, partner APIs, broad AI, or hard module enforcement.

## 2. Language Locked

- Proposal: a major moat capability from the source document, such as Owner War Room or Business Evidence Graph.
- Full functionality: production-ready, tenant-safe, evidence-backed, audited, role-aware, performant, and integrated with module entitlements and ledger-first rules.
- MVP: the smallest read-only or low-risk slice that proves value without creating sensitive mutations or false trust claims.
- Moat-level version: the mature version that becomes hard to copy because it depends on Kontava's proprietary tenant evidence, workflow history, OHADA logic, source links, reconciliation, close evidence, and audit trails.
- Advanced version: long-term expansion that may involve AI, partner APIs, predictive scoring, consented exports, or ecosystem integration.

## 3. Current Readiness Baseline

### 3.1 Ready Foundations

| Foundation | Current state | Execution meaning |
| --- | --- | --- |
| Evidence grades | Present in `services/evidence` with tests | Ready for KPI badges, proof drawers, and trust labels. |
| Proof trail | Present for journal entry, reconciliation run, and close run | Ready for narrow drill-through; not yet a full graph explorer. |
| Snapshots | Tenant, branch, payment truth, inventory cash, close readiness | Ready for Owner War Room, Cash Command MVP, and first BI baseline. |
| Module control | Observe mode catalog and entitlement decisions | Ready for upgrade prompts and safe reporting, not hard enforcement. |
| Signals/action queue | Present in `services/signals` | Ready for Manager Action Center and Owner War Room action cards. |
| Redaction/security | Redaction policy, export safety, moat guard | Ready for controlled cross-module views. |
| Owner War Room MVP | Present | Ready to extend, not yet the full operating command center. |
| Operational data spine | Durable Prisma models exist for evidence-rich workflows | Strong source data for moat features. |

### 3.2 Readiness Gaps

| Gap | Why it matters |
| --- | --- |
| No persisted BusinessSignal/ActionItem models yet | Action queue is not yet a durable operational workflow. |
| No persisted EvidenceGraph/EvidenceSnapshot tables by that name | Proof trail exists, but full graph exploration still needs durable graph/read models. |
| No BI baseline contract yet | Existing analytics are not consistently evidence-backed, redacted, module-aware, and action-linked. |
| No partner consent/export scope models | Partner Evidence API must wait. |
| No AI evidence retrieval layer | AI Copilot must wait until evidence graph and citations are stable. |
| Limited E2E coverage for new moat surfaces | Needed before broad rollout and sales demos. |
| Module control is observe-only | Correct for now; hard enforcement should wait. |

## 4. Complete Proposal Inventory

| # | Proposal | Business problem | Stakeholders | Current readiness | First safe slice |
| ---: | --- | --- | --- | --- | --- |
| 1 | Business Evidence Graph | SMBs cannot prove how operations connect to ledger, cash, stock, compliance, and close evidence. | Owners, accountants, auditors, lenders, regulators | Partial | Expand proof trail into a read-only graph for three subject types. |
| 2 | Owner War Room | Owners lack one trusted daily control screen. | Owners, managers, accountants | MVP exists | Extend with BI baseline and action center. |
| 3 | Cash Leakage Radar | Cash loss and payment mismatch are detected late. | Owners, finance, cashiers, branch managers | Partial | Payment truth + cash drawer variance signals. |
| 4 | Stock-to-Cash Digital Twin | Stock decisions are disconnected from cash and purchasing obligations. | Owners, stockkeepers, purchasing, finance | Partial | Inventory cash snapshot plus reorder affordability. |
| 5 | Payment Truth and Suspense Autopilot | Bank/mobile-money/payment reconciliation is manual and opaque. | Finance, accountants, owners | Strong foundation | Guided suspense resolution MVP. |
| 6 | Supplier Trust and AP Risk Shield | Supplier debt, invoice matching, bank changes, and duplicate payments create risk. | Purchasing, finance, owners | Partial | Supplier commitment and AP exception dashboard. |
| 7 | Payroll-to-Profitability Engine | SMBs cannot connect labor cost to branch, sales, production, and profitability. | Owners, HR, payroll, managers | Partial | Payroll exposure plus branch labor ratio MVP. |
| 8 | OHADA Close Autopilot | Close is slow because evidence is scattered. | Accountants, owners, finance | Strong foundation | Continuous close blocker strip and assignment queue. |
| 9 | Accountant Trust Pack and Collaboration Portal | Accountants receive late exports without context. | Accountants, owners, auditors | Partial | Read-only accountant evidence workspace. |
| 10 | Offline Branch Certification | Multi-branch operations lose trust when offline activity syncs late. | Owners, branch managers, auditors | Partial | Offline replay certificate viewer. |
| 11 | Fraud and Controls Case Manager | SMBs lack guided control workflows for fraud and exceptions. | Owners, finance, auditors, managers | Early | Convert severe signals into control cases. |
| 12 | Compliance Readiness Radar | Tax, fiscal, payroll, and OHADA issues are discovered too late. | Owners, accountants, compliance teams | Partial | Compliance evidence and fiscal sequence blocker dashboard. |
| 13 | Module Intelligence and Entitlement Control Plane | Modular SaaS can become sidebar hiding instead of real service control. | Owners, admins, sales, product | Foundation present | Observe reports and upgrade recommendation MVP. |
| 14 | Fintech Partner Evidence API | SMBs cannot share trusted data with lenders and fintech partners. | Owners, lenders, fintechs, accountants | Not ready | Consent/export architecture only. |
| 15 | AI Operating Copilot With Accounting Guardrails | AI advice is untrusted without source evidence and controls. | Owners, accountants, staff | Not ready | Read-only evidence retrieval design only. |

## 5. Shared Execution Spine

All proposals should use the same spine:

- State: operational modules remain source-of-truth; moat features consume snapshots, evidence links, signals, and read models.
- Data model: tenant-scoped records only; every cross-module artifact carries `organizationId`, source modules, evidence grade, freshness, blockers, redactions, and audit metadata.
- Contract: services return safe payloads with provenance and do not expose sensitive fields by default.
- Trust boundary: RBAC, tenant isolation, module entitlement, redaction, and fresh-auth checks happen server-side.
- Sync model: read-only MVPs can use request/response services; production versions should add background rebuilds, durable snapshots, and idempotent jobs.
- Failure handling: partial data must surface as partial, stale, blocked, redacted, or safe-error states; no dashboard should silently hide trust problems.

## 6. Proposal-By-Proposal Execution Plan

### 6.1 Business Evidence Graph

Business problem: Kontava needs to prove how a sale, payment, stock movement, purchase, payroll run, fiscal document, journal entry, reconciliation run, and close evidence connect.

Stakeholders: owners, accountants, auditors, fintech partners, regulators, internal support.

Required foundations:

- Data/schema: `EvidenceSnapshot`, `EvidenceNode`, `EvidenceEdge`, `EvidenceGradeSnapshot`, subject links, evidence hash, source-link references, immutable audit event references.
- Services: graph builder, proof trail service, node resolver, edge resolver, evidence grade evaluator, redaction filter, graph cache.
- Actions/API: read-only graph query, subject-specific graph query, proof-trail action, audit logging on sensitive proof access.
- UI: graph drawer, evidence timeline, node details, blocker list, source document links, redaction chips.
- Security: tenant isolation on every node, RBAC per subject type, module entitlement observe/enforce checks, redacted sensitive metadata.
- Tests/gates: cross-tenant denial, missing-node handling, redaction tests, large graph performance budget, proof grade consistency.

Path to full functionality:

- MVP: expand current proof trail to more subject types and show a linear chain for journal, reconciliation, and close.
- Production-grade: persist evidence snapshots and graph nodes; add query pagination, source hashes, blockers, and backfill.
- Moat-level: make every major operational record graphable from POS to ledger to close and compliance.
- Advanced: graph explorer, accountant annotations, partner-safe evidence packs, AI-citable graph nodes.

Completion proof: any key KPI or document can open a tenant-safe evidence chain with grade, freshness, blockers, redactions, and source links.

### 6.2 Owner War Room

Business problem: owners need one daily control room for cash, stock, supplier exposure, payroll exposure, reconciliation, close, and module state.

Stakeholders: owners, managers, accountants, finance teams.

Required foundations:

- Data/schema: snapshots, BusinessSignal/ActionItem durability, owner preference, role-specific visibility, module observe data.
- Services: owner war room composer, BI baseline service, cash command service, action queue service, redaction service.
- Actions/API: guarded owner dashboard action, proof trail action, action queue reads, module observe reads.
- UI: dense command center, cards, strips, action queue, proof drawer, upgrade prompts, empty/stale/blocked/redacted states.
- Security: `dashboard.read`, finance/accounting/payroll proof permissions, redaction of payroll and provider data.
- Tests/gates: direct URL denial, card-level redaction, stale/partial states, proof drawer, E2E route smoke.

Path to full functionality:

- MVP: current read-only Owner War Room cards with action queue and proof drawer.
- Production-grade: durable preferences, refresh diagnostics, role-specific surfaces, drill-through to source workflows.
- Moat-level: daily operating cockpit integrating BI, Cash Leakage Radar, Close Autopilot, module recommendations, and manager actions.
- Advanced: owner digest, branch comparisons, configurable thresholds, accountant collaboration.

Completion proof: an owner can open the page daily and know what to collect, pay, reconcile, receive, approve, or close next.

### 6.3 Cash Leakage Radar

Business problem: cash leakage through drawer variance, refunds, voids, mobile-money mismatch, duplicate references, and suspense is often found too late.

Stakeholders: owners, finance teams, cashiers, branch managers, auditors.

Required foundations:

- Data/schema: cash variance snapshots, payment transaction evidence, provider references, suspense items, exception records, POS session/device/cashier links, case records later.
- Services: cash leakage signal rules, variance detector, duplicate reference detector, refund/void spike detector, reconciliation exception mapper.
- Actions/API: read radar, assign investigation, create case later, resolve/waive later with maker-checker.
- UI: radar grid by branch/terminal/cashier/payment method, evidence drawer, severity list, action cards.
- Security: avoid predictive staff accusations; redaction for staff-sensitive and provider-sensitive fields; audit severe case access.
- Tests/gates: false-positive scenarios, redaction, role visibility, direct URL denial, signal dedupe.

Path to full functionality:

- MVP: cash drawer variance + open payment suspense + critical payment exceptions.
- Production-grade: branch/terminal/cashier heatmap, deduped signals, owner action queue integration.
- Moat-level: case workflow, root-cause categories, ledger/reconciliation proof, close blockers.
- Advanced: anomaly scoring with transparent evidence, no black-box accusations.

Completion proof: every cash risk has a "why flagged" explanation, evidence links, severity, owner, and next action.

### 6.4 Stock-to-Cash Digital Twin

Business problem: SMBs tie cash in slow stock, over-ordering, dead inventory, stockouts, and supplier obligations without seeing cash impact.

Stakeholders: owners, stockkeepers, purchasing, finance, branch managers.

Required foundations:

- Data/schema: inventory valuation snapshots, stock aging, reorder plans, stock movement evidence, purchase commitments, supplier lead times, margin history.
- Services: stock cash exposure service, reorder affordability service, dead stock detector, stockout risk rules, purchasing link service.
- Actions/API: read stock cash twin, propose reorder, view affordability, export internal report.
- UI: inventory capital map, reorder affordability panel, dead stock list, supplier commitment strip.
- Security: inventory permissions, finance permissions for cash impact, module entitlement for inventory/purchasing/finance.
- Tests/gates: valuation accuracy, stale stock state, negative stock handling, branch filters, large item list pagination.

Path to full functionality:

- MVP: inventory cash snapshot plus zero/negative stock and open PO exposure.
- Production-grade: stock aging, turnover, reorder affordability, supplier commitments.
- Moat-level: full stock-to-cash simulation tied to sales velocity, margin, supplier terms, and cash forecast.
- Advanced: scenario planning and branch-level digital twin.

Completion proof: owners can see which stock decisions trap or release cash and what action is financially safe.

### 6.5 Payment Truth and Suspense Autopilot

Business problem: reconciliation across cash, bank, mobile money, card, invoices, POS, and ledger is manual, slow, and hard to audit.

Stakeholders: finance teams, accountants, owners, auditors.

Required foundations:

- Data/schema: provider accounts, payment transactions, reconciliation runs, match candidates, suspense items, exceptions, source links, certificates.
- Services: ingestion adapters, matching engine, suspense classifier, exception workflow, ledger posting suggestions, certification service.
- Actions/API: import provider evidence, propose matches, approve matches, post suspense, sign reconciliation, export certificate.
- UI: reconciliation workbench, match confidence list, suspense queue, exception board, proof drawer.
- Security: fresh auth for override/sign/post; maker-checker for critical overrides; provider identifier redaction.
- Tests/gates: idempotent ingestion, duplicate reference handling, direct URL denial, override audit, certificate hash stability.

Path to full functionality:

- MVP: payment truth snapshot and open suspense/exception action cards.
- Production-grade: guided matching and suspense workflow.
- Moat-level: reconciliation certification tied to ledger and close evidence.
- Advanced: provider reliability scoring and payment rail intelligence.

Completion proof: every unmatched payment is classified, assigned, matched, posted to suspense, or resolved with audit evidence.

### 6.6 Supplier Trust and AP Risk Shield

Business problem: supplier debt, duplicate invoices, unreceived goods, payment approval, and bank-detail changes expose SMBs to loss and close blockers.

Stakeholders: purchasing, finance, owners, accountants, auditors.

Required foundations:

- Data/schema: supplier invoices, AP matches, goods receipts, supplier bank approval records, payment batches, duplicate fingerprints, commitments.
- Services: AP risk rules, supplier trust scoring, duplicate detector, three-way match service, bank-change guard.
- Actions/API: view AP risk, approve supplier bank change, review duplicate, approve/release payment.
- UI: AP risk shield, supplier trust profile, invoice match panel, payment approval queue.
- Security: fresh auth and maker-checker for supplier bank and payment release; redaction of bank fields.
- Tests/gates: duplicate detection, unauthorized bank access denial, maker-checker, tenant isolation, audit events.

Path to full functionality:

- MVP: supplier commitments and delayed receiving signals.
- Production-grade: AP exception dashboard and supplier trust profile.
- Moat-level: full AP risk shield with three-way match and ledger proof.
- Advanced: supplier behavior intelligence and payment timing optimizer.

Completion proof: risky supplier changes, duplicates, unmatched invoices, and payment releases are controlled before cash leaves.

### 6.7 Payroll-to-Profitability Engine

Business problem: labor cost is often treated as payroll administration, not as branch, sales, production, and profitability intelligence.

Stakeholders: owners, HR, payroll teams, managers, accountants.

Required foundations:

- Data/schema: attendance snapshots, employee contracts, payroll runs/lines, branch assignment, production/sales links, cost allocations.
- Services: payroll exposure service, labor-cost allocation, branch profitability, production labor costing, payroll-to-ledger proof.
- Actions/API: read profitability, freeze attendance, approve/post payroll, export internal labor report.
- UI: labor cost dashboard, payroll exposure card, branch labor ratio, production cost panel.
- Security: strict redaction of employee-level pay; fresh auth for payroll approvals/releases; role-specific aggregation.
- Tests/gates: redacted payload tests, permission denial, payroll calculation provenance, ledger posting link checks.

Path to full functionality:

- MVP: payroll exposure counts and redacted owner-level summaries.
- Production-grade: branch labor ratios and payroll-to-ledger status.
- Moat-level: labor-adjusted profitability by branch, product, and production batch.
- Advanced: workforce planning and scenario simulation.

Completion proof: owners see labor impact without exposing sensitive employee pay outside payroll permissions.

### 6.8 OHADA Close Autopilot

Business problem: close is painful because payments, stock, payroll, invoices, journal entries, fiscal documents, and evidence are scattered.

Stakeholders: accountants, finance teams, owners, auditors.

Required foundations:

- Data/schema: accounting periods, close runs, checklist items, findings, evidence items, waivers, close packs, source links.
- Services: close readiness snapshot, blocker detector, task assignment, waiver workflow, close pack builder.
- Actions/API: read close readiness, assign finding, request/approve waiver, run close checks, certify/export pack.
- UI: close readiness radar, blocker queue, evidence drawer, close autopilot strip, accountant review workspace.
- Security: maker-checker for waivers/certification; fresh auth for certify/export/reopen; audit all close decisions.
- Tests/gates: close blocker correctness, certification hash, waiver authorization, source-link coverage.

Path to full functionality:

- MVP: close readiness strip and blockers in Owner War Room.
- Production-grade: close task queue and evidence domains.
- Moat-level: continuous close autopilot with accountant-ready packs.
- Advanced: country-pack-specific close rules and predictive close readiness.

Completion proof: before month-end, the system shows what blocks close, who owns it, what evidence is missing, and what must happen next.

### 6.9 Accountant Trust Pack and Collaboration Portal

Business problem: accountants receive late, context-poor exports and spend time cleaning data instead of reviewing evidence.

Stakeholders: accountants, owners, auditors, advisory partners.

Required foundations:

- Data/schema: accountant access grants, review comments, evidence requests, close pack exports, client action queue, consent log.
- Services: accountant portal service, scoped evidence views, client request workflow, trust pack exporter.
- Actions/API: invite accountant, grant/revoke access, comment, request evidence, export pack.
- UI: accountant dashboard, client switcher, trust pack view, evidence request panel, review comments.
- Security: external access scopes, consent, tenant isolation, revocation, watermarked exports.
- Tests/gates: external access denial, scoped views, export audit, revocation, comment audit.

Path to full functionality:

- MVP: read-only accountant evidence workspace for close/reconciliation/source links.
- Production-grade: review comments and evidence request workflow.
- Moat-level: multi-client accountant portal with trust grades and close packs.
- Advanced: accountant-led growth marketplace and advisory workflows.

Completion proof: accountants can review evidence inside Kontava instead of relying on disconnected exports.

### 6.10 Offline Branch Certification

Business problem: offline branch activity is hard to trust after sync because owners cannot prove what happened while disconnected.

Stakeholders: owners, branch managers, auditors, support teams.

Required foundations:

- Data/schema: offline device identity, replay queue, hash chains, sync batches, replay certificates, conflict records.
- Services: offline replay verifier, certificate generator, conflict resolver, branch trust scoring.
- Actions/API: read certificate, replay queue, approve resolution, export branch certificate.
- UI: offline branch certificate panel, replay status timeline, conflict list, branch trust badge.
- Security: device identity, replay idempotency, tamper detection, audit replay decisions.
- Tests/gates: duplicate replay prevention, hash chain verification, conflict handling, offline E2E.

Path to full functionality:

- MVP: show offline replay certificate and blocker state.
- Production-grade: branch certification dashboard and conflict workflow.
- Moat-level: certified offline operations tied to POS, stock, ledger, and close.
- Advanced: partner/auditor trusted branch evidence packs.

Completion proof: a branch's offline period can be proven, replayed safely, and audited.

### 6.11 Fraud and Controls Case Manager

Business problem: SMBs need practical controls and investigation workflows, not just alerts after losses occur.

Stakeholders: owners, finance, auditors, managers, compliance teams.

Required foundations:

- Data/schema: control cases, case events, assignments, evidence links, comments, resolution status, SLA, severity.
- Services: case creation from signals, assignment, escalation, resolution, audit history.
- Actions/API: create case, assign case, comment, resolve, dismiss, export internal case report.
- UI: case board, evidence drawer, timeline, comments, resolution panel.
- Security: avoid defamatory/predictive staff scoring; strict audit; permissioned access to case details.
- Tests/gates: case tenant isolation, audit events, redacted evidence, role-based access, false-positive handling.

Path to full functionality:

- MVP: convert critical cash/reconciliation signals into read-only case candidates.
- Production-grade: case workflow with owner, SLA, comments, and resolution.
- Moat-level: controls framework tied to ledger, close, reconciliation, and audit.
- Advanced: pattern detection across branches with transparent evidence.

Completion proof: severe control issues are tracked from signal to evidence to resolution with audit.

### 6.12 Compliance Readiness Radar

Business problem: SMBs discover tax, payroll, fiscal document, sequence, or evidence problems too late.

Stakeholders: owners, accountants, compliance teams, regulators.

Required foundations:

- Data/schema: fiscal documents, sequences, compliance submissions, evidence items, country-pack rules, declaration status, compliance blockers.
- Services: compliance rule evaluator, country-pack resolver, readiness scorer, evidence gap detector.
- Actions/API: read radar, retry submission, attach evidence, prepare declarations, export compliance pack.
- UI: compliance radar, country-pack status, fiscal sequence warnings, evidence gap list.
- Security: country-specific permissions, audit retries, redaction of sensitive fiscal/provider data.
- Tests/gates: country-pack rule tests, sequence gap detection, submission retry audit, false certification prevention.

Path to full functionality:

- MVP: compliance blocker dashboard from fiscal docs, submissions, close evidence, and payroll declarations.
- Production-grade: readiness scoring by country pack and period.
- Moat-level: continuous compliance radar linked to close and accountant trust packs.
- Advanced: authority adapter integrations and regulator-facing evidence.

Completion proof: compliance blockers appear before filing deadlines with evidence and next actions.

### 6.13 Module Intelligence and Entitlement Control Plane

Business problem: module-based SaaS must be enforced through real backend guards, not hidden navigation alone.

Stakeholders: owners, admins, sales, product, finance, partners.

Required foundations:

- Data/schema: module catalog, dependencies, plans, tenant entitlements, usage signals, decision logs.
- Services: entitlement evaluator, module usage signal builder, dependency checker, upgrade recommendation engine.
- Actions/API: module control center, observe report, upgrade request, admin entitlement changes.
- UI: module control center, unavailable states, upgrade prompts, dependency warnings.
- Security: admin wildcard must not bypass entitlements; server-side guards for pages/actions/API/reports/exports/jobs.
- Tests/gates: direct URL denial in enforce mode, observe logging, read-only tenants, suspended tenants, wildcard rule.

Path to full functionality:

- MVP: current observe mode plus control center and would-block reporting.
- Production-grade: server-side guard adoption across routes/actions/reports/exports.
- Moat-level: module recommendations based on evidence of operational pain.
- Advanced: automated plan/bundle optimization and partner/accountant module recommendations.

Completion proof: tenants see and use only entitled modules under enforcement, while owners can request upgrades through controlled surfaces.

### 6.14 Fintech Partner Evidence API

Business problem: SMBs need financing and payment services, but lenders and fintechs cannot trust self-reported data.

Stakeholders: SMB owners, lenders, fintech partners, accountants, compliance/legal teams.

Required foundations:

- Data/schema: partner organization, consent grant, evidence export, API credential, scope, revocation, watermark, access log.
- Services: consent service, scoped evidence pack builder, partner API gateway, export redaction, rate limiting.
- Actions/API: grant consent, revoke consent, generate pack, partner read API, audit view.
- UI: partner consent center, export preview, scope summary, revocation panel.
- Security: consent, least privilege, watermarking, revocation, credential rotation, audit, legal review.
- Tests/gates: scope enforcement, revoked-token denial, export watermark, rate limit, tenant isolation.

Path to full functionality:

- MVP: internal design and consent/export model only.
- Production-grade: accountant-endorsed evidence pack export.
- Moat-level: partner API for verified sales, reconciliation, stock, and close evidence.
- Advanced: lender integrations and risk products based on certified Kontava evidence.

Completion proof: a partner can access only consented, scoped, watermarked, audited evidence and nothing else.

### 6.15 AI Operating Copilot With Accounting Guardrails

Business problem: generic AI advice is unsafe for accounting and compliance unless answers are source-cited, tenant-scoped, and permission-filtered.

Stakeholders: owners, accountants, staff, support, partners.

Required foundations:

- Data/schema: evidence retrieval index, answer audit, prompt policy, source citations, denied-source log, user feedback.
- Services: retrieval service, citation builder, RBAC filter, redaction filter, AI safety policy, answer evaluator.
- Actions/API: read-only ask endpoint, source preview, feedback, escalation to human workflow.
- UI: copilot panel, cited answer, source drawer, confidence warning, blocked state.
- Security: no mutation execution, no hidden sensitive data, no certified claim without evidence, audit answers.
- Tests/gates: prompt injection tests, RBAC-filtered citations, redaction, hallucination guard, no mutation guarantee.

Path to full functionality:

- MVP: read-only FAQ-style assistant over safe docs and public product help.
- Production-grade: tenant evidence Q&A with strict citations and redaction.
- Moat-level: source-cited operating copilot over evidence graph, BI, close, reconciliation, and compliance.
- Advanced: action recommendations that create draft tasks but never execute sensitive operations automatically.

Completion proof: every answer shows evidence used, permission filters applied, and safe next actions.

## 7. Dependency Map

### Build First

1. BI baseline contract.
2. Manager Action Center from BusinessSignal/ActionQueue.
3. Cash Command Intelligence using snapshots and payment truth.
4. Proof trail expansion to more subject types.
5. E2E smoke tests for Owner War Room, proof drawer, redaction, and route denial.

### Can Run In Parallel

- Cash Command Intelligence and Manager Action Center.
- Close Autopilot MVP and Accountant Trust Pack design.
- Module Intelligence observe reporting and BI module-aware unavailable states.
- Stock-to-Cash MVP and Supplier AP Risk MVP, after shared BI contracts exist.

### Must Wait

- Full Business Evidence Graph: needs persisted graph/read model and performance budget.
- Partner Evidence API: needs consent/export/revocation/legal foundations.
- AI Copilot: needs evidence graph, retrieval, citations, and redaction guarantees.
- Hard module enforcement: needs route/action/API/export/job guard coverage.
- Predictive fraud/anomaly scoring: needs case workflow, evidence explanations, and false-positive controls.

## 8. Technical Architecture Plan

### 8.1 Shared Contracts

Create shared contracts before building more surfaces:

- `BIKpiCard`: title, metric, period, evidenceGrade, freshness, sourceModules, blockers, redactions, drillThrough, requiredPermission.
- `ManagerAction`: source signal, severity, owner role, due date, proof link, next action, status.
- `MoatDrillThrough`: subject type, subject ID, source route, proof trail support, module slug.
- `SensitiveSurfacePolicy`: permission, fresh auth, maker-checker, redaction, export eligibility.

### 8.2 Service Boundaries

- Operational modules remain source-of-truth.
- Moat services compose, classify, and summarize.
- Server actions expose guarded read/write boundaries.
- UI components never compute trust, entitlement, or redaction.
- Background jobs should rebuild snapshots and graph/read models later.

### 8.3 Event Flow

1. Operational workflow occurs: sale, payment, PO, payroll, stock movement, fiscal document, close run.
2. Business event/source link is recorded.
3. Snapshot/read model is generated or refreshed.
4. Evidence grade and blockers are computed.
5. Business signal/action item is created.
6. BI/Owner surfaces show evidence-backed facts.
7. Proof trail opens source chain.
8. Close/accountant/partner layers consume only trusted evidence.

## 9. UX And Product Plan

Every moat feature should appear as part of one unified operating system:

- Owner War Room: first owner control screen.
- Manager Action Center: daily habit loop across BI.
- Proof Trail drawer: available from KPIs, documents, actions, and close blockers.
- Cash Leakage Radar: drillable radar with "why flagged" evidence.
- Close Autopilot: continuous close blocker strip and close task queue.
- Accountant Trust Pack: accountant workspace, not a generic report download.
- Module Control Center: owner/admin module state and upgrade workflow.
- Compliance Radar: readiness dashboard by period, country pack, and evidence gap.

Required states:

- Loading.
- Empty.
- Partial.
- Stale.
- Blocked.
- Redacted.
- Permission denied.
- Module unavailable.
- Upgrade request.
- Safe error.

Required product language:

- "Evidence-backed" instead of "smart" when proof exists.
- "Operational" or "Internal report only" when not ledger/certified.
- "Blocked" when unresolved evidence prevents trust.
- "Redacted" when sensitive values are intentionally hidden.
- "Observe mode" when module enforcement is not active.

## 10. Security, Compliance, And Trust Plan

Non-negotiable rules:

1. Tenant isolation applies to every record, node, signal, snapshot, export, and proof trail.
2. RBAC is necessary but not sufficient; module entitlement must also be checked.
3. Admin wildcard permissions must not bypass module subscription rules.
4. Payroll person-level values are redacted outside payroll-specific permissions.
5. Supplier bank and payment provider identifiers require strict redaction and fresh auth for sensitive operations.
6. Close certification, waiver, export, period reopen, reconciliation override, payment release, and supplier bank approval require maker-checker or fresh auth.
7. Partner exports require consent, scope, revocation, watermarking, and audit.
8. AI must never invent certification or execute sensitive mutations.
9. Evidence grades must be computed server-side.
10. Every export must be minimally sufficient and auditable.

## 11. Phased Execution Roadmap

### Phase 0: Foundation Hardening

Objective: close the remaining foundation gaps before broad product expansion.

Technical work:

- Normalize BI KPI contract.
- Add missing proof subject types.
- Add persisted snapshot/evidence tables where performance or history requires them.
- Define feature flags for BI, cash radar, close autopilot, accountant portal, partner API, and AI.

UX work:

- Standardize evidence badge, redaction chip, proof drawer, action card, blocked state, module unavailable state.

Data work:

- Validate source links, business events, reconciliation, close evidence, payroll, inventory, purchasing, fiscal docs.

Tests:

- Unit, service, action, route, redaction, tenant, module, and export tests.

Release gate:

- Static gate remains ready.
- Focused foundation tests pass.
- No new route/action bypasses RBAC or module observe rules.

Completion criteria:

- BI surfaces can consume one shared evidence-backed contract.

### Phase 1: BI Baseline and Manager Action Center

Objective: turn analytics into action-oriented, evidence-backed BI.

Technical work:

- Build `services/bi`.
- Wrap BusinessSignal/ActionQueue into Manager Action Center.
- Add BI KPI provenance to analytics services.
- Add drill-through links and proof support.

UX work:

- Replace static quick actions with real manager actions.
- Add evidence badges to KPI cards.
- Add blocker/redaction/freshness chips.

Data work:

- Map KPIs to source tables and proof subjects.

Tests:

- BI contract tests, action queue tests, permission-filtered payload tests.

Release gate:

- No KPI without evidence/freshness metadata.

Completion criteria:

- A manager can answer: what needs my attention today and why?

### Phase 2: Owner War Room and Cash Command Intelligence

Objective: make the Owner War Room the daily control surface.

Technical work:

- Extend Owner War Room with BI baseline cards.
- Build Cash Command Intelligence service.
- Add receivable/payable/cash obligation summaries where source data is ready.

UX work:

- Cash control tower, liquidity strip, proof drawer, action cards.

Data work:

- Payment truth, cash drawer, supplier commitments, receivables, payroll, tax, close readiness.

Tests:

- E2E route, card states, proof drawer, redaction, stale/partial snapshots.

Release gate:

- No sensitive payroll/provider/supplier fields leak in Owner War Room payload.

Completion criteria:

- Owners see cash position, obligations, exceptions, and next actions in one page.

### Phase 3: Cash Leakage Radar and Close Autopilot MVP

Objective: turn cash and close blockers into guided action.

Technical work:

- Cash leakage rules from drawer variance, suspense, exceptions, duplicate references.
- Close Autopilot blocker assignment and close readiness domains.

UX work:

- Radar by branch/payment method/terminal.
- Close blocker queue with evidence and owners.

Data work:

- Cash sessions, payment evidence, reconciliation runs, close findings, evidence items.

Tests:

- Signal dedupe, false-positive controls, close blocker correctness.

Release gate:

- Every radar signal has explainable evidence and safe wording.

Completion criteria:

- Cash and close risks are visible before loss or month-end panic.

### Phase 4: Business Evidence Graph and Accountant Trust Pack

Objective: turn proof trails into graph-backed trust and accountant collaboration.

Technical work:

- Persist evidence graph snapshots.
- Build accountant access grants, review comments, evidence requests.

UX work:

- Evidence graph explorer.
- Accountant trust pack workspace.

Data work:

- Expand source links and evidence graph coverage across POS, payments, inventory, purchasing, payroll, close, compliance.

Tests:

- Graph tenant isolation, large graph performance, accountant scope denial, export audit.

Release gate:

- No external accountant access without scoped grants and revocation.

Completion criteria:

- Accountants can review live source-linked evidence inside Kontava.

### Phase 5: Compliance Radar, Stock-to-Cash Twin, Payroll-to-Profitability, Supplier Risk Shield

Objective: mature vertical intelligence domains.

Technical work:

- Domain-specific read models and action queues.
- Compliance rule evaluator.
- Payroll cost allocation.
- Supplier trust/AP risk rules.

UX work:

- Compliance readiness dashboard.
- Inventory capital and reorder affordability.
- Labor profitability.
- Supplier/AP risk shield.

Data work:

- Country packs, fiscal documents, payroll declarations, inventory valuation, AP matches.

Tests:

- Country-pack tests, valuation accuracy, payroll redaction, AP maker-checker.

Release gate:

- No compliance/certified claims without evidence.

Completion criteria:

- Kontava can explain operating health across compliance, stock, labor, and supplier risk.

### Phase 6: Partner Evidence API and AI Copilot

Objective: expand the moat into ecosystem and intelligence layers.

Technical work:

- Consent grants, scoped partner APIs, retrieval/citation layer, AI guardrails.

UX work:

- Consent center, partner export preview, AI cited answer panel.

Data work:

- Evidence graph coverage, certified packs, export scopes, answer audit.

Tests:

- Revocation, token scope, prompt injection, citation correctness, redaction.

Release gate:

- Legal/security sign-off for partner data and AI.

Completion criteria:

- Partners and AI can consume only permissioned, scoped, evidence-backed Kontava truth.

## 12. Testing And Release Plan

Minimum test ladder:

1. Unit tests for evidence grades, signal rules, redaction rules, module decisions.
2. Service tests for BI, snapshots, proof trails, owner war room, cash radar, close readiness.
3. Server action/API tests for RBAC, tenant isolation, module guard, export safety.
4. Route tests for direct URL denial.
5. E2E tests for Owner War Room, Manager Action Center, proof drawer, module unavailable, redacted states.
6. Security tests for sensitive fields, fresh auth, maker-checker, partner consent, wildcard permissions.
7. Performance tests for snapshots and graph queries.
8. Release gates before each phase.

## 13. Risk Register

| Risk | Severity | Mitigation |
| --- | --- | --- |
| Dashboards overstate weak data | High | Evidence grades and blocker states on every KPI. |
| Cross-module pages leak sensitive data | Critical | Redaction service, RBAC, module entitlement, payload tests. |
| Graph queries become slow | High | Persisted graph snapshots, pagination, performance budgets. |
| Signal fatigue | Medium | Deduplication, severity thresholds, digest preferences. |
| Module enforcement breaks tenants | Critical | Observe mode, staged enforcement, rollback switches. |
| Partner API leaks data | Critical | Consent, scopes, revocation, watermarking, audit, legal review. |
| AI hallucinates accounting facts | Critical | Source-cited retrieval only, no mutation, answer audit. |
| Developers bypass service boundaries | High | Shared contracts, protected actions, release gates. |
| Compliance claims become legally risky | Critical | No certified claim unless close/compliance evidence proves it. |

## 14. Recommended First Build

The first build should be:

`Kontava BI Baseline + Manager Daily Action Center + Cash Command Intelligence MVP`

Why this first:

- It directly follows the BI and moat proposal logic.
- It uses foundations already present.
- It creates a daily habit loop for owners and managers.
- It strengthens Owner War Room without jumping to risky advanced features.
- It prepares Cash Leakage Radar, Close Autopilot, Evidence Graph, and Accountant Trust Pack.

Build scope:

1. `services/bi/bi-contracts.ts`
2. `services/bi/manager-action-center.service.ts`
3. `services/bi/cash-command-intelligence.service.ts`
4. Guarded BI server actions.
5. Evidence-backed KPI cards.
6. Drill-through links to proof trails or source routes.
7. Tests and release gate entries.

Out of scope for first build:

- AI Copilot.
- Partner Evidence API.
- Full graph explorer.
- Hard module enforcement.
- Predictive fraud scoring.
- External accountant access.

## 15. Final Recommendation

Kontava should execute the Cross-Boundary Innovation and Moat Proposal as a disciplined foundation-to-product sequence.

The platform is ready for the next practical step: install a professional BI baseline and Manager Action Center, then extend Owner War Room and Cash Command Intelligence. That gives the business visible value quickly while preserving tenant isolation, RBAC, auditability, OHADA compliance, ledger-first truth, module observe mode, redaction, and proof trails.

The full-blown moat vision is achievable, but only if Kontava resists building disconnected dashboards. Every feature must become part of the same evidence-backed operating system.

Blueprint ready.
