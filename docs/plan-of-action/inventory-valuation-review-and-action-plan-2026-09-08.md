# Inventory, transfers, counts and valuation: review and plan of action

**Prepared:** 8 September 2026. **Package:** INV. **Status:** SOURCE_REVIEW_AND_FOCUSED_VERIFICATION; implementation not started by this run.

## 1. Assessment and scope

This is a source review and focused local verification, not a full runtime certification. Database clients in the selected tests are mocked or injected. No deployed database, authenticated browser, live provider, production telemetry, restore rehearsal or qualified statutory approval was inspected in this run. Unexecuted scenarios below are acceptance requirements, not test results. No application code, migration, business record or deployment is changed by this report.

**Accountable roles:** Inventory engineering and stock controller. **Catalog coverage:** inventory

**Selected verification:** 8 passed, 1 failed in the selected suite. [Test source](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-stock-event.service.test.ts>). This package owns or consumes PM-INV-001.

The highest-risk review questions are separate available, reserved and owned stock under concurrent requests; reconcile physical quantity and value independently; test negative stock, backdating, missing costs and closed-period reversal.

## 2. Source and architecture map

The source inventory contains 74 matching files, including tests and supporting files. 7 sources were hashed and indexed for targeted review. Prefix inventory counts are discovery aids, not reviewed-file counts. The full list and source hashes are in [the source manifest](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/source-manifest.json>).

| Layer | Current source/navigation anchor | Evidence boundary |
|---|---|---|
| services | [services/inventory/inventory-stock-event.service.ts](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-stock-event.service.ts:1>) | 1184 lines; SHA-256 142fa04b3294… |
| hooks | [hooks/useInventoryMovementQueries.ts](<E:/ohada saas/Focused projects/stoquify/hooks/useInventoryMovementQueries.ts:3>) | 143 lines; SHA-256 75fcde1c6599… |
| actions | [actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts](<E:/ohada saas/Focused projects/stoquify/actions/inventory/inventoryMovementHistoryBackgroundExportActions.ts:3>) | 194 lines; SHA-256 be7fcaddac60… |
| actions | [actions/inventory/inventoryMovementHistoryActions.ts](<E:/ohada saas/Focused projects/stoquify/actions/inventory/inventoryMovementHistoryActions.ts:3>) | 103 lines; SHA-256 0a45f047c83e… |
| hooks | [hooks/useTransferQueries.ts](<E:/ohada saas/Focused projects/stoquify/hooks/useTransferQueries.ts:3>) | 176 lines; SHA-256 3fd0fa305bee… |
| components | [components/inventory/EnhancedCategoriesManagement.tsx](<E:/ohada saas/Focused projects/stoquify/components/inventory/EnhancedCategoriesManagement.tsx:3>) | 320 lines; SHA-256 efa8d0294904… |
| components | [components/inventory/EnhancedBrandsManagement.tsx](<E:/ohada saas/Focused projects/stoquify/components/inventory/EnhancedBrandsManagement.tsx:3>) | 319 lines; SHA-256 8c4fc4e06a82… |

Route/API paths must be expanded from callers; absence from the selected prefix inventory is not a declaration that none exist.

### Data declarations

| Schema model | Selected declared storage/relationship facts |
|---|---|
| [Item](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:784>) | weight     Decimal? @db.Decimal(12, 3); costPrice    Decimal  @default(0) @db.Decimal(12, 2); sellingPrice Decimal  @default(0) @db.Decimal(12, 2) |
| [InventoryLevel](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:888>) | item       Item     @relation(fields: [itemId], references: [id], onDelete: Cascade); location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade); quantityOnHand    Decimal @default(0) @db.Decimal(12, 3) |
| [InventoryTransaction](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:924>) | quantity       Decimal                            @db.Decimal(12, 3) // signed: + inbound, - outbound; unitCost       Decimal                            @default(0) @db.Decimal(12, 2); totalCost      Decimal                            @default(0) @db.Decimal(14, 2) |
| [SerialNumber](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:1020>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, serialNumber]) // unique per org, not globally; @@index([itemId]) |
| [StockAdjustment](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4473>) | reversalOfAdjustment   StockAdjustment?               @relation("StockAdjustmentReversal", fields: [reversalOfAdjustmentId], references: [id], onDelete: Restrict); @@unique([organizationId, adjustmentNumber]); @@index([organizationId, status, adjustmentDate]) |
| [StockAdjustmentLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4556>) | adjustment   StockAdjustment @relation(fields: [adjustmentId], references: [id], onDelete: Cascade); systemQuantity   Decimal  @db.Decimal(12, 3); actualQuantity   Decimal  @db.Decimal(12, 3) |
| [StockCountSession](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4582>) | organization   Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade); @@unique([organizationId, countNumber]); @@index([organizationId, status, countDate]) |
| [StockCountLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4630>) | stockCountSession   StockCountSession @relation(fields: [stockCountSessionId], references: [id], onDelete: Cascade); systemQuantity   Decimal  @db.Decimal(12, 3); countedQuantity  Decimal? @db.Decimal(12, 3) |
| [StockTransfer](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4664>) | @@unique([organizationId, transferNumber]); @@index([organizationId, status, transferDate]); @@index([fromLocationId]) |
| [StockTransferLine](<E:/ohada saas/Focused projects/stoquify/prisma/schema.prisma:4713>) | transfer   StockTransfer @relation(fields: [transferId], references: [id], onDelete: Cascade); requestedQuantity Decimal  @db.Decimal(12, 3); shippedQuantity   Decimal  @default(0) @db.Decimal(12, 3) |

These are schema declarations. Exact migration application, actual constraints/indexes, row populations, query plans and direct-write bypasses remain unverified. See the platform package for migration/restore ownership.

### Workflow trace and handoffs

The diagram is the review boundary and required end-to-end trace. Source links and selected tests substantiate only the portions described in this report; it does not claim every edge was exercised.

```mermaid
flowchart LR
  A["Business trigger / source"] --> B["Fresh tenant and role authority"]
  B --> C["INV: owning domain service"]
  C --> D["Transaction and source evidence"]
  D --> E["Event / dependent workflow"]
  D --> F["Read model / query scope"]
  F --> G["UI / export / recovery"]
  E --> H["Reconciliation / assurance"]
```

| Workflow | Expected outcome | Evidence disposition |
|---|---|---|
| INV-FLOW-1 | Receive, reserve, issue and return through the owning stock-event service | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| INV-FLOW-2 | Transfer stock with reconciled source, in-transit and destination quantities | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |
| INV-FLOW-3 | Count and adjust with costs, reasons, review and close invalidation | Source navigation and selected mocked/injected assertions only; full end-to-end scenario remains unverified |

**Integration contracts:** [IAM — Identity, tenant access, settings and administration](identity-settings-admin-review-and-action-plan-2026-09-08.md); [MOD — Module lifecycle, packaging and billing boundaries](module-lifecycle-billing-review-and-action-plan-2026-09-08.md); [EVT — Events, recovery, migrations and platform operations](events-platform-reliability-review-and-action-plan-2026-09-08.md). These identify validation/ownership interfaces, not permission to duplicate their implementations. Accounting remains owned by [the existing accounting roadmap](accounting-correction-execution-roadmap-2026-09-08.md).

**Graph navigation:** graph_actions.json node `inventory_inventorymovementhistoryactions_ts`, community 72 (L1); graph_actions.json node `inventory_inventorymovementhistoryactions_asrecord`, community 72 (L25); graph_components.json node `inventory_enhancedbrandsmanagement_tsx`, community 85 (L1); graph_components.json node `inventory_enhancedbrandsmanagement_downloadcsv`, community 85 (L37); graph_hooks.json node `useinventorymovementqueries_ts`, community 27 (L1); graph_hooks.json node `hooks_useinventorymovementqueries_getactionerrormessage`, community 27 (L22). Graph extracts predate this review and are not runtime proof.

## 3. Controls to preserve

The following assertions passed against mocks/injected clients in this run. Preserve their contracts while extending validation; test names are not broader certification claims.

- posts opening stock through business-event evidence and an explicit ledger blocker.
- posts purchase receipt stock through the inventory kernel with receipt evidence and a blocker.
- posts a source-linked purchase return as a negative inventory movement tied to the AP batch.
- reverses a purchase return by restoring stock and referencing the exact original movement.

## 4. Findings, limitations and risks

### PM-INV-001 — Inventory idempotency-conflict test fails while recording anomaly evidence

**CONFIRMED_VERIFICATION_FAILURE · P1.** Confidence: High for failing test; deployed defect not established. Likelihood: Reproduced in the local fixture; deployed frequency unknown.

**Evidence:** [services/inventory/__tests__/inventory-stock-event.service.test.ts:431](<E:/ohada saas/Focused projects/stoquify/services/inventory/__tests__/inventory-stock-event.service.test.ts:431>); [services/events/business-event-anomaly.service.ts:119](<E:/ohada saas/Focused projects/stoquify/services/events/business-event-anomaly.service.ts:119>); [services/inventory/inventory-stock-event.service.ts:692](<E:/ohada saas/Focused projects/stoquify/services/inventory/inventory-stock-event.service.ts:692>).

**Trigger:** The focused test reuses a stock event key with a different payload hash.

**Expected:** A conflicting replay is rejected without stock mutation, and durable conflict evidence survives the required transaction outcome.

**Observed:** Expected an idempotency-key conflict; received Business-event conflict evidence could not be recorded. The later assertions about stock mutation are not reached after the failed expectation.

**Cause / uncertainty:** Unresolved interaction between the fixture evidence client and the current anomaly-recording contract.

**Consequences:** The current verification packet cannot prove this financial/stock retry boundary. A stale test mock is plausible; a real evidence failure must be ruled out.

**Existing mitigation:** The operation rejects in the observed test; other stock and outbox checks pass. Rejection alone does not establish complete evidence retention.

**Correction:** Inspect injected versus independent evidence clients, update obsolete fixtures only if confirmed, and add an isolated PostgreSQL replay/rollback scenario before changing runtime logic.

**Acceptance:** Identical replay is idempotent; changed payload returns the intended safe conflict; quantities/ledger effects stay unchanged and the required conflict evidence is queryable after rollback.

**Owner / estimate:** Inventory and event-platform engineering; 1–2 engineering days for diagnosis; any runtime fix and DB validation sized after reproduction. Estimates are planning judgments, not booked capacity.

**Data and rollout:** No stock backfill justified by this test alone. If a real defect is confirmed, investigate source IDs and quantities before authorizing repair.

**Related earlier work:** ACC-015


### Additional module scenarios still requiring verification

- **INV-VERIFY-1:** Separate available, reserved and owned stock under concurrent requests. Owner: Inventory engineering and stock controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **INV-VERIFY-2:** Reconcile physical quantity and value independently. Owner: Inventory engineering and stock controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.
- **INV-VERIFY-3:** Test negative stock, backdating, missing costs and closed-period reversal. Owner: Inventory engineering and stock controller. Status: UNVERIFIED. Evidence required: a synthetic failure/success pair and source-to-result tie-out.

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
| QA and release | 8 passed, 1 failed in the selected suite. linked test source. Unit results do not replace integrated evidence. |
| SRE, performance and cost | No latency/load/restore measurements; establish bounded reads, worker age/error metrics, alerts, retries and support ownership before rollout. |
| AI and agent authority | AI model behavior is not applicable unless a connected agent consumes this module; review that access contract without adding AI features. |
| Packaging, billing and operations | Confirm actual catalog/entitlement scope and mandatory retained obligations. Provider billing, adoption and customer outcomes are unverified. |

## 6. Ordered execution plan

### PM-INV-01 — Bind current scope, owners and candidate

**Status:** READY. **Owner:** Inventory engineering and stock controller. **Effort:** 1–2 reviewer days.

**Deliverable:** Confirm every listed workflow, supported variant and relevant prior ACC/ACR or STQ-RM item; hash current sources, map entry points and name a domain reviewer.

**Acceptance:** All material paths have active/legacy/deferred status; no existing change is overwritten.

**Prerequisite:** Candidate/owner availability; existing historical evidence is a lead.. 

### PM-INV-02 — Reproduce priority risks and freeze contracts

**Status:** PLANNED. **Owner:** Inventory engineering and stock controller. **Effort:** 2–4 reviewer/QA days; isolated environments may extend elapsed time.

**Deliverable:** Separate available, reserved and owned stock under concurrent requests; Reconcile physical quantity and value independently; Test negative stock, backdating, missing costs and closed-period reversal. Reproduce all linked findings before prescribing data repair.

**Acceptance:** A scenario ledger records expected/observed behavior, source IDs, denied side effects and remaining blockers.

**Prerequisite:** PM-INV-01. 

### PM-INV-03 — Implement verified corrections and investigate affected data

**Status:** CONDITIONAL_ON_CONFIRMED_FINDINGS. **Owner:** Inventory engineering and stock controller. **Effort:** Use linked finding estimates; otherwise estimate after diagnosis.

**Deliverable:** Correct the smallest owning boundary; preserve domain history, shared controls and public contracts. Investigate historical impact separately and design reversible repair only if needed.

**Acceptance:** Focused regression, cross-module tie-out and review prove the correction; no speculative implementation or silent historical rewrite.

**Prerequisite:** PM-INV-02. If no defect is confirmed, record a reviewed no-change disposition; this satisfies the decision step without speculative work.

### PM-INV-04 — Verify integrated release and controlled rollout

**Status:** PLANNED. **Owner:** Inventory engineering and stock controller. **Effort:** 2–3 reviewer/QA days plus the real operational cycle.

**Deliverable:** Run isolated DB failure/concurrency scenarios, authenticated role/locale/cache tests, representative performance/export checks and recovery rehearsal. Pilot the agreed supported scope.

**Acceptance:** No unexplained material mismatch, unauthorized effect or stale evidence claim; domain reviewer and operations owner accept scoped results.

**Prerequisite:** PM-INV-03. 

Existing accounting and enterprise roadmap estimates must be deduplicated: PM findings linked to ACC/ACR or STQ-RM reuse the owning task. Reviewer-day estimates here are not engineering effort for a complete rewrite and must not be summed with the accounting roadmap as if independent.

## 7. Data correction, rollout and completion

Investigate exposure using source IDs, time/currency scope, counts and reconciled totals before proposing any repair. Preserve original records, hashes and exports; use reviewed corrective transactions or versioned migration only where necessary. Rehearse backup/restore and rollback in a disposable environment. Code correction and historical reconciliation are separate acceptance items. A query/display issue alone does not justify rewriting financial history.

Start with an agreed eligible pilot and observe a complete relevant cycle (sale/refund/shift; receiving/invoice/payment; payroll period; or close). Stop expansion on unauthorized effects, unexplained material mismatches, duplicate effects or stale proof. Record incident owner, recovery route and the data needed for investigation. No pilot or release is authorized or completed by this document.

Completion requires disposition for every workflow, current-source evidence for each significant claim, tested or explicit blocked failure scenarios, domain-reviewed corrective work and an understood operational handoff. [The tailored audit prompt](inventory-valuation-audit-execution-prompt-2026-09-08.md) provides the full repeatable execution brief.

## 8. Evidence and provenance

Commit: `a05a41ef66cd5d98fd69ae3df18225795f912232`; branch: `codex/migration-control-plane-release-2026-08-29`. Initial capture: 2026-09-08T14:41:48.494Z. Dirty workspace preserved; claims bind to file hashes, not clean HEAD. Unit command: 2026-09-08T14:43:08.844Z to 2026-09-08T14:44:14.458Z; exit 1. See [exact command](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-command.json>), [assertion results](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.json>), [test log](<E:/ohada saas/Focused projects/stoquify/what-next/platform-module-audit/2026-09-08-run-01/focused-tests.log>) and [shared evidence index](platform-module-evidence-index-2026-09-08.md). Historical reports were used for navigation and work deduplication; their earlier pass counts are not included in this run.
