# Purchase reversal, retained Close evidence and Cash recovery

Primary: FA-CASH-COMMAND. Supporting: FA-CLOSE-PACK. These workflow identities and their full closure criteria remain unchanged. The preceding journal-recovery turn was progress: it delivered verified UI/data-truth corrections and updated the authoritative register.

## Baseline and priority

Evidence date 2026-10-01; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Shared changes preserved. Register predecessor SHA256 `572b630719f6244606f6b97df47afca93057730a1a8f2c89db9d2313a6a6a868`: 270 workflows, 17 families, 191 unmapped entries; 264 queued, two in progress and four historical verified closures. Discovery remains incomplete.

The existing [source-owned reversal milestone](SOURCE_REVERSAL_ORDER_2026-10-01.md) and purchase runtime `b4e944ec-722b-4f31-a9bd-8f17a0d6adb5` establish exact source compensation, replay and rollback before final Close invalidation. They explicitly exclude purchase publication races, retained certified-export freshness and Cash recovery. Current purchase service, correction-ledger helper, period-scope helper and old driver still match that receipt. This milestone tests that missing connected lifecycle rather than inferring it from compensation tests.

The rejected all-period manual-posting proposal remains unapplied. Draft creation's tenant-wide snapshot dependency overlaps that design, so it will not be implemented under a different helper name. Explicit local approval has been requested asynchronously; this independent purchase handoff can proceed.

## Acceptance before implementation or execution

1. Build an owned synthetic receipt, independently approved invoice, return and supplier credit using existing domain services. Disclose any synthetic prerequisite rather than claiming its approval workflow was exercised.
2. Obtain current Close assessment and certified export only through actual services and real satisfied prerequisites. Retain original artifact bytes/hash and saved evidence. If controls refuse readiness, record the concrete cause and repair only a demonstrated engineering defect; never force READY/CERTIFIED rows.
3. Reverse the credit and then the return. Verify exact journal mirrors, supplier/outstanding balance and stock consequences, immutable source history and no unrelated payment effects. Require affected retained Close evidence to become stale immediately and Cash/Close to expose the changed truth.
4. Reassess actual resulting records and conditionally certify a new export. Preserve historical exports and unresolved adverse obligations; a passing refusal is not recovered readiness.
5. Exercise creator-first and reverser-first publication orderings with separate actual PostgreSQL backends and observed blocking, including an affected period with no existing assessment. An artificial delay without observed blocking is insufficient proof.
6. Inject a failure after actual invalidation event/outbox writes. Require complete source, financial, stock, evidence and sequence rollback; then independent retry and exact replay without duplicate effects.
7. Bind source and raw results, guard the exact owned loopback database and compare observed outside-fixture state. Serialize heavy checks. Record failure, timeout and partial results accurately.
8. Update the two existing workflow rows and the short progress report only for criteria actually proved. Keep full Cash/Close status in progress and the original backlog intact.

## Review and execution controls

Architecture/backend/data, finance/purchasing/inventory/ledger, authority/audit, quality and operational recovery reviews apply. The runtime worker owns only new inert verification files; the independent reviewer checks source and proof contracts; the coordinator controls execution and any demonstrated product repair. No production code change is claimed at this baseline.

Frontend/design-system/localization/accessibility: no new interface change is proposed; original runtime UI requirements remain open. Statutory country rules, billing, external providers, offline behavior and AI policy: not applicable to this bounded handoff because their contracts do not change. These are engineering responsibilities, not professional approvals.

Only `stoquify_local_registration_20260906_01`, after identity and ownership checks, may receive synthetic fixtures. No migration, seed, reset, production deployment, real payment, external message, live activation or X1 clearance is included. Existing earlier-period/global-snapshot scope and supplier/invoice lock-order limitations must remain visible even if this bounded proof passes.

## Verification and outcome

The reviewed driver has run twice against the exact owned local database. Both attempts retained stable source bindings and unchanged observed outside-fixture state, with terminal exit 1. No certification success is inferred from them.

1. [First attempt](lanes/environment/purchase-close-recovery-runtime-d9b0c686-29f0-4392-8c4e-d2bdfbef5797.json): all four cases stopped at `JOURNAL_AMBIGUOUS`. The inherited receipt fixture created synthetic purchase/inventory journals, and the general setup service added canonical journals of the same types. The fixture now normalizes only those two new synthetic journal codes before any posting, calls the unchanged setup service, and requires exactly one active default per required type. Existing synthetic PO/master rows are prerequisites; this is not a claim that the fixture contains no business rows.
2. [Second attempt](lanes/environment/purchase-close-recovery-runtime-f2ca2ccf-4308-47ef-8610-594456b1606d.json): the creator-first race passed, including actual PostgreSQL blocking and prevention of stale collectors restoring readiness. Three cases could not establish the intended certified/recovered state because genuine unpaid supplier obligations produce `purchasing.ap.open-items`, leaving trust at T3. `READY` alone does not mean T4 or certified. The gate remains effective.

The payment-path investigation found a missing implementation. Actual payment request, independent approval and separate execution recording can settle the invoice, but they create a provider-less `PENDING` outbound transaction and an `OPEN` missing-statement exception with no suspense/run lineage. Existing provider-scoped confirmed-payment matching and original-suspense exception closure cannot adopt those records. The [independent review](PURCHASE_CLOSE_RECOVERY_REVIEW_2026-10-01.md) records exact source bindings and the required handoff contract.

A separate [actual-payment boundary receipt](lanes/environment/purchase-payment-close-boundary-4058ad69-00b3-49d4-8046-37df0437459d.json) now verifies both adverse-boundary checks, with stable sources, unchanged observed outside-fixture state and terminal exit 0. Three distinct persisted actors request, independently approve and record synthetic local execution through the actual services. The exact XAF 17,500 payable falls to zero; the invoice becomes `PAID`, with one balanced AP/cash journal, posting batch, source link and supplier-ledger effect. Exact replay makes no further changes, and retained stock/source/prior financial rows are conserved.

The resulting transaction remains provider-less `PENDING`, with the original `OPEN` missing-statement exception and no suspense/run link. Actual exception closure refuses that missing link. The new Close assessment and portal are `BLOCKED`/T2; Cash, current proof and the snapshot agree on `blocked`. Certified export is refused, with no export created or payment/source evidence changed. **This verifies truthful refusal, not successful recovery.** The receipt explicitly records `positiveRecoveryEstablished: false`; the original four-case result remains one passed and three failed criteria.

Two earlier adverse-verifier attempts are preserved: [16746d46](lanes/environment/purchase-payment-close-boundary-16746d46-96c8-49dd-9301-7b4e3cf347b7.json) stopped before payment checks because a synthetic credit-note label exceeded the existing length limit; [db97b23c](lanes/environment/purchase-payment-close-boundary-db97b23c-bfda-4d70-a68d-139b1bdd6735.json) stopped at the verifier's incorrect empty-warning expectation. The latter correctly surfaced `COUNTRY_TREATMENT_REVIEW`, which the existing payment-recording contract includes in its revision and permits without clearing it. The final verifier asserts and retains that warning, including `withholdingTreatmentStatus: NOT_CONFIGURED`; it changes no country setup or application gate. No statutory approval or external settlement is established.

## Required next implementation and operator guidance

Full certified recovery needs an implemented source-owned supplier-payment reconciliation handoff, including appropriate bank/provider or defined cash evidence, tenant/currency/amount/direction binding, current review authority, idempotency and original exception lineage. This belongs to existing PA-023/PA-031 and the Cash/Close dependency; no new workflow is invented. The detailed acceptance contract is in the independent review. This is engineering work, not an approval record to invent.

Operators must distinguish `RELEASED`/`POSTED` execution from reconciled settlement. Keep the original execution evidence and the pending exception; do not repeat the payment to repair its reconciliation state or associate an arbitrary provider to clear the gate. Use actual retained supplier/payment IDs, approved execution reference and authentic source evidence when the supported reconciliation handoff is implemented. Country-treatment review also remains explicit. The isolated proof uses synthetic documents, destination and actors and does not authorize a customer payment.

No product source change was needed for the observed purchase publication-order behavior. No migration, deployment or new browser verification is claimed; the wider Cash/Close lifecycle and original positive recovery criteria remain open.
