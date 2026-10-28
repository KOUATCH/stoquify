# AqStoqFlow Hidden SMB Insights Analysis

## Executive Summary

- **Focus next on the Daily Business Confidence Brief, powered by payment reconciliation, close confidence, AP exposure, and stock-to-cash proof.** The strongest moat is not another dashboard. It is a daily command center that tells an OHADA SMB owner what can be trusted, what is leaking cash, what blocks close, and what action should happen before the day moves on.
- **The codebase already contains the right trust spine, but the live local data shows several moat engines are not yet operationally populated.** The connected PostgreSQL database has sales, payments, inventory, purchase orders, goods receipts, journals, source links, cash drawer events, payroll, and fiscal evidence. It has zero rows in provider payment transactions, statement lines, reconciliation runs, suspense, payment exceptions, supplier invoices, three-way matches, supplier payments, close runs, close findings, close evidence, stock count sessions, offline POS replay, and workflow assurance runtime.
- **The first product bet should convert empty control surfaces into proof-backed daily work.** Payment reconciliation and AP are the highest-value gaps because the database already has 202 payments, 201 purchase orders, 200 goods receipts, and 200 received-not-invoiced candidates, but no provider reconciliation or AP invoice/payment evidence.
- **All customer-behavior claims should remain provisional until production usage telemetry exists.** The local data appears seed or demo-like: many tables cluster around 200 rows, payroll has one complete sample, and audit logs are dominated by permission checks. This report treats row counts and source coverage as confirmed, and SMB business impact as query-ready hypotheses.

## Decision Frame

Question: what business truths can AqStoqFlow reveal from existing cross-domain data that competitors usually miss, and which truths are strong enough to become product moats?

Decision this report supports: where the team should focus next to make AqStoqFlow the trusted daily place for OHADA SMB owners, managers, accountants, cash operators, and payroll/compliance operators.

Audience: product, engineering, growth, accounting/control, and executive stakeholders.

Scope inspected:

- `prisma/schema.prisma`
- `services/dashboard/dashboard-read-model.service.ts`
- `services/analytics/`, `services/bi/`, `services/cash-command/`, `services/daily-habit/`, `services/manager-action-center/`, `services/snapshots/`, `services/owner-war-room/`, `services/signals/`
- `services/payments/`, `services/reconciliation/`, `services/inventory/`, `services/stock-to-cash/`, `services/accounting/`, `services/payroll/`, `services/purchasing/`, `services/compliance/`, `services/assurance/`
- `components/bi/`, `components/dashboard/`, `components/cash-command/`
- `docs/product/proposals/moat/`, `docs/planning/`, `what-next/`, `graphify-out/`

As-of basis:

- Live read-only Prisma probe connected on 2026-06-28.
- Aggregate evidence came from the local PostgreSQL database configured by `.env`.
- The observed data is treated as dev/seed or demo evidence unless separately confirmed as production.

## Evidence Snapshot

| Evidence area | Confirmed local DB evidence | Interpretation |
|---|---:|---|
| Organizations | 8 | Multi-tenant shape exists, but analysis must stay tenant-scoped before production use. |
| Sales orders | 202 | POS/sales truth is populated enough for demo/local analysis. |
| Payments | 202 | Payments are present, including cash, card, bank transfer, and mobile money. |
| Cash drawer transactions | 204 | Cash drawer activity can support cashier/drawer checks. |
| Inventory levels | 200 | Current stock state exists; no negative available/on-hand stock in the probe. |
| Inventory transactions | 402 | 202 sales issues and 200 purchase receipts connect stock movement to sales/procurement. |
| Purchase orders | 201 | Purchasing activity exists. |
| Goods receipts | 200 | Receiving is populated. |
| Supplier invoices / matches / payments | 0 / 0 / 0 | AP control moat is designed but not populated in the local DB. |
| Provider payment transactions / statement lines / reconciliation runs | 0 / 0 / 0 | Payment reconciliation moat is designed but not populated in the local DB. |
| Journal entries / source links / ledger audit events | 204 / 204 / 213 | Ledger posting and traceability are populated. |
| Close runs / close findings / close evidence | 0 / 0 / 0 | Close confidence is not operationalized in the local DB. |
| Fiscal docs / submissions / compliance evidence | 2 / 2 / 2 | Compliance proof exists in sandbox-style small volume. |
| Payroll runs / declarations / payment batches / payslips | 1 / 1 / 1 / 1 | Payroll proof is present only as a minimal sample. |
| Workflow assurance definitions / check runs / incidents | 0 / 0 / 0 | Runtime assurance is not active in the local DB despite static readiness artifacts. |
| Audit logs | 9,953 | Audit activity exists, but permission-check noise dominates. |

Graphify context: `graphify-out/GRAPH_REPORT.md` reports 4,121 nodes, 5,321 edges, and hyperedges for ledger-first OHADA operating spine, connected SMB operations, ledger-backed compliance, sales intelligence, branch-manager control-center widgets, and what-next execution artifacts. This supports the architecture view that AqStoqFlow is a connected operating system rather than isolated modules.

## Ranked Moat-Grade Insights

| Rank | Insight | Affected role | Data sources | Query logic | Confidence | Business pain revealed | Likely action | Product differentiation |
|---:|---|---|---|---|---|---|---|---|
| 1 | Daily Business Confidence Brief | Owner, manager, accountant | Tenant snapshots, dashboard read model, BI primitives, owner war room, manager action center, audit/evidence models | Compose payment truth, inventory-cash, close readiness, action queue, proof subjects, stale/blocker states | High for architecture, medium for live data | Owners do not know which numbers are safe to trust each morning | Ship first-viewport brief with confidence score, trust badges, blockers, and next actions | Competitors show charts; AqStoqFlow can show what is trusted and why |
| 2 | Cash reconciliation gap detector | Owner, cashier, accountant | `Payment`, `CashDrawerTransaction`, `PaymentTransaction`, `StatementLine`, `MatchRecord`, `SuspenseItem`, `PaymentException`, `ReconciliationRun` | Compare internal payments and drawer activity against provider/statement/reconciliation rows | High for gap, hypothesis for leakage amount | Cash/card/mobile money collections can look paid while settlement proof is absent | Build provider ingestion and reconciliation pilot before more finance pages | Proof-backed mobile-money/cash truth is highly relevant for OHADA SMBs |
| 3 | Received-not-invoiced AP exposure | Owner, accountant, purchasing manager | `PurchaseOrder`, `GoodsReceipt`, `SupplierInvoice`, `ThreeWayMatch`, `SupplierPayment`, supplier ledger | Count received POs without supplier invoices/matches/payments | High | Goods can enter stock before AP obligation is visible or controlled | Build AP invoice center and three-way-match detail | Turns purchasing into working-capital and fraud-control intelligence |
| 4 | Ledger-posted but not close-ready | Accountant, owner | `JournalEntry`, `LedgerPostingBatch`, `AccountingSourceLink`, `CloseRun`, `CloseAssuranceFinding`, `CloseEvidenceItem` | Compare posted/source-linked journals with close run and evidence coverage | High | Posted accounting is not the same as close confidence | Make close readiness and close blockers a daily visible state | "Can I trust this period?" is stronger than generic accounting reports |
| 5 | Stock-to-cash proof chain | Owner, inventory manager, cashier | `InventoryLevel`, `InventoryTransaction`, `SalesOrder`, `Payment`, `JournalEntry`, stock-to-cash service | Track purchase receipt -> stock level -> sale issue -> payment -> ledger -> close | High for chain design, medium for live data | Stock movement and cash collection are rarely explained in one proof path | Promote stock-to-cash flow to owner view with proof drawer | Connects inventory, POS, cash, and ledger in one business story |
| 6 | Physical stock confidence gap | Owner, inventory manager, accountant | `InventoryLevel`, `InventoryTransaction`, `StockCountSession`, `StockAdjustment`, inventory reconciliation service | Compare stock levels and movement to count sessions and adjustments | High | Stock may be system-correct but physically unverified | Build stock count center and inventory reconciliation dashboard | Moves from item tracking to stock trust and shrinkage prevention |
| 7 | Refund and cash drawer leakage watch | Cashier supervisor, owner | `Payment`, `PaymentRefund`, `CashDrawerTransaction`, `AuditLog`, POS services | Monitor refunded amounts, cash-in events, drawer opening/closing, void/refund audit | Medium | Refunds, cash-ins, and drawer changes can leak cash if not reviewed daily | Add refund/void/drawer exception queue to cash command | Daily cashier control is a sticky operational habit |
| 8 | Fiscal submission proof gap | Accountant, compliance operator, owner | `FiscalDocument`, `ComplianceSubmission`, `ComplianceEvidence`, country-pack services | Track queued/pending/rejected/completed fiscal submissions and evidence hash coverage | Medium | Fiscal documents may exist, but authority acceptance proof is what matters | Build compliance evidence archive and submission queue | OHADA/country-pack proof supports premium trust positioning |
| 9 | Payroll statutory and payment pressure | HR/payroll operator, accountant, owner | `PayrollRun`, `PayrollPayslip`, `PayrollDeclaration`, `PayrollPaymentBatch`, payroll evidence services | Track posted run, prepared declarations, released batches, reconciliation status | Medium, limited by one-row sample | Payroll can be posted while declaration/payment proof remains incomplete | Add payroll declaration and payment reconciliation widgets to daily brief | Payroll privacy plus statutory proof is hard for generic SMB tools |
| 10 | Security posture as operating trust | Owner, admin, accountant | `AuditLog`, roles/RBAC services, sensitive-action controls | Separate permission-grant noise from denied attempts, login failures, locks, risky permissions | Medium | Owners need to know who can change money, stock, payroll, and close evidence | Build security posture card with denied attempts and risky permissions | Makes internal fraud and access risk visible without exposing secrets |
| 11 | Offline POS readiness gap | Cashier, branch manager, owner | POS offline device, batch, event, conflict, certificate models/services | Count offline devices, events, sync batches, conflicts, replay certificates | High for gap, hypothesis for field risk | Shops with weak internet need proof that offline sales replay safely | Build offline device health and replay queue after payment truth pilot | "What happens when internet fails?" becomes demo-grade proof |
| 12 | Workflow assurance is ready to become work routing | Manager, accountant, operator | Workflow assurance definitions/runs/incidents, assurance services, action center | Convert static gates and incidents into runtime checks, owners, due dates, action routes | Medium | Controls stay invisible unless they become daily work | Activate runtime assurance definitions and incident queues | Turns governance into retention-driving daily action loops |
| 13 | Customer cash pressure and receivables drift | Owner, sales manager, accountant | `Customer`, `CustomerLedgerEntry`, `SalesOrder`, `Payment` | Age unpaid/partial orders, customer balances, repeat purchase decay, late payments | Medium | SMBs feel cash pressure before they can explain which customers caused it | Add receivables and drifting-customer cards to daily brief | Links customer behavior to cash, not just CRM lists |
| 14 | Supplier concentration and bank-change risk | Owner, accountant, purchasing manager | `Supplier`, `SupplierBankAccount`, bank-change requests, AP payments, audit | Track supplier spend concentration, bank-account changes, maker-checker approval | Medium-low in local DB because supplier-bank tables are empty | Fraud often enters through fake supplier payment destinations | Build supplier bank-change queue once AP payments are populated | A clear owner pitch: prevent fake supplier-payment destination loss |

## Visible vs Invisible OHADA SMB Pain Matrix

| Pain area | Visible in normal dashboards | Invisible pain AqStoqFlow can reveal | Evidence needed | Product treatment |
|---|---|---|---|---|
| Sales | Revenue, order count, top products | Sales paid internally but not settled externally | Payments, provider transactions, statements, match records | Cash truth badge and reconciliation blockers |
| Cash drawer | Opening, cash sales, closing | Cash-in/refund/void patterns by cashier or shift | Drawer transactions, refunds, audit logs, POS session | Cash command exception queue |
| Inventory | On-hand quantity and valuation | Stock sold but not relieved, received but not invoiced, physically uncounted stock | Inventory transactions, levels, counts, AP receipt/invoice data | Stock-to-cash proof chain and count center |
| Purchasing | Purchase orders and receipts | Received-not-invoiced exposure and supplier concentration | POs, goods receipts, supplier invoices, three-way matches | AP exposure brief and match workbench |
| Accounting | Posted journals | Posted does not mean close-ready or certified | Journal entries, source links, close runs, findings, evidence | Close confidence score and blocker drawer |
| Payroll | Net payable and payslips | Released payroll not reconciled to bank or statutory declaration proof | Payroll run, batch, declarations, evidence, payment transaction | Payroll statutory pressure card |
| Compliance | Fiscal documents | Authority submission, rejection, retry, and evidence gaps | Fiscal docs, submissions, compliance evidence, adapter config | Compliance proof archive |
| Security | Users and roles | Permission churn, denied attempts, lockouts, risky authority | Audit logs, sessions, role memberships, sensitive actions | Security posture panel |
| Operations | Alerts and tasks | Repeated unresolved incidents with owner, SLA, and evidence state | Workflow assurance checks/incidents, action queue | Runtime assurance work routing |

## Proposed First Viewport: Daily Business Confidence Brief

The first screen should answer one question: "Can I trust the business today, and what must be handled first?"

Recommended first-viewport layout:

1. **Confidence header**
   - Overall state: `trusted`, `usable`, `partial`, `blocked`, or `stale`.
   - Evidence grade: raw, operational, posted, reconciled, certified, blocked.
   - Freshness: generated at, source max updated at, stale reason.
   - Scope: tenant, branch/location, period.

2. **KPI strip**
   - Cash collected today, with reconciliation state.
   - Stock-to-cash status, with stockout/shrinkage risk.
   - AP exposure, especially received-not-invoiced and supplier payment risk.
   - Close readiness score, with critical blockers.
   - Compliance/payroll statutory pressure, redacted when needed.

3. **Action queue**
   - Items ranked by severity, business impact, SLA, owner role, and evidence grade.
   - Examples: reconcile mobile-money suspense, attach supplier invoice, approve stock count variance, resolve close blocker, retry fiscal submission, review failed login cluster.

4. **Proof drawer**
   - For every card, open source records, source links, business events, audit trail, ledger posting, provider/authority evidence, and redactions.
   - Never expose provider identifiers, payroll personal data, or fiscal payloads beyond role policy.

5. **Role-aware next actions**
   - Owner: unblock cash, supplier exposure, trust score, close readiness.
   - Manager: drawer exceptions, stock counts, offline replay, approvals.
   - Accountant: source links, reconciliation, close findings, fiscal submissions.
   - Payroll/HR: declaration due, released-not-reconciled payment batches, payslip evidence.
   - Admin: risky permissions, denied attempts, module readiness.

## Product Focus Recommendations

1. **Build the payment reconciliation pilot first.**
   - Why: the local DB has 202 payments, 204 cash drawer transactions, 50 mobile-money payments with XAF 6,000 in fees, and 40 refunded payments with XAF 537,500 refunded amount, but zero provider transactions, statement lines, match records, suspense items, exceptions, or reconciliation runs.
   - Ship as: provider account setup, statement import queue, reconciliation run detail, suspense/exception owner queue, signed certificate detail, cash command integration.
   - Success metric: percent of payments with external proof and signed reconciliation by business date.

2. **Build AP exposure and three-way-match completion next.**
   - Why: the DB has 201 purchase orders and 200 goods receipts, but zero supplier invoices, three-way matches, or supplier payments. The query found 200 received-not-invoiced candidates.
   - Ship as: supplier invoice center, received-not-invoiced card, match detail, variance queue, payment release evidence, supplier bank-change guard.
   - Success metric: percent of goods receipts matched to invoice and payment evidence within SLA.

3. **Turn posted accounting into close confidence.**
   - Why: journals are strong locally: 204 journal entries, 204 posted, 204 source links, 213 ledger audit events. But close runs, close findings, close evidence, and close packs are empty.
   - Ship as: close readiness score, critical blockers, evidence graph, source-link drawer, certified close-pack history, close-impact invalidation.
   - Success metric: percent of periods with generated close run, no critical blockers, and evidence coverage above threshold.

4. **Make stock-to-cash the owner story.**
   - Why: stock movement is populated and coherent locally: 200 inventory levels, 402 inventory transactions, no negative available/on-hand stock, and no missing transaction references. But there are zero stock count sessions, so physical confidence is absent.
   - Ship as: stock-to-cash flow view, stock count center, variance approvals, stock reconciliation, shrinkage/write-off evidence.
   - Success metric: percent of stock value covered by recent count or reconciliation evidence.

5. **Promote daily command surfaces over more module pages.**
   - Why: BI primitives, daily habit digest, owner war room, manager action center, cash command, and "Today's Operating Truth" already exist as product surfaces. They need stronger source population, freshness, and proof depth.
   - Ship as: one first-viewport brief that routes into module workbenches instead of asking users to hunt across modules.
   - Success metric: daily active tenant users who open and complete at least one evidence-backed action.

## Query Pack

Use these snippets as the production query pack. Always add `organizationId`/tenant filters before using in product code or customer reporting.

### 1. Payment Reconciliation Coverage

```sql
select
  (select count(*) from payments) as payments,
  (select count(*) from payment_transactions) as provider_transactions,
  (select count(*) from statement_lines) as statement_lines,
  (select count(*) from match_records) as matches,
  (select count(*) from suspense_items) as suspense_items,
  (select count(*) from payment_exceptions) as exceptions,
  (select count(*) from reconciliation_runs) as reconciliation_runs;
```

### 2. Mobile Money Fees And Refund Exposure

```sql
select
  method,
  status,
  count(*) as payment_count,
  sum(amount) as amount,
  sum("refundedAmount") as refunded_amount,
  sum("mobileMoneyFeesAmount") as mobile_money_fees
from payments
group by method, status
order by payment_count desc;
```

### 3. Received-Not-Invoiced AP Candidates

```sql
select count(*) as received_not_invoiced_candidates
from purchase_orders po
where exists (
  select 1 from goods_receipts gr
  where gr."purchaseOrderId" = po.id
)
and not exists (
  select 1 from supplier_invoices si
  where si."purchaseOrderId" = po.id
);
```

### 4. Three-Way Match Coverage

```sql
select
  (select count(*) from goods_receipts) as goods_receipts,
  (select count(*) from supplier_invoices) as supplier_invoices,
  (select count(*) from three_way_matches) as three_way_matches,
  (select count(*) from supplier_payments) as supplier_payments;
```

### 5. Close Readiness Coverage

```sql
select
  (select count(*) from journal_entries) as journal_entries,
  (select count(*) from journal_entries where status = 'POSTED') as posted_journal_entries,
  (select count(*) from accounting_source_links) as source_links,
  (select count(*) from close_runs) as close_runs,
  (select count(*) from close_assurance_findings) as close_findings,
  (select count(*) from close_evidence_items) as close_evidence_items;
```

### 6. Journal Entries Missing Source Links

```sql
select count(*) as journal_entries_missing_source
from journal_entries
where "sourceType" is null
   or "sourceId" is null;
```

### 7. Stock-To-Cash Movement Health

```sql
select
  type,
  count(*) as transaction_count,
  sum(quantity) as quantity,
  sum("totalCost") as total_cost,
  count(*) filter (where "referenceId" is null) as missing_reference
from inventory_transactions
group by type
order by transaction_count desc;
```

### 8. Inventory Physical Confidence Gap

```sql
select
  (select count(*) from inventory_levels) as inventory_levels,
  (select count(*) from inventory_levels where "quantityAvailable" < 0) as negative_available,
  (select count(*) from inventory_levels where "quantityOnHand" < 0) as negative_on_hand,
  (select count(*) from stock_count_sessions) as stock_count_sessions,
  (select count(*) from stock_adjustments) as stock_adjustments;
```

### 9. Cash Drawer Exception Mix

```sql
select
  type,
  count(*) as event_count,
  sum(amount) as amount
from cash_drawer_transactions
group by type
order by event_count desc;
```

### 10. Fiscal Submission Evidence State

```sql
select
  fd.status as fiscal_status,
  cs.status as submission_status,
  cs.environment,
  count(*) as document_count,
  count(ce.id) as evidence_items
from fiscal_documents fd
left join compliance_submissions cs on cs."fiscalDocumentId" = fd.id
left join compliance_evidence ce on ce."fiscalDocumentId" = fd.id
group by fd.status, cs.status, cs.environment;
```

### 11. Payroll Statutory Pressure

```sql
select
  pr.status as run_status,
  pd.status as declaration_status,
  ppb.status as payment_batch_status,
  ppb."reconciliationStatus",
  count(distinct pr.id) as runs,
  count(distinct pd.id) as declarations,
  count(distinct ppb.id) as payment_batches
from payroll_runs pr
left join payroll_declarations pd on pd."payrollRunId" = pr.id
left join payroll_payment_batches ppb on ppb."payrollRunId" = pr.id
group by pr.status, pd.status, ppb.status, ppb."reconciliationStatus";
```

### 12. Security Posture From Audit Events

```sql
select
  "entityType",
  action,
  count(*) as event_count,
  min("createdAt") as first_seen,
  max("createdAt") as last_seen
from audit_logs
group by "entityType", action
order by event_count desc
limit 20;
```

### 13. Offline POS Readiness

```sql
select
  (select count(*) from pos_offline_devices) as devices,
  (select count(*) from pos_offline_sync_batches) as sync_batches,
  (select count(*) from pos_offline_events) as offline_events,
  (select count(*) from pos_offline_sync_conflicts) as conflicts,
  (select count(*) from pos_offline_sync_certificates) as certificates;
```

### 14. Customer Cash Pressure

```sql
select
  type,
  count(*) as ledger_entries,
  sum(debit) as debit,
  sum(credit) as credit,
  count(*) filter (where "referenceId" is null) as missing_reference
from customer_ledger_entries
group by type
order by ledger_entries desc;
```

### 15. Workflow Assurance Runtime Activation

```sql
select
  (select count(*) from workflow_assurance_check_definitions) as definitions,
  (select count(*) from workflow_assurance_check_runs) as check_runs,
  (select count(*) from workflow_assurance_incidents) as incidents;
```

## Data Quality Notes

- **Live DB access exists, but the population looks seed/demo-like.** Many core domains sit near 200 rows, and several tables are exactly empty. Use this data for architecture and coverage analysis, not customer-behavior claims.
- **No first-class product usage event stream was found in the inspected sources.** `AuditLog` exists and is useful for security and operational traceability, but it is dominated by permission checks: 9,457 `SecurityEvent/PERMISSION_GRANTED` rows out of 9,953 audit logs. Product usage analysis needs separate event taxonomy or carefully filtered audit-derived metrics.
- **Payment truth is underpopulated.** Internal payments exist, but provider accounts, provider events, statement files/lines, payment transactions, matches, suspense, exceptions, and reconciliation runs are empty. Cash leakage claims cannot be quantified until provider/statement ingestion is populated.
- **AP exposure is visible as a coverage gap, not as confirmed supplier liability.** The query found 200 purchase orders with receipts and no invoices, but with no supplier invoices populated, this should be treated as a received-not-invoiced candidate list until invoice ingestion exists.
- **Inventory operational data is strong, but physical proof is missing.** Inventory levels and transactions are populated and references are complete in the local probe, but stock count sessions are zero. Shrinkage cannot be measured without count/variance evidence.
- **Ledger posting is strong, close assurance is absent locally.** Posted journal entries, ledger posting batches, source links, and ledger audit events exist. Close runs, findings, evidence, and close pack exports are zero, so close confidence must be productized before statutory or owner-trust claims.
- **Compliance evidence is small and sandbox-facing.** The probe found two queued POS receipt fiscal documents, two pending sandbox submissions, and two evidence items. Do not claim production fiscal authority readiness from this sample.
- **Payroll needs privacy-aware treatment.** Payroll has one posted run, one prepared declaration, one released payment batch, and one emitted payslip. This is enough to verify the workflow shape, not enough to infer payroll behavior.
- **Workflow assurance appears static rather than runtime in the database.** Architecture reports mention readiness gates, but runtime definitions, runs, and incidents are zero locally. Product work should activate controlled runtime definitions before relying on action queues.
- **Tenant isolation must be enforced in every production query.** The snippets above are intentionally generic for readability. Production code must filter by `organizationId`, apply RBAC, redact payroll/provider/fiscal data, and prefer server-owned read models.

## Recommended Product Experiments

| Experiment | Format | Why now | Success signal |
|---|---|---|---|
| Payment Reconciliation Proof Loop | Alert + workbench + certificate | Payments are populated but provider proof is empty | 80% of daily payments matched or explicitly in suspense by close of day |
| Received-Not-Invoiced AP Brief | Daily card + AP workbench | 200 local RNIN candidates show the join is moat-grade | Goods receipts without invoice assigned to owner and cleared within SLA |
| Close Confidence Score | Dashboard + proof pack | Ledger/source links exist but close proof is empty | Every active period has a generated close run and blocker state |
| Stock Count Confidence | Alert + workflow | Inventory is populated but physical counts are empty | Stock value covered by recent counts rises above target threshold |
| Cash Drawer Leakage Queue | Alert + manager workflow | Refund/cash drawer events exist and affect cash trust | Refunds, cash-ins, and drawer close deltas reviewed daily |
| Compliance Evidence Archive | Proof pack + workflow | Fiscal docs/submissions/evidence exist but are pending sandbox | Every fiscal document shows authority status, retries, evidence, and safe redactions |
| Payroll Statutory Pressure Card | Dashboard + accountant workflow | Payroll proof exists but sample is tiny and sensitive | Declarations, payment batches, and reconciliation states are visible without exposing payroll PII |
| Security Posture Card | Dashboard + admin workflow | Audit logs are rich but noisy | Permission-denied, login-failed, lockout, and risky permission signals become readable |
| Runtime Workflow Assurance | Alert + action queue | Static readiness needs daily operational routing | Check definitions run on schedule and create owned incidents |
| Daily Business Confidence Brief | First-viewport dashboard | Command primitives and snapshots exist | Users open the brief daily and complete evidence-backed actions |

## Further Questions

1. Which environment is the connected database: development, staging, demo, or production?
2. Which tenant should be the pilot for real product usage analysis?
3. Which payment providers matter first for OHADA SMBs in the target market: mobile money, bank transfers, card, or cash drawer reconciliation?
4. Should the Daily Business Confidence Brief be owner-first, manager-first, or accountant-first for the first release?
5. What are the minimum freshness SLAs for payment, inventory, AP, payroll, compliance, and close snapshots?
6. Which events should be added to a product analytics stream separate from audit logs?

## Caveats And Assumptions

- This report uses live read-only local DB aggregates plus source inspection. It does not claim production customer usage.
- All product recommendations are evidence-backed by schema/service/doc coverage and local row-state gaps. Business impact amounts remain hypotheses until real tenant activity and external provider/authority data are populated.
- Payroll, provider, fiscal, and audit data require redaction and RBAC. The report intentionally avoids exposing tenant names, user names, provider identifiers, payroll personal data, or fiscal payload details.
- Competitor claims are framed as product differentiation hypotheses, not market research conclusions. The source-backed claim is that AqStoqFlow's existing model can connect operational records, evidence, ledger, reconciliation, and close assurance in ways generic dashboards usually do not.

