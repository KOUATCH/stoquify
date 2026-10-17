# Current progress

Updated 2026-10-04T07:21:45.173Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: b0ab148b2ad706d480684441cf948e60baf15b18e78fbc6db96c399a7c2e82ba. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Verified progress | Remaining closure | Blocker/owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Cash/Close recovery and current authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Departed-requester supervision and correct notification provenance | Durable notification delivery, delegated compatibility, races/accessibility | Engineering; implement Close destination and delivery consumer |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Corrected the accountant work desk's notification provenance. Submitted response rows formerly displayed the original request's notification status. They now use the response event and correlation key; missing or mismatched evidence stays unknown and read errors propagate. EN/FR labels identify request versus response-review notifications. This prevents request success from hiding review-notification failure. No workflow was discovered, reopened or closed.

**Verification:** 636 focused tests, no-emit TypeScript and lint passed. Seven owned-PostgreSQL scenarios contrast request/response states and verify missing-event and revoked-mandate behavior. Actual EN/FR accountant-portfolio screens show response failure despite request success, retain it after keyboard refresh, and fit 1440/768/320px with reduced motion. Source, financial and outside-fixture fingerprints match. These are explicitly synthetic notification states, not delivery evidence. See the [single detailed record](CLOSE_NOTIFICATION_PROVENANCE_2026-10-04.md) for receipts, screenshots, timings and guidance.

**Actionable finding:** Close producers retain notification outbox messages, but current source has no Close delivery consumer or durable Close notification destination. Response events still name the original requester. The existing generic worker supplies leases/backoff; reconciliation's destination is domain-specific. Implement the Close destination, permission-controlled audience resolution, consumer and operator recovery, then verify actual publication and retry. Do not mark queued messages sent manually. Delegated pending-request projection also needs compatibility with recipient replacement and authorized evidence recovery.

**Remaining:** Correction where no valid evidence chain matches finding state; further authority races, diagnostics, full accessibility/zoom and capacity. Scoped tab drafts retain 24-hour expiry/privacy limits; investigation remains bounded to 100 records/audits and latest 20 recovery events. Bank import/provenance, finalization, concurrent evidence reuse, original cash/purchase/Close handoffs, other producers, freshness, manual-session/legacy-role authority, signing/publication races and country/payroll evidence remain. The all-period manual-posting helper rejected by automatic approval review remains unapplied pending the existing approval request.

All families remain in the [register](WORKFLOW_REGISTER.json): identity/modules, finance, sales/POS, inventory/purchasing, payroll, compliance/reporting, notifications/integrations and AI. No migration, reset, deployment, live activation, real payment, external message or X1 clearance occurred. Full goal remains active; ETA is not reliable.
