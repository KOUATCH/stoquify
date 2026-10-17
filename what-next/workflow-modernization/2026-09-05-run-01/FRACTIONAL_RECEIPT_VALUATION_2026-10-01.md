# Fractional receipt valuation and connected corrections

Status: bounded fractional-accounting correction implemented and verified on 2026-10-01. Primary workflow remains FA-CASH-COMMAND; its supporting dependency remains receipt/invoice accounting. This milestone addresses the demonstrated rounding defect and its direct period-query prerequisite. It does not close the complete parent workflow or certify a production release.

Source baseline: branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, shared working-tree changes preserved. Exact predecessor contents are retained in the three `fractional-*-before-*.json` evidence files. Historical platform totals remain 270 discovered workflows and 191 unmapped source entries; complete source reconciliation is pending.

## Defect and intended outcome

A receipt of 1.000 unit costing 0.01 can be returned as 0.300, 0.300 and 0.400. Independently rounding each quantity times unit cost records three zero-value returns and can leave an accounting accrual after all stock has gone. The existing live projection can clear the residual without a matching movement value; rebuilding can also mistake an explicit zero for an absent cost. These behaviors must agree across the source, stock, return, invoice and ledger records.

New versioned allocations consume the verified remaining quantity/value pool. A partial draw receives rounded `remaining value × requested quantity ÷ remaining quantity`; the final draw consumes the exact residual. Previously recorded amounts remain immutable. Reversing any earlier draw restores that draw's exact quantity and value, so subsequent allocations cannot become negative or silently reprice history.

Invoices and uninvoiced returns share the receipt-accrual pool. Invoiced returns consume the verified invoice-funded pool. Return inventory cost equals its claim plus accrual release. Credit notes allocate commercial net/tax from retained invoice amounts and reconcile the actual return claim with the rounding variance. A verified zero-value correction retains its quantity/source history without manufacturing a zero journal.

## Acceptance checklist

- [x] Versioned allocation conserves each source pool, rejects invalid precision/overdraw, preserves v1 proof bytes and supports arbitrary exact reversals.
- [x] Actual stock movement, live projection, projection rebuild and inventory/ledger tie-out agree, including explicit zero values and return reversals.
- [x] Interleaved invoices and uninvoiced/invoiced returns consume the correct pools once; no duplicated GRNI, claim, stock or payable effects.
- [x] Supplier credit and exact reversal handle rounding variance, tax allocation and zero-value records with retained source evidence.
- [x] Missing setup, original dates, stale evidence, tenant/authority boundaries, concurrency, exact retry and pending accounting recovery remain controlled within the focused service/action and owned-runtime scope.
- [x] English desktop and French mobile recovery distinguish posted journals from verified no-journal outcomes; keyboard and interrupted-response recovery remain usable.
- [x] Migration is validated through the repository process against the explicitly owned local database, with safe rollout/rollback guidance and unchanged unrelated data.
- [x] Current focused tests, lint, typecheck and connected database/browser evidence support the final report; failed attempts remain retained.

## Scope and review responsibilities

Inventory owns source-bound movement values, projection rebuild and return/reversal reconciliation classification. Purchasing owns return/invoice/credit allocation and retained evidence. The AP kernel verifies actual resolved credit effects. Existing receipt recovery controls and UI explain no-journal outcomes. Existing identity, organization context, shared components and EN/FR resources are reused.

Architecture/backend/data review covers durable source versions, transactions and immutable reversals. Finance/inventory/purchasing review covers pool conservation and ledger tie-out. IAM/privacy review preserves server authority and tenant scope. Frontend/accessibility/localization review covers the changed recovery state. Quality/SRE/operations review covers focused tests, local persisted effects, retry and migration recovery. Statutory mapping approval is unchanged and is not inferred from synthetic fixtures. Pricing/billing, payroll calculation, AI decisions and external-provider transport are not applicable to this correction because their behavior is unchanged.

Selected skills: `010-aqstoqflow-inventory-valuation-kernel` and `011-aqstoqflow-purchasing-ap-controls`. Continue their affected contract until verified; this work does not authorize advancing to a new numbered domain or certifying the full inventory/purchasing suite.

## Final verification

The final [review](evidence/fractional-receipt-review-a9973376-64f3-4e53-9f29-b6213ec5ec12.json), [source-impact record](evidence/fractional-source-impact-db08f486-8a17-4283-89e5-080b6a1e1f4c.json) and [runtime index](evidence/fractional-runtime-index-a9973376-64f3-4e53-9f29-b6213ec5ec12.json) bind the exact source and receipts. The one-page [current progress](CURRENT_PROGRESS.md) and workflow register retain the parent workflow as In progress. Initial owner/root checks remain historical and are not added to the final test total.

| Check | Final result and evidence |
|---|---|
| Focused regressions | 402 passed, 18 suites, zero failed/skipped. `evidence/fractional-jest-c2cc1db3-a8fc-44be-9f60-bd67bb88c54c.json` |
| Changed-file lint | Passed. `evidence/fractional-lint-1a4c33f2-10fb-45cf-bc73-c151bdf95cd9.json` |
| TypeScript | Passed using the existing script body `tsc --noEmit --pretty false`. `evidence/fractional-typecheck-18b7ac8c-e717-446e-901a-c28dc902949c.json` |
| Actual database | Twelve scenarios verified across two runs: eleven passed in `lanes/environment/fractional-receipt-valuation-de1bc432-f3cc-4e76-bc0d-f773b45679bc.json`; the single corrected-driver original-zero case passed in `fractional-receipt-valuation-abb869c1-a546-4588-9def-b5cfff50b9cb.json`. The first receipt retains its overall failed result. Product bindings match; the focused rerun explicitly records eleven skipped cases, which are not counted again. |
| Actual application | EN 1440px and FR 320px recovery passed, with no page errors, local overflow, duplicated stock or financial effects. `lanes/environment/fractional-receipt-browser-cfdd7a56-36e8-4e77-855d-10d92e678708.json` binds twelve screenshots. |
| Local schema | Rollback rehearsal, exact application/history and unchanged record checks passed; only the two reviewed constraints changed. |

Database scenarios cover cent exhaustion; non-tail reversal and reallocation; invoice/uninvoiced-return interleaving; pending receipt recovery with two zero returns; credit rounding variance; zero credit then final-cent credit; concurrent returns/retries; zero commercial total with a positive claim; closed/missing-period denial and completed replay; originally zero receipt return/reversal; nonzero net/tax residual and reversal; and identical UTC/Europe-Paris period lookup. A separate SELECT-only check also verified Africa/Lagos. Synthetic 100% tax was used solely to expose arithmetic residuals, not as a statutory rate assertion.

Browser verification covers missing-rule guidance, original dates, actual password verification, stale submission without effects, a committed response deliberately dropped in transport, reload, exact retry, retained return evidence and refreshed history. Root visually inspected the final EN/FR outcomes and French review screen. Native screen-reader, full browser-zoom, production latency and complete accessibility certification remain outside this bounded evidence. Test elapsed times are local observations, not an approved performance budget.

The credit schema previously required strictly positive header and line totals. The two-check migration `20260930231500_supplier_credit_zero_value_evidence` was rehearsed with rollback, then applied only to owned localhost database `stoquify_local_registration_20260906_01`. Receipt: `lanes/environment/fractional-zero-credit-schema-apply-3bc34ffc-6845-4904-af48-450c0e71369a.json`. It verifies unchanged records in eleven affected/adjacent tables, unchanged other constraints and triggers, and exact Prisma registration without applying any other pending migration. No production migration was run. Existing historical evidence is not rewritten or presented as proof of the changed implementation.

Two preliminary read-only inspection receipts failed: the first used the wrong inventory table name; the second matched `subtotal` while checking `total`. Both errors were in the inspection driver and caused no DDL/data changes. The corrected inspection passed (`fractional-zero-credit-schema-inspect-33502cfe-6358-42d3-8b8b-2f24eea90903.json`). A sandbox filesystem denial on the first receipt write was retried through the approved scoped execution path. These attempts are not counted as passing verification.

## Operational guidance and rollout

The first connected run (`fractional-receipt-valuation-6b6902f6-bb55-4ebc-a02e-e2b2a7516b48.json`) failed all eleven scenarios before receiving any stock. Sources remained stable and records outside its new fixtures were unchanged. The initial hypothesis of a missing current-month fixture was disproved: all twelve periods existed. A SELECT-only diagnosis showed the transactional raw period query comparing a `timestamptz` parameter against stored UTC timestamps using the session's `Africa/Lagos` timezone. For `2026-09-30T23:33:26.124Z`, it selected October while the ORM selected September. The invariant correctly rejected that mismatched period; it did not post into October. Explicit UTC comparison corrected this defect while preserving `FOR SHARE` locking. No period or fixture was altered to evade the check.

The first combined TypeScript run also found an unregistered inventory error-code literal and a missing nullable-batch guard. Both were corrected using existing error semantics and an explicit evidence check. The expanded final checks above include the period correction. The second database run's sole failure was a driver assertion expecting an unexposed reversal response field; the corrected test verifies the durable applied reversal proof and absence of journals instead. All failed receipts are retained. The initial focused-test wrapper also failed before starting Jest because predecessor records use two different path field names; that wrapper error was corrected before the recorded test runs.

The user continues to use the existing purchase-order receiving and receipt-accounting recovery screens. A zero allocated return displays an explicit no-journal explanation. That state means its verified allocation has no monetary effect; it does not mean that the physical return disappeared. Recovery preserves the original receipt/return dates, keeps the physical stock movements, and records an immutable resolution. After an interrupted response, reopen the same pending request and retry; do not create another receipt or return.

Open `/en/dashboard/purchase-orders/<orderId>` or `/fr/dashboard/purchase-orders/<orderId>`, choose the receiving history, then **Review / retry accounting** for the retained receipt. An authorized finance user reviews the original source/date and setup, verifies their password when requested, and explicitly confirms. After a lost acknowledgement, retry the retained request shown by the recovery screen. The private synthetic fixture credentials are not published in this report.

Supplier credits retain their exact quantity even when their commercial total is zero. A zero commercial total can still require a claim/variance journal. New credit and reversal commands retain open-period requirements, while exact completed requests remain retryable. Invoice commercial net/tax and inventory claim values stay separate. Unverified historical source records continue to require review; this change does not rewrite old allocations or invent their missing evidence.

For another target, first review its migration history, ownership, current constraints and backups through the established migration process. Deploy the schema support before enabling the new credit producer. The local one-use runner is deliberately restricted to this verification database and is not a production deployment mechanism. Three unrelated pending local migrations were left untouched. No billing, external provider, payment or X1 approval behavior changes.

Rollback is a forward operational decision once v2 records exist: retain those immutable records and use code that understands them. Do not reinstall a v1-only reader over v2 evidence. Restoring the two strictly-positive checks requires table locks, an explicit check that no zero-valued credit header or line exists, and aborting if any is found. Never delete or reprice valid history to make rollback possible. The exact prior constraint definitions are retained in the migration receipt. Application and schema rollout to a live customer remain outside this local verification.

## Remaining parent-workflow requirements

No new workflow closure is claimed. Unknown legacy allocations still need authentic source evidence; this work does not repair historic amounts silently. Mixed-source inventory conflicts remain safely review-blocked, and mixed/nonstock statutory treatment and the full downstream close/payroll lifecycle remain open. Full-register reconciliation was not rerun across all affected historical dependencies. The next action is to reconcile these remaining requirements against the existing FA-CASH-COMMAND closure checklist and resolve the next demonstrated source-treatment gap. Genuine statutory/signing approvals remain the responsibility of their authorized owners.
