# Reconciliation creation, refresh and preparation → Close

2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Existing shared changes preserved. FA-CASH-COMMAND remains primary and FA-CLOSE-PACK supporting, both In progress. [Bounded acceptance checklist](RECONCILIATION_PRODUCER_CLOSE_CHECKLIST_2026-10-04.md).

## Reproduced defects and delivered correction

Actual services on the registered disposable loopback PostgreSQL database reproduced three missing-invalidation paths: creation, unsigned additional-source incorporation and preparation. Each could leave a RUNNING Close assessment free to publish evidence collected before the source transition. These fixtures ultimately had other Close blockers; this proves obsolete observation without stale metadata, not successful certification of those obsolete observations. The [successful predecessor reproduction](lanes/environment/reconciliation-producer-close-baseline-bdb77cb4-a781-4905-85b0-3b9ef5b34b56.json) preserves both source and outside-fixture fingerprints.

Five implementation files change this boundary:

- `reconciliation-close-order.service.ts` shares the existing period-catalog and assessment-lock protocol across the three producers, compares Serializable target membership with current committed membership, and retries an obsolete snapshot as a complete new transaction, at most three attempts. Empty accounting calendars are allowed for initial run creation; no posting period is fabricated.
- `payment-reconciliation-run.service.ts` takes module admission before catalog/assessment/provider/source locks and invalidates the resolved tenant period set after matching, inside the original transaction. Duplicate creation still refuses; no new financial posting or idempotent-success claim is introduced.
- `reconciliation-additional-sources.service.ts` orders catalog, applicable open period, complete assessment set, provider, run and payment-source locks. Both unsigned and retained-signed refresh invalidate the complete set; signed refresh preserves its prior certificate in the durable receipt. Authentication age is checked again after waits.
- `reconciliation-run-preparation.service.ts` orders the same boundary after module admission, rechecks authentication age and atomically invalidates Close with the preparation receipt. Exact replay returns retained evidence/current status without new invalidation.
- `close-assurance-pack.service.ts` adds typed CREATED and PREPARED source descriptors. Existing SOURCE_REPAIRED remains the refresh descriptor. Audit/event/outbox, historical export format and stale metadata behavior are reused.

Close currently consumes the payment reconciliation dashboard across the organization. A 2026 source therefore affects a 2025 assessment too. Complete tenant-period locking matches that observed contract; narrowing it would first require changing the collector's scope. It adds contention and requires another available pool connection for committed membership comparison. Production capacity/latency budgets are not established here. Business and infrastructure failures retain their existing refusal paths; the bounded retry only handles proven Close membership changes.

## Verification and scope

The final [PostgreSQL receipt](lanes/environment/reconciliation-producer-close-acceptance-8d5e9fc4-2a23-4610-afcd-4cec704963e1.json) passed nine cases with 242 stable source bindings, unchanged financial records and unchanged observed records outside the owned fixtures. SHA-256: `628ec9326c3067e45ada7489a024c450b0e096eb688b45b6aca538a12fb11930`.

1. Creation invalidates a prior-year in-flight assessment; obsolete collectors persist zero rows. Earlier actual certified export bytes/history remain retained.
2. Unsigned refresh invalidates the prior-year in-flight observation.
3. Preparation invalidates the prior-year in-flight observation.
4. Exact refresh/preparation replays do not repeat source effects.
5. Refresh beginning with an older Serializable snapshot detects the new publication and restarts once before committing.
6. Creator-first preparation race: PostgreSQL waiter 24916 blocks on holder 23952; the published assessment becomes stale and discards its obsolete collector output.
7. Producer-first race: waiter 6812 blocks on holder 18656; the new assessment observes READY_FOR_SIGNOFF without a false stale marker.
8. Actual independent signing followed by later-source refresh: an injected failure after all callback effects rolls back every observed source/core/audit/Close record; the prior signature hash remains. A new transaction succeeds, exact replay has no effects and historical certified bytes remain unchanged.
9. Preparation rejects missing permission, unknown/foreign actor or tenant, expired authentication and stale preview without observed effects.

[212 focused tests in nine suites](evidence/reconciliation-producer-close-jest-553deadc-8136-4f31-9068-740c8ef2c3ea.json) pass, none skipped. They include existing signing/retained-signature controls, zero-calendar compatibility, sorted full-period scope, unavailable committed reads, bounded membership retries and authentication expiry during waits. [Changed-file lint](evidence/reconciliation-producer-close-lint-9ff977cf-1f1d-4854-9c7d-5865550f5cc0.json) passes for all five implementation files and three tests. [Final no-emit TypeScript](evidence/reconciliation-producer-close-typecheck-8f2a5cee-93c2-4889-8848-8146f576e072.json) passes. The publication receipt binds these results and all current source hashes before updating the register.

The earlier [nine-case acceptance](lanes/environment/reconciliation-producer-close-acceptance-b9f690fe-c90a-41ea-a317-e66de26e03f7.json) also passed. The final run adds explicit financial fingerprints across the complete sequence and each publication case. Historical verifier versions are retained beside it. No result is a production performance or full-workflow certification.

The first [baseline attempt](lanes/environment/reconciliation-producer-close-baseline-0b2e3b72-324e-4fea-ad0d-3855d15f28a3.json) failed one verifier assertion: provider setup had already invalidated the older certificate. It correctly reproduced the other two gaps. The corrected creation verifier pauses an actual new assessment after provider setup and before run creation. The first process wrote its receipt/disconnected but remained alive on an imported timer; only that identified PID was stopped, terminal exit 1. Later verifiers explicitly exit after evidence finalization. Before-source text snapshots are retained under `evidence/producer-before-20261004-*`; original byte hashes are in the baseline receipt.

## Operation, recovery and remaining work

Checkpoint publication initially updated the SHA-guarded register successfully but the filesystem rejected the progress-page overwrite. The process exited 1; both before-files had already been retained. The progress page was completed through the file-edit tool and the finalizer verifies the saved before-files, updated register, progress text, receipts and source bindings. The register writer was not rerun, so no criteria were duplicated.

Keep existing exports as historical records. After creation, incorporation or preparation, rerun Close assessment and address its actual findings. An expired authentication window requires renewed authentication. A stale preview requires refreshed evidence and deliberate submission. If the bounded membership retry is exhausted, refresh and retry; do not overwrite readiness. After a lost preparation/incorporation response, retry the exact request key to recover its retained receipt. Duplicate run creation continues to return a conflict.

No schema/migration, deployment, live provider action, payment, professional approval or X1 clearance occurred. Before rollout, exercise representative tenant period counts and connection-pool pressure through the existing release process. Reverting invalidation alone would restore the reproduced gaps. The previously rejected all-period manual-posting proposal remains unapplied; this is the separately reproduced reconciliation boundary.

Architecture, backend, data, finance, audit, security and SRE reviews are addressed above. Full persisted authority revocation races and all transport routes remain separate requirements. UI/localization/accessibility have no new verification claim; no page or component changed. Commercial pricing, AI and country calculation are not applicable to these transactions. No statutory certification is inferred.

The existing static boundary gate retains its unchanged journal-page Prisma import finding; no application/action/component/hook file changed here. The selected close-invalidation skill's aggregate `policy:gates` command remains unrun because its runtime/database/release checks require separately scoped execution. Full build was unnecessary for these service changes and its migration-bearing default was not invoked.

Current assessments still need genuine provider statement evidence. Prior signing/purchase receipts remain historical at their original hashes where this additive shared registry change affects bindings; the current regression and actual signing/retention sequence provide explicit affected-boundary evidence, without silently recertifying all older scenarios or reopening completed workflows.

**Next:** exception approval/source withdrawal → Close publication. Current source still limits that invalidation to run/date periods and lacks this ordered publication boundary. Manual allocation and provider event/statement ingestion are additional remaining producers. These are actionable source findings, not yet runtime-confirmed defects. Preserve the full 270-workflow inventory, 191 unmapped entries, native accessibility, broader authority, worker rollout, capacity and external-evidence requirements. No parent workflow is closed by this correction.
