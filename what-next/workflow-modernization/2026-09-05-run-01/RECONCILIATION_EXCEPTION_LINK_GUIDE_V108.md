# Reconciliation exception linkage and assignment — v108

Evidence date: 2026-09-09. Branch: `codex/migration-control-plane-release-2026-08-29`; commit: `a05a41ef66cd5d98fd69ae3df18225795f912232` plus the preserved working tree. Final source binding: `evidence/source-baseline-v108.json`.

## Delivered behavior

Automatic reconciliation previously created a PaymentException and a SuspenseItem with only `suspense.evidence.exceptionId`. It did not set `exception.suspenseItemId`. Assignment, proposal and recovery query the latter relation, so real automatically generated exceptions could remain untouched even when suspense changed.

`createExceptionAndSuspense` now writes the missing organization-scoped relation inside the original transaction, before publishing either notification. A failure aborts creation of the run, pair and notifications. New rows retain both links; no amounts, approvals, matching rules or accounting statuses are inferred from the link.

Assignment also previously replaced the exception's metadata wholesale. It now preserves each open exception's existing metadata, updates ownership and assignment provenance, and checks the row's observed `updatedAt`. A changed exception causes a typed conflict and transaction rollback, including the suspense ownership change. Terminal exceptions remain unchanged. Assignment audit and notification counts describe the rows actually updated.

## Using the current application

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. Use the existing suspense queue or its retained-history entry. An operator with `payments.reconciliation.exception.assign` can choose **Assign / Assigner** to take responsibility for an editable item. The action uses the current authenticated actor and organization. Read-only users retain the disabled control.

After assignment, the linked exception and suspense have the same owner. Refresh or reload to inspect persisted status. Assignment is not financial resolution or approval. If evidence changed during assignment, the existing localized recovery message asks the operator to refresh and review before trying again. It does not silently retry against a different version.

No additional information is needed from the user for these code changes. Operational inputs still come from the current organization, provider setup and imported evidence; only an authorized operator should take ownership. No real provider credentials, external messages or live customer activation were used in verification.

## Verification and precise limits

- 67 tests in four suites: automatic reconciliation, run service, suspense workflow and protected reconciliation actions. Final receipt: `evidence/reconciliation-exception-link-v108-final-tests.json`; command receipt `ac1467`, exit 0.
- TypeScript: direct installed `tsc --noEmit --pretty false`, session 7764, receipt `15041f`, exit 0. No migration-bearing build executed.
- ESLint: both changed services and three changed test files, receipt `8cbe58`, exit 0.
- Owned PostgreSQL: actual HMAC event capture and statement import feed automatic runs. Missing provider evidence and both orphan external-source paths retain links; assignment/proposal reach the exception; nested prior metadata survives; duplicate runs add no effects; failed link writes roll back. Receipt: `lanes/environment/reconciliation-exception-link-v108-7614fbba-e73.json`, six check groups, source stable and other organizations' monitored rows unchanged.
- The stale assignment check injects a zero-row compare-and-set result into a real transaction and proves rollback. It is **not** a two-client race proof. Additional real concurrent interleavings remain open.
- Actual authenticated EN/FR browser sessions verify read-only denial, keyboard assignment, matching persisted ownership/status, metadata retention, reload and 320-pixel reflow. Four screenshots; no page errors or missing translations. Receipt: `lanes/environment/reconciliation-exception-link-v108-browser-597c6c56-277.json`. Ledger, source-link and run rows remained unchanged.
- EN console was clean. FR recorded three development CSS-preload warnings. Functional browser checks passed; a completely clean FR console and production performance are not established. Route-to-queue observations were EN 21,485 / 12,990 ms and FR 11,778 / 10,121 ms, with differing cold/warm conditions and no approved comparison budget.
- Actual screen-reader, full contrast, native zoom, complete background delivery and whole-workflow verification remain open. Screenshots are application evidence for this assignment path only.

The first sandboxed Jest attempt passed 45 tests but exited 1 because its JSON receipt could not be written (EPERM, receipt `0d0d24`). A permitted retry saved that intermediate result; final tests above include the subsequent metadata correction. The earlier owned-database link-only receipt `reconciliation-exception-link-v108-402eb323-b61.json` remains historical and is superseded for the changed assignment implementation.

## Existing records and recovery

This producer fix does not backfill historical exceptions. Do not reconnect records using similar amounts, dates or names alone. A controlled repair must verify the existing `evidence.exceptionId`, same organization/provider/run/payment source, uniqueness and current relation; retain before/after evidence and conflicts; and assess affected certificate manifests and close dependencies. It must not silently alter signed evidence. That repair is outstanding engineering work.

No schema change or migration was required or applied. No deployment occurred. Roll out the producer and assignment changes together after the normal release checks. Monitor relation-write failures, stale-assignment conflicts and unexpectedly zero linked exceptions. A rollback must retain links and prior metadata already written; never clear them or delete financial records. Returning to the old producer reintroduces the defect and is not a safe recovery strategy for new runs.

## Remaining connected handoff

Current source has a `payments.reconciliation.exception.resolve` permission, sensitive-action policy and exception terminal states, but no general implemented reconciliation exception-resolution service/action. Final suspense clearing does not independently settle a tamper, signature, fraud or other review issue. Add a reasoned, evidence-bound exception-review transition with current authority, retained decision history and recovery before claiming this workflow complete.

Automatic runs with exceptions are `NEEDS_REVIEW`; duplicate runs are refused. Sign-off requires `READY_FOR_SIGNOFF`. No general reviewed-run preparation path currently moves an existing needs-review run through fresh evidence validation into that ready state. The `READY_FOR_SIGNOFF` occurrences in certification are sign-transition predicates and source hashing, not a preparation operation. This missing handoff remains an engineering defect, not a request to invent an approval or bypass sign-off.

Next implementation order: controlled legacy-link assessment/repair; genuine exception review and retained decisions; evidence-bound run preparation; actual independent sign-off/export; reopening and certificate invalidation through those connected paths. Continue the full platform workflow register afterwards. No X1 or professional certification is implied.

## Review responsibilities

Architecture/backend/data: reuse the existing paired records and transaction; no new module or schema. Security/IAM/privacy: current protected action, tenant predicates, no extra exported private fields. Finance/controls/audit: preserve metadata and existing ledger/approval boundaries; historical certified repairs remain unresolved. QA: unit/action, owned PostgreSQL and actual browser evidence above. Frontend/UX/localization: inherited shell/tokens and existing conflict translations; EN/FR assignment/reflow exercised. SRE/operations: retain atomic failure and explicit retry; latency warnings remain observations. Product/packaging: no entitlement, price or package changes. Statutory/country, payroll, inventory, POS/offline, AI and external provider protocol changes: not applicable to this link/assignment correction; no rule or behavior in those domains was changed.

Selected skill: `009-aqstoqflow-payment-reconciliation-moat`. Changed implementation: `services/reconciliation/payment-reconciliation-run.service.ts` and `payment-suspense-workflow.service.ts`; regression changes in the run, auto-match and suspense-workflow test files. Gates passed are limited to the checks above. Open gates include legacy repair, complete exception/sign-off handoff, broader concurrency/accessibility and release evidence. Next numbered skill after the reconciliation boundary: `010-aqstoqflow-inventory-valuation-kernel`.
