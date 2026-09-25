# Finding and recovering older reconciliation certificates

Batch v101, 9 September 2026. This extends the existing certificate export workflow. Application sign-off and retained file integrity do not establish independent signer authentication, statutory certification or X1 approval.

## User procedure

Open `/en/dashboard/finance/reconciliation` or `/fr/dashboard/finance/reconciliation`, then **Browse certificate history**. This history reaches older runs beyond the dashboard's five displayed results and twelve fetched recent runs. Search by run ID or provider name, or use the previous/next controls. Each page contains at most twenty rows and displays when it was checked.

Choose **View certificate and receipts**. The current run status is separate from its historical exports. A run recorded as signed is still subject to source and certificate validation before download. A changed run is not made ready merely by appearing in history.

- **Review a new export** opens the existing export review and explains the close-evidence consequence. It issues a separate receipt only after explicit submission and current controls.
- **Recover this export request** opens the original request under the same actor who issued it. Verify your identity if requested and explicitly retry. The existing export service rechecks source evidence, permissions and freshness before returning the original bytes and receipt. Discovery itself issues no export.
- For a receipt issued by another actor, review a new export using your own current authority. History does not give you that actor's original request identity.
- A **legacy receipt** lacks recoverable original bytes in this interface. Do not reconstruct a file and label it as the historical original. A **receipt requiring review** is malformed or inconsistent; the records owner must investigate it without editing retained evidence to force acceptance.

If another uncertain request is already saved in your tab, it remains intact. Retry it or explicitly discard that local request, then select the historical receipt again. Discarding local state never cancels an issued server receipt.

## Information, owner and source

| Needed information | Owner | Where to get it |
| --- | --- | --- |
| Correct workspace | Current user/administrator | Existing organization context; never use a copied ID from another tenant. |
| Run ID or provider name | Reconciliation operator | Sign-off records, provider setup, existing receipt or history list. No manually invented identifier is required. |
| Business date and current signed status | Application | History summary and current run; export revalidates evidence. |
| Read permission | Workspace administrator | Existing role management: `payments.reconciliation.read`. |
| Export/recovery authority | Workspace administrator | `payments.reconciliation.certificate.export`, current module read access and the user's own verified password assurance. |
| Original request identity | Application | Verified stored receipt, returned only as a same-actor recovery command. It is not an authentication credential. |
| Receipt ID and file SHA-256 | Application | History summary and downloaded file/receipt. The server retains exact V2 bytes; the browser verifies the download hash. |
| Retention period and distribution rules | Records/finance owner | Recognized organizational policy. The application does not supply external approvals or retention decisions. |

## Failure and recovery

A failed query is not an empty successful result. Earlier results stay visible with a stale-data notice. **Retry history** repeats the failed search or page request. **Refresh this page** refreshes the currently displayed page. Changing filters starts at the first page; old cursors cannot be applied to new filters. A missing or foreign run is refused.

The history does not include raw provider payloads, certificate file content, or private signing material. A receipt summary marked as having verified bytes means its retained payload/hash is consistent; current source evidence is checked again by the download service. History remains read-only and does not trigger new close invalidation, ledger posting, payment, notification dispatch or export issuance.

## Late-arriving evidence correction

Testing older history reproduced a sign-off inconsistency: automatic matching and the source manifest selected verified/processed provider events by occurrence **or** receipt date, while sign-off counted only receipt date. The count and detail view now use the same existing evidence window. A matched event occurring in a prior period can therefore satisfy the evidence count even if it arrived later.

The requirement for provider events or statement lines remains. So do independent sign-off, open-period rules, unresolved-item checks, ledger truth and source-manifest consistency. This patch does not settle the broader business policy for cross-day late-event allocation or retroactively change existing certificates. Receipt-date overlap across runs remains part of the wider reconciliation review.

## Rollout and recovery

No schema migration or live deployment is included. Release the history contracts, service/action, EN/FR interface and export-panel adoption together. Keep v100 immutable export behavior in place. Legacy receipts are not backfilled or rewritten. Rollback of the history UI does not require removing stored records; prefer a forward correction if a retrieval defect is found.

The existing dashboard notification trigger remains unchanged; the separate v94 cutover is held. History discovery itself has no equivalent trigger. Existing new-export close-invalidation policy is preserved and disclosed, pending its connected review.

History uses bounded pages but validates each selected V2 receipt's retained JSON server-side. Large exports and very large tenant histories need production-scale storage/query profiling; no latency budget or cost certification is inferred from local tests. Additional supporting indexes should follow measured workload evidence and the normal migration process.

## Engineering review matrix

| Responsibility | Assessment and limit |
| --- | --- |
| Architecture/backend/API/distributed systems | Service-owned bounded read model; tenant/actor context comes from protected action. Downloads reuse v100 authoritative command validation. |
| Database/migrations/audit/records | Repeatable-read pages and timestamp/ID ordering; receipt integrity checked without writes. No migration/backfill or historical rewriting. |
| Security/IAM/privacy/fraud | Current read authority, active actor, module read action contract, minimal response projection, scoped browser state and same-actor request recovery. Export retains fresh authentication and current evidence checks. |
| Frontend/design/UX/accessibility/localization | Existing shell, inline named regions, standard controls, EN/FR search, stale/error states, keyboard focus and wrapped narrow layouts. Actual browser results bound the claims. |
| Product/business process/customer success | Older records become discoverable; original recovery and new issuance remain distinct. Inputs and operational owners are identified above. |
| Finance/accounting/reconciliation/close | Reproduced and corrected late-arrival evidence-count mismatch. Independent sign-off, ledger and period controls retained. Discovery has no financial or close effect. |
| Quality/release/SRE/observability/resilience/cost | Focused tests, owned database and browser artifacts; failed attempts retained. No production-scale performance or release certification. |
| SaaS packaging/entitlement | Existing permissions and module read control; no prices, subscriptions, entitlement issuance or provider added. |
| Analytics/data governance | Creation/signing/current-state/file-integrity concepts kept distinct. Bounded deterministic pagination does not imply full workflow completion. |
| Statutory/OHADA/country rules | No new statutory mapping, filing, legal retention period or expert approval; existing reviewed policies remain required. |
| Integrations/events/operations/support | Historical capture uses actual adapters/services in isolated fixtures; no external dispatch or new scheduler. Dashboard cutover hold preserved. |
| POS/offline, purchasing/AP, HRIS/payroll | Not applicable to production changes; those domain operations are unchanged. AP is only a fixture foundation. |
| AI/agent governance | Not applicable: no agent execution, delegated decision or autonomous approval introduced. |

The complete workflow assignment remains active. Broader late-event allocation, suspense resolution/write-off, country/provider/period variants, full accessibility, large-data behavior and remaining workflow families are not completed by this batch.
