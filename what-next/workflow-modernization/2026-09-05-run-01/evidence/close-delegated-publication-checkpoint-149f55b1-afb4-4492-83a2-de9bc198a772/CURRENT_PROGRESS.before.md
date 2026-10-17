# Current progress

Updated 2026-10-04T07:46:28.321Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 5d35ebbb11038443b253f9b4d62a53dc2d48bc3b991152ff0896d4bd04cee0ee. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. No workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Scoped Cash/Close recovery and authority | All producers, authority and complete recovery | Engineering; complete recovery boundaries |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Durable evidence inbox, actual publication/retry, current-recipient/reviewer visibility | Delegated compatibility, remaining delivery/operations, races/accessibility | Engineering; connect delegated inbox and recovery |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Implemented the missing Close notification destination and leased worker for missing-evidence requests/reassignments, responses and acceptance. Added a protected, paginated EN/FR inbox to the existing Close workbench. Current reviewers receive response observations after the original requester leaves; former recipients lose access on reassignment. Original authorship remains intact. Publication means in-app availability, not a read receipt or approval. No workflow discovered, reopened or closed.

**Verification:** 673 focused tests, no-emit TypeScript and lint passed (one existing unrelated warning retained). Eight owned-PostgreSQL scenarios prove actual publication, tenant constraints, current audiences, lost-acknowledgement deduplication, real backoff/retry and corruption refusal. Actual EN/FR screens pass keyboard refresh, transport-failure recovery and 1440/768/320px reflow with reduced motion. Final French mobile capture visually inspected. Financial and outside-fixture fingerprints match. Schema/catalog validate; additive migration rehearsed/applied only to the owned local verification database. See the [single detailed record](CLOSE_NOTIFICATION_DELIVERY_2026-10-04.md) for receipts, screenshots, source/build bindings and operating instructions.

**Changed plan / limits:** First storage-failure injection missed the transaction; replaced with a temporary constraint on one synthetic outbox row and reran successfully. Initial mobile capture missed content during layout changes; corrected capture and verified it. Delegated inbox visibility and pending-request replacement/recovery compatibility remain the next concrete engineering gap. No scheduler or dead-letter repair UI is claimed. Other Close event types and historical SENT rows without a publication need separate reconciliation.

**Remaining:** Full Cash/Close producer, source/authority, multi-period, interruption and recovery requirements; native assistive technology, actual zoom, inherited contrast/localization/hydration and representative latency; purchasing/inventory/payroll and authentic country evidence. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request. All families and original criteria remain in the [register](WORKFLOW_REGISTER.json). No production migration, deployment, real approval/payment, external message or X1 clearance. Full goal remains active; ETA is not reliable.
