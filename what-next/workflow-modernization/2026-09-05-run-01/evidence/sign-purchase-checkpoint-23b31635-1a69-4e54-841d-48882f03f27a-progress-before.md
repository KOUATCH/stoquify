# Current progress

Updated 2026-10-01T09:18:31.600Z; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: 572b630719f6244606f6b97df47afca93057730a1a8f2c89db9d2313a6a6a868.

**Position:** 270 workflows, 17 families, 191 unmapped entries; discovery incomplete. Queued 264, In progress 2, Complete—verified 4; other statuses zero. Historical closures have not all been revalidated. No workflow completed or added this checkpoint.

| Priority | Workflow and outcome | Status | Delivered/verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Journal data truth, allowed commands and actual EN/FR recovery | Authority, all producers, delivery and full lifecycle | Engineering; period scope needs user approval | Resolve remaining producer/freshness and recovery criteria |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | Controlled compensation and retained journal history | Earlier-period scope, producers and delivery | Engineering; two historical scope failures | Apply/reverify exact scope only if approved |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Delivered journal review with preserved correction details, in-page password confirmation and deliberate financial retry. Command visibility respects critical permissions and source ownership. Failed/partial reads do not become zero rows; totals preserve separate currencies and exact cents. Table refresh no longer loses the dialog or success focus, and triggers wait for hydration. No workflow was closed or split.

**Verification:** 70 tests/four suites, full no-emit TypeScript and five-file lint passed. Real EN desktop and FR 320px posting/reversal journeys passed with distinct actors, genuine expired-authentication refusal, no automatic retry and exact database effects. Read-only history, keyboard and reflow passed at 1440/768/320px in both languages. Sources and observed outside-fixture state remained stable. Two failed browser attempts exposed lost dialog state and an initial-button readiness gap; both receipts are retained. Failed-read rendering is unit-tested, not browser fault-injected. Native screen reader, actual zoom, inherited console/contrast and production performance remain unverified. [Correction, evidence and operating guide](MANUAL_JOURNAL_RECOVERY_2026-10-01.md); [independent review](MANUAL_JOURNAL_RECOVERY_REVIEW_2026-10-01.md).

**Unchanged blocker:** Earlier-period Close invalidation remains incomplete with two retained PostgreSQL scope failures. Automatic approval review rejected the all-period posting helper twice for contention risk; it remains unapplied pending explicit user approval. Posting/reversal scope helpers are unchanged. [Exact proposal](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md).

**Remaining:** Producer scope, draft-created snapshot freshness, purchase recovery, role/session revocation serialization, interruption/outbox delivery, genuine country/payroll prerequisites and full accessibility/capacity. Financial, sales/POS, inventory/purchasing, HRIS, identity/access/modules, compliance/evidence/reporting, notifications/integrations and AI families retain their original backlog in the [register](WORKFLOW_REGISTER.json). The other 268 rows, all 17 families and statuses are unchanged. No migration, reset, deployment, live activation, payment to a customer, external message or X1 clearance occurred. The full goal remains active; ETA is not reliable.
