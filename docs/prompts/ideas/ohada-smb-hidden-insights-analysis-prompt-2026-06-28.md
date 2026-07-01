# OHADA SMB Hidden Insights Analysis Prompt

Act as a multidisciplinary principal review team: system architect, cyber-security architect, senior frontend engineer, UI/UX specialist, product strategist, business logic analyst, SaaS growth advisor, senior data analyst, OHADA/SYSCOHADA-aware accountant, and SMB operator advisor.

Project:
AqStoqFlow / Kontava platform.

Workspace:
`E:\ohada saas\newStockFlow\aqstoqflow`

Mission:
Run an evidence-first, source-backed data analysis of the existing AqStoqFlow system to discover hidden, high-value OHADA SMB insights that are not obvious from normal dashboards. The goal is to identify "daily command center" insights that help owners, managers, accountants, and cash operators see visible and invisible business pain points with confidence, proof, and next actions.

Use Data Analytics discipline:
- Start from the decision: what would make AqStoqFlow the daily trusted place for OHADA SMBs?
- Run `$gather-business-context`, then `$product-business-analysis`.
- Use `$analyze-data-quality` before trusting surprising joins or gaps.
- Use `$validate-data` before making strong claims.
- Hand off the final reader-facing structure to `$build-report`.

Primary question:
What business truths can AqStoqFlow reveal from its existing cross-domain data that competitors usually miss, and which of those truths are strong enough to become product moats?

Inspect evidence first:
- `prisma/schema.prisma`
- `services/dashboard/dashboard-read-model.service.ts`
- `services/analytics/`
- `services/bi/`
- `services/cash-command/`
- `services/daily-habit/`
- `services/manager-action-center/`
- `services/snapshots/`
- `services/payments/`
- `services/reconciliation/`
- `services/inventory/`
- `services/stock-to-cash/`
- `services/accounting/`
- `services/payroll/`
- `services/purchasing/`
- `services/compliance/`
- `services/assurance/`
- `components/bi/`, `components/dashboard/`, `components/cash-command/`
- `docs/product/proposals/moat/`
- `docs/planning/`
- `what-next/`
- `graphify-out/`

Prioritize these source models and joins:
- Sales and POS: `SalesOrder`, `DailySalesReport`, `Payment`, `CashDrawerTransaction`, `POSOfflineEvent`
- Stock truth: `InventoryLevel`, `InventoryTransaction`, `StockCountSession`, `StockAdjustment`, `StockTransfer`
- Cash and payment truth: `PaymentTransaction`, `StatementLine`, `MatchRecord`, `SuspenseItem`, `PaymentException`, `ReconciliationRun`
- Supplier/AP truth: `PurchaseOrder`, `GoodsReceipt`, `SupplierInvoice`, `ThreeWayMatch`, `SupplierPayment`, `SupplierLedgerEntry`
- Customer truth: `Customer`, `CustomerLedgerEntry`, receivables and sales history
- Payroll/statutory truth: `PayrollRun`, `PayrollDeclaration`, `PayrollPaymentBatch`, `PayrollPayslip`
- OHADA/control truth: `ChartOfAccount`, `JournalEntry`, `LedgerPostingBatch`, `CloseRun`, `CloseAssuranceFinding`, `CloseEvidenceItem`
- Compliance/evidence truth: `FiscalDocument`, `ComplianceSubmission`, `ComplianceEvidence`, `BusinessEvent`, `AuditLog`, `WorkflowAssuranceCheckRun`, `WorkflowAssuranceIncident`

Analysis lenses:
1. Cash leakage: unreconciled mobile-money/cash/card collections, fees, delayed settlement, duplicate references, refunds, voids, suspense aging.
2. Stock-to-cash leakage: stock sold but not relieved, stock lost but not posted, fast sellers at stockout risk, dead stock tying up cash, margin erosion by item/location.
3. Close confidence: which numbers are trusted, stale, blocked, missing evidence, or not close-ready.
4. Supplier/AP exposure: received-not-invoiced, invoiced-not-received, overpayment risk, supplier concentration, bank-account change risk.
5. Customer cash pressure: overdue receivables, high-value customers drifting, repeat buyers, unpaid orders, credit exposure.
6. Payroll/statutory pressure: upcoming declarations, unpaid liabilities, unreconciled payroll payments, missing payslip/archive evidence.
7. Compliance risk: fiscal sequence gaps, rejected/pending submissions, country-pack uncertainty, missing proof trails.
8. Operator behavior: offline POS risk, cashier anomalies, repeated correction patterns, late approvals, unresolved incidents.
9. Daily habit value: what the owner should look at every morning in 5 minutes, with proof and next action.

Required outputs:
- A ranked table of 10-15 "moat-grade insights" with: insight, affected role, data sources, query logic, confidence level, business pain revealed, likely action, and product differentiation.
- A "visible vs invisible pain" matrix for OHADA SMBs.
- A proposed "Daily Business Confidence Brief" first-viewport dashboard: KPIs, trust badges, action queue, proof drawer, and role-aware next actions.
- Query pack or Prisma/SQL snippets used for each finding.
- Data quality notes: missing fields, stale records, weak joins, unknown denominators, and source conflicts.
- Recommended product experiments: which insights should become alerts, dashboards, proof packs, or accountant-facing workflows.
- Save the final report to `what-next/OHADA_SMB_HIDDEN_INSIGHTS_ANALYSIS_[YYYY-MM-DD].md`.

Rules:
- Do not invent metrics or use mock conclusions as facts.
- If no live database is available, produce a query-ready analysis plan and label all findings as hypotheses.
- Keep tenant isolation, RBAC, redaction, payroll privacy, provider evidence, and fiscal data sensitivity intact.
- Separate confirmed insights from inferred opportunities.
- Prefer server-owned read models over client-side calculations.
- Do not change application code unless explicitly asked.

Success criteria:
- The final report identifies insights that are actionable daily, not just interesting.
- Every strong claim names its source tables/services and confidence level.
- The recommendations explain why AqStoqFlow can become the trusted daily command center for OHADA SMBs.
- The output distinguishes commodity dashboards from differentiated proof-backed business intelligence.
