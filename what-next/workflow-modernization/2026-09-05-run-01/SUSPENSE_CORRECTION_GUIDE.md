# Correcting an approved suspense posting

Implementation batch v98, 9 September 2026. The full workflow-modernization assignment remains in progress. Consult the v98 verification receipt for the actual tested boundaries; this guide does not certify accounting policy or production readiness.

## Where to start

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation` in the authenticated workspace. In the suspense approval queue, choose **Correction and history / Correction et historique** for a posted item. Earlier corrected items also expose this entry, and retained items can be opened through the existing suspense history.

The current source status comes from a new server read. History describes past events. A confirmed retry of an earlier correction does not prove that the item is still reopened today.

## Information and people needed

| Input | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Suspense item and original journal | Investigator or accountant | Select the item in the queue or retained history. The service obtains the linked journal, exact amounts, accounts and original approval; do not enter substitute journal IDs. |
| Correction reason | Investigator | Explain the discrepancy and why the original posting is wrong using your retained source documents and reconciliation investigation. No invented evidence or generic approval text is required. |
| Reversal accounting date | Authorized accountant/proposer | Use your organization's accounting calendar and applicable correction policy. The service requires an open accounting period and a date on/after the original posting, no later than today. An unavailable period is a real prerequisite. |
| Independent decision and reason | Reviewer | Inspect the proposed reason, original journal, exact amount and consequences. The reviewer needs both suspense-posting and journal-reversal permissions and must differ from the correction proposer and original posting approver. |
| Fresh identity confirmation | Reviewer | Enter your own current password when prompted. It is never saved in the correction draft. Confirmation does not automatically submit the decision; retry the retained decision explicitly. |
| Issued receipt references | System | The service issues durable proposal and decision IDs. Read them in correction history; do not manufacture approval IDs or replace an issued record with a draft document. |

With two authorized people, the original posting approver can propose its correction and the original posting proposer can independently decide it. Your organization remains responsible for assigning appropriate permissions and accounting responsibility.

## Normal process

1. Enter the correction reason and accounting date, then preview the consequences. The original posting remains effective while a proposal awaits review.
2. Submit the proposal. Another authorized person opens the pending correction, reviews the facts and supplies an independent decision reason.
3. Rejecting retains the original posting. Approving creates an exact compensating journal, retains the original entries and approvals, and reopens the source obligation in one transaction.
4. Investigate the reopened item. Use the existing reclassification proposal/approval flow when it is ready for another posting. Each later posting has a distinct cycle and approval receipt. Correction does not settle an obligation, issue a payment, or erase history.
5. Revisit affected reconciliation and accounting-close reviews. Correction invalidates affected sign-off/close evidence, retaining the prior reconciliation certificate in its receipt. Revalidation and any later sign-off remain separate workflows.

## Recovery and limits

- Drafts and submitted requests are scoped to the current organization, actor and item in this browser tab's session storage. Keep the tab open after an uncertain response. They are not portable approvals or server-saved unsubmitted drafts.
- If a response is lost, retry the retained request. Its exact identity and payload are reused. A committed decision returns its existing receipt rather than another reversal.
- If evidence changed, reload the current records and independently review again. Clearing a local request does not cancel a proposal or undo a recorded decision. Review the server history first.
- If storage cannot be saved, submission stops so the request identity is not lost. Restore browser storage and reload the panel before submitting.
- A voided reconciliation run cannot be silently reopened by this correction path. Its source state needs investigation. A malformed or missing approval, source link, compensation or cycle chain also requires evidence repair, not an override from this form.
- Reversal copies the original currencies, exchange rates, base amounts, dimensions and linked entities with debit/credit swapped. It does not rerun today's posting rule against yesterday's transaction.
- Existing migrations must include `20260909093000_add_suspense_posting_cycles` and its generated Prisma client before this code runs. The migration has been applied only to the owned local verification database. After real later cycles exist, do not deploy old code or contract the schema by deleting/renumbering history; use forward recovery.

## Scope still open

The full suspense lifecycle, exports, final settlement/write-off, production rollout and complete connected workflow audit remain subject to their own implementation and verification. Synthetic invalidation-state tests do not establish real certificate issuance or statutory approval. X1 and the separately held alert-trigger cutover are unchanged.
