# AqStoqFlow / Kontava Platform Operating Guide and Command Center Review

Date: 2026-06-26
Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`
Prepared with: `aqstoqflow-prompt-architect`

## 1. Purpose

This report explains how to get the best operating value from the platform from start to finish. It is written for owners, managers, accountants, finance controllers, inventory operators, sales/POS users, purchasing teams, payroll users, compliance users, and administrators who need to understand how the system should be used as an integrated business control platform.

The platform is not only a set of CRUD screens. Its stronger design is a ledger-backed, evidence-driven operating system for an OHADA-aware SMB or multi-branch business. The highest value comes when teams use each module in sequence, allow the results to flow into the next module, and then use the War Room, Action Center, analytics pages, Assurance Control Tower, and close/compliance surfaces to monitor exceptions and prove the business state.

## 2. Evidence Base Used For This Review

This review was based on the live workspace, not a generic SaaS interpretation. Key evidence included:

- `graphify-out/GRAPH_REPORT.md`: repo-wide graph report covering 1163 files, 4121 nodes, 5321 edges, and 135 communities. The graph highlights tenant defense, ledger-first operational posting, Auth/RBAC hardening, ledger-first OHADA controls, POS delivery flow, and compliance control plane as major architecture groups.
- `config/sidebar.ts`: primary navigation model and module groupings.
- `services/modules/module-catalog.service.ts` and `services/modules/module-entitlement.service.ts`: module catalog, dependency model, entitlement decisions, observe/enforce behavior, and Module Control Center data.
- Dashboard and command pages under `app/[locale]/(dashboard)/dashboard/...`.
- Service/action contracts for Owner War Room, Manager Action Center, Assurance Control Tower, Daily Digest, Cash Command, Stock-to-Cash, payment reconciliation, close assurance, compliance, payroll, POS, inventory, purchasing/AP, finance, analytics, and reports.
- Security and governance code in `services/_shared/protect.ts`, `lib/security/rbac.ts`, `lib/security/rbac-permissions.ts`, `config/permissions.ts`, and evidence contracts under `services/evidence/`.
- Release and quality scripts in `package.json`, including `policy:gates`, `verify:repo`, and `verify:release`.

## 3. High-Level Platform Mental Model

Think about the platform as six connected layers.

1. Tenant and access layer:
   - The user signs in with an active organization.
   - The platform resolves tenant scope server-side.
   - RBAC permissions decide what the user can see or do.
   - Module entitlements decide which commercial modules the organization is allowed to use.
   - Fresh authentication is required for sensitive actions such as payment release, override, close certification, fiscal document issuance, and refund/void workflows.

2. Setup layer:
   - Company profile, locations, roles, users, tax rates, terminals, modules, journals, posting rules, accounts, and country-pack configuration are prepared first.
   - This layer determines whether downstream workflows produce trusted results or blockers.

3. Source operating layer:
   - Inventory, sales, POS, purchasing, suppliers, customers, payroll, finance, and compliance create the real source transactions.
   - Users should fix source data in these modules rather than trying to manipulate dashboard outputs.

4. Ledger and evidence layer:
   - POS sales, payments, purchasing/AP, payroll, fiscal documents, reconciliation runs, close runs, and business events produce accounting/evidence outputs.
   - Evidence grades move from raw to operational, posted, reconciled, certified, or blocked.

5. Intelligence and action layer:
   - Main Dashboard, Analytics, Reports, Finance Dashboard, Cash Command, Stock-to-Cash, Daily Digest, Manager Action Center, Owner War Room, and Assurance Control Tower read from source and evidence services.
   - These surfaces are designed to explain, route, and prioritize work rather than hide problems.

6. Release and assurance layer:
   - Policy gates and verification scripts prevent regressions in service boundaries, workflow assurance runtime tables, payroll immutability, hard-delete policy, regulatory hardcodes, demo report trust, and raw error boundaries.
   - Operators and developers should treat these gates as part of the real release path.

## 4. Navigation Map

The primary sidebar groups the system into:

- Command:
  - Dashboard
  - Analytics
  - Reports
  - Assurance Control Tower
  - Daily Digest
  - Manager Action Center
  - Owner War Room

- Operations:
  - Inventory
  - Sales
  - POS
  - Purchases
  - Suppliers
  - Customers

- Finance and Trust:
  - Finance Overview
  - Finance Analytics
  - Cash Command
  - Cash Drawer
  - Cash Flow
  - Cost Analysis
  - Payables
  - Payments
  - Profit and Loss
  - Profitability
  - Receivables
  - Reconciliation
  - Retail Dashboard
  - Sales Analytics
  - Stock-to-Cash
  - Accounting
  - Accountant Portal
  - Close Center
  - Accounting Control Center
  - Journals
  - Trial Balance
  - Compliance

- People:
  - HR and Payroll

- Governance:
  - Company / Organization
  - Locations
  - Roles and Permissions
  - Users and Invites
  - Security
  - Notifications
  - Appearance
  - Tax Rates
  - Terminals
  - Modules

The best way to use the system is to start in Governance and Setup, run daily operations in Operations and Finance, review outcomes in Command, and certify trust in Accounting, Compliance, Reconciliation, and Assurance.

## 5. Start-to-Finish Operating Procedure

### Step 1: Create Or Confirm The Tenant Foundation

Start in Settings and verify:

- Organization/company identity is correct.
- Default country, currency, legal identity, and contact details are correct.
- Locations/branches exist and are active.
- Users are invited and assigned roles.
- Roles contain only the permissions needed for each job.
- Security settings are in place.
- Notification settings route operational alerts to the right users.
- Terminals are configured for POS branches.
- Tax rates and fiscal settings are configured.
- Module Control Center reflects the modules the tenant should operate.

Why this matters:

- Almost every page loads tenant-scoped evidence through server-side organization context.
- A stale or missing active organization produces recovery/permission states instead of data.
- Wrong roles lead to hidden actions, redacted fields, or safe denials.
- Missing module dependencies produce observe/enforce decisions, blocked module states, or upgrade/dependency gaps.

### Step 2: Enable And Understand Module Entitlements

Use Settings -> Modules.

The Module Control Center shows:

- Catalog count.
- Entitled modules.
- Trial modules.
- Read-only modules.
- Suspended modules.
- Would-block count.
- Dependency gaps.
- Unknown requested modules.
- Decision reason for each module.

Important dependency examples from the catalog:

- POS requires Sales.
- Payment Reconciliation requires Finance and Accounting.
- Close Assurance requires Accounting and recommends Payment Reconciliation.
- Payroll recommends Accounting.
- Purchasing recommends Inventory.
- Analytics recommends Reports.

Use this page as the commercial and operational readiness map. Do not treat sidebar visibility as the only entitlement control. The codebase uses server-side module decisions in protected pages/actions, with observe mode available for non-breaking rollout and enforce mode on sensitive surfaces such as Payroll.

### Step 3: Prepare Accounting And Posting Rules Before Heavy Operations

Before a tenant starts serious POS, purchasing, payroll, or close work:

- Set up chart of accounts.
- Confirm journals.
- Confirm posting rules.
- Confirm default accounting settings.
- Confirm tax handling.
- Confirm close periods.
- Confirm posting-rule coverage for sale, payment, refund, void, AP invoice, AP payment, payroll, and other ledger-producing workflows.

If this is incomplete, operational modules can still produce business records, but the ledger/evidence layer may show blockers such as missing journals, missing posting rules, unbalanced posting rules, or blocked posting batches.

### Step 4: Load Master Data

Prepare stable master data before transactions:

- Inventory:
  - Units
  - Brands
  - Categories
  - Items
  - Item costs/prices
  - Inventory levels
  - Supplier links

- Sales:
  - Customers
  - Price/tax readiness

- Purchasing:
  - Suppliers
  - Supplier terms
  - Supplier bank/payment details

- POS:
  - Locations
  - Terminals
  - Active shifts
  - Catalog availability

- Payroll:
  - Employee and contract data
  - Pay periods
  - Country-pack/statutory configuration
  - Presence/attendance readiness where used

Bad master data is the fastest way to create noisy dashboards, blocked close runs, incorrect margins, and useless action queues.

### Step 5: Run Daily Operations In Source Modules

Users should enter real work in source modules:

- Inventory users manage items, levels, movements, transfers, adjustments, counts, and stock health.
- Sales/POS users sell items, capture tenders, issue receipts, and manage corrections through refund/void workflows.
- Purchasing users create POs, submit/approve them, receive goods, and close POs.
- AP users post supplier invoices, request or approve supplier bank changes, and release payments.
- Finance users monitor payments, receivables, payables, cash drawer, cash flow, costs, profitability, and reconciliation.
- Payroll users calculate runs, approve/post runs, release payment batches, and prepare declarations.
- Compliance users issue fiscal documents from posted sources and monitor authority submissions.

The command surfaces will only be as useful as the source module discipline.

### Step 6: Reconcile Cash, Payments, And Providers

Use Finance -> Reconciliation for payment truth.

The payment reconciliation workbench supports:

- Provider statement import.
- Reconciliation run execution.
- Run detail review.
- Manual match proposal.
- Manual match approval with fresh authentication.
- Suspense item assignment.
- Suspense reclassification proposal.
- Suspense posting approval with fresh authentication.
- Reconciliation run signature with fresh authentication.
- Reconciliation certificate export with fresh authentication.
- Proof trail access for payment transactions and reconciliation runs.

Best practice:

- Run reconciliation daily for electronic rails such as card, mobile money, and bank transfer.
- Resolve duplicate provider references before close.
- Resolve missing callbacks, missing statement lines, amount mismatches, settlement shortfalls, replay spikes, failed-but-debited, and other suspense items promptly.
- Sign only clean or explainable runs.
- Export certificates only after exceptions and suspense are handled or formally documented.

### Step 7: Use Analytics And Dashboards To Detect Movement, Not To Fix Records

Use the main Dashboard, Analytics, Reports, Finance Dashboard, Cash Command, and Stock-to-Cash for monitoring:

- Revenue movement.
- Orders.
- Customer counts.
- Inventory value.
- Average order value.
- Cash collected.
- Sales trend.
- Top products.
- Pending actions.
- Stock health.
- Location performance.
- Alerts.
- Recent activity.
- Cash risk.
- Stock-to-cash exposure.
- Provider risk.
- Drawer risk.
- Suspense and reconciliation exposure.

When a dashboard surfaces a problem, go back to the source module or action link. Do not treat the analysis page as the system of record.

### Step 8: Use Manager Action Center For Daily Execution

Use Command -> Manager Action Center.

This page is read-only and permission-filtered. It answers: "What can this manager actually move today?"

It shows:

- Command brief.
- Do-first action priority board.
- Daily run sheet lanes.
- Open, critical, overdue, and hidden-by-permission counts.
- KPIs.
- Manager actions with next steps.
- Required permissions.
- Due state.
- Assigned role.
- Evidence grade.
- Trust state.
- Blockers and redactions.
- Business signals/insights with action links.

How managers should use it:

1. Open the page each morning.
2. Review the do-first board before opening individual modules.
3. Work through overdue and critical lanes first.
4. Use the action link to jump to the source surface.
5. Treat redactions as permission signals, not missing data.
6. Escalate hidden-by-permission work to an owner/admin only when the manager is the real business owner for the task.

### Step 9: Use Owner War Room For Executive Control

Use Command -> Owner War Room.

This page is read-only and evidence-backed. It answers: "What should the owner care about now?"

The War Room covers:

- Cash at risk.
- Reconciliation exceptions.
- Stock-cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Module observe/control state.
- Cash leakage radar.
- Close autopilot strip.
- Module control strip.
- Morning brief.
- What changed.
- Owner risks.
- Priority actions.
- Proof subjects and proof trail drawers.
- Business truth zones.
- Module Control summary.

How owners should use it:

1. Start with the morning brief conclusion.
2. Check whether the page state is ready, partial, stale, blocked, redacted, permission denied, module unavailable, or safe error.
3. Review top cards, especially cash at risk, reconciliation exceptions, stock-cash exposure, supplier commitments, payroll exposure, and close readiness.
4. Open proof trails when a number is surprising or material.
5. Use the action queue to delegate work to managers or module owners.
6. Use module state to identify subscription/dependency gaps or modules that would block under enforcement.
7. Avoid asking teams to "fix the War Room"; ask them to fix the source workflow linked by the card/action.

### Step 10: Use Assurance Control Tower For Workflow Incidents

Use Command -> Assurance Control Tower.

This page is proof-linked and permission-routed. It answers: "Which workflow assurance incidents are currently blocking trust?"

It shows:

- Open incidents.
- Blocking incidents.
- Overdue incidents.
- Hidden-by-permission count.
- Engine health state.
- Manager-visible incidents.
- Incident severity/status/evidence grade.
- Workflow and source labels.
- Source route and detail route.
- Acknowledge controls.
- Proof blocker reason.
- Severity queues.
- Workflow queues.
- Recent check runs.
- Engine metrics such as recent runs, stale running runs, failed runs, pending alerts, and failed alerts.

How to use it:

1. Review engine health first. A blocked or unhealthy engine means the assurance system itself needs attention.
2. Work blocking and compliance-critical incidents before ordinary warnings.
3. Use Source to fix the operational record.
4. Use Detail to understand the incident.
5. Acknowledge only when the responsible person has accepted ownership or the incident is already being worked.
6. Watch hidden-by-permission counts because they indicate work exists that the current user cannot see.
7. Do not waive or suppress assurance issues casually; they protect the integrity of the War Room, Action Center, and close process.

### Step 11: Run Close Assurance Before Certification

Use Accounting -> Close Center.

Close assurance supports:

- Dashboard read.
- Close assurance run.
- Evidence graph read.
- Finding assignment.
- Finding comments.
- Waiver request.
- Waiver approval with fresh authentication.
- Accountant review update.
- Draft close pack export.
- Certified close pack export with fresh authentication.

Close blockers include patterns such as:

- Missing evidence.
- Open suspense blocking close.
- Unsigned reconciliation blocking close.
- Unresolved exception blocking close.
- Segregation-of-duties violation.
- Fresh authentication required.
- Recertification required.

Best close procedure:

1. Reconcile payments and suspense before running close.
2. Confirm ledger postings and posting batches are clean.
3. Run close assurance for the period.
4. Inspect findings and the evidence graph.
5. Assign findings to owners.
6. Comment with evidence when work is completed.
7. Request waivers only when the exception is justified.
8. Approve waivers only with proper authority and fresh authentication.
9. Update accountant review.
10. Export draft packs for review.
11. Export certified packs only when blockers are resolved or formally waived.

### Step 12: Monitor Compliance And Fiscal Evidence

Use Compliance.

The Compliance Center shows:

- Fiscal document counts by status.
- Compliance submission counts by status.
- Recent fiscal documents.
- Queued submissions.
- Adapter configurations.
- Country code filters.
- Document status filters.
- Submission status filters.
- Adapter status filters.
- Staleness/degraded state.
- Country-pack version and resolution hash.
- Authority channel/reference.
- Payload hash and submission error information.

Compliance actions include:

- Read compliance center snapshot.
- Resolve country-pack metadata.
- Create fiscal documents from posted ledger sources with fresh authentication.
- Enqueue/retry compliance submissions with fresh authentication.

Important operating rules:

- Fiscal documents should be created from posted ledger sources, not loose operational guesses.
- Production tax-authority automation is blocked until official adapters are reviewed and registered.
- Cameroon DGI support is currently represented through a sandbox/pilot adapter pattern.
- Country-pack metadata includes version, schema version, legal reference, verification status, and resolution hash.
- Compliance documents and submissions should be reviewed before close certification.

### Step 13: Use Payroll As A Control Workbench

Use HR and Payroll.

Payroll is protected by `payroll.read` and module entitlement enforcement for the Payroll module. The workbench shows:

- Open periods.
- Calculated runs.
- Posted runs.
- Released payment batches.
- Open declarations.
- Ledger blockers.
- Reconciliation exceptions.
- Recent runs.
- Payment batches.
- Declarations.

Payroll actions include:

- Get payroll workbench data.
- Calculate payroll runs.
- Approve and post payroll runs with fresh authentication.
- Release payroll payment batches with fresh authentication.
- Prepare payroll declarations.

Best payroll procedure:

1. Confirm employee/contract/pay-period data.
2. Confirm country-pack rules and declaration requirements.
3. Calculate payroll.
4. Review gross/net results and salary-sensitive fields according to permission policy.
5. Approve and post payroll only with authorized staff.
6. Release payment batches only after approval and fresh authentication.
7. Prepare declarations.
8. Resolve ledger blockers and reconciliation exceptions.
9. Review payroll exposure in Owner War Room and Manager Action Center.
10. Include payroll evidence in close readiness.

## 6. Module-To-Module Result Flow

The system is strongest when users understand how one module's output becomes the next module's input.

### Setup To Operations

Settings, roles, locations, modules, taxes, terminals, accounting setup, and posting rules feed every operating module. Bad setup creates downstream blockers.

### Inventory To POS And Purchasing

Inventory items, units, categories, brands, costs, and stock levels feed:

- POS catalog availability.
- Sales margins.
- Purchase order line selection.
- Stock-to-Cash exposure.
- Inventory health cards.
- Cost/profitability analysis.

Stock transfers, adjustments, counts, and reconciliations keep stock truth clean.

### POS To Inventory, Payments, Accounting, Compliance, And Evidence

Committing a POS sale:

- Validates active session and stock availability.
- Writes the sale.
- Captures tenders.
- Creates payment rows.
- Issues stock movements.
- Posts sale accounting.
- Posts payment accounting for captured non-credit payments.
- Captures provider references for reconciliation.
- Updates cash/drawer/session totals.
- Emits business events.
- Creates fiscal document evidence when country-pack policy applies.
- Produces a receipt payload and optional delivery audit.

Refunds and voids:

- Require sensitive permissions and fresh authentication.
- Restock inventory.
- Reverse cash drawer/session totals where needed.
- Post refund or void accounting entries.
- Emit correction business events.

### Purchasing To Inventory, AP, Ledger, And Cash

Purchase order workflow:

- Create PO.
- Submit PO.
- Approve PO.
- Receive items.
- Create goods receipt evidence.
- Update received quantities.
- Post received stock into inventory.
- Close PO when complete.

AP workflow:

- Post supplier invoice.
- Match invoice to supplier/goods evidence.
- Create AP ledger posting or ledger blocker.
- Request supplier bank changes.
- Approve supplier bank changes with fresh authentication.
- Release supplier payments with fresh authentication.
- Create payment evidence and payment/reconciliation exposure.

### Payments To Reconciliation, Cash Command, Close, And War Room

Captured payments and provider evidence feed:

- Payment Reconciliation Workbench.
- Cash Command.
- Finance payments dashboard.
- Stock-to-Cash.
- Close Assurance.
- Owner War Room.
- Manager Action Center.
- Assurance incidents.

Unsigned reconciliation runs, open suspense, duplicate provider references, and unresolved exceptions should be treated as close blockers.

### Accounting To Close, Compliance, Reports, And Proof Trails

Accounting journals, posting batches, source links, and ledger entries feed:

- Trial Balance.
- Close Center.
- Close evidence graph.
- Close pack exports.
- Fiscal document creation from posted sources.
- Proof trails.
- Finance reports.
- Owner War Room close readiness.

### Payroll To Ledger, Payments, Declarations, Close, And War Room

Payroll runs feed:

- Ledger postings.
- Payment batches.
- Payroll declarations.
- Reconciliation exceptions.
- Payroll exposure cards.
- Close readiness.

Payroll should not be treated as an isolated HR screen. It is a finance, statutory, cash, and close workflow.

### Compliance To Close, Proof, And Audit

Fiscal documents and authority submissions feed:

- Compliance Center.
- Fiscal evidence.
- Business events.
- Close readiness.
- Proof trails.
- Audit history.

Compliance failures should be reviewed before certified close exports.

## 7. Detailed Review Of Analysis Pages

### Main Dashboard

Route: `/dashboard`

Purpose:

- Daily operating overview for sales, stock, purchasing, and branch health.

Key sections:

- Live generated timestamp.
- Period filter.
- Location filter.
- Refresh action.
- Revenue KPI.
- Orders KPI.
- Customers KPI.
- Inventory value KPI.
- Average order value KPI.
- Cash collected KPI.
- Sales trend.
- Top products.
- Pending actions.
- Inventory health.
- Location performance.
- Operating alerts.
- Recent activity.
- Quick actions to Inventory, Sales, Purchases, and Finance.

How to use it:

- Open it first for a broad pulse.
- Filter by location when reviewing branch performance.
- Use critical alert links to reach the source module.
- Use inventory health to identify stock work.
- Use quick actions to move from insight to execution.

### Business Pulse Analytics

Route: `/dashboard/analytics`

Purpose:

- Server-owned analytics command view for daily sales, POS sessions, inventory pressure, and operating action signals.

Key sections:

- Command brief.
- Today/week/month sales summary.
- KPI cards.
- What changed strip.
- What needs action today.
- Business pulse risks.
- Trust posture.

How to use it:

- Use it for daily sales and operating movement.
- Treat it as operational analytics, not certified financial evidence.
- Use the action board to jump into source workflows.

### Financial Reports

Route: `/dashboard/analytics/reports`

Report types:

- Financial Summary: revenue, profit, and sales overview.
- Cashier Performance: cashier metrics and performance.
- Item Performance: product sales and inventory analysis.
- Cash Flow: cash in/out and drawer reconciliation.

Controls:

- Report type selector.
- Date range picker.
- Quick ranges: 7 days, 30 days, this month.
- Location filter through search params.
- Empty states when no data is available.
- Safe load-error state.

How to use it:

- Use Financial Summary for owner/accountant review.
- Use Cashier Performance for branch/POS accountability.
- Use Item Performance for product profitability, movement, and stock decisions.
- Use Cash Flow for drawer and cash movement analysis.

### Finance Dashboard And Finance Subpages

Finance surfaces include:

- Finance Overview.
- Finance Analytics.
- Cash Command.
- Cash Drawer.
- Cash Flow.
- Costs.
- Payables.
- Payments.
- Profit and Loss.
- Profitability.
- Receivables.
- Retail.
- Sales Analytics.
- Stock-to-Cash.
- Reconciliation.

Finance route access is permission protected. Each surface should be read as a slice of the same truth:

- Payments and reconciliation explain payment trust.
- Receivables and payables explain working capital pressure.
- Cash drawer/cash flow explain cash movement and branch discipline.
- Profitability/costs explain margins and buying/selling quality.
- Stock-to-Cash explains whether inventory is turning into collectible cash.

## 8. Detailed Review Of Command Centers

### Owner War Room

Route: `/dashboard/owner-war-room`
Permission: `dashboard.read`
Nature: Read-only, evidence-backed command center.

What it is best for:

- Owner-level risk triage.
- Morning executive brief.
- Cross-module exposure review.
- Cash, stock, supplier, payroll, close, action, and module state review.
- Proof-supported confidence before asking teams to act.

Core cards:

- Cash at risk.
- Reconciliation exceptions.
- Stock-cash exposure.
- Supplier commitments.
- Payroll exposure.
- Close readiness.
- Action queue.
- Module observe.

Control strips:

- Cash leakage radar.
- Close autopilot.
- Module control.

States to understand:

- `ready`: safe to use.
- `partial`: useful but incomplete.
- `stale`: data is old or freshness failed.
- `blocked`: a blocker prevents trust.
- `redacted`: user cannot see some fields.
- `permission_denied`: user cannot access the surface.
- `module_unavailable`: entitlement/dependency issue.
- `safe_error`: error handled without leaking internals.

Operating rule:

- The War Room should drive delegation and decisions, not manual data correction.

### Manager Action Center

Route: `/dashboard/manager-action-center`
Permission: `dashboard.read`
Nature: Read-only daily control surface.

What it is best for:

- Daily manager prioritization.
- Role-specific action routing.
- Overdue and critical work triage.
- Permission-safe handoff from signals to work surfaces.

Key sections:

- Command brief.
- Do-first priority board.
- Daily run sheet.
- Summary tiles for open, critical, overdue, and hidden actions.
- KPIs.
- Manager actions.
- Business signals.

Run sheet groups include:

- Overdue.
- Critical.
- Due today.
- Blocked.
- Waiting.
- Assigned.
- Routine.

Operating rule:

- Managers should use action links to move into the source module and fix the underlying operational record.

### Assurance Control Tower

Route: `/dashboard/assurance/control-tower`
Permission: `controls.audit.read`
Nature: Proof-linked workflow assurance incident routing and engine health.

What it is best for:

- Workflow assurance incident triage.
- Engine health review.
- Proof blocker discovery.
- Routing incidents to source/detail pages.
- Preventing dashboard regressions from missing runtime/evidence foundations.

Key sections:

- Open, blocking, overdue, and hidden summary tiles.
- Manager-visible incidents.
- Acknowledge button.
- Source and Detail buttons.
- Proof blocker reason.
- Engine health.
- Severity queues.
- Workflow queues.
- Recent runs.

Operating rule:

- Use it as the control room for broken trust chains. Acknowledge ownership, then fix source workflow or engine failure.

### Daily Habit Digest

Route: `/dashboard/daily-digest`
Permissions: any of `dashboard.read`, `finance.read`, `accounting.close.read`, or `inventory.read`
Nature: Read-only role-specific daily and weekly digest surface.

What it is best for:

- Routine team rhythm.
- Daily/weekly digest review.
- Filtered action queue summary.
- Checking stale/redacted/blocked signal counts.

Operating rule:

- Use it as a habit loop. It should send teams to the right module, not replace the modules.

### Cash Command

Route: `/dashboard/finance/cash-command`
Permissions: `finance.read` or `dashboard.read`
Nature: Read-only cash truth intelligence.

What it is best for:

- Collected cash.
- Unreconciled cash.
- Open suspense.
- Drawer risk.
- Provider risk.
- Stock-cash buffer.
- Freshness and proof-linked action pressure.

Trust signals include:

- Provider evidence.
- Reconciliation signoff.
- Open suspense.
- Drawer confidence.
- Close readiness.
- Freshness.

Operating rule:

- Use it daily after POS close and provider reconciliation. If Cash Command is noisy, fix payment capture, provider statements, drawer procedures, or reconciliation exceptions.

### Stock-to-Cash

Route: `/dashboard/finance/stock-to-cash`
Permissions: `finance.read`, `dashboard.read`, or `inventory.read`
Nature: Read-only flow from purchasing, inventory, POS, payments, ledger, and close readiness.

What it is best for:

- Stock-cash exposure.
- Pending purchase order pressure.
- Quantity on order.
- Completed sales revenue.
- Cash collected.
- Unresolved suspense amount.
- Source-link count.
- Blocked steps.
- Unavailable proof count.

Operating rule:

- Use it to understand whether stock is being bought, held, sold, paid, reconciled, posted, and closed cleanly.

## 9. Detailed Review Of Assurance And Evidence Concepts

### Evidence Grades

The evidence contract uses:

- `raw`: data exists but is not yet operationally validated.
- `operational`: source workflow produced usable operating evidence.
- `posted`: ledger posting exists.
- `reconciled`: evidence was matched/reconciled.
- `certified`: close/compliance/certification state is complete.
- `blocked`: a control or missing evidence prevents trust.

Users should read these grades as trust levels, not decoration.

### Proof Trails

Current proof subjects include:

- `journal.entry`
- `reconciliation.run`
- `close.run`
- `payment.transaction`

Proof trails include:

- Organization.
- Subject type and ID.
- Module slug.
- Evidence grade.
- Reason.
- Freshness.
- Generated timestamp.
- Source modules.
- Nodes.
- Edges.
- Blockers.
- Redactions.
- Next actions.
- Audit information.

Proof trail rules:

- The server resolves organization scope.
- Subject-specific RBAC is enforced.
- Redaction happens before JSON returns.
- High-risk proof access should be audited.
- Unsupported records must not be certified by inference.

Use proof trails whenever a metric is material, surprising, blocked, stale, or disputed.

## 10. Roles, Permissions, And Safe Usage

The platform uses canonical permissions plus aliases. The important practical idea is:

- Permissions decide what the user can do.
- Module entitlements decide whether the tenant has the module.
- Fresh authentication protects high-risk actions.
- Tenant scope is resolved server-side.
- Sensitive values can be redacted even when a page is visible.
- High-risk permission grants/denials are audited.

Critical or high-risk examples include:

- Role assignment and user invite.
- Accounting setup, journal posting/reversal, close certification, exports.
- Compliance document issue/certify/reverse/submission retry.
- Payment reconciliation override, suspense posting, signing, certificate export.
- Supplier bank approval and supplier payment release.
- Purchase order approval.
- Payroll run approval/posting, payslip emit, payment release, exports.
- POS refunds/voids and cash adjustment.
- Financial/data export.

Recommended role usage:

- Owner/Admin: module entitlements, users, roles, sensitive approvals, final review.
- Manager: daily action center, inventory/sales/purchasing execution, assigned actions.
- Accountant/Controller: accounting setup, journals, reconciliation, close, reports, compliance evidence.
- Cashier/POS Operator: POS sessions, cart, tender, receipts, limited corrections.
- Inventory Operator: items, levels, transfers, adjustments, counts.
- Payroll Operator: payroll calculations/declarations; approvals should remain separated.
- Auditor/Assurance: read evidence, proof trails, audit/control surfaces.

Do not give wildcard or broad high-risk permissions as a shortcut. The RBAC layer intentionally prevents wildcard from bypassing entitlement, consent, fresh auth, maker-checker, certification, or evidence rules.

## 11. Recommended Operating Cadence

### Daily Opening

1. Confirm active organization/session.
2. Open Dashboard.
3. Open Daily Digest.
4. Managers open Manager Action Center.
5. Owner opens Owner War Room.
6. Cash/finance team opens Cash Command and Reconciliation.
7. Inventory team checks stock health and action queue.
8. POS teams confirm terminal/shift readiness.

### During The Day

1. Run source workflows in source modules.
2. Keep POS sessions clean.
3. Receive goods promptly.
4. Keep payments and provider references clean.
5. Resolve manager actions in priority order.
6. Watch critical alerts and assurance incidents.

### Daily Close

1. Close POS shifts.
2. Review cash drawer.
3. Import provider statements where available.
4. Run reconciliation.
5. Resolve or assign suspense.
6. Check Cash Command.
7. Review Owner War Room for new exposures.
8. Review Assurance Control Tower for workflow incidents.

### Weekly Review

1. Review Business Pulse.
2. Review Financial Reports.
3. Review stock-to-cash exposure.
4. Review supplier commitments and AP aging.
5. Review payroll exposure if a payroll cycle is active.
6. Review module entitlement gaps and hidden-by-permission counts.

### Month-End Close

1. Finish operational entries.
2. Resolve payment reconciliation exceptions.
3. Resolve AP and payroll ledger blockers.
4. Review compliance fiscal documents and queued submissions.
5. Run close assurance.
6. Assign findings.
7. Resolve findings or request justified waivers.
8. Approve waivers with fresh auth where appropriate.
9. Update accountant review.
10. Export draft close pack.
11. Certify and export final close pack only after blockers are resolved or formally governed.

## 12. Release, Verification, And Control Gates

For developers and release owners, the key scripts are:

- `npm run prisma:validate`
- `npm run typecheck`
- `npm run lint`
- `npm run policy:gates`
- `npm run build:app`
- `npm test -- --runInBand`
- `npm run verify:repo`
- `npm run verify:release`

`policy:gates` currently runs:

- `inventory:boundary:fail`
- `service:boundary:fail`
- `workflow:assurance:runtime-check`
- `payroll:immutability:runtime`
- `hard-delete:fail`
- `regulatory:hardcode:fail`
- `demo:trust:fail`
- `error:boundary:fail`

This matters operationally because the War Room, Manager Action Center, and Assurance Control Tower depend on runtime workflow assurance tables and evidence chains. Missing runtime foundations should fail release verification before those command centers regress.

Recommended release rule:

- For code changes that touch command centers, evidence, assurance, accounting, payments, payroll, compliance, or module entitlements, run at least `npm run policy:gates` plus targeted tests. For production release, run `npm run verify:release`.

## 13. Practical "Best Use" Principles

1. Set up the tenant before entering transactions.
2. Keep master data clean.
3. Enter work in source modules.
4. Use dashboards for detection and routing, not manual correction.
5. Reconcile daily.
6. Treat evidence grades as trust levels.
7. Treat blockers as controls, not inconveniences.
8. Use proof trails for important numbers.
9. Keep roles narrow.
10. Use fresh authentication for sensitive decisions.
11. Resolve hidden-by-permission counts through role design, not ad hoc permission grants.
12. Do not certify close packs until suspense, exceptions, fiscal documents, AP, payroll, and ledger blockers are governed.
13. Keep module dependencies clean before enforcement.
14. Run release gates before promoting command-center or assurance changes.

## 14. Current Strengths

- Clear command surfaces for owner, manager, assurance, cash, stock-to-cash, analytics, and close.
- Server-side RBAC and tenant resolution.
- Protected action wrapper with safe errors and correlation IDs.
- Fresh-auth pattern on high-risk workflows.
- Module entitlement observe/enforce model.
- Ledger-first POS, payment, compliance, AP, payroll, and close direction.
- Proof trail contract with blockers, redactions, freshness, and next actions.
- Compliance country-pack and adapter architecture.
- Policy gates in the release path, including workflow assurance runtime table checks.
- Graph evidence shows the architecture is already organized around tenant defense, ledger-first controls, Auth/RBAC, POS delivery, and compliance control plane.

## 15. Main Operating Risks To Watch

- Users may treat dashboards as data entry surfaces instead of returning to source modules.
- Broad permissions can hide real segregation-of-duties needs.
- Module observe mode can be misunderstood as final commercial enforcement.
- Missing accounting setup can create ledger blockers after operations have already begun.
- Payment reconciliation that is not run daily will make Cash Command, Owner War Room, and Close Assurance noisy.
- Compliance submissions and fiscal document issues can become close blockers if not reviewed before month end.
- Payroll salary/privacy redaction must be respected; payroll numbers should not be broadly exposed.
- Assurance incidents must be acknowledged and fixed, not ignored as dashboard noise.

## 16. Recommended Training Path For Users

### Owner/Admin Training

1. Active organization and session recovery.
2. Settings, users, roles, modules.
3. Owner War Room.
4. Module Control Center.
5. Cash Command.
6. Close readiness.
7. Proof trails.
8. Approval and fresh-auth expectations.

### Manager Training

1. Main Dashboard.
2. Daily Digest.
3. Manager Action Center.
4. Source action links.
5. Inventory/Sales/Purchasing module workflows.
6. Redaction and hidden-by-permission meaning.
7. Escalation path.

### Accountant/Controller Training

1. Accounting setup.
2. Journals and posting rules.
3. Payment reconciliation.
4. AP/payables.
5. Close assurance.
6. Evidence graph.
7. Waivers and accountant review.
8. Close pack export/certification.
9. Compliance Center.

### Cashier/POS Training

1. Terminal and shift.
2. Catalog and stock availability.
3. Cart and tenders.
4. Receipt handling.
5. Cash drawer discipline.
6. Refund/void escalation.
7. Offline sync if used.

### Inventory Training

1. Items, units, brands, categories.
2. Inventory levels.
3. Transfers.
4. Adjustments.
5. Counts.
6. Stock-to-cash implications.
7. Low-stock/out-of-stock dashboards.

### Payroll Training

1. Payroll module entitlement and permission model.
2. Period/run workflow.
3. Calculation.
4. Approval/posting.
5. Payment release.
6. Declarations.
7. Ledger blockers and reconciliation exceptions.
8. Salary redaction expectations.

## 17. Appendix: Quick Page Purpose Index

- `/dashboard`: broad live operating dashboard.
- `/dashboard/analytics`: daily Business Pulse.
- `/dashboard/analytics/reports`: financial, cashier, item, and cash-flow reports.
- `/dashboard/daily-digest`: role-specific daily/weekly digest.
- `/dashboard/manager-action-center`: manager daily action routing.
- `/dashboard/owner-war-room`: owner executive risk and proof view.
- `/dashboard/assurance/control-tower`: workflow assurance incident routing and engine health.
- `/dashboard/finance/cash-command`: cash truth and proof-linked cash risk.
- `/dashboard/finance/stock-to-cash`: end-to-end stock-to-cash flow and exposure.
- `/dashboard/finance/reconciliation`: payment reconciliation workbench.
- `/dashboard/finance/payments`: finance payment view.
- `/dashboard/finance/payables`: payables.
- `/dashboard/finance/receivables`: receivables.
- `/dashboard/finance/cash-drawer`: cash drawer.
- `/dashboard/finance/cash-flow`: cash flow.
- `/dashboard/finance/profitability`: profitability analysis.
- `/dashboard/accounting`: accounting overview.
- `/dashboard/accounting/control-center`: accounting control readiness.
- `/dashboard/accounting/close`: close assurance.
- `/dashboard/accounting/accountant-portal`: accountant workflow.
- `/dashboard/accounting/journals`: journal entries.
- `/dashboard/accounting/reports/trial-balance`: trial balance.
- `/dashboard/compliance`: fiscal documents, submissions, and adapter configs.
- `/dashboard/payroll`: payroll workbench.
- `/dashboard/inventory`: inventory overview.
- `/dashboard/inventory/items`: items and stock status.
- `/dashboard/inventory/movements`: stock movements.
- `/dashboard/inventory/transfers`: transfers.
- `/dashboard/purchases`: purchases overview.
- `/dashboard/purchase-orders`: purchase orders.
- `/dashboard/purchases/payables`: AP workbench.
- `/dashboard/purchases/suppliers`: suppliers.
- `/dashboard/sales`: sales overview.
- `/dashboard/pos`: POS.
- `/dashboard/customers`: customers.
- `/dashboard/settings/modules`: module control center.
- `/dashboard/settings/roles`: roles and permissions.
- `/dashboard/settings/users`: users and invites.
- `/dashboard/settings/locations`: locations.
- `/dashboard/settings/terminals`: POS terminals.
- `/dashboard/settings/tax-rates`: tax rates.

## 18. Bottom Line

The best way to get value from AqStoqFlow/Kontava is to operate it as a connected control system:

1. Configure tenant, roles, modules, locations, accounting, taxes, and terminals.
2. Load clean master data.
3. Run source workflows in inventory, POS, purchasing, finance, payroll, and compliance.
4. Reconcile payment truth daily.
5. Use dashboards and command centers to prioritize action.
6. Use proof trails and evidence grades to understand trust.
7. Use Assurance Control Tower to fix broken workflow assurance.
8. Use Close Assurance and Compliance before certification.
9. Protect releases with policy gates and targeted verification.

When used this way, the platform becomes more than a back-office app. It becomes a daily operating rhythm, a manager execution system, an owner control tower, and a ledger-backed assurance layer for cash, stock, payments, payroll, compliance, and close.
