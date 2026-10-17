# Purchase correction publication ordering — implementation review

Status: verified candidate applied to the local checkout after the narrowed approval review succeeded. Full candidate typecheck and all 162 tests in five affected suites passed; the application receipt binds exactly the verified bytes to ten source/test files. Central post-application checks and the four-case guarded purchase runtime subsequently passed. No migration or deployment was performed; database verification used only the guarded synthetic fixtures described below.

## Authorization and boundary

The active implementation assignment covers tenant isolation, safe activation and retained financial/domain controls. The coordinated Cash/Close follow-on specifically assigns the two purchase reversal owners, their shared ledger helper, the internal stock handoff and focused tests. The first combined patch was rejected by automatic approval review for financial-control scope and possible API mismatches. No part of that patch was applied. A complete isolated candidate, full compiler overlay, five mocked regression suites and a hash-guarded application resolved those concerns before the single narrowed retry. That retry was approved and applied. This record does not authorize live reversals or certify release readiness.

Exact predecessor bytes and SHA-256 hashes are retained under `evidence/source-reversal-before-purchase-39d08eb3-36be-4d4e-aca3-1c08191482b2/manifest.json`; the Close source registry is retained in the adjacent `registry-manifest.json`.

## Verified current APIs

`services/accounting/journal-reversal-order.service.ts` now accepts `originalPeriodId: string | null`, required `reversalPeriodId`, original/reversal dates, `includeLaterPeriods`, optional `additionalEvidenceDates` and optional `additionalPeriodIds`. Explicit IDs are tenant-validated and the complete set is locked in sorted order. Read Committed is supported directly; Serializable requires a separate fresh reader and whole-transaction retries. The purchase proposal uses explicit Read Committed only.

`services/inventory/inventory-close-invalidation.service.ts` now accepts optional `affectedPeriodIds`. Supplied scopes are deduplicated and sorted, reject empty sets or omission of the explicit posting period, and replace date selection. Existing callers retain their existing selection. These two shared files are owned separately and will not be edited by the purchase implementation.

The only production ledger-helper callers are `reversePurchaseReturn` and `reverseSupplierCreditNote` in `services/purchasing/purchase-return-credit.service.ts`. The first return write is `allocatePurchaseDocumentNumber`; recognition/effective-accounting reads before it do not write. The action adapter now supplies the trusted post-wait callback. It rechecks fresh authentication, the same tenant/actor and the required permission before any financial effects.

## Applied local contract

1. Preserve exact immutable replay before period preparation. New work uses an explicit Read Committed owner transaction; inherited unsupported isolation refuses before effects.
2. Acquire the shared tenant period-catalog lock before source or posting-period locks.
3. Under existing source locks, load the effective original journal and retained batch, validating source ownership. Preserve hidden-journal and mismatched-batch refusal. Include the batch's explicit period even when it has no journal.
4. Select and retain the OPEN reversal period. Resolve and lock the full assessment-period union before document-number allocation or any other write. Return scope is cumulative regardless of journal or monetary value. Credit scope includes class-3 dependencies only when the retained journal establishes them, plus both source dates and retained batch periods.
5. Return a server-only prepared object bound to the exact transaction, tenant, source type/ID, journal/batch references, reversal date/period and affected period IDs. Require the writer to receive matching preparation; do not prepare late inside the write helper.
6. Recheck an optional trusted `assertCurrentAuthority` callback after preparation and before the first write. The root action adapter owns obtaining this callback from server identity and fresh authentication; browser schemas do not accept it. Direct internal callers without that callback retain their prior authority contract and must not be described as newly hardened.
7. Perform the existing mirrored ledger, inventory, supplier-balance and immutable source-record effects. Preserve null journal outcomes, allocation evidence, invoice cash paid and replay semantics.
8. After all source/stock effects, invalidate with the same complete period set. Preserve posted-journal-before-inventory event precedence. This removes the current Close-run-lock-before-inventory-row inversion.
9. For no-journal credits, add the truthful `SUPPLIER_CREDIT_NOTE_REVERSED` source registry entry: model `SupplierCreditNote`, table `supplier_credit_notes`, event `purchase.supplier_credit.reversed`, domain `ledger`. Do not fabricate a journal ID or journal-reversal event.

The stock handoff is a third internal control parameter, separate from source command data and event hashes. It binds the existing transaction and tenant to the prepared period IDs and defers its Close invalidation to the owner. It cannot be used with a root client that opens a different transaction.

## Preserved and remaining boundaries

Journal line values, FX fallback behavior, commercial amounts, supplier credit allocation, inventory allocation, role policy and source immutability retain their existing contracts. This change introduces no schema migration and does not alter live tenant state, deployed code or the module/X1 approval gates.

The existing supplier-before-invoice reversal order conflicts with payment request invoice-before-supplier order. Changing only reversal order would conflict with forward credit posting instead. A general supplier-lock-order migration is therefore separate unless a complete scoped solution is established; publication-order verification must not claim general deadlock freedom.

Broad whole-tenant operating snapshot hash dependencies and other unmigrated source writers remain outside this correction.

## Candidate verification and remaining coverage

The isolated, in-memory dependency checks passed 17/17 in `evidence/source-reversal-before-purchase-39d08eb3-36be-4d4e-aca3-1c08191482b2/candidate-unit-88cf5ef8-bfb5-4799-8dbd-62b2f6132438.json`. These are mocked contract checks, not runtime financial or publication proof.

The full compiler-host overlay includes the four product candidates, four focused tests and the action adapter/test candidates, plus the normal application compiler roots. It passed with zero diagnostics and unchanged production/shared hashes in `candidate-typecheck-12561297-8793-41f2-8fbf-7aa6fb3a3028.json`. The earlier `candidate-typecheck-305b27e5-6b94-400e-b116-20f46f00608a.json` retained six test-fixture type errors; explicit export mode and direction type annotations corrected them.

The first five-suite candidate Jest attempt was stopped during startup without a suite result after approximately five minutes; its failed receipt is `candidate-jest-451ca249-284d-4be9-8371-46dbc6633796.json`. Product and candidate hashes remained unchanged. A rerun restricts discovery to services/actions/lib while retaining the same five suites and candidate overlay.

That rerun passed all 162 tests in five suites, with no pending or failed test, in `candidate-jest-c953a478-4001-4a82-8e8e-b8fe57b088aa.json`. Its raw Jest receipt is hash-bound. Production/shared files stayed unchanged during verification and candidate hashes stayed stable. `candidate-application-4682788d-085d-4b59-95eb-4d6da3d94bdb.json` records the subsequent approved application of exactly ten source/test files; all predecessor, candidate and shared-service hashes were checked before writing, and no recovery was needed.

The focused verification scope is:

- Focused helper tests: exact prepared binding, tenant/source mismatch, expired/closed posting period, retained failed-batch period, missing/extra scope refusal, hidden journal, exact mirror, no-value and unposted outcomes, truthful provenance.
- Owner tests: catalog before source locks, complete scope and authority callback before document sequence or effects, journal/inventory invalidation after all source effects, denied callback with no writes, exact replay after period close, explicit transaction isolation.
- Stock tests: same-transaction handoff, exact period scope and deferred invalidation without changing business-event payload hashes.
- Passed guarded local runtime: `lanes/environment/purchase-reversal-order-runtime.cjs` covers actual posted credit/return compensation, zero-value fractional allocation, cancellation of an unposted return batch, rollback after an actual source write, independent retry and exact replay. It observes complete sorted period scope before the first write, checks inventory quantity/value and supplier payable conservation, retains original source/child records, and binds source/outside-fixture hashes. It loads applied product code only; rejected candidate code is not injected into a live transaction.
- Still unverified for this purchase-specific boundary: creator-first and producer-first assessment races with exact blocker-PID evidence, Cash/Close recovery, later-period publication races and retained certified-export history/bytes. The four-case driver does not supply these proofs. Generic helper or another producer's passing tests must not be described as purchase-specific runtime coverage.

The reused fixture starts from a directly inserted APPROVED purchase order with the same maker/approver as a synthetic prerequisite. Actual receiving and independently authorized invoice approval use current services; this fixture does not prove the purchase-order approval workflow. Direct service execution also does not replace action/browser authority verification.

The runtime source is frozen at SHA-256 `6a76420b57bd5f3932deacd4b732ecfa1308efc2f12cd0058773e4130a9a753a`. The [actual purchase runtime receipt](lanes/environment/purchase-reversal-order-runtime-b4e944ec-722b-4f31-a9bd-8f17a0d6adb5.json) passed all four checks, with `sourceStable: true`, `outsideUnchanged: true` and successful final disconnect. Current combined verification passed 631 tests across 22 suites, direct full TypeScript and 22-file lint; the [coordinated source-reversal report](SOURCE_REVERSAL_ORDER_2026-10-01.md) binds those results, including [TypeScript receipt](evidence/source-reversal-typecheck-cb6a8cc2-bc0d-45e5-8eb9-8c32e67425d2.json) and [lint receipt](evidence/source-reversal-lint-12439eb3-97b1-4a77-bc1b-98de1ada50f2.json). These results do not supply the purchase-specific publication-race, Cash/Close recovery or retained-export proofs listed above.

## User and operations recovery

Employees continue to use the existing purchase return and supplier credit correction entry points. This backend correction adds no new route or form. An expired action session requires signing in again, reopening the source and retrying through its existing control. A stale/mismatched source or closed reversal period must be reviewed through the current accounting workflow; these conditions remain explicit refusals. An exact successful command replay returns its retained result without repeating financial or inventory effects.

For local rollout, retain the ten-file application receipt with its candidate TypeScript/Jest receipts, current-source checks and guarded database proof. No schema rollout is needed. Roll out only to a separately authorized environment after its existing controls are satisfied. Source recovery can restore the recorded predecessor files only after checking for concurrent edits; never overwrite unrelated changes. Any financial records subsequently created by real application use require the domain's existing auditable correction process rather than deletion or database restoration from this code receipt.

## Review responsibilities and limits

Architecture/backend/database review focuses on one transaction-bound preparation contract, explicit Read Committed semantics and sorted complete period locks before effects. Security review covers server-derived action identity and post-wait freshness/permission rechecks; it does not establish persisted authority locks for the whole transaction. Finance and records review preserves exact mirrored amounts, allocations, retained source evidence and truthful no-journal provenance. Quality review distinguishes the passing static/mocked checks and four actual runtime checks from the remaining concurrency/recovery proofs. Operations review records lock contention and inherited supplier/invoice ordering as remaining boundaries.

Frontend, localization, accessibility, commercial packaging and statutory country-pack behavior are not applicable to the code delta because it changes no user-facing component, translation, price or statutory calculation. Their broader workflow assurance remains separate. This milestone does not close the Cash workflow, supporting Close workflow, X1, or any professional/release approval.

The reusable `receipt-treatment-runtime.cjs`, `verify-fractional-receipt-valuation.cjs` and exported operational-recognition helpers have guarded entry points. Do not import the older `verify-correction-reversal.cjs`, which executes on import. Real verification must not manufacture READY state.
