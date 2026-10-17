# Manual journal posting: current Accounting access

Scope: FA-CASH-COMMAND, with FA-CLOSE-PACK as supporting dependency. This is a delivered correction within those workflows; neither workflow is complete. Verification receipts will be bound below after execution.

## Finding and intended behavior

The manual journal action previously required posting permission and recent authentication, but supplied no module gate to `protect`. The service also had no module-entitlement check. `protect` checks commercial access only when explicitly configured; its tenant-input guard does not supply module authority. A valid permission therefore did not prevent a persisted draft from being posted with an unavailable Accounting grant.

Stopping new work is a different policy. `module-stop-policy.service.ts` explicitly retains existing Accounting work and required ledger effects, and counts manual drafts among retained work. Journal creation owns the new-work admission check. Completing an existing manual draft must remain possible when creation alone is stopped, provided current permission, authentication, writable Accounting access and financial controls permit it.

Historical graph locator: `graphify-out/graph.json`, node `accounting_posting_service_postjournalentry`, community 8. The current source, rather than its historical line reference, establishes this finding.

## Correction and review contract

- The posting action requests server-selected Accounting/write/enforce access. Browser input cannot supply its grant or change enforcement mode.
- `postJournalEntry` evaluates persisted module access inside its existing Read Committed transaction before accounting locks. The existing evaluator locks the organization, its configuration and its ordered grant rows; these locks remain held through transaction completion.
- It evaluates access again after preparation waits and the server authority callback. Validity dates use the evaluator's real current clock, not a caller-supplied test clock.
- A refused grant commits a scoped entitlement-denial audit, then returns a forbidden response without posting effects. An authority query failure propagates and rolls back; it cannot restore legacy access.
- Legacy entitlement rules remain canonical. Explicit managed zero grants remain zero. Wildcard RBAC does not bypass grants. Existing draft completion does not invoke the new-work stop gate.

The current Accounting catalogue has no required dependencies, so a dependency-denial scenario is not applicable to this particular capability. Shared evaluator dependency tests remain relevant regression evidence.

Bounded acceptance: valid managed and legacy grants; retained stop-only completion; missing/zero/future/expired/suspended/read-only refusals; failed authority reads; writer-first and poster-first ordering; real expiry after preparation waits; unchanged financial records on denial; existing tenant/object, balancing, duplicate and rollback controls.

## Verification

Serialized command wrapper: `lanes/environment/verify-manual-posting-module.cjs`, invoked with the bundled Node runtime and each of `jest`, `typecheck`, and `lint`. No default build, migration or seed was invoked.

| Check | Result | Immutable receipt |
|---|---|---|
| Focused Jest | 196 passed, 10 suites; zero failed/skipped | [receipt](evidence/manual-posting-module-jest-d0e0b4dd-d936-498f-94b1-e5193d1089e9.json) |
| Full no-emit TypeScript | Passed | [receipt](evidence/manual-posting-module-typecheck-2a324b32-b887-4d38-8d37-748273024586.json) |
| Four changed files: ESLint | Passed | [receipt](evidence/manual-posting-module-lint-d980325a-f544-45a5-abc9-0cc242446d99.json) |
| Owned PostgreSQL | All nine scenarios passed; no finalization/disconnect errors | [receipt](lanes/environment/manual-posting-module-runtime-0744de7a-4a03-4663-af5b-9f280ae84125.json) |

All four bind unchanged source before/after execution. Database verification also confirms the observed outside-fixture records remained unchanged. [Independent review](MANUAL_POSTING_MODULE_REVIEW_2026-10-01.md) records source, lock order and verifier review.

The database command was `manual-posting-module-runtime.cjs --run` using the bundled Node runtime and the exact existing owned loopback database `stoquify_local_registration_20260906_01`. Its nine scenarios prove:

1. Actual posting with writable grants and completion of a draft created before new-work stopping.
2. Eight refusal variants: missing Accounting, explicit zero grants, expired/future intervals, suspended/expired statuses, read-only status and flag. All preserve financial/Close records and commit the denial audit. Restoring the synthetic grant allows the same retained draft to post once.
3. Actual grant-read failures at the first and final checks leave no financial or denial-audit effects.
4. A module writer that wins first causes the waiting poster to see committed withdrawal and refuse.
5. A poster that holds authority first causes the module writer to wait for posting completion.
6. A finite grant expires during a real period advisory-lock wait and posting refuses before effects.
7. A finite grant expires during the authority callback and posting likewise refuses.
8. A first transition from legacy intent to managed zero grants is observed by the waiting poster.
9. A foreign-tenant module writer does not prevent this tenant from completing its posting.

The races record distinct database PIDs and observed blocking relationships. Actors and grant configuration are synthetic service-contract fixtures; this is not an authenticated browser journey or commercial approval. Original fixture export content is retained, while the separately documented earlier-period invalidation defect remains open. No predecessor defect reproduction was executed for this patch; its pre-change finding is established by source comparison, while current behavior has test and runtime evidence.

## Operator guidance

Use `/en/dashboard/accounting/journals` or `/fr/dashboard/accounting/journals`. If posting is refused for module access, ask the organization's module administrator to inspect its retained Accounting grant, status, read-only setting and validity interval. A permission wildcard or fresh login cannot restore a missing commercial grant. Correct the underlying authorized configuration, refresh, and deliberately retry the retained draft. Do not create a second draft merely to retry.

Stopping new journal creation alone does not prevent permitted completion of an existing draft. Suspending or removing writable Accounting access does. The correction creates no subscription, price, commercial approval or live activation.

## Limits and rollout

No schema change, migration, seed, deployment or live activation is part of this patch. The denied all-period Close-lock candidate remains unapplied. Earlier Close records can still retain obsolete certification markers under the previously reproduced scope gap; this change does not fix or recertify those journeys.

The grant check establishes validity after preparation waits and before financial effects. It does not claim a strict wall-clock guarantee at the eventual database commit after later SQL waits. The existing action callback rechecks authentication and permissions but does not serialize every role/session revocation through commit. Those limitations remain tracked.

UI layout and translations are unchanged; no new browser, accessibility or EN/FR proof is claimed. The current journal page still contains existing English labels/error presentation requiring its own complete workflow review.

For an authorized rollout, include this patch in the normal reviewed application release and monitor forbidden posting results, query failures and lock waits. A denial leaves the draft available for an explicit retry after access is legitimately restored. If a regression appears, stop rollout and preserve denial records; do not bypass grants or remove the check as a recovery shortcut. Exact predecessor copies are retained for reviewed code recovery without resetting unrelated shared changes.

Review responsibilities: architecture/backend/data/security/module packaging cover authority ownership, lock order and retained obligations; finance/audit cover no financial effect on denial and persistent audit; quality/SRE cover failures, concurrency and verification limits. Frontend/localization/support cover existing error delivery and operating guidance. Statutory rule changes, payroll, POS, providers, AI and external delivery are not applicable: this patch changes none of their behavior. These are engineering reviews, not professional or release certification.
