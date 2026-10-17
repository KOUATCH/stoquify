# Current progress

Updated 2026-10-04T05:21:05.870Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: d062ba506427e964f1b0aad10df5da54a11557f6ca5dd8001bd5c805c836b34c. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Replacement and protection against conflicting evidence | Explicit history resolution, remaining races/accessibility and delivery | Implement authorized investigation/recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Preserve guards; improve diagnostics |

**Since the previous report:** Ambiguous-history investigation exposed a direct-writer bypass: a chosen request/response could be processed while other retained records conflicted. New responses and acceptances now require the exact expected evidence set; acceptance rechecks after the finding lock. Both queue variants include malformed records in validation. Existing exact retries remain valid. This correctness prerequisite was addressed before building a recovery decision. No workflow was discovered, reopened or closed.

**Verification:** Six focused pre-fix cases reproduced the bypass. Final 554 tests, no-emit TypeScript and lint passed. Seven owned-database checks verify conflicting evidence, post-preview changes, valid acceptance, exact retries and concurrent acceptance without false investigation. Initial browser checks exposed error-code translation losing investigation guidance; the shared mapping was corrected and regression-tested. Final EN/FR browser submissions refuse conflicting history without mutation, preserve drafts and show investigation history. Keyboard focus, reduced motion and 1440/768/320 reflow passed. Source, financial and outside-fixture checks passed. Receipts and screenshots appear in the [conflicting-evidence record](CLOSE_EVIDENCE_CONFLICT_GUARD_2026-10-04.md).

**Remaining:** Explicit investigation and resolution of ambiguous history; unavailable-requester or delegated-administrator recovery; delegated context, diagnostic localization, full accessibility/zoom, authority interleavings, notification delivery and high-volume behavior. Replacement audit resolution validates the current transition and predecessor, not the entire chain. Bank import/provenance, bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All workflow families and queued requirements remain in the [register](WORKFLOW_REGISTER.json), including identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
