# Manual journal posting: Accounting module authority review

Evidence date: 2026-10-01. Scope: `FA-CASH-COMMAND`, with Close evidence as a supporting boundary. This is a source review of one correction and a review of its prepared verification driver. It does not complete either workflow, clear X1, authorize deployment, or establish professional certification.

The reviewed correction closes a separate entitlement bypass in `postJournalEntry`. A permitted, freshly authenticated actor could previously post a manual draft without consulting the tenant's Accounting grant. `protect` only evaluates a module when the action declares one; `requirePermission` does not infer module authority from the permission string. Posting had neither an action module gate nor a service-owned grant check.

Stopping new work has a different meaning. `services/modules/module-stop-policy.service.ts:25` and `:34` preserve `existing_accounting_work` and `mandatory_ledger_effects`. `services/accounting/journals.service.ts:312` admits new manual journals through `assertModuleNewWorkInTx`. Existing-draft posting must remain available under current writable grants and its existing accounting controls. The reviewed change does not apply the new-work admission gate to posting.

## Exact review binding

The service and test were compared with the exact predecessors in [the service baseline manifest](evidence/manual-posting-before-module-21d440e3-3d1a-4a83-9d38-62fb4afa7f28/manifest.json). The action and action test were compared with [the action baseline manifest](evidence/manual-posting-module-before-root-2995180a-e494-4fbe-912f-aa31c7608782/manifest.json). No Git reset or restoration of unrelated changes was used.

| File | Predecessor SHA-256 | Reviewed SHA-256 |
| --- | --- | --- |
| `services/accounting/posting.service.ts` | `472a383ea593a40b28ecd1afec1ccc407256668cbaddad165ba071fb4d8900bb` | `18a014629124e58989e76dbf8c20b5a111058d97df466b0c86a4c8f1e95ce40e` |
| `services/accounting/__tests__/posting.service.test.ts` | `6e8822bc7ac07cb47846fc350c14ecef26a2da6edc11d9f89555f96b22a14ab2` | `e0b69b9cb540f0431152babec8cb135efa1922d93d497d4bd7abe7bb6d50b39c` |
| `actions/accounting/journals.actions.ts` | `192859169b9a92a592c726aa7ce047b9241026dae6150482bd1c0a51296bde8d` | `1163f98626e3909887a6139ba5b7c034567faec5948434b62d0e97cce94f7afb` |
| `actions/accounting/__tests__/journals-posting.actions.test.ts` | `e8f854fceff133023e216dfd2f3348078bcd4766b374aa8dbfad74e789076e62` | `295096b0c83b9cb668f47dc10636c785ccee78d995dfaabab276951ed3333644` |

The existing `services/accounting/journal-posting-order.service.ts` remains SHA-256 `f74cd6d9e9e62fa74ec8fec7c0dfc5fe4f69f17f3132eb576fd0384461f78ddc`. The automatically rejected all-period proposal has not been applied. Its separate source-dependency and contention analysis remains in [MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md](MANUAL_POSTING_SCOPE_REVIEW_2026-10-01.md).

The historical graph locator `graphify-out/graph_actions.json`, node `accounting_journals_actions_postjournalentryaction`, community 38, identifies the action boundary. All material behavior below was verified against current source, not inferred from the graph's historical line number.

## Behavior and ordering reviewed

The action declares server-fixed Accounting `write` access with `mode: "enforce"` at `actions/accounting/journals.actions.ts:104`. Browser fields cannot supply its module slug, evaluation mode, identity, permissions, freshness, or authority callback. The existing callback rechecks fresh authentication and posting permission after preparation.

The service calls `evaluateModuleAccessInTx` before the catalog, journal and accounting-period locks (`posting.service.ts:268`). The reusable evaluator locks the active, nondeleted organization for SHARE, its configuration for SHARE, then its grants for SHARE in deterministic module/id order (`module-entitlement.service.ts:172`). The Read Committed owner reads committed authority after a wait. A managed configuration with no Accounting grant remains a denial; it cannot fall back to broad legacy access. Valid unconfigured legacy access remains supported.

The grant evaluator rejects missing, future, expired, suspended and read-only Accounting authority; `readOnly: true` restricts writes independently of the status string. Wildcard RBAC does not override module grants. Accounting currently has no required catalogue dependencies; the review did not invent one to produce dependency coverage.

After preparation locks and the current-authority callback, the service re-evaluates module authority with current wall-clock time before its allow audit or financial effects (`posting.service.ts:359`). An injected accounting test clock cannot make an expired module grant valid. Denial records an entitlement audit in the transaction, returns without financial or Close effects, and throws `ForbiddenError` with HTTP 403 after the transaction commits. Failed authority reads propagate; they are not converted into successful empty grants or legacy access.

No lock inversion was found within the reviewed writers. `module-composition.service.ts:255`, `:280`, `:340`, `:361` and `:396` take the organization UPDATE lock first. Their accounting setup and obligation observations use ordinary reads. Legacy module activation updates the same organization row. Fiscal creation takes the catalog key and inserts children whose organization foreign-key KEY SHARE locks are compatible with the posting authority SHARE lock. The period-closing path does not introduce an opposite organization UPDATE dependency. The module addition holds tenant authority longer during existing accounting waits; production contention and capacity have not been measured.

## Verification state at review

The coordinator's [Jest receipt](evidence/manual-posting-module-jest-d0e0b4dd-d936-498f-94b1-e5193d1089e9.json) records **196 passed, zero failed, zero pending, 10 suites**, exit 0 and stable source bindings. The service tests use the real pure entitlement evaluator for grant meanings and mock the transaction adapter; their committed-denial assertion is an orchestration assertion, not a PostgreSQL commit proof. Existing stop-only continuation and reversal behavior remain tested.

The prepared [database verifier](lanes/environment/manual-posting-module-runtime.cjs) was reviewed at SHA-256 `d7f83c09db6d53aee2fbd064cd9cffc46b4b37b329de441cbd827ed69ff8a496`. No blocking API, instrumentation, synchronization or finalization defect was identified. It requires the exact owned disposable database, uses actual service calls and persisted grant decisions, records exact PostgreSQL blocker PIDs, and preserves source and outside-tenant fingerprints. Its nine cases cover writable and stopped-work continuation, eight denial variants and restoration, initial/final query failure, both module-writer contention orders, expiry during an actual period wait and during the callback, first legacy-to-managed-empty transition, and unrelated-tenant lock isolation. It compares financial and Close records on denial, permits only the specified denial audit, checks successful posting deltas, and retains original export content. Disconnect failure prevents a passed receipt.

Final receipt review confirms the coordinator's [full typecheck](evidence/manual-posting-module-typecheck-2a324b32-b887-4d38-8d37-748273024586.json) and [four-file lint](evidence/manual-posting-module-lint-d980325a-f544-45a5-abc9-0cc242446d99.json) both exited 0 with stable source bindings. The [actual PostgreSQL receipt](lanes/environment/manual-posting-module-runtime-0744de7a-4a03-4663-af5b-9f280ae84125.json) records **9/9 passed**, matching reviewed service/driver hashes, identical before/after source maps and outside-tenant fingerprints, and no execution, finalization or disconnect error. Its denial/read-failure cases preserve financial and Close records; the successful cases show only their expected posting effects, with both module-writer contention orders and actual expiry waits evidenced. Together with the 196-test result above, these establish the scoped module-authority behavior under the recorded fixtures. The reviewer assessed existing receipts and ran no tests or database writes; all limits below remain in force.

## Use, recovery and rollout

An operator can continue an existing manual draft after a reviewed stop when Accounting write access, fresh authentication, posting permission, separation of duties and accounting prerequisites remain valid. A new draft remains subject to the separate stop policy.

For an Accounting-access denial, retain the draft and ask the module administrator to inspect the tenant's actual grant, its status, read-only flag and validity interval. Restore authority only through the organization's authorized process, then retry the same draft. Re-authenticate when the response specifically requires fresh authentication. A storage failure requires restoring the authority read and retrying; it does not justify changing grant records or fabricating success.

No migration or data backfill is introduced by these four files. Before any authorized rollout, bind the target build to terminal verification receipts and review the unresolved Close scope separately. A controlled recovery must preserve current source bytes and compare the four exact reviewed hashes before selectively restoring their recorded predecessors; never restore an entire dirty checkout. Such a code rollback reopens this entitlement bypass and requires an explicit operational decision. Successful posted journals remain accounting records and must use their existing governed correction workflow, not destructive rollback.

## Review responsibilities and limits

Architecture/backend/database/IAM/quality/SRE review applies to transaction ownership, authority order, fail-closed reads, denial evidence and contention. Product and SaaS packaging review applies to the distinction between grant withdrawal, workspace selection and stopping new work. Finance/audit/Close review applies to preserving draft evidence, one-effect posting and retained records. UI/localization review is limited to existing protected-action failure handling; this patch adds no new interface and this review supplies no new EN/FR, accessibility or browser proof. Provider, billing-provider, offline, AI-agent and country-pack changes are not applicable because this patch changes none of those contracts.

The current action's actor/session callback is not a full persisted-authority lock held through commit. The shared RBAC role query's tenant filtering and wider role/session revocation contract remain separate work. Grant validity is rechecked before effects after preparation and callback waits; later SQL may still wait, so this is not a claim that wall-clock expiry is tested at the exact PostgreSQL COMMIT instant.

Other journal routes/actions, draft creation's global evidence effects, source-owned producers and reversal entitlement policy are not remediated by this patch. The rejected all-period proposal and earlier-period Close invalidation gap remain unresolved. Synthetic runtime actors, grants and fixture exports do not establish customer authority, commercial eligibility, statutory approval, production capacity, or completion of Cash/Close workflows.
