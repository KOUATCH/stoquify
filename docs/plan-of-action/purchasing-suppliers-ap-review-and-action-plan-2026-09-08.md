# Purchasing, supplier collaboration and AP: review and plan of action

**Prepared:** 8 September 2026. **Package:** PUR. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Purchasing engineering, procurement and AP controller. **Catalog coverage:** purchasing

**Selected verification:** 43 passed, 0 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/purchasing/__tests__/ap-control.service.test.ts>). No additional defect was confirmed in the selected slice; that is not evidence that the complete module is correct.

The highest-risk review questions are separate receiving, invoice and payment authority; independently review bank changes; prove corrections preserve stock, AP balance and ledger lineage under retry; rebaseline ongoing AP edits before declaring historical failures fixed.

## 2. Source and architecture map

The source inventory contains 164 matching files, including tests and supporting files. 7 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/purchasing/ap-control.service.ts](<E:/ohada saas/Focused projects/stoquify/services/purchasing/ap-control.service.ts:1>) | 3919 lines; SHA-256 c74a17942611… |
| hooks | [hooks/useRecentPurchaseOrderQueries.ts](<E:/ohada saas/Focused projects/stoquify/hooks/useRecentPurchaseOrderQueries.ts:2>) | 939 lines; SHA-256 a334e694c62e… |
| actions | [actions/suppliers/supplier-management-actions.ts](<E:/ohada saas/Focused projects/stoquify/actions/suppliers/supplier-management-actions.ts:3>) | 429 lines; SHA-256 8e7067b9a896… |
| actions | [actions/suppliers/itemSupplierActions.ts](<E:/ohada saas/Focused projects/stoquify/actions/suppliers/itemSupplierActions.ts:3>) | 263 lines; SHA-256 be28191cb968… |
| hooks | [hooks/useAPHistoryWorkbench.ts](<E:/ohada saas/Focused projects/stoquify/hooks/useAPHistoryWorkbench.ts:3>) | 113 lines; SHA-256 664d8a4a5a97… |
| components | [components/purchasing/APControlWorkbench.tsx](<E:/ohada saas/Focused projects/stoquify/components/purchasing/APControlWorkbench.tsx:3>) | 554 lines; SHA-256 0fb7561901c9… |
| components | [components/purchase-orders/purchase-order-money.ts](<E:/ohada saas/Focused projects/stoquify/components/purchase-orders/purchase-order-money.ts:1>) | 12 lines; SHA-256 de4278efa9c5… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [Supplier](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1061>) | creditLimit   Decimal? @db.Decimal(14, 2); currentBalance Decimal @default(0) @db.Decimal(14, 2); organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade) |
| [PurchaseOrder](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1383>) | subtotal     Decimal @default(0) @db.Decimal(14, 2); taxAmount    Decimal @default(0) @db.Decimal(14, 2); shippingCost Decimal @default(0) @db.Decimal(14, 2) |
| [PurchaseOrderLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1450>) | purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade); orderedQuantity  Decimal @db.Decimal(12, 3); receivedQuantity Decimal @default(0) @db.Decimal(12, 3) |
| [GoodsReceipt](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1723>) | @@unique([organizationId, receiptNumber]); @@unique([organizationId, id]); @@unique([organizationId, idempotencyKey]) |
| [GoodsReceiptLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1791>) | goodsReceipt        GoodsReceipt      @relation(fields: [goodsReceiptId], references: [id], onDelete: Cascade); receivedQuantity Decimal   @db.Decimal(12, 3); unitCost         Decimal   @db.Decimal(12, 2) |
| [SupplierInvoice](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2014>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict); subtotal   Decimal @default(0) @db.Decimal(14, 2) |
| [SupplierInvoiceLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2072>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); supplierInvoice   SupplierInvoice @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade); quantity    Decimal             @db.Decimal(12, 3) |
| [ThreeWayMatch](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2112>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); supplierInvoice   SupplierInvoice @relation(fields: [supplierInvoiceId], references: [id], onDelete: Cascade); toleranceAmount  Decimal @default(0) @db.Decimal(14, 2) |
| [SupplierInvoiceMatchException](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2153>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); supplierInvoice   SupplierInvoice @relation(fields: [organizationId, supplierInvoiceId], references: [organizationId, id], onDelete: Restrict); threeWayMatch   ThreeWayMatch @relation(fields: [organizationId, threeWayMatchId], references: [organizationId, id], onDelete: Restrict) |
| [SupplierPayment](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2195>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict); amount        Decimal               @db.Decimal(14, 2) |
| [PurchaseReturn](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2271>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict, map: "purchase_returns_organizationId_fkey"); purchaseOrder   PurchaseOrder @relation(fields: [organizationId, purchaseOrderId], references: [organizationId, id], onDelete: Restrict, map: "purchase_returns_po_tenant_fkey"); goodsReceipt   GoodsReceipt @relation(fields: [organizationId, goodsReceiptId], references: [organizationId, id], onDelete: Restrict, map: "purchase_returns_receipt_tenant_fkey") |
| [SupplierCreditNote](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:2360>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict, map: "supplier_credit_notes_organizationId_fkey"); supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict, map: "supplier_credit_notes_supplierId_fkey"); purchaseOrder   PurchaseOrder @relation(fields: [organizationId, purchaseOrderId], references: [organizationId, id], onDelete: Restrict, map: "supplier_credit_notes_po_tenant_fkey") |
| [SupplierPoEnvelope](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1513>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Restrict); purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Restrict); supplier   Supplier @relation(fields: [supplierId], references: [id], onDelete: Restrict) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["PUR: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| PUR-FLOW-1 | Approve and issue orders; accept supplier proposals through buyer review | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| PUR-FLOW-2 | Inspect partial receipts and match invoices to received quantity and price | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| PUR-FLOW-3 | Approve exceptions and payments, then process returns/credits through source-owned corrections | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [MOD — Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md); [INV — Inventory, transfers, counts and valuation](inventory-valuation-review-and-action-plan-2026-09-08.md); [PAY — Providers, statements, matching and suspense](payments-reconciliation-review-and-action-plan-2026-09-08.md); [COM — Notifications, collaboration and referral outcomes](communications-referrals-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_actions.json node `suppliers_itemsupplieractions_ts`, community 18 (L1); graph_actions.json node `suppliers_itemsupplieractions_getitemsupplieractionerrormessage`, community 18 (L39); graph_components.json node `purchasing_apcontrolworkbench_tsx`, community 25 (L1); graph_components.json node `purchasing_apcontrolworkbench_localekey`, community 25 (L95); graph_hooks.json node `useaphistoryworkbench_ts`, community 10 (L1); graph_hooks.json node `hooks_useaphistoryworkbench_parseaphistorysearchparams`, community 10 (L23). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- ap-control.service rejects changed approval source total before financial effects.
- ap-control.service rejects changed approval source tax before financial effects.
- ap-control.service rejects changed approval source scope before financial effects.
- ap-control.service rejects changed approval source ambiguous before financial effects.

## 4. Findings, limitations and risks

No new confirmed defect is assigned in the sampled evidence. The following scenarios remain material verification requirements; they must not be reclassified as observed incidents or accepted controls without tests.

### Additional module scenarios still requiring verification

- **PUR-VERIFY-1:** Separate receiving, invoice and payment authority; independently review bank changes. Owner: Purchasing engineering, procurement and AP controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **PUR-VERIFY-2:** Prove corrections preserve stock, AP balance and ledger lineage under retry. Owner: Purchasing engineering, procurement and AP controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **PUR-VERIFY-3:** Rebaseline ongoing AP edits before declaring historical failures fixed. Owner: Purchasing engineering, procurement and AP controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| QA and release | 43 passed, 0 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-PUR-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Purchasing engineering, procurement and AP controller. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-PUR-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Purchasing engineering, procurement and AP controller. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Separate receiving, invoice and payment authority; independently review bank changes; Prove corrections preserve stock, AP balance and ledger lineage under retry; Rebaseline ongoing AP edits before declaring historical failures fixed. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-PUR-01. 

### PM-PUR-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Purchasing engineering, procurement and AP controller. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-PUR-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-PUR-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Purchasing engineering, procurement and AP controller. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-PUR-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](purchasing-suppliers-ap-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
