# Offline continuation review candidate

**NOT APPLIED. NOT EXECUTED. NOT APPROVED. No production enablement is proposed.**

This package supersedes the incomplete adjacent `offline-continuation-proposed.patch`. It prepares a concrete source review following the two automatic approval-review rejections recorded in `../OFFLINE_CONTINUATION_APPROVAL.md`; it is not another attempt to apply that rejected change. Only new files in this review-artifact directory were written.

The canonical candidate is `offline-continuation-candidate.patch`. `CANDIDATE_MANIFEST.json` identifies all five proposed paths and hashes. Files ending in `.txt` are inert review copies, not application modules. Patch application was checked **in memory against the captured source text only**. Typecheck, lint, tests and SQL execution have not run.

## Exact proposed source scope

| Proposed path | Changed functions / purpose |
| --- | --- |
| `services/pos/pos.service.ts` | Add `commitAcceptedOfflinePOSSale`; retain public `commitPOSSale` signature as a wrapper; move its unchanged financial body into private `commitPOSSaleInternal`. Only the private stored-event path calls continuation admission. Existing COMMITTED/COMPLETED registry resolution remains before new admission. |
| `services/pos/offline-sync.service.ts` | `ingestBatchInTx` takes shared organization admission lock and exclusive device lock before source reads; distinguishes exact duplicates before denying new envelopes. `recordAcceptedOfflineEvent` stores a server-created proof. `replayPendingOfflineSaleEnvelope` calls only the stored-reference entry; removes the completed-sale heuristic that skipped exact registry matching. `markOfflineSaleReplayed` and `blockOfflineSaleReplay` re-read under locks; a late failure cannot overwrite committed/replayed work. The old extraction/scope/heuristic helpers become unnecessary and are removed. |
| `services/pos/offline-continuation.service.ts` | New server-only helper: scoped envelope parsing; database wall clock; locked server-draft fingerprint; versioned acceptance proof; current transactional acceptance/cutoff revalidation. |
| `prisma/migrations/20260905210000_protect_offline_acceptance/migration.sql` | Proposed SQL-only guards freeze accepted envelope identity/content/link and the acceptance business-event identity/payload. Preserve operational status, error and delivery fields. This proposed migration name was confirmed unused; it must be registered through the existing migration catalogue workflow after approval. No source migration directory was created. |
| `services/pos/__tests__/offline-continuation.service.test.ts` | Proposed focused helper tests for clocks/cutoffs, scope, canonical evidence, changing payload/cart, foreign actors/tenants, and source failures. |

No changes to deployment configuration, environment gates, stop-support flags, permissions, billing, grants or financial posting rules. Ordinary commit, refunds, voids, closing shifts, stock posting, ledger posting, receipt permissions and tenant-derived action context keep their existing controls.

## Acceptance and ordering contract

1. Ingestion calls the existing `getModuleAdmissionInTx`: organization `FOR SHARE`, then configuration `FOR SHARE`. Configuration/stop writers already take organization `FOR UPDATE`. The shared lock is held through event creation, acceptance, outbox creation and device sequence advancement in the same transaction. A device `FOR UPDATE` lock prevents two upload transactions advancing the same hash chain from the same stale sequence.
2. Exact existing event/sequence evidence is resolved before denying a **new** sale/tender/receipt envelope. The comparison also binds tenant, device, terminal, location, session, type, schema and sequence. A duplicate-only upload keeps its existing duplicate result; an atomic batch mixing duplicates and newly forbidden envelopes rolls back the batch, without changing previously accepted events. It can be retried with the duplicates alone. Existing terminal/device/session restrictions are not relaxed.
3. Newly received envelopes after a stop are rejected even with backdated device time. New drawer/session evidence stays within its existing nonfinancial ingestion path. This does not authorize a new tender/receipt envelope merely because it names an old sale.
4. PostgreSQL `now()` is transaction-start time. The proposed `receivedAtServer` and proof `acceptedAtServer` use database `clock_timestamp()`, truncated to stored millisecond precision, **after admission locking**. Neither comes from caller metadata or `capturedAtDevice`.
5. The proof stores server-derived actor/tenant/device/terminal/location/session, source hashes and sequence, observed configuration revision, server receipt/acceptance times, signing-key hash/verification mode, and the server cart fingerprint. The fingerprint locks the parent sale and lines, includes persisted sale/line values, and is rechecked before financial effects. This prevents an accepted ID being used to complete different equal-priced goods later.
6. Replay resolves the stored event internally. In the existing serializable POS transaction, exact COMMITTED/COMPLETED registry results win first; unfinished new effects re-read current admission and fresh scoped acceptance under organization → device → event → acceptance → sale/line locks. Current domain controls then run normally.
7. For every currently blocking required dependency, **receivedAtServer, proof acceptedAtServer and acceptance recordedAt must all be strictly earlier than its valid cutoff**. Missing, malformed, equal or later cutoffs deny. Device time never participates. Current cutoff timestamps still come from the existing configuration service clock: clock disagreement can produce a conservative denial, never a bypass. This candidate does not change that service or pretend to certify clock synchronization.
8. The linked BusinessEvent `payloadHash` hashes the sale payload, not the acceptance metadata. The new `continuation.proofHash` separately covers the complete proof; the migration freezes the underlying accepted envelope and acceptance payload. These controls do not prove identity against a privileged database owner who can disable triggers.
9. Receipt errors after a proven financial commit leave the envelope pending for registry-based retry. A failure writer takes the same device/event locks and checks for a commit registry before recording BLOCKED. A late failure returns an error requiring receipt recovery instead of converting committed work into a blocked obligation.

## Limits that prevent production enablement

- The existing `NODE_ENV === "test" && AQSTOQFLOW_ENABLE_OFFLINE_POS_REPLAY_TESTS === "1"` restriction remains at replay and the new stored-reference entry. Development/production execution stays denied even if the opt-in variable is set.
- No historic event receives a fabricated proof or an inferred earlier timestamp. Legacy/opaque envelopes can retain no-stop ingestion/replay behavior where their existing evidence is valid; they cannot cross a stop without the new proof. Before any future stop-support enablement, resolve or independently review all such retained obligations. This patch does not enable POS or Sales stopping.
- Replay remains tied to the original authorized cashier and server cart/session. It introduces no manager handoff, closed-shift reopening, replacement sale, or exception approval. Inactive device, changed key/cart, closed shift, unavailable stock or accounting readiness can still prevent completion through existing controls.
- Existing terminal/status fixtures and tests that mocked `commitPOSSale` or relied on the old completed-sale heuristic must be adapted to the proposed exact registry contract during isolated verification. The proposed helper test is not a substitute for those integration tests. **The package is therefore a reviewable implementation candidate, not a claim that all existing tests already pass.**
- Trigger retention also affects deletes cascading from organization/session/batch/business-event relationships. A production retention/deletion decision and migration impact review are necessary before applying the migration outside the specifically approved isolated test target.
- The immutable proof and replay scope cover server-accepted envelopes. A broader policy for device-only sales not yet received at a stop, after-shift cashier handoff, legacy proof adjudication, or production offline replay requires separate design and authorization. It is not safely solved by the original two-file patch.

## Proposed isolated verification and rollout safeguards

Approval should cover **these five source paths**, normal migration-catalogue registration, required related test-fixture updates, and isolated verification; it must not imply permission to deploy, activate a customer, enable POS/Sales stop options or weaken replay restrictions.

1. Recheck every base hash and review any drift. Retain the current source/tests and captured base for rollback; do not overwrite unrelated changes.
2. Use a dedicated synthetic localhost database, proposed name `stoquify_local_offline_continuation_review_20260905_01`, with both DATABASE_URL and DIRECT_URL explicitly verified against that name. Never use the ordinary development database, a live tenant, or an inherited unverified URL. Creating/migrating that target has not been performed by this package.
3. Register the additive SQL migration through the existing process. Apply it only to that approved isolated database and inspect constraints, triggers, errors and lock behavior. No default migration-bearing build command is needed.
4. Adapt existing test fixtures to real canonical accepted evidence; do not weaken source checks to preserve placeholder hashes. Run the test plan, typecheck and focused lint. Capture before/after source hashes and complete failure output.
5. Keep both replay gates and all unsupported stop flags unchanged. Release readiness remains separately gated even if isolated tests pass.
6. Abort candidate rollout on incorrect idempotency, cross-scope access, post-cutoff acceptance, duplicate financial effects, unbounded lock waits, failed immutable-field checks, or regression in ordinary sales/closing/refunds.
7. For isolated recovery, stop only the candidate test process; retain the synthetic evidence for diagnosis. Restore reviewed source from the captured base using a targeted reverse patch after preserving new user changes. No customer database reset or recursive deletion is part of this approval. Migration rollback outside the disposable isolated target requires a retention review; do not casually drop protection from live accepted records.

No tests were reported passed for this candidate. See `TEST_PLAN.md` for exact assertions and `CANDIDATE_MANIFEST.json` for the narrow text-only check that was performed.

