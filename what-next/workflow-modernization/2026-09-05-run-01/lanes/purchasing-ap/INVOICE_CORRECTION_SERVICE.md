# Correcting an unposted supplier invoice: service foundation

Evidence date: 2026-09-08. This is a backend implementation and verification record for PA-033, connected to preparation PA-016, exceptions PA-017/PA-018 and approval PA-019. **The correction form, navigation and its EN/FR browser verification are not implemented yet.** Do not treat existing preparation screens as a correction interface.

## Current behavior

The original invoice preparation event remains immutable history. A correction records a new `purchase.supplier_invoice.reprepared` event, a complete before-source snapshot, before/after source hashes, the correction reason, the reviewed command and the previous preparation reference. The invoice's metadata points to the current preparation event. That pointer alone is not proof: approval validates the event's tenant, actor, type, status, hash, command, revision, document reference/hash and current invoice source. An invalid pointer or inconsistent command cannot fall back to older proof.

The supplier, supplier invoice number, currency and original preparation idempotency key are preserved. Within an eligible unposted invoice, the maker may correct document dates, due date, notes, retained document reference/hash and receipt-backed line descriptions, quantities, costs and tax rates. Existing line rows are replaced transactionally; their full prior values and IDs remain in the immutable before-snapshot. The existing three-way match is recomputed, retaining its ID for historical exception references. Original request and decision events are unchanged.

The service reuses the domain's receipt reservation calculator and duplicate fingerprint. It excludes this invoice's old reservation once while retaining every other invoice's quantities. It recomputes totals, variance, match status and country-setup metadata. Both the original and corrected accounting dates require an open period. It neither creates a payable nor posts a journal. An independent approver must subsequently approve the corrected invoice; a new variance requires its own current exception decision.

## Authority and boundaries

Correction has a dedicated authority boundary using current `purchasing.ap.invoice.post`, tenant membership, purchasing entitlement, session identity and fresh password assurance. Only the known original invoice maker may correct its preparation. The existing invoice-posting and exception authority helpers were not broadened.

Correction is unavailable for archived/cancelled/posted invoices, unknown makers, inactive suppliers, paid amounts, unsupported discounts, payment allocations, supplier credit notes, existing supplier liability, posting batches, journals or approval/posting history. Such records require their existing financial reversal/correction process and must not be rewritten through preparation.

An active OPEN exception must first be resolved through independent review. An unexpired APPROVED exception cannot be silently revoked. Rejected or expired exceptions retain their original evidence; eligible expiry is materialized with its existing event/audit operation in the correction transaction. A supported explicit revocation process for an unexpired approval remains separate work.

Serializable transactions, supplier/source locks, source-revision comparison and exact request replay protect the operation. Failure while recording correction evidence rolls back changed lines, invoice state and expiry effects. The server actions derive identity from current authentication, reject extra authority fields and preserve committed results when cache refresh fails. History distinguishes recorded correction results from the current preparation pointer and observed invoice lifecycle state.

## Inputs needed when the interface is connected

| Input | Source / responsible person |
| --- | --- |
| Invoice to correct | Existing AP invoice record; the application should provide its identifier and preserve supplier/number/currency. |
| Correction reason | Original maker's documented explanation of what was wrong and why the new source is correct. |
| Invoice date and due date | The retained supplier document and agreed payment terms. Both source and corrected accounting periods must be open. |
| Document reference | The organization's accessible retained supplier document link, not a fabricated approval ID. |
| Document SHA-256 | Compute from the actual retained file. A hash proves file consistency, not supplier identity or legal approval. |
| Receipt lines and quantities | Accepted receiving records; the application must prefill available source rows and preserve other invoices' reservations. |
| Descriptions, costs and tax rates | Supplier invoice and applicable expert-reviewed country setup. The service reuses current country logic; no new statutory rule is certified. |
| Password verification | The signed-in maker's own current password through the existing step-up flow. Never put a password in correction history or draft storage. |

The reviewed revision and idempotency key are system-generated, not manual business evidence. After a lost response, retry that exact command and inspect retained history. A stale preview requires a new review. A correction result is preparation evidence and must not be displayed as invoice approval or payment success.

## Evidence and remaining work

Initial receipt `invoice-correction-41232eb3-329.json` passed 16 owned-PostgreSQL groups. Final correction receipt `invoice-correction-f8263bb8-b0a.json` passed 23 groups, adding managed-module denials, rejected/expired approval histories and inconsistent correction-command proof. Tests reproduce the old PREPARATION_REVIEW blocker before correction and verify a new independent approval creates exactly one supplier obligation afterward. Original business events and pre-existing tenant records remained unchanged. The final index is `../../evidence/invoice-correction-v70.json` once published.

69 tests in five suites passed, alongside final typecheck and nine-file lint. The initial typecheck completed successfully but predated later changes and is not the final source binding. Process metadata access was denied in the ordinary sandbox; a read limited to typecheck PID/start time was permitted, and no unrelated process was stopped. No failed check was relabelled as a pass.

Required next implementation: maker source selection and prefilled correction form, before/after impact preview, current country/setup explanations, password confirmation, exact retry and history, existing AP navigation, and EN/FR keyboard/mobile/error-path browser verification. Also verify original preparation replay and multiple successive corrections are labelled as historical versus current in every affected screen. Register the new delegated service boundary in relevant surface tooling.

No schema migration is required. Do not expose correction actions through the product until the interface and connected recovery checks are complete. Roll out service and UI together. Preserve correction events, before-snapshots and current proof pointers during recovery. Old approval code cannot validate corrected preparation through the new pointer; rollback requires retaining the compatible proof reader or temporarily withdrawing approval for corrected invoices. Never restore an obsolete proof pointer merely to remove a blocker.

Review matrix: architecture/backend cover the existing service ownership and new preparation revision; data covers reservations, snapshots and atomicity; IAM covers current maker and fresh authentication; finance/audit cover obligations, independent approval and immutable events; QA covers persisted outcomes and concurrency; UX/localization remain pending for the correction screen; SRE/support cover rollback and source binding. Billing, payroll, POS/offline, AI and external provider behavior are not applicable to this bounded change because their rules and paths are unchanged. Country/accounting rules are reused, not certified. The selected skill remains `011-aqstoqflow-purchasing-ap-controls`; advancing to the next numbered payroll skill is deferred while AP remains incomplete.
