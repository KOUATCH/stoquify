# Current progress

Updated 2026-10-03T17:23:55.671Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 9678caf2ac5c64b558b2ca1e2db06320e66ea27e4d62785a67f32afb8b36b223. Shared changes preserved.

**Position:** 270 workflows / 17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No new workflow closure or denominator change. Previous turn was progress: expired-request recovery and EN/FR browser journeys.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner/blocker | Next action |
|---|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery; current write authority | All producers, authority and complete recovery | Engineering; prior manual-period approval outstanding | Complete remaining recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Locked request/response authority; two revocation races; EN/FR | Remaining races, bounded lists, localization/context, accessibility | Engineering | Complete authority directions and user recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and complete recovery | Engineering | Reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Identity owner | Verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering | Preserve guards; improve diagnostics |

**Since the previous report:** Evidence requests and responses now carry server-derived session proof into their transaction and lock current organization, user, role, membership, module and consent authority through commit. Session/module/consent expiry is checked again before publication. Acceptance retains its independent-review and fresh-password requirements. Requests/responses need a live session without an added password step-up.

**Verification:** 300 focused tests, no-emit TypeScript and lint passed. Six database checks passed, including observed lock waits where requester-role and recipient-session revocation prevented publication with no evidence or financial effects. Runtime exposed a missing raw PostgreSQL serialization-conflict retry; the bounded retry classifier was corrected. Both actual EN/FR browser journeys passed on the changed action/service source. Source, financial and outside-fixture checks passed. Failed attempts and exact evidence appear once in the [authority record](CLOSE_EVIDENCE_AUTHORITY_2026-10-03.md).

**Remaining:** Recipient eligibility across concurrency; opposite lock ordering and other authority races; historical finding localization/assessment context; complete bounded-list access; requester tracking; full accessibility/zoom. Bank import/provenance, actual bank finalization, concurrent evidence reuse and original cash/purchase/Close handoffs remain. Other producers, draft freshness, manual-session/legacy-role authority, signing/publication races, delivery, country/payroll evidence and capacity remain required. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All families and queued requirements remain in the [register](WORKFLOW_REGISTER.json): identity/access/modules, finance/ledger/close, sales/POS, inventory/purchasing, payroll, compliance/evidence/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
