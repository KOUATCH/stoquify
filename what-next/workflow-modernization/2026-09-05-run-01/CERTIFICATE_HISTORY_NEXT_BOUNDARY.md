# Next connected boundary — retained reconciliation discovery

Current-source review after published v100, 9 September 2026. Full workflow objective remains active; v100 is concrete progress, not whole-platform completion.

## Revalidated gap

`getPaymentReconciliationDashboardData` reads only 12 recent runs (`services/reconciliation/payment-reconciliation-dashboard.service.ts`), and the workbench renders only the first five (`components/finance/PaymentReconciliationWorkbench.tsx`). The new certificate review can restore its own saved request from the current tab, but there is no complete signed-run/export-receipt discovery surface. A user who changes tabs or needs an older certificate cannot reliably discover that evidence through the current queue.

`getReconciliationRunDetail` is an existing scoped per-run service. Reuse its source relationship rather than treating it as a paginated history API. The stored V2 export receipt contains an actor-bound request and exact bytes; a history feature must not release those bytes merely because a row is visible, or bypass current permissions, freshness and drift checks.

## Next acceptance criteria

- Source-own a bounded, deterministic, tenant-scoped history read model, using cursor tie-breakers and explicit run/receipt relationships. Expose minimal summaries before a separately authorized download.
- Keep signed-run discovery, historical issuance and a new export distinct. Define same-actor recovery versus another authorized actor's new export; preserve immutable old bytes and IDs.
- Add current read/module authority and response scope, permission-aware EN/FR search/pagination/recovery in the existing reconciliation page. Avoid putting a new permission hook in a conditionally mounted child.
- Verify older-than-five/twelve records, timestamp ties, foreign objects/actors, denied access, stale evidence, pending requests after navigation, and actual file bytes in EN/FR browser journeys. Do not create fake signed certificates just to claim sign-off coverage.
- Keep source-drift controls. Review the existing policy that a new export marks close evidence stale; its removal is not implied by this gap.

The separate suspense final resolution/write-off lifecycle, notification freshness and all remaining register families stay in scope. The held v94 alert-trigger cutover remains unchanged. No global blocked state applies while ordinary implementation can progress.


## v101 update

Historical discovery and same-actor recovery are implemented with [source-bound verification](CERTIFICATE_HISTORY_VERIFICATION_V101.md). A connected late-event sign-off count mismatch was reproduced and corrected. Original discovery findings above are preserved; broader cross-day allocation, scale and context verification remain open.
