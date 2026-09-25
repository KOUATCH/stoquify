# Downloading correction evidence

Implementation batch v99, 9 September 2026. This adds a controlled download to the existing correction history. It does not issue an approval, statutory certificate or settlement confirmation.

## Procedure and required information

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. Choose **Correction and history / Correction et historique** on the relevant suspense item, then **Download evidence / Télécharger les preuves** on the specific historical event.

| Information or prerequisite | Who provides it | Where to get it |
| --- | --- | --- |
| Workspace and suspense item | Investigator/accountant | Current authenticated workspace and reconciliation queue or retained suspense history. The server checks the item belongs to that workspace. |
| Historical event | Person requesting evidence | Choose the proposal, rejection or approval in correction history. The system supplies its actual record ID and evidence revision; no manual approval reference is needed. |
| Read and export permissions | Organization administrator | Existing role management: `payments.reconciliation.read` plus `payments.export`, with payment-reconciliation read access. Export permission does not grant posting or approval authority. |
| Fresh authentication | Signed-in requester | Enter your own current password when prompted. Then explicitly retry the retained request. Authentication alone does not issue a file. |
| Export receipt and SHA-256 | System | Shown after a verified download request. The receipt, requesting actor, issue time, source records and watermark are retained by the application. |
| Retention location and recipients | Authorized records owner | Use your organization's existing retention and access policy. This implementation does not invent a retention duration or authorize external sharing. |

The JSON file contains the selected event, its linked proposal and original approval references, the original financial journal, and the exact compensating journal for an approved correction. Amounts remain decimal strings. Raw provider payloads, unrelated metadata, prior certificate payloads, journal descriptions and raw dimensions are excluded. Account/entity identifiers and the correction reason remain because they explain the financial evidence; handle the download as financial data.

## Reading the evidence correctly

- `selectedRecord` describes a historical proposal, rejection or approval.
- `sourceObservedAtExport` states the item's status observed when this particular export was issued. It can differ from the historical event and from today's status.
- `export` contains the issued receipt, requesting actor, timestamp and watermark. A browser message confirms that verified bytes were passed to a download request; it cannot prove that you saved the file.
- A replay of the same request returns the exact originally issued bytes. To capture a newer observed status, finish recovery and make a new download request from history.

Keep the downloaded file with its SHA-256. On Windows, run `Get-FileHash -Algorithm SHA256 -LiteralPath 'C:\path\to\download.json'` and compare the result with the displayed hash. The path is the file you actually saved. A matching hash detects unchanged bytes; it does not prove an independent signer's identity or establish new approval authority. Verify approval through the controlled application records and your organization's process.

## Recovery

If the response is lost, keep the tab and retry the retained request. Its identity survives reload in this tab's session storage; the server returns the existing receipt without issuing a duplicate. Permission and authentication are checked again. An altered file, changed record revision or damaged financial link produces an error rather than an apparently valid download.

If export permission is unavailable, you may still inspect history with read authority. Ask the administrator for the specific permission only when your role requires it. If evidence fails validation, give the records owner the item/record IDs shown in history and the error; do not modify retained journals or receipts to make the check pass.

## Rollout and recovery boundary

No v99 schema migration, provider integration or production deployment is introduced. The v97 posting-cycle migration/client and v98 correction services remain prerequisites. Deploy the server action and client together through the normal reviewed release process. Preserve issued receipts on rollback; there is no reason to delete exports or renumber posting cycles. Once later cycles exist, use forward recovery as described in `SUSPENSE_POSTING_CYCLES.md`.

Use the existing audit records to investigate export requests. Issuance records do not attest to client-side storage. No new background schedule or external notification is required. The separate v94 alert-trigger cutover remains held.

## Review responsibilities and limits

| Responsibility | v99 assessment |
| --- | --- |
| Architecture/backend/API | Existing reconciliation actions and dedicated service own export truth; strict input, immutable receipt, repeatable-read snapshot and duplicate recovery. |
| Database/audit/records | File bytes and issuance audit commit together; no schema change. Retained financial and approval lineage is checked before issuance/replay. |
| Security/IAM/privacy | Server-derived scope, active actor, current read/export authority, fresh authentication, explicit field projection and scoped browser recovery. No signer certification claimed. |
| Frontend/design/UX/accessibility/EN-FR | Existing inline region, buttons, dashboard tokens and localized feedback. Historical event, observed status and downloaded evidence remain distinct. Browser evidence determines keyboard/reflow claims. |
| Product/finance/accounting/reconciliation | Removes a manual evidence-collection gap while retaining exact original/counter-journal amounts and historical decision identities. Export has no financial posting effect. |
| Quality/release/SRE/cost/operations | Owned database/browser and focused regression evidence required. Development latency is an observation; no production performance or full accessibility/security certification. |
| Packaging/entitlement | Existing `payments.export` and module read gate; no prices, subscription changes or new provider. |
| Analytics/data governance | Historical event and observed-at-export status are labeled separately; immutable replay does not silently refresh history. |
| Statutory/country policy | No statutory mapping, filing, retention-period decision or professional approval added. Existing expert-review requirements remain. |
| Integrations/events/rollout/support | Existing audit infrastructure; no external dispatch or new worker. Local evidence files are synthetic. |
| Purchasing/AP, POS/offline, HRIS/payroll | Not applicable to production changes in this batch; no mutations in those domains. AP only supplies synthetic fixture foundations. |
| AI/agent behavior | Not applicable: no agent tool or autonomous approval added. |

The full workflow register remains incomplete. Final resolution/write-off, real sign-off issuance after correction, broader history and country contexts, notification freshness, existing-data repair, complete accessibility and production rollout require further work. The v99 verification record documents exact results and remaining limitations.
