# Suspense correction boundary — v95

## Confirmed defect and correction

An owned PostgreSQL reproduction created and approved a real synthetic suspense posting, verified its ledger truth, and invoked the existing generic `reverseJournalEntry` service. The generic operation created a posted counter-journal and marked the original journal REVERSED, but left the suspense item POSTED_TO_SUSPENSE. The existing suspense ledger verifier then rejected the mismatch. This was a source/ledger integrity defect, not an organizational approval requirement.

The generic reversal service now treats PAYMENT_SUSPENSE as a source-owned operation, alongside its existing customer-settlement boundary. A permitted attempt is durably audited and rejected before a posting batch, journal or source link changes. The error explicitly says the linked correction workflow is not yet available. The journals table replaces the generic Reverse action for posted suspense journals with an EN/FR explanation. Other existing journal behavior is unchanged by this patch.

This **does not implement suspense resolution or reversal**. It closes the unsafe route while the proper source workflow remains required. No suspense item is marked resolved, reopened or written off to make a gate pass.

## What to do now

Open `/en/dashboard/accounting/journals` or `/fr/dashboard/accounting/journals` to inspect the posting. Its source evidence remains available through the reconciliation workbench and suspense history. The journal row explains why generic reversal is unavailable. Keep the original journal, posting batch, source links and approval evidence.

If the posting needs correction, record the suspense ID, original journal number, business reason, source payment/provider/statement evidence and the intended business outcome for the finance/domain owner. Obtain these references from the actual retained workbench/history and journal records. Do not edit database statuses or add a manual offsetting entry solely to make the operational status appear correct.

An existing mismatch requires investigation of both journals and source records. The new guard prevents new generic mismatches; it does not repair or certify pre-existing data. The before-test fixture intentionally retains a synthetic mismatch as reproduction evidence in the owned test environment.

## Required linked correction workflow — still engineering work

| Requirement | Source of truth / required evidence | Implementation status |
| --- | --- | --- |
| Distinguish unposted exception resolution, posted suspense reclassification and cancellation/reversal | Current suspense state, actual posting lineage and underlying provider/payment/statement records | Missing end-to-end domain commands; do not collapse these outcomes into one RESOLVED flag. |
| Proposal and review | Server-owned current source/ledger revision, reason, evidence references, maker identity and stable request ID | Current initial-post proposal is reusable infrastructure, not proof of correction support. |
| Authorization and separation of duties | Verified current actor/tenant/permissions and fresh-auth evidence; correct independent reviewer for the source operation | Existing controls must be applied to a dedicated correction command. Generic journal reverse permission alone is insufficient. |
| Compensating ledger effects | Original journal/batch/source links, balanced correction entries, applicable open posting period and approved domain posting mappings | Must be implemented together with source updates. Do not guess accounts or discard original entries. |
| Replay, conflicts and repeated correction | Current source revision, unique correction request, original/replacement lineage and incremented source versions where required | Initial suspense posting uses source version 1 and a fixed reclassification key; it cannot be blindly reused for later corrections. |
| Operational state and obligations | Linked exception/payment state, actual remaining suspense amount, retained commitments and module obligations | Existing reads distinguish some terminal enums but do not establish a valid resolution command. |
| Close and sign-off invalidation | Affected original/correction periods, reconciliation run and retained signed evidence | Both domain and close evidence must be invalidated or updated atomically as required; reversing only the journal is insufficient. |
| Recovery and history | Immutable prior approvals, original and compensating journals, retries, partial outcomes and retained records | Must remain available in EN/FR, including errors, interruption, historical inspection and permitted export. |

These are required implementation stages, not external decisions invented to avoid the work. Where a new posting rule or statutory treatment is needed, its actual finance/country-rule owner must supply or validate the mapping; this code change supplies no professional approval.

## Rollout and recovery

No schema changes, backfill, migration, external message, production deployment or live reversal occurred. Roll out the source guard and matching UI notice together through the normal release process. Monitor source-owned reversal refusals as review requests, not successful correction events. Never remove the guard merely because the proper workflow is incomplete. Restoring earlier application code would reintroduce the demonstrated integrity defect.

Alert-trigger cutover remains separately held by automatic approval review from v94; that trigger was not changed here. Its unanswered approval request does not block this independent correction work.

## Review responsibilities

- Architecture/backend/database/finance: original journal and source status must change through one domain operation. Actual before/after PostgreSQL proof shows the unsafe generic route and the corrected nonmutation boundary. No new financial transaction model or ledger was introduced.
- Security/IAM/privacy: existing protected action/fresh-auth and sensitive-action controls still precede the source guard; a foreign tenant cannot retrieve the journal. The refusal audit records that a reason was supplied, without copying its private text. This is not a full access or security certification.
- Audit/records/ledger/close: original evidence remains unchanged on refusal; ordinary controlled manual reversal and close-invalidation regressions are included. Historical mismatches and linked correction are still unresolved work.
- Frontend/design/UX/accessibility/localization: existing journal table and warning token reused, new explanation uses the existing EN/FR messages system. The broader journals page retains its historical English copy; full-route localization and screen-reader/contrast verification remain incomplete.
- Quality/release/SRE/operations: no deployment or automatic repair. Before/after service behavior, regression tests, real app rendering, and source bindings are recorded separately. Latency measurements are development observations only.
- Product/support: the user sees why this operation is unavailable rather than invoking a generic reversal that leaves inconsistent state. Inputs for the future correction are listed above. This boundary is not presented as workflow completion.
- APIs/integration/provider boundaries: the same server-owned guard protects direct callers of generic reversal; no provider event, API contract or external transport was changed.
- SaaS modularity, billing, statutory/country calculations, AP, HR/payroll, POS/offline and AI/agents: not applicable to behavior changes in this patch. No price, entitlement, statutory rule, unrelated domain state machine or agent approval policy changed. Broader source-owned journal exposure in other domains remains a review item.
- Analytics/data governance: refusing a journal-only reversal preserves consistency for existing suspense read models; no new aggregates or certification claims.

The full workflow-modernization assignment remains active. Completing the linked suspense correction/resolution lifecycle is still required, along with all other outstanding workflows.
