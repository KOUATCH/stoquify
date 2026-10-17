# Current progress

Updated 2026-10-04T09:14:06.553Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 6bfcb8c464a8778733feae9d589b6f06ccf555725758912b08872a3f805aa8f2. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Two signing/Close defects reproduced and corrected; no workflow closure or denominator change. Previous turn was progress.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Settled purchase recovery; signing/Close source truth | Other producers, authority and full recovery | Engineering; reconciliation run creation/refresh invalidation |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Signing publication ordering, complete period scope, rollback/history | Other producers, statement evidence, scheduler/capacity, accessibility | Engineering; same collector's remaining producers |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; reconcile original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and improve diagnostics |

**Since the previous report:** Reproduced signing missing a newly published assessment because its Serializable snapshot was older, and missing prior-period assessments despite Close consuming reconciliation across the organization. Signing now takes catalog/ordered period locks, compares committed membership, restarts stale snapshots at most three times, invalidates the same complete tenant set and rechecks authentication age after waits. Existing signature, independent review, financial and historical-export contracts remain. No workflow was discovered, reopened or closed.

**Verification:** 164 focused tests/six suites, full no-emit TypeScript and changed-file lint passed. Five owned-database cases passed: stale snapshot restart, prior-year invalidation, both observed PostgreSQL blocking orders, and late signature/invalidation rollback with fresh retry, exact replay and retained certified export. All 238 source bindings, case financial records and outside-fixture fingerprints were stable. UI unchanged; no new browser claim. [Detailed correction, evidence and operating guidance](SIGN_CLOSE_PUBLICATION_2026-10-04.md).

**Failures and remaining truth:** Two verifier attempts remain recorded. The first incorrectly expected obsolete in-flight collector rows to persist; the second selected audit references rather than typed certificate evidence. Corrected checks verify discarded rows and the actual committed signature hash. Fresh assessments still report HIGH **Provider statement evidence is missing**; no full readiness claim. The existing static service-boundary fail gate reports one unchanged journal-page Prisma import finding. Aggregate policy:gates was inspected but not run because it includes separate PostgreSQL/runtime and release gates.

**Next:** Verify reconciliation run creation/refresh against retained and newly published Close evidence, including non-overlapping periods. Keep Cash primary and Close supporting. Signing's tenant-wide period contention matches current collector scope; representative pool capacity/performance remains unverified.

**Remaining:** Other producers/cumulative periods, bank and external evidence, broader authority/interruption, authorized worker deployment, native assistive technology and true zoom, representative performance and the original full workflow inventory. Country warnings and expert prerequisites remain. No migration, deployment, live approval/payment, external message or X1 clearance occurred. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request. All 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
