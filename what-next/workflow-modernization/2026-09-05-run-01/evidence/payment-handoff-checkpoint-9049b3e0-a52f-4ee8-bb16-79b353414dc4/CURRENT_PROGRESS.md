# Current progress

Updated 2026-10-01T10:08:39.403Z; HEAD 62a56036a5ac9b37236a20c9b148052199069479, branch codex/migration-control-plane-release-2026-08-29. Shared changes preserved. Register SHA256: 7748820483c36b7777959629f6c0bb6d1e9d9f848d9478e42aa2af86d457d955.

**Position:** 270 workflows, 17 families, 191 unmapped entries; discovery incomplete. Queued 264, In progress 2, Complete—verified 4; other statuses zero. PR-10's lease criterion was reopened and reverified after a newly reproduced delivery defect; its register status is preserved with updated evidence. No new workflow closure or added workflow; other historical closures were not broadly revalidated.

| Priority | Workflow and outcome | Status | Delivered/verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Journal recovery and signed-notification ownership | All producers, persisted authority and full lifecycle | Engineering; period scope needs approval | Complete remaining source/authority criteria |
| Supporting | FA-CLOSE-PACK: reliable retained evidence | In progress | 1/4 bounded checks passed; recovery remains open | Global period scope, remaining producers and delivery | Engineering; supplier-payment handoff and period scope | Implement supplier-payment reconciliation admission |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport boundary |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport/scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** An old worker could mark a newer same-name claim sent or failed. Terminal updates now bind the exact attempt and timestamp; obsolete workers leave current state and audit untouched. PR-10's repaired criterion is restored using current delivery evidence plus explicit impact review of retained signing evidence. No new financial signature or user approval is inferred. [Correction and operating guidance](SIGN_LEASE_CORRECTION_2026-10-01.md); [independent review](SIGN_LEASE_REVIEW_2026-10-01.md).

**Verification:** 78 tests/five suites, full no-emit TypeScript and five-file lint passed. Three real database lease interleavings and refreshed competing-worker/lost-acknowledgement recovery passed. Signed and financial records stayed unchanged. At-least-once historical inbox publication is distinguished from ownership of terminal updates; this is not external delivery or production-capacity proof.

**Purchase/Close handoff:** Purchase recovery proof remains incomplete: 1 of four bounded checks passed, with failed criteria retained and unchanged outside-fixture state. Unpaid obligations prevent T4; current supplier release lacks a supported pending-payment reconciliation admission handoff. No successful certification recovery is inferred. Failed attempts are retained; synthetic setup normalization changes no application validator. A separate actual-payment boundary proof records the resulting refusal without clearing its control. [Detailed result](PURCHASE_CLOSE_RECOVERY_2026-10-01.md); [review](PURCHASE_CLOSE_RECOVERY_REVIEW_2026-10-01.md).

**Remaining:** Earlier-period Close invalidation still has two retained scope failures. Automatic approval review rejected the all-period manual-posting helper for contention; it remains unapplied pending the existing explicit approval request. Draft freshness, manual session/legacy-role authority, signing versus new Close publication, other producers, interrupted delivery, country/payroll evidence and complete accessibility/capacity remain open. Finance-export artifact replay is recorded in its existing queued row. [Exact scope proposal](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md).

The other 264 workflow rows and all 17 families remain intact in the [register](WORKFLOW_REGISTER.json): identity/access/modules, financial/ledger/close, sales/POS, inventory/purchasing, HRIS, compliance/evidence/reporting, notifications/integrations and AI. The new handoff finding belongs to existing PA-023/PA-031 as well as Cash/Close. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
