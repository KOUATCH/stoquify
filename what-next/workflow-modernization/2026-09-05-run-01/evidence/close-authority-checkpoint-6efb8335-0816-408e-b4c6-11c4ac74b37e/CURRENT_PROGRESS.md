# Current progress

Updated 2026-10-03T17:39:58.674Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: c8fe1d2542e2fc88f9cd01e7f80bd07a4b0e8d61604a3d762279ef9205a19ea1. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change. Previous checkpoint delivered transaction-bound request/response authority.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery; current write authority | All producers, authority and complete recovery | Engineering; prior manual-period approval outstanding | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Recipient eligibility/replay; nine database checks; EN/FR | Bounded lists, localization/context, tracking, remaining races/accessibility | Engineering | Complete period-scoped queue access |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and complete recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** New evidence assignments now lock and recheck the recipient's current account, roles and memberships through publication. Recipient account locking or membership removal prevents a new assignment. When assignment commits first, an exact retry still retrieves it after revocation; a new assignment is refused. Current requester authority remains mandatory. Recipient presence online is unnecessary. No workflow was newly discovered, reopened or closed.

**Verification:** 314 focused tests, no-emit TypeScript and lint passed. Nine database checks passed, including observed lock waits in both recipient account-revocation orders and membership removal before assignment. Both actual EN/FR browser journeys passed on current action/service source. Source, financial and outside-fixture checks passed. Exact evidence and operating guidance appear once in the [recipient record](CLOSE_EVIDENCE_RECIPIENT_2026-10-03.md).

**Remaining:** Complete bounded-list access and period filtering; historical finding localization/assessment context; requester tracking/replacement; applicable remaining authority races; full accessibility/zoom. Bank import/provenance, actual bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All families and queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
