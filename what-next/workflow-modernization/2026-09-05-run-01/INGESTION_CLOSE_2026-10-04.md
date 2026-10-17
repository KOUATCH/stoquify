# Provider ingestion → Close publication

2026-10-04; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Cash remains primary, Close supporting. [Acceptance checklist](INGESTION_CLOSE_CHECKLIST_2026-10-04.md). No workflow or discovery denominator changed.

## Demonstrated gaps and implementation

The [predecessor reproduction](lanes/environment/ingestion-close-baseline-b39fa5ea-0625-4fad-8423-94ad40f810ad.json) exercised actual HMAC event capture, statement parsing/import, signature rejection and a changed payload for an existing event ID. All four paths allowed an earlier-period in-flight Close to persist 16 obsolete evidence rows without a stale marker. Successful capture/import invalidated only date overlaps; both critical rejection paths omitted Close invalidation. Close consumes provider/statement availability and critical exceptions across the organization. These observations do not establish that the obsolete rows were successfully certified.

The two ingestion services now acquire the existing catalog and full ordered tenant assessment set before provider row locks and source mutations. Transactions explicitly retain Read Committed semantics. After waiting, provider state and duplicates are reread from committed data; a newly published assessment is observed in the same transaction without replaying ingestion. Capture now serializes identical provider events, producing one new source and an ordinary duplicate result for the competitor.

Statement import resolves retained work before new-work admission, acquires admission ahead of catalog/assessment/provider locks, and rechecks retained records under the provider lock. Existing duplicate files and retained duplicate cases keep their replay behavior when new work is stopped. If a retained record disappears while waiting, the request refuses rather than silently admitting new work.

The shared registry adds `PAYMENT_PROVIDER_EVENT_REJECTED`, linked to the actual `PaymentException`. Both signature/replay rejection and altered-payload critical cases invalidate Close through that exception. The existing verified provider record is not overwritten by an altered payload; rejected new events remain unverified. This descriptor records the cause of Close invalidation; it does not assert new external notification delivery or introduce a new source-event publication for the altered-payload branch.

Successful capture/import use the same complete tenant period set. Source rows, existing durable events/outbox messages, and Close invalidation commit or roll back together. Existing security alert behavior, audit/export formats, accounting entries and module rights remain. No schema or UI change was made.

Tradeoff: ingestion can wait behind a tenant's Close work or another provider operation, and the shared period-membership reader needs a free connection. Representative calendar size, pool saturation and provider webhook latency budgets remain unmeasured. External alert delivery and full process-restart/worker dispatch are not established by an atomic outbox test.

## Verification

[198 tests in ten suites](evidence/ingestion-close-jest-83632cb2-0758-418d-9c44-7db25f92b4b5.json) pass with no failed/skipped tests. They cover ingestion, retained duplicate behavior, module stop, provider status after waiting, complete scope/order, security rejection evidence, provider operations, retained signatures, Close history and shared coordination. [Full no-emit TypeScript](evidence/ingestion-close-typecheck-2f75e7f5-e109-4c74-ac51-57410723ca7b.json) and [five-file lint](evidence/ingestion-close-lint-1c1a243d-ec98-4d88-bbaa-bd2604102f4a.json) pass with stable source bindings.

[Eleven owned PostgreSQL scenarios](lanes/environment/ingestion-close-acceptance-170c13bc-7c48-48de-b5bc-8dc9fcd2bb3e.json) all passed with stable source bindings and unchanged outside-fixture fingerprints. Receipt SHA256: `26d67464e6ac804f319a840d25ffcab1f2971fbec9b95af29823ac0b213738d9`.

| Scenario | Observed result |
|---|---|
| Valid event, prior-period publication | Stale marker committed; delayed collector persisted zero obsolete rows. |
| Statement import, prior-period publication | Same complete-scope protection with real parsed statement rows. |
| Rejected signature | Critical exception invalidates Close; rejected source remains unverified. |
| Altered existing event | Original verified payload retained; new critical exception invalidates Close. |
| Assessment published after an earlier read | One Read Committed transaction observes and invalidates the new assessment. |
| Capture, creator first | PostgreSQL waiter 21204 blocked on holder 24940; obsolete publication discarded. |
| Statement, producer first | Waiter 21204 blocked on holder 596; subsequent assessment reads committed ingestion without a false stale marker. |
| Late failure, both successful ingestion paths | Actual source, business event, outbox and stale Close were observed inside the transaction; injected error rolled back all observed rows, then a new transaction succeeded. |
| Simultaneous identical event/file | One event or statement file/line; competitors return DUPLICATE or DUPLICATE_FILE; financial records unchanged. |
| Module/provider/payload denials | Retained file replay allowed during new-work stop; new import, foreign/missing/inactive provider and empty input refused without new source or financial effects. |
| Retained export/current truth | Original certified bytes retained; fresh Close remains BLOCKED for actual critical evidence; rejected events never become VERIFIED. |

Replay retains its existing attempt counters and timestamps. Ingestion is evidence capture, not payment posting, matching, exception resolution or reconciliation signing. Financial comparisons cover the fixture's journal, ledger, purchase, inventory and payment models; rejected security evidence correctly creates its own source/exception records.

The first [unit attempt](evidence/ingestion-close-jest-a76ccb67-966b-4843-abbd-4eb562b76b37.json) had five fixture/assertion failures: raw-lock mocks lacked result rows, and the test used `code` instead of the ingestion error's existing `reason` field. The second [attempt](evidence/ingestion-close-jest-c42f1865-d105-49ca-a927-15f07fae40df.json) had two incorrect assertions looking for the source table in event metadata; the actual durable payload contains it. Tests now assert that payload and exact exception ID. Production behavior was not weakened to satisfy these tests. Both attempts are retained.

## Operating guidance and review

After new provider or statement evidence, reassess affected Close periods. Follow the normal reconciliation incorporation, investigation, preparation and independent signing workflow; successful ingestion alone establishes none of those outcomes. Investigate security rejection using the exception ID and retained original/incoming hashes. Correct credentials or genuinely stale source inputs before retrying; never label rejected evidence verified to remove a Close blocker.

For an uncertain ingestion response, retry the identical event or file. Concurrent duplicates now retain one captured source. Changed payloads remain distinct security cases; this milestone does not introduce deduplication of repeated altered-payload alerts. Keep prior certified exports as historical records; regenerate current review evidence after resolving the underlying conditions.

Architecture/backend/data review addresses lock ordering, Read Committed freshness, source identity, duplicate serialization and atomic outbox/Close persistence. Security review preserves signature, provider scope/status and admission controls; financial/audit review proves no additional financial posting and retained certified bytes. Product and operations review keeps duplicate recovery available and separates accepted evidence from security rejection. SRE review records contention and delivery/capacity limits. No UI/localization/accessibility result is newly claimed. New statutory calculations, AI and commercial packaging are not applicable. These are engineering findings, not professional or release approvals.

Earlier raw producer, exception and suspense receipts include the now-changed ingestion/shared registry files, so their exact source bindings are historical. Existing behavior-specific findings remain retained; the current focused suite and actual preparation of a certified source fixture provide proportionate affected-boundary evidence, not a claim that every previous scenario was rerun. No completed workflow was reopened solely due to broad fixture hash changes.

**Next:** trace and reproduce suspense posting/correction/recovery → Close. Posting still invalidates only its posting period/date; correction/recovery still acquire source locks before assessment coordination. Their actual producer compatibility and full period scope require proof. Manual allocation and source-link repair remain queued; inspection alone does not prove their Close impact. Certificate hash-drift/export invalidation also retains narrower source-date scope and needs review against actual consumers.

The full original Cash/Close lifecycle, broader authority/transport, genuine provider evidence, native accessibility, capacity and rollout requirements remain. Existing static service-boundary and aggregate release gates are unresolved. The rejected all-period manual-posting proposal remains unapplied. No default build/migration, live customer approval/payment, external message, deployment or X1 clearance occurred. Full workflow modernization remains active.
