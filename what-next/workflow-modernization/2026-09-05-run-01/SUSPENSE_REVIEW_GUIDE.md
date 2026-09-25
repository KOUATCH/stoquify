# Suspense proposal review and recovery — v89

Engineering scope: PR-08 proposal and PR-09 posting approval, with serialization shared by PR-07 assignment. The platform-wide assignment remains active. Use the verification record for the exact tested boundaries; this guide is not a release or statutory approval.

## Operator procedure

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` and find the suspense queue.

1. The maker checks the source amount, currency and classification, enters the business reason and proposes reclassification. The server requires an active account belonging to the organization. Proposal submission carries the source revision and a request identifier automatically.
2. An independent authorized checker opens **Review posting**. The review contains saved facts: item, amount, currency, classification, ledger account reference, posting date and reason. Unsaved maker edits are not an approved proposal.
3. The checker confirms. If authentication is too old, verify the current password, then confirm again. Password verification does not itself post a journal.
4. If the source changes, refresh and open a new review. A draft keeps its text after a recoverable failure. **Use latest source and keep my draft** explicitly adopts the current revision for a new proposal; compare the current facts first.
5. If a response is lost, retry the retained request. The service checks the recorded posting, journal/source truth, approval and inbox receipt before returning an already-posted outcome. An exact retry creates no second journal.

The current draft survives failures while this page remains mounted. Reload/back-navigation and expired-session draft restoration are not yet provided by this queue. Copy necessary unsaved business text before leaving; never copy a password. Previously posted records without the new review-binding evidence are not silently upgraded into replayable approvals.

## Inputs and where to get them

| Situation | Required information | Owner and source | Action |
| --- | --- | --- | --- |
| Propose classification | Suspense item, amount/currency, classification and explanation | Reconciliation operator; current queue and original bank/provider/business evidence | Check the evidence and enter the reason. The application supplies revision/request references. |
| Account unavailable | Correct active suspense account in this organization | Finance administrator/accountant; chart of accounts and approved posting configuration | Correct setup through its authorized workflow. The queue currently shows an account identifier; it does not invent an account or certify its statutory suitability. |
| Approve | Saved proposal, independent current permission and fresh authentication | Checker; actual saved review and their own current account | Review and confirm. A typed timestamp or file link is not authentication. |
| Changed source | Latest saved facts and retained draft | Maker/checker; refreshed queue | Recompare facts, explicitly adopt the latest source for a proposal, or reopen the approval review. |
| Uncertain response | Same request/review and current retained outcome | Operator/support; current page, item, journal, source link and approval inbox | Retry without changing the business request. Investigate a conflicting receipt rather than recreating approval. |
| Legacy posted record cannot replay | Original journal, batch, source link and approval history | Finance operator/support; retained records | Inspect original evidence. No fabricated revision/backfill is supplied by this change. |
| Module or role denied | Actual organization, permission and module state | Workspace administrator; current members and module settings | Resolve legitimate access requirements through existing controls. This feature does not authorize changing commercial eligibility. |

## Rollout and recovery

Ship the action schemas, service/hash helper, dashboard read model, query hook, queue component, parent workbench and EN/FR messages together. Older clients without a review revision are rejected. No schema migration, seed, production deployment, live payment or external message is part of this batch.

Keep existing v87 period and v88 authority corrections. Concurrent conflicting transactions can fail and require an exact retry; transaction failure is not reported as successful posting. Terminal replay still checks current permission and fresh authentication, but does not require reopening an accounting period just to read its retained successful outcome.

Monitor stale-review conflicts, unresolved receipt inconsistencies and retries separately from new successful postings. Stop new writes using existing authorized controls if investigation is required; retain journals, approvals and inbox evidence. Reverting only the UI or only the server contract creates incompatible requests. Do not restore the old unchecked approval behavior to make errors disappear.

## Remaining engineering work

- Full reload/session draft restoration, source account labels, queue pagination and complete screen-reader/contrast verification.
- Proposal exception-metadata preservation, reassignment/deactivation races and historical invalid owners.
- Standalone suspense close obligations, full notification delivery/read lifecycle, posting-configuration revision review and retained-history/export navigation.
- Other reconciliation workflows and the entire remaining platform register. Passing this batch is not whole-workflow or platform completion.

## Review responsibilities

| Lens | Engineering finding / limit |
| --- | --- |
| Architecture/backend/API | Shared evidence contract across service/read model/action/hook/UI; client draft cannot authorize posting. |
| Database/migrations | Scoped row locks, revision conflicts and retained replay checked in owned PostgreSQL; no migration. |
| Security/IAM/privacy/fraud | Current module/role/fresh-auth/SOD checks retained; cross-tenant denial and safe public messages. No certification. |
| Finance/accounting/reconciliation/audit | One journal/source chain per approval, retained receipt verification and period-safe retry. Standalone close obligations still need review. |
| Frontend/design/accessibility/localization | Existing shell, shared controls, semantic tokens, saved-fact review, EN/FR recovery and keyboard return. Full accessibility audit remains incomplete. |
| Product/workflow/operations/support | Fewer repeated drafts and clear distinction between verification and posting; precise recovery guidance above. |
| QA/release/SRE/performance | Focused tests, database effects and source-bound browser attempts recorded separately. Development timings are observations, not production budgets. |
| SaaS packaging | Existing module write admission preserved. No prices or commercial eligibility changed. |
| Statutory/country rules | No rule/country-pack change; synthetic posting setup cannot establish OHADA/SYSCOHADA approval. |
| Events/notifications | Existing transactional publication reused; end-to-end delivery/read lifecycle remains open. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable to this patch's behavior; fixture setup uses AP utilities only for isolated test preparation. Their platform reviews remain in scope. |
| AI/agents, analytics, external providers | Not applicable to changed behavior; no agent tool, analytical formula or provider integration is added. |
