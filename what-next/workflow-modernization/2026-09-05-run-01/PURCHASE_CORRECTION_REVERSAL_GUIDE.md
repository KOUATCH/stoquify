# Purchase return and supplier credit reversal controls

The reversal date must belong to an open accounting period even when the original return or credit did not produce a journal. A failed original posting does not authorize a change to stock or supplier obligations in a closed period.

## What changed

- Both journal and no-journal reversal paths validate the reversal period before financial effects.
- Only the original tenant/source's pending or failed batch with no journal can be retired as an unposted correction. A posted, reversed, mismatched or changed batch requires evidence review.
- A missing reference cannot conceal an existing source journal or posting batch. Posted journal lookup also checks the exact original source ID.
- Unposted reversals retain an explicit audit event explaining that no journal reversal was created. Original error/evidence records remain intact.
- A posted reversal still mirrors the original journal entries. A later open reversal period can be used while the original period remains closed.
- Exact retries return their retained result, including after that reversal period closes. They do not repeat stock or supplier effects.

These are repository/domain behaviors verified in synthetic local records. They do not establish statutory approval, bank settlement or permission for a particular user to execute a real reversal.

## Current interface availability

The return/credit actions exist, but source search found no production form calling these reversal actions. There is no new reversal route to open in this batch. A complete accessible EN/FR review-and-confirm interface remains implementation work; do not use a database editor or direct domain call as a substitute.

Authorized users can review invoice/payment consequences in `/en/dashboard/purchases/payables/history` or `/fr/dashboard/purchases/payables/history`. That history is not a reversal form or a complete credit register.

The existing action contracts derive the organization and actor from the session and specify fresh authentication. Return actions require `purchasing.returns.post`; supplier-credit actions require `purchasing.ap.credit.post`. This checkpoint verifies domain effects and source checks, not the complete live role/session/module/separation-of-duties matrix.

## Information needed, who supplies it, and where to find it

| Information | Owner / source | What to do |
| --- | --- | --- |
| Original return or credit identifier | Purchasing/AP operator; retained source document and application record | Identify the exact original. Never enter an unrelated journal or batch ID to get past an error. |
| Actual correction reason | Responsible purchasing or accounting operator; documented investigation | Explain what was wrong and why a compensating reversal is appropriate. |
| Reversal date | Accounting owner; actual correction date and tenant period register | Use the correct date in a permitted open period. If the intended period is closed, ask the accounting owner for the appropriate treatment; do not reopen it or change the date solely to bypass a gate. |
| Supplier-credit reversal number and document | AP operator; supplier-issued or organization-authorized correction record | Retain the real record. The credit action requires its number, date, reason and document hash. A hash establishes file consistency, not approval or signer identity. |
| Return evidence | Receiving operator; original receipt, returned lines and stock movement references | Verify the original items and quantities. Reverse any active supplier credit before reversing its linked return. |
| Current permission and fresh authentication | Organization access administrator and signed-in operator | Use the existing authorized action when an appropriate application integration is available. A source record is not authority. |
| Idempotency key | Application-generated request identifier | Keep the same command and key when retrying an unknown outcome; the eventual UI must handle this automatically. |
| Inconsistent posting reference | Engineering/data owner with accounting reviewer; source record, source links, batches and journals | Investigate and prepare a reviewed correction. Do not edit immutable credits or mark posted batches failed to force reversal. |

No new business decision is needed merely to implement the missing interface. Actual period treatment, document authenticity and operator authority remain organizational inputs.

## Recovery and rollout

No schema migration is required. Release the two service files together: the reversal helper now requires the original source ID, supplied by both owning services. No production deployment, live payment or outbound message occurred.

A period or evidence rejection must leave supplier balance, cash, invoice status, stock, numbering, batches, journals, audit and outbox state unchanged. The owned database verifier checks that transaction rollback. After a legitimate prerequisite correction, submit the unchanged request again or review a newly intended command. Do not duplicate the source document.

Retain the original and reversal records. The database continues to reject edits to posted return/credit evidence. Code rollback must preserve all committed records and audit events; it is not an accounting reversal. The older code permits the demonstrated period bypass, so disabling the affected action is safer than restoring that behavior during an incident.

Existing historical invoice-status drift is not backfilled here. Broader period-close concurrency, posting-recovery races, return/credit authority and full downstream close/settlement remain under review. The new period check is not a proof that all concurrent closing paths across the platform are safe.

## Review responsibilities and limits

| Responsibility | Engineering assessment |
| --- | --- |
| Architecture/backend/database | Existing transactions and ledger helper retained; original source identity propagated; conditional batch transition rejects inconsistent evidence. No schema change. |
| IAM/privacy/fraud | Tenant/source isolation checks retained and strengthened; cross-tenant service rejection tested. Complete public-action authorization and fresh-session runtime review still open. No personal data exported. |
| Finance/accounting/retention | Open-period requirement applies to all reversals; cash stays separate; source journal entries mirrored; original immutable evidence preserved. |
| Inventory/AP | Return reversal restores the original stock movement; supplier-credit reversal restores the payable. Active credits continue to block return reversal. |
| Audit/events/operations | Unposted reversal has an explicit audit classification; rollback includes events/outbox. Notification delivery is not exercised and no external message is sent. |
| QA/release/SRE | Red-before/green-after tests, persisted effects and stable non-fixture checks. No new performance budget or deployment certification. |
| UX/accessibility/EN-FR | No changed interface; production reversal forms are still missing. Prior history screenshots are historical evidence and are not presented as reversal-UI verification. |
| Statutory/country rules | Existing engineering period policy enforced. Accounting treatment and country-specific compliance still require expert review; synthetic posting rules are not approval. |
| Product/support | Gives actionable reasons for blocked reversals and preserves valid retry. Missing user-facing reversal journeys remain work. |
| Analytics | No new metric; retained state and audit distinguish reversal of an unposted correction from journal reversal. |
| SaaS packaging, POS/offline, HRIS/payroll, AI/agents | Not applicable: this change does not alter those workflows, entitlements or agent authority. |

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. Next numbered skill: `012-aqstoqflow-payroll-presence-engine` after outstanding AP work. These are engineering review responsibilities, not independent professional approvals. Exact results and source bindings are recorded in `CORRECTION_REVERSAL_VERIFICATION_V85.md` and `evidence/correction-reversal-v85.json`.
