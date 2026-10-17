# Current progress

Updated 2026-10-04T10:52:23.032Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 72cde41a11bc0ebba8a6e94540977b202579de02d7700d794d54188adaa21e35. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Posting stale evidence and a retained-replay deadlock corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Suspense posting, replay and correction collision | Broader correction/recovery, authority and delivery | Engineering; reverse lock compatibility |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Posting scope, races and rollback | Other producers, statements, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** A real posting left an earlier-period collector able to persist 15 obsolete rows, including the prior suspense status. New postings now coordinate the full Close scope before source rows and advance authentication through waits. A further database reproduction found a deadlock between source correction and retained posting replay. Replay now omits unnecessary assessment locks, retains source/receipt verification and returns a normal stale-state conflict if correction supersedes it. No discovered workflow was reopened, closed or added.

**Verification:** 169 tests/nine suites, full no-emit TypeScript and two-file lint pass. Eight PostgreSQL scenarios verify zero obsolete rows, both observed publication lock orders, whole-snapshot retry, balanced once-only posting, closed-period retained replay, financial/source/receipt/outbox/Close rollback and retry, denials and the corrected deadlock. Outside-fixture fingerprints are unchanged. [Correction, receipts and operating guidance](SUSPENSE_POSTING_CLOSE_2026-10-04.md). No new browser/accessibility or performance certification is claimed.

**Failures retained:** One unit assertion used the wrong AND/OR query shape. One database fixture exceeded the existing invoice-number limit. Both were corrected without weakening production rules. The reproduced 40P01 deadlock led to a production fix; current collision verification observes source waiting and a safe 40001 conflict after correction. Earlier intermediate receipts remain historical where final source changed. Published ingestion evidence remains applicable; it does not bind the changed posting service.

**Next:** Review correction/recovery against other valid and stale commands, resolution replay, period closure and assessment publication. Their source-before-assessment ordering still needs consumer-based verification. Manual allocation, source-link repair and certificate drift/export scope remain queued. Keep Cash primary and Close supporting.

**Remaining:** Full authority/transport/recovery lifecycles, authentic provider evidence, native accessibility/true zoom, representative period/pool performance and worker delivery/rollout. Existing static boundary and separately controlled aggregate policy/release gates remain open. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). The full goal stays active; ETA is not reliable.
