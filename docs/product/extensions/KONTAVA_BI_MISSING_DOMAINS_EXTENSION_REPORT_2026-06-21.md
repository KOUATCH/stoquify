# Kontava BI Missing Domains Extension Report

Date: 2026-06-21

## Purpose

This report extends the Kontava BI Proposal Report by identifying important business domains that are absent, weakly represented, or only implied in the current AqStoqFlow/Kontava system. The goal is to highlight domains that could make Kontava more market-differentiated, manager-ready, and difficult to replace for OHADA-region SMBs.

The existing proposal already covers the core BI suite: Cash Command Intelligence, Receivables Risk Intelligence, Payables Control Intelligence, Inventory Profitability Intelligence, Sales and Margin Intelligence, Payment Reconciliation Intelligence, Manager Action Center, OHADA Ledger Assurance, Close Readiness Intelligence, SMB Health Score, compliance, payroll, and branch performance.

This report focuses on adjacent domains that can expand Kontava into a more complete SMB operating reference.

## Current Coverage Baseline

The current system already has strong foundations in:

- POS, cash drawer control, sales orders, refunds, and offline sync.
- Inventory levels, stock movements, stock counts, stock transfers, adjustments, write-offs, valuation, and production batches.
- Customers, suppliers, customer ledger entries, supplier ledger entries, purchasing, goods receipts, supplier invoices, 3-way match, supplier bank controls, and supplier payments.
- Payroll employees, contracts, attendance snapshots, payroll runs, payslips, declarations, payment batches, and payroll payment allocations.
- Payments, payment rails, provider accounts, statement files, statement lines, provider events, match records, suspense items, reconciliation runs, and payment exceptions.
- Accounting periods, journals, journal entries, posting batches, accounting source links, posting rules, fiscal documents, compliance submissions, and close assurance.
- Evidence/proof trail services, business events, business event outbox, snapshots, business signals, action queues, module control, and owner war room primitives.

The strongest next opportunities are therefore not duplicates of those areas. They are domains that make the existing ledger-backed BI more predictive, growth-oriented, operationally complete, and strategically useful.

## Refined Prompt For Future Analysis

Use this prompt when asking Codex or a product team to deepen this roadmap:

```text
Go through the saved Kontava BI Proposal Report and the current AqStoqFlow/Kontava codebase. Identify the high-value business domains that are missing, weakly represented, or only implied today, but that could make the product meaningfully more valuable, differentiated, and enterprise-grade for OHADA-region SMBs.

Do not repeat domains already covered well by the proposal, such as cash command, receivables, payables, inventory profitability, sales/margin, payment reconciliation, close readiness, OHADA ledger assurance, payroll, compliance, branch intelligence, and manager action center. Instead, find the adjacent domains that would extend the system into a more complete business operating reference.

For each missing or underdeveloped domain, provide:

1. Domain name.
2. Current coverage status: absent, partial, or implied.
3. Why it matters commercially and operationally for SMB users.
4. Which user roles benefit: owner, finance manager, accountant, inventory manager, branch manager, sales lead, HR/payroll lead, or operations lead.
5. What unique BI or management intelligence it would unlock.
6. The base structures required before implementation:
   - Prisma models and relationships
   - Ledger/business-event requirements
   - Evidence and source-document requirements
   - Permissions and role boundaries
   - Workflows and approval states
   - Read models and snapshot services
   - Alerts, action queues, and manager tasks
   - UI surfaces and drill-through routes
   - Tests, reconciliation checks, and compliance gates
7. How it connects to existing modules: POS, sales, inventory, purchasing, payroll, payments, accounting, compliance, close assurance, evidence graph, owner war room, snapshots, or business signals.
8. Implementation priority: quick win, medium-depth platform work, or strategic moat.
9. Why this domain would make Kontava harder to replace.

Rank the domains by market impact, daily usefulness, implementation dependency, and moat value. End with a phased roadmap showing which foundational structures must be built first.
```

## Ranked Missing Or Underdeveloped Domains

### 1. Budgeting, Forecasting, And Scenario Planning

Status: Absent or only implied through cash and finance reports.

Why it matters:
SMB managers do not only need to know what happened. They need to know what will happen if collections slip, supplier payments are delayed, payroll rises, discounts increase, a branch underperforms, or a major purchase order is approved. This domain turns Kontava from a reporting tool into a planning cockpit.

Who benefits:
Owners, finance managers, accountants, operations leads, and branch managers.

BI unlocked:

- Budget versus actual by period, location, department, account, product category, or branch.
- Cash forecast under multiple scenarios.
- Expected runway after planned payables, payroll, tax, loan repayments, and inventory purchases.
- Sales forecast versus stock and working-capital needs.
- Scenario comparison: conservative, expected, aggressive, and stress case.
- Variance alerts that explain whether the cause is revenue, cost, stock, discounts, payroll, receivables, or payables.

Base structures needed:

- Prisma models: `Budget`, `BudgetVersion`, `BudgetLine`, `ForecastScenario`, `ForecastAssumption`, `ForecastSnapshot`, `VarianceExplanation`.
- Relationships to organization, fiscal period, location, account, item category, customer segment, supplier, payroll run, and purchase plan.
- Business events for budget approval, forecast version creation, scenario publication, and budget lock.
- Evidence links to approved budget files, board/owner approval records, forecast assumptions, and source actuals.
- Read models for budget actuals, cash forecast, runway, and variance drivers.
- Permissions for owner, finance manager, accountant, and branch manager visibility.
- Action queue links to collect receivables, delay supplier payment, reduce purchases, adjust pricing, or review payroll burden.
- Tests proving actuals reconcile to ledger/posting views and forecasts never mutate posted facts.

Priority:
Strategic moat.

Why it is hard to replace:
It makes Kontava the planning reference, not just the accounting record. Once managers depend on scenario decisions, switching cost rises sharply.

### 2. CRM Pipeline And Customer Growth Intelligence

Status: Partial. Customers and sales exist, but leads, opportunities, stages, and pipeline intelligence are not first-class.

Why it matters:
Receivables intelligence tells managers who owes money. CRM pipeline intelligence tells them where future money will come from. SMBs need a lightweight growth system that connects prospects, quotes, orders, collections, and customer profitability.

Who benefits:
Owners, sales leads, branch managers, finance managers, and operations leads.

BI unlocked:

- Pipeline value by stage, salesperson, branch, customer segment, and expected close date.
- Conversion rate from lead to quote to order to paid invoice.
- Forecasted revenue compared with inventory availability and cash needs.
- Customer acquisition quality: margin, payment behavior, repeat purchase rate, and support load.
- Stalled opportunity alerts and follow-up queues.

Base structures needed:

- Prisma models: `Lead`, `Opportunity`, `SalesStage`, `SalesActivity`, `Quote`, `QuoteLine`, `CustomerSegment`, `SalesFollowUp`.
- Relationships to customer, item, category, location, salesperson, sales order, payment, and source campaign.
- Business events for lead creation, opportunity stage movement, quote approval, quote acceptance, and quote-to-order conversion.
- Evidence for quotes, customer communications, approvals, and accepted terms.
- Role boundaries for sales users versus finance users, especially around margin visibility and credit exposure.
- Read models for pipeline value, conversion, sales forecast, and collection quality after conversion.
- Workflow links into customer profile, quote creation, sales order creation, credit review, and follow-up tasks.
- Tests for tenant isolation, quote version immutability after acceptance, and quote-to-order traceability.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It connects sales pipeline with cash discipline and inventory readiness, a combination generic CRM and POS tools usually do not provide.

### 3. Pricing, Promotion, And Discount Governance

Status: Partial. Items, taxes, sales, discounts, and margin signals exist, but pricing policy and promotion governance are not mature.

Why it matters:
Discount leakage silently destroys SMB margin. A system that explains which discounts are authorized, profitable, repeated, abused, or risky gives managers immediate value.

Who benefits:
Owners, finance managers, sales leads, branch managers, accountants, and cashier supervisors.

BI unlocked:

- Discount leakage by item, category, cashier, salesperson, branch, terminal, customer, and campaign.
- Margin floor violations.
- Unauthorized or repeated override patterns.
- Promotion ROI: sales uplift, margin loss, inventory movement, and collection quality.
- Price-change impact on revenue, margin, and stock turnover.

Base structures needed:

- Prisma models: `PriceBook`, `PriceBookLine`, `Promotion`, `PromotionRule`, `DiscountPolicy`, `DiscountApproval`, `PriceChangeEvent`, `MarginFloor`.
- Relationships to item, category, customer segment, location, POS session, sales order, fiscal period, and user.
- Business events for price change, promotion activation, discount override, promotion closure, and margin-floor exception.
- Evidence for price approval, promotion rationale, override reason, and manager approval.
- Segregation of duties for high-value price changes or margin-floor overrides.
- Read models for discount leakage, promotion performance, margin policy breach, and price-change impact.
- Workflow links to item pricing, POS session review, sales order review, promotion setup, and manager action queue.
- Tests proving discounts are recomputed server-side, not trusted from the client, and approved overrides are traceable.

Priority:
Quick win moving into medium-depth.

Why it is hard to replace:
It protects profit at the point where SMBs often leak value daily: uncontrolled discounts and weak price discipline.

### 4. Demand Planning And Replenishment Intelligence

Status: Partial. Inventory, suppliers, purchase orders, and item-supplier lead times exist, but demand planning and reorder intelligence are not first-class.

Why it matters:
Inventory dashboards show what is in stock. Demand planning tells managers what to buy, when to buy, how much cash it will consume, and which stockout or overstock risk is most urgent.

Who benefits:
Inventory managers, owners, branch managers, finance managers, procurement leads, and operations leads.

BI unlocked:

- Reorder recommendations by item, branch, supplier, and cash constraint.
- Days of cover and stockout probability.
- Supplier lead-time reliability.
- Demand forecast by sales velocity, seasonality, category, branch, and promotion.
- Cash-aware purchase recommendations.
- Lost sales estimate from stockouts.

Base structures needed:

- Prisma models: `ReorderPolicy`, `DemandForecast`, `ReplenishmentRecommendation`, `SupplierLeadTimeHistory`, `StockCoverSnapshot`, `LostSalesEstimate`.
- Relationships to item, location, supplier, item-supplier, purchase order, sales order, POS sale, and inventory level.
- Business events for reorder policy approval, recommendation generation, recommendation acceptance, and recommendation dismissal.
- Evidence for forecast inputs, stock snapshots, supplier lead-time data, and purchase approval.
- Read models for demand forecast, stock cover, reorder queue, and cash impact of replenishment.
- Workflow links to create purchase order, transfer stock, adjust reorder policy, review supplier reliability, and inspect item profitability.
- Tests proving recommendations are tenant-scoped, period-aware, and derived from immutable sales/inventory events.

Priority:
Strategic moat.

Why it is hard to replace:
It turns inventory management into a cash-aware operating system. Generic stock tools rarely connect reorder timing to liquidity and margin evidence.

### 5. Treasury, Banking, Debt, And Credit Facility Management

Status: Partial. Payment rails, provider accounts, settlement accounts, and cash reports exist, but loans, bank accounts, overdrafts, debt schedules, and credit facilities are not first-class.

Why it matters:
Many SMBs operate with bank overdrafts, loans, informal debt, supplier credit, delayed settlements, and mobile money float. A serious cash command center needs this domain to explain real liquidity pressure.

Who benefits:
Owners, finance managers, accountants, and auditors.

BI unlocked:

- Bank balance versus ledger cash and provider settlement balances.
- Loan repayment calendar and interest burden.
- Debt service coverage.
- Credit facility utilization and remaining headroom.
- Cash runway including debt repayments and interest.
- Bank fee leakage and provider settlement delays.

Base structures needed:

- Prisma models: `BankAccount`, `BankStatement`, `CreditFacility`, `LoanAgreement`, `LoanSchedule`, `DebtPayment`, `InterestAccrual`, `BankFee`.
- Relationships to organization, chart account, payment rail, settlement account, statement line, journal entry, supplier payment, payroll payment, and fiscal period.
- Business events for facility setup, drawdown, repayment, interest accrual, bank statement import, bank charge recognition, and facility closure.
- Evidence for bank statements, loan contracts, repayment proof, approval records, and statement-line matches.
- Maker-checker approval for drawdowns, repayments, bank account changes, and facility setup.
- Read models for treasury position, debt calendar, facility utilization, cash runway, and bank reconciliation status.
- Workflow links to reconcile bank statement, approve repayment, inspect loan schedule, and adjust cash forecast.
- Tests proving bank/debt movements post through the ledger and cannot bypass period locks or evidence requirements.

Priority:
Strategic moat.

Why it is hard to replace:
It makes Kontava the owner reference for survival cash, not merely sales cash.

### 6. Fixed Assets And Depreciation Intelligence

Status: Absent or mostly absent.

Why it matters:
OHADA-ready SMB accounting eventually needs a reliable asset register, depreciation, disposals, impairment, custody, and source evidence. This matters for restaurants, clinics, manufacturing, distribution, schools, and retail chains with equipment-heavy operations.

Who benefits:
Accountants, owners, finance managers, operations leads, and branch managers.

BI unlocked:

- Fixed asset value by class, location, custodian, and age.
- Monthly depreciation expense and book value.
- Assets due for maintenance, replacement, or disposal.
- Asset additions pending capitalization.
- Asset evidence completeness and accountant readiness.

Base structures needed:

- Prisma models: `FixedAsset`, `AssetClass`, `AssetAcquisition`, `DepreciationMethod`, `DepreciationRun`, `DepreciationLine`, `AssetDisposal`, `AssetTransfer`, `AssetCustodian`.
- Relationships to supplier invoice, purchase order, goods receipt, location, employee, journal entry, accounting period, and evidence item.
- Business events for asset acquisition, capitalization, transfer, depreciation run, impairment, disposal, and correction.
- Evidence for supplier invoice, proof of ownership, serial number, location assignment, and disposal authorization.
- Period locks and append-only depreciation runs.
- Read models for asset register health, depreciation forecast, asset utilization, and replacement risk.
- Workflow links to capitalize purchase, run depreciation, transfer asset, dispose asset, and export accountant schedule.
- Tests proving depreciation is deterministic, period-bound, ledger-posted, and reversible only through compliant correction events.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It makes Kontava more accountant-grade and expands the product into asset-heavy SMBs.

### 7. Delivery, Logistics, And Fulfillment Control

Status: Partial. There are delivery hints in POS receipts and expected delivery dates in purchasing, but no full shipment, route, proof-of-delivery, or fulfillment domain.

Why it matters:
Many SMBs sell across locations, deliver to customers, receive goods from suppliers, or move stock through field teams. Delivery failures affect cash collection, customer satisfaction, inventory accuracy, and refund risk.

Who benefits:
Operations leads, branch managers, sales leads, inventory managers, finance managers, and owners.

BI unlocked:

- Delivery success rate and failed delivery value.
- Orders shipped but not delivered.
- Delivery-to-cash lag.
- Route cost and route profitability.
- Driver/agent performance.
- Proof-of-delivery completeness.
- Returns caused by logistics failures.

Base structures needed:

- Prisma models: `DeliveryOrder`, `DeliveryLine`, `Shipment`, `Route`, `RouteStop`, `Driver`, `ProofOfDelivery`, `DeliveryException`, `DeliveryCost`.
- Relationships to sales order, customer, location, item, inventory transaction, payment, refund, fiscal document, and source evidence.
- Business events for delivery creation, dispatch, delivery confirmation, failed delivery, return to stock, delivery cost recognition, and correction.
- Evidence for proof of delivery, customer signature, geotag/photo where appropriate, delivery note, and exception reason.
- Permissions separating dispatcher, driver, branch manager, and finance approver.
- Read models for fulfillment status, delivery delay, delivery cost, delivery-to-cash, and failed delivery risk.
- Workflow links to dispatch order, confirm delivery, record failed delivery, create return, collect payment, and investigate exception.
- Tests proving inventory release/return and revenue/payment recognition remain traceable and period-aware.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It connects customer promise, stock movement, payment collection, and evidence. This is a strong advantage over simple POS tools.

### 8. Quality, Returns, Warranty, And After-Sales Service

Status: Partial. Refunds and stock write-offs exist, but quality incidents, warranty claims, repair/replacement workflows, and supplier chargebacks are not first-class.

Why it matters:
Returns, defects, warranty promises, and service quality can destroy margin and customer trust. A product that links after-sales issues to inventory, supplier, refund, replacement, and ledger evidence gives managers a serious control surface.

Who benefits:
Owners, operations leads, sales leads, inventory managers, finance managers, and accountants.

BI unlocked:

- Return rate by item, supplier, branch, cashier, customer segment, and batch.
- Warranty cost and exposure.
- Defect clusters by supplier or production batch.
- Refund reason patterns.
- Replacement stock impact.
- Supplier quality score and chargeback opportunities.

Base structures needed:

- Prisma models: `ReturnAuthorization`, `ReturnLine`, `QualityIncident`, `WarrantyClaim`, `ServiceCase`, `ReplacementOrder`, `SupplierChargeback`, `InspectionResult`.
- Relationships to sales order, POS sale, refund, item, serial number, production batch, supplier invoice, customer, inventory transaction, and fiscal document.
- Business events for return request, return approval, inspection, refund, replacement, warranty closure, supplier chargeback, and write-off.
- Evidence for customer claim, inspection result, photos/attachments, warranty terms, approval, and refund/payment evidence.
- Approval policy for high-value refunds, write-offs, replacements, and supplier chargebacks.
- Read models for quality loss, warranty exposure, defect clusters, and return reason intelligence.
- Workflow links to inspect return, approve refund, replace item, create supplier chargeback, write off damaged stock, and review item quality.
- Tests proving refund/return/stock/ledger effects are atomic and cannot mutate finalized sales without compensating events.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It turns after-sales from a cost leak into a controlled, evidence-backed operational discipline.

### 9. Production Planning, BOM, Yield, And Cost Variance

Status: Partial. Recipes, recipe ingredients, and production batches exist, but advanced production planning, BOM versioning, yield variance, and cost variance are not complete.

Why it matters:
For bakeries, restaurants, workshops, light manufacturing, and transformation businesses, profitability depends on input cost, yield, waste, batch discipline, and stock consumption accuracy.

Who benefits:
Owners, production leads, inventory managers, finance managers, accountants, and branch managers.

BI unlocked:

- Planned versus actual material consumption.
- Yield variance and waste rate.
- Batch profitability.
- Ingredient cost drift.
- Production bottlenecks.
- Finished goods cost accuracy.
- Production schedule versus sales demand.

Base structures needed:

- Prisma models: `BillOfMaterials`, `BOMVersion`, `WorkOrder`, `ProductionPlan`, `ProductionConsumption`, `ProductionOutput`, `YieldVariance`, `WasteReason`, `OverheadAllocation`.
- Relationships to recipe, item, inventory transaction, production batch, location, employee, journal entry, and sales demand forecast.
- Business events for BOM approval, work order release, material issue, production completion, waste recording, yield adjustment, and batch close.
- Evidence for approved BOM, batch sheet, count sheet, supervisor approval, and wastage reason.
- Period and stock controls for material issue and finished-goods receipt.
- Read models for production cost variance, yield health, waste, batch margin, and demand coverage.
- Workflow links to release work order, issue materials, complete batch, record waste, review cost variance, and update BOM version.
- Tests proving stock consumption, output valuation, and journal postings are atomic and rebuildable from events.

Priority:
Strategic moat for production-heavy SMB segments.

Why it is hard to replace:
It allows Kontava to serve SMBs that generic retail POS tools cannot handle well.

### 10. Contracts, Renewals, And Obligation Management

Status: Mostly absent except payroll contracts and scattered evidence references.

Why it matters:
SMBs have rent, supplier agreements, service contracts, loan contracts, customer contracts, licenses, insurance, and regulatory obligations. These drive future cash, compliance risk, and operational continuity.

Who benefits:
Owners, finance managers, accountants, operations leads, HR/payroll leads, and compliance managers.

BI unlocked:

- Upcoming renewals and obligation calendar.
- Contract-linked payment obligations.
- Unbudgeted commitments.
- Expiring licenses, leases, insurance, and supplier agreements.
- Contract evidence completeness.
- Obligation risk by amount, due date, and owner.

Base structures needed:

- Prisma models: `Contract`, `ContractParty`, `ContractObligation`, `ContractMilestone`, `ContractRenewal`, `ContractDocument`, `ContractApproval`.
- Relationships to customer, supplier, employee, bank/loan, lease/location, payment schedule, journal entry, and evidence item.
- Business events for contract creation, approval, amendment, renewal, termination, and obligation completion.
- Evidence hashes for signed contracts, amendments, approval notes, and renewal documents.
- Role controls for sensitive contracts, payroll contracts, bank/loan contracts, and supplier terms.
- Read models for obligation calendar, commitment exposure, renewal risk, and contract evidence status.
- Workflow links to approve contract, schedule obligation, initiate payment, renew contract, or mark obligation complete.
- Tests proving approved contracts are append-only and amendments create versioned evidence rather than overwriting terms.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It gives managers visibility into future obligations that usually live outside accounting software in paper, chat, or spreadsheets.

### 11. Task, Work Order, And Operational Accountability

Status: Partial. Business signals and action queues exist, but general task, SLA, work order, escalation, and accountability structures are not fully generalized.

Why it matters:
BI only becomes daily management when someone owns the action, the due date is visible, and the system shows whether the risk was resolved.

Who benefits:
Owners, operations leads, branch managers, finance managers, inventory managers, HR/payroll leads, and accountants.

BI unlocked:

- Open actions by owner, severity, module, branch, and due date.
- Recurring operational failures.
- SLA breaches and aging tasks.
- Action closure rate by team or branch.
- Risks without assigned owner.
- Impact of completed actions on cash, margin, close readiness, or compliance.

Base structures needed:

- Prisma models: `WorkItem`, `WorkItemAssignment`, `WorkItemComment`, `WorkItemEvidence`, `WorkItemSla`, `EscalationRule`, `WorkItemResolution`.
- Relationships to business signal, snapshot, close finding, payment exception, inventory exception, customer, supplier, employee, location, and evidence item.
- Business events for action creation, assignment, escalation, resolution, reopening, and waiver.
- Evidence for resolution proof, approval, comments, and source metric.
- Permissions for cross-module action visibility and sensitive payroll/finance redaction.
- Read models for manager action center, SLA health, unresolved risk, and team accountability.
- Workflow links from every BI signal into assignment, comment, resolve, escalate, or open source workflow.
- Tests proving tasks cannot expose redacted sensitive data and resolution does not overwrite underlying financial truth.

Priority:
Quick win with strategic upside.

Why it is hard to replace:
It closes the loop from insight to action. Managers keep using the system because it becomes the operating agenda.

### 12. Customer Loyalty, Retention, And Market Basket Intelligence

Status: Mostly absent. Customers and sales exist, but loyalty, cohorts, retention, and basket intelligence are not first-class.

Why it matters:
Retail and service SMBs need to know which customers come back, what they buy together, which offers are profitable, and which customers are likely to churn.

Who benefits:
Owners, sales leads, branch managers, finance managers, and marketing operators.

BI unlocked:

- Repeat purchase rate.
- Customer lifetime value.
- Churn risk and reactivation queue.
- Market basket combinations.
- Loyalty reward liability and redemption performance.
- Promotion performance by retention and margin, not just revenue.

Base structures needed:

- Prisma models: `LoyaltyAccount`, `LoyaltyTransaction`, `RewardRule`, `RewardRedemption`, `CustomerCohort`, `BasketInsight`, `CampaignAudience`.
- Relationships to customer, POS sale, sales order, payment, promotion, item, category, location, and fiscal period.
- Business events for enrollment, point accrual, redemption, reward expiry, campaign assignment, and opt-out.
- Evidence and consent records for customer communication and loyalty participation.
- Controls for reward liability, discount linkage, and abuse detection.
- Read models for retention, cohort revenue, basket affinity, loyalty liability, and campaign performance.
- Workflow links to customer profile, promotion setup, POS loyalty lookup, campaign queue, and margin review.
- Tests proving rewards are computed server-side, tenant-scoped, and cannot create unapproved discount leakage.

Priority:
Medium-depth platform work.

Why it is hard to replace:
It gives SMBs a growth engine tied to real sales, payments, inventory, and margin instead of a detached marketing add-on.

### 13. Supplier Performance And Procurement Intelligence

Status: Partial. Suppliers, purchase orders, goods receipts, invoices, payment terms, supplier bank controls, and AP exist, but supplier performance scoring is not a full BI domain.

Why it matters:
Supplier choices affect stockouts, margin, cash, payment risk, quality, and compliance. SMB managers need to know which suppliers are reliable, expensive, risky, or strategically critical.

Who benefits:
Owners, procurement leads, inventory managers, finance managers, and branch managers.

BI unlocked:

- Supplier reliability score.
- Late delivery rate.
- Price variance by item and supplier.
- Fill rate and partial delivery patterns.
- Quality/return impact by supplier.
- Supplier concentration risk.
- Payment pressure versus supplier criticality.

Base structures needed:

- Prisma models or read models: `SupplierPerformanceSnapshot`, `SupplierPriceHistory`, `SupplierReliabilityMetric`, `SupplierRiskRating`, `SupplierIssue`.
- Relationships to supplier, item supplier, purchase order, goods receipt, supplier invoice, supplier payment, quality incident, and inventory stockout.
- Business events for supplier risk update, supplier issue creation, preferred supplier change, and procurement policy override.
- Evidence for delivery notes, invoice comparisons, goods receipt exceptions, and supplier communications.
- Read models for supplier scorecard, price drift, lead-time reliability, and supplier dependency.
- Workflow links to purchase order review, supplier profile, supplier payment priority, reorder recommendation, and issue escalation.
- Tests proving supplier metrics are calculated from tenant-scoped purchasing and inventory evidence.

Priority:
Quick win moving into medium-depth.

Why it is hard to replace:
It gives SMBs procurement intelligence without needing a heavy ERP procurement suite.

### 14. Document Vault, Evidence Library, And Retention Control

Status: Partial. Evidence models and proof trails exist, but a broad document vault and retention management domain is not fully surfaced.

Why it matters:
OHADA-ready operations depend on supporting documents. A document vault tied to source events, retention rules, redaction, and accountant packs would make Kontava feel more serious and trustworthy.

Who benefits:
Accountants, owners, finance managers, auditors, compliance managers, and operations leads.

BI unlocked:

- Missing evidence by domain.
- Documents due for review, expiry, or renewal.
- Evidence completeness score.
- Retention coverage and archive health.
- Accountant handoff readiness by document class.

Base structures needed:

- Prisma models: `DocumentVaultItem`, `DocumentClass`, `RetentionPolicy`, `DocumentLink`, `DocumentReview`, `DocumentAccessLog`.
- Relationships to business event, fiscal document, journal entry, payment, supplier invoice, customer invoice, payroll run, asset, contract, and close evidence.
- Business events for document upload, hash capture, document classification, document review, redaction, expiry, and archive.
- Tamper-evident hashes, immutable source links, retention metadata, access logs, and redaction policies.
- Read models for evidence completeness, retention risk, missing document queues, and accountant handoff readiness.
- Workflow links to upload evidence, classify document, request missing evidence, review redaction, and export trust pack.
- Tests proving document evidence cannot be silently replaced after posting or finalization.

Priority:
Strategic moat foundation.

Why it is hard to replace:
It turns Kontava into the evidence memory of the business, not only its transaction system.

## Cross-Domain Base Architecture Required

Every new domain should enter through the same operating spine:

1. Typed business event.
2. Server-side validation.
3. Tenant and role authorization.
4. Fiscal period guard when economic truth is affected.
5. Source document or evidence link with hash.
6. Ledger posting where money, stock, tax, payroll, asset, debt, or liability changes.
7. Subsidiary ledger update where applicable.
8. Append-only audit trail.
9. Transactional outbox for side effects.
10. Snapshot/read model for BI.
11. Business signal and manager action.
12. Drill-through workflow to resolve the issue.

## Shared Prerequisites

### Data And Schema

- Add domain entities as tenant-scoped models with explicit organization, location, period, status, owner, and evidence references.
- Keep operational source records separate from derived BI snapshots.
- Add effective-dated configuration for policy-sensitive areas such as pricing, depreciation, credit terms, budget periods, promotion rules, and retention rules.
- Use Decimal or integer minor units for money. Do not introduce float-based financial values.

### Ledger And Business Events

- Every economic domain must define event names, idempotency keys, payload hashes, source documents, posting recipes, reversal/correction events, and audit requirements.
- New domains that affect money or stock must post through the accounting gateway and reconcile to ledger/control accounts.
- Derived dashboards must surface drift and blockers rather than hiding them.

### Evidence And Traceability

- Every manager-facing KPI should link to source records, evidence, and responsible workflow.
- Evidence states should include ledger-backed, operational-only, pending posting, reconciled, missing evidence, blocked, and stale.
- Source links must be bidirectional: source document to event/posting, and posting to source document.

### Permissions And Redaction

- Extend module control, RBAC, and redaction policies for new domains.
- Sensitive domains such as debt, payroll, contracts, discounts, asset values, and margin must have role-based visibility.
- Cross-module BI must degrade gracefully when the user lacks permission, showing redacted or partial evidence instead of leaking details.

### Read Models And Snapshots

- Add snapshot services per domain only after the operational source and evidence contract are clear.
- Recommended new snapshots:
  - `budget.forecast`
  - `customer.growth`
  - `pricing.margin-control`
  - `demand.replenishment`
  - `treasury.debt`
  - `asset.register`
  - `delivery.fulfillment`
  - `quality.after-sales`
  - `production.yield`
  - `contract.obligation`
  - `operations.accountability`
  - `loyalty.retention`
  - `supplier.performance`
  - `document.evidence-vault`

### UI And Workflow

- Each new domain should have a management workbench, not just a dashboard.
- BI cards must link directly to create, approve, investigate, reconcile, assign, resolve, or export actions.
- Use the established dashboard color semantics and evidence badges.
- Preserve localized route patterns and shared dashboard components where applicable.

### Testing And Verification

- Add contract tests for every snapshot formula.
- Add permission tests for redacted outputs.
- Add idempotency and replay tests for economic events.
- Add ledger-balance and subsidiary reconciliation tests where postings are involved.
- Add evidence-link coverage tests for source documents.
- Add period-lock tests for financial, stock, asset, payroll, treasury, and close-affecting events.

## Recommended Phased Roadmap

### Phase 1: Fast Market Differentiators

1. Task, Work Order, And Operational Accountability.
2. Supplier Performance And Procurement Intelligence.
3. Pricing, Promotion, And Discount Governance.
4. Document Vault, Evidence Library, And Retention Control.

Why first:
These domains amplify the existing manager action center, purchasing/AP, margin intelligence, proof trail, and close readiness without requiring the largest new accounting surface.

### Phase 2: Predictive Operating Intelligence

1. Budgeting, Forecasting, And Scenario Planning.
2. Demand Planning And Replenishment Intelligence.
3. CRM Pipeline And Customer Growth Intelligence.
4. Customer Loyalty, Retention, And Market Basket Intelligence.

Why second:
These turn Kontava from evidence-backed reporting into predictive and growth-oriented management.

### Phase 3: Strategic ERP-Grade Moats

1. Treasury, Banking, Debt, And Credit Facility Management.
2. Fixed Assets And Depreciation Intelligence.
3. Delivery, Logistics, And Fulfillment Control.
4. Quality, Returns, Warranty, And After-Sales Service.
5. Production Planning, BOM, Yield, And Cost Variance.
6. Contracts, Renewals, And Obligation Management.

Why third:
These deepen Kontava into a full SMB operating system and require stronger accounting, evidence, workflow, and implementation discipline.

## Final Recommendation

The best next extension is not to build every missing domain at once. The best move is to create a reusable domain-extension foundation:

- Domain registry.
- Business event templates.
- Evidence contract.
- Snapshot contract.
- Manager action contract.
- Permission/redaction profile.
- Drill-through route convention.
- Verification checklist.

Once that foundation exists, each missing domain can be added as a controlled module without weakening the ledger-first and OHADA-ready architecture.

The highest-value first build is:

1. Operational Accountability as the cross-domain action layer.
2. Pricing and Discount Governance as the margin-protection layer.
3. Supplier Performance as the procurement-control layer.
4. Document Vault as the evidence-retention layer.

Together, these make the existing BI suite more actionable, more trusted, and more difficult for generic SMB tools to match.
