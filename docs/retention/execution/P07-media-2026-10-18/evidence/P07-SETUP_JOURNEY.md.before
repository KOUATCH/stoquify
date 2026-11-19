# P07 — Guided setup journey

17 October 2026. Scope: master import followed by opening-position guidance. This is not a cutover posting engine. See [RESULT](RESULT.md) for executed verification and limitations.

## Prerequisite decision

P03's prepared synthetic fixture and P04's local access foundation satisfy this slice's preparation dependencies. Their live runtime, accountant and operational gates remain open. P03 explicitly permits P07 to build a tenant-scoped read view without financial writes. P04 explicitly hands off its access map for local implementation. Neither predecessor authorizes a live pilot. Their 29 selected retained artifacts/fixture files matched the current baseline; P03's arithmetic suite was rerun. Current authority checks were exercised separately.

The P03 source has two items (EA/KG), two locations, four accepted stock rows, one customer residual, one supplier residual and a separately controlled ledger. P07's browser fixture adapts only the two item identities and two counterparty identities to CSV. It preserves `item-each`, `item-weight`, `customer-a`, `supplier-a` as business keys. Stock quantities, prices/valuation, residual balances and journal values are deliberately not copied into masters. The source fixture remains unchanged. Original upload hashes, row hashes and resulting record IDs stay in the existing importer evidence.

## Operator path

1. Open `/{locale}/dashboard/settings/data-onboarding`. The route derives the actor and organization from server RBAC, filters readable targets, and enforces the settings module. The action path independently repeats those controls. A URL or navigation link is not authority.
2. Select a permitted target and download its current tenant template. Enter the complete template headers. Upload and validate; inspect retained rejection reasons. A staged file is **proposed**, not imported.
3. Review the source hash, mapping version, risk and row controls. High-risk batches require a different authorized reviewer. Approval means **reviewed**, not imported or posted.
4. Commit through the existing customer, supplier or item owner. Reopen/refresh the workbench to inspect durable results. Successful controls mean **imported masters only**. The existing milestone label is explicitly scoped to master-data evidence.
   Current verification limit: customer and supplier import passed; the item path is blocked by its tenant-owned-image contract. See [ITEM_IMPORT_BLOCKER](ITEM_IMPORT_BLOCKER.md). Independent approval is also required for item prices normalized to zero by the existing schema.
5. Read the opening guidance immediately after the import work area. It preserves latest batch/source references and any older retained milestone reference separately. Details cover only the 12 most recent permitted batches; an older evidence reference is not described as a missing import.
6. Follow domain review links where authorized. Stock movements, existing receivables, payables and journals remain owned by their respective workflows. The links are for review, not promises of external opening import support.
7. Agree an opening date, source population and accounting mapping; retain and independently reconcile source totals, stock, AR/AP and ledger evidence. Obtain the necessary independent review before a real cutover. This step remains outside P07 and unresolved D05 must be honored.

## Recovery and exceptions

- Invalid/duplicate rows remain in the original blocked batch. Correct a file into a reviewed revision; do not silently merge or overwrite history.
- Same-file retry uses the existing content-hash/mapping replay identity. No new retry key or financial write path was added.
- A retryable approved batch can have a blocked milestone after a failed commit. The new projection retains that blocked state.
- A committing/partial import is not shown as complete. Refresh evidence and inspect the original batch; do not bypass uncertain results with a newly named upload.
- The refresh action clears the local selected-batch cache and approval checkbox, then requests fresh server data. This lets another reviewer's durable update replace an older client selection.
- Loading and failed reads use the existing route boundaries. Failure removes the readiness view and offers retry; it is never converted to empty/zero progress. The retry now refreshes the server route before resetting the boundary, following a reproduced stale-error failure.
- Waiver alone is not imported proof. Historical import references and the latest batch stage remain inspectable separately. Waiver cannot complete an opening-position requirement.

## UI contract and source trace

No dedicated onboarding page contract exists in `design-system/stoquify/pages/`. The existing workbench, route loading/error components, design MASTER, UI constitution, component registry and implemented dashboard tokens govern this extension. Inventory/receivables contracts informed the linked-domain boundary. No theme replacement or package change was introduced. Project UI/UX data rows 28 (focus), 41 (keyboard), 80 (error recovery) informed disclosure, navigation and retry controls; these are framework-independent guidelines, not accessibility certification.

Current path: settings route → `getMasterDataOnboardingDashboard` → permission-filtered milestone/recent-batch queries → `buildOpeningReadiness` → `OpeningReadinessPanel`. Mutations still go through existing onboarding actions and `master-data-import.service.ts`.

The 9 August graph predates governed master onboarding (August 15–16). No onboarding node was invented. Relevant historical nodes validated against source: `inventory_inventory_stock_event_service_postopeningstock` (community 9), `accounting_customer_receivable_backfill_service_backfillcustomerreceivabledocuments` (146), `accounting_accounting_settings_service_markaccountingsetupready` (13), `purchasing_ap_control_service_createapledgerposting` and `...approvesupplierinvoice` (3). [Graph/prerequisite evidence](evidence/SOURCE_REVIEW.json). Graphs were not regenerated.

## Data and recovery boundary

No schema, migration, new persisted behavior, opening posting, entitlement policy or existing mutation control changed. The new read model uses already filtered import evidence and static capability limitations; it does not query or infer financial completion. Roll back only the P07 read projection, panel, workbench additions and scoped tests. Preserve customer source batches and all pre-existing/concurrent changes. The disposable verification cluster is separate from any application database.
