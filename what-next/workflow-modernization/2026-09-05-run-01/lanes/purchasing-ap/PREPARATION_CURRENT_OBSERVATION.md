# Recovering a preparation after the invoice changes

Source batch v72, 2026-09-08. Selected skill: `011-aqstoqflow-purchasing-ap-controls`. This continues the platform-wide workflow assignment; it does not certify the whole AP lifecycle.

## The corrected behavior

At `/en|fr/dashboard/purchases/payables/prepare`, recovering an interrupted request preserves the original preparation record and displays a separate current invoice observation. Previously the returned recorded matching state could say “awaiting independent approval” after a later correction or posting.

The historical result includes the original invoice number, amount, currency, matching state and recording timestamp. The separate observation includes the invoice's current amount and lifecycle state, whether it is archived, and the observation time in labelled UTC. The current preparation proof is classified as:

| Observation | Meaning | Next action |
| --- | --- | --- |
| Current | The preparation event still matches the invoice source | Follow the observed lifecycle state; a posted invoice is not awaiting approval merely because its preparation was matched |
| Superseded | A later verified correction establishes the current source | Consult correction history and the current invoice amount/state |
| Unverified | The current source or preparation pointer cannot be verified | Reconcile the source and retained evidence; do not infer approval or revert to an older proof |

Recovery does not rewrite either preparation event, create a second invoice, repeat supplier liability, reopen an archived invoice or undo a correction. Current organization, maker, role, session and purchasing authority remain required.

## What the user needs

Use the existing pending request in the same browser tab's session storage and choose **Retry the same request**. The exact original command is retained before transmission. No new supplier document or editable supplier catalogue is needed merely to recover that command. A supplier becoming inactive after preparation therefore does not erase recovery.

The original document reference and SHA-256 came from the supplier document and the maker's retained file. They remain historical evidence. Current amounts and status come from the server; users do not enter them. The observation timestamp tells the reviewer when those values were read. A document hash establishes file consistency, not the signer's identity.

If the current preparation is unverified, ask the invoice maker and accounting owner to reconcile the original document, correction events, current source rows and preparation pointer. Unknown-maker reconciliation, unexpired approval revocation, posted financial correction/reversal and document hosting/retention remain separate workflows. This screen does not fabricate authority for them.

Denied access clears the local pending request and private response state. An uncertain response retains the exact request for retry. A mismatched server result or missing observation from an old protocol is not accepted as a successful current observation. After the result dialog closes, keyboard focus returns to the available next-action button.

## Surface scanner evidence

The static scanner now follows supported purchasing pages' actual imported `withPurchasesSurfaceAccess` call and `routeByKey` binding into the exact catalogue entry. It reports the configured permission, module and observe/enforce mode separately. It does not equate this static evidence with runtime certification.

The reviewed wrapper byte hash and catalogue lookup-plumbing hash are bound in `scripts/module-purchases-route-evidence.js`. A changed implementation requires review before updating those bindings. The extractor accepts direct returned wrapper calls with a constant, unmodified catalogue selection; unused calls, wrong imports, duplicate/unknown keys, mismatched routes, empty permissions, mutations, overrides and changed wrapper/plumbing are left unresolved. This is deliberately conservative. Unsupported dynamic or multi-module shapes remain visible for investigation.

No permission or module guard was removed to fix the scanner report. Action-level delegated authority still requires broader scanner reconciliation; the report must not claim that a catalogue entry alone establishes service enforcement.

## Rollout and recovery

No migration is required. Release the preparation service, transport type, UI and EN/FR messages together. The immutable decision schema and persisted event payload remain unchanged; observations are returned separately. Preserve the updated current-preparation proof reader after correction events exist. Reverting that reader would invalidate the evidence chain used by approval.

Observe retained-request failures, unverified source observations and source loading errors separately. A failed query must not become a zero-row success. Evidence and original source changes require reconciliation, not manual deletion of events or resetting invoice rows.

## Review responsibilities and limits

Architecture/backend/data: separate immutable evidence and live read model; invoice lock; no mutation on exact recovery. Security/privacy: current tenant/maker/session/permission enforcement, private-state invalidation, result binding. Finance/audit: recorded amount versus observed amount, no duplicate liability, archived and posted obligations retained. UX/localization/accessibility: neutral historical state, attention for unverified proof, EN/FR and UTC, responsive recovery and dialog focus. Quality/release/SRE: focused database and browser evidence, shared scanner regressions, source-bound receipts and labelled development latency. Country/statutory: existing setup and posting controls unchanged, no expert certification. Packaging: existing purchasing access remains authoritative. AI, payroll, POS/offline, provider billing and growth: not applicable to this bounded change because their behavior and data do not change.

Verification outcomes and any failed attempts are recorded in the immutable v72 receipt. Whole-workflow completion remains unproven until connected document, exception, posting/reversal, operator and close paths are covered.
