# P03 — Opening-position contract and ownership

13 October 2026. **Prepared and tested synthetic contract only.** No posting/import implementation, ledger write, migration, customer record or accounting approval was performed. P01 is the hard predecessor and its 81 selected fingerprints still match. P02 remains partial and is not a prerequisite for P03.

## Contract scope and source of truth

Version `opening-fixture-v1` describes one organization, two locations, two items, one outstanding receivable, one outstanding payable and one balanced opening ledger. The fixture is explicitly non-statutory; tax is out of scope. Account labels are symbolic `FIXTURE_*` controls, not approved SYSCOHADA account numbers. Currency is XAF, quantities use three fractional places and stored amounts use two. These are fixture/storage conventions, not a legal claim about currency display or tax rounding.

Retained [source JSON](../../../../services/onboarding/__tests__/fixtures/opening-position-source.json) and independently hand-calculated [control sheet](../../../../services/onboarding/__tests__/fixtures/opening-position-controls.json) are separate artifacts. A successful fixture admission requires **both** an empty issue list from the [test-only checker](../../../../services/onboarding/__tests__/fixtures/opening-position-contract.ts) **and** exact equality to the independent control sheet. Internally balanced replacement numbers can still violate approved source totals; a regression test demonstrates this. Never regenerate expected controls from changed input just to make a test pass.

This checker belongs under `__tests__/fixtures`; it is not a validated production importer or a new financial service. P07 may reuse the proposed data shape and expectations after review, but must implement any real adapter at its proper domain boundary.

## Current ownership map

| Concern | Current source / behavior | Cutover consequence |
|---|---|---|
| Master workbench and access | `app/[locale]/(dashboard)/dashboard/settings/data-onboarding/page.tsx:1`; `actions/onboarding/master-data-onboarding.actions.ts:50` enforces settings module and target permissions | Existing route/actions/readiness can stage safe masters. Tenant comes from server context. No fixture is imported through it in P03. |
| Master writes | `services/onboarding/master-data-import.service.ts:33–50` lists customer/supplier/item owners and explicitly excludes balances, stock quantities, journal posting and history | Imported masters do not mean reconciled opening positions. Customer/supplier current-balance fields must not be smuggled through master data. |
| Item-created opening stock | `services/item/item.service.ts:994` calls `postOpeningStock` when direct item creation includes quantity/location | Keep distinct from the masters-only safe item payload. Avoid accidentally using both direct item opening and a separate cutover stock path for the same position. |
| Opening inventory | `services/inventory/inventory-stock-event.service.ts:866` `postOpeningStock`, item/location source at 868, default key at 870, INITIAL_STOCK at 895 | Existing stock producer handles quantities/valuation/events. Default identity is per organization/item/location, not a reviewed multi-run cutover manifest. Do not invent a new key to replay changed source as additional stock. |
| Stock-to-ledger boundary | Same service:880–886 creates `OPENING_STOCK_LEDGER_REVIEW`; applied-event replay branch at 771; blocker creation at 786 | Opening stock produces an explicit failed/blocking posting batch, not an automatically posted class-3 journal. A `postingBatchId` alone is not proof of posted GL value. |
| Inventory/class-3 tie-out | `services/inventory/inventory-reconciliation.service.ts:603–646` compares opening + movement = closing for both inventory and GL, then cross-ledger drift | Preserve effective cutoff, quantity/value basis and reconciliation evidence. Do not substitute accounting setup readiness for this tie-out. |
| Existing AR legacy repair | `services/accounting/customer-receivable-backfill.service.ts:105`, SALES_ORDER references at 123, document/relink at 141–181 | Repairs existing Stoquify sale/ledger lineage. **Not a general external opening-AR importer.** |
| AR document source | `prisma/schema.prisma:6400` requires `sourceSalesOrderId`; `customer-receivable-document.service.ts:156` loads scoped sale; 254 derives outstanding from its ledger | External unpaid balances need a reviewed source/document path. Do not fabricate sales to meet this schema. |
| Customer ledger primitive | `services/accounting/customer-ledger.service.ts:27` permits OPENING_BALANCE; 82–151 checks scope/polarity and updates balance | A primitive is not an approved import envelope, external receivable document or GL mapping. |
| Current AP path | `services/purchasing/invoice-preparation.service.ts:18`; `ap-control.service.ts:2723–2759` requires received purchasing/matching evidence | No general external opening-AP importer identified in inspected paths. Do not invent purchase orders or goods receipts for legacy obligations. |
| AP approval and posting | `invoice-approval.service.ts:32` independent approval, 43–83 country/period/rules; `ap-control.service.ts:640` GL owner, 2770 approval, 2933 supplier ledger | Reuse these controls where applicable; external opening obligations require their own explicit reviewed source semantics. |
| General opening journal | `services/accounting/journals.service.ts:71` AN/OPENING permits manual entries; 304 creates draft; 351–352 checks balance; 364–365 uses MANUAL/MANUAL_JOURNAL | Generic opening journal exists. Coordinated external-source linkage, reconciliation and settlement of stock blockers remain separate work. |
| Journal posting | `services/accounting/posting.service.ts:258`, entitlement 268, period/source 303–307, balances 319–321, sensitive-action maker subject 329–341 | No direct ledger-table writes. Manual posting is not automatic resolution of an OPENING_BALANCE stock blocker. |
| Accounting setup | `accounting-settings.service.ts:164` requires OPENING journal; purposes at 167–181 omit OPENING_BALANCE; readiness 329; mark-ready 424 | Setup READY does not certify an opening ledger, AR/AP migration, or class-3 reconciliation. |

Supplier subledger debit means “we owe more” (`prisma/schema.prisma:7105`), while GL payable increases are credits. The fixture uses **positive outstanding obligations** and maps AP to a GL credit. Never equate the two raw debit/credit columns mechanically.

Existing graph evidence is dated 9 August 2026 and was not regenerated. Current-source validation supersedes graph line numbers: `inventory_inventory_stock_event_service_postopeningstock` community 9, historical 735 → current 866; `accounting_customer_receivable_backfill_service_backfillcustomerreceivabledocuments` community 146, 105 → 105; `accounting_accounting_settings_service_markaccountingsetupready` community 13, 391 → 424; `purchasing_ap_control_service_createapledgerposting` community 3, 592 → 640; `purchasing_ap_control_service_approvesupplierinvoice` community 3, 1965 → 2770. Graph relationships are discovery evidence, not completeness/coverage proof.

## Proposed single-owner posting envelope

The synthetic plan assigns stock quantity/valuation to the stock kernel and labels its GL effect `REVIEW_ONLY`. The proposed `OPENING_LEDGER` owner covers inventory, AR and AP source IDs exactly once and supplies cash/equity controls. This is a **fixture ownership rule**, not a newly implemented service or approved mapping. An alternative future owner arrangement needs a new reviewed contract version with identical conservation and no duplicate coverage.

Every accepted source row carries organization ID, source ID and synthetic review ID. Stock also carries item, location, unit, quantity, cost and retained source value. AR/AP carries original external document ID, counterparty, source/due dates, original amount, settled-before-cutover amount, outstanding and currency. The last two are not historical payment imports: original minus settled merely substantiates the opening residual. Ledger lines carry symbolic control, side, amount, proposed posting owner and exact covered source IDs.

Controls reject duplicate source IDs; duplicate item/location positions or source documents under different IDs; foreign tenant/location/item/counterparty; incompatible units/currency; excessive precision; quantity/value differences; missing or self-review; uncovered/wrongly covered sources; stock auto-GL effects; duplicate GL coverage; wrong AP sign; and unbalanced/control-mismatched ledgers. Integer scaling avoids binary float arithmetic. Positive valuation rounds per row half-up to two places, explicitly as a proposal, with a half-cent example. Independent source totals remain required even after all internal checks pass.

## Rehearsal, approval and retained evidence

1. Select an explicitly disposable environment and synthetic organization/site bindings; retain the source/control hashes, version and reviewer scope. P03 creates files only, not database fixtures.
2. Resolve master identifiers without silently merging records. Stage and preview safe masters through existing owners when later authorized. Keep rejected rows, reason codes and corrected revisions; source count = accepted + rejected.
3. Fix the effective boundary: fixture local **1 October 2026 00:00 Africa/Douala**, equivalent to **30 September 2026 23:00Z**. Include opening residuals strictly before this boundary; daily trading starts at it. Agree freeze/late-arrival treatment before real cutover. Do not use upload time as accounting effective date.
4. Reconcile quantities separately by item/unit/location, row values, stock valuation, each counterparty residual, GL control totals and full trial balance. Preserve original source and independent totals before any mutation. Inspect aggregate and source-level coverage.
5. Real admission requires a qualified accounting reviewer for regime, chart/mappings, rates where applicable, rounding, retained obligations and period treatment; an independent authorized approver; and source/revision-bound decisions. P01 D05 remains unresolved. Synthetic `FIXTURE_APPROVED` means arithmetic test input only and is never a person's approval.
6. Retain source filename/version/hash, received/accepted/rejected counts, tenant and site mapping, cutover instant, original source IDs, review decision/actor/time/digest, posting IDs/statuses, differences and resolution references. Actual retention duration/access policy remains D10, unresolved; keep records available and appropriately scoped. P03 retained source files are synthetic JSON and the independent control sheet, not customer spreadsheets.
7. An uncertain response is not permission to post again. Recover by original operation/source keys and durable evidence. Same approved payload replays once; changed source under the same key must reject. A source correction after posting requires controlled reversal/adjustment and new review, not delete/reset or silent overwrite. Preserve original source and tie the correction to it.

## V3 cases to implement and execute later

| Case | Required real evidence, not performed in P03 |
|---|---|
| Opening-stock replay/concurrency | Same approved item/location/source retry and concurrent identical calls create one durable stock effect; changed quantity/cost conflicts without mutation. Validate zero/nonzero quantities, precision and period handling. |
| Inventory/class-3 ownership | Stock produces review blocker without GL debit; the selected reviewed ledger path posts inventory once, links the stock evidence and resolves the proper blocker explicitly. Duplicate path stays denied even with a balanced offset. |
| AR/AP opening transactions | Once supported, retained external source/document identity, counterparty scope, original/settled/residual tie-out, subledger-to-GL signs, independent approval, closed-period denial and idempotency all survive actual transactions. No fake sales/receipts. |
| Atomic failure/recovery | Inject failure between source, subledger, balance projection, ledger and event stages. Prove rollback or durable recoverable blocked state without double posting; rehearse uncertain-response recovery. |
| Cutoff and correction | Exact local/UTC boundaries, late source rows, later trading, revised reviewed source and controlled correction preserve opening + movement = closing and source links. |
| Isolation/access | Two tenant fixtures, two locations, fresh/revoked/denied actors, related-resource scope and maker/checker tests. Never use ambient database fallback. |
| Retained evidence | Verify source hashes, rejected/repaired rows, approvals, links and reports after replay and correction. Clean up only explicitly owned disposable data using the reviewed runner. |

No dedicated executable V3 runner is claimed. These cases require the eventual supported AR/AP/source-link design and an inspected disposable target. Mocked tests do not establish transaction or production correctness.

## P07 and P13 handoff

When P07 is explicitly requested **and P04 is satisfied**, it can build a tenant-scoped read model/preview with separate states: masters staged/committed, stock quantities present, ledger review pending, external AR unsupported, external AP unsupported, journal draft/posted, differences unresolved, and accepted only with retained review/tie-out evidence. It can link existing workbench/domain routes. It must not turn master-import completion, accounting READY, stock postingBatchId or a fixture pass into “opening complete.” It may consume this fixture for layout/contract testing without financial writes.

P13 must resolve external AR/AP source/document ownership; approved symbolic-to-real account mapping; the single authoritative opening ledger owner; explicit stock-blocker linkage/resolution; source digest/revision and maker/checker controls; replay/change/concurrency behavior; corrective journals; and actual transaction plus browser tie-outs. Those capabilities were not implemented here. P11 can use the gaps to scope qualified country/accounting review. P12 can treat P03 as prepared fixture evidence only; P02 remains partial. No downstream gate is passed by this result.
