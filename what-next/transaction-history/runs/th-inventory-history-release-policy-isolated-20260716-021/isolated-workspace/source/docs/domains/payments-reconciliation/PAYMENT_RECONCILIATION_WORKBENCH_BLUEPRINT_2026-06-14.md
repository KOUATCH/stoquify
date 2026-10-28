# Payment Reconciliation Workbench Blueprint

Date: 2026-06-14

Scope: AqStoqFlow payment reconciliation workbench infrastructure, evidence model, OHADA/SYSCOHADA controls, operator dashboard, and phased execution plan.

Verdict: APPROVED WITH REQUIRED CHANGES.

The payment reconciliation workbench applies to this platform, but it must be implemented in two clear maturity levels:

1. Capture-readiness now: the current surface may read from existing `Payment` data and show operator-ready signals such as run summaries, failure groups by rail, duplicate provider-reference alerts, and suspense-ready candidates.
2. Certified reconciliation later: the platform must add durable provider evidence, statement lines, reconciliation runs, match records, suspense items, approvals, and ledger-linked certificates before it can claim full certified reconciliation evidence.

The current schema does not yet have durable `ProviderEvent`, `StatementLine`, `ReconciliationRun`, or `SuspenseItem` tables. Therefore the current workbench must not fake provider statements, provider webhook evidence, signed runs, suspense postings, or certified reconciliation packets.

Compliance status today: partial, ready for operators, not yet full certified reconciliation evidence.

## Regulatory And Accounting Basis

The design must follow OHADA/SYSCOHADA ledger-first accounting discipline. OHADA's official AUDCIF page describes the Acte uniforme relatif au droit comptable et a l'information financiere as the accounting and financial reporting framework to which the revised SYSCOHADA is annexed. That means reconciliation cannot be a loose dashboard calculation. It must become an evidence-backed accounting control with immutable support, ledger source links, period cut-off, and audit trails.

Reference: https://www.ohada.org/acte-uniforme-relatif-au-droit-comptable-et-a-linformation-financiere-audcif/

Exact legal article mapping and country/provider overlays must be verified by an accountant or legal reviewer before production certification. The system should enforce doctrine through architecture and constraints, but should not invent article-specific compliance claims.

## Current Platform Fit

The platform already has the right foundation:

- Existing `Payment` data can power a capture-readiness workbench.
- The accounting kernel can support journal entries, posting batches, and source links.
- RBAC and sensitive action controls already exist for payment reconciliation run and sign actions.
- The dashboard structure can host an enterprise finance reconciliation surface.
- The next needed work is additive schema and service hardening, not a rewrite.

The correct approach is to preserve the current operator-facing workbench and progressively replace the read source with durable reconciliation evidence as each backend layer lands.

## Target Architecture

The workbench should be built as three layers.

### 1. Capture-Readiness Layer

Purpose: give finance operators visibility now without overstating certification.

This layer reads existing `Payment` data and produces:

- Run-like summaries from payment windows.
- Failure groups by rail.
- Duplicate provider-reference alerts.
- Missing reference and stale pending alerts.
- Suspense-ready failure candidates.
- Operator guidance and exception queues.

This layer must label results as readiness signals, not certified reconciliation runs.

### 2. Evidence Kernel

Purpose: persist the facts that prove external money movement.

This layer adds immutable evidence tables:

- `ProviderEvent`
- `StatementFile`
- `StatementLine`
- `ProviderAccount`
- `PaymentRail`
- `PaymentTransaction`
- `MatchRecord`
- `PaymentException`

All provider callbacks, API pulls, statement imports, and settlement files enter the system as immutable evidence first. Processing happens after evidence capture.

### 3. Certified Reconciliation Layer

Purpose: produce daily/provider-account reconciliation evidence and controlled close readiness.

This layer adds:

- `ReconciliationRun`
- `SuspenseItem`
- Reconciliation invariant engine.
- Manual match approval workflow.
- Suspense posting workflow through the accounting gateway.
- Sign-off certificate hash.
- Period-close blockers.
- Evidence exports.

## Core Data Model

### PaymentRail

Represents a rail such as mobile money, bank transfer, cash, card/acquirer, QR, wallet, or internal transfer.

Key fields:

- `id`
- `organizationId`
- `type`
- `countryCode`
- `currencyCode`
- `adapterKey`
- `isActive`
- `createdAt`
- `updatedAt`

### ProviderAccount

Represents one configured external settlement source.

Key fields:

- `id`
- `organizationId`
- `paymentRailId`
- `providerName`
- `accountRefMasked`
- `accountRefHash`
- `currencyCode`
- `countryCode`
- `settlementLedgerAccountId`
- `suspenseLedgerAccountId`
- `feeLedgerAccountId`
- `settlementLagDays`
- `statementSource`
- `status`
- `createdAt`
- `updatedAt`

Provider accounts must be explicitly mapped before certified reconciliation can run.

### SettlementAccount

Represents effective-dated destination settlement account configuration.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `ledgerAccountId`
- `effectiveFrom`
- `effectiveTo`
- `approvalStatus`
- `requestedById`
- `approvedById`
- `approvedAt`
- `createdAt`

Settlement account changes are high-risk and require maker/checker approval.

### ProviderEvent

Immutable raw provider/API/webhook evidence.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `providerEventId`
- `providerTransactionId`
- `eventType`
- `amount`
- `currencyCode`
- `occurredAt`
- `receivedAt`
- `rawPayload`
- `rawPayloadHash`
- `headersHash`
- `signatureValid`
- `status`
- `processedAt`
- `createdAt`

Required constraints:

- Unique `(organizationId, providerAccountId, providerEventId)`.
- Unique `(organizationId, providerAccountId, providerTransactionId)` where the provider guarantees uniqueness.
- Same provider reference with a different payload hash creates a tamper exception.

### StatementFile

Immutable imported provider, bank, acquirer, or wallet statement file.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `source`
- `fileName`
- `fileHash`
- `periodStart`
- `periodEnd`
- `importedById`
- `importedAt`
- `createdAt`

Required constraints:

- Unique `(organizationId, providerAccountId, fileHash)`.

### StatementLine

Immutable external statement fact.

Key fields:

- `id`
- `organizationId`
- `statementFileId`
- `providerAccountId`
- `fingerprint`
- `providerTransactionId`
- `providerReference`
- `amount`
- `currencyCode`
- `direction`
- `occurredAt`
- `description`
- `status`
- `createdAt`

Required constraints:

- Unique `(organizationId, providerAccountId, fingerprint)`.
- Index `(organizationId, providerAccountId, occurredAt)`.
- Index `(organizationId, providerTransactionId)`.

### PaymentTransaction

Canonical bridge from the existing `Payment` model into a controlled payment state machine.

Key fields:

- `id`
- `organizationId`
- `legacyPaymentId`
- `providerAccountId`
- `sourceType`
- `sourceId`
- `direction`
- `state`
- `amount`
- `currencyCode`
- `providerTransactionId`
- `providerReference`
- `idempotencyKey`
- `payloadHash`
- `ledgerPostingBatchId`
- `createdAt`
- `updatedAt`

The first migration should backfill `PaymentTransaction` from existing `Payment` records and preserve `legacyPaymentId` as a unique link.

### MatchRecord

Append-only link between internal payment, provider event, statement line, and ledger posting.

Key fields:

- `id`
- `organizationId`
- `paymentTransactionId`
- `providerEventId`
- `statementLineId`
- `ledgerPostingBatchId`
- `rule`
- `confidence`
- `status`
- `matchedById`
- `matchedAt`
- `correctionOfId`
- `createdAt`

Manual matches require approval. Closed match records are not edited; corrections create new records with lineage.

### SuspenseItem

Itemized unresolved money requiring suspense accounting and ownership.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `reconciliationRunId`
- `type`
- `amount`
- `currencyCode`
- `direction`
- `suspenseLedgerAccountId`
- `status`
- `severity`
- `ownerId`
- `slaDeadline`
- `evidence`
- `ledgerPostingBatchId`
- `resolutionEventId`
- `createdAt`
- `resolvedAt`

Suspense items must be itemized. A 47x suspense posting must equal the sum of its unresolved item amounts.

### ReconciliationRun

Daily/provider-account reconciliation certificate candidate.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `paymentRailId`
- `businessDate`
- `openingProviderBalance`
- `closingProviderBalance`
- `ledgerOpeningBalance`
- `ledgerClosingBalance`
- `matchedAmount`
- `unmatchedAmount`
- `suspenseAmount`
- `feeAmount`
- `invariantResult`
- `status`
- `runById`
- `signedById`
- `signedAt`
- `certificateHash`
- `createdAt`
- `updatedAt`

Required constraints:

- Unique `(organizationId, providerAccountId, businessDate)`.
- Signed runs are immutable.
- Corrections create corrective reconciliation events or replacement runs with lineage.

### PaymentException

Operator and control queue for suspicious or unresolved conditions.

Key fields:

- `id`
- `organizationId`
- `providerAccountId`
- `reconciliationRunId`
- `type`
- `severity`
- `status`
- `ownerId`
- `sourceType`
- `sourceId`
- `evidence`
- `createdAt`
- `resolvedAt`

Exception types include duplicate provider reference, tamper signal, amount mismatch, missing statement line, fee deviation, stale pending payment, late settlement, unmapped provider account, and manual review required.

## Required Enums

Recommended enums:

- `PaymentRailType`
- `ProviderAccountStatus`
- `ProviderEventStatus`
- `PaymentTransactionState`
- `PaymentDirection`
- `StatementLineDirection`
- `MatchRule`
- `MatchStatus`
- `SuspenseType`
- `SuspenseStatus`
- `PaymentExceptionType`
- `ExceptionSeverity`
- `ReconciliationRunStatus`
- `SettlementAccountApprovalStatus`

## Critical Invariants

1. A final payment must have either a `MatchRecord` or a `SuspenseItem`.
2. Provider event IDs must be unique per organization and provider account.
3. Statement line fingerprints must be unique per organization and provider account.
4. Same provider reference with different payload hash is a tamper exception.
5. Signed reconciliation runs are immutable.
6. Closed statement lines and match records cannot be updated or deleted.
7. Suspense total must equal the related suspense ledger posting total.
8. Period close is blocked by unsigned runs, unresolved critical suspense, unmapped provider accounts, and unmatched final money.
9. Webhooks and statement imports may not post directly to journals.
10. All financial postings go through the central accounting posting gateway.
11. Manual match approval requires maker/checker separation.
12. Signer cannot be the same actor who ran the reconciliation or resolved critical suspense for that run.
13. Money values use Decimal or integer minor-unit discipline, never floating arithmetic.
14. Provider account mapping changes require dual approval and effective dating.
15. Reports must expose provenance, as-of time, period, source status, and certification status.

## Service Architecture

### Provider Adapter Layer

Folder target:

`services/payments/adapters/`

Responsibilities:

- `verifySignature`
- `parseEvent`
- `canonicalPayload`
- `queryStatus`
- `fetchStatement`
- `parseStatement`
- `explodeSettlementBatch`
- `calculateExpectedFees`
- `truthPolicy`

Each provider adapter must be deterministic, idempotent, testable with attack fixtures, and isolated from journal posting.

### Provider Event Service

Suggested file:

`services/payments/provider-event.service.ts`

Responsibilities:

- Capture raw provider events.
- Validate signature and payload hash.
- Enforce idempotency.
- Detect replay and tamper.
- Persist immutable `ProviderEvent`.
- Queue processing through inbox/outbox.

### Payment Transaction Service

Suggested file:

`services/payments/payment-transaction.service.ts`

Responsibilities:

- Bridge existing `Payment` records into canonical transactions.
- Enforce payment state machine.
- Prevent final-state regression.
- Link source document, provider evidence, and ledger posting batch.

### Reconciliation Run Service

Suggested file:

`services/reconciliation/reconciliation-run.service.ts`

Responsibilities:

- Lock provider account/date.
- Load provider evidence, statement lines, internal transactions, and ledger balances.
- Invoke matching engine.
- Create match records and suspense items.
- Compute invariant result.
- Create or update run status.
- Block sign-off when controls fail.

### Matching Engine

Suggested file:

`services/reconciliation/matching-engine.service.ts`

Matching cascade:

1. Exact provider transaction ID.
2. Exact provider reference plus amount and date tolerance.
3. Statement fingerprint plus normalized reference.
4. Settlement batch expansion.
5. Fee-aware net/gross match.
6. Manual candidate queue.
7. Suspense candidate.

The engine must explain every match with rule, confidence, and evidence links.

### Suspense Service

Suggested file:

`services/reconciliation/suspense.service.ts`

Responsibilities:

- Create itemized suspense items.
- Assign owner and SLA.
- Link evidence.
- Request ledger-first suspense postings.
- Resolve by match, reclassification, refund, write-off, or corrective provider event.
- Preserve correction lineage.

### Certificate Service

Suggested file:

`services/reconciliation/certificate.service.ts`

Responsibilities:

- Hash run inputs and outputs.
- Produce reconciliation certificate metadata.
- Export evidence packet.
- Record signer and timestamp.
- Prevent mutation after sign-off.

### Exception Service

Suggested file:

`services/reconciliation/exception.service.ts`

Responsibilities:

- Group failure signals.
- Assign owners.
- Escalate SLA breaches.
- Resolve with reason and evidence.
- Emit audit events.

## Server Actions

Suggested action surface:

- `getPaymentReconciliationDashboardAction`
- `getReconciliationRunDetailAction`
- `importProviderStatementAction`
- `runPaymentReconciliationAction`
- `retryProviderStatusAction`
- `assignPaymentExceptionAction`
- `proposeManualMatchAction`
- `approveManualMatchAction`
- `rejectManualMatchAction`
- `resolveSuspenseItemAction`
- `reclassifySuspenseItemAction`
- `requestSuspenseWriteOffAction`
- `approveSuspenseWriteOffAction`
- `signReconciliationRunAction`
- `exportReconciliationCertificateAction`

Action rules:

- Actions stay thin.
- Validation uses Zod at boundaries.
- Services own business rules.
- Every action is organization-scoped.
- Every mutation returns a discriminated success/error response.
- Sensitive actions use RBAC, fresh auth where required, and audit logging.

## Hooks And Query Keys

Suggested hooks:

- `usePaymentReconciliationDashboard`
- `useReconciliationRunDetail`
- `useSuspenseQueue`
- `useDuplicateProviderReferenceAlerts`
- `useProviderAccounts`
- `useImportProviderStatement`
- `useRunPaymentReconciliation`
- `useManualMatchWorkflow`
- `useResolveSuspenseItem`
- `useSignReconciliationRun`
- `useExportReconciliationCertificate`

Suggested query key groups:

- `payment-reconciliation.dashboard`
- `payment-reconciliation.run`
- `payment-reconciliation.suspense`
- `payment-reconciliation.duplicates`
- `payment-reconciliation.provider-accounts`
- `payment-reconciliation.certificates`

Invalidate dashboard, run detail, suspense queue, and duplicate alerts after import, run, match approval, suspense resolution, or sign-off.

## Dashboard Surface

The enterprise dashboard should include:

1. Control center overview.
2. Daily run calendar.
3. Provider account setup health.
4. Rail summary cards.
5. Run summaries by provider account and date.
6. Failure groups by rail.
7. Duplicate provider-reference alerts.
8. Suspense aging and SLA queue.
9. Evidence drilldown from payment to provider event, statement line, match, and ledger posting.
10. Manual match workbench.
11. Provider statement import panel.
12. Sign-off certificate panel.
13. Period-close blocking banner.
14. Export and audit packet actions.

The UI should use the existing dashboard language: dense enterprise panels, finance-focused data tables, subdued status colors, clear provenance, and no marketing-style layout.

## RBAC And Segregation Of Duties

Recommended permissions:

- `payments.reconciliation.read`
- `payments.reconciliation.run`
- `payments.reconciliation.import`
- `payments.reconciliation.sign`
- `payments.manual-match.propose`
- `payments.manual-match.approve`
- `payments.suspense.resolve`
- `payments.suspense.writeoff.request`
- `payments.suspense.writeoff.approve`
- `payments.provider-account.manage`

Required controls:

- Run/import requires finance control permission.
- Sign-off requires fresh auth and maker/checker separation.
- Manual match approval cannot be done by the proposer.
- Suspense write-off requires approval and threshold rules.
- Provider account mapping changes require dual approval.
- All sensitive actions write audit log entries.

## Ledger And OHADA Mapping

Account mappings should be configured per tenant and country pack, not hardcoded.

The architecture should support:

- 52x bank accounts.
- 53x financial institutions and mobile money accounts.
- 57x cash.
- 51x values/acquirer settlement where configured.
- 58x internal transfer or cash-in-transit.
- 47x suspense for unresolved reconciliation amounts.
- 62x or 63x fee accounts depending chart policy.

Every suspense, fee, settlement, reversal, or correction must be posted through the accounting gateway with source links and period checks.

## Fraud And Control Coverage

The workbench must detect or control:

- Forged callback.
- Replay callback.
- Mutated provider payload.
- Duplicate provider reference.
- Same provider reference with different amount.
- Off-ledger wallet movement.
- Settlement diversion.
- Suspense skimming.
- Fee leakage.
- Refund abuse.
- Manual match concealment.
- Report suppression.
- Late statement import.
- Missing provider account mapping.
- Provider statement mismatch.

Controls:

- Signature validation.
- Payload and file hashing.
- Unique constraints.
- Immutable evidence tables.
- Maker/checker approvals.
- Fresh auth for critical sign-off.
- Provider account mapping gates.
- Exception queues.
- SLA escalation.
- Audit logging.
- Close blockers.

## End-To-End Workflow

### Webhook Flow

1. Provider sends webhook.
2. Route verifies basic request shape.
3. Provider adapter verifies signature.
4. Raw payload and hashes are persisted as `ProviderEvent`.
5. Idempotency and tamper checks run.
6. Event is queued for async processing.
7. Payment transaction state is updated through service rules.
8. Matching candidates are generated.
9. Exceptions or suspense candidates are created when needed.
10. Dashboard refreshes from durable read model.

### Statement Import Flow

1. Operator imports provider/bank/acquirer statement.
2. File hash is computed.
3. Parser validates format.
4. `StatementFile` is persisted.
5. `StatementLine` rows are fingerprinted and inserted.
6. Duplicate or conflicting lines create exceptions.
7. Reconciliation run can be started.

### Daily Reconciliation Flow

1. Operator selects provider account and business date.
2. System locks the provider account/date.
3. System loads opening balance, closing balance, transactions, provider events, statement lines, and ledger balances.
4. Matching engine creates `MatchRecord` rows.
5. Unresolved items create `SuspenseItem` rows.
6. Suspense postings are requested through the accounting gateway where appropriate.
7. Invariant engine computes run status.
8. Exceptions are grouped by rail and severity.
9. Run can be signed only when controls pass.
10. Certificate hash and evidence packet are generated.

## Migration Strategy

Use additive migrations only.

Recommended order:

1. Add enums.
2. Add `PaymentRail` and `ProviderAccount`.
3. Add `ProviderEvent`.
4. Add `StatementFile` and `StatementLine`.
5. Add `PaymentTransaction` bridge with optional `legacyPaymentId`.
6. Backfill from existing `Payment`.
7. Add `MatchRecord`.
8. Add `SuspenseItem`.
9. Add `ReconciliationRun`.
10. Add `PaymentException`.
11. Add indexes and unique constraints.
12. Add immutable-row protections where supported.
13. Add seed/config entries for first provider accounts.

Historical data should not be converted into certified runs. It can become readiness snapshots, duplicate alerts, or backfilled payment transactions, but not provider evidence unless genuine provider statements/events exist.

## Testing Plan

### Service Tests

- Exact provider reference match.
- Duplicate reference detection.
- Same reference with different payload hash.
- Amount mismatch.
- Fee deviation.
- Late settlement.
- Missing statement line.
- Stale pending payment.
- Suspense total equals ledger suspense posting.
- Sign-off blocked with unresolved critical exceptions.
- Closed run cannot be mutated.
- Manual match requires maker/checker.

### Adapter Attack Fixtures

- Forged signature.
- Missing signature.
- Replay event.
- Mutated payload.
- Out-of-order success/failure.
- Duplicate success callback.
- Provider timeout with later confirmation.

### Integration Tests

- One webhook creates provider event and updates payment state.
- One statement import creates statement file and lines.
- One reconciliation run creates matches and suspense.
- One manual match approval creates approved match record.
- One suspense resolution posts through accounting gateway.
- One signed run exports a certificate packet.

### Verification Commands

Recommended focused checks:

- `npx prisma validate`
- `npm run typecheck`
- `npm test -- services/payments/__tests__ --runInBand`
- `npm test -- services/reconciliation/__tests__ --runInBand`
- Route smoke test for `/en/dashboard/finance/reconciliation`
- Browser verification for desktop and mobile dashboard layouts when the local browser environment is available.

## Execution Timeline

### Phase 0: Blueprint Finalization And Gap Audit

Duration: 1 to 2 days.

Deliverables:

- Architecture decision record.
- Permission matrix.
- Existing workbench gap map.
- Provider account and rail inventory.
- First rail selection.
- Acceptance criteria for certified reconciliation.

Exit gate:

- Team agrees that current read-model dashboard is capture-readiness only.

### Phase 1: Additive Schema Foundation

Duration: 3 to 5 days.

Deliverables:

- Prisma enums.
- Core tables.
- Indexes and unique constraints.
- Backfill scaffold for `PaymentTransaction`.
- Provider account seed/config plan.

Exit gate:

- Prisma validation passes.
- Typecheck passes.
- No destructive migration.

### Phase 2: Provider Event Ingestion

Duration: 4 to 6 days.

Deliverables:

- Provider adapter interface.
- First provider adapter stub or real adapter.
- Signature/hash validation.
- `ProviderEvent` persistence.
- Idempotency and tamper handling.
- Inbox/outbox processing.

Exit gate:

- Forged, replayed, duplicate, and mutated events are handled correctly.

### Phase 3: Statement Import Pipeline

Duration: 4 to 6 days.

Deliverables:

- Statement parser interface.
- `StatementFile` and `StatementLine` import.
- File hash and line fingerprinting.
- Duplicate statement handling.
- Import audit trail.

Exit gate:

- A real or fixture statement imports deterministically and creates immutable lines.

### Phase 4: Payment Transaction Bridge And Matching

Duration: 5 to 8 days.

Deliverables:

- `PaymentTransaction` bridge from existing `Payment`.
- State machine.
- Matching engine.
- `MatchRecord` creation.
- Manual match candidate queue.

Exit gate:

- Matching explains every result with rule, confidence, and evidence.

### Phase 5: Suspense And Exception Workflow

Duration: 5 to 7 days.

Deliverables:

- `SuspenseItem`.
- `PaymentException`.
- SLA ownership.
- Exception grouping.
- 47x suspense posting request through accounting gateway.
- Resolution workflow.

Exit gate:

- Unresolved money is itemized and traceable to evidence and ledger postings.

### Phase 6: Reconciliation Runs And Sign-Off

Duration: 4 to 6 days.

Deliverables:

- `ReconciliationRun`.
- Invariant engine.
- Sign-off rules.
- Certificate hash.
- Evidence export packet.

Exit gate:

- Run sign-off is blocked when invariants fail and immutable after approval.

### Phase 7: Dashboard Upgrade

Duration: 4 to 6 days.

Deliverables:

- Durable run summaries.
- Rail failure groups.
- Duplicate provider-reference alerts.
- Suspense queue.
- Evidence drilldowns.
- Manual match workbench.
- Provider account health panel.
- Certificate export UI.

Exit gate:

- Operators can manage the full reconciliation day from the dashboard.

### Phase 8: Close Controls And Fraud Hardening

Duration: 3 to 5 days.

Deliverables:

- Period-close blockers.
- RBAC and fresh-auth enforcement.
- Segregation-of-duties checks.
- Audit log coverage.
- Fraud signal scoring.

Exit gate:

- Closed periods cannot bypass unresolved reconciliation blockers.

### Phase 9: Production Hardening

Duration: 5 to 7 days.

Deliverables:

- Chaos and attack fixtures.
- Focused Jest coverage.
- Typecheck and Prisma validation.
- UI smoke tests.
- Operator runbook.
- Accountant/legal review checklist.

Exit gate:

- First rail is ready for controlled pilot.

Total estimate: 35 to 51 engineering days for the full multi-rail system.

Certified first-rail pilot estimate: 15 to 20 engineering days if limited to one electronic rail and one statement format.

## Recommended First Rail

Start with one electronic rail before expanding:

1. Mobile money if the platform's current tenants rely heavily on MoMo or Orange Money.
2. Bank transfer if statements are easier to obtain in a consistent CSV/Excel format.
3. Card/acquirer only after settlement batch and fee logic are clear.

Do not launch all rails at once. The first rail should prove the evidence pipeline, matching engine, suspense workflow, sign-off, and dashboard before the adapter surface expands.

## Production Readiness Checklist

- Provider account configured and approved.
- Statement source configured.
- Webhook secret or import control configured.
- Ledger accounts mapped.
- Suspense account mapped.
- Fee account mapped.
- RBAC permissions assigned.
- Maker/checker policies enabled.
- Period-close blocker enabled.
- Audit logs verified.
- Evidence hashes verified.
- Matching tests passed.
- Suspense tests passed.
- Sign-off tests passed.
- Operator runbook published.
- Accountant/legal review completed.

## Final Position

The current workbench should remain the operator shell. It is useful now because it exposes payment risk, duplicate references, rail failures, and suspense candidates from existing `Payment` data.

The next implementation must add durable evidence and reconciliation infrastructure underneath it. Once `ProviderEvent`, `StatementLine`, `ReconciliationRun`, `MatchRecord`, and `SuspenseItem` exist, the same dashboard can graduate from capture-readiness to certified reconciliation control.

The product promise should be:

`Payment data visibility now -> provider evidence capture next -> certified reconciliation and suspense control after durable evidence exists.`

Blueprint ready.
