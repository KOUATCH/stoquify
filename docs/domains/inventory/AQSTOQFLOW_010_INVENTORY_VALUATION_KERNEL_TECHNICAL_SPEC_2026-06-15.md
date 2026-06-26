# AqStoqFlow 010 Inventory Valuation Kernel Technical Spec

Date: 2026-06-15

Workspace: `E:\ohada saas\newStockFlow\aqstoqflow`

Target future skill: `010-aqstoqflow-inventory-valuation-kernel`

Status: Technical architecture spec for the 010 hard stop. This document is intended to become the source material for a Codex skill that can implement or audit the inventory valuation kernel.

## 1. Purpose

The suite stopped at `010-aqstoqflow-inventory-valuation-kernel` because inventory movements exist, but inventory truth is still spread across operational flows rather than owned by a dedicated valuation kernel.

This spec defines the architecture needed to make stock quantity and stock value trustworthy for OHADA SMBs:

- every stock-changing operation enters through a typed business event;
- quantity projection, value projection, audit evidence, and outbox messages commit atomically;
- value-affecting events reconcile to SYSCOHADA class 3 inventory accounts;
- stock count variances and write-offs are controlled, approved, evidenced, and posted;
- inventory reports can prove their source, period, valuation method, as-of timestamp, and reconciliation state.

This is engineering guidance, not legal or accounting certification. SYSCOHADA account mappings, valuation policy, tax treatment, write-off treatment, and statutory inventory-book requirements still require qualified accountant validation before production claims.

## 2. Current Repo State

Existing anchors:

- `InventoryLevel` stores item/location quantity and weighted average value.
- `InventoryTransaction` stores movement history.
- `StockTransfer` and `StockTransferLine` exist.
- `StockAdjustment` and `StockAdjustmentLine` exist.
- POS sale/refund/void already create inventory transactions and accounting postings.
- Purchasing receiving creates inventory levels and transactions.
- `BusinessEvent` and `BusinessEventOutbox` now exist.
- Accounting posting batches, source links, periods, and posting rules exist.

Current weak points:

- No dedicated `services/inventory/*` valuation kernel exists.
- Stock transfer approval and reservation logic live in `actions/inventory/inventoryMovementActions.ts`.
- POS, purchasing, item creation, and inventory actions can create inventory transactions independently.
- Stock movements do not consistently publish `BusinessEvent` records.
- Stock adjustment and count workflows are not hardened as event-to-ledger workflows.
- Inventory value is not systematically reconciled to class 3 ledger balances.
- Projection rebuild from immutable movement history is not implemented as a regression gate.
- Adjustment/write-off approvals, evidence hashes, and maker-checker controls are incomplete.

## 3. Language Locked

- Inventory event: an append-only business fact that changes or reserves stock quantity, stock value, or stock accountability.
- Inventory projection: derived quantity and value state in `InventoryLevel`, rebuildable from immutable events and movement rows.
- Valuation method: the tenant-approved cost method used by the kernel. Default for this repo should be weighted average cost, because `InventoryLevel.averageCost` and `totalValue` already exist.
- Class 3 tie-out: reconciliation between inventory subledger value by item/location and SYSCOHADA class 3 inventory control accounts.
- Stock count: a controlled physical count snapshot that compares counted quantity to system quantity and produces approved variance events.
- Variance event: a value-affecting corrective event produced by approved count differences, damage, expiry, theft, found stock, or correction.
- Write-off: a sensitive stock decrease with evidence and approval, posted to configured loss/expense accounts and credited against inventory.
- Source document: transfer note, count sheet, adjustment evidence, destruction certificate, goods receipt, POS ticket, production report, or approval record, hashed and linked to the event.
- Event replay: repeated submission of the same idempotency key and same payload hash returns the original result without duplicate stock or ledger effects.
- Event conflict: same idempotency key with different payload hash is rejected, audited, and operator-visible.

## 4. Target Architecture

### 4.1 Canonical File Layout

Create or harden these surfaces:

```text
services/inventory/
  inventory-event.schemas.ts
  inventory-errors.ts
  inventory-valuation.service.ts
  inventory-transfer.service.ts
  inventory-adjustment.service.ts
  inventory-count.service.ts
  inventory-reconciliation.service.ts
  inventory-projection-rebuild.service.ts
  inventory-notifications.ts
  __tests__/
    inventory-transfer.service.test.ts
    inventory-adjustment.service.test.ts
    inventory-count.service.test.ts
    inventory-reconciliation.service.test.ts
    inventory-projection-rebuild.service.test.ts

actions/inventory/
  inventory-valuation.actions.ts
  inventory-transfer.actions.ts
  inventory-adjustment.actions.ts
  inventory-count.actions.ts

hooks/inventory/
  useInventoryValuation.ts
  useStockCounts.ts
  useInventoryReconciliation.ts

components/inventory/
  InventoryValuationDashboard.tsx
  StockCountWorkbench.tsx
  StockAdjustmentApprovalQueue.tsx
  InventoryReconciliationPanel.tsx
```

Migration strategy:

- Do not rewrite every existing stock workflow in one step.
- First create the kernel and migrate stock transfers as the smallest representative event.
- Then migrate stock adjustments and counts.
- Then connect purchasing receipts, POS sale/refund/void stock movements, item initial stock, and production later through the same service.

### 4.2 Source Of Truth

Canonical truth:

- `BusinessEvent`: append-only event envelope, idempotency, payload hash, source link, outbox.
- `InventoryTransaction`: immutable movement ledger for stock quantity/value.
- `InventoryLevel`: current derived projection by item/location.
- `LedgerPostingBatch` plus `JournalEntry`: accounting value truth.
- `AccountingSourceLink`: bridge from stock event to ledger evidence.

Derived views:

- dashboard quantities;
- stock value by item/location/category;
- count variance totals;
- transfer status summary;
- reconciliation drift indicators.

Forbidden truth sources:

- client-computed quantities or cost totals;
- UI-only stock summaries;
- direct `inventoryLevel.update` outside the inventory kernel for final stock events;
- reports that hide missing ledger/source evidence.

## 5. Data Model Requirements

The existing schema can support the first slice, but the full kernel likely needs additive schema. Use migrations, not destructive edits.

### 5.1 Existing Models To Use

- `InventoryLevel`
- `InventoryTransaction`
- `StockTransfer`
- `StockTransferLine`
- `StockAdjustment`
- `StockAdjustmentLine`
- `BusinessEvent`
- `BusinessEventOutbox`
- `LedgerPostingBatch`
- `AccountingSourceLink`
- `AuditLog`

### 5.2 Recommended Additive Models

Add only when implementing the related slice.

#### InventoryValuationPolicy

Purpose:

- Store tenant valuation method and production-readiness status.

Fields:

- `id`
- `organizationId`
- `method`: `WEIGHTED_AVERAGE | FIFO`
- `currencyCode`
- `effectiveFrom`
- `effectiveTo`
- `status`: `DRAFT | ACTIVE | SUPERSEDED | REQUIRES_ACCOUNTANT_REVIEW`
- `approvedById`
- `approvedAt`
- `documentHash`
- `metadata`

Gate:

- A value-affecting event cannot post unless an active policy exists.

#### StockCountSession

Purpose:

- Capture a physical count snapshot and approval workflow.

Fields:

- `id`
- `organizationId`
- `locationId`
- `countNumber`
- `status`: `DRAFT | FROZEN | SUBMITTED | APPROVED | POSTED | CANCELLED`
- `countDate`
- `snapshotHash`
- `countSheetHash`
- `createdById`
- `submittedById`
- `approvedById`
- `postedById`
- `postedBusinessEventId`
- `postedAt`
- `metadata`

Gate:

- Approved counts become immutable. Corrections use a new count or adjustment event.

#### StockCountLine

Purpose:

- Store system quantity at freeze time, counted quantity, and variance.

Fields:

- `id`
- `stockCountSessionId`
- `itemId`
- `locationId`
- `systemQuantity`
- `countedQuantity`
- `varianceQuantity`
- `unitCost`
- `varianceValue`
- `reasonCode`
- `evidenceHash`
- `metadata`

Gate:

- Count posting generates `stock.adjustment.posted` for non-zero variance lines.

#### InventoryReconciliationRun

Purpose:

- Reconcile inventory subledger value to class 3 ledger value.

Fields:

- `id`
- `organizationId`
- `periodId`
- `locationId`
- `status`: `RUNNING | PASSED | BLOCKED | FAILED | SIGNED`
- `inventoryValue`
- `ledgerClass3Value`
- `driftAmount`
- `driftReason`
- `runHash`
- `startedById`
- `signedById`
- `signedAt`
- `metadata`

Gate:

- Period close must block on unresolved critical inventory drift.

#### InventoryAnomaly

Purpose:

- Make stock risk visible to operators.

Fields:

- `id`
- `organizationId`
- `eventId`
- `itemId`
- `locationId`
- `type`
- `severity`
- `status`
- `messageKey`
- `evidence`
- `assignedToId`
- `resolvedById`
- `resolvedAt`

Gate:

- Critical anomalies are visible in operator dashboards and close blockers.

## 6. Event Contracts

Every event must be posted through `recordBusinessEventInTx` or the future `postEvent` equivalent, inside the same database transaction as stock projection, movement rows, audit logs, and any ledger posting request.

### 6.1 stock.transfer.posted

Trigger:

- Approved transfer moves stock between locations.

Payload:

- `transferId`
- `transferNumber`
- `fromLocationId`
- `toLocationId`
- `lines`: item id, requested quantity, shipped quantity, received quantity, unit cost, total value
- `inventoryTransactionIds`
- `valuationMethod`
- `transferDocumentHash`
- `approvedById`
- `approvedAt`

Guards:

- tenant scope;
- active source and destination locations;
- active items;
- source and destination differ;
- transfer status is eligible;
- approving actor is not the creator when maker-checker threshold applies;
- source stock sufficient unless explicit negative-stock policy allows and flags it;
- open accounting period;
- active valuation policy;
- idempotency key present.

Inventory effect:

- decrement source `InventoryLevel`;
- increment destination `InventoryLevel`;
- create one `TRANSFER_OUT` and one `TRANSFER_IN` transaction per line;
- update average cost and total value according to valuation method.

Accounting effect:

- value-neutral transfer if same valuation entity;
- if cross-entity/in-transit accounting is enabled, post through configured in-transit accounts;
- never silently skip required posting when policy says posting is needed.

Outbox:

- notification to transfer requester/approver;
- anomaly notification if negative-stock override or cost drift is detected.

Compensation:

- `stock.transfer.reversed` or corrective transfer referencing the original event.

### 6.2 stock.adjustment.posted

Trigger:

- Approved stock adjustment from count variance, damage, expiry, theft, found stock, or correction.

Payload:

- `adjustmentId`
- `adjustmentNumber`
- `locationId`
- `reasonCode`
- `lines`: item id, system quantity, actual quantity, adjusted quantity, unit cost, value delta
- `evidenceHashes`
- `approvalId`
- `inventoryTransactionIds`
- `postingBatchId`

Guards:

- adjustment is approved;
- maker-checker for sensitive or threshold events;
- evidence hash required for write-off, theft, damage, expiry;
- open period;
- active valuation policy;
- configured inventory variance/loss/gain accounts;
- same idempotency key with changed payload rejects.

Inventory effect:

- update `InventoryLevel` quantity and value;
- create `ADJUSTMENT_IN` or `ADJUSTMENT_OUT` movement rows;
- maintain weighted average cost rules.

Accounting effect:

- debit/credit configured expense, loss, gain, or variance account;
- counterline to class 3 inventory account;
- balanced posting required before commit.

Outbox:

- approval result notification;
- critical anomaly if near period close, high value, repeated user/location/item, or missing evidence attempt.

Compensation:

- corrective adjustment referencing original event.

### 6.3 stock.write_off.posted

Trigger:

- Approved destruction, expiry, obsolescence, theft loss, or formal write-off.

Payload:

- `writeOffId` or `adjustmentId`
- item/location quantities and values;
- destruction certificate hash or incident report hash;
- approver and reason;
- photos/evidence URIs when applicable.

Guards:

- mandatory evidence;
- step-up;
- maker-checker;
- threshold approval;
- open period;
- configured write-off account;
- item is active or explicitly allowed as archived historical item.

Accounting effect:

- debit configured write-off/loss/expense account;
- credit class 3 inventory.

Compensation:

- found-stock adjustment or correction event, never edit/delete write-off.

### 6.4 inventory.physical_count.validated

Trigger:

- Physical count session is approved and posted.

Payload:

- count session id;
- count sheet hash;
- snapshot hash;
- location;
- counted lines;
- variance summary;
- approver;
- generated adjustment event ids.

Guards:

- count is frozen before entry;
- count sheet hash present;
- approving actor differs from submitter above threshold;
- open period;
- no later posted count for same item/location/scope unless correction policy permits.

Inventory effect:

- no direct projection mutation by this event alone;
- produces `stock.adjustment.posted` events for variance lines.

Accounting effect:

- delegated to generated adjustment events.

Outbox:

- stockkeeper notification;
- manager approval notification;
- accountant variance notification.

### 6.5 inventory.projection.rebuilt

Trigger:

- Operator or scheduled control rebuilds derived stock projections from immutable movement history.

Payload:

- scope: organization, location, item, date range;
- previous projection hash;
- rebuilt projection hash;
- drift list;
- operator id;
- run hash.

Guards:

- read-only by default;
- correction requires approved compensating event, not direct overwrite;
- high drift creates `InventoryAnomaly`.

Accounting effect:

- none directly;
- drift may block close and require adjustment event.

### 6.6 inventory.class3.reconciled

Trigger:

- Inventory subledger is reconciled to class 3 ledger account balances.

Payload:

- period id;
- valuation method;
- inventory value by item/location/category;
- ledger class 3 balance;
- drift;
- source event range;
- report hash.

Guards:

- period exists;
- ledger periods and posting batches are available;
- no orphan stock value movements without posting where posting is required;
- no orphan class 3 postings without source stock event.

Result:

- `PASSED`: no material drift.
- `BLOCKED`: drift exceeds tolerance or missing evidence exists.
- `FAILED`: system cannot compute due to missing configuration.

Outbox:

- accountant/operator notification;
- close blocker if blocked or failed.

## 7. Service Contracts

### 7.1 InventoryValuationService

Responsibilities:

- resolve valuation policy;
- compute weighted average or FIFO valuation;
- create inventory transaction rows;
- update `InventoryLevel` projections;
- compute source document hashes;
- call business event gateway;
- optionally request accounting posting;
- enforce idempotency and payload hashes.

Public methods:

```ts
postStockTransfer(input): Promise<ActionResult<PostStockTransferResult>>
postStockAdjustment(input): Promise<ActionResult<PostStockAdjustmentResult>>
postStockWriteOff(input): Promise<ActionResult<PostStockWriteOffResult>>
postPhysicalCount(input): Promise<ActionResult<PostPhysicalCountResult>>
rebuildProjection(input): Promise<ActionResult<ProjectionRebuildResult>>
reconcileClass3(input): Promise<ActionResult<InventoryReconciliationResult>>
```

Contract shape:

```ts
type InventoryActionResult<T> =
  | { ok: true; data: T; correlationId: string }
  | { ok: false; error: InventoryErrorResponse }
```

### 7.2 InventoryTransferService

Move the transfer approval transaction out of `actions/inventory/inventoryMovementActions.ts`.

Responsibilities:

- load transfer and lines by tenant;
- validate status;
- lock affected `InventoryLevel` rows;
- update source and destination projections;
- create movement rows;
- record `stock.transfer.posted`;
- return stable result for idempotent replay.

### 7.3 InventoryAdjustmentService

Responsibilities:

- create draft adjustments;
- submit for approval;
- approve with maker-checker;
- post approved adjustment;
- post write-off with evidence;
- reject same-actor approval where policy requires SoD.

### 7.4 InventoryCountService

Responsibilities:

- create/freeze count sessions;
- capture count lines;
- hash count sheet;
- compute variance;
- route for approval;
- post generated adjustment events.

### 7.5 InventoryReconciliationService

Responsibilities:

- compute inventory subledger value;
- compute class 3 ledger value;
- compare by period, item category, location, valuation scope;
- detect orphan movements/postings;
- create close blockers and anomalies;
- export evidence pack.

### 7.6 ProjectionRebuildService

Responsibilities:

- rebuild expected `InventoryLevel` by replaying movement rows and/or business events;
- compare to stored projection;
- produce drift report;
- never auto-overwrite final truth without approved correction event.

## 8. Error Handling

Use stable typed errors. Do not throw raw `Error` strings from service boundaries.

### 8.1 Error Shape

```ts
type InventoryErrorResponse = {
  code:
    | "TENANT_SCOPE_VIOLATION"
    | "AUTH_REQUIRED"
    | "FORBIDDEN"
    | "STEP_UP_REQUIRED"
    | "APPROVAL_REQUIRED"
    | "SOD_VIOLATION"
    | "VALIDATION_FAILED"
    | "PERIOD_CLOSED"
    | "IDEMPOTENCY_CONFLICT"
    | "INSUFFICIENT_STOCK"
    | "NEGATIVE_STOCK_BLOCKED"
    | "INVALID_VALUATION_POLICY"
    | "INVALID_ACCOUNT_MAP"
    | "MISSING_DOCUMENT"
    | "UNBALANCED_POSTING"
    | "PROJECTION_DRIFT"
    | "CLASS3_RECONCILIATION_DRIFT"
    | "CONCURRENT_STOCK_UPDATE"
    | "SYSTEM_ERROR"
  category:
    | "validation"
    | "authentication"
    | "authorization"
    | "business_rule"
    | "inventory"
    | "accounting"
    | "fraud_control"
    | "system"
  severity: "low" | "medium" | "high" | "critical"
  retryable: boolean
  userMessageKey: string
  operatorMessage?: string
  correlationId: string
  fieldErrors?: Record<string, string[]>
  evidence?: Record<string, unknown>
}
```

### 8.2 Error Mapping

- `INSUFFICIENT_STOCK`: terminal, user-actionable, medium/high by value.
- `CONCURRENT_STOCK_UPDATE`: retryable if idempotency key is present.
- `IDEMPOTENCY_CONFLICT`: terminal, high, audit and operator notification.
- `MISSING_DOCUMENT`: terminal, high for write-off/count/adjustment.
- `INVALID_ACCOUNT_MAP`: terminal until configuration is fixed, high/critical.
- `PERIOD_CLOSED`: terminal, high, requires allowed reversal/correction in open period.
- `CLASS3_RECONCILIATION_DRIFT`: terminal for period close, critical when material.
- `SYSTEM_ERROR`: safe user message, operator diagnostic with redacted context.

### 8.3 Redaction

Do not log:

- raw count sheet uploads;
- raw photo evidence;
- secrets or tokens;
- full user/session cookies;
- SQL details;
- provider/payment raw payloads;
- personally sensitive supplier/customer data beyond ids needed for diagnostics.

Logs may include:

- operation;
- organization id;
- actor id;
- correlation id;
- item/location ids;
- event id;
- idempotency key hash;
- payload hash;
- document hash;
- error code and severity.

## 9. Notifications And Operator Queues

### 9.1 User Notifications

Use existing notification surfaces. Every user-facing service result should map to a safe message.

Examples:

- `stock.transfer.posted`: transfer completed.
- `stock.adjustment.pending_approval`: adjustment submitted for approval.
- `stock.adjustment.posted`: adjustment posted.
- `stock.count.frozen`: count sheet frozen.
- `stock.count.variance_found`: variance requires review.
- `inventory.reconciliation.blocked`: inventory and ledger values do not reconcile.

### 9.2 Operator Notifications

Operator-visible queues are mandatory for:

- negative-stock override;
- write-off missing evidence attempt;
- same actor attempted to approve own sensitive adjustment;
- idempotency conflict;
- projection drift;
- class 3 reconciliation drift;
- orphan inventory movement;
- orphan class 3 posting;
- transfer one-leg failure attempt;
- repeated adjustments by user/location/item near period close.

### 9.3 Outbox Channels

Business events should create outbox messages:

- `NOTIFICATION`: user/operator workflow feedback.
- `REPORT_EXPORT`: reconciliation evidence pack exports.
- `SYNC_ACK`: future offline inventory/POS sync acknowledgment.

External side effects must run after commit.

## 10. Security And Control Gates

### Gate A: Tenant Scope

Every read/write/aggregate must include `organizationId`.

Reject:

- stock event with item not in tenant;
- transfer across tenant locations;
- count session reading another tenant's inventory;
- reconciliation using another tenant's ledger account.

### Gate B: RBAC And Module Gate

Required permissions:

- `inventory.movements.read`
- `inventory.transfers.create`
- `inventory.transfers.approve`
- `inventory.adjustments.create`
- `inventory.adjustments.approve`
- `inventory.counts.manage`
- `inventory.valuation.rebuild`
- `inventory.reconciliation.run`
- `inventory.reconciliation.sign`
- `inventory.writeoff.approve`

Sensitive permissions require fresh auth:

- approve write-off;
- approve high-value adjustment;
- sign reconciliation;
- override negative stock;
- run correction after closed-period blocker.

### Gate C: Maker-Checker

Requester cannot approve their own sensitive event when:

- write-off;
- theft/loss;
- adjustment above threshold;
- variance above threshold;
- negative stock override;
- reconciliation sign-off.

### Gate D: Accounting Period

Value-affecting events require an open period for the event date.

Closed period response:

- reject posting;
- propose correction event in current open period where policy permits;
- audit attempt.

### Gate E: Valuation Policy

No value-affecting event can post without active valuation policy.

Default:

- weighted average cost.

Gate:

- if FIFO is introduced later, it must add layer models and tests before activation.

### Gate F: Ledger Tie-Out

Stock value reports are not trusted until:

- movement value equals inventory subledger projection;
- class 3 ledger account value equals inventory value, or drift is visible and blocks close.

### Gate G: Immutability

Finalized events, movement rows, count sheets, posted adjustments, and signed reconciliation runs are append-only.

Corrections:

- compensating events only.

### Gate H: Evidence

Mandatory document hashes:

- transfer note hash for transfers;
- count sheet hash for physical counts;
- approval hash for adjustments/write-offs;
- destruction/incident evidence hash for write-offs;
- projection rebuild report hash;
- reconciliation report hash.

### Gate I: UX States

Inventory UI must include:

- loading;
- empty;
- validation error;
- permission denied;
- approval required;
- step-up required;
- partial/degraded;
- stale/as-of timestamp;
- reconciliation blocked;
- retry for transient concurrency failures;
- French-first bilingual strings;
- dark/light theme behavior.

## 11. Reconciliation Logic

### 11.1 Inventory Subledger Value

Compute by:

- item;
- location;
- valuation method;
- period boundary;
- movement type;
- source event.

Formula for weighted average:

- inbound receipt increases quantity and value;
- average cost = total value / quantity on hand when quantity > 0;
- outbound movement consumes current average cost;
- adjustment changes quantity and value according to reason and approved unit cost;
- zero quantity resets or carries value according to policy, but must not leave unexplained residual value.

### 11.2 Class 3 Ledger Value

Compute from posted journal lines mapped to inventory class 3 accounts.

Required link:

- `LedgerPostingBatch.sourceType`;
- `AccountingSourceLink`;
- `BusinessEvent.postingBatchId`;
- source document hash.

### 11.3 Drift Classification

- `NO_DRIFT`: exact or below configured tolerance.
- `ROUNDING_DRIFT`: immaterial and explainable.
- `MISSING_STOCK_EVENT`: inventory movement lacks business event.
- `MISSING_LEDGER_POSTING`: value-affecting stock event lacks posting.
- `ORPHAN_LEDGER_POSTING`: class 3 posting lacks stock source.
- `VALUATION_POLICY_MISMATCH`: event value calculated under wrong policy.
- `CLOSED_PERIOD_STOCK_MUTATION`: movement posted into closed period.

Critical drift blocks period close.

## 12. Implementation Build Order

### Phase 0: Baseline Audit

Deliverables:

- list every code path writing `InventoryLevel`;
- list every code path creating `InventoryTransaction`;
- classify each as POS, purchasing, item initial stock, transfer, adjustment, reservation, correction, production, or import;
- mark which paths already have ledger posting and business event evidence.

Exit gate:

- no unknown stock mutation path remains unclassified.

### Phase 1: Inventory Schemas And Error Taxonomy

Deliverables:

- `inventory-event.schemas.ts`;
- typed inputs for transfer posting, adjustment posting, count posting, rebuild, reconciliation;
- `inventory-errors.ts`.

Exit gate:

- schemas reject missing tenant, item, location, quantity, idempotency key, event date, evidence hash, and approval metadata where required.

### Phase 2: Transfer Posting Kernel

Deliverables:

- `inventory-transfer.service.ts`;
- migrate `approveTransfer` to call service;
- emit `stock.transfer.posted`;
- create movement rows and projection updates atomically;
- idempotent replay returns original transfer result.

Exit gate:

- transfer cannot commit one leg without the other;
- insufficient stock blocks event creation;
- same key different payload rejects and audits;
- tests pass.

### Phase 3: Adjustment And Write-Off Kernel

Deliverables:

- `inventory-adjustment.service.ts`;
- approval workflow;
- evidence hash enforcement;
- SoD and step-up;
- accounting posting recipe through configured accounts;
- emit `stock.adjustment.posted` and `stock.write_off.posted`.

Exit gate:

- write-off without evidence fails;
- same actor approval above threshold fails;
- missing account map fails before stock mutation;
- balanced posting required.

### Phase 4: Stock Count Kernel

Deliverables:

- `inventory-count.service.ts`;
- freeze count snapshot;
- count lines;
- variance computation;
- approval;
- generate adjustment events.

Exit gate:

- count sheet is immutable after submit;
- variance posting produces adjustment events;
- approval and evidence are required.

### Phase 5: Projection Rebuild

Deliverables:

- `inventory-projection-rebuild.service.ts`;
- rebuild expected balances from movement history and/or business events;
- produce drift report;
- create anomaly records.

Exit gate:

- seeded movements rebuild to stored balances;
- seeded drift is detected and reported, not overwritten.

### Phase 6: Class 3 Reconciliation

Deliverables:

- `inventory-reconciliation.service.ts`;
- class 3 ledger tie-out;
- close blocker output;
- reconciliation report hash;
- optional dashboard panel.

Exit gate:

- inventory value reconciles to class 3 ledger;
- material drift blocks close;
- orphan movement and orphan ledger posting tests pass.

### Phase 7: Migration Of Existing Producers

Migrate in order:

1. stock transfers;
2. stock adjustments and counts;
3. item initial stock;
4. purchasing receipts;
5. POS sale/refund/void stock movement calls;
6. production/recipes when that module exists.

Exit gate:

- no final stock-changing flow bypasses the kernel.

## 13. Test Matrix

### Service Tests

- transfer posts source and destination legs atomically;
- transfer replay creates one event and one set of movement rows;
- mutated replay rejects and audits;
- insufficient stock rejects before projection mutation;
- concurrent transfer attempts against same stock do not oversell;
- adjustment requires approved status;
- write-off requires evidence hash;
- same actor cannot request and approve sensitive adjustment;
- missing account map blocks value-affecting adjustment;
- stock count variance generates adjustment event;
- projection rebuild matches clean movement history;
- projection rebuild detects seeded drift;
- class 3 reconciliation passes for balanced fixture;
- class 3 reconciliation blocks on missing posting.

### Error Tests

- validation error maps to field errors;
- period closed maps to `PERIOD_CLOSED`;
- idempotency conflict maps to `IDEMPOTENCY_CONFLICT`;
- concurrent update maps to retryable `CONCURRENT_STOCK_UPDATE`;
- missing evidence maps to `MISSING_DOCUMENT`;
- missing account map maps to `INVALID_ACCOUNT_MAP`;
- stock/ledger drift maps to `CLASS3_RECONCILIATION_DRIFT`.

### Security Tests

- tenant A cannot transfer tenant B stock;
- actor without approve permission cannot approve transfer;
- fresh auth required for write-off approval;
- maker-checker rejects self approval;
- deleted/inactive item cannot be used unless historical correction policy allows it.

### Static Checks

- no UI imports Prisma;
- no UI computes persisted stock value;
- no new `inventoryLevel.update` outside approved inventory/POS/purchasing migration paths;
- no raw `throw new Error` escapes service boundary for final stock events;
- no final stock event lacks idempotency key.

### Suggested Commands

```powershell
npm run prisma:validate
npm test -- services/inventory --runInBand
npm test -- services/events --runInBand
npm test -- services/accounting --runInBand
npm test -- services/pos --runInBand
npm test -- services/purchase-order --runInBand
npm run typecheck
```

Adjust paths to the final test layout.

## 14. Notification Matrix

| Event | User notification | Operator notification | Close blocker |
| --- | --- | --- | --- |
| `stock.transfer.posted` | Transfer completed | Negative stock override or cost drift | No, unless anomaly |
| `stock.adjustment.posted` | Adjustment posted | High-value or near-close adjustment | Maybe |
| `stock.write_off.posted` | Write-off posted | Always visible to manager/accountant | Maybe |
| `inventory.physical_count.validated` | Count validated | Variance summary | Yes if variance not posted |
| `inventory.projection.rebuilt` | Rebuild complete | Drift detected | Yes if material |
| `inventory.class3.reconciled` | Reconciliation complete | Drift or missing evidence | Yes if blocked/failed |

## 15. Observability

Structured logs:

- `inventory.transfer.post`
- `inventory.adjustment.post`
- `inventory.count.validate`
- `inventory.projection.rebuild`
- `inventory.class3.reconcile`
- `inventory.event.idempotency_conflict`
- `inventory.drift.detected`

Metrics:

- stock event count by type;
- projection rebuild duration;
- projection drift count and amount;
- class 3 reconciliation drift amount;
- unresolved stock anomalies;
- write-offs by period/location/user;
- transfer failure/retry count;
- idempotency conflict count.

Audit:

- actor;
- tenant;
- event id;
- idempotency key hash;
- payload hash;
- document hash;
- approval id;
- before/after projection references;
- posting batch id;
- anomaly ids.

## 16. Skill Seed

Use this section to create the future Codex skill.

### Skill Name

`010-aqstoqflow-inventory-valuation-kernel`

### Description

Build, migrate, audit, or repair the AqStoqFlow inventory valuation kernel for OHADA SMBs: stock transfers, adjustments, write-offs, physical counts, valuation projection rebuild, class 3 ledger reconciliation, inventory anomalies, typed errors, notifications, tenant/RBAC controls, and event-first stock accounting.

### Required Context

Always read:

- this technical spec;
- `prisma/schema.prisma`;
- `actions/inventory/inventoryMovementActions.ts`;
- `services/pos/pos.service.ts`;
- `services/purchase-order/purchase-order.service.ts`;
- `services/events/business-event.service.ts`;
- `services/accounting/*`;
- `what-next/AQSTOQFLOW_000_SUITE_004_010_GATE_REPORT_2026-06-14.md`;
- `graphify-out/GRAPH_REPORT.md` when available.

### Companion Skills

Use with:

- `ledger-first-business-events`;
- `enterprise-error-handling`;
- `stockflow-accounting-backbone`;
- `enterprise-fraud-and-controls`;
- `rbac`;
- `review`.

### Operating Rules

1. Do not implement stock-changing behavior outside `services/inventory/*`.
2. Do not update `InventoryLevel` without a matching event, movement row, audit record, and outbox where applicable.
3. Do not claim valuation readiness without projection rebuild and class 3 reconciliation tests.
4. Do not silently allow negative stock. Block or flag under explicit policy.
5. Do not let the same user approve sensitive adjustments or write-offs.
6. Do not mutate posted movement history. Use compensating events.
7. Stop on any CRITICAL/HIGH stock or ledger invariant failure.

### Workflow

1. Audit all stock mutation paths.
2. Pick the first un-migrated path, starting with transfers.
3. Define event spec and payload schema.
4. Implement service-layer transaction.
5. Publish business event and outbox in the transaction.
6. Add typed errors and notifications.
7. Add service tests for success, replay, conflict, tenant rejection, permission rejection, rollback, and drift.
8. Run validation and typecheck.
9. Produce completion report with gates passed/blocked.

### Output Contract

End every run with:

- active inventory event;
- files changed;
- invariants enforced;
- errors added;
- notifications/outbox added;
- tests run;
- gates passed;
- gates blocked;
- remaining migration paths;
- next recommended implementation slice.

## 17. Acceptance Definition

The 010 chunk is accepted only when:

- transfers, adjustments, write-offs, and physical counts are service-owned;
- stock projections are rebuildable from immutable movements/events;
- value-affecting stock events either post balanced accounting entries or create an explicit blocker;
- inventory subledger value reconciles to SYSCOHADA class 3 ledger value;
- period close sees inventory drift and blocks when material;
- event replay is safe under duplicate and concurrent submission;
- same-key mutated payload is rejected, audited, and operator-visible;
- fraud-sensitive stock events enforce maker-checker and step-up;
- focused tests and typecheck pass.

Blueprint ready.
