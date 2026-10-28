# Kontava BI Adjacent Domain Gap Roadmap

Date: 2026-06-21

## Purpose

This report reviews the saved Kontava BI Proposal Report and the current AqStoqFlow/Kontava codebase to identify high-value business domains that are missing, weakly represented, or only implied today.

The goal is not to repeat the BI domains already covered well by the proposal, such as cash command, receivables, payables, inventory profitability, sales and margin, payment reconciliation, close readiness, OHADA ledger assurance, payroll, compliance, branch intelligence, and manager action center.

Instead, this report focuses on adjacent domains that would make Kontava more valuable, differentiated, enterprise-grade, and harder to replace for OHADA-region SMB operators.

## Codebase Anchors Reviewed

- `moat proposals/KONTAVA_BI_PROPOSAL_REPORT_2026-06-19.md`
- `prisma/schema.prisma`
- `services/modules/module-catalog.service.ts`
- `services/snapshots/snapshot-contracts.ts`
- `services/signals/business-signal-contracts.ts`
- `services/evidence/evidence-contracts.ts`
- `services/evidence/proof-trail.service.ts`

## Current Strengths Already Present

The current system already has strong coverage in:

- POS, cash drawer controls, sales orders, refunds, offline sync, and receipt evidence.
- Inventory levels, movements, counts, transfers, adjustments, valuation, and class 3 reconciliation.
- Suppliers, customers, purchase orders, goods receipts, supplier invoices, 3-way match, supplier payments, and partner ledgers.
- Payroll employees, contracts, attendance snapshots, payroll runs, payslips, declarations, and payment batches.
- Payments, provider accounts, statement files, statement lines, match records, suspense, reconciliation runs, and payment exceptions.
- Journals, journal entries, posting batches, source links, posting rules, fiscal documents, compliance submissions, compliance evidence, close runs, findings, evidence items, and close pack exports.
- Business events, business event outbox, proof trails, evidence grading, snapshots, business signals, action queues, module control, and owner war room composition.

That means the best next BI extensions should strengthen planning, growth, governance, obligations, accountability, and industry-specific operations instead of duplicating finance dashboards.

## Ranked Missing Or Underdeveloped Domains

### 1. Budgeting, Forecasting, And Scenario Planning

Current coverage status: Mostly absent. There are finance permissions and analytics hints, but no durable budget, forecast, scenario, or variance domain.

Why it matters:
SMB managers need to know what is likely to happen next, not only what already happened. Budgeting and forecasting turn Kontava from a reporting system into a planning cockpit for cash, payroll, supplier payments, purchases, margins, and branch performance.

Benefiting roles:
Owner, finance manager, accountant, branch manager, operations lead.

BI unlocked:

- Budget versus actual by period, account, location, branch, item category, and department.
- Cash runway scenarios based on collections, payables, payroll, tax, debt, and purchase plans.
- Variance explanations by revenue, discount, payroll, purchasing, inventory, receivables, and payables.
- Forecast confidence score and stale-assumption alerts.
- Stress scenarios for slow collections, supplier price increases, payroll growth, and branch underperformance.

Base structures required:

- Prisma models: `Budget`, `BudgetVersion`, `BudgetLine`, `ForecastScenario`, `ForecastAssumption`, `ForecastSnapshot`, `VarianceExplanation`.
- Relationships to organization, fiscal period, accounting period, chart account, location, category, supplier, customer segment, payroll run, and purchase plan.
- Business events for budget creation, budget approval, forecast publication, scenario lock, and revision.
- Evidence for assumptions, approval notes, uploaded planning documents, and ledger actuals.
- Permissions for owner, finance manager, accountant, and branch manager views.
- Read models for budget actuals, forecast runway, variance drivers, and scenario comparison.
- Alerts for budget breach, cash runway risk, stale assumptions, and unapproved forecast changes.
- UI surfaces for budget workbench, scenario planner, variance review, and owner forecast summary.
- Tests proving actuals reconcile to ledger/posting views and forecasts do not mutate posted truth.

Connections:
Accounting periods, cash command, AR/AP, payroll, purchasing, inventory, close readiness, owner war room, snapshots, and business signals.

Priority:
Strategic moat.

Why it makes Kontava harder to replace:
It makes Kontava the planning reference for the business, not only the operational record.

### 2. Pricing, Promotion, And Discount Governance

Current coverage status: Partial. Item pricing exists, and sales/margin BI is proposed, but there is no mature price-book, promotion, margin-floor, or discount-approval domain.

Why it matters:
Discount leakage is one of the fastest ways SMBs lose profit without noticing. This domain gives managers control over pricing behavior at POS, sales order, branch, cashier, salesperson, and promotion level.

Benefiting roles:
Owner, finance manager, branch manager, sales lead, accountant, operations lead.

BI unlocked:

- Discount leakage by item, category, cashier, salesperson, branch, terminal, customer, and promotion.
- Margin-floor violation alerts.
- Promotion ROI by revenue uplift, gross margin, stock movement, and collection quality.
- Unauthorized override patterns.
- Price-change impact on revenue, stock turnover, and profit.

Base structures required:

- Prisma models: `PriceBook`, `PriceBookLine`, `Promotion`, `PromotionRule`, `DiscountPolicy`, `DiscountApproval`, `PriceChangeEvent`, `MarginFloor`.
- Relationships to item, category, customer segment, location, POS session, sales order, user, and accounting period.
- Business events for price change, promotion activation, discount override, promotion closure, and margin-floor exception.
- Evidence for approval note, promotion rationale, override reason, manager approval, and source sale.
- Maker-checker for sensitive price changes, high-value overrides, and margin-floor breaches.
- Read models for discount leakage, margin policy breach, promotion ROI, and price-change impact.
- Action queues for review margin drop, approve discount, revoke promotion, inspect cashier pattern, or adjust price book.
- UI surfaces for pricing governance workbench, promotion dashboard, margin exceptions, and POS override review.
- Tests proving server-side discount recomputation and traceability from sale to approval.

Connections:
POS, sales orders, item pricing, inventory cost, sales/margin intelligence, evidence graph, action center.

Priority:
Quick win to medium-depth.

Why it makes Kontava harder to replace:
It protects daily profit at the exact point where many SMB tools simply record the loss.

### 3. Demand Planning And Replenishment Intelligence

Current coverage status: Partial. Inventory, suppliers, purchase orders, and lead-time fields exist, but demand planning and reorder intelligence are not first-class.

Why it matters:
SMBs need to know what to buy, when to buy it, how much cash it will consume, and which stockout or overstock risk matters most.

Benefiting roles:
Owner, inventory manager, branch manager, finance manager, operations lead.

BI unlocked:

- Reorder recommendations by item, branch, supplier, and cash constraint.
- Days of cover and stockout probability.
- Supplier lead-time reliability.
- Lost-sales estimate from stockouts.
- Cash-aware purchase recommendation.
- Demand forecast by seasonality, branch, category, and promotion.

Base structures required:

- Prisma models: `ReorderPolicy`, `DemandForecast`, `ReplenishmentRecommendation`, `SupplierLeadTimeHistory`, `StockCoverSnapshot`, `LostSalesEstimate`.
- Relationships to item, location, supplier, item-supplier, purchase order, sales order, POS sales, inventory level, and cash forecast.
- Business events for reorder policy approval, recommendation generation, acceptance, rejection, and purchase conversion.
- Evidence for stock snapshot, demand calculation, sales history, supplier lead-time proof, and manager decision.
- Permissions for inventory manager, branch manager, finance manager, and owner.
- Read models for demand forecast, stock cover, reorder queue, cash impact, and supplier reliability.
- Alerts for stockout risk, dead stock, cash-constrained reorder, late supplier, and forecast drift.
- UI surfaces for replenishment cockpit, reorder queue, supplier lead-time view, and demand forecast.
- Tests proving recommendations are tenant-scoped and derived from immutable sales/inventory evidence.

Connections:
Inventory, purchasing, supplier performance, cash command, sales/margin intelligence, branch intelligence.

Priority:
Strategic moat.

Why it makes Kontava harder to replace:
It turns inventory from stock tracking into cash-aware operating intelligence.

### 4. Supplier Performance And Procurement Intelligence

Current coverage status: Partial. Supplier/AP workflows exist, but supplier reliability, price variance, and procurement risk scoring are not first-class.

Why it matters:
Supplier quality affects stockouts, margin, cash pressure, delivery reliability, and customer service. SMBs need a procurement memory, not only supplier balances.

Benefiting roles:
Owner, inventory manager, finance manager, operations lead, branch manager.

BI unlocked:

- Supplier reliability score.
- Late delivery rate and lead-time drift.
- Purchase price variance by supplier and item.
- Fill rate and partial delivery patterns.
- Supplier concentration risk.
- Supplier quality/return impact.
- Payment pressure versus supplier criticality.

Base structures required:

- Prisma models/read models: `SupplierPerformanceSnapshot`, `SupplierPriceHistory`, `SupplierReliabilityMetric`, `SupplierRiskRating`, `SupplierIssue`.
- Relationships to supplier, item supplier, purchase order, goods receipt, supplier invoice, supplier payment, quality incident, inventory stockout, and branch.
- Business events for supplier issue creation, supplier risk update, preferred supplier change, procurement policy override, and issue resolution.
- Evidence for delivery note, goods receipt variance, invoice comparison, supplier communication, and quality issue.
- Permissions for procurement, inventory, finance, owner, and branch roles.
- Read models for supplier scorecard, price drift, delivery reliability, supplier dependency, and payment priority.
- Alerts for late deliveries, price increases, supplier concentration, unresolved supplier issue, and supplier-payment risk.
- UI surfaces for supplier scorecard, procurement intelligence, supplier issue queue, and purchase recommendation drill-through.
- Tests proving supplier metrics derive from tenant-scoped purchasing, inventory, AP, and evidence records.

Connections:
Purchasing, AP, inventory, payables, demand planning, quality/returns, business signals.

Priority:
Quick win to medium-depth.

Why it makes Kontava harder to replace:
It gives SMBs procurement intelligence without requiring a heavy ERP procurement module.

### 5. CRM Pipeline And Customer Growth Intelligence

Current coverage status: Partial. Customers and sales orders exist, but leads, opportunities, stages, quotes, and pipeline intelligence are absent.

Why it matters:
Receivables intelligence explains who owes money. CRM pipeline intelligence explains where future money will come from and whether the business has enough demand to hit cash and inventory plans.

Benefiting roles:
Owner, sales lead, branch manager, finance manager, operations lead.

BI unlocked:

- Pipeline value by stage, salesperson, branch, customer segment, and expected close date.
- Conversion rate from lead to quote to order to paid invoice.
- Stalled opportunity alerts.
- Customer acquisition quality by margin, payment behavior, repeat purchase, and support burden.
- Forecasted revenue compared with available stock and cash needs.

Base structures required:

- Prisma models: `Lead`, `Opportunity`, `SalesStage`, `SalesActivity`, `Quote`, `QuoteLine`, `CustomerSegment`, `SalesFollowUp`.
- Relationships to customer, item, category, location, user/salesperson, sales order, payment, promotion, and campaign/source.
- Business events for lead creation, opportunity stage movement, quote approval, quote acceptance, quote expiry, and quote-to-order conversion.
- Evidence for quote versions, accepted terms, customer communication, approval notes, and credit review.
- Permissions separating sales pipeline data from finance/margin-sensitive data.
- Read models for pipeline value, conversion, forecast revenue, quote aging, and collection quality after conversion.
- Alerts for stalled deals, expiring quotes, margin-risk quotes, and credit-risk customers.
- UI surfaces for pipeline board, quote workbench, follow-up queue, and customer growth profile.
- Tests for quote version immutability after acceptance and traceability from quote to order to payment.

Connections:
Customers, sales orders, POS, inventory availability, receivables, pricing governance, cash forecast.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It links growth pipeline to stock, margin, cash, and payment truth, which generic CRMs rarely do for SMBs.

### 6. Task, Work Order, And Operational Accountability

Current coverage status: Partial. Business signals and action queues exist, but persistent work ownership, SLA, escalation, comments, and resolution evidence are not fully generalized.

Why it matters:
BI becomes operational only when actions have owners, due dates, escalation, and proof of resolution.

Benefiting roles:
Owner, finance manager, accountant, inventory manager, branch manager, HR/payroll lead, operations lead.

BI unlocked:

- Open actions by owner, branch, severity, module, and due date.
- SLA breaches and unresolved risk.
- Recurring operational failures.
- Action closure rate by team or branch.
- Risks without assigned owners.
- Impact of resolved actions on cash, margin, close readiness, or compliance.

Base structures required:

- Prisma models: `WorkItem`, `WorkItemAssignment`, `WorkItemComment`, `WorkItemEvidence`, `WorkItemSla`, `EscalationRule`, `WorkItemResolution`.
- Relationships to business signal, snapshot, close finding, payment exception, inventory exception, customer, supplier, employee, location, and evidence item.
- Business events for action creation, assignment, escalation, resolution, dismissal, reopening, and waiver.
- Evidence for resolution proof, approval, comments, source metric, and source workflow.
- Redaction-aware permissions for payroll, finance, margin, and sensitive payment issues.
- Read models for manager action center, SLA health, team accountability, and unresolved risk.
- Alerts for overdue work item, unassigned critical signal, repeated failure, or rejected resolution.
- UI surfaces for operational workbench, manager queue, assignment drawer, and source-linked resolution panel.
- Tests proving tasks do not leak redacted data and resolution does not overwrite underlying financial truth.

Connections:
Business signals, manager action center, proof trail, owner war room, close findings, payment exceptions, inventory exceptions.

Priority:
Quick win.

Why it makes Kontava harder to replace:
It closes the loop from insight to accountability, making Kontava the daily operating agenda.

### 7. Document Vault, Evidence Library, And Retention Control

Current coverage status: Partial. Evidence/proof trails exist, but a broad document vault and retention-control domain is not fully surfaced.

Why it matters:
OHADA-ready operations depend on supporting documents. A document vault turns scattered proof into a searchable business memory with retention, redaction, and accountant handoff value.

Benefiting roles:
Owner, finance manager, accountant, operations lead, compliance lead.

BI unlocked:

- Missing evidence by domain.
- Evidence completeness score.
- Documents due for review, expiry, or renewal.
- Retention coverage and archive health.
- Accountant handoff readiness by document class.

Base structures required:

- Prisma models: `DocumentVaultItem`, `DocumentClass`, `RetentionPolicy`, `DocumentLink`, `DocumentReview`, `DocumentAccessLog`.
- Relationships to business event, fiscal document, journal entry, payment, supplier invoice, customer invoice, payroll run, asset, contract, close evidence, and compliance evidence.
- Business events for document upload, classification, hash capture, document review, redaction, expiry, archive, and replacement request.
- Evidence hashes, immutable source links, access logs, retention metadata, and redaction policies.
- Permissions by document class and subject type.
- Read models for evidence completeness, retention risk, missing document queues, and accountant handoff readiness.
- Alerts for missing document, expiring document, unauthorized access, stale review, or retention risk.
- UI surfaces for evidence vault, missing evidence queue, document timeline, and close-pack integration.
- Tests proving documents cannot be silently replaced after posting or finalization.

Connections:
Proof trail, close assurance, compliance, journals, payments, payroll, purchasing, contracts, fixed assets.

Priority:
Strategic foundation.

Why it makes Kontava harder to replace:
It makes Kontava the evidence memory of the business, not just its transaction system.

### 8. Treasury, Banking, Debt, And Credit Facility Management

Current coverage status: Partial. Payment rails, provider accounts, settlement accounts, and reconciliation exist, but loans, overdrafts, credit facilities, and debt schedules are absent.

Why it matters:
SMB liquidity often depends on debt, overdrafts, bank fees, mobile money settlement timing, and repayment obligations. A true cash command center needs this domain.

Benefiting roles:
Owner, finance manager, accountant.

BI unlocked:

- Bank balance versus ledger cash and provider settlement balances.
- Loan repayment calendar and interest burden.
- Debt service coverage.
- Credit facility utilization and remaining headroom.
- Runway after debt repayments and bank fees.
- Bank fee leakage and provider settlement delays.

Base structures required:

- Prisma models: `BankAccount`, `BankStatement`, `CreditFacility`, `LoanAgreement`, `LoanSchedule`, `DebtPayment`, `InterestAccrual`, `BankFee`.
- Relationships to organization, chart account, payment rail, settlement account, statement line, journal entry, supplier payment, payroll payment, and accounting period.
- Business events for facility setup, drawdown, repayment, interest accrual, bank statement import, bank charge recognition, and facility closure.
- Evidence for bank statements, loan contracts, repayment proof, statement-line matches, and approval records.
- Maker-checker for bank account changes, debt drawdowns, repayments, and facility setup.
- Read models for treasury position, debt calendar, facility utilization, cash runway, and bank reconciliation status.
- Alerts for repayment due, overdraft risk, facility limit breach, bank fee spike, and unreconciled bank statement.
- UI surfaces for treasury workbench, debt calendar, facility dashboard, bank reconciliation drill-through.
- Tests proving bank/debt movements post through ledger and obey period locks.

Connections:
Cash command, payment reconciliation, accounting, close readiness, document vault, owner war room.

Priority:
Strategic moat.

Why it makes Kontava harder to replace:
It gives owners survival-cash intelligence that ordinary POS/accounting systems often miss.

### 9. Fixed Assets And Depreciation Intelligence

Current coverage status: Mostly absent.

Why it matters:
Asset-heavy SMBs need reliable asset registers, depreciation, disposals, custody, location, and evidence for accountant-ready books.

Benefiting roles:
Owner, finance manager, accountant, operations lead, branch manager.

BI unlocked:

- Fixed asset value by class, location, custodian, and age.
- Monthly depreciation expense and net book value.
- Asset additions pending capitalization.
- Maintenance, replacement, and disposal readiness.
- Asset evidence completeness.

Base structures required:

- Prisma models: `FixedAsset`, `AssetClass`, `AssetAcquisition`, `DepreciationMethod`, `DepreciationRun`, `DepreciationLine`, `AssetDisposal`, `AssetTransfer`, `AssetCustodian`.
- Relationships to supplier invoice, purchase order, goods receipt, location, employee, journal entry, accounting period, and document evidence.
- Business events for acquisition, capitalization, transfer, depreciation run, impairment, disposal, and correction.
- Evidence for supplier invoice, proof of ownership, serial number, assignment, and disposal approval.
- Period locks and append-only depreciation runs.
- Read models for asset register health, depreciation forecast, asset utilization, and replacement risk.
- Alerts for uncapitalized purchase, missing asset evidence, depreciation run due, and disposal approval pending.
- UI surfaces for asset register, depreciation run, asset transfer, and disposal workflow.
- Tests proving depreciation is deterministic, period-bound, ledger-posted, and corrected only through compensating events.

Connections:
Purchasing, accounting, close assurance, document vault, branch/location intelligence.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It pushes Kontava toward accountant-grade ERP for asset-heavy SMBs.

### 10. Production Planning, BOM, Yield, And Cost Variance

Current coverage status: Partial. Recipes, recipe ingredients, and production batches exist; BOM versioning, work orders, yield variance, and production planning are weak.

Why it matters:
Bakeries, food processors, workshops, restaurants, and light manufacturers need production profitability, input control, yield discipline, and waste visibility.

Benefiting roles:
Owner, inventory manager, finance manager, operations lead, branch manager, accountant.

BI unlocked:

- Planned versus actual material consumption.
- Yield variance and waste rate.
- Batch profitability.
- Ingredient cost drift.
- Finished goods cost accuracy.
- Production schedule versus demand.

Base structures required:

- Prisma models: `BillOfMaterials`, `BOMVersion`, `WorkOrder`, `ProductionPlan`, `ProductionConsumption`, `ProductionOutput`, `YieldVariance`, `WasteReason`, `OverheadAllocation`.
- Relationships to recipe, item, inventory transaction, production batch, location, employee, journal entry, and sales demand forecast.
- Business events for BOM approval, work order release, material issue, production completion, waste recording, yield adjustment, and batch close.
- Evidence for approved BOM, batch sheet, count sheet, supervisor approval, and wastage reason.
- Stock and period controls for raw material issue and finished goods receipt.
- Read models for production cost variance, yield health, waste, batch margin, and demand coverage.
- Alerts for yield loss, material overconsumption, batch margin drop, missing production evidence, and BOM drift.
- UI surfaces for production planner, BOM versioning, work order board, batch cost variance, and waste review.
- Tests proving stock consumption, output valuation, and postings are atomic and rebuildable from events.

Connections:
Inventory, purchasing, sales/margin, demand planning, accounting, close readiness.

Priority:
Strategic moat for production-heavy SMBs.

Why it makes Kontava harder to replace:
It lets Kontava serve SMB sectors that generic retail POS tools cannot handle well.

### 11. Delivery, Logistics, And Fulfillment Control

Current coverage status: Partial. Sales and purchasing have delivery hints, but no full shipment, route, driver, proof-of-delivery, or fulfillment intelligence domain.

Why it matters:
Delivery failures affect cash collection, customer satisfaction, stock accuracy, returns, and refund risk.

Benefiting roles:
Owner, operations lead, branch manager, inventory manager, finance manager, sales lead.

BI unlocked:

- Delivery success rate and failed delivery value.
- Orders shipped but not delivered.
- Delivery-to-cash lag.
- Route cost and route profitability.
- Driver or agent performance.
- Proof-of-delivery completeness.

Base structures required:

- Prisma models: `DeliveryOrder`, `DeliveryLine`, `Shipment`, `Route`, `RouteStop`, `Driver`, `ProofOfDelivery`, `DeliveryException`, `DeliveryCost`.
- Relationships to sales order, customer, location, item, inventory transaction, payment, refund, fiscal document, and source evidence.
- Business events for delivery creation, dispatch, delivery confirmation, failed delivery, return to stock, delivery cost recognition, and correction.
- Evidence for customer signature, delivery note, photo/geotag if used, exception reason, and delivery cost.
- Permissions for dispatcher, driver, branch manager, finance, and owner.
- Read models for fulfillment status, delivery delay, delivery cost, delivery-to-cash, and failed delivery risk.
- Alerts for failed delivery, overdue shipment, missing proof, route loss, and delivery-cash mismatch.
- UI surfaces for dispatch board, route view, proof-of-delivery panel, delivery exception queue.
- Tests proving inventory release/return and revenue/payment recognition remain traceable and period-aware.

Connections:
Sales orders, POS, inventory, payments, refunds, customer service, branch operations.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It connects customer promises, stock movement, cash collection, and evidence.

### 12. Quality, Returns, Warranty, And After-Sales Service

Current coverage status: Partial. Refunds and stock adjustments exist, but quality incidents, warranty claims, inspections, replacements, and supplier chargebacks are absent.

Why it matters:
Returns, defects, warranties, and service failures can destroy margin and trust. Managers need to see the root cause, not only the refund.

Benefiting roles:
Owner, operations lead, sales lead, inventory manager, finance manager, accountant.

BI unlocked:

- Return rate by item, supplier, branch, cashier, customer segment, and production batch.
- Warranty exposure and warranty cost.
- Defect clusters.
- Refund reason patterns.
- Replacement stock impact.
- Supplier chargeback opportunities.

Base structures required:

- Prisma models: `ReturnAuthorization`, `ReturnLine`, `QualityIncident`, `WarrantyClaim`, `ServiceCase`, `ReplacementOrder`, `SupplierChargeback`, `InspectionResult`.
- Relationships to sales order, POS sale, refund, item, serial number, production batch, supplier invoice, customer, inventory transaction, and fiscal document.
- Business events for return request, return approval, inspection, refund, replacement, warranty closure, supplier chargeback, and write-off.
- Evidence for customer claim, inspection result, photos/attachments, warranty terms, approval, and refund/payment evidence.
- Approval policy for high-value refunds, write-offs, replacements, and supplier chargebacks.
- Read models for quality loss, warranty exposure, defect clusters, and return reason intelligence.
- Alerts for high-return item, repeated defect, warranty-cost spike, supplier-quality issue, and missing inspection.
- UI surfaces for returns workbench, quality incident board, warranty claim view, supplier chargeback workflow.
- Tests proving refund/return/stock/ledger effects are atomic and finalized sales are corrected through compliant compensating events.

Connections:
POS, sales, refunds, inventory, suppliers, production, sales/margin intelligence.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It turns after-sales from an uncontrolled cost leak into evidence-backed operational discipline.

### 13. Contracts, Renewals, And Obligation Management

Current coverage status: Mostly absent except payroll contracts.

Why it matters:
SMBs have rent, supplier agreements, service contracts, customer contracts, insurance, licenses, loans, and regulatory obligations. These drive future cash and risk.

Benefiting roles:
Owner, finance manager, accountant, HR/payroll lead, operations lead.

BI unlocked:

- Obligation calendar.
- Upcoming renewals.
- Contract-linked payment exposure.
- Unbudgeted commitments.
- Expiring licenses, leases, insurance, and agreements.
- Contract evidence completeness.

Base structures required:

- Prisma models: `Contract`, `ContractParty`, `ContractObligation`, `ContractMilestone`, `ContractRenewal`, `ContractDocument`, `ContractApproval`.
- Relationships to customer, supplier, employee, bank/loan, lease/location, payment schedule, journal entry, and evidence item.
- Business events for contract creation, approval, amendment, renewal, termination, and obligation completion.
- Evidence hashes for signed contracts, amendments, approval notes, and renewal documents.
- Role controls for sensitive contracts, payroll contracts, bank/loan contracts, and supplier terms.
- Read models for obligation calendar, commitment exposure, renewal risk, and contract evidence status.
- Alerts for renewal due, obligation overdue, missing contract evidence, unapproved amendment, and commitment breach.
- UI surfaces for contract register, obligation calendar, renewal queue, and contract proof view.
- Tests proving approved contracts are append-only and amendments create versioned evidence.

Connections:
Treasury, suppliers, customers, payroll, compliance, close readiness, document vault.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It captures future obligations that usually live outside SMB accounting systems.

### 14. Customer Loyalty, Retention, And Market Basket Intelligence

Current coverage status: Mostly absent. Customers and sales exist, but loyalty, cohorts, retention, and basket intelligence are not first-class.

Why it matters:
Retail and service SMBs need repeat-customer growth, profitable promotions, and customer behavior intelligence.

Benefiting roles:
Owner, sales lead, branch manager, finance manager.

BI unlocked:

- Repeat purchase rate.
- Customer lifetime value.
- Churn risk and reactivation queue.
- Market basket combinations.
- Loyalty reward liability.
- Promotion performance by retention and margin.

Base structures required:

- Prisma models: `LoyaltyAccount`, `LoyaltyTransaction`, `RewardRule`, `RewardRedemption`, `CustomerCohort`, `BasketInsight`, `CampaignAudience`.
- Relationships to customer, POS sale, sales order, payment, promotion, item, category, location, and fiscal period.
- Business events for loyalty enrollment, point accrual, redemption, expiry, campaign assignment, and opt-out.
- Evidence and consent records for customer communication and loyalty participation.
- Controls for reward liability, discount linkage, and abuse detection.
- Read models for retention, cohort revenue, basket affinity, loyalty liability, and campaign performance.
- Alerts for churn risk, high-value customer drop-off, reward liability spike, campaign underperformance, and loyalty abuse.
- UI surfaces for customer retention dashboard, loyalty account view, campaign queue, basket insight panel.
- Tests proving rewards are server-computed, tenant-scoped, and cannot create unapproved discount leakage.

Connections:
POS, customers, promotions, sales/margin intelligence, inventory, cash collections.

Priority:
Medium-depth.

Why it makes Kontava harder to replace:
It turns transactional sales into customer growth intelligence.

## Shared Foundation Required Across All Domains

Every new domain should use the same Kontava operating spine:

1. Tenant-scoped Prisma models.
2. Typed business events with idempotency keys and payload hashes.
3. Server-side validation and recomputation of money, stock, discounts, payroll, and tax-sensitive values.
4. Source-document evidence with immutable hashes where the event affects financial or statutory truth.
5. Ledger posting through the accounting gateway when money, stock, tax, payroll, assets, debt, or liabilities move.
6. Period guards for financial and stock-affecting events.
7. Append-only audit trail.
8. Transactional outbox for notifications, exports, and side effects.
9. Proof trail subject support for important evidence chains.
10. Snapshot/read model for BI consumption.
11. Business signal generation.
12. Manager action/work item with owner, due date, severity, and route.
13. Role-based permissions and redaction for sensitive data.
14. Drill-through route into the source workflow.
15. Contract tests proving tenant isolation, ledger consistency, evidence coverage, permissions, and period-lock behavior.

## Phased Roadmap

### Phase 1: Foundation And Fast Wins

1. Task, Work Order, And Operational Accountability.
2. Document Vault, Evidence Library, And Retention Control.
3. Pricing, Promotion, And Discount Governance.
4. Supplier Performance And Procurement Intelligence.

Why first:
These domains make the current BI suite more actionable, more trusted, and more manager-ready without requiring the largest new statutory accounting surface.

### Phase 2: Predictive Operating Intelligence

1. Budgeting, Forecasting, And Scenario Planning.
2. Demand Planning And Replenishment Intelligence.
3. CRM Pipeline And Customer Growth Intelligence.
4. Customer Loyalty, Retention, And Market Basket Intelligence.

Why second:
These move Kontava from historical reporting to forward-looking decision support.

### Phase 3: ERP-Grade Strategic Moat

1. Treasury, Banking, Debt, And Credit Facility Management.
2. Fixed Assets And Depreciation Intelligence.
3. Production Planning, BOM, Yield, And Cost Variance.
4. Delivery, Logistics, And Fulfillment Control.
5. Quality, Returns, Warranty, And After-Sales Service.
6. Contracts, Renewals, And Obligation Management.

Why third:
These deepen Kontava into a full OHADA SMB operating system and require stronger accounting, evidence, workflow, and verification discipline.

## Recommended First Build

The best first build is:

1. Document Vault.
2. Persistent Work Items.
3. Pricing And Discount Governance.

This combination creates the safest foundation for the rest of the roadmap:

- Document Vault gives every future domain evidence and retention discipline.
- Persistent Work Items turn BI into accountable management.
- Pricing And Discount Governance protects margin immediately.

Together, they make the current Kontava BI suite more actionable, more trusted, and much harder for generic SMB tools to match.
