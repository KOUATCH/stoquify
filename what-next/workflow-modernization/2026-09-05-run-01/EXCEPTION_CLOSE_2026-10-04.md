# Exception approval and source withdrawal → Close publication

2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Cash remains primary and Close supporting, both In progress. The [closure checklist](EXCEPTION_CLOSE_CHECKLIST_2026-10-04.md) retains the full workflow requirements.

## Finding and correction

The [actual predecessor reproduction](lanes/environment/exception-close-baseline-f5ff444d-a4b1-4e89-9f9a-38f43679351b.json) showed both exception approval and withdrawal of a signed source decision leaving a prior-year in-flight Close assessment unmarked as stale. Close consumes reconciliation across the organization, but the producer invalidated only the run's period/date overlaps. Its exception row lock also preceded assessment coordination. Obsolete collectors persisted 18 and 17 evidence rows respectively. These observations had other readiness blockers; the reproduction does not claim they received successful certification.

The correction is confined to `services/reconciliation/payment-exception-closure.service.ts` and its focused test. Approved decisions reuse the existing reconciliation catalog/ordered-period protocol, compare Serializable membership with current committed targets, and restart the entire transaction at most three times when membership changed. Applicable open-period validation precedes the assessment locks; the exception row lock follows them. The same complete period set drives atomic invalidation. Authentication age is checked again after waits.

Proposal lineage, reviewed source hashes, independent reviewer exclusions, financial-treatment prerequisites, existing conditional updates, private evidence and original certificate retention remain. Rejection preserves the source decision and certificate and does not acquire the new assessment locks. Exact replay validates its retained receipt/audit before any new mutation or invalidation. Concurrent conflicting submissions still use the existing conflict/retry response; no guarantee that both callers succeed is introduced.

This continues the existing tenant-wide collector contract. It increases per-tenant contention and needs a free pool connection for committed membership reads. Production period counts, pool pressure and latency budgets remain unverified. No schema, financial posting kernel, UI, pricing, country rule or export format changed.

## Current proof

[248 focused tests in ten suites](evidence/exception-close-jest-8bc50190-cd55-4c9e-b075-f1a11903fc83.json) pass with none skipped. They cover full period scope, lock order before effects, bounded whole-transaction retry, post-wait authentication expiry, rejection/replay behavior, source withdrawal lineage, corroborating evidence, signing and existing Close/order/history contracts. [Two-file lint](evidence/exception-close-lint-3ac55df2-9a89-487e-9650-61db64e9c8fe.json) and [full no-emit TypeScript](evidence/exception-close-typecheck-19e956be-566c-4ad7-a49d-bc296f26f49f.json) pass with stable source bindings.

[Ten owned PostgreSQL cases](lanes/environment/exception-close-acceptance-1ee541d6-a573-40d6-a0be-70e992db5aa2.json) passed with 253 stable source bindings, unchanged observed financial/allocation records and unchanged records outside the owned fixtures. Receipt SHA-256: `eeaa512ec7f391bdbaadc8e273c37f37e4f4c57bbe0a89b9b6f67ff53717d9df`.

| Case | Observed result |
|---|---|
| Source approval, prior-period assessment | Stale marker committed; delayed collectors persist zero obsolete rows. |
| Signed-source withdrawal, prior-period assessment | Reopens the investigation/run, removes current signing status and atomically invalidates Close. |
| Retained signature/history and exact replay | Original certificate payload hash, earlier certified export bytes and decision history preserved; replay repeats no effects. |
| Old snapshot/new publication | One whole-transaction restart detects the newly committed assessment. |
| Rejected withdrawal | Current run and its signature remain byte-for-byte unchanged. |
| Creator-first PostgreSQL race | Waiter 22868 blocks on holder 7084; the assessment becomes stale and discards its obsolete evidence. |
| Producer-first race | Waiter 7084 blocks on holder 2764; the assessment observes committed NEEDS_REVIEW with no false stale marker. |
| Independent reviewer, tenant, revision and authentication denials | Refusal without observed effects. |
| Late source/Close failure | Failure after actual decision, source transition and invalidation rolls back all observed rows. Fresh transaction succeeds, exact replay does not repeat effects, retained exports remain intact. |
| Financial-treatment branch | Actual suspense posting, independently posted clearing journal and approved financial resolution establish prerequisites. Subsequent exception approval invalidates Close without altering those financial records. |

A separate [simultaneous-duplicate check](lanes/environment/exception-close-duplicate-732f7106-b0ab-4733-b94e-c446ded8f39d.json) verifies the risk introduced by moving the row lock: one command commits, the other returns CONFLICT, subsequent exact replay recovers the same receipt, and precisely one approval audit/decision receipt exists. Changing APPROVE to REJECT under that key refuses without effects. Financial and outside-fixture fingerprints remain unchanged. The ten completed publication cases were not repeated for this extra check.

The first [baseline attempt](lanes/environment/exception-close-baseline-dedf1466-073b-4090-90c7-48ef3c23e253.json) failed before the reproduction because its broad payment query selected the fixture's unrelated cash-settlement payment. The corrected verifier selects the payment through the actual run's AUTO_MATCHED record and provider scope. The resulting corroborating case is produced by authenticated event capture and actual additional-source incorporation; no exception, signed or Close state is fabricated. Failed source and before-product/test snapshots are retained. No product change was made to accommodate that verifier error.

## Operating guidance and limits

After approval or accepted withdrawal, retain historical exports and rerun Close assessment. A withdrawal preserves the old certificate as historical evidence and requires fresh source review, preparation and independent signing. Rejection leaves the current certificate intact. If concurrent change exhausts the bounded retry, refresh the proposal review; never overwrite readiness. Renew authentication after expiry. Retry an uncertain response with the same exact decision to recover its receipt; a changed decision requires a new appropriate proposal.

The fixture retains genuine application-generated certificates from before the later source was introduced; this does not waive current provider-statement evidence or establish full Close readiness. All prerequisites and payments are synthetic in the registered disposable loopback database. No live approval/payment, external message, migration, deployment, release certification or X1 clearance occurred. The rejected all-period manual-posting proposal remains unapplied.

Architecture, backend, data, finance, audit, security and operations review apply to the ordering, source hashes, SOD, atomicity and limitations above. Broader persisted role/session revocation races and all transport contracts remain open. No new UI/localization/accessibility claim is made. Pricing, AI and new statutory calculations are not applicable. Prior raw runtime receipts retain their original source bindings; current creation/refresh/preparation/signing services were exercised as prerequisites here, without claiming all earlier cases were rerun or reopening completed workflows.

The unchanged journal-page Prisma import still fails the previously recorded static boundary gate. No scanned application/action/component/hook file changed here. The close-invalidation skill's aggregate policy/runtime/release gates remain separately scoped and unrun; the migration-bearing default build was not invoked.

**Next:** suspense financial-resolution approval → Close publication. Current source updates the suspense state but invalidates only original/clearing journal periods, while Close directly consumes the tenant-wide open-suspense count. This is an actionable source finding requiring reproduction. Manual allocation and provider/statement ingestion remain queued producer reviews. All original 270 workflows, 191 unmapped entries, broader authority, native accessibility, worker rollout, capacity and external-evidence requirements remain; no parent workflow closes at this milestone.
