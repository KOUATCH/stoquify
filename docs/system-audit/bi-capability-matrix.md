# BI and decision-support capability matrix

## Observed BI architecture

Current operational reporting explicitly declares provenance, period, generation time, source tables, currency, blockers and INTERNAL_REPORT_ONLY certification. Completed-sales evidence reconciles order/line totals and uses inventory issue evidence for cost; it explicitly describes original activity before later returns. Cash evidence distinguishes count/movement quality, and the cashier performanceScore is deliberately null. These are useful safeguards.

Current financial-metrics.v2 is PARTIAL with FINANCIAL_SOURCES_NOT_CONNECTED; missing balance sheet/profitability/cash flow values are null. Existing accounting statements have F01/F09 correctness defects. The BI adapter's trust/freshness/redaction contract should be retained and populated from authoritative sources.

Sources: [services/analytics/financial-reports.service.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-reports.service.ts:1>); [services/analytics/completed-sales-evidence.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/completed-sales-evidence.ts:1>); [services/analytics/financial-order-activity.service.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-order-activity.service.ts:1>); [services/analytics/financial-analytics.service.ts:1](<E:/ohada saas/Focused projects/stoquify/services/analytics/financial-analytics.service.ts:1>); [services/bi/bi-contracts.ts:1](<E:/ohada saas/Focused projects/stoquify/services/bi/bi-contracts.ts:1>). No data-warehouse, complete semantic layer or predictive capability is inferred from a chart component.

## Contract applying to every KPI below

Each KPI requires a versioned definition and source version, tenant/location scope, source completeness and a generatedAt/freshness limit. Amounts remain separate by currency unless converted under F01's approved rate contract. Use the organization's business timezone for operational days and the approved accounting calendar for posted reports. Store explicit [start,end) instants plus as-of/known-at cutoffs so DST and late corrections are reproducible. Money must use decimal arithmetic through aggregation; presentation conversions cannot determine financial truth.

Null/unknown/blocked, legitimate zero and empty population are different states. Enforce server permissions and module availability for both aggregate and drill-through, rechecking current grants. Report pagination/truncation, and independently aggregate whole populations rather than summing a page. Corrections append source-linked effects and invalidate affected snapshots. Operational, posted, reconciled, certified and forecast measures must retain different labels. These are required contracts; the table does not claim all current implementations already satisfy them.

## Priority and purpose

| KPI | Current state / priority | Business owner |
|---|---|---|
| K01 Completed-sale activity | Existing operational report; essential refinement | Owner / sales manager |
| K02 Realized net sales, COGS and gross margin | Original-sale cost evidence exists; corrected posted margin essential | Finance / merchandising |
| K03 Basket, product and branch performance | Existing original-sale breakdown; essential contract clarity | Sales manager |
| K04 Order activity and commitments | Existing operational order read model | Operations / buyer / sales manager |
| K05 Cash position and drawer variance | Existing operational cash evidence; essential | Cash manager / finance |
| K06 Settlement lag, fees and cash in transit | Evidence sources exist; valuable after provider qualification | Treasury / payments operations |
| K07 Reconciliation exceptions and suspense aging | Existing workbenches/read models | Reconciliation owner / accountant |
| K08 Low stock and inventory coverage | Existing Business Pulse operational signal | Stock manager |
| K09 Stock turnover, aging and replenishment | Valuable after costing/lead-time prerequisites | Inventory / procurement |
| K10 Shrinkage, stock loss and adjustment variance | Loss sources exist; valuable consolidated KPI | Operations / stock control |
| K11 Supplier delivery reliability and purchasing commitments | Partial source foundation; valuable | Procurement manager |
| K12 AR/AP aging and working capital | Receivable/AP structures exist; essential finalization proof | Credit controller / accountant |
| K13 Income statement, balance sheet and trial balance | Implemented but incorrect FX semantics; essential correction | Accountant / finance owner |
| K14 Cash-flow statement | Not established as a complete connected report; essential for professional suite | Accountant |
| K15 Payroll cost and headcount | Partial existing payroll analytics; essential scope clarity | HR / payroll / finance |
| K16 Attendance, leave and workforce trends | HRIS source records exist; valuable after definitions/privacy approval | HR / managers within effective scope |
| K17 Close progress, evidence freshness and integration reliability | Existing evidence/snapshot contracts; essential operational view | Finance controller / SRE / support |
| K18 Budget versus actual and scenario cash forecast | Valuable after corrected accounting; not required before core fixes | Owner / FP&A |
| K19 Customer retention and repeat purchase | Optional after identity/consent/data-quality foundations | Commercial owner |

### K01 — Completed-sale activity

- **Decision / owner:** Completed-sale activity decisions for Owner / sales manager. **State:** Existing operational report; essential refinement.
- **Definition and grain:** Sum retained COMPLETED/DELIVERED order lines; show tax-inclusive and tax-exclusive activity separately; transaction count counts distinct orders. Tenant/location/product/business day.
- **Sources, inclusions and corrections:** SalesOrder/Line and completed-sales-evidence.ts. Exclude drafts/cancelled/deleted orders; existing contract describes original activity before later returns/credits. Add separately linked returns; do not call this posted revenue.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On demand with generatedAt; correction-driven invalidation. Sales report permission plus branch scope.
- **Drill-through and reconciliation:** Original orders/lines and correction links. Line sums equal order totals/tax; counts agree with distinct source orders.
- **Limit / prerequisite:** Current currency follows organization scope; historical currency/source denomination and correction coverage need qualification.

### K02 — Realized net sales, COGS and gross margin

- **Decision / owner:** Realized net sales, COGS and gross margin decisions for Finance / merchandising. **State:** Original-sale cost evidence exists; corrected posted margin essential.
- **Definition and grain:** Net recognized sales minus returns/credits minus source-frozen COGS; margin = profit / net sales, null when denominator is zero. Tenant/location/product/period.
- **Sources, inclusions and corrections:** Inventory SALE/return movements, source journals, completed-sales evidence. Use issue cost evidence, never today’s catalog cost; include disposition-specific returned COGS; missing cost produces unavailable margin.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** After posting/correction, bounded snapshot freshness. Finance/cost permission; redact costs otherwise.
- **Drill-through and reconciliation:** Sale, movement and journal evidence. Operational cost agrees with issue evidence; posted result agrees with revenue/COGS accounts.
- **Limit / prerequisite:** F01/F02 and return/period reconciliation must be resolved before posted profitability claim.

### K03 — Basket, product and branch performance

- **Decision / owner:** Basket, product and branch performance decisions for Sales manager. **State:** Existing original-sale breakdown; essential contract clarity.
- **Definition and grain:** Average basket = included sales amount / distinct included transactions; quantity and revenue by product/location. Tenant/location/product/day.
- **Sources, inclusions and corrections:** Completed SalesOrder/Line; authorized item labels. Same inclusion/corrections as K01; refunds separately labeled; compare equivalent business periods rather than full yesterday versus partial today without disclosure.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On demand / daily snapshot. Sales reports + permitted locations.
- **Drill-through and reconciliation:** Filtered source transactions. Group totals equal K01; ties deterministic; all groups included or truncation declared.
- **Limit / prerequisite:** Not a causal employee performance score; source mix and partial-day bias must be visible.

### K04 — Order activity and commitments

- **Decision / owner:** Order activity and commitments decisions for Operations / buyer / sales manager. **State:** Existing operational order read model.
- **Definition and grain:** Count and sum orders in the documented confirmed-to-completed activity states; outstanding commitment derives unfulfilled quantities. Tenant/location/order status/period.
- **Sources, inclusions and corrections:** financial-order-activity.service.ts; order lines and fulfillment. An order is not cash or posted revenue; avoid counting same order again at each state; cancellation/partial delivery recompute remaining commitment.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On demand under consistent snapshot. Order/report permission.
- **Drill-through and reconciliation:** Order and fulfillment documents. Status population and full SQL totals independently agree.
- **Limit / prerequisite:** Existing full aggregation avoids an observed historical truncation issue; large-tenant latency unmeasured.

### K05 — Cash position and drawer variance

- **Decision / owner:** Cash position and drawer variance decisions for Cash manager / finance. **State:** Existing operational cash evidence; essential.
- **Definition and grain:** Expected cash = opening + evidenced cash inflows - evidenced cash outflows; counted - expected is variance; show uncounted sessions separately. Tenant/location/drawer/session/currency.
- **Sources, inclusions and corrections:** Cash sessions, cash transactions, payment/refund evidence. Do not classify all electronic payments as cash; corrections retain original movements; incomplete or inconsistent counts remain blocked/unknown.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On demand; after shift close/correction. Cash/finance permissions, cashier-limited scope.
- **Drill-through and reconciliation:** Session and classified movements. Opening + movement = expected; physical count variance ties to close evidence.
- **Limit / prerequisite:** Cashier report performanceScore is deliberately null; cash counts do not prove productivity or fraud.

### K06 — Settlement lag, fees and cash in transit

- **Decision / owner:** Settlement lag, fees and cash in transit decisions for Treasury / payments operations. **State:** Evidence sources exist; valuable after provider qualification.
- **Definition and grain:** Confirmed gross - refunds - fees/adjustments = expected net settlement; lag = settlement timestamp - provider confirmation timestamp. Provider/account/currency/batch/business day.
- **Sources, inclusions and corrections:** PaymentTransaction, ProviderEvent, StatementLine and matches. Keep UNKNOWN/PENDING separate; handle multi-settlement and reversals by source IDs; deduplicate callback/inbox evidence.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On ingestion and scheduled freshness scan. Treasury/reconciliation access.
- **Drill-through and reconciliation:** Provider event → statement line → match → journal. Per-currency gross/net/fees bridge ties to bank/provider statement and clearing accounts.
- **Limit / prerequisite:** No live provider settlement verified; fees and timing cannot be inferred from intent success.

### K07 — Reconciliation exceptions and suspense aging

- **Decision / owner:** Reconciliation exceptions and suspense aging decisions for Reconciliation owner / accountant. **State:** Existing workbenches/read models.
- **Definition and grain:** Unresolved amount and count by currency, owner, severity and age since first unresolved event; separately report signed-run coverage. Tenant/provider/currency/case/as-of.
- **Sources, inclusions and corrections:** ReconciliationRun, MatchRecord, SuspenseItem, PaymentException. Exclude withdrawn/voided decisions but retain history; reopened cases retain original age plus reopened duration; partial matches reduce residual only.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On event and daily aging refresh. Reconciliation permission + provider/tenant scope.
- **Drill-through and reconciliation:** Case evidence, resolution and sign-off version. Internal/external/matched/residual amounts reconcile; a signed label references current evidence.
- **Limit / prerequisite:** Current local sample has no signed run; certification evidence must not be synthesized.

### K08 — Low stock and inventory coverage

- **Decision / owner:** Low stock and inventory coverage decisions for Stock manager. **State:** Existing Business Pulse operational signal.
- **Definition and grain:** Count active tracked items at or below location reorder threshold using available quantity; separately count missing stock records. Tenant/location/item/as-of.
- **Sources, inclusions and corrections:** InventoryLevel, Item, reservations, thresholds. Do not count missing records as zero stock; exclude inactive/untracked items; approved stock corrections update projections.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** After stock event; freshness timestamp required. Inventory item/location permission.
- **Drill-through and reconciliation:** Item-location and movement history. Available = onHand - reserved; projection agrees with movement history.
- **Limit / prerequisite:** Reorder threshold is a signal, not a demand forecast or monetary loss estimate.

### K09 — Stock turnover, aging and replenishment

- **Decision / owner:** Stock turnover, aging and replenishment decisions for Inventory / procurement. **State:** Valuable after costing/lead-time prerequisites.
- **Definition and grain:** Turnover = period COGS / time-weighted average stock value; days of cover = available / reviewed demand rate; age uses receipt/layer evidence. Tenant/location/item/period/age bucket.
- **Sources, inclusions and corrections:** Inventory movements/cost history, receipts, demand, supplier lead time. Exclude stock transfers from consumption; reconcile write-offs and returns; intermittent demand produces explicit low confidence.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Daily snapshot with late-event invalidation. Inventory cost/procurement permission.
- **Drill-through and reconciliation:** Receipt, movement, demand window and costing evidence. Closing quantity/value ties to inventory and GL; layer/receipt aging sums to eligible stock.
- **Limit / prerequisite:** No full lot/layer allocation or forecast calibration established; do not invent expiry/age from item creation date.

### K10 — Shrinkage, stock loss and adjustment variance

- **Decision / owner:** Shrinkage, stock loss and adjustment variance decisions for Operations / stock control. **State:** Loss sources exist; valuable consolidated KPI.
- **Definition and grain:** Signed approved loss/write-off cost and count; physical count variance separately from unexplained financial loss. Tenant/location/item/reason/period.
- **Sources, inclusions and corrections:** StockCount, StockAdjustment, InventoryTransaction and source journals. Exclude transfers and legitimate sales; distinguish draft from approved/posted; reversal offsets original with links.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** After approval/posting and daily snapshot. Stock-control/cost permissions.
- **Drill-through and reconciliation:** Count sheet, approval, movement and posting. Approved source amounts and inventory/GL adjustment accounts agree.
- **Limit / prerequisite:** An adjustment is not proof of theft; reasons and unresolved evidence must remain visible.

### K11 — Supplier delivery reliability and purchasing commitments

- **Decision / owner:** Supplier delivery reliability and purchasing commitments decisions for Procurement manager. **State:** Partial source foundation; valuable.
- **Definition and grain:** OTIF = due lines received on time and in full / eligible due lines; outstanding commitment = approved unreceived quantity × agreed cost. Tenant/supplier/PO line/due cohort.
- **Sources, inclusions and corrections:** PurchaseOrder/Line, GoodsReceipt/Line, promised dates and cancellations. Partial receipts counted by line quantities; agreed-date changes versioned; exclude cancelled quantities and separate supplier returns.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Daily and receipt-driven refresh. Purchasing permission + cost scope.
- **Drill-through and reconciliation:** PO, acknowledgements and receipt evidence. Received/returned/outstanding quantities reconcile; no invoice/receipt double counting.
- **Limit / prerequisite:** Reliable promised-date history and unit conversion are prerequisites; zero denominator is unavailable.

### K12 — AR/AP aging and working capital

- **Decision / owner:** AR/AP aging and working capital decisions for Credit controller / accountant. **State:** Receivable/AP structures exist; essential finalization proof.
- **Definition and grain:** Open amount = posted obligation - valid allocations - credits + reversed allocations; age by due date at as-of; DSO/DPO only with consistent numerator/denominator. Tenant/counterparty/currency/document/as-of.
- **Sources, inclusions and corrections:** Receivable documents, customer ledger, SupplierInvoice, allocations, credit notes. Exclude draft obligations; apply later-recorded corrections according to explicit as-of/known-at policy; advances separate from invoice aging.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On posting/settlement/correction; daily aging. AR/AP permission and private counterparty scope.
- **Drill-through and reconciliation:** Document → allocation → payment/credit → journal. Subledger total agrees with control accounts, with explained timing/FX differences.
- **Limit / prerequisite:** Local AP is entirely draft; complete real-cycle tie-out still needed.

### K13 — Income statement, balance sheet and trial balance

- **Decision / owner:** Income statement, balance sheet and trial balance decisions for Accountant / finance owner. **State:** Implemented but incorrect FX semantics; essential correction.
- **Definition and grain:** Sum authoritative base amounts by account/report mapping including retained reversed originals and compensating entries; balance sheet includes accumulated earnings. Tenant/account/fiscal period/functional currency.
- **Sources, inclusions and corrections:** JournalEntry/Line, ChartOfAccount, posting sources and fiscal periods. Only eligible posted facts; opening balance and cutoff explicit; corrected entries retained; no nominal mixed-currency summation.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On demand or versioned close snapshot. Accounting reports; delegated grants/expiry and cost privacy.
- **Drill-through and reconciliation:** Statement line → account → journal → source. Independent trial balance and subledger bridges; assets = liabilities + equity is necessary but insufficient.
- **Limit / prerequisite:** F01/F07/F09; balanced report can still be materially wrong.

### K14 — Cash-flow statement

- **Decision / owner:** Cash-flow statement decisions for Accountant. **State:** Not established as a complete connected report; essential for professional suite.
- **Definition and grain:** Operating/investing/financing flows using a reviewed direct or indirect method; reconcile opening and closing cash with FX/noncash adjustments. Tenant/functional currency/fiscal period.
- **Sources, inclusions and corrections:** Posted cash/bank journals, balance-sheet movements and classification rules. Do not equate sales or bank inflows with operating cash flow; exclude internal bank transfers and disclose noncash/FX items.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Close snapshot; controlled reissue on corrections. Accounting financial statement permission.
- **Drill-through and reconciliation:** Classified cash journals and adjustment schedule. Opening cash + classified net flows + FX = closing cash.
- **Limit / prerequisite:** Requires F01 and reviewed classification plus source completeness; do not fill missing cash flows with zeros.

### K15 — Payroll cost and headcount

- **Decision / owner:** Payroll cost and headcount decisions for HR / payroll / finance. **State:** Partial existing payroll analytics; essential scope clarity.
- **Definition and grain:** Cost = eligible payroll gross + employer charges; paid cash separate from accrued expense; headcount uses effective active employment at as-of. Tenant/branch/department/period with privacy threshold.
- **Sources, inclusions and corrections:** PayrollRun/Line snapshots, contracts and employee assignments. Separate draft estimates, approved calculations and posted/paid facts; corrections use explicit adjustment runs; avoid joining mutable current compensation to old runs.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On transition; daily headcount snapshot. Payroll aggregates; employee detail restricted to HR/self-service.
- **Drill-through and reconciliation:** Aggregated run/department to authorized snapshot/payslip. Run = register = payslips; posted cost and liability tie to GL; paid allocation ties separately.
- **Limit / prerequisite:** CM qualifications and minimum cohort privacy; current sample has zero final runs.

### K16 — Attendance, leave and workforce trends

- **Decision / owner:** Attendance, leave and workforce trends decisions for HR / managers within effective scope. **State:** HRIS source records exist; valuable after definitions/privacy approval.
- **Definition and grain:** Absence rate = eligible absent scheduled hours / scheduled hours; leave balance = entitlement + approved adjustments - consumed leave. Tenant/team/period; employee only when authorized.
- **Sources, inclusions and corrections:** Approved attendance/leave, schedules, employment movements. Exclude missing input from absence numerator and show completeness; retroactive approval recomputes with version; effective team membership required.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** On approval; daily aggregates. HR/manager/employee scope, small-cohort suppression.
- **Drill-through and reconciliation:** Authorized time/leave events and approval trail. Approved inputs reconcile with payroll attendance snapshot and leave ledger.
- **Limit / prerequisite:** No inference of worker quality or health; incomplete schedules prevent a meaningful rate.

### K17 — Close progress, evidence freshness and integration reliability

- **Decision / owner:** Close progress, evidence freshness and integration reliability decisions for Finance controller / SRE / support. **State:** Existing evidence/snapshot contracts; essential operational view.
- **Definition and grain:** Count required current checks by status, unresolved age and source completeness; worker lag/failure/retry/dead-letter counts by channel. Tenant/period/source/check/worker/as-of.
- **Sources, inclusions and corrections:** Close assurance, business events/outbox, snapshots, exception evidence. Separate unknown from failed and waived from passed; invalidate stale source versions; retry attempts do not equal distinct failures.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Event-driven plus bounded scheduled refresh. Finance or operational support scope; redact HR/provider secrets.
- **Drill-through and reconciliation:** Blocker → source evidence → authorized repair command. Displayed counts reconcile with source states and current version; stale cannot be certified.
- **Limit / prerequisite:** Actual deployed workers, alerts and SLOs unverified; avoid unsupported readiness percentages.

### K18 — Budget versus actual and scenario cash forecast

- **Decision / owner:** Budget versus actual and scenario cash forecast decisions for Owner / FP&A. **State:** Valuable after corrected accounting; not required before core fixes.
- **Definition and grain:** Actuals from corrected posted accounts; variance = actual - approved versioned budget; forecast projects opening cash plus dated scenario receipts/payments. Tenant/account/cost center/month/scenario/version.
- **Sources, inclusions and corrections:** Ledger, versioned budget inputs, AR/AP due dates, commitments and payroll obligations. Separate forecast from actual; no double counting invoice, PO and payment; revisions preserve earlier assumptions and outcomes.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Monthly budget; weekly forecast or material events. Finance planning permission.
- **Drill-through and reconciliation:** Budget version, assumption and source obligations. Actual column agrees with K13; forecast opening agrees with reconciled cash; backtest error and coverage disclosed.
- **Limit / prerequisite:** Dedicated budget model not found; require customer need, scenario assumptions and forecast validation before build.

### K19 — Customer retention and repeat purchase

- **Decision / owner:** Customer retention and repeat purchase decisions for Commercial owner. **State:** Optional after identity/consent/data-quality foundations.
- **Definition and grain:** Repeat-purchase rate or cohort retention from distinct opted/eligible customer identities and qualifying completed purchases in fixed windows. Tenant/customer cohort/month with aggregation.
- **Sources, inclusions and corrections:** Customer identity, completed orders, returns and consent/merge history. Anonymous cash transactions excluded/disclosed; customer merge and returns policy versioned; no cross-tenant identity sharing.
- **Currency / period:** common contract above; per-source currency for operational/treasury, approved functional currency for posted statements; period/as-of as specified in grain.
- **Refresh / permission:** Monthly snapshot and controlled late-correction refresh. Commercial analytics consent and authorized aggregates.
- **Drill-through and reconciliation:** Cohort definition and eligible transaction list. Distinct cohort totals reconcile to qualifying identified purchases.
- **Limit / prerequisite:** Not a priority over financial correctness; anonymous traffic and incomplete history can make the metric misleading.

## Scope choices

**Essential completions:** correct source/FX/return-aware sales and margin, cash and exception visibility, inventory coverage, final AR/AP aging, reproducible financial statements/cash flow, payroll cost classification and current close/data freshness. These complete existing operating/finance promises.

**Valuable after prerequisites:** turnover/aging/replenishment, supplier OTIF, working-capital ratios, privacy-safe workforce trends, budgets and scenario cash forecast. Build only after definitions, effective histories and reconciliations are reliable.

**Optional or unsuitable now:** a general data warehouse, multi-entity consolidation, manufacturing/MRP, broad automated credit decisions, and customer cohort analytics without identity/consent quality. Employee performance scores inferred from cash variances or attendance are unsuitable. No new KPI justifies bypassing an unresolved source-control defect.
