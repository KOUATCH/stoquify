# Invoice correction in the AP workspace

Implementation batch v71, 2026-09-08. This guide describes the supported unposted correction boundary; it does not certify the complete purchasing/AP workflow or statutory setup. Verification results are recorded separately in the v71 receipt.

## Where to start

Open **Purchases → Payables → Correct a supplier invoice**. The routes are `/en/dashboard/purchases/payables/correct` and `/fr/dashboard/purchases/payables/correct` inside the existing authenticated dashboard. The current organization is inherited from the dashboard. Only users with current invoice preparation permission can enter; the service additionally requires the original invoice maker.

Choose your invoice. Current invoice dates, notes and receipt-backed lines are prefilled. Supplier, supplier invoice number and currency are fixed. These identifiers must continue to identify the same commercial document. An already approved/posted invoice, payment, credit adjustment, supplier liability, journal entry or posting history requires the accounting correction process instead.

## Information to supply

| Information | Where to obtain it | What the system does |
| --- | --- | --- |
| Existing invoice | Search by the supplier's invoice number in Payables | Derives the organization, maker and existing invoice identity from authenticated records |
| Correction reason | Describe the actual discrepancy and what the supplier document establishes | Retains the reason with the correction and shows it to the independent approver |
| Invoice and due dates | The supplier's invoice and agreed payment terms | Revalidates both the original and revised accounting periods |
| Document reference | The reviewer-accessible location of the retained supplier document | Stores the reference as maker-supplied evidence; a link is not authenticated approval |
| Final document file | The exact retained supplier document on your computer | Calculates SHA-256 locally; the selector does not upload or publish the file. Keep the referenced file accessible to authorized reviewers. A hash detects changes; it does not establish a signature or signer identity |
| Receipt and invoice lines | Posted receipt records and the supplier invoice | Rechecks receipt ownership, quantity reservations, prices, tax and totals in the domain service |
| Notes | Relevant operational explanation | Preserves the old notes in the before-snapshot and records the replacement notes |
| Current password | Your own current sign-in password | Obtains fresh server-verified assurance. The password is never stored with the draft or retained request |

If the earlier preparation proof does not match the current source, its document URI and hash are not offered as verified prefill. Recheck the original document, enter its accessible reference and select its final file. The new correction does not certify the earlier record.

## Review and record

Review the before/after dates, total, notes, document evidence and lines. Selection uses the dashboard brand treatment; warnings remain attention states. Recording a correction does not imply invoice approval, accounting posting or supplier payment.

An unexpired OPEN or APPROVED matching exception protects the current source and prevents correction. Resolve it through the existing exception workflow. The correction does not silently revoke an approval. Eligible already-expired requests are recorded as expired atomically when the correction is submitted. A remaining price variance needs a new independent exception decision.

Country setup is displayed separately from correction success. Missing country setup still requires resolution before invoice approval. No tax treatment, country validation or professional approval is invented by this form.

The service binds submission to the reviewed configuration and source revision. Changed receipts, invoice fields, prior evidence, period or setup force another review. It recomputes quantities and totals and preserves other invoices' receipt reservations. Failed preparation leaves the original source intact.

## Recover without duplicating work

Partial drafts are retained in this browser tab's session storage, isolated by organization and user. They are not a shared server draft. Private state is cleared when current access is denied. Recovery depends on browser session storage being available.

Before transmission, the exact correction command and request reference are retained. If the response is lost, use **Recover the correction request**, confirm your password if prompted and retry the same request. Do not create another correction merely because the first response was interrupted. Current permissions and fresh authentication are checked on replay too.

An older correction can be recovered after another correction or invoice approval. Its historical result is labelled separately from the current preparation marker and observed invoice status. A retained event alone does not prove that the invoice still awaits approval.

Correction history includes recorded time, reason, request reference, verification result and current invoice observation. Original preparation events and matching-exception evidence are not overwritten. The independent approver sees the correction reason and retained previous source in the normal invoice approval preview, then uses the existing approval controls.

## Release and recovery constraints

No schema migration is required. Release the server read model, actions, route, translations and components together. Do not roll back to an approval reader that ignores `currentPreparationEventId` after corrections exist. Hiding the entry point is reversible; deleting recorded correction events or restoring old invoice lines by hand is not an application rollback.

Monitor action failures, source-revision conflicts, evidence verification and duplicate-request rates. A repeated evidence failure requires reconciliation of the source and its retained events, not bypassing the control. Known-maker unposted correction does not supply unknown-maker ownership assignment, unexpired approval revocation, financial reversals, document hosting or complete AP/ledger/close assurance.

## Review responsibilities

Architecture/backend/data/security: domain-owned totals and locks, tenant/maker authority, fresh authentication, source revisions and immutable history. UX/accessibility/localization: inherited shell and tokens, EN/FR, keyboard/dialog, responsive and draft/retry behavior. Finance/audit: no correction-created payable, original identity and obligations retained, independent approval provenance. SRE/release: bounded local verification, transactional retry, measured development-route observations, no production deployment. Packaging: existing purchasing eligibility and invoice permission reused; no new commercial entitlement. API/events: new prefill action plus existing correction/approval event boundaries. Country compliance: setup remains explicitly unresolved where required; no expert certification. AI, payroll, offline, billing-provider and growth behavior: not applicable to this bounded correction change because their behavior and data are unchanged.
