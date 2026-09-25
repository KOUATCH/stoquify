# Reconciliation certificate export

Implementation batch v100, 9 September 2026. This is an application evidence export, not independent signature authentication, statutory approval, or X1 clearance. See the accompanying verification receipt for the precise tested scope.

## User procedure and required information

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`. In the sign-off queue, select **Export** for the signed run. Review its run identifier, selected certificate hash, signing time and the consequences shown. A new export retains a receipt and invokes the existing close-evidence review mechanism; it does not sign the run again or post money.

| Information | Who supplies it | Where to obtain it |
| --- | --- | --- |
| Correct organization and run | Reconciliation operator | Current workspace and sign-off queue; use the business date and provider to identify the intended run. |
| Signed certificate and evidence hash | Application after authorized independent sign-off | The selected run; the operator does not invent a hash or sign-off. If missing or changed, the reconciliation owner reviews current source evidence. |
| Current read and certificate-export permissions | Workspace administrator | Existing role management. The specific permissions are `payments.reconciliation.read` and `payments.reconciliation.certificate.export`. |
| Fresh identity verification | Current user | Enter your own current password in the existing verification form when requested. Never send it to another operator or include it in an evidence packet. |
| Export request identity | Application automatically | Saved in this tab's session storage before submission and bound to the selected certificate and actor by the server. No manual UUID is required. |
| File, receipt ID and SHA-256 | Application after verified issuance | Downloaded JSON and the confirmation panel. Retain them in your organization's recognized record process. A hash proves unchanged bytes, not signer identity. |
| Retention period, permitted recipients and organizational approval | Authorized records/finance owner | Your approved internal policy. This implementation supplies no external policy or approval. |

Choose **Prepare and download JSON**. If identity verification is requested, verify it and explicitly choose **Retry saved export**. Verification alone does not issue a file. The browser checks the returned scope and SHA-256 before requesting the download. Check the browser's Downloads list and save the file: the application cannot prove that your device retained it.

## Interrupted or denied exports

If the response is lost, keep the same tab or reload it. **Retry saved export** retrieves the original bytes and receipt if current authority and source evidence still permit it. A new transport timestamp does not rewrite history. **Discard local request** only forgets local recovery state; it cannot cancel a server receipt already issued. Opening another tab does not share this recovery state.

If current evidence differs, do not edit a receipt or ledger record to make validation pass. Give the reconciliation owner the displayed run ID, certificate hash and error. They must investigate the source and use the supported review/sign-off process. A new certificate requires a newly reviewed request. For a concurrent issuance conflict, first retry the same saved request.

Export permission removal disables issuance while reconciliation read permission still allows review. A suspended provider alone does not erase authorized access to unchanged signed records. Actual module, identity and permission checks remain server-owned on every submission and replay.

Browser session storage must be available. If it fails, no new request is submitted. Retained server receipts remain intact. Storage recovery and controlled record retrieval beyond the current tab remain operational limitations; do not delete server evidence.

## Operator and rollout procedure

Deploy the server action, service, strict command contract, hook, EN/FR messages and panel together through the normal reviewed release. No schema migration or production activation is introduced by v100. Old clients lack the required certificate hash and request identity; refresh them rather than accepting an unbound command.

New receipts have source `CERTIFICATE_EXPORT`, kind `RECONCILIATION_CERTIFICATE_EXPORT_V2` and a request-specific idempotency key. They retain exact content, byte hash and receipt identity transactionally with issuance audit/event/outbox records. Successful retries still evaluate current sensitive-action authority but do not duplicate issuance effects. Existing legacy receipts are preserved unchanged; do not retrofit reconstructed bytes into them as historical proof.

If release recovery is necessary, preserve all issued receipts and prefer a forward fix. Reverting to the old exporter restores the mutable-receipt defect and cannot safely consume the new request protocol. No rollback requires deletion or renumbering of financial records. No migration, production deployment, external dispatch or alert-trigger cutover was executed here. The separate v94 cutover remains held.

The existing new-export close-invalidation policy is retained and made visible. Whether a pure export should invalidate a certified close remains an explicit connected policy/engineering review. Drift must continue to invalidate affected evidence regardless of that later decision.

## Review responsibilities

| Responsibility | Finding and boundary |
| --- | --- |
| Architecture/backend/distributed systems/API | Existing protected action owns identity; strict commands bind the selected certificate. Repeatable-read issuance, immutable receipts and explicit conflict retry. |
| Database/migration/audit/records | Bytes and audit/event effects are atomic; old receipts are untouched. No schema change. Retention policy is external input, not inferred. |
| Security/IAM/privacy/fraud | Verified authentication age replaces fabricated current time; read/export permissions and module read contract apply. Current actor and returned browser scope are checked. Existing certificate projection and source validation retained; no security certification. |
| Product/process/frontend/design/EN-FR/accessibility | Review before issuance, explicit close consequence, preserved uncertain request and hash-checked download. Uses inherited shell, inline named region, dashboard controls and brand/trust/error meanings. Browser results determine keyboard/reflow claims. |
| Finance/accounting/reconciliation/close | Actual capture, matching and independent sign service underpin isolated fixtures. Export does not create payment or posting. Signed source drift remains a refusal with existing close invalidation. |
| Quality/release/SRE/observability/cost/operations | Focused tests, owned database and real browser downloads; exact source bindings and failures retained. Development load times are observations, not production budgets. Large retained JSON storage/response cost has not been profiled at production scale. |
| SaaS packaging/customer success | Uses existing permissions and module contract; no new package, price, provider or entitlement is issued. Guide explains owners and recovery. |
| Analytics/data governance | Retained file timestamps remain historical across retries; a new request has a distinct receipt. Download request is not saved-file evidence. |
| Statutory/OHADA/country policy | No statutory calculation, filing, independent signature or retention-period approval added. Applicable expert review remains required. |
| Integrations/events/rollout/support | Existing certificate export event/outbox and close mechanisms preserved. External delivery is not tested or activated. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable to production changes: no changed operations in those domains; AP is only a synthetic fixture foundation. |
| AI/agent governance | Not applicable: no autonomous agent, delegated approval or agent tool added. |

Full workflow/platform review remains incomplete. This batch does not complete all provider sign-off paths, suspense resolution/write-off, country/retention variants, accessibility certification, production performance, external dispatch or release approval.
