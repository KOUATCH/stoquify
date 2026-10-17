# Current progress

Updated 2026-10-04T09:38:32.959Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 255f4bffc4c628969b0b53565b804dc656699fe3744a14a03ef17e1ce4a5ad6c. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Three reconciliation producer defects corrected; no workflow closure or denominator change. This turn made progress.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Creation, refresh and preparation → Close | Remaining producers, authority, full recovery | Engineering; exception decisions/source withdrawal |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Complete period scope, publication races, retained history | Statements, other producers, capacity/accessibility | Engineering; same producer handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual services reproduced missing Close invalidation after creation, unsigned source incorporation and preparation. These producers now acquire the complete ordered tenant-period set, compare Serializable membership with committed observations, restart obsolete snapshots within three attempts and invalidate in the source transaction. Preparation/refresh recheck authentication age after waits. New typed creation/preparation reasons preserve existing audit/export semantics. No workflow discovered, reopened or closed.

**Verification:** 212 focused tests/nine suites, full no-emit TypeScript and eight-file lint passed. Nine PostgreSQL cases verify earlier-period scope, discarded obsolete collectors, stale-snapshot restart, both observed lock orders, signed refresh late rollback/retry, exact replay, denied authority/revision and retained signature/export bytes. All 242 source bindings, financial fingerprints and outside-fixture records remained stable. [Detailed correction, receipts and operating guidance](RECONCILIATION_PRODUCER_CLOSE_2026-10-04.md). UI unchanged; no new browser claim.

**Failures and limitations:** The first baseline check incorrectly attributed an already-stale certificate to creation; provider setup had invalidated it. The corrected check isolates actual creation against a newly published assessment; both attempts remain recorded. Previous raw signing/purchase source bindings are historical after the additive shared registry change; current affected-boundary tests and actual signing/retention pass without claiming every earlier scenario was rerun. Genuine provider-statement evidence remains required. The unchanged static boundary finding and separately controlled aggregate policy/release gates remain unresolved.

**Next:** Reproduce and correct exception approval/source withdrawal → Close publication. Current source still narrows its invalidation to run/date periods. Manual allocation and provider event/statement ingestion are other unverified producers. Keep Cash primary and Close supporting.

**Remaining:** Broader authority/transport and financial lifecycles, bank/external evidence, worker deployment, native assistive technology/true zoom, representative period/pool performance and the full original inventory. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
