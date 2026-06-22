# AqStoqFlow UI Completion and Backbone Gap Report

Date: 2026-06-18  
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`  
Purpose: Identify the completed or partially completed system backbones whose professional UI/UX is missing, thin, duplicated, or not yet presentation-ready, then define an execution-ready plan to complete the visible product without destabilizing the platform.

---

## 1. Executive Summary

AqStoqFlow is no longer just a UI-first SMB application. The inspected codebase contains serious backend and control-plane foundations across OHADA accounting, POS, inventory, purchasing/AP, payroll, payment reconciliation, compliance, close assurance, auditability, and business events. The main product problem is now a visibility and completion problem: several of the strongest engines exist in schema, services, server actions, hooks, seeds, and tests, but the matching professional operator UI is missing, too thin, duplicated, generic, or not yet integrated into a coherent enterprise-grade operating experience.

The product can become a world-class OHADA-zone SMB operating system if the next execution wave focuses on completing the UI around already-built backbones, not inventing new modules. The system should expose the following enterprise story clearly:

- Every operational event should lead to accountable evidence.
- Every financial event should be ledger-first or clearly labelled as operational analytics until posted.
- Every sensitive workflow should be governed by RBAC, tenant isolation, audit trails, and maker-checker controls.
- Every module should feel complete enough for a buyer, accountant, cashier, manager, HR operator, and owner to trust it during a live demo.
- Every route should have a clear business job, not only a technical component.

The highest-value UI completion opportunities are:

1. Build a control-plane/admin surface for module entitlements, security posture, audit trails, and sensitive-action governance.
2. Complete accounting evidence UIs: posting rules, source links, posting batches, ledger audit trail, general ledger, and statutory/OHADA reports.
3. Complete inventory control UIs: stock counts, adjustments/write-offs, valuation, and reconciliation.
4. Complete POS operational assurance UIs: offline sync, receipt history, refund/void review, cash/terminal controls.
5. Expand AP and payroll from powerful workbenches into full lifecycle screens with detail pages, approval queues, payments, declarations, and evidence.
6. Complete compliance/country-pack/adaptor UIs so certification, fiscal documents, submissions, and evidence are visible and operable.
7. Replace generic finance route aliases with specialized, ledger-aware finance pages.
8. Decide whether production and expenses are in scope now; if yes, build the missing UI around existing schema and seed data.

The recommended strategy is a phased UI completion program. Start with visibility and diagnostic screens before enforcing new restrictions. Do not hide or remove existing tenant workflows until route coverage, backend guards, seed scenarios, and smoke tests prove that the new surfaces are reliable.

---

## 2. Inspection Scope and Method

The inspection covered the current application structure and evidence in:

- `prisma/schema.prisma`
- `prisma/comprehensive-seed.ts`
- `app/[locale]/(dashboard)/dashboard/**/page.tsx`
- `components/**`
- `actions/**`
- `services/**`
- `hooks/**`
- `config/sidebar.ts`
- `graphify-out/GRAPH_REPORT.md`
- `docs/ACCOUNTING_BACKBONE.md`
- `docs/ACTIVE_SURFACE_MAP.md`
- `what-next/**`
- existing reports in `moat proposals/`

The review looked for the gap between four layers:

1. Durable data model: Prisma models and relationships exist.
2. Backend backbone: service, transaction, validation, audit, and business-event logic exist.
3. Action/hook contract: server actions and client hooks expose the backbone safely.
4. Professional UI: routes, pages, components, workflows, states, and messaging make the backbone usable.

The most important finding is that AqStoqFlow already has many layers 1 to 3 for critical modules, but layer 4 is inconsistent.

---

## 3. Maturity Labels Used in This Report

| Label | Meaning | Product implication |
| --- | --- | --- |
| A | Backbone and UI both exist. Needs polish, integration, or sales narrative. | Can be shown, but should be hardened before enterprise demos. |
| B | Backbone exists and a UI surface exists, but it is thin, generic, or incomplete. | High leverage: complete UI before building new backend. |
| C | Schema/service/action foundation exists, but professional UI is missing. | Hidden moat: strongest candidate for a new screen/workflow. |
| D | Route or nav exists, but implementation is duplicated, stale, generic, or misleading. | Product trust risk: consolidate before scaling demos. |
| E | Scope exists mostly as data/seed/docs, not as an active product workflow. | Product decision needed: build, defer, or remove from visible navigation. |

---

## 4. Current System Findings

### 4.1 Strong Backbones Already Present

The codebase contains durable foundations in these areas:

- Accounting: settings, fiscal years, periods, chart of accounts, journals, journal entries, posting batches, source links, posting rules, ledger audit events, trial balance, close assurance, accountant portal, data-trust service.
- POS: sale, tender, terminal, cash drawer, POS session, receipts, offline device/sync/replay models and services.
- Inventory: items, levels, transactions, transfers, valuation, stock counts, adjustments/write-offs, reconciliation, stock-event services.
- Purchasing/AP: suppliers, purchase orders, goods receipts, supplier invoices, three-way match, bank change requests, supplier payments, AP control service.
- Payroll: employees, contracts, periods, attendance snapshots, payroll runs, run lines, payslips, declarations, payment batches, payroll control service.
- Payments/reconciliation: rails, provider accounts, statements, transactions, matching, suspense, reconciliation runs, exceptions, provider operations work.
- Compliance: fiscal documents, fiscal sequences, submissions, adapter configs, compliance evidence, regulatory country packs, compliance center.
- Audit/control: `AuditLog`, `LedgerAuditEvent`, `BusinessEvent`, `BusinessEventOutbox`, sensitive-action service, RBAC-related hardening.

This is a meaningful enterprise-grade foundation. The next bottleneck is not ambition; it is coherent product completion.

### 4.2 Main Product Risk

The most dangerous product risk is showing screens that look complete but are not yet backed by the full ledger, evidence, or compliance contract. For example, finance dashboards read operational tables and should not be presented as statutory accounting truth. Similarly, generic route aliases can make the product look broader than it is while hiding that specialized workflows are not complete.

The UI must therefore do two things:

- Make completed backbones visible.
- Label incomplete trust states honestly until they are fully wired.

### 4.3 Main Opportunity

AqStoqFlow can create a strong moat by turning its back-office control layers into visible buyer confidence:

- Owners see business health, blocked risks, and module coverage.
- Accountants see source-linked journals, close packs, evidence, and exceptions.
- Managers see operational control queues.
- Cashiers see simple POS flows, with invisible accounting and audit protections.
- HR/payroll operators see a complete employee-to-declaration lifecycle.
- Regulators/partners see certification readiness and country-pack evidence.

The platform should feel like a governed operating system, not a collection of dashboards.

---

## 5. Backbone Inventory and UI Gap Matrix

| Area | Backend/data evidence | Current UI evidence | Maturity | Main UI gap | Priority |
| --- | --- | --- | --- | --- | --- |
| Auth, register, login, verify | Better-auth style models, verification, user/org/session models, V2 auth components | Landing/auth/register/login/verify pages exist | A/B | Keep current style aligned; add clear onboarding continuation after verification and workspace setup status | P1 |
| Tenant setup | `Organization`, requested modules, accounting settings, locations, tax rates, users | Settings routes and register flow exist | B | No full workspace setup command center showing missing setup by module | P1 |
| RBAC roles/permissions | `Role`, invite/user relations, role services/actions, sensitive-action controls | Settings users/roles exist | B | Missing security posture page: MFA, sessions, risky permissions, maker-checker, denied attempts | P0 |
| Module entitlements | `Organization.requestedModules`, copy references to module gates | Marketing/register capture exists; no durable admin module UI | C | No subscription/module entitlement model, no owner/admin module page, no backend entitlement enforcement UI | P0 |
| Audit/business events | `AuditLog`, `LedgerAuditEvent`, `BusinessEvent`, `BusinessEventOutbox`, event service | Some audit snippets in accounting/accountant UI | C | No cross-system audit/event/outbox explorer or exception queue | P0 |
| Accounting setup | Accounting settings, periods, accounts, posting rules, default templates | Accounting setup/control-center/accounts/journals/trial balance exist | B | Missing dedicated posting rule, posting batch, source-link, GL, OHADA reports, and ledger exception screens | P0 |
| Close/accountant assurance | Close run, evidence, findings, pack exports, accountant comments/reviews | Close center and accountant portal exist | A/B | Need close-pack history/detail, visual evidence graph, drilldowns from blocker to source document | P1 |
| POS sales | POS station/session/sale/payment/cash drawer/receipt models and services | Professional POS page, cash drawer, terminal dashboard | B | Missing receipt history/detail, refund/void control queue, offline sync operator screen | P1 |
| Offline POS | Device, batch, event, conflict, certificate models and sync service/actions/hooks | Hook exists; no strong route found | C | Missing offline device health, replay queue, conflict resolution, certificate viewer | P1 |
| Inventory items/movements/transfers | Strong item, level, transaction, transfer, stock event foundation | Items, categories, brands, units, movements, transfers UI exists | A/B | Missing stock counts, adjustments/write-offs, valuation, and reconciliation dashboards | P1 |
| Purchasing and receiving | Purchase orders, receipts, supplier models, receiving workflow | Purchase order UI exists | B | Need purchase lifecycle detail consistency and accounting handoff clarity | P2 |
| AP control | Supplier invoices, three-way match, bank changes, payments, AP service/actions/workbench | AP control workbench exists | B | Missing invoice detail, match detail, bank-change queue, payment release detail, supplier payment evidence | P1 |
| Payroll engine | Employees, contracts, periods, attendance, runs, payslips, declarations, payments | Payroll control workbench exists | B | Missing HR employee/contract/presence pages, payslip detail/export, declaration/payment batch views | P1 |
| Payment reconciliation | Provider rails/accounts/statements/matches/suspense/runs/exceptions | Payment reconciliation workbench exists | B | Missing provider operations, statement import queue, run/certificate detail, outage/retry monitoring | P1 |
| Compliance/country packs | Fiscal docs, sequences, submissions, adapter configs, evidence, country-pack services | Compliance center exists | B | Missing fiscal doc lifecycle, adapter config, submission queue, evidence archive, country-pack admin | P1 |
| Finance dashboards | Operational finance service reads sales/purchases/expenses/payments/drawers | Many finance routes use same command dashboard | D | Specialized pages are aliases; need distinct receivables, payables, cash flow, P&L, payments, ledger-aware labels | P0/P1 |
| Production | Recipe and production batch models/seeds/sidebar nav | Sidebar production links exist; active pages not confirmed in dashboard route scan | E/D | Either build production UI or remove/defer nav until ready | P2 decision |
| Expenses | Expense category/expense models/seeds | No strong active expense route found in scan | E | Build expense capture/approval/posting UI or keep out of primary demo | P2 decision |
| Reports/analytics | Report routes and analytics components exist | Analytics/reports pages exist | B/D | Must separate operational analytics from certified accounting/statutory reports | P1 |

---

## 6. Detailed Module Findings and Recommended UI Completion

### 6.1 Auth, Register, Login, Verify, and Onboarding

Current state:

- Auth V2 components exist for login, register, verify, and shared auth shell.
- Verification copy references auditability and onboarding.
- Registration captures module interest through requested modules, but module selection is not yet a durable entitlement system.

What is missing:

- A post-verification onboarding dashboard that shows the tenant what must be configured before each selected module is operational.
- A clear owner journey from "registered" to "workspace ready" to "accounting ready" to "first transaction".
- A handoff from requested modules to actual enabled modules, trial modules, or subscription entitlements.

Recommended changes:

- Keep the current auth pages and color semantics, but add an onboarding continuation panel after verification.
- Create a workspace setup checklist with module-specific readiness:
  - Company profile.
  - Locations.
  - Users and roles.
  - Accounting setup.
  - Tax rates.
  - POS terminal.
  - Inventory catalog.
  - Payroll country pack.
  - Compliance adapter readiness.
- Do not let requested modules imply access until a real entitlement model exists.

Expected effect:

- Higher trust during onboarding.
- Less confusion after registration.
- Better sales demo continuity: a buyer can see exactly how the business becomes operational.

### 6.2 Tenant, RBAC, Module Gates, Sensitive Actions, and Audit Control

Current state:

- Users, roles, invites, organizations, sessions, audit logs, sensitive action controls, and business events exist.
- User and role settings surfaces exist.
- Module language exists in the product, but durable subscription/module entitlement enforcement is not yet visible as a completed control plane.

What is missing:

- `/dashboard/settings/modules`
- `/dashboard/settings/security`
- `/dashboard/settings/audit`
- A visible matrix of role permissions by module.
- A view of fresh-auth/MFA status, sensitive action policy, denied attempts, and self-approval blocks.
- Owner/admin controlled upgrade requests for unavailable modules.

Recommended UI:

1. Module Entitlements Dashboard
   - Shows enabled modules, trial modules, suspended modules, read-only modules, dependencies, and upgrade request status.
   - Normal users should only see subscribed modules in navigation.
   - Owners/admins should see controlled upgrade prompts, not random hidden links.

2. Security and Access Command Center
   - MFA adoption.
   - Active sessions.
   - Risky roles.
   - Users without MFA.
   - Recent permission denials.
   - Maker-checker policy coverage.

3. Audit and Event Explorer
   - Filters by module, actor, entity, action, risk level, date, status.
   - Shows `AuditLog`, `LedgerAuditEvent`, `BusinessEvent`, and `BusinessEventOutbox`.
   - Turns backend evidence into operational confidence.

Expected effect:

- Makes enterprise security visible to buyers.
- Supports module-based SaaS pricing without confusing normal users.
- Gives accountants and owners evidence that the system is controlled, not only feature-rich.

### 6.3 Accounting Ledger, Posting Rules, Source Links, and Reports

Current state:

- The accounting backbone is one of the strongest parts of the system.
- Models and services exist for settings, periods, accounts, journals, posting batches, source links, posting rules, ledger audit events, control center, data trust, close assurance, and accountant portal.
- UI exists for accounting home, control center, setup, accounts, journals, new journal, trial balance, close center, and accountant portal.

What is missing:

- Dedicated posting rules workbench.
- Source-link explorer.
- Posting batch queue/detail.
- Ledger audit event browser.
- General ledger page.
- OHADA statutory report suite.
- Exception remediation paths from data trust blockers into the exact source document or posting rule.

Recommended UI:

1. Posting Rules Workbench
   - Route: `/dashboard/accounting/posting-rules`
   - Users: accountant, owner, finance admin.
   - Jobs: review default templates, activate/deactivate rules, map accounts, validate balance, test against sample source events.
   - Must use service validation and show why a rule cannot be activated.

2. Source Link Explorer
   - Route: `/dashboard/accounting/source-links`
   - Users: accountant, auditor.
   - Jobs: trace source document -> business event -> posting batch -> journal entry -> report line.
   - Include filters for POS sale, payment, refund, payroll, AP invoice, supplier payment, stock adjustment, compliance document.

3. Posting Batch Queue
   - Route: `/dashboard/accounting/posting-batches`
   - Jobs: see posted, failed, blocked, reversed, pending batches.
   - Include replay/repair only where the service supports safe idempotency.

4. General Ledger and OHADA Reports
   - Routes:
     - `/dashboard/accounting/general-ledger`
     - `/dashboard/accounting/reports/balance-sheet`
     - `/dashboard/accounting/reports/income-statement`
     - `/dashboard/accounting/reports/ledger`
     - `/dashboard/accounting/reports/ohada`
   - These must read ledger services, not operational dashboard aggregates.

Expected effect:

- Turns the accounting moat into a visible product moat.
- Gives accountants confidence that reports are source-linked and auditable.
- Reduces risk of presenting operational finance dashboards as statutory truth.

### 6.4 POS, Cash Drawer, Terminal Management, Receipts, Refunds, Voids, and Offline Sync

Current state:

- Professional POS UI exists.
- Cash drawer and terminal management dashboards exist.
- POS session, sales, payment, refund, station, cash drawer, offline device, sync batch, offline event, conflict, and certificate models exist.
- Offline sync actions/hooks/services exist.

What is missing:

- Offline sync operations page.
- Receipt history and receipt detail page.
- Refund/void review queue.
- Device trust and conflict resolution UI.
- Strong operator visibility into replay failures and accounting/compliance eligibility.

Recommended UI:

1. Offline POS Sync Center
   - Route: `/dashboard/pos/offline-sync`
   - Shows devices, last sync, failed batches, pending events, conflicts, replay certificates, and fiscal eligibility.

2. Receipt and Fiscal Document History
   - Route: `/dashboard/pos/receipts`
   - Shows receipts, sale source links, fiscal document status, payment status, refund status.

3. Refund and Void Control Queue
   - Route: `/dashboard/pos/refunds-voids`
   - Shows manager approval, reason, audit, ledger impact, compliance impact, cash drawer impact.

Expected effect:

- POS looks battle-tested, not merely transactional.
- Managers can operate offline and exception workflows with confidence.
- Sales demos can show "what happens when the internet fails" as a moat.

### 6.5 Inventory Items, Movements, Transfers, Counts, Adjustments, Valuation, and Reconciliation

Current state:

- Inventory item, category, brand, unit, movement, and transfer UIs exist.
- Inventory services include valuation, count, adjustment, transfer, stock event, reconciliation, and projection rebuild logic.
- Stock count and adjustment tests exist in service areas, but professional UI coverage is incomplete.

What is missing:

- Stock count sessions dashboard/detail.
- Adjustment/write-off workflow.
- Valuation dashboard.
- Inventory reconciliation dashboard.
- Strong link from inventory events to accounting blockers/source links.

Recommended UI:

1. Stock Count Center
   - Route: `/dashboard/inventory/counts`
   - Create count session, assign location, freeze snapshot, enter counted quantities, approve variance, post adjustment.

2. Adjustment and Write-Off Center
   - Route: `/dashboard/inventory/adjustments`
   - Supports shrinkage, damage, expiry, correction, internal approval, ledger blocker if posting rules are missing.

3. Valuation Dashboard
   - Route: `/dashboard/inventory/valuation`
   - Shows stock value by location/category/item, valuation method, movement impact, variance, aging.

4. Inventory Reconciliation
   - Route: `/dashboard/inventory/reconciliation`
   - Shows stock transactions vs inventory levels vs business events vs ledger/source links.

Expected effect:

- Makes inventory credible for accountants, not just store operators.
- Reduces fraud and stock leakage risk.
- Enables sales positioning around inventory truth, not only item tracking.

### 6.6 Purchasing, Receiving, and AP Controls

Current state:

- Purchase order and receiving surfaces exist.
- AP control service, server actions, hooks, and workbench exist.
- AP models include supplier invoices, invoice lines, three-way match, bank change requests, supplier payments, and allocations.

What is missing:

- Full invoice detail and edit/review pages.
- Three-way match detail page.
- Supplier bank change approval queue.
- Supplier payment release detail.
- Strong AP-to-ledger/source-link visibility.

Recommended UI:

1. Supplier Invoice Center
   - Route: `/dashboard/purchases/payables/invoices`
   - Shows draft, posted, blocked, paid, disputed invoices.

2. Three-Way Match Workbench
   - Route: `/dashboard/purchases/payables/matching`
   - Compares PO, goods receipt, supplier invoice, price variance, quantity variance, tax variance.

3. Bank Change Approval Queue
   - Route: `/dashboard/purchases/payables/bank-changes`
   - Requires maker-checker and audit evidence.

4. Supplier Payment Center
   - Route: `/dashboard/purchases/payables/payments`
   - Shows payment batches, allocations, release status, reconciliation status.

Expected effect:

- Converts AP from a backend control into a CFO-ready operating workflow.
- Reduces payment fraud exposure.
- Creates a strong pitch for owners: AqStoqFlow protects supplier payments from fake bank-detail changes.

### 6.7 Payroll, HR, Presence, Payslips, Declarations, and Payment Batches

Current state:

- Payroll control workbench exists.
- Payroll service is deep: employees, contracts, periods, attendance snapshots, run calculation, approval/posting, payslips, declarations, payment batches, reconciliation queue.
- Server actions and hooks exist.

What is missing:

- Employee directory and profile.
- Contract lifecycle UI.
- Presence/attendance freeze and correction UI.
- Payroll period calendar.
- Payroll run detail.
- Payslip detail/export.
- Declaration queue/detail.
- Payment batch release/reconciliation detail.

Recommended UI:

1. Employee and Contract Center
   - Routes:
     - `/dashboard/payroll/employees`
     - `/dashboard/payroll/contracts`
   - Shows employee status, contract validity, compensation, statutory setup completeness.

2. Presence and Attendance Center
   - Route: `/dashboard/payroll/presence`
   - Freeze attendance snapshots, correct errors, audit corrections.

3. Payroll Run Detail
   - Route: `/dashboard/payroll/runs/[runId]`
   - Shows inputs, calculation, approval, ledger posting, payslips, declarations, payment batch.

4. Payslip and Declaration Center
   - Routes:
     - `/dashboard/payroll/payslips`
     - `/dashboard/payroll/declarations`
   - Export and track statutory readiness.

Expected effect:

- Makes payroll sellable as a complete module.
- Gives HR and finance teams confidence in statutory and payment steps.
- Prevents the workbench from feeling like a technical control panel instead of a product.

### 6.8 Payment Reconciliation, Provider Operations, Suspense, and Exceptions

Current state:

- Reconciliation workbench exists.
- Models and services exist for rails, provider accounts, settlement accounts, events, statement files, statement lines, transactions, match records, suspense items, runs, exceptions, and inbox items.
- Provider operations work has progressed, but UI completion remains important.

What is missing:

- Provider account operations dashboard.
- Statement import queue and file detail.
- Reconciliation run detail/certificate page.
- Suspense exception ownership queue.
- Provider outage/retry monitoring.

Recommended UI:

1. Provider Operations Dashboard
   - Route: `/dashboard/finance/providers`
   - Shows provider health, accounts, webhooks/events, settlement accounts, outage indicators.

2. Statement Import Center
   - Route: `/dashboard/finance/statements`
   - Shows files, lines, parsing errors, duplicate detection, import status.

3. Reconciliation Run Detail
   - Route: `/dashboard/finance/reconciliation/runs/[runId]`
   - Shows matched/unmatched, proposals, approvals, suspense postings, certificate export.

4. Suspense and Exception Queue
   - Route: `/dashboard/finance/reconciliation/exceptions`
   - Shows ownership, aging, risk, next action.

Expected effect:

- Makes payment reconciliation a visible moat for fintech and bank partnerships.
- Supports trust with owners because mobile-money/bank mismatch is a daily SMB pain.
- Creates clear operational ownership of exceptions.

### 6.9 Compliance, Fiscal Documents, Country Packs, Adapter Configs, and Evidence

Current state:

- Compliance center exists.
- Fiscal document, sequence, submission, adapter config, and evidence models exist.
- Country-pack and adapter foundations exist, with some reports noting that country pack/provider authority work remains sandbox or expert-review blocked.

What is missing:

- Fiscal document lifecycle page.
- Compliance submission queue.
- Adapter configuration UI.
- Evidence archive.
- Country-pack admin/readiness page.
- Clear production/sandbox status labels.

Recommended UI:

1. Fiscal Document Center
   - Route: `/dashboard/compliance/fiscal-documents`
   - Shows issued, pending, rejected, cancelled/reversed documents, source links, and authority status.

2. Submission Queue
   - Route: `/dashboard/compliance/submissions`
   - Shows pending/retry/failed/certified submissions and evidence.

3. Adapter Configuration
   - Route: `/dashboard/compliance/adapters`
   - Shows sandbox/production, expert-review status, country, certification readiness.

4. Evidence Archive
   - Route: `/dashboard/compliance/evidence`
   - Shows immutable proof, hashes, request/response snapshots, authority acknowledgements.

Expected effect:

- Makes compliance a boardroom-grade product story.
- Avoids overclaiming production certification before adapters/country packs are truly ready.
- Gives partners and regulators a clear evidence model.

### 6.10 Finance Dashboards, Receivables, Payables, Cash Flow, P&L, and Ledger Truth

Current state:

- Finance command center exists.
- Many finance routes render the same command dashboard.
- Active surface documentation warns finance dashboards are operational analytics and should not be treated as statutory ledger reports.

What is missing:

- Dedicated page behavior per finance route.
- Clear distinction between operational dashboard numbers and ledger-certified accounting reports.
- Receivables/payables aging pages.
- Cash flow page tied to ledger/payment reconciliation status.
- P&L page tied to accounting reports once ready.

Recommended UI:

- Convert finance route aliases into specialized pages:
  - `/dashboard/finance/receivables`
  - `/dashboard/finance/payables`
  - `/dashboard/finance/cash-flow`
  - `/dashboard/finance/profit-loss`
  - `/dashboard/finance/payments`
- Add trust labels:
  - Operational estimate.
  - Ledger-backed.
  - Source-linked.
  - Certified/closed.
- Link statutory reports to accounting report services, not finance dashboard aggregates.

Expected effect:

- Prevents trust damage.
- Makes demos clearer.
- Helps finance users understand when a number is operational, posted, reconciled, or certified.

### 6.11 Production and Expenses

Current state:

- Production and expense models/seeds exist.
- Sidebar includes production navigation.
- Expense models exist and seeded data appears in finance seed flows.
- Active route coverage is not yet strong enough to present these as complete modules.

What is missing:

- Production dashboard, recipes, batches, raw material issue, finished goods receipt, costing, profitability, and traceability UI.
- Expense capture, category, approval, receipt/evidence, payment, posting, and reporting UI.

Recommended product decision:

- If production and expenses are part of the near-term product promise, build them as real modules.
- If not, remove or hide them from normal navigation until the module entitlement system can mark them as unavailable or coming soon.

Expected effect:

- Prevents buyer disappointment from dead or thin navigation.
- Keeps the product story focused on complete, demonstrable workflows.

---

## 7. Proposed Route, Component, Action, and Service Plan

The following table lists the highest-value missing or incomplete UI surfaces.

| Route | Component | Action/service contract | Notes |
| --- | --- | --- | --- |
| `/dashboard/settings/modules` | `ModuleEntitlementDashboard` | New module entitlement service/actions | Requires real entitlement model before enforcement. |
| `/dashboard/settings/security` | `SecurityPostureDashboard` | User/session/MFA/audit/sensitive-action services | Start read-only; add actions later. |
| `/dashboard/settings/audit` | `AuditEventExplorer` | Audit/event query service | Combine audit logs, ledger audit events, business events, outbox. |
| `/dashboard/accounting/posting-rules` | `PostingRuleWorkbench` | Existing posting-rules service + new actions/hooks if missing | P0 because accounting readiness depends on mappings. |
| `/dashboard/accounting/source-links` | `SourceLinkExplorer` | Existing source-link/data-trust services | Critical for accountant trust. |
| `/dashboard/accounting/posting-batches` | `PostingBatchQueue` | Posting/reconciliation/accounting services | Shows blocked/failed/posted batches. |
| `/dashboard/accounting/general-ledger` | `GeneralLedgerDashboard` | Accounting reports service | Must be ledger-backed. |
| `/dashboard/accounting/reports/ohada` | `OHADAReportSuite` | Accounting reports service | Do not use operational finance dashboard. |
| `/dashboard/inventory/counts` | `StockCountCenter` | Inventory count service/actions/hooks | Supports sessions, approval, variance posting. |
| `/dashboard/inventory/adjustments` | `StockAdjustmentCenter` | Inventory adjustment service/actions/hooks | Include write-off and ledger blocker status. |
| `/dashboard/inventory/valuation` | `InventoryValuationDashboard` | Inventory valuation service | Owner/accountant view. |
| `/dashboard/inventory/reconciliation` | `InventoryReconciliationDashboard` | Inventory reconciliation service | Cross-check levels, movements, events, ledger. |
| `/dashboard/pos/offline-sync` | `OfflineSyncCenter` | Existing POS sync actions/hooks/services | Device health, replay, conflicts, certificates. |
| `/dashboard/pos/receipts` | `ReceiptHistoryDashboard` | POS receipt/sale/payment/fiscal services | Receipt detail should link to fiscal/accounting evidence. |
| `/dashboard/pos/refunds-voids` | `RefundVoidControlQueue` | POS refund/void services + sensitive action controls | Manager review and audit. |
| `/dashboard/purchases/payables/invoices` | `SupplierInvoiceCenter` | AP control service/actions | List/detail/status/edit where safe. |
| `/dashboard/purchases/payables/matching` | `ThreeWayMatchWorkbench` | AP three-way match service | PO vs receipt vs invoice comparison. |
| `/dashboard/purchases/payables/bank-changes` | `SupplierBankChangeQueue` | AP bank-change actions | Maker-checker priority. |
| `/dashboard/purchases/payables/payments` | `SupplierPaymentCenter` | AP payment actions | Payment release and reconciliation state. |
| `/dashboard/payroll/employees` | `PayrollEmployeeDirectory` | Payroll service/actions | Employee profile and statutory setup completeness. |
| `/dashboard/payroll/contracts` | `PayrollContractCenter` | Payroll contract service/actions | Contract lifecycle and audit. |
| `/dashboard/payroll/presence` | `PayrollPresenceCenter` | Payroll attendance snapshot service/actions | Freeze/correct attendance. |
| `/dashboard/payroll/runs/[runId]` | `PayrollRunDetail` | Payroll workbench/detail service | One complete payroll lifecycle page. |
| `/dashboard/payroll/payslips` | `PayslipCenter` | Payroll payslip service/actions | Export and delivery status. |
| `/dashboard/payroll/declarations` | `PayrollDeclarationCenter` | Payroll declaration service/actions | Statutory status and evidence. |
| `/dashboard/compliance/fiscal-documents` | `FiscalDocumentCenter` | Compliance fiscal document services | Source, status, reverse/cancel if allowed. |
| `/dashboard/compliance/submissions` | `ComplianceSubmissionQueue` | Compliance submission services | Retry/failed/certified queue. |
| `/dashboard/compliance/adapters` | `ComplianceAdapterSettings` | Adapter config services | Sandbox/production/expert review labels. |
| `/dashboard/compliance/evidence` | `ComplianceEvidenceArchive` | Compliance evidence services | Immutable proof browsing. |
| `/dashboard/finance/providers` | `ProviderOperationsDashboard` | Payment provider services | Provider account health and outages. |
| `/dashboard/finance/statements` | `StatementImportCenter` | Statement file/line services | Import, parse, errors, duplicates. |
| `/dashboard/finance/reconciliation/runs/[runId]` | `ReconciliationRunDetail` | Reconciliation run services | Certificate and match evidence. |
| `/dashboard/events` | `BusinessEventOutboxMonitor` | Business event/outbox services | Platform-wide event reliability. |
| `/dashboard/expenses` | `ExpenseControlCenter` | Expense service/actions to be confirmed/built | Product decision required. |
| `/dashboard/production` | `ProductionControlCenter` | Production service/actions to be confirmed/built | Product decision required. |

---

## 8. Recommended Build Sequence

### Phase 0: Navigation and Truth Audit

Goal: Know exactly which visible routes are complete, partial, duplicated, or misleading.

Work:

- Create a route inventory with status: complete, partial, alias, legacy, missing backend, missing UI.
- Mark generic finance aliases and legacy duplicates.
- Decide whether production and expenses stay visible.
- Add owner/admin-only "not enabled" or "coming soon" states only after module entitlement foundations exist.
- Keep unauthenticated route smoke behavior unchanged; redirects to localized login are acceptable when expected.

Exit criteria:

- Every sidebar link has a clear product status.
- No normal user sees a dead or misleading route.
- No page claims statutory truth unless ledger/source-link evidence exists.

### Phase 1: Control Plane and Trust Visibility

Goal: Make security, module access, and auditability visible.

Work:

- Build `/dashboard/settings/modules`.
- Build `/dashboard/settings/security`.
- Build `/dashboard/settings/audit`.
- Add reusable status chips for module state, risk tier, audit state, and evidence state.
- Add read-only audit/event explorer first; mutation controls can follow after guard review.

Exit criteria:

- Owner can see who has access to what.
- Admin can see sensitive-action and audit evidence.
- Module-based future has a visible admin foundation.

### Phase 2: Accounting Evidence Completion

Goal: Turn the accounting backbone into an accountant-operable product.

Work:

- Build posting rules workbench.
- Build source-link explorer.
- Build posting batch queue.
- Build general ledger page.
- Expand OHADA report surfaces.
- Add drilldowns from close/data-trust blockers into exact source documents, posting rules, batches, and journal entries.

Exit criteria:

- Accountant can diagnose missing mappings, failed postings, orphaned source links, and close blockers without developer help.
- Finance pages distinguish operational analytics from ledger-backed reports.

### Phase 3: Inventory Control Completion

Goal: Complete inventory as a control-grade module, not only an item catalog.

Work:

- Build stock count center.
- Build adjustment/write-off center.
- Build valuation dashboard.
- Build reconciliation dashboard.
- Connect ledger blocker states where stock postings require accounting setup.

Exit criteria:

- Stock count and adjustment workflows can be demonstrated end to end.
- Inventory valuation can be explained to owners and accountants.

### Phase 4: POS Assurance Completion

Goal: Make POS resilient and auditable under real store conditions.

Work:

- Build offline sync center.
- Build receipt history/detail.
- Build refund/void control queue.
- Add device health, conflict resolution, replay evidence, and fiscal eligibility states.

Exit criteria:

- Demo can show normal sale, offline event, replay, cash drawer impact, refund/void control, receipt/fiscal evidence.

### Phase 5: AP and Payroll Lifecycle Expansion

Goal: Expand existing control workbenches into complete operational modules.

Work:

- AP: invoice center, three-way match detail, bank-change queue, supplier payment center.
- Payroll: employee directory, contracts, presence, run detail, payslips, declarations, payment batches.

Exit criteria:

- AP can show invoice-to-payment controls.
- Payroll can show employee-to-payslip-to-declaration-to-payment controls.

### Phase 6: Compliance and Country-Pack Operations

Goal: Make compliance evidence visible without overclaiming production certification.

Work:

- Build fiscal document center.
- Build submission queue.
- Build adapter configuration page.
- Build evidence archive.
- Build country-pack readiness page.

Exit criteria:

- Compliance center clearly separates sandbox, expert-review, and production-ready states.
- Users can trace fiscal documents and authority submissions.

### Phase 7: Payment Provider and Reconciliation Operations

Goal: Make reconciliation a visible fintech-grade moat.

Work:

- Build provider operations dashboard.
- Build statement import center.
- Build reconciliation run detail.
- Build suspense/exception queue.
- Add outage/retry monitoring.

Exit criteria:

- Reconciliation can be operated, not only calculated.
- Partners can see provider reliability and exception handling.

### Phase 8: Finance and Reports Trust Pass

Goal: Eliminate confusion between operational finance and certified accounting.

Work:

- Replace finance aliases with specialized pages.
- Add trust labels to every number.
- Separate reports by source:
  - Operational.
  - Ledger-backed.
  - Reconciled.
  - Certified close pack.
- Remove mock/demo numbers from enterprise dashboards unless explicitly labelled as demo data.

Exit criteria:

- Sales demos do not accidentally misrepresent financial truth.
- Accountants can trust report provenance.

### Phase 9: Production and Expenses Decision

Goal: Decide whether these are active modules or deferred modules.

Work:

- If active: build complete production and expense UIs.
- If deferred: hide from normal navigation and show only controlled upgrade/roadmap states.

Exit criteria:

- No visible module feels abandoned.

### Phase 10: Demo Seed, QA, and Release Gate

Goal: Prove the new UI surfaces work with realistic tenant data.

Work:

- Add seed scenarios for full-suite, POS-only, inventory-only, payroll-enabled, accounting-only, accountant portal, read-only, suspended, and module-limited tenants.
- Add seeded exceptions: failed posting, missing source link, offline sync conflict, rejected compliance submission, payroll declaration blocker, supplier bank change request, inventory count variance.
- Run route smoke checks and service/action tests.

Exit criteria:

- Product demos can show both happy path and controlled exception path.
- Release gate blocks pages that depend on missing backend contracts.

---

## 9. UX and Design Principles for the Completion Wave

Use the established dashboard visual language as the anchor, especially the inventory items dashboard and global dashboard tokens. The new pages should feel like AqStoqFlow, not a separate admin product.

Recommended patterns:

- Use dense, scan-friendly dashboards for operational modules.
- Use tabs for lifecycle stages: Draft, Pending, Approved, Posted, Blocked, Closed.
- Use filter chips for status, module, location, date, actor, and risk.
- Use side panels or drawers for detail review without losing list context.
- Use clear evidence panels: source document, business event, ledger/source link, audit trail, compliance evidence.
- Use icon buttons for common actions and tooltips for unfamiliar actions.
- Use data tables for operational queues, not decorative card grids.
- Use cards only for repeated summary metrics or individual objects, not nested page sections.
- Use trust labels for money and compliance values:
  - Operational.
  - Posted.
  - Reconciled.
  - Source-linked.
  - Certified.
  - Blocked.
- Use bilingual copy consistently, but prioritize business meaning over technical model names.

Do not:

- Present operational dashboard totals as statutory accounting reports.
- Add more hero/marketing-style screens inside the dashboard.
- Hide backend exceptions behind generic error messages.
- Show module links to normal users if those modules are not enabled or not built.
- Build UI-only access control; backend guards must remain authoritative.

---

## 10. Backend and Integration Rules

Every new UI must follow the existing enterprise pattern:

`route -> server action -> server-only service -> Prisma transaction where needed -> audit/business event/source link -> hook -> UI`

Rules:

- UI components must not own business logic.
- Server actions must derive tenant/user context from authenticated server context, not client input.
- RBAC must be checked server-side.
- Module entitlement checks must be server-side once the module control plane exists.
- Admin wildcard permissions must not bypass subscription/module entitlement rules.
- Sensitive financial actions must use maker-checker/fresh-auth where required.
- Every financial/compliance mutation must produce audit evidence.
- Every ledger-relevant source must be traceable to source link, posting batch, journal entry, and audit event.
- Every export must preserve filters, scope, row count, actor, timestamp, and audit evidence.

---

## 11. Database and Seed Recommendations

### 11.1 Module Entitlement Foundation

The current `Organization.requestedModules` is useful for onboarding intent, but not enough for a professional module-based SaaS. Add durable module control models before enforcing module invisibility.

Recommended models:

- `ModuleCatalog`
- `Plan`
- `PlanModule`
- `TenantModuleEntitlement`
- `TenantSubscription`
- `ModuleDependency`
- `ModuleUpgradeRequest`
- `ModuleEntitlementAudit`

Minimum fields for tenant entitlements:

- `organizationId`
- `moduleKey`
- `status`: enabled, trial, suspended, read_only, expired
- `startsAt`
- `endsAt`
- `source`: plan, manual, partner, migration, trial
- `grantedById`
- `revokedById`
- `reason`
- `createdAt`
- `updatedAt`

### 11.2 Seed Scenarios Required

The comprehensive seed should prove the new UI and guards:

- Full-suite OHADA retailer.
- POS + inventory tenant.
- Accounting-only tenant.
- Payroll-enabled tenant.
- Compliance sandbox tenant.
- Read-only accountant tenant.
- Suspended tenant.
- Trial tenant with expiring modules.
- Tenant with failed posting batch.
- Tenant with missing posting rule.
- Tenant with offline POS sync conflict.
- Tenant with rejected compliance submission.
- Tenant with payroll declaration blocker.
- Tenant with supplier bank change awaiting approval.
- Tenant with stock count variance.

---

## 12. Testing and Verification Plan

### 12.1 Unit and Service Tests

Add or extend tests for:

- Module entitlement resolution.
- RBAC plus entitlement composition.
- Posting rule validation.
- Source link search and trace.
- Audit/event explorer query service.
- Inventory count/adjustment service actions.
- Offline sync conflict listing and replay state.
- Payroll run detail and payslip/declaration retrieval.
- AP bank change and supplier payment detail retrieval.
- Compliance submission and evidence query.

### 12.2 Server Action Tests

Every new action should prove:

- unauthenticated denial,
- tenant scope derived from session,
- permission denial,
- entitlement denial where applicable,
- valid success payload,
- safe error response,
- audit behavior for sensitive actions.

### 12.3 Route Tests and E2E Tests

Add smoke/E2E coverage for:

- Direct URL denial to unsubscribed module.
- Normal user cannot see unavailable modules in sidebar.
- Owner/admin can see upgrade/request surfaces.
- Accountant can open source-link explorer and trace a journal entry.
- Cashier can complete POS sale and manager can review refund/void queue.
- Inventory manager can create and approve stock count variance.
- Payroll admin can run employee-to-payslip lifecycle.
- AP operator can review invoice-to-payment lifecycle.
- Compliance manager can inspect fiscal document and submission evidence.

### 12.4 Release Gates

Before promoting a new UI wave:

- Route renders authenticated and localized.
- Route redirects unauthenticated users to localized login.
- Page shows empty, loading, error, denied, and success states.
- Mutations are service-owned and audited.
- Data tables preserve filters and pagination.
- Exports are scoped and audited.
- No mock/demo data appears outside demo mode.
- No route depends on client-trusted tenant IDs.

---

## 13. Business and Marketing Impact

Completing these UI surfaces is not cosmetic. It changes how the product can be sold.

### Owners

What they should see:

- Business control, blocked risks, cash and inventory truth, user accountability, module coverage.

What they should hear:

- "AqStoqFlow does not only record transactions. It tells you which parts of your business are controlled, which are blocked, and what evidence supports your numbers."

### Accountants

What they should see:

- Source-linked journals, posting batches, close blockers, trial balance, general ledger, audit events, close packs.

What they should hear:

- "You can trace figures from report line to journal, posting batch, business event, and source document."

### Cashiers and Store Managers

What they should see:

- Simple POS, clear shift state, cash drawer controls, receipt history, offline sync status.

What they should hear:

- "The daily workflow stays simple, while the system protects cash, receipts, refunds, voids, and offline sales in the background."

### Inventory Managers

What they should see:

- Stock movements, transfers, counts, write-offs, valuation, variance explanations.

What they should hear:

- "AqStoqFlow does not just show stock. It explains why stock changed and what the financial impact is."

### HR and Payroll Teams

What they should see:

- Employees, contracts, attendance, payroll runs, payslips, declarations, payment batches.

What they should hear:

- "Payroll is a controlled statutory workflow, from presence to payslip to declaration to payment evidence."

### CFOs and Finance Teams

What they should see:

- AP controls, reconciliation, provider health, exceptions, suspense, ledger-backed finance reports.

What they should hear:

- "Payments, supplier invoices, and reconciliations are controlled with evidence, not manually trusted spreadsheets."

### Partners, Accountants, and Fintechs

What they should see:

- Module entitlements, compliance evidence, payment reconciliation, close packs, country-pack readiness.

What they should hear:

- "AqStoqFlow gives partners a governed SMB data layer for OHADA markets."

---

## 14. Risk Register

| Risk | Severity | Why it matters | Mitigation |
| --- | --- | --- | --- |
| UI claims statutory truth before ledger/source links are complete | High | Destroys accountant trust | Add trust labels and route statutory reports through accounting services only. |
| Module gating implemented only in UI | High | Direct URL/API access would bypass restrictions | Enforce entitlements in server actions, APIs, jobs, exports, and reports. |
| Navigation exposes incomplete modules | High | Product looks unfinished | Route inventory, entitlement-aware nav, controlled unavailable states. |
| Workbenches remain too technical | Medium | Non-technical users cannot operate modules | Add lifecycle screens and business-language copy. |
| Duplicate legacy routes confuse users | Medium | Support and training burden | Consolidate routes and add redirects where safe. |
| Audit/event data exists but is invisible | Medium | Enterprise controls cannot be sold | Build audit/event explorer early. |
| Production/expenses are half-visible | Medium | Demo risk | Build or hide until ready. |
| Seed data does not prove exception flows | Medium | QA misses real-world failures | Add exception-rich tenants. |
| Overbuilding before backend contract exists | Medium | UI becomes fake | Require service/action contract before page completion. |

---

## 15. Team Responsibilities

Product:

- Decide active module boundaries.
- Define module bundles and entitlement statuses.
- Prioritize buyer-critical workflows.
- Approve trust labels and demo claims.

Design:

- Extend the existing dashboard visual language.
- Create reusable patterns for evidence panels, risk chips, lifecycle tabs, and exception queues.
- Ensure pages are dense, professional, and not marketing-style inside the app.

Engineering:

- Build route/action/service/hook/UI slices.
- Preserve tenant isolation, RBAC, auditability, and ledger-first rules.
- Add backend module entitlement foundations before enforcement.
- Consolidate duplicate/legacy route surfaces.

QA:

- Build route smoke tests, action tests, E2E workflows, and direct URL denial checks.
- Verify empty/loading/error/denied states.
- Test seeded exception tenants.

Sales:

- Build stakeholder-specific demos around completed workflows.
- Avoid overclaiming sandbox or incomplete compliance functions.
- Use evidence and audit UIs as trust anchors.

Partnerships:

- Use payment reconciliation, compliance evidence, close packs, and module entitlements as partner narratives.
- Package accountant-led and fintech-led adoption motions.

---

## 16. Practical Definition of Done for Each New UI Surface

A new AqStoqFlow module screen is complete only when:

- It has a localized route.
- It uses authenticated tenant context.
- It checks RBAC server-side.
- It checks module entitlement server-side where applicable.
- It has loading, empty, denied, blocked, error, and success states.
- It uses the established dashboard visual system.
- It shows business-language labels.
- It provides drilldowns from summary to source record.
- It does not use mock data outside explicit demo mode.
- It has service/action tests.
- It has at least one route smoke test.
- It has seeded demo data.
- It has audit evidence for sensitive actions.
- It links financial/compliance events to source links, business events, or clear "not yet posted" status.

---

## 17. Recommended Immediate Next Sprint

The next sprint should not try to finish every module. It should establish the completion framework and prove it with the most trust-critical screens.

Recommended sprint:

1. Route inventory and navigation status audit.
2. Build `/dashboard/settings/audit` as read-only audit/event explorer.
3. Build `/dashboard/accounting/source-links`.
4. Build `/dashboard/accounting/posting-rules`.
5. Build `/dashboard/inventory/counts` or `/dashboard/pos/offline-sync` as the first operational assurance screen.
6. Add seed scenarios for audit events, source links, failed posting, and offline conflict.
7. Add route smoke and action tests for the new pages.

Why this sprint:

- It makes invisible enterprise controls visible.
- It improves demo trust quickly.
- It creates reusable patterns for every later module.
- It avoids premature module entitlement enforcement before the system can observe and explain access state.

---

## 18. Final Recommendation

AqStoqFlow should be completed by exposing the system backbones that already exist. The platform has the raw material for a strong OHADA SMB operating system: ledger-first accounting, close assurance, compliance evidence, payroll controls, AP controls, inventory services, offline POS, reconciliation, RBAC, and auditability. The next transformation is to make those controls visible, operable, and understandable through professional module UIs.

The winning product direction is not "add more features." It is:

- make hidden controls visible,
- make operational workflows complete,
- make financial truth traceable,
- make unavailable modules intentionally invisible,
- make every demo prove evidence, not promises.

If executed in the sequence above, AqStoqFlow can move from a powerful but uneven system into a professional, modular, enterprise-grade OHADA-zone SMB operating platform.
