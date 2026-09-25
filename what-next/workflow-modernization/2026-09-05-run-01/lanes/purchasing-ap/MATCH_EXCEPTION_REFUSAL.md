# Refusing obsolete or unverifiable invoice exceptions

Evidence date: 2026-09-08. PA-017/PA-018 remain partial workflows; this change closes the refusal dead end for nonexpired OPEN requests. It does not certify the platform or clear X1.

## Problem and correction

The v65/v66 source validator prevented both approval and refusal when the invoice changed, request proof was incomplete, or the invoice was archived. Four owned-database reproductions confirmed the dead end. A reasoned refusal does not grant the variance or create a financial obligation, so it can close an obsolete request while preserving its invalid evidence.

The reviewer list now includes retained invoices with OPEN exceptions, including archived or changed-status invoices. Makers still see their own nonarchived disputed invoices. Archived sources are explicitly labelled. Approval continues to require the complete existing source validation. Refusal still requires the dedicated review permission, current tenant/module/session authority, an independent reviewer, fresh password verification, an OPEN unexpired request, a reason and a current preview revision.

Only expected domain/source validation failures permit an unverified refusal. Database faults propagate and prevent submission. Serializable transactions, source locks, exact-command recovery and atomic audit/business-event records remain in effect. The new refusal event carries `sourceVerification: UNVERIFIED` and null verified request/source references. The original request is untouched. New result/history records distinguish an authenticated refusal from verification of its underlying evidence. Old records remain readable without inventing a verification status.

## What the reviewer does

Open Purchases → Payables → Review invoice exceptions, or `/en/dashboard/purchases/payables/exceptions/review` (also `/fr/`). Select the invoice and its OPEN request. Inspect the original supplier invoice, receipt and request evidence. If it is obsolete or unsupported, select Reject and enter a specific reason. Review the warning about unverified source evidence and confirm with your own password. The recorded result and history explicitly retain the unverified-evidence warning.

| Situation | Information needed | Where to obtain it / owner | Next action |
| --- | --- | --- | --- |
| Invoice or receipt changed | Original and revised documents; why they changed | Supplier documents, receiving record and purchasing/AP owner | Refuse the obsolete request with the change explained. Reconcile the underlying documents before any new approval. |
| Legacy request lacks verifiable proof | Original request and available evidence; missing elements | Existing request history and organization's retained document records | Refuse if no longer supportable. Do not manually fabricate source hashes, approver IDs or historical timestamps. |
| Invoice archived | Why it was archived and why the exception is still OPEN | Invoice history and responsible AP owner | Use the labelled retained source for refusal. Refusal does not restore the invoice or permit new work. |
| Preview became stale | Latest displayed source and intended decision | Refresh/review the same form | Review again; retained inputs remain available. The old command cannot approve or reject changed state. |
| Response lost after confirmation | Retained request reference | Same browser session and signed-in user's recovery dialog | Retry the exact request. Current authority and password assurance are checked again. |
| Expired request | Its recorded expiry and current source | Request history; purchasing owner for a new evidence-backed request | It cannot be approved or refused through this OPEN-request operation. Expiry reconciliation/replacement remains separate. |
| Access denied | Current review permission and independent reviewer assignment | Organization administrator | Restore legitimate authority or assign another authorized reviewer. A request's maker cannot decide it. |

A refusal creates no payable, journal or payment and does not repair stale invoice preparation proof. A genuinely new request needs a currently valid source and supporting documents; obsolete proof is not retroactively authenticated. Full source correction/replacement and downstream close remain open engineering work.

## Verification, limitations and recovery

Final evidence is indexed in `../../evidence/exception-refusal-v68.json` after publication. Before-state receipt `exception-refusal-before-6e149e4e-fb3.json` means successful reproduction of the dead end, not correct original behavior. The first receipt write failed with EPERM; its output was not a retained successful receipt. `exception-refusal-after-e63661be-ee8.json` passed the first four corrections. Expanded run `exception-refusal-after-19903d2e-612.json` passed 11 groups but failed its attempted expiry mutation: the database's immutable-request constraint worked. The corrected natural-expiry run `exception-refusal-after-369def68-234.json` passed all 12 groups and preserved pre-existing records.

The refusal verifier hashes JSON-encoded source text through the shared fixture hash function; the publisher validates those bindings and records ordinary SHA-256 file bindings separately. Unit/action/UI regression: 99 tests in seven suites. Typecheck and changed-file lint are separate gates. Actual EN/FR browser results and screenshots must be checked before claiming that gate passed.

No schema migration, production activation, financial-rule change, provider integration or external delivery is needed. Roll out the application changes together so the new preview revision and optional result field agree. Old drafts require a new preview. Preserve original evidence and completed refusal records when rolling back application code; do not rewrite or reopen decided records to make the old UI appear compatible. Reverting this change restores the refusal dead end and older strict result parsers cannot verify new records with the added field; prefer a forward fix or temporarily withdraw the review entry point while keeping records intact.

Review responsibilities: architecture/backend/database cover atomicity and revision binding; IAM covers dedicated review authority and fresh authentication; UX/localization cover warning, archived label and recovery; finance/audit cover no financial effects and untouched historical proof; quality covers negative paths, concurrency and real persisted outcomes; rollout/support cover records surviving code changes. Country statutory rules, pricing/billing, POS/offline, payroll, AI agents and new providers are not applicable to this bounded refusal change because their rules and data paths are unchanged. Full assistive-technology coverage, outbox/operator visibility and the inventory/AP/ledger/close lifecycle remain incomplete. These are engineering reviews, not professional approvals.
