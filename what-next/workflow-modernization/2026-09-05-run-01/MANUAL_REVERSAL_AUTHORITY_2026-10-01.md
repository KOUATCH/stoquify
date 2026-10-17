# Manual journal reversal authority

Primary workflow: FA-CASH-COMMAND. Supporting workflow: FA-CLOSE-PACK. This correction continues the existing journal lifecycle and does not close either workflow or replace the wider modernization objective.

## Finding and bounded acceptance

The reversal action checked recent authentication at entry, then passed `Date.now()` as the authentication timestamp. An already-aged session consequently received a newer apparent assurance time inside the service. It did not bind the verified session's actor and organization to the permission context or recheck current permission/session after preparation waits. Neither the action nor `reverseJournalEntry` evaluated the tenant's writable Accounting grant.

The existing service already serialized competing reversals and rechecked elapsed sensitive-action policy after preparation, but that could not repair a fabricated initial authentication age or a withdrawn grant. Source inspection found the journal action is this command's only production caller.

Historical graph locator: `graphify-out/graph_actions.json`, node `accounting_journals_actions_reversejournalentryaction`, community 38. Current source was used to verify the boundary and its callers.

Acceptance requires correct server-derived identity/time, current writable Accounting authority, post-wait permission/authentication checks, no financial effects on denial or query failure, actual module-writer ordering, safe retry, one exact reversal under contention, and preservation of source-owned recovery restrictions and original evidence. Valid existing manual corrections remain possible when only new-work creation is stopped; current module authority and domain controls still apply.

## Implementation

The action uses the canonical Accounting/write/enforce gate and passes the actual verified authentication timestamp. Its server-owned callback rechecks fresh authentication, reversal permission, actor and tenant after the service prepares its current accounting scope.

The service evaluates and holds persisted module authority before accounting locks, then rechecks validity after preparation and the callback. It advances sensitive-control time through waits. Only the final successful control decision is audited as allowed; a refusal retains its appropriate denial audit without creating compensating journals, batches, links or Close changes. Read failures propagate and roll back. No automatic financial retry is introduced.

The existing source-owned journal guard, suspense provenance exclusions, maker/checker controls, open reversal-period requirement, original-currency mirrors, retained originals and duplicate refusal remain in force. No new-work creation gate is added to correction.

Posting and reversal period-scope helpers are unchanged. The automatically rejected broader manual-posting scope remains unapplied pending explicit approval; this work does not clear its earlier-period Close invalidation failures.

## Verification

All checks use the bundled Node runtime. The focused command wrapper is `lanes/environment/verify-manual-reversal-authority.cjs`, run separately with `jest`, `typecheck`, then `lint`. The default migration-bearing build was not invoked.

| Check | Result | Receipt |
|---|---|---|
| Focused Jest, initial attempt | 237 passed, six failed; retained | [failed receipt](evidence/manual-reversal-authority-jest-1be49688-18d2-4da9-b2d2-bb2b0a2a3b7f.json) |
| Focused Jest, corrected fixtures | 243 passed, 12 suites; zero failed/skipped | [receipt](evidence/manual-reversal-authority-jest-d0606c87-0e8a-45af-81d8-eb6fd05a9925.json) |
| Full no-emit TypeScript | Passed | [receipt](evidence/manual-reversal-authority-typecheck-ae4f256b-3f60-454b-95c9-4b495223d378.json) |
| Four changed files: ESLint | Passed | [receipt](evidence/manual-reversal-authority-lint-540581ed-c896-4757-9c2e-ed3e64a1f12c.json) |
| Owned PostgreSQL | All eleven scenarios passed; no finalization/disconnect errors | [receipt](lanes/environment/manual-reversal-authority-runtime-8d9822e8-9b89-4b06-b961-a1673d15fe1c.json) |

The failed tests used the internal `UNAUTHENTICATED` code where the canonical public boundary returns `AUTH_REQUIRED` (two cases), and today's reversal date against a June period fixture (four cases). Correcting the assertions and fixture dates required no production-control change. Failed source bytes and receipts are preserved. Independent preflight review also corrected two runtime-verifier filters to scope inventory levels through their item and adjustment lines through their adjustment; that invalid version was not executed against the database.

The terminal checks have stable source bindings. Database verification additionally confirms observed outside-fixture records remained unchanged. [Independent review](MANUAL_REVERSAL_AUTHORITY_REVIEW_2026-10-01.md) covers source, authority order, unchanged scope helpers and raw results.

Database command: `manual-reversal-authority-runtime.cjs --run` against the exact existing owned loopback database `stoquify_local_registration_20260906_01`. The eleven scenarios verified valid/stopped-new-work correction, grant denial and restoration on the same original, refusal of a real inventory-owned journal, both module-writer race orders, expiry during a real period wait and an authority callback, callback refusal followed by safe retry, already-aged authentication expiring during a brief real wait, concurrent/repeated requests producing one exact compensation, and rollback after financial plus Close-invalidation effects followed by an independent successful retry.

Actual blocker PIDs were observed. The late-failure check saw the compensating journal, batch, source link, invalidation event and export effects inside the transaction before throwing, then verified their complete rollback and unchanged original evidence. Successful cases retained exact original and base-currency amounts, source links and export content. These assertions do not establish complete earlier-period invalidation or full Cash/Close recovery.

Runtime actors, grant changes and callbacks are synthetic internal-service fixtures. Action tests verify public result mapping and trusted callback construction, but this milestone supplies no live browser/session-revocation proof. Grant-read failure cases are covered by focused unit tests; the current database run targets the eleven enumerated scenarios. The pre-change defects were confirmed by source comparison, not a separately executed predecessor database run.

## Use and recovery

Open `/en/dashboard/accounting/journals` or `/fr/dashboard/accounting/journals`. A refused reversal leaves the original journal and financial effects intact. Confirm fresh authentication when asked; otherwise ask the responsible administrator to review current reversal permission and the retained Accounting grant's status, read-only flag and validity dates. After legitimate restoration, deliberately retry the same original journal.

Source-owned journals still require their source correction workflow. Reversing through this generic command cannot substitute for payment, inventory, settlement or suspense recovery. An already reversed journal must not be reversed again to retry a request.

## Review, rollout and limits

This patch requires no schema migration or data backfill. It provides no production deployment, customer activation, commercial grant, payment, external message or X1 approval. Preserve exact predecessor snapshots and use ordinary reviewed release/recovery procedures. Reverting these authority checks reopens the finding; restoring a whole dirty checkout is not a recovery procedure. Financial records require governed compensating operations rather than deletion.

Architecture/backend/data/IAM reviews apply to transaction ownership, current authority and lock ordering. Finance/audit apply to exact compensation, no effect on denial and retained evidence. Product/SaaS operations apply to the difference between stopping new work and withdrawing writable access. Quality/SRE cover concurrent changes, failures, retry and evidence bindings. UI/localization review is limited to existing action handling: there is no new browser, EN/FR, keyboard or accessibility proof in this milestone. Country/statutory rule changes, provider integrations, offline processing and AI are not applicable because this patch changes none of those contracts.

Current permission/session rereads are not a complete persisted actor/role/session lock held through commit. Validity is checked after preparation and before effects, not at the exact eventual database commit after any later wait. Production contention has not been measured. Existing journal UI localization, full source/Close evidence scope, other producers and whole Cash/Close lifecycle remain incomplete. These are engineering results, not professional or release certification.

## Next journal lifecycle boundary

Read-only review of `app/[locale]/(dashboard)/dashboard/accounting/journals/page.tsx` found three concrete gaps. Its post/reverse redirects keep only error text, losing structured authentication errors and the selected operation; there is no in-page password confirmation. It offers generic commands for non-manual sources that the owner service refuses, and submits a hidden generic reversal reason without a reviewable date. Failed reads become empty arrays, zero counters and empty-table copy instead of explicit unavailable or partial states.

Next implement a small journal action controller using the existing `CloseAssuranceCenter`/`AccountantWorkDesk` authentication-recovery patterns: preserve entry, action, reason and date; confirm identity; require a deliberate retry; return focus correctly. Restrict generic commands to their manual provenance and current permission, preserve source-owned recovery, and distinguish failed queries from zero rows. Then verify actual EN/FR desktop/mobile journals with the current owned registration environment and separate maker/reviewer identities. The historical `verify-manual-browser.cjs` covers payment matching, not this journal journey, so it cannot establish this completion criterion. These findings are source analysis; no new browser outcome is claimed.
