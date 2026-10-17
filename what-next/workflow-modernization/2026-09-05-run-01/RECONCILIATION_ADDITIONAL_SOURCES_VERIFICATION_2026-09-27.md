# PR-10 additional-source recovery — service implementation

2026-09-27 UTC; branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, with shared working-tree changes preserved. Previous goal turn: **progress** through two corrected sign-off defects and reproduced recovery refusal. Current turn: **progress** through implemented and database-verified recovery services. **PR-10 remains In progress.**

## Delivered behavior

The previous same-provider/date rerun rejection is valid duplicate-run protection, so recovery now operates on the existing unsigned run. `reconciliation-additional-sources.service.ts` previews the authoritative additions and binds the command to a revision of the run, provider/period setup, current sources and retained claims. The service requires an active tenant actor with reconciliation read/run and accounting-read authority; mutation requires fresh authentication.

The existing matching block was extracted into `reconcileUnallocatedSourcesInTx` in `payment-reconciliation-run.service.ts`. Initial runs and recovery use the same amount, direction, currency, signature, ambiguity and prior-allocation rules. This necessary extraction moves code without introducing a parallel matcher. Recovery excludes sources already claimed by retained matches or exceptions, including candidate arrays stored for ambiguous evidence. A new source sharing a retained reference requires manual review and cannot silently replace or reuse the earlier allocation.

Recovery uses one Serializable transaction. It conditionally changes the same run version, creates only new dispositions, adds their amounts/counts, replaces the old invariant summary with an explicit review-required state, and writes a hashed receipt plus audit. It does not create journals or payments. An audit failure rolls back the whole operation. The receipt retains the prior run, source IDs, reason, request hash, reviewed revision and result. Identical retry reports the retained outcome and current run status; changed intent with the same key is refused.

The run remains `NEEDS_REVIEW` even if all additions match. Fresh preparation must validate the full evidence set before independent signing. `reconciliation-run-preparation-evidence.ts` verifies every linked recovery receipt and its audit, detects missing/cyclic/tampered history, and prevents any recorded recovery operator from signing. The original maker and current preparer restrictions remain. An old recovery retry cannot reopen an already signed run.

## Verified evidence

| Check | Result |
|---|---|
| Actual database lifecycle | [Final receipt](lanes/environment/additional-sources-1b62a7e4-f70c-4fad-a413-2ccb52171e08.json), source stable. Initial matching uses actual synthetic HMAC provider capture. A later 25.00 XAF internal payment/event pair increases the original 100.25 run to 125.25, preserves the original match and creates only one new match. |
| Authority/staleness | Missing permission, absent/foreign actor, foreign tenant, expired authentication and stale preview revision all refused without persisted effects. These are service controls; public action/module admission for the new operation is not yet implemented. |
| Failure/concurrency/retry | Forced late audit failure rolls back all new records and totals. Concurrent identical commands plus explicit retry retain one recovery receipt/audit. No journal created. Changing request intent with the same key is refused. |
| Preparation/signing | Fresh preparation succeeds after matching. Recovery operator cannot sign. A different authorized signer succeeds. Replaying recovery afterward reports `SIGNED` without changing it. |
| Retained-reference conflict | A late callback sharing an existing payment reference creates a `MANUAL_REVIEW_REQUIRED` exception with retained-source context. It does not create another automatic match or claim that the internal payment is absent. Preparation remains blocked. Resolution of that manual-review case is not claimed complete. |
| Focused regression | 93 tests across five suites pass, including ten new preparation-history tests: prior/current operator and preparer denial, independent signer, absent/tampered/foreign/cyclic/missing-audit history, and mandatory preparation. |
| Lint / typecheck | Four changed TypeScript files lint cleanly; migration-free full TypeScript check exits 0 with no diagnostics. [Combined source-bound commands/result](evidence/additional-sources-checks-117ba476-5327-4da4-a2bb-75ff5d053a7e.json). |

Commands: `node what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-additional-sources.cjs` and `node what-next/workflow-modernization/2026-09-05-run-01/run-additional-sources-checks.cjs`. The latter records exact Jest paths, changed-file ESLint arguments and `tsc --noEmit --pretty false`, executed sequentially. Earlier passing lifecycle receipt `additional-sources-108f8405-8468-44b3-a89f-72ecac0eae27.json` predates explicit invariant-summary invalidation and remains historical; final receipt above supersedes it.

Environment: guarded loopback disposable database `stoquify_local_registration_20260906_01`; existing ownership/identity guard runs before mutation. Synthetic provider/settlement prerequisites only. External fetch disabled. No schema change, migration, reset, production deployment, customer activation, real payment or external message.

## Remaining integration and operating limits

**The new service is not yet exposed through an application action or button.** Next: connect protected read/write actions with module enforcement and server-bound fresh authentication; extend the existing preparation review with preview, reason, exact-request recovery and retained history in EN/FR. Then verify actual browser entry, role denial, session expiry, mobile/keyboard/reflow, failure recovery and latency. Do not instruct users to invoke internal services manually.

Additional required checks: changed setup/period between preview and commit; concurrent signing/preparation versus recovery; response-loss/session recovery in the actual UI; broader retained-reference manual resolution and statement-source paths; bounded source-query/receipt size under realistic volume. Current claim reads conservatively inspect provider-scoped retained dispositions, which may need narrower queries after measured review. Signed runs intentionally remain under their separate existing source-recovery boundary; this operation does not erase signed evidence.

Notification/outbox recipient delivery remains the previously recorded handoff gap. No new workflow closure or external approval was recorded. An organizational approval cannot substitute for unfinished public integration and recovery proof.

Future user inputs: select the existing tenant/provider/date/run, inspect the additional source counts, enter a reason, and authenticate when required. The system derives source IDs, actor, timestamp, evidence revision, receipt and audit. An independent operator must complete preparation/signing according to current permissions. Until the interface is integrated, retain affected records and use this report for engineering review.

## Review accountability

Architecture/backend/data: shared matcher, authoritative preview, conditional transition, Serializable recovery and retained records. Security/IAM/privacy: scoped active actor, fresh authentication, immutable request intent and full recovery-chain signer independence; public/module transport integration remains pending. Finance/ledger/audit: exact Decimal additions, no financial posting, rollback and one receipt/audit, original matches retained. Workflow/product: recover the existing run and require renewed review; UI remains unfinished. Quality/SRE: focused tests, actual concurrency/failure/retry, stable source bindings; performance and browser proof outstanding. APIs/events/rollout: no public endpoint or external delivery yet; no migration or deployment. SaaS packaging and statutory/country rules: no policy change or professional certification. POS/offline, purchasing, HR/payroll, analytics and AI: not applicable to changed behavior; corresponding domains were not modified.

Continuing skill: `009-aqstoqflow-payment-reconciliation-moat`. Passed gates are limited to the verified service paths above. Retain PR-10 as primary; the numbered inventory skill 010 is not a reason to switch while its required recovery and UI remain incomplete.
