# Current progress

Updated 2026-10-03T18:54:59.448Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: a1fd19c6f259399313a7e3ae6973ae8c95e8e231306c0a15f9d50c0a7b7b47f2. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Continuation, historical context, unique requests and EN/FR acceptance | Tracking/replacement, remaining races/accessibility | Implement requester tracking and controlled recipient recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Preserve guards; improve diagnostics |

**Since the previous report:** Actual database reproduction confirmed that a second request could hide a submitted response from review as ambiguous. The service now refuses a second distinct request within the existing Serializable transaction, preserving exact retry and the original assignment/response. EN/FR conflict guidance retains the draft. No workflow was newly discovered, reopened or closed.

**Verification:** 444 focused tests, no-emit TypeScript and lint passed. Four owned-database checks prove serial refusal, retained review, overlapping distinct-key admission and identical-key replay with one request/audit/business event. Both actual EN/FR browser journeys refused a second tab's request without changing the finding or comments, preserved that draft and completed the original independent acceptance. Source, financial and outside-fixture checks passed. Pre-fix failures, actual defect reproduction, final receipts and screenshots appear in the [request-uniqueness record](CLOSE_REQUEST_UNIQUENESS_2026-10-03.md).

**Remaining:** Requester tracking, explicit recipient replacement/leaver recovery and existing ambiguous-history investigation. Delegated-summary context, broader diagnostic localization, full accessibility/zoom and remaining authority interleavings remain. Bank import/provenance, actual bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request. Engineering work continues independently.

All workflow families and queued requirements remain in the [register](WORKFLOW_REGISTER.json), including identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
