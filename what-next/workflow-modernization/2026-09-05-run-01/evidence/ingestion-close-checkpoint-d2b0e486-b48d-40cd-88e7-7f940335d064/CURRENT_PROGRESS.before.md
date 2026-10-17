# Current progress

Updated 2026-10-04T10:14:30.698Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 4cd74cd95c616352ad5e380a0accdb4b36af25c0d18c37b9497f8194daf00416. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. One suspense/Close defect corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Suspense resolution → Close | Other producers, authority, full recovery | Engineering; provider/statement handoff |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Complete scope, races, rollback and replay | Statements, other producers, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual approval resolved suspense but left a prior-year Close collector unmarked, persisting 17 obsolete rows. Approval now coordinates every tenant period before source locks, retries proven obsolete snapshots within three attempts, rechecks authentication after waits and invalidates once atomically. No new journal is posted. Rejection retains the open source; replay retains its allocation. No workflow discovered, reopened or closed.

**Verification:** 257 tests/15 suites, full no-emit TypeScript and two-file lint passed. Nine database scenarios are verified: seven passing first-run cases plus two corrected verifier checks. They cover prior-period scope, zero obsolete rows, fresh assessment, stale-snapshot retry, both observed PostgreSQL lock orders, denied authority/revision, exact replay, conflicting decision, late source-and-Close rollback and simultaneous single allocation. Financial records and outside-fixture fingerprints remain intact. [Detailed correction, receipts and guidance](SUSPENSE_RESOLUTION_CLOSE_2026-10-04.md). UI unchanged; no new browser claim.

**Failures retained:** Initial duplicate fixture ID stopped setup. The first complete acceptance run had two verifier failures: incorrect access to a wrapped transaction result and an overlong synthetic invoice name. Corrected checks passed without product changes or repeating the seven successful cases. Unit fixture corrections added audit-log support and asserted the existing authentication error code. Earlier exception runtime binding is historical after its financial-resolution prerequisite changed; current downstream tests pass, without claiming every earlier case was rerun.

**Next:** Reproduce provider-event capture and statement import → Close publication. Their invalidation is date-limited while Close consumes organization-wide evidence availability. Keep manual allocation and suspense correction/recovery lock-order compatibility queued. Cash remains primary, Close supporting.

**Remaining:** Full financial/authority/transport lifecycles, bank/provider evidence, native accessibility/true zoom, representative pool/period performance and worker rollout. Existing static boundary and separately controlled aggregate policy/release gates remain unresolved. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All original requirements and 17 families remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
