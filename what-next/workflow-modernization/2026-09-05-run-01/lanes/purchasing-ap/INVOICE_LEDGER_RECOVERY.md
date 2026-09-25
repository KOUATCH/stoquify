# Authenticated invoice ledger recovery — 2026-09-08, source v60

The recovery service and server actions are implemented and verified against owned isolated PostgreSQL. The customer interface is not yet connected. PA-019 and the platform modernization remain incomplete. Selected skill: `011-aqstoqflow-purchasing-ap-controls`; continue this skill through the remaining AP workflow.

## Delivered service behavior

`services/purchasing/invoice-ledger-recovery.service.ts` now owns candidate discovery, review, submission, exact-request recovery and retained history. The new action facade derives organization/user/session/token from current authenticated state, agrees with the permission context, and delegates authority checks to the service. Client commands contain only an invoice ID, reviewed revision and stable request reference.

The existing `purchasing.ap.invoice.post` permission is required. Current organization/account usability, role membership, session identity/expiry and purchasing entitlement are checked inside the transaction. Submission also requires password assurance for this organization within five minutes, with no future timestamp or active assurance lock. The invoice maker cannot perform recovery; an authorized independent operator may recover a previously approved invoice. Read-only/missing/expired/suspended managed grants cannot submit.

The service checks the retained original approval event, applied/processed state and payload hash; invoice/organization/source/batch/actor/amount/currency/document bindings; maker/checker distinction; the selected three-way match; resolved exception evidence where applicable; and exactly one supplier purchase liability for the invoice and effective date. Invoice line subtotal/tax aggregates must agree. Supported recovery has no invoice discount or currency conversion. Uncertain or conflicting evidence fails with `INVOICE_EVIDENCE_REQUIRED`, without posting.

Review binds the invoice, approval, liability, batch, organization/country configuration, effective period, posting rule, journal and account snapshots. Submission recomputes that revision. Serializable transactions detect concurrent configuration changes; known PostgreSQL serialization/deadlock failures are retried at most twice after rollback, preserving the same command. Exhaustion returns a conflict asking for exact retry.

Missing or invalid rules, ambiguous/missing default purchase journal, unavailable effective period, unresolved country setup, posted/pending/reversed/partial batch state and missing prior request proof remain explicit review conditions. The service does not create configuration or fabricate approvals. Runtime country-pack resolution is not expert certification of a posting rule.

The posting kernel from v59 performs only ledger effects. Recovery leaves the original approval timestamp, approver, approval event and supplier liability unchanged. It updates the invoice's current ledger metadata and records a separate applied `purchase.supplier_invoice.ledger_recovery_recorded` business event, with the original approval/liability references, reviewed revision, stable request and outcome. Mandatory event/audit writes share the posting transaction. A cache invalidation failure after commit does not turn the durable result into a reported failure.

An identical committed request returns the recorded decision after current authority/fresh-auth checks. A different payload or actor using its key conflicts. This is a historical result, not a claim that the journal remains posted forever. The paged history read model reports the recorded outcome alongside the currently observed journal status; a later reversed journal is shown separately. Invalid retained events remain visible as unverified entries rather than becoming a successful empty history.

## Current limitations and next implementation

There is no new application route to open yet. Server actions are not proof that users can discover or complete this workflow. Connect the catalogue/search, review, password verification, submission, interrupted-response recovery and history to the existing AP shell using EN/FR, semantic tokens and accessible dialogs. Preserve exact pending requests before transport, distinguish the AP liability from ledger posting, and label historical outcomes separately from current journal state.

Legacy failed batches without a retained posting-request hash require reconciliation; the authenticated facade is stricter than the internal v59 kernel. Legacy posted batches cannot acquire invented evidence through recovery. Repeating the old invoice approval action still returns its original blocked result; callers must use the reviewed recovery service. The original approval action, matching-exception workflow and full invoice approval UI still need their current-session/revision audit and integration.

The read model's `ALREADY_POSTED` condition describes a batch already marked posted and prevents a new recovery attempt. It is not certification of the journal. The history `verified` flag refers to the retained application event/decision's checked bindings; it does not verify a human signature, legal approval or all current journal lines. Current journal status is an observation, not a new approval.

## Verification

| Evidence | Result / scope |
| --- | --- |
| `../environment/invoice-ledger-recovery-b98407ed-a05.json` | First run: 11 of 12 groups passed. Raw locking-query serialization error `40001` was not recognized by the retry wrapper. Corrected to recognize Prisma P2034 and P2010 carrying PostgreSQL 40001/40P01. |
| `../environment/invoice-ledger-recovery-584fe315-a13.json` | 18 of 19 groups passed. The injected decision failure was normalized by the business-event owner; the verifier incorrectly expected its raw message and stopped before rollback assertions. |
| `../environment/invoice-ledger-recovery-abea1e41-f31.json` | Final 20 groups passed. Fault injection explicitly confirms it ran, checks the normalized error, verifies journal rollback and unchanged failed batch, then successfully retries. |
| `../../evidence/invoice-ledger-recovery-tests-final.json` | 63 tests in six suites passed, including client-authority rejection, status/evidence consistency, action identity, cache failure, history scope and AP/kernel/correction regressions. |
| TypeScript / ESLint | Typecheck and seven-file changed-code lint passed. |

Actual positive flow: accepted goods receipt → prepared invoice → independent AP kernel approval with missing rules → install clearly labeled synthetic test rules → session-aware recovery → one posted journal, one supplier liability and unchanged 2,500.00 supplier balance → exact/concurrent replay → retained history. Original approval evidence remains byte-for-byte equivalent under the verifier hash.

Denial/recovery checks include stale configuration, revoked role, expired/foreign session, expired fresh authentication, maker submission, cross-tenant invoice/history, changed approval payload, duplicate liability, four managed module restriction cases, missing rules, decision failure/rollback, revoked authority on committed replay, tampered decision and history after a later journal reversal.

The owned verifier excludes only the newly enumerated fixture organizations when comparing all pre-existing payment, journal, journal-line, posting-batch, source-link, supplier-ledger, supplier, role and business-event rows. The invariant passed. Test password assurance is synthetic service-fixture evidence; actual browser login/step-up and action transport remain to be verified. No external messages, real payments, migrations, live customer activation, deployment, new browser screenshot, performance or production build pass is claimed.

Normal writing of the verifier encountered filesystem permission denial; its scoped assertion correction succeeded through approved escalation. This was not an automatic approval-review rejection. Earlier failed receipts remain retained.

## Operator inputs and sources

| Situation | Required information / owner | Where it comes from and what to do |
| --- | --- | --- |
| Recovery candidate | AP/accounting operator: original supplier invoice | Use the retained invoice record in the same organization. The upcoming interface will provide search and selection. |
| Current authority | Organization administrator and operator | Existing invoice-posting role; normal authenticated session and fresh password verification. Sample IDs or signed sample documents do not establish this authority. |
| Posting setup | Authorized accounting owner | Organization's actual journal, chart/mappings, effective posting rule and applicable country pack. Obtain expert review where required; the service does not supply it. |
| Source evidence conflict | Authorized AP/accounting/data owner | Original approval event, invoice/document, three-way match/exception, supplier liability, batch and journal/source trace. Reconcile them; do not edit hashes to pass the gate. |
| Stale preview | Operator | Re-read the authoritative invoice/configuration preview and confirm its new consequences. A stale request does not post. |
| Unknown response | Operator | Retain and retry the same request after authenticating as needed. Inspect its durable history; do not generate another request before resolving the first outcome. |
| Legacy batch lacking proof | Accounting/data owner | Original documents, approval and posting records. A reviewed reconciliation or correction path is required; no backfill was fabricated. |
| Reversed journal | Accounting owner | Current journal/reversal and source trace. A historical recovery result remains a record of the earlier operation; use the proper correction workflow. |

## Rollout and review accountability

No schema change or migration is needed. Keep the backend changes under normal reviewed code rollout; connect and verify the user journey before treating it as delivered to customers. Preserve recovery events and all financial evidence through rollback. Do not delete or mutate historical records to remove a blocker. Reverting the UI later must not remove retained recovery history or re-enable unreviewed posting.

Architecture/backend/database: service-owned orchestration, existing owners, serializable revisions and atomic recovery; no second ledger. Security/IAM/privacy: current user/role/session/module and independent maker boundary verified in PostgreSQL; browser transport proof pending. Finance/audit/close: approval/liability preservation, exactly-one journal and linked decisions tested; downstream close lifecycle still open. Country/statutory: existing resolver reused, no rule or statutory approval claimed. APIs/events: tenantless client command, applied recovery event and cache-failure semantics covered; no external provider. Product/UX/accessibility/localization: API/read models ready, actual EN/FR interface and visits pending. QA/SRE/operations: real concurrency and injected rollback, bounded serialization retries and accurate failed receipts; performance not measured. POS/offline, HRIS/payroll, analytics, AI and commercial packaging: not applicable to this bounded recovery service; retained in the broader inventory.
