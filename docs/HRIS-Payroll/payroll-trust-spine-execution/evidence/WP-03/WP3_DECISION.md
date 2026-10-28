# WP3 decision — Payroll runtime transition kernel

Decision: `APPROVED_FOR_WP4_INTERNAL_ENGINEERING_ONLY`

Captured: `2026-08-22T07:20:11Z`

Selected skill: `012-aqstoqflow-payroll-presence-engine`

## Implemented boundary

- Added independent `CALCULATED -> REVIEWED`, `REVIEWED -> APPROVED`, `APPROVED -> EMITTED`, and `EMITTED -> POSTED` commands.
- Every command runs in a serializable tenant-scoped transaction with compare-and-set status/version protection.
- Transition ledger, canonical business event/outbox evidence, run evidence links, audit evidence, and final event application share the transaction.
- Review, approval, emission, and posting enforce the frozen SoD policy; fresh-auth is evaluated by the sensitive-action boundary.
- Payslips are created and bound to `PAYSLIP_EMITTED` before posting can proceed.
- Posting requires a complete event-bound emitted payslip batch, posts the ledger, updates the tenant-owned period, and invalidates certified close evidence before the event is marked applied.
- Same-payload idempotent replay remains valid after the run advances to later lifecycle states.
- With `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true`, the deprecated collapsed approval/posting command fails closed.

## Live verification

| Check | Result |
|---|---|
| Four-command focused lifecycle suite | PASS — 22/22 |
| WP2 migration assertions plus WP3 lifecycle | PASS — 30/30 |
| Canonical error plus WP2/WP3 suites | PASS — 33/33 |
| TypeScript project compile | PASS — exit 0 |
| Prisma schema validation | PASS |
| Focused ESLint boundary | PASS — zero findings |
| Diff whitespace check | PASS |

Focused negative cases include preparer/reviewer/approver/poster SoD violations, missing or stale fresh authentication, stale expected version, CAS loss, reused idempotency key with a different payload, missing or mismatched emission evidence, serializable retry, later-state replay, and disabled legacy shortcut.

## Promotion limits

- WP4 is authorized only for internal engineering. No production, statutory, or migration-release claim is made.
- Unit transaction mocks prove ordering and failure propagation; real PostgreSQL concurrent transactions and failure injection remain mandatory in WP7.
- The inherited dirty tree, statutory expert approval, and historical destructive-migration approvals remain external release blockers.
- A formatting command created non-semantic shared-file diff noise. An automatic reconstruction from `HEAD` was denied to avoid risking inherited dirty-worktree edits; semantic tests and lint pass, and no unrelated product behavior was added.