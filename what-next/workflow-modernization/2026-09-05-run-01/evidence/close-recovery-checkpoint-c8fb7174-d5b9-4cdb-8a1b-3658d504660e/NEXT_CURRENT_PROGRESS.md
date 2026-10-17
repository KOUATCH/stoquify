# Current progress

Updated 2026-10-03T17:03:00.275Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 280639cbc9e31ad34887ebd36b900248503411cc38f2ca590b382d7753ac2e43. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change. Previous turn was progress: Close recovery interface and four persisted checks.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash lifecycle; Close recovery and expired replay | All producers, authority, complete recovery | Engineering; prior manual-period approval outstanding | Finish Close recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Four persisted checks; 2 browser journeys | Bounded lists, concurrency, accessibility, original purchase recovery | Engineering | Resolve recorded browser findings and remaining boundaries |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and complete recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Fixed saved evidence requests becoming unrecoverable at their due date. An exact authorized retry now returns its original record; new expired requests and changed-payload retries remain rejected. No original deadline or historical evidence is rewritten. The initial regression reproduced three failures. Final verification: 183 tests across five suites, no-emit TypeScript and lint passed. Four actual database checks passed, including a genuinely elapsed deadline, no duplicate comments/assignments/audits/events, independent acceptance and retained original evidence.

**Browser:** 2/2 EN/FR journeys passed; overall passed. Exact observations, screenshots, development timings and any failed attempts are in the [recovery record](CLOSE_EVIDENCE_RECOVERY_2026-10-03.md). Sources stayed stable; financial and outside-fixture observations remained unchanged. Test totals and screenshots are not workflow completion percentages.

**Remaining:** Current request/response authority across concurrency, access beyond bounded lists, requester tracking, full accessibility/zoom proof, bank import/provenance, actual bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All families and queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
