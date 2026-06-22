# Kontava BI Proposal Report

Date: 2026-06-19

## Executive Thesis

Kontava should not present business intelligence as a collection of generic charts. The stronger product position is a ledger-backed SMB business control tower: a daily operating reference where owners, finance managers, inventory managers, accountants, and operations leads can see what is true, what is at risk, what evidence supports each number, and what action should happen next.

The system already has the foundations for this: finance dashboards, payment reconciliation, POS cash drawer controls, customer and supplier ledgers, inventory valuation and reconciliation, payroll runs and declarations, fiscal documents, compliance evidence, accounting control center, close assurance, and accountant trust packs. The BI moat is to connect those primitives into manager-ready decisions.

## Product Positioning

Kontava can become the go-to reference for OHADA-region SMBs by becoming the place managers use to answer:

- Do we have enough cash to operate this week?
- Who owes us money, and what should we collect first?
- Which suppliers must be paid, and which payments are risky?
- Which stock is making money, trapping cash, or causing losses?
- Where are sales growing while margins, discounts, refunds, or stock costs are leaking value?
- Which branches, drawers, employees, and workflows need review?
- Are our ledger, fiscal documents, payments, stock, payroll, and close evidence ready for the accountant?
- What is the overall health of the business across liquidity, profitability, stock discipline, receivables, payables, compliance, and close readiness?
- What should a manager do next?

The differentiator is not visual polish alone. It is actionability plus evidence: every KPI should drill into source documents, business events, ledger entries, reconciliations, fiscal documents, stock movements, payroll runs, or close findings.

## Existing System Foundations To Exploit

- Finance dashboard data: cash position, receivables, payables, working capital, tax collected, drawer variance, payment methods, trends, recent payments, finance confidence.
- Payment reconciliation: provider accounts, provider events, statement lines, reconciliation runs, suspense items, exceptions, close blockers, certification status.
- POS and cash drawer controls: expected balance, current balance, live variance, session variance, cash in/out, refunds, drawer/session alerts, cashier/session history.
- Customer intelligence: customer balances, credit limits, payment terms, sales totals, open/unpaid orders, ledger entries, top customers by sales and balance.
- Supplier intelligence: supplier balances, payment terms, purchase orders, preferred item counts, open purchase orders, supplier ledger entries, top suppliers by spend and balance.
- Purchasing and AP: purchase order lifecycle, goods receipts, supplier invoices, 3-way match, supplier bank controls, supplier payments and allocations.
- Inventory valuation: stock events, cost, quantity, value, physical counts, stock adjustments, class 3 ledger reconciliation, projection rebuilds, movement evidence.
- Payroll and workforce controls: payroll periods, attendance snapshots, payroll runs, payslips, declarations, payment batches, country-pack resolution, payment exceptions.
- Accounting and close assurance: readiness scores, checklist items, findings, evidence graph, accountant reviews, data-trust blockers, trust-pack export.
- Compliance center: fiscal document status, authority submissions, adapter configuration, country-pack versions, authority references, rejection evidence.

## Canonical Kontava BI Suite

These surfaces should become the named BI suite inside the product. They are not separate decorative dashboards; they are connected manager command surfaces with shared evidence, ledger status, workflow links, and action queues.

### Cash Command Intelligence

Daily cash position, cash-in/cash-out, cash drawer variance, bank and payment reconciliation, working capital, burn rate, runway, expected collections, and upcoming supplier payments.

This should be the owner and finance manager's first daily reference because it connects liquidity, receivables, payables, payroll, tax obligations, drawer control, and payment reconciliation in one cash-aware surface.

### Receivables Risk Intelligence

Aging by customer, overdue exposure, collection probability, customer payment behavior, invoices at risk, collector action queues, and promised payment tracking.

This turns AR from a static ledger list into a prioritized collection discipline where every overdue balance links to a customer, invoice, statement, reminder, promise, payment record, or credit review.

### Payables Control Intelligence

Supplier balances, overdue payables, upcoming obligations, payment priority, supplier dependency, and the cash impact of paying now versus later.

This helps managers protect supplier relationships without accidentally starving cash, missing critical obligations, or approving risky supplier payments.

### Inventory Profitability Intelligence

Stock value, slow movers, dead stock, stockout risk, margin by item/category/location, valuation movement, shrinkage, write-offs, and adjustment reasons.

This connects inventory to cash, gross margin, ledger value, purchasing decisions, and operational discipline instead of showing stock quantity alone.

### Sales And Margin Intelligence

Revenue trends, gross margin, discount leakage, refund patterns, best and worst products, channel/location performance, and salesperson or terminal performance.

This gives SMB managers the commercial layer they need daily: not only "what sold," but what actually created profitable revenue and what damaged margin.

### Payment Reconciliation Intelligence

Matched and unmatched payments, suspense amounts, payment rail reliability, provider discrepancies, evidence completeness, and reconciliation confidence score.

This should become one of Kontava's strongest moat surfaces because it proves payment truth across mobile money, bank, card, cash, POS, invoices, and ledger postings.

### Manager Action Center

A daily list of what needs attention: collect these customers, pay these suppliers, investigate this drawer, reorder these items, review this margin drop, reconcile these payments, and close this period.

This is the habit loop. Every intelligence surface should feed prioritized actions into this center.

### OHADA Ledger Assurance

Every dashboard number should trace to source documents, journal entries, fiscal documents, payments, inventory movements, reconciliation evidence, or close findings.

This is the enterprise trust layer. It tells the manager, accountant, and auditor whether a number is ledger-backed, operational-only, pending posting, reconciled, blocked, or missing evidence.

### Close Readiness Intelligence

Month-end readiness score, missing postings, unreconciled payments, unresolved stock adjustments, tax exposure, pending approvals, and accountant handoff pack readiness.

This shifts close from a month-end scramble into a daily readiness system.

### SMB Health Score

A composite score covering liquidity, profitability, stock discipline, receivables quality, payable pressure, compliance readiness, close readiness, and operational risk.

This should be unique to Kontava and explainable: every score component must drill into evidence, root causes, and recommended actions.

## Ranked BI Roadmap

### 1. Manager Action Center

Management question: What needs my attention today?

Data sources:
- Finance alerts
- Cash drawer alerts
- Payment reconciliation suspense and exceptions
- Close assurance findings
- Inventory stockouts, count variance, valuation drift
- Customer and supplier open balances
- Payroll run/payment/declaration status
- Fiscal document and compliance submission status

KPIs and alerts:
- Critical action count by domain
- Overdue receivable amount
- Due payable amount
- Cash impact of queued actions
- Cash variance amount
- Stockout and low-stock count
- Margin drops requiring review
- Unsigned reconciliation runs
- Fiscal documents rejected or pending
- Close blockers by severity

Workflow links:
- Collect customer payment
- Approve supplier payment
- Reconcile provider statement
- Review cash drawer variance
- Receive goods
- Transfer or reorder stock
- Review margin drop
- Assign close finding
- Retry or inspect fiscal submission

Why it is enterprise-grade:
- It turns BI into a command queue. Managers do not need to hunt across modules; the system tells them the next highest-value actions.

### 2. Cash Command Intelligence

Management question: Can we meet obligations this week and this month?

Data sources:
- Cash drawers
- Payments
- Customer receivables
- Supplier payables
- Payroll payment batches
- Tax and fiscal obligations
- Reconciliation runs

KPIs and alerts:
- Daily cash position
- Cash-in and cash-out
- Current cash position
- Working capital
- Burn rate
- Expected collections
- Due supplier payments
- Upcoming payroll burden
- Cash gap forecast
- Cash drawer variance
- Reconciliation confidence
- Runway in days or weeks
- Cash impact of paying now versus later

Workflow links:
- Record or reconcile payment
- Chase overdue customer
- Approve or delay supplier payment
- Open cash-flow forecast
- Review payroll payment batch
- Inspect drawer sessions

Why it is enterprise-grade:
- SMB owners care about liquidity before everything else. This makes Kontava the first screen of the business day.

### 3. Receivables Risk Intelligence

Management question: Who owes us money, how risky is it, and what should we do first?

Data sources:
- Customers
- Sales orders
- Customer ledger entries
- Payments
- Receivables aging

KPIs and alerts:
- Receivables balance
- Current, 31-60, 61-90, and 90+ day exposure
- Overdue amount
- Credit-limit breaches
- Unpaid sales orders
- Top risky customers
- Collection trend
- Last payment date
- Collection probability
- Promised payment status
- Collector action queue

Workflow links:
- Open customer statement
- Record incoming payment
- Send reminder
- Review customer credit terms
- Record promised payment
- Open sales order
- Place customer on credit review

Why it is enterprise-grade:
- It transforms accounts receivable from a static aging report into a collection control workflow.

### 4. Payables Control Intelligence

Management question: Who must we pay, what is risky, and which supplier issues threaten operations?

Data sources:
- Suppliers
- Purchase orders
- Goods receipts
- Supplier invoices
- Supplier payments
- Supplier ledger entries
- Supplier bank change requests

KPIs and alerts:
- Payables balance
- Overdue payables
- Upcoming due payments
- Open purchase orders
- 3-way match exceptions
- Supplier concentration risk
- Supplier bank change risk
- Payment allocation status
- Payment priority
- Cash impact of paying now versus later
- Supplier dependency risk

Workflow links:
- Approve purchase order
- Receive goods
- Review supplier invoice
- Resolve 3-way match exception
- Approve supplier bank change
- Release supplier payment

Why it is enterprise-grade:
- It brings procurement discipline and payment-diversion controls into an SMB-friendly workflow.

### 5. Inventory Profitability Intelligence

Management question: Which stock is making money, trapping cash, or causing losses?

Data sources:
- Inventory levels
- Inventory transactions
- Stock transfers
- Stock counts
- Stock adjustments and write-offs
- POS sales
- Purchase receipts
- Inventory class 3 reconciliation

KPIs and alerts:
- Total stock value
- Stock value by location
- Slow-moving stock
- Dead stock
- Stockout risk
- Overstock exposure
- Margin by item, category, and location
- Shrinkage and count variance
- Write-off value and reason trends
- Adjustment reason concentration
- Inventory subledger vs class 3 ledger drift

Workflow links:
- Reorder item
- Transfer stock
- Create stock count
- Approve adjustment
- Review write-off
- Open item profitability
- Rebuild projection
- Resolve valuation drift

Why it is enterprise-grade:
- It connects inventory to cash, margin, and ledger value instead of showing only quantities.

### 6. Sales And Margin Intelligence

Management question: Which sales are truly profitable, and where is revenue leaking value?

Data sources:
- POS sales
- Sales orders
- Product and category records
- Discount and refund records
- Cash drawer sessions
- Terminal/session data
- Inventory cost and valuation data
- Customer records
- Location records

KPIs and alerts:
- Revenue trend by day, week, month, location, and channel
- Gross margin by item, category, location, customer segment, terminal, or salesperson
- Discount leakage
- Refund rate and refund value
- Best and worst products by margin contribution
- High-revenue low-margin items
- Salesperson, cashier, or terminal performance
- Margin drop alerts
- Sales growth versus cash collection quality

Workflow links:
- Open POS session
- Review sales order
- Review refund
- Open item profitability
- Adjust price or discount policy
- Review cashier or terminal performance
- Reorder profitable fast movers
- Flag margin anomaly for manager review

Why it is enterprise-grade:
- It moves Kontava beyond sales reporting into profit control. Managers can see where revenue is healthy, where margin is leaking, and which operational choices are causing the leakage.

### 7. Payment Reconciliation Intelligence

Management question: Which money is unmatched, risky, or blocking close?

Data sources:
- Provider accounts
- Provider events
- Statement files and lines
- Payment transactions
- Suspense items
- Payment exceptions
- Reconciliation runs
- Ledger posting batches

KPIs and alerts:
- Match rate
- Open suspense amount
- Open exception count
- Critical exception count
- Provider evidence coverage
- Statement freshness
- Ready-for-signoff runs
- Payment close blockers
- Duplicate provider references
- Payment rail reliability
- Reconciliation confidence score
- Provider discrepancy rate

Workflow links:
- Import statement
- Run reconciliation
- Classify suspense
- Resolve exception
- Sign off reconciliation run
- Open evidence reference

Why it is enterprise-grade:
- Payment truth is a real moat. Most SMB tools record payments; Kontava can prove, reconcile, and certify them.

### 8. OHADA Ledger Assurance

Management question: Can every important dashboard number be trusted, explained, and traced to OHADA-ready evidence?

Data sources:
- Journal entries
- Ledger accounts
- Business events
- Fiscal documents
- Payments
- Provider evidence
- Inventory movements
- Payroll runs
- Supplier invoices
- Customer invoices
- Close evidence
- Accountant reviews

KPIs and alerts:
- Ledger-backed KPI coverage
- Operational-only KPI count
- Missing evidence count
- Source-link coverage percentage
- Unposted financial event count
- Unreconciled ledger/control differences
- Fiscal document evidence coverage
- Inventory class 3 reconciliation status
- Payment reconciliation certification status
- Accountant trust level

Workflow links:
- Open journal entry
- Open source document
- Open fiscal document
- Open payment evidence
- Open inventory movement
- Open reconciliation run
- Open close finding
- Export accountant trust pack

Why it is enterprise-grade:
- It gives Kontava a serious enterprise feel because every important number can defend itself with source evidence, ledger status, and audit-ready traceability.

### 9. Close Readiness Intelligence

Management question: Are we ready to close the period and hand off clean evidence to the accountant?

Data sources:
- Close assurance checklist
- Close findings
- Close evidence items
- Accountant reviews
- Data-trust blockers
- Ledger reconciliation
- Payment reconciliation
- Inventory reconciliation
- Fiscal document evidence

KPIs and alerts:
- Close readiness score
- Evidence coverage percentage
- Critical and high findings
- Open assigned findings
- Waiver requests
- Accountant review status
- Trust level
- Export eligibility

Workflow links:
- Assign finding
- Comment on finding
- Request waiver
- Approve waiver with segregation of duties
- Open evidence graph
- Export accountant trust pack

Why it is enterprise-grade:
- It makes the accountant relationship operational. Kontava becomes the evidence system, not just the accounting UI.

### 10. SMB Health Score

Management question: Is the business healthy, and which operating area is dragging the score down?

Data sources:
- Cash Command Intelligence
- Receivables Risk Intelligence
- Payables Control Intelligence
- Inventory Profitability Intelligence
- Sales And Margin Intelligence
- Payment Reconciliation Intelligence
- OHADA Ledger Assurance
- Close Readiness Intelligence
- Compliance center
- Payroll and workforce controls

KPIs and alerts:
- Overall SMB Health Score
- Liquidity score
- Profitability score
- Receivables quality score
- Payables pressure score
- Inventory discipline score
- Cash control score
- Payment truth score
- Compliance readiness score
- Close readiness score
- Operational risk score

Workflow links:
- Open score breakdown
- Open highest-risk driver
- Open recommended manager actions
- Open cash command view
- Open AR/AP queues
- Open inventory profitability view
- Open payment reconciliation workbench
- Open close readiness center

Why it is enterprise-grade:
- It gives owners a single explainable business health reference while still allowing every score component to drill into source evidence and action. This can become a distinctive Kontava executive surface.

### 11. OHADA Compliance Watchtower

Management question: Are fiscal documents certified, rejected, pending, or missing evidence?

Data sources:
- Fiscal documents
- Fiscal document lines
- Compliance submissions
- Compliance evidence
- Adapter configs
- Country-pack metadata

KPIs and alerts:
- Fiscal documents by status
- Authority submissions by status
- Rejected fiscal documents
- Pending certification queue
- Adapter readiness
- Country-pack version coverage
- Authority reference coverage
- Fiscal document total by type

Workflow links:
- Inspect fiscal document
- Retry submission
- Attach compliance evidence
- Review authority rejection
- Open compliance center

Why it is enterprise-grade:
- It turns OHADA compliance into a visible operating layer. That is a regional product moat.

### 12. Payroll Cost and Workforce Control

Management question: What is payroll costing, what is pending, and what must be reconciled?

Data sources:
- Payroll employees
- Contracts
- Attendance snapshots
- Payroll periods
- Payroll runs
- Payslips
- Payroll declarations
- Payroll payment batches
- Payment exceptions

KPIs and alerts:
- Gross payroll
- Net payable
- Employee deductions
- Employer charges
- Payroll run status
- Declaration status and due dates
- Payment batch status
- Missing payment destination
- Payroll payment reconciliation exceptions

Workflow links:
- Freeze attendance
- Calculate payroll
- Approve and post payroll run
- Release payroll payment
- Prepare declarations
- Resolve payment exception

Why it is enterprise-grade:
- It links attendance, payroll, treasury, ledger, and statutory evidence in a way generic SMB tools rarely do.

### 13. Branch and Location Performance Intelligence

Management question: Which location is healthy, leaking cash, or underperforming?

Data sources:
- Sales orders
- POS sessions
- Cash drawers
- Inventory levels
- Purchase orders
- Stock movements
- Location records

KPIs and alerts:
- Revenue by location
- Orders by location
- Average order value
- Inventory value by location
- Drawer accuracy
- Cash variance by terminal
- Low-stock and stockout count
- Pending purchase approvals
- Branch close blockers

Workflow links:
- Open branch sales
- Review drawer session
- Transfer stock
- Create purchase order
- Open location setup
- Review branch-level exceptions

Why it is enterprise-grade:
- It gives multi-location SMBs a practical branch manager control model without requiring a heavy ERP rollout.

## Quick Wins

1. Build the Manager Daily Action Center using existing alert and blocker outputs.
2. Add evidence badges to KPI cards: ledger-backed, operational-only, missing evidence, blocked.
3. Add drill-through links from KPIs to source documents, ledger entries, payments, stock movements, fiscal documents, or close findings.
4. Add role filters: owner, finance manager, inventory manager, accountant, operations lead.
5. Convert generic analytics cards into action queues: collect, pay, reconcile, receive, count, certify, close.
6. Add a daily digest view with the top 10 manager actions and the cash impact of each.

## Medium-Depth Builds

1. Cash forecast combining cash drawers, receivables, payables, payroll, tax, and payment reconciliation status.
2. Customer risk scoring using aging, credit-limit breach, unpaid orders, last payment, and sales dependency.
3. Supplier risk scoring using AP age, bank-change status, 3-way match exceptions, payment concentration, and delivery delay.
4. Inventory capital dashboard using stock value, turnover, margin, shrinkage, count variance, and class 3 reconciliation.
5. Sales and margin intelligence using revenue trends, gross margin, discount leakage, refund patterns, channel/location performance, and terminal or salesperson performance.
6. Branch manager cockpit using sales, drawer variance, inventory risk, pending purchases, and close blockers per location.

## Strategic Moat Dashboards

### SMB Health Score Executive Layer

The ranked roadmap introduces the SMB Health Score as a core BI surface. The strategic version should mature it into an executive operating layer with a composite score across:

- Liquidity
- Profitability
- Receivables quality
- Payables pressure
- Inventory discipline
- Cash control
- Payroll readiness
- Compliance readiness
- Close readiness
- Data trust

This should be explainable, not opaque. Each score component should link to the underlying evidence and recommended actions.

### Evidence Graph Explorer

A visual chain from operational event to business truth:

- Sale or supplier invoice
- Payment
- Fiscal document
- Journal entry
- Reconciliation
- Close evidence
- Accountant export

This is the most distinctive enterprise-grade trust surface.

### Close and Trust Pack Command Center

The accountant-facing moat:

- Readiness score
- Evidence coverage
- Open blockers
- Source-link coverage
- Payment reconciliation status
- Inventory valuation status
- Fiscal document status
- Accountant review
- Export eligibility

### Fraud and Exception Intelligence

High-value patterns:

- Duplicate provider references
- Supplier bank changes before payment
- Suspicious refunds
- Drawer variances
- Stock write-offs and adjustment clusters
- Payroll payment destination issues
- Offline POS conflicts
- Unresolved reconciliation suspense

The system should expose exceptions visibly and route them into review workflows.

### OHADA Operating Intelligence Layer

The long-term moat is an OHADA-aware operating intelligence layer:

- Ledger-backed figures
- Fiscal document evidence
- Country-pack provenance
- Payment reconciliation certification
- Inventory class 3 reconciliation
- Payroll declaration evidence
- Close assurance
- Accountant trust pack

This positions Kontava as a regional business operating reference, not a generic POS, inventory, or accounting tool.

## BI Design Principles

- Every number must have provenance.
- Every warning must link to an action.
- Every action must preserve ledger and audit integrity.
- Every financial figure should state whether it is ledger-backed or operational-only.
- Every period-close blocker must be visible before month end.
- Every exception queue must have an owner, severity, due date, and next step.
- Every dashboard should answer a manager question, not just decorate a page.

## Implementation Spine

1. Standardize a cross-module `managerAction` read model.
2. Add evidence/provenance metadata to BI responses.
3. Create role-specific BI surfaces using existing services before creating new tables.
4. Build drill-through routes into existing workflows.
5. Introduce composite scores only after their component evidence is visible.
6. Keep statutory and financial totals ledger-derived wherever they affect reporting or close.
7. Preserve the rule that BI must surface drift and blockers, not hide or overwrite them.

## Recommended First Build

Start with the Manager Daily Action Center plus Cash and Liquidity Control Tower. Together they create the fastest manager value:

- "What needs attention today?"
- "Do we have enough cash?"
- "What should I collect, pay, reconcile, receive, approve, or close?"

This creates the daily habit loop. Once managers trust that surface, the deeper moat dashboards become natural extensions rather than separate reports.

## Success Criteria

Kontava BI is successful when an SMB manager opens it every morning because it tells them:

- The cash position.
- The top risks.
- The blocked workflows.
- The most important actions.
- The evidence behind each warning.
- The route to fix each issue.

That is the path from dashboard software to indispensable business operating system.
