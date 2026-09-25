# Reviewed supplier-invoice approval

Evidence date: 2026-09-08. This is the original approval interface connected to the v63 service, within the broader purchasing workflow. It is not complete platform, statutory, accessibility or release certification.

## Where to go

Open `/en/dashboard/purchases/payables` or `/fr/dashboard/purchases/payables`, then **Review supplier invoices** / **Examiner les factures fournisseurs**. Direct routes end in `/payables/approve`. Posting recovery remains at `/payables/recovery`.

The existing dashboard supplies organization context, navigation and theme. The new route requires the current purchasing module and `purchasing.ap.invoice.post`; visibility is not authority to submit. Services recheck current identity, role, tenant, module access and password assurance. The invoice maker cannot approve their own invoice.

## What the operator provides

1. Choose the correct organization through the existing application context. Your administrator assigns the invoice-posting permission to an independent approver; this screen does not grant it.
2. Search and select a prepared invoice. The invoice number, supplier and source evidence come from the maker's preparation workflow and supplier document. Review the source document, quantities, costs, tax and total against that document and the goods received.
3. Review accounting consequences. Period, country version, posting rule and journal come from the organization's accounting configuration. Ask the authorized accounting operator to correct missing or incompatible configuration. A hard blocker prevents confirmation. A missing posting rule or journal can instead be an explicit warning: approving the valid payable may leave its accounting entry blocked.
4. Enter your own account password when asked. It verifies the current sensitive action; the application does not save it in the draft. Approval records a payable and its posting outcome. It does not release a supplier payment.
5. Read the returned result. A blocked journal is not posted success. Follow **Open invoice posting recovery**, resolve its accounting conditions, review again and recover that posting. Recovery must not create another supplier obligation.

## Interruptions and history

The selected invoice and exact pending request are retained in this browser session, separately for organization and actor. The request is persisted before transmission. After an interrupted response, reopen the screen and recover that same request; do not create a replacement approval on the assumption that the first failed. A mismatched result is not accepted as success. If password assurance has expired, provide your password and retry the retained request.

A stale preview means source or configuration changed. Selection remains available, but refresh and review the new evidence before confirming. Failed record queries display a loading failure, not an empty successful list or an unknown submitted outcome. Revoked authority clears private screen state. Browser storage is a convenience, not the audit register or entitlement authority.

History separates the immutable recorded decision from the observed current status of its linked journal. Later reversal does not rewrite the earlier decision. An unverifiable historical record remains explicitly unverified. The browser's synthetic reversal test only tests this presentation; it is not proof of the real reversal workflow.

## Presentation and accessibility scope

The screen reuses dashboard surfaces, borders, typography, brand selection/focus, warning conditions and confirmed-success tokens. Selection does not imply approval. Shared dialogs, buttons and inputs retain portal theme, keyboard focus containment/return, wrapped mobile controls, long French text and reduced-motion support. No duplicate application shell or new design system was introduced. New approval text is EN/FR; inherited shell labels still include English in the French route. Screen-reader and contrast certification are not claimed.

## Verification and remaining work

See `../../evidence/invoice-approval-ui-v64.json` for final source-bound results and screenshot references when published. The first browser receipt, `../environment/invoice-approval-browser-0f4be9a7-ba6.json`, passed English but timed out recovering a retained French request, while source changed during the run. It remains a failed, source-unstable attempt. Initial UI tests passed with an asynchronous test-completion warning; the test now waits for history. Final focused tests passed 83 cases in seven suites.

No schema migration is needed. Local browser verification uses fresh synthetic organizations in the verified owned local database, normal sign-in, actual password assurance and real services. External requests are fenced. Existing-record hashes must remain unchanged. Development route timings are observations, not approved performance-budget results. No default migration-bearing build or production deployment is implied.

Legacy preparations lacking source proof still need controlled reconciliation; do not fabricate hashes or silently attest old records. Current-session exception request/review, other supplier-balance writers, module-surface scanner delegation, the goods-receipt ledger bridge and the full inventory/AP/ledger/close cycle remain open. Roll back this interface through the normal code-review/release process if needed; preserve committed approvals and audit history, and do not restore the old unreviewed action as a workaround.
