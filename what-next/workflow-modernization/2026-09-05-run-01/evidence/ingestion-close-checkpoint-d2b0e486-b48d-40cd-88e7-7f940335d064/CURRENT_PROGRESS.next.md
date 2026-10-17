# Current progress

Updated 2026-10-04T10:33:45.503Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 5536439084df6b8bf6e9e556d690f9933d73411371851cdafed97f9d6395e767. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Four ingestion/Close gaps corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Provider/statement ingestion → Close | Other producers, authority, full recovery | Engineering; suspense posting/recovery |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Accepted/rejected evidence, races, retained exports | Other producers, statements, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual event capture, statement import, rejected signature and altered-event detection each let an earlier-period collector persist 16 obsolete rows. Ingestion now coordinates every tenant assessment before provider rows and rereads committed provider/idempotency state after waits. Critical rejections have their own exception-based invalidation reason. Statement admission precedes coordination; retained duplicates remain usable when new work stops. No workflow discovered, reopened or closed.

**Verification:** 198 tests/ten suites, full no-emit TypeScript and five-file lint passed. Eleven PostgreSQL scenarios verify all four branches, zero obsolete rows, Read Committed freshness, both observed lock orders, source/event/outbox/Close rollback and retry, simultaneous single-source duplicates, provider/payload denials, stopped-work retained replay and original certified bytes. Financial records and outside-fixture fingerprints remain intact. [Detailed correction, receipts and guidance](INGESTION_CLOSE_2026-10-04.md). No new UI/browser claim.

**Failures retained:** Two unit attempts exposed incomplete raw-lock mocks and assertions against the wrong error/metadata fields. Final checks verify the existing ingestion reason and actual durable exception payload; production controls were not weakened. Earlier raw producer/exception/suspense bindings are historical after ingestion and the shared registry changed. Current affected-boundary tests and genuine retained exports pass; previous scenarios were not all repeated.

**Next:** Reproduce suspense posting/correction/recovery → Close. Posting still narrows invalidation to its posting period/date; correction/recovery still lock source rows before assessment coordination. Manual allocation, source-link repair and certificate hash-drift/export scope remain queued for consumer-based review. Keep Cash primary and Close supporting.

**Remaining:** Full financial/authority/transport lifecycles, authentic bank/provider evidence, native accessibility/true zoom, representative provider latency/pool/period performance and worker delivery/rollout. Existing static boundary and separately controlled aggregate policy/release gates remain unresolved. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
