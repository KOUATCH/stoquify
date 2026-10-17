# Current progress

Updated 2026-10-04T09:56:46.796Z; branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Register SHA256: 5accaf47914242982858e2363c2f725fc1e82d5cafd82d879bd4ada21178eacf. Shared changes preserved.

**Position:** 270 workflows /17 families; discovery incomplete; 191 unmapped entries. Queued 264; In progress 2; Complete—verified 4; other statuses zero. Two exception/Close defects corrected; no workflow closure or denominator change.

| Priority | Workflow and outcome | Status | Delivered and verified | Remaining closure | Owner; next action |
|---|---|---|---|---|---|
| Primary | FA-CASH-COMMAND: truthful financial actions | In progress | Exception approval/withdrawal → Close | Other producers, authority, full recovery | Engineering; suspense resolution handoff |
| Supporting | FA-CLOSE-PACK: trustworthy retained evidence | In progress | Full period scope, races, retained history | Statements, other producers, accessibility/capacity | Engineering; same handoff |
| Next 1 | PR-17: reconciliation exceptions | Queued | Prior scoped handoffs | Financial/legacy treatment and recovery | Engineering; original closure scope |
| Next 2 | ID-04: invitation redemption | Queued | Prior authority/recipient evidence | Accessibility, onboarding and transport | Engineering; verify transport |
| Next 3 | MC-11: permitted workspace | Queued | Selected route/action boundaries | Cross-domain transport and scanner gaps | Engineering; preserve guards and diagnostics |

**Since the previous report:** Actual exception approval and withdrawal of a signed source left prior-year Close observations unmarked as stale. Approved decisions now coordinate all tenant periods before the exception row, compare committed assessment membership, restart stale Serializable snapshots within three attempts, recheck authentication after waits and invalidate atomically. Rejections preserve current source/certificate state; exact replay repeats no effects. No workflow discovered, reopened or closed.

**Verification:** 248 tests/ten suites, full no-emit TypeScript and two-file lint passed. Ten PostgreSQL cases verify prior-period scope, zero obsolete collector rows, snapshot restart, both observed lock orders, independent reviewer/tenant/revision/authentication refusal, late rollback/retry, retained signatures/exports and the financial-treatment branch. One additional concurrent duplicate check verifies one durable receipt, safe conflict and exact replay. All 253 main runtime source bindings, financial/allocation fingerprints and outside-fixture records remained stable. Previous producer runtime bindings also remain current. [Detailed correction, receipts and operating guidance](EXCEPTION_CLOSE_2026-10-04.md). UI unchanged; no new browser claim.

**Failures and limitations:** The first baseline verifier selected an unrelated fixture payment; it now selects through the actual run match and provider. Both attempts are retained; product behavior was not altered to fit the verifier. Full provider-statement evidence remains required. Native accessibility, broader persisted role/session races, aggregate policy/release gates and the existing journal-page static boundary finding remain open.

**Next:** Reproduce and correct suspense financial-resolution approval → Close publication. Current source invalidates only original/clearing journal periods, but Close directly consumes the tenant-wide open-suspense count. Manual allocation and provider event/statement ingestion remain queued producer reviews. Keep Cash primary and Close supporting.

**Remaining:** Broader financial/authority/transport lifecycles, bank/external evidence, worker deployment, native assistive technology/true zoom and representative period/pool performance. The rejected all-period manual-posting proposal remains unapplied pending its existing approval request. No migration, deployment, live approval/payment, external message or X1 clearance occurred. All 17 families and original requirements remain in the [register](WORKFLOW_REGISTER.json). Full goal stays active; ETA is not reliable.
