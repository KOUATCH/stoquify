# Sales orders, reservations, delivery and billing: review and plan of action

**Prepared:** 8 September 2026. **Package:** SAL. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Order-to-cash engineering and sales operations. **Catalog coverage:** sales

**Selected verification:** 7 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/order-to-cash/__tests__/delivery-order.service.test.ts>). No additional defect was confirmed in the selected slice; that is not evidence that the complete module is correct.

The highest-risk review questions are reservation is not goods issue or revenue recognition; test concurrent confirm, repeated billing, partial delivery and late cancellation; document supported partial-order variants before promising them.

## 2. Source and architecture map

The source inventory contains 6 matching files, including tests and supporting files. 3 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/order-to-cash/delivery-order.service.ts](<E:/ohada saas/Focused projects/stoquify/services/order-to-cash/delivery-order.service.ts:1>) | 935 lines; SHA-256 f7529c1f9c3a… |
| actions | [actions/order-to-cash/delivery-order.actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/order-to-cash/delivery-order.actions.ts:3>) | 172 lines; SHA-256 36edda8e394b… |
| components | [components/sales/CompleteIntegratedDailySalesDashboard.tsx](<E:/ohada saas/Focused projects/stoquify/components/sales/CompleteIntegratedDailySalesDashboard.tsx:3>) | 4 lines; SHA-256 7a0b62fc0b51… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [SalesOrder](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4018>) | subtotal     Decimal @default(0) @db.Decimal(14, 2); taxAmount    Decimal @default(0) @db.Decimal(14, 2); shippingCost Decimal @default(0) @db.Decimal(14, 2) |
| [SalesOrderLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4143>) | salesOrder   SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Cascade); quantity          Decimal @db.Decimal(12, 3); unitPrice         Decimal @db.Decimal(12, 2) |
| [DeliveryReservation](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4179>) | salesOrder     SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict); @@unique([organizationId, salesOrderId]); @@unique([organizationId, commandEventId]) |
| [DeliveryReservationLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4207>) | reservation      DeliveryReservation @relation(fields: [reservationId], references: [id], onDelete: Restrict); salesOrderLine   SalesOrderLine      @relation(fields: [salesOrderLineId], references: [id], onDelete: Restrict); quantity         Decimal @db.Decimal(12, 3) |
| [DeliveryGoodsIssue](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4233>) | salesOrder     SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict); totalCost      Decimal                @default(0) @db.Decimal(14, 2); reversalOfGoodsIssue   DeliveryGoodsIssue? @relation("DeliveryGoodsIssueReversal", fields: [reversalOfGoodsIssueId], references: [id], onDelete: Restrict) |
| [DeliveryGoodsIssueLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4267>) | goodsIssue       DeliveryGoodsIssue @relation(fields: [goodsIssueId], references: [id], onDelete: Restrict); salesOrderLine   SalesOrderLine     @relation(fields: [salesOrderLineId], references: [id], onDelete: Restrict); quantity               Decimal @db.Decimal(12, 3) |
| [DeliveryBillingOutcome](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4295>) | salesOrder     SalesOrder @relation(fields: [salesOrderId], references: [id], onDelete: Restrict); subtotal       Decimal               @db.Decimal(14, 2); taxAmount      Decimal               @db.Decimal(14, 2) |
| [DeliveryBillingLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4330>) | billingOutcome   DeliveryBillingOutcome @relation(fields: [billingOutcomeId], references: [id], onDelete: Restrict); salesOrderLine   SalesOrderLine         @relation(fields: [salesOrderLineId], references: [id], onDelete: Restrict); deliveredQuantity Decimal @db.Decimal(12, 3) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["SAL: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| SAL-FLOW-1 | Create and confirm orders from tenant-owned customer, item, price and tax facts | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| SAL-FLOW-2 | Reserve availability, issue goods and retain quantity/cost evidence | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| SAL-FLOW-3 | Bill delivered goods once and establish receivable, ledger and fiscal evidence | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [MOD — Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md); [INV — Inventory, transfers, counts and valuation](inventory-valuation-review-and-action-plan-2026-09-08.md); [CUS — Customers, receivables, statements and settlement](customers-receivables-review-and-action-plan-2026-09-08.md); [CMP — Fiscal documents, compliance and country packs](compliance-country-packs-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_components.json node `sales_completeintegrateddailysalesdashboard_tsx`, community 243 (L1). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- governed delivery order service stops a new delivery order before creating or reserving anything.
- governed delivery order service returns an existing creation command before considering a new-work stop.
- governed delivery order service returns the original tenant-scoped result for an identical duplicate command.
- governed delivery order service rejects a command key reused with a different payload before any stock change.

## 4. Findings, limitations and risks

No new confirmed defect is assigned in the sampled evidence. The following scenarios remain material verification requirements; they must not be reclassified as observed incidents or accepted controls without tests.

### Additional module scenarios still requiring verification

- **SAL-VERIFY-1:** Reservation is not goods issue or revenue recognition. Owner: Order-to-cash engineering and sales operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **SAL-VERIFY-2:** Test concurrent confirm, repeated billing, partial delivery and late cancellation. Owner: Order-to-cash engineering and sales operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **SAL-VERIFY-3:** Document supported partial-order variants before promising them. Owner: Order-to-cash engineering and sales operations. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

## 5. Layer and reviewer dispositions

| Lens | Current disposition and remaining proof |
|---|---|
| Architecture, backend and integrations | Sources/call boundaries inventoried; selected service assertions above. Trace alternate entry points and every handoff before whole-domain approval. |
| Database, migration and integrity | Named schema models indexed. Deployment, tenant-consistent foreign keys, locking, rollback, scale and backfill/restore not verified. |
| IAM, privacy, fraud and controls | Apply direct denied-no-read/no-write, role revocation, maker-checker and export redaction tests. A server guard or hidden button alone is insufficient. |
| Frontend, queries and design system | Client/action entry above inspected statically where present; cache identity, mutation effects and source truth must be traced into actual screens. |
| UX, accessibility, EN/FR and content | Authenticated role tasks, keyboard/focus, mobile and localized state behavior not executed; no accessibility claim. |
| Product and business process | Three explicit workflows and supported-scope decisions above; measure task completion and support burden before redesign. |
| Accounting and financial controls | Source/amount/quantity/period/currency tie-outs and correction ownership apply; reuse ACC/ACR controls. |
| Statutory and country review | No new statutory interpretation is made. Escalate any discovered country-specific output to CMP/qualified review. |
| QA and release | 7 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-SAL-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Order-to-cash engineering and sales operations. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-SAL-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Order-to-cash engineering and sales operations. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Reservation is not goods issue or revenue recognition; Test concurrent confirm, repeated billing, partial delivery and late cancellation; Document supported partial-order variants before promising them. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-SAL-01. 

### PM-SAL-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Order-to-cash engineering and sales operations. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-SAL-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-SAL-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Order-to-cash engineering and sales operations. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-SAL-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](sales-fulfillment-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
