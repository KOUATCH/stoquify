# Payroll release-to-settlement handoff and exception controls

2026-09-30. FA-CASH-COMMAND remains the primary workflow; payroll settlement is its supporting dependency. Branch codex/migration-control-plane-release-2026-08-29, HEAD 62a56036a5ac9b37236a20c9b148052199069479. Earlier changes and reports are retained.

## Findings and correction

Source tracing of `releasePayrollPaymentBatch` established that release creates a PENDING payment transaction and an open missing-statement exception. The reconciliation read model classified every open exception as blocking before examining an approved match. Consequently, an otherwise usable approved statement match could not reach the settlement form. The writer had the opposite problem: supplying any approved match allowed every associated exception to be resolved, including signature, tampering and amount-mismatch issues. It also did not check separately linked open suspense items. Five new regression cases failed against the prior implementation.

The read model and writer now share the same narrow exception rule: an approved/auto-matched statement reference can satisfy MISSING_STATEMENT_LINE, and an approved/auto-matched provider reference can satisfy MISSING_PROVIDER_EVENT. Other exceptions require their own resolution. Open linked suspense obligations block new settlement writes. Those reads participate in the existing serializable transaction. Partial status no longer takes precedence over new exception or ledger blockers. The form selects an approved/auto-matched reference rather than the first arbitrary candidate.

This preserves the recovery route for ordinary missing evidence while preventing settlement entry from becoming a substitute for resolving security or financial discrepancies. Exact amount/currency validation, immutable event chains, stale revision checks, fresh authentication, maker-checker, close invalidation and idempotency remain intact. Replaying an already recorded command does not create another effect.

## Verification and evidence

`evidence/cash-settlement-handoff-review-2026-09-30.json` binds final source, focused tests, lint, TypeScript and actual EN/FR browser screenshots. The reproduction receipt retains five failing and 63 passing tests. A later test-only failure used a wildcard persona unsupported by the mocked permission helper; the test now supplies actual permissions. An initial isolated browser fixture omitted the transaction link persisted by the real release service; it was corrected before claiming handoff verification.

The owned local application/database uses explicitly synthetic released batches and approved statement matches. Browser verification exercises the actual read action, password step-up, settlement action, persistence and retry. A batch starts at 100.00 with a missing-statement exception and a 10.00 approved statement match. Recording the partial settlement resolves that matching exception, retains 90.00, and creates one settlement event. Dropping its response after commit and retrying leaves one event. Permission revocation removes recording. EN desktop and FR mobile verify the form, not the entire payroll table.

No release service, real provider transfer, genuine bank statement or statutory approval is represented by these synthetic prerequisites. The release trace also found that release labels the run/period PAID before provider settlement. That naming/lifecycle contract requires further assessment; this patch does not silently alter posted history. Historical batches with no explicit transaction link also require reconciliation of their source-linked matches, which this fixture correction does not implement.

## Operator and rollout guidance

Open `/en/dashboard/payroll/payments` or `/fr/dashboard/payroll/payments`. The reconciliation operator supplies an approved match to the corresponding missing statement/provider record. The settlement amount must equal that match's amount and fit the remaining obligation. Obtain these references from the controlled statement/provider and reconciliation records; do not fabricate identifiers or approvals.

A signature, tamper, amount or other unrelated exception belongs to its exception-resolution owner and must be resolved through that workflow. An open suspense item belongs to the reconciliation/accounting owner. Settlement submission cannot dismiss either. The previous form recovery guide still applies: authenticate separately, preserve and retry an unknown command, and deliberately adopt a refreshed balance.

No migration, deployment, live activation, payment or external message occurred. Release reader/writer changes together through the established review process. Preserve event and exception history; do not roll back by restoring blanket exception closure. Monitor exception/suspense denials and the approved-match handoff.

## Review and remaining work

Architecture/backend/data: bounded service and consumer change, transaction ownership retained. Security/finance/audit: targeted exception resolution, suspense preservation, scoped reads and no duplicate event verified. UX/EN-FR: existing form recovery reused; wider localization, mobile table and full accessibility remain open. SRE: isolated evidence, no performance certification. Statutory, billing, AI, POS and inventory: not applicable to this code change; no behavior modified at those boundaries.

Continue actual release/destination approval/provider/declaration lifecycle assessment, controlled legacy recovery, remaining Cash proof lifecycles and accessibility/latency. No additional whole workflow is declared complete.
