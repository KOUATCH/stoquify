# Payroll Trust Spine WP3 approval-slice run report

Selected skill: `aqstoqflow-payroll-kernel-hardener`.

Companion skill: `better-auth-rbac-ohada` for the protected action, fresh-auth, server-derived identity, and segregation-of-duties boundary.

Selected phase and executable slice: Phase 0 / WP3, first safe runtime slice for `REVIEWED -> APPROVED` only.

## Ownership baseline

The working tree was already broadly dirty. Before editing any overlapping payroll file, the exact Git HEAD, branch, file status, byte length, SHA-256, and inherited Git diff size were saved in:

- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-03/WP3_APPROVAL_SLICE_OWNERSHIP_BASELINE.json`

No inherited file was reset, staged, reformatted wholesale, or replaced. The previously clean payroll hook was hashed before its surgical rename.

During final verification, `services/payroll/__tests__/payroll-run-approval-transition.service.test.ts` acquired concurrent review/emission/posting fixtures and tests outside this approval slice. Those additions were preserved and are not claimed by this run. After detecting the ownership change, this run made no further semantic edits to that shared file.

## Implemented controls

- Replaced the public `approveAndPostPayrollRunAction` boundary with `approvePayrollRunAction`.
- The protected action requires `payroll.runs.approve`, payroll module access, and an explicit 300-second fresh-auth window.
- Organization, approver identity, permissions, fresh-auth timestamp, and current time are server-derived. Client-supplied actor, tenant, auth timestamp, and clock fields are overwritten.
- The runtime capability advertises approval only for `REVIEWED` runs. `CALCULATED` runs can no longer reach the approval/posting shortcut.
- The client submits the run's `expectedVersion`; the service uses tenant/status/version compare-and-set inside a serializable, bounded-retry transaction.
- Stale versions produce `CONCURRENCY_CONFLICT` before status evaluation, including the losing side of a concurrent approval race.
- The approver must differ from both the persisted preparer and reviewer. Missing review actor/event/timestamp evidence fails closed.
- Approval records the distinct `PAYROLL_RUN_APPROVED` business event with transactional outbox, audit, transition-ledger, approval evidence, payroll-period update, and event application.
- Approval idempotency binds the run, expected version, actor, evidence hash, document hash, correlation ID, and metadata. Same-payload replay returns the prior result; changed document evidence conflicts.
- When `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true`, the deprecated combined service command fails closed and directs callers to independent lifecycle commands.
- The payroll hook and existing drawer were renamed surgically to approval-only behavior; no broader UI redesign was attempted.

## Files changed for this slice

- `services/payroll/payroll-control.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `components/payroll/PayrollRunActionPanel.tsx`
- `components/payroll/__tests__/PayrollRunWorkbench.test.tsx`
- `hooks/payroll/usePayrollWorkbench.ts`
- `services/payroll/__tests__/payroll-run-approval-transition.service.test.ts` (shared after concurrent additions; approval block verified, sole provenance not claimed)
- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-03/WP3_APPROVAL_SLICE_OWNERSHIP_BASELINE.json`
- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-03/payroll-presence-readiness.json`
- `docs/HRIS-Payroll/payroll-trust-spine-execution/evidence/WP-03/payroll-presence-readiness.md`

## Gates passed

- Focused approval/action/workbench Jest: 3 suites, 49 tests passed.
- Existing payroll-control service Jest: 1 suite, 42 tests passed.
- Payroll tenant-boundary plus transition-migration Jest: 2 suites, 11 tests passed.
- Close-assurance pack Jest: 1 suite, 13 tests passed; `PAYROLL_RUN_POSTED` close invalidation remains covered.
- `npm run typecheck`: passed.
- `npm run prisma:validate`: passed.
- `npm run service:boundary:fail`: passed with 0 active violations.
- Payroll presence gate: ready 14/14, with output redirected to new WP3 evidence files.
- `git diff --check` on the scoped files: passed.
- New focused test/evidence formatting: passed. Whole-file formatting was not applied to inherited dirty files.
- Runtime search found no public `approveAndPostPayrollRunAction`, `useApproveAndPostPayrollRun`, or `approve-post` caller.

## Gates blocked or intentionally not claimed

- Full `npm run policy:gates` was not run because it writes multiple inherited dirty readiness artifacts and the existing program register already records external statutory and migration-approval blockers. This slice does not overwrite those user-owned reports or claim production readiness.
- The broad dirty tree still blocks a clean-candidate claim.
- Production migration activation, statutory expert approval, and release authorization remain outside this slice.
- The full four-transition WP3 kernel is not certified by this report. Concurrent review/emission/posting test additions are explicitly unclaimed.

## Verification result

`WP3_REVIEWED_TO_APPROVED_SLICE_READY_FOR_INTERNAL_ENGINEERING`

This result verifies the guarded approval transition and public cutover boundary. It is not a production, legal, statutory, database-migration, or full WP3 certification.

## Residual risks and next recommended slice

- Trust Spine writes remain fail-closed unless `PAYROLL_TRUST_SPINE_WRITES_ENABLED=true`.
- The calculated-run review path and the later emission/posting operator paths still require separately owned promotion evidence before WP3 can complete.
- Reconcile ownership of the concurrently expanded transition test file before any further edits or certification.
- After ownership reconciliation, independently certify the next lifecycle slice with the payroll kernel hardener; do not broaden into backfill or UI redesign.
