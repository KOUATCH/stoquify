# Current progress

Updated 2026-10-03T19:28:01.141Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 496635325ec8de125880bb8090206340ec7273fd02b885b72d831d9776675a9a. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Requester history and protection from unsafe reassignment | Recipient replacement, ambiguous-history recovery, remaining races/accessibility | Implement controlled recipient recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Preserve guards; improve diagnostics |

**Since the previous report:** Reproduced ordinary assignment stranding pending requests, resetting submitted review and overwriting a concurrently committed request's owner. The service now refuses those transitions with no assignment effects and keeps normal assignment available when no request exists. EN/FR guidance leads back to the evidence workbench. No workflow was newly discovered, reopened or closed.

**Verification:** 496 focused tests, no-emit TypeScript and lint passed. Four owned-database checks prove serial refusal, retained review, an actual serialization retry after overlapping request creation and successful ordinary assignment. Actual EN/FR browser journeys refused “Assign to me” without mutation and retained the original recipient queue; desktop/mobile guidance and keyboard activation passed. Source, financial and outside-fixture checks passed. Reproduction, final receipts and screenshots appear in the [assignment-protection record](CLOSE_REQUEST_ASSIGNMENT_2026-10-03.md).

**Remaining:** Explicit recipient replacement/leaver recovery and existing ambiguous-history recovery. Delegated-summary context, broader diagnostic localization, full accessibility/zoom and remaining authority interleavings remain. Bank import/provenance, actual bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request. Engineering work continues independently.

All workflow families and queued requirements remain in the [register](WORKFLOW_REGISTER.json), including identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
