# Purchase corrections, settled obligations and Close recovery

Evidence date: 2026-10-04. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`. Existing shared changes preserved (291 tracked changed entries at this checkpoint). Primary workflow remains FA-CASH-COMMAND; FA-CLOSE-PACK supports it. Neither workflow is complete.

## Completed acceptance boundary

All four original purchase/Close recovery criteria now pass against current source. Three were previously failed; the creator-first race was previously passing and has been revalidated. The current test connects previously implemented payment request, independent approval, execution recording and independently reviewed cash-recipient evidence before requesting Close certification. No application validator, trust threshold, approval requirement or production source was changed for this milestone.

| Criterion | Current result |
|---|---|
| Credit then return invalidate retained Close and recover genuine Cash certification | Passed. Initial 17,500 XAF obligation settled through actual services. Credit reversal reopens exactly 7,500 XAF, invalidates the retained certification and makes current Cash blocked. A second genuine service-owned payment/evidence sequence settles that liability. New assessment and separate certified export restore current proof. Return reversal conserves payable at zero, restores stock/ledger effects, invalidates the new certification and independently recovers again. |
| No-run publication: creator first | Passed. PostgreSQL observes waiter 18280 blocked by holder 1240. Actual RUNNING assessment is committed before reversal; reversal invalidates it and delayed collectors retain BLOCKED. Exact journal compensation, preserved originals and replay without effects pass. |
| No-run publication: reversal first | Passed. PostgreSQL observes waiter 7476 blocked by holder 24568. The actual subsequent assessment reads committed reversal effects and reaches required READY/T4. Exact compensation and replay checks pass. |
| Late invalidation rollback, independent retry and exact replay | Passed. Fault is injected after real reversal journal/stock effects and Close invalidation event/outbox exist inside the transaction. The entire observed transaction rolls back, retained export bytes/history remain unchanged and Cash stays certified. A new transaction retries successfully, exact replay has no effects, and actual reassessment/certification recovers current Cash. This harness does not separately prove distinct backend PIDs for the failed transaction and retry. |

Final inventory value and class-3 ledger value both equal 25,000.00 XAF. Every initial settlement uses five distinct request, approval, execution, evidence-proposal and evidence-review actors. Fresh password assurance uses the real service and persisted test sessions. Independent receipt review resolves the original supplier-payment exception through its existing source-owned contract; no provider, statement match or suspense lineage is fabricated. Execution and acknowledgement documents are distinct retained synthetic files with verified hashes.

## Changes and commands

Only two verification files were added:

- [purchase-close-payment-prerequisites.cjs](lanes/environment/purchase-close-payment-prerequisites.cjs): owned-fixture prerequisites, actual payment/evidence service sequence, exact payable and stock assertions, source/evidence fingerprints and replay checks.
- [purchase-close-settled-runtime.cjs](lanes/environment/purchase-close-settled-runtime.cjs): preserves all four original runtime cases, adding actual initial settlement and settlement of the debt reopened by credit reversal. Original driver, fixture, historical reports and failed receipts remain intact.

Both files passed `node --check`. Execution used the bundled Node runtime with `purchase-close-settled-runtime.cjs --run`, on the owned loopback `stoquify_local_registration_20260906_01` database only. The terminal ended naturally with exit 0. No application, schema, migration, action or UI changed, so full TypeScript, Jest and browser suites were not rerun for this harness-only milestone. Their earlier scoped evidence is retained without presenting it as newly executed.

The [passing receipt](lanes/environment/purchase-close-settled-runtime-66855dd3-582c-41d2-a0fb-4db41c82a227.json) has SHA-256 `436bdeeedc9a580b75dc777579adf2b3ca0688c459fa012407f5ede6f5ed0f7a`. It binds 210 source files before/after execution. All four cases passed in 29.314s, 9.571s, 10.099s and 10.654s respectively; these are isolated verifier timings, not route-performance budgets. Source bindings are stable, observed outside-fixture state is unchanged, and the separate outside payment/evidence fingerprint is unchanged. No finalization/disconnect error occurred.

The [first failed receipt](lanes/environment/purchase-close-settled-runtime-6b7713b8-503c-4396-b54c-df772361d5f9.json) is retained (terminal exit 1). Each case stopped because the new fixture passed its internal `renew` helper into a strict authority-input schema. An explicit four-field scope projection corrected the fixture. Strict product validation was left intact. That failure establishes no positive recovery result; outside/source fingerprints remained unchanged.

## Operating guidance and boundaries

For an actual operator, review the current supplier balance and original payment/credit evidence. A credit cancellation can reopen a real obligation even when the invoice was previously paid. Record the authorized payment execution and supply a separate recipient acknowledgement through the supported cash-evidence workflow; an independent authorized reviewer must decide it. Then rerun Close assessment and deliberately request a new certified export using the current eligible run. Keep the previous export as historical evidence with its stale status. Do not edit balances, exceptions, run readiness or old export bytes to force success. Return reversal is a stock correction and does not itself settle a supplier debt.

This run uses synthetic local actors, approved destination/master data, accounting rules and saved documents. Its application-level certified state is not a real cash transfer, bank confirmation, customer approval or statutory/accounting certification. `COUNTRY_TREATMENT_REVIEW` remains visible in every executed payment preview; earlier disclosed country-treatment limitations are not cleared by these tests. The destination requirement for CASH is retained as the current contract.

Architecture/backend/database/finance/recovery review preserves authoritative existing service boundaries, transaction rollback, exact journals, retained records, actual locks and idempotency. Security/controls verification here is limited to the genuine service checks and separated local actors; wider authority interleavings and transport remain separate criteria. Audit/integration review verifies durable invalidation events/outbox but does not claim their publication in this run. UX/localization/accessibility: no UI changes and no new browser claim. SRE: timings, natural process completion and fingerprints recorded; deployment/capacity unverified. New commercial packaging, analytics and AI behavior: not applicable because this milestone changes verification only. Statutory/country evidence remains external expert work.

## Remaining work and next boundary

Cash and Close remain In progress. Full producer coverage, cumulative/multi-period scope, bank-evidence lifecycle, broader current-authority/interruption cases, native assistive technology, true zoom and representative performance remain open. Authorized scheduler/service deployment is still required for operational background delivery. The previously auto-review-rejected all-period manual-posting helper remains unapplied pending its existing approval request.

Next primary-workflow boundary: verify signing versus new Close-assessment publication, already explicitly unverified in [SIGN_LEASE_REVIEW_2026-10-01.md](SIGN_LEASE_REVIEW_2026-10-01.md). First trace current signing dependencies and reproduce both orderings against owned fixtures; do not reopen completed PR-10 merely from a hypothetical issue. Require exact signature/source binding, honest current-versus-historical Close state, retained event/export integrity, failure rollback and deliberate retry. This remains part of Cash/Close, not a workflow switch or new denominator.

Selected skill: `011-aqstoqflow-purchasing-ap-controls`. Scoped ledger, evidence, actual publication ordering, replay, rollback and outside-fixture gates passed. Whole-workflow, bank, release, statutory, broader transport/accessibility gates remain open. The skill's next numbered recommendation is `012-aqstoqflow-payroll-presence-engine`; it is deferred while the current primary Cash/Close workflow still has actionable work.
