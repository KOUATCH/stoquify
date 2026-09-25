# Retained reconciliation: source findings and proposed bounded contract

Evidence date: 2026-09-05. Design investigation only. The schema, reconciliation owners and APIs below are **proposed, not implemented or executed**. The separately documented accounting admission correction is implemented. No POS/offline candidate has been applied; no database migration, live activation or approval has been manufactured.

## Decision that precedes implementation

The approved design says “Stop new matching; retain reviewed associations and source evidence; drain approved adjustments” (`docs/modern-modules/CONTRACTS.md:43`). It also preserves received payments and narrowly scoped continuation (`LIFECYCLE_AND_CONTROLS.md:31,68`) and mandatory financial integrity regardless of specialist workspace packaging (`BLUEPRINT.md:43`). These requirements must be satisfied together.

An ordinary reconciliation run is currently the only implemented run owner. It matches real payments and external evidence; the source does not distinguish an elective analytical run from a mandatory settlement run. Stopping every new run while Sales/POS, supplier settlement or payroll settlement can create payment facts would strand required controls. Taking only pre-stop PaymentTransaction IDs would also exclude payments created later to settle existing sales orders, supplier invoices or approved payroll obligations. Backdating those new payments, broadening the retained cohort by client date, or labeling every run “continuation” would not solve that boundary.

**Recommendation:** keep direct reconciliation stopping unavailable until the implementation has either (a) verified admission closure for every relevant producer plus retained source-document lineage for later settlement, or (b) an actual, separately authorized mandatory settlement path that remains available independently of elective matching administration. The current code does not establish either condition. Do not invent an elective feature solely to make a stop option selectable. A fixed-source supplementary run is useful engineering work, but it is not sufficient evidence to enable blanket reconciliation deactivation.

Accounting can be corrected independently. Its explicit stopped operation is creation of manual journals. Mandatory posting, existing journal posting/reversal, reconciliation and close checks remain available under their existing permissions and accounting controls. Catalogue eligibility/setup dependencies remain required. The operational dependency registry separately preserves POS→Sales for new sales-order creation.

## Current repository evidence

| Owner | Verified behavior and implication |
| --- | --- |
| `services/reconciliation/payment-reconciliation-run.service.ts:245` | UTC-day selection and one non-void lookup per tenant/provider/day; the schema uniqueness also includes voided runs. An old date is not evidence of pre-stop acceptance. |
| Same file, `runPaymentReconciliation` | Sources are confirmed/settled payments by occurredAt, accepted provider events by occurredAt or receivedAt, and unmatched statement lines by occurredAt. First normalized reference wins. A retained path must detect ambiguity rather than copy first-wins behavior. |
| Same file, `proposeManualMatch` / `approveManualMatch` | Partial amounts and authorized manual evidence are supported. Approval creates an append-only APPROVED correction with a different reviewer. Proposals are currently run-unbound, and approval does not refresh an existing NEEDS_REVIEW run. |
| `services/reconciliation/payment-reconciliation-evidence.service.ts:83` | The certificate manifest reselects all sources by date. A supplementary source scope must be used consistently in execution, detail, sign-off and export; fixing only run creation is insufficient. |
| `services/reconciliation/payment-reconciliation-certification.service.ts:436,1038` | Current sensitive-action, fresh-authentication, independent-maker, open-period, source-hash, exception/suspense, certificate-hash and export-drift checks must remain. A later run never mutates an earlier signed certificate. |
| `services/payments/provider-event.service.ts:102` | Provider adapter authentication, payload hash, duplicate/tamper/replay handling and original captured evidence are already owned here. Provider occurredAt and optional server caller receivedAt do not prove a pre-stop business obligation. |
| `services/payments/statement-import.service.ts` | Authorized imports preserve importer, importedAt, file hash, adapter/source type, line fingerprint and raw-line hash. CSV/manual imports are valid existing evidence types; no new signature-only requirement is proposed. |
| `prisma/migrations/20260815190000_payment_reconciliation_evidence_immutability/migration.sql` | Provider/import evidence fields are frozen, with narrow status/retention exceptions. Keep original hashes, authorship and source records. |
| `services/reconciliation/payment-suspense-workflow.service.ts` | Assignment, reclassification and approved posting exist with their own controls. No automatic resolution/closure owner was found. A later match must not silently write off or close posted suspense. |
| `services/modules/module-reconciliation-obligations.service.ts` | Counts include pending/unmapped canonical payments, unlinked electronic legacy payments, imports, exceptions, inbox work, partial/unsigned matches and open suspense. Categories overlap. They cannot be treated as a unique total or auto-cleared by creating a supplementary run. |
| `services/payroll/payroll-control.service.ts:4940`; `services/purchasing/ap-control.service.ts:988` | Outbound payroll/supplier canonical payments may begin PENDING/SUSPENSE with no providerAccountId. A reference resemblance cannot supply the missing provider authority. |

Graph lookup: `graphify-out/GRAPH_REPORT_actions.md`, communities 53 and 94 locate payroll payment-reconciliation and workbench/RBAC action boundaries. The service relationships above were verified against current source.

## Accepted evidence and matching rules

Keep each source's existing trust semantics. Provider callbacks use their existing adapter authentication/status rules; statement lines use the authorized import record, source type, importer, file hash and line fingerprints; reviewed manual matches preserve the proposal and independent APPROVED correction. The retained path must not convert an unsigned CSV into a signed provider claim, or reject valid imports because they have no provider signature.

The first automatic matching slice can accept an unambiguous exact provider transaction identifier, or a unique reference within the same tenant/provider, with currency, amount and direction compatibility and available unallocated balances. Multiple plausible records, conflicting event/statement channels, missing identity or mismatches go to existing manual review. Do not auto-select the first row, sum the same event and statement as two settlements, or count a PROPOSED record as an approval.

Partial/manual matching remains operable. A run-bound proposal may allocate part of a retained payment against accepted external evidence; its reviewer must revalidate both current source revisions and remaining allocations in the same transaction. Existing proposals without a run remain readable and approvable under their normal controls; an existing approved association may be adopted by reference only after fresh scope/amount checks, without inventing a new reviewer. Rows are not copied into multiple runs as duplicate financial allocations.

Assignment and suspense posting continue through their existing owner. Refreshing run readiness is a read/recompute and audited state transition after actual approved resolution. It does not manufacture a resolution, reverse a ledger posting, or override an open accounting period. Posted suspense requires a genuine owner-controlled disposition before the run can be signed. The missing resolution-to-ready path is required implementation work, not a permanent hidden limitation.

## Proposed exact persistence contract

This is the bounded **canonical-payment supplementary slice**, not authority to enable full stopping. Three additive tables and scoped run fields are sufficient for durable preview revisions without rewriting signed evidence:

1. `ReconciliationRetentionScope`: `id String @id`, `organizationId String`, `lifecycleOperationId String`, `stopModule String`, `stopAcceptedAt DateTime`, `configurationRevision Int`, `sourceHash String`, `capturedAt DateTime @default(now())`. Unique tenant/operation/module. Tenant-scoped restrictive FK to the immutable lifecycle operation. Scope and membership are append-only. A zero-item scope is an explicit record, not inferred legacy access.
2. `ReconciliationRetentionPayment`: `id String @id`, `organizationId String`, `retentionScopeId String`, `paymentTransactionId String`, `sourceSnapshot Json`, `sourceHash String`. Unique tenant/scope/payment; tenant-scoped restrictive FKs. Snapshot stable identity, amount, currency, direction, provider assignment, sourceType/sourceId, legacyPaymentId, payload hash and current ledger link. Capture pending/unmapped payments too, but do not fabricate their provider/state. Add the canonical tenant/id unique constraint required for the composite FK. Later settlement-state changes are recorded as observed evidence; unexplained changes to captured financial identity require review.
3. `ReconciliationRunEvidenceRevision`: `id String @id`, `organizationId String`, `reconciliationRunId String`, `revision Int`, `sourceManifest Json`, `sourceHash String`, `createdById String`, `createdAt DateTime @default(now())`. Unique tenant/run/revision and tenant/id; restrictive tenant/run FK; immutable revisions. The manifest enumerates payment anchors, exact accepted external IDs and hashes, adopted match IDs, allocation facts, trust classification and current accounting-period scope. Unsigned evidence can be revised through CAS; signed evidence cannot.

Extend `ReconciliationRun` with `scopeKey String @default("DAY")`, `retentionScopeId String?`, `evidenceRevision Int?`, `sourceHash String?`, and `requestKey String?`. Replace day uniqueness with tenant/provider/businessDate/scopeKey uniqueness; retain DAY for all existing daily runs. Use a separate tenant/requestKey unique constraint for idempotency. Retained source dates remain real evidence; scopeKey permits a supplementary run without falsifying businessDate. The existing accountingPeriodId identifies an explicitly selected, currently open review period where supported; never reopen a closed period or silently choose a replacement date. Earlier signed runs are referenced in the manifest, not overwritten or voided.

Extend configuration with `newWorkStopOperationIds Json @default("{}")`: a stopped module points to the exact accepted lifecycle operation, alongside the existing cutoff time. Create scope/membership and the immutable REQUEST_ACCEPTED evidence atomically while holding the existing exclusive organization admission lock; resumed modules remove the active pointer, not the old scope. Repeated stops create separate epochs. Existing stopped configurations without a provable scope require a new reviewed operation; never backfill acceptance from createdAt.

Captured membership is the proof, not a date predicate. The existing immediate PaymentTransaction→Organization FK participates in row locking, and the admission writer takes organization FOR UPDATE. PostgreSQL's FK checker uses FOR KEY SHARE on the referenced row; this supports serialization with concurrent inserts. This is a design inference requiring a real two-connection PostgreSQL test against the deployed FK and isolation settings. Source: [PostgreSQL FK implementation](https://raw.githubusercontent.com/postgres/postgres/REL_17_STABLE/src/backend/utils/adt/ri_triggers.c), [row-lock conflicts](https://www.postgresql.org/docs/17/explicit-locking.html). Revalidate snapshot isolation/serialization retries, source-core updates, and exact committed membership; do not rely on timestamps or an untested lock assumption.

## Proposed server API

Actor and tenant always come from the current protected action context. Known run/match/import/sign/export permissions and fresh authentication for sensitive operations remain unchanged.

| API | Input supplied by client | Server-owned result/behavior |
| --- | --- | --- |
| `prepareRetainedReconciliation` | `retentionScopeId`, `providerAccountId`, optional actual `accountingPeriodId`, `idempotencyKey` | Validate current epoch, actor, provider and period; select bounded real retained payment/evidence candidates; persist a DRAFT run and immutable evidence revision. Return runId, revision/hash, actual source descriptions, remaining amounts, conflicts and owner actions. No client dates, cutoffs, amounts or arbitrary payment cohort. |
| `executeRetainedReconciliation` | `runId`, `expectedEvidenceRevision`, `expectedSourceHash`, `idempotencyKey` | Re-read policy/epoch/grants/permissions/provider/evidence and allocations inside transaction; reject stale review; return an existing idempotent result before creating effects. Execute only the reviewed manifest. |
| `refreshRetainedReconciliationEvidence` | `runId`, expected revision/hash, idempotency key | For unsigned runs only, propose/persist a new immutable source revision for the same retained anchors and accepted late evidence. New evidence cannot silently alter the revision already reviewed or signed. |
| Existing manual proposal/approval | Add optional `reconciliationRunId` and expected evidence revision/hash for scoped work | Current source checks plus scoped allocation locks; preserve partial amounts and independent review. No `continuation=true` escape flag. |
| `refreshReconciliationRunReadiness` | `runId`, expected source revision/hash | Recompute totals and readiness from accepted allocations and actual exception/suspense dispositions. No automatic financial writeoff, posting or approval. |

Payment and external-source rows are locked in deterministic ID order when assigning allocations. Compute available amounts across effective non-voided allocations, discount superseded proposal/correction rows, and reject over-allocation. A late unrelated or backdated payment cannot enter a frozen retained cohort. A retry after reactivation or a different stop epoch returns an existing result if already completed, but cannot create new effects under old authority.

## Required source-root extension and stop constraint

Before this can implement full suspension, scope capture must also retain actual pre-stop source obligations and immutable authorized amounts/revisions, including approved supplier invoices/payments, approved payroll liabilities/payment batches and accepted sales/payment obligations. Later canonical payments must prove exact tenant-scoped lineage to those retained objects through their owner services and ledger/source links. Existing `sourceType/sourceId` text alone is not sufficient if it can be supplied or changed without that owner validation. Legacy electronic Payment rows need a reviewed canonical link with preserved amount/currency/identity; they cannot be silently omitted.

Active producers create another category: genuinely new post-stop obligations. They are not pre-stop continuation. Their required reconciliation must remain through a real universal settlement capability or stop admission must be rejected with the precise incompatible producer/operation. Reconciliation cannot declare RETAINED merely because its first snapshot drained while new unresolved payment facts continue arriving. The current POS/offline approval boundary is unaffected by this proposal.

## Proposed implementation ownership and verification

Sequential source scope for review: Prisma schema and one additive migration; new `services/reconciliation/payment-reconciliation-retention.service.ts` and typed contracts; `module-composition.service.ts` for atomic scope capture only; reconciliation run, evidence, certification, sign-off-source-version and sign-off-command-state services; suspense workflow only for a genuine resolution-to-readiness integration; `actions/payments/reconciliation.actions.ts`; module obligation observations. Producer-root capture and settlement adapters are a separately specified extension after their exact owner contracts are reviewed. No POS/offline edits are included.

Required tests before enabling a direct stop:

- Organization/actor isolation, unknown scope, missing/old epoch, permission loss, stale evidence and idempotent duplicates/conflicts.
- Two-connection PostgreSQL capture versus insert/update/stop races, immutable scopes/revisions, composite FK isolation and concurrent partial allocations.
- A verified callback and an authorized CSV arriving after stop for the same retained payment; hashes/import identity remain unchanged; unsigned CSV does not become a signed callback.
- Ambiguous reference, amount/currency/direction mismatch, duplicate event/statement channels, partial manual allocations, independent approval, double-allocation prevention and run readiness after real resolution.
- Existing manual proposals, prior approved matches, posted suspense and unresolved exceptions remain actionable; no fabricated closure or writeoff.
- Signed parent unchanged; supplementary source binding consistent across preview/run/detail/sign/export; unrelated late same-day facts do not widen its certificate; changed included evidence causes drift rejection.
- Pending/unmapped/legacy payments and future settlement of retained supplier/payroll/sales obligations; no newly created post-stop obligation admitted by a backdated date.
- Active producer incompatibility, no final RETAINED while required obligations remain, reactivation/new epoch, preserved grants, and accounting manual-journal stop independence.

No proposed reconciliation schema/API or test above has been implemented or run in this investigation. Direct reconciliation stop remains unsupported. This document specifies the next engineering decisions; it is not financial, legal, security or release certification.
