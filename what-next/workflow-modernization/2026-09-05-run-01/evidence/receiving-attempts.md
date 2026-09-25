# Receiving verification attempts

- receiving-before-eae022a3-743.json: original direct-service defects reproduced on owned records, with no stock or journal effects.
- receiving-after-92e8df0f-0eb.json: eleven groups passed before a verifier expected BLOCKED instead of the canonical FAILED posting-batch status. Corrected the assertion to require FAILED plus GOODS_RECEIPT_LEDGER_REVIEW.
- receiving-after-d6e8d339-28c.json: fourteen prerequisite groups passed before the reviewed integration; retained as historical.
- receiving-workbench-e1c7761e-3de.json and receiving-workbench-c2eb8638-d99.json: eight groups passed at intermediate source revisions; final evidence is receiving-workbench-88cd4da5-990.json with twelve groups.
- The new verifier initially had a syntax error before database execution. A later sandboxed attempt could not save its local result. The reviewed isolated run then completed and saved its report. No new automatic approval-review rejection occurred.
- The first focused Jest run failed old fixtures that lacked the new session scope and Decimal database records; legacy action tests also expected direct unreviewed writes and raw error leakage. Updated those contracts and fixtures; the stock and idempotency assertions remain exercised.
- receiving-browser-b18f7afa-e16.json: EN/FR review reached, then a strict locator matched both Close buttons. Corrected the locator.
- receiving-browser-5b5753b1-f12.json: review, responsive layout, stale denial and lost-response recovery passed. A test checked the preview's proposed rejection status before the actual submission completed. It now waits for the persisted-result UI.
- receiving-browser-e56578ff-cdc.json: EN/FR passed rejection, fractional stock and history; independent acceptance timed out because the test checked for the password field before review loading completed. Corrected that wait without bypassing password assurance.
- receiving-checks-de3dbdf0-cee.json: all 277 tests passed, then typecheck found a new unsupported error-code literal and outcome-map inference error. Reused the existing RECEIPT_EVIDENCE_REQUIRED code and added the explicit result type.
- Final evidence: receiving-checks-04afbcd3-d65.json; receiving-after-e3956bd0-be8.json; receiving-workbench-88cd4da5-990.json; receiving-browser-3df0b78a-90f.json. Full source hashes are bound in receiving-receipt.json.

Prior reports are historical, not current-source proof. No release, X1 or accounting certification is claimed.
