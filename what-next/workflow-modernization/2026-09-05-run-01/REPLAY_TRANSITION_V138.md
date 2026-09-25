# Replay transition integrity — v138

Status: bounded v138 evidence published. This is a prerequisite for verified conflict resolution, not completion of the offline or platform workflow.

## Reproduction and correction

Tracing the path from reviewed conflict to resolution exposed unconditional writes in both successful and failed offline replay. A worker loaded an event, performed work, then overwrote that event without checking whether another worker or reviewer had changed it. The success path also relied on a posting reference obtained before its final transaction rather than rechecking the actual posting at acknowledgement time.

Three new regressions failed against the previous implementation (`668833`): missing current posting evidence still returned DUPLICATE_REPLAY; a stale successful worker still acknowledged; a stale failed worker still overwrote the event as BLOCKED.

Both transitions now condition their write on the exact event ID, organization, PENDING_REPLAY state, observed update time, accepted payload/hash, metadata, device/terminal/location/session and existing posting/document/blocker references. Comparing the actual JSON evidence protects against changes that retain the same timestamp. A zero-row conditional update raises a bounded conflict. The success transaction additionally requires the actual POSTED sale-completion journal entry with the expected posting batch, and an ACTIVE device in the same organization/terminal/location. All acknowledgement/event/audit/outbox/certificate effects remain in the same serializable transaction. A losing failure transaction rolls back its newly created conflict record. Serialization conflicts are translated into the same retryable conflict response.

The finalization error handler propagates transition conflicts rather than relabeling them as sale failures and writing another blocker. If sale finalization already completed, its existing immutable commit result remains authoritative. Retrying the original request uses that result; it must not generate a replacement sale or tender.

No accepted payload, financial posting, device signature requirement, authorization gate or commercial eligibility was weakened. Historical replay acknowledgement remains distinct from current device eligibility: terminal evidence reads retain the existing v136 verification behavior. Existing blocked events are not reset or resolved automatically.

## Verification

- Final 84 tests across offline sync, commit recovery, POS service and sync actions passed (`466bb6`). The new cases cover missing current posting, stale successful and failed workers, revocation after the initial read, and acknowledgement prerequisites disappearing after sale finalization. Existing fiscal-delivery blockers and original-request behavior remain covered.
- Both changed TypeScript files passed final lint (`360ba7`). Final typecheck passed (`6be12d`); source bindings and commands are recorded in `evidence/pos-replay-transition-v138.json`.
- Owned PostgreSQL verification passed (`f028a5`, `lanes/environment/replay-transition-v138-ecadce74-dfe4-4c63-848c-215d8a8aeb3c.json`). Two workers were held after reading the same original event and then released together. Success yielded one winner, one typed conflict, one business event/audit/outbox and unchanged financial records. Failure yielded one conflict/audit/business event, with no orphan record from the losing transaction. An intervening metadata update with the original timestamp preserved survived a stale acknowledgement unchanged. Retrying the completed acknowledgement produced no additional effects.
- The first database attempt passed the two races but hit a duplicate fixture device label before its stale-metadata case (`444810`). Labels were made unique; the failed artifact remains retained. Intermediate test failures while updating mocks are retained in tool receipts (`c537f1`, `2f9975`); final assertions explicitly include the required scope/status/revision predicate.
- A stronger same-timestamp metadata fixture then failed (`c4fdb1`), proving the timestamp-only condition insufficient. The final predicate compares payload and metadata values as well. Its actual database rerun passed at the final source binding. The timestamp is intentionally controlled test evidence, not a claim that an observed production race used an identical timestamp.

The fixture uses actual local PostgreSQL transactions and cash postings but directly creates synthetic PENDING_REPLAY events. It does not prove a device signature/ingestion journey or production capacity. Financial snapshots cover the enumerated sale, inventory, payment/refund, journal, session, drawer and commit records. Event/audit/conflict/outbox counts are separately asserted. They are not a universal database audit.

No interface, translation, schema or migration changed. No new browser pass is claimed. v137 EN/FR review screenshots remain historical at their source bindings; this patch does not enable offline capture or replay in the application. The deployment guard remains test-only.

## Operator and rollout procedure

On a transition conflict, retain the original offline event and commit identifiers. Reload current evidence before retrying the original operation through its authorized caller. A concurrent winner may already have completed acknowledgement; the existing terminal-read path verifies that evidence without creating new financial effects. If the event remains pending or blocked, investigate its current device state and posted-entry linkage. The original event/commit IDs come from retained sync records; posting batch and sale-completion records come from the accounting journal; device status comes from enrollment records. A note or copied posting reference is not proof that a current posting exists.

Do not change an accepted payload, reset a terminal event to pending, delete a review or create a replacement payment to clear an error. Actual correction/supersession and resolution still require implementation. Keep the last persisted state while investigating. No user approval or external access is required for the next ordinary implementation batch.

Use existing application release controls; no migration is needed. Prefer a forward correction to restoring unconditional writes. Preserve all retained events and audits in rollback. Production rollout/recovery rehearsal, device lifecycle and full close assurance remain open. Verification target: `stoquify_local_registration_20260906_01`; branch/commit/dirty source bindings are retained in the v138 baseline. No production deployment, live payment, external message, approval fabrication or X1 clearance occurred.

## Review responsibilities and remaining scope

Architecture/backend/database: conditional transitions and atomic serializable effects. IAM/device boundaries: current scoped device revalidation; existing identity/permission controls preserved. Finance/accounting/audit: actual posting linkage, immutable original result and no duplicated money or event effects. API/events/offline: typed conflict, idempotent terminal retry, preserved accepted evidence and existing deployment guard. QA/SRE/operations: failed reproduction, focused regression and actual overlapping transactions; no production performance claim. Frontend/accessibility/localization: no changed interface. SaaS packaging, country formulas, HR/payroll, AP, analytics and AI behavior are not applicable because none changes; their workflows remain in the platform inventory. These are engineering reviews, not professional approvals.

Next: implement reviewed correction/supersession and actual operator resolution using the now-protected transition boundary; finish queue/history/draft continuity, full signature/ingestion/revocation/replay/close lifecycle and the wider workflow register. The full goal remains active and is not globally blocked.
