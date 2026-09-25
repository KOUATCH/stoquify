# AP posting retry integrity — 2026-09-08, source v59

This checkpoint repairs the posting kernel needed by invoice recovery. It does not complete PA-019, introduce an authenticated recovery action, or establish statutory approval. Selected skill: `011-aqstoqflow-purchasing-ap-controls`.

## Findings and delivered behavior

The current posting owner is `services/purchasing/ap-control.service.ts#createAPLedgerPosting`. Its callers include invoice posting/approval, supplier payment release and purchase correction posting. It delegates batch/source linkage to the accounting owners and invalidates close evidence after posting. Historical graph hints for the AP workbench (component node `purchasing_apcontrolworkbench_tsx`, community 25) identify the interface relationship; current source establishes these service dependencies.

| Reproduced issue | Correction / observed outcome |
| --- | --- |
| Exact retry reused a batch but created another journal and link | Serialize the same organization/source/purpose in the transaction; return the retained journal only when request, batch, journal lines and source-link evidence agree. |
| Removing a rule after success changed the posted batch to failed | Resolve existing posting evidence before evaluating new configuration. A verified historical posting remains posted. |
| Changed source amounts could create another journal | Persist a canonical request hash and reject changed source/date/period/currency/document/amount inputs. |
| Concurrent exact submissions produced a batch unique-constraint error | The waiting transaction re-reads committed evidence and returns the same journal. |
| The posting kernel could post in a closed period | Lock the supplied tenant period and validate the effective source date through the existing period owner before new effects. |
| Journal numbering used an unprotected count | Serialize this AP number prefix/date within the organization. Two distinct concurrent sources were verified to receive distinct journal numbers. |

The before run already rejected foreign direct accounts and parent accounts through `getActivePostingRule` → `validatePostingRuleLines`; those checks were preserved, not claimed as new fixes. It also already permitted a failed batch to become posted after rules were supplied. The missing customer workflow remains connecting this kernel recovery to approved source evidence and current user authority.

New or recovered postings retain request and journal-evidence hashes in batch metadata. Hashes detect inconsistency with retained evidence; they do not authenticate a signer or protect against a privileged database operator changing both records and hashes. This is not security certification.

Posted legacy batches without the new request/journal proof require reconciliation. The kernel does not backfill proof or create another journal. Failed legacy batches may proceed only when their source, period and document hash agree and they have no journal/link/posted/reversed effects; the future authenticated recovery facade must independently verify the approved invoice and liability evidence. Pending or reversed batches and partial journal effects require accounting review.

The helper remains an internal transaction-bound kernel. It does not itself grant actor permission, establish fresh authentication, validate supplier invoice approval, authorize a country pack, or create supplier liabilities. Do not expose it directly as a public action. Existing approved-invoice replay still returns its blocked result; configuring rules and repeating approval is not yet a complete recovery workflow.

## Verification and limitations

- Before `../environment/ap-ledger-retry-d76effcc-011.json`: five failures and three preserved passing checks, on real isolated PostgreSQL.
- After `../environment/ap-ledger-retry-491fc376-8ed.json`: all 16 groups passed. Includes exact/concurrent replay, changed requests, missing links, altered journal lines, missing legacy proof, reversed/partial effects, closed periods, account isolation, atomic audit rollback/retry and concurrent distinct sources.
- `../environment/invoice-approval-integrity-852006c2-90b.json`: all four actual AP approval regression groups passed against the changed source. Two concurrent 2,500.00 liabilities still produce 5,000.00; no journal is invented when rules are absent.
- `../../evidence/ap-ledger-retry-tests-final.json`: 87 tests across eight suites passed (AP, retry, corrections, actions, accounting, preparation and receiving).
- Typecheck and changed-file lint passed. No interface, browser, EN/FR, accessibility, performance, migration or full-build pass is claimed in this checkpoint.

The first verifier attempt (`ap-ledger-retry-b3bc0cb5-f4e.json`) failed during fixture creation because nested test rule lines lacked their required organization IDs; no kernel check passed in that attempt. The fixture was corrected before the before/after comparison. The initial unit run had six incomplete-mock failures, with its JSON write denied by filesystem permissions; terminal evidence remains. The next run retained those six failures in `ap-ledger-retry-tests.json` because two mock replacements had not matched LF line endings. Those fixtures were corrected without weakening assertions; the final run passed. Normal editing of that existing test file also failed with filesystem permissions; the scoped edit and test receipt write succeeded through approved escalation. There was no automatic approval-review rejection.

The kernel verifier creates a new, enumerated set of synthetic organizations for each run. Its invariant compares all pre-existing payment, journal, journal-line, posting-batch, source-link, supplier-ledger, supplier and role rows before/after, excluding **only those newly created organizations**. All earlier fixtures remain in the invariant. The approval verifier also confirmed its original financial rows unchanged. Test journals/rules are synthetic verification data, not production approvals or real payments. Tampered test records remain retained as evidence.

## What operators need and where to obtain it

| Case | Needed input / owner / source | Next action |
| --- | --- | --- |
| Missing posting configuration | Authorized accounting owner: effective purchase journal, chart accounts/mappings and expert-reviewed posting rule from the organization's accounting configuration | Supply actual configuration. The reviewed recovery interface remains engineering work; do not call the internal kernel manually on a live invoice. |
| Changed or missing posting evidence | Accounting/data owner: invoice, original approval event, supplier liability entry, batch, journal lines and source links from the same organization | Reconcile the exact source and retain a reviewed correction decision. Do not edit metadata to make the check pass. |
| Closed effective period | Authorized accounting owner: original invoice date and period record | Follow the organization's approved period/correction process. Do not alter the invoice date solely to bypass the closure. |
| Posted retry | Current authorized workflow actor: same approved source configuration and evidence | The internal helper can return existing evidence. Production recovery must still check current permission and session. |
| Partial or reversed journal | Accounting owner: original journal, reversal and source trace | Use the appropriate reviewed reconciliation/reversal workflow; this retry path does not repost reversed obligations. |

## Rollout, recovery and remaining engineering

No schema, migration, deployment, live customer activation, external message or real payment was performed. A rollout must retain source evidence and account for legacy posted records without new hashes. Roll back only this checkpoint's code through normal review if necessary; do not delete journals, links, audit events or manufacture historical hashes. Audit-write failure is transactional: no journal/batch/link from that attempt survives, and an identical retry can post once.

Next: implement current-session, fresh-authenticated invoice recovery with service-owned review revisions and verified original approval/liability evidence; retain one supplier liability and consume no exception twice. Complete invoice matching/approval UI, recovery history and EN/FR browser paths. Verify configuration concurrency and other ledger-number writers, all supplier balance writers, inventory → AP → ledger → close, and remaining workflows in the platform register. No whole workflow becomes complete from this prerequisite patch.

## Review accountability

Architecture/backend/database: existing owners/transaction and schema reused; source and numbering locks added. Finance/audit/ledger/close: posting evidence, balancing regressions, period closure, exactly-once journal and atomic audit covered; full close lifecycle remains open. Security/IAM/privacy: tenant-scoped kernel predicates and account isolation tested; public recovery authority remains unfinished. APIs/events: no new public transport or event contract; close invalidation retained. QA/SRE/operations: real concurrency and fault injection, retained failures and scoped invariants; no production performance claim. Product/UX/accessibility/localization: no UI change; recoverable customer flow still required. Statutory/country: no rules certified; fixtures are explicitly test-only. POS/offline, HRIS/payroll, analytics, AI/provider and commercial packaging: not applicable to this bounded kernel patch; their broader workflows remain in the inventory.

Next numbered skill: continue `011-aqstoqflow-purchasing-ap-controls` until its workflow and connected verification are complete; do not advance to payroll merely because this prerequisite passed.
