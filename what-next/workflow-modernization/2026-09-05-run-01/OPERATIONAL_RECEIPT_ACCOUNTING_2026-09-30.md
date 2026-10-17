# Operational receipt accounting and recovery

FA-CASH-COMMAND remains **In progress**. This delivers its receipt/invoice supporting contract; it does not close the parent workflow. Evidence is bound to branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`, plus the retained working-tree source hashes. Unrelated changes are preserved. Purchasing/AP skill 011 and accounting skill 005 remain the applicable execution guidance.

## Delivered behavior

Accepted tracked stock now produces a versioned whole-receipt source after its lines exist. The source freezes receipt identity, inspected or independently accepted date, tenant currency, item tracking, quantities and costs. Stock events and the single receipt journal use this same source. A held arrival does not accrue inventory until acceptance. The accounting kernel requires actual inventory debit and goods-received-not-invoiced (GRNI) credit; a balanced but incorrect payable or partial mapping cannot masquerade as receipt recognition.

Zero-value stock and non-stock receipts explicitly require no receipt journal. Non-stock invoice treatment continues through the existing invoice source mapping; this does not approve a statutory expense policy. Marked receipts awaiting accounting cannot fall back to legacy invoice-based inventory recognition. Unmarked legacy receipts retain their existing invoice behavior and cannot be retro-accrued by the new recovery action.

Partial invoices consume verified receipt accrual once. Returns allocate their original cost between invoiced supplier claims and uninvoiced GRNI release, with verified source, currency, dates, stock effects, journals and exact reversals. Returned quantities reduce invoice capacity without double-subtracting invoiced returns. Return financial recovery appends a resolution event; it preserves the original immutable return, including an originally null journal reference. A later reversal resolves the verified effective journal from that evidence.

Finance-authorized users can review and retry accounting from receipt history. The preview binds the receipt, original dates, current posting configuration and affected returns. Confirmation requires current purchasing/finance permission, tenant scope and password verification. Stale previews reject. Exact retries retain the original request outcome. Existing stock is never received again. When active pending returns are included, original receipt and return accounting recover atomically; a return posting failure rolls the whole recovery back.

Supplier credit now requires an actual verified return claim before it changes accounting or the supplier balance. Pending canonical returns must complete explicit accounting recovery first. Unsupported legacy return proof remains an accounting review condition.

Receiving previews now include inventory tracking, and confirmation follows supplier-before-order lock order. Receipt history displays retained currency instead of assuming today's organization denomination. Long invoice references wrap inside review dialogs.

## Operating instructions

1. Open `/{locale}/dashboard/purchase-orders/{id}` and the receipt-history tab (`en` or `fr`). Receiving remains subject to the existing inspection and independent acceptance controls.
2. If stock is recorded but accounting needs review, a user with `purchases.orders.read` and `purchasing.ap.invoice.post` chooses **Review / retry accounting**. A receiving-only role cannot perform this financial action.
3. Review the retained source, original accounting date, period, posting rule and journal, including listed return records. Ask the accounting owner to correct an unavailable period, rule, account or journal using the existing authorized settings process. Recovery does not move transactions into a different date or period.
4. Verify the password and confirm. A changed preview requires a new review. An uncertain response retains a request reference: recover that same request rather than creating another one. The result shows retained journal references; refreshed history shows current receipt accounting.
5. Continue invoice preparation at `/{locale}/dashboard/purchases/payables/prepare`, correction at `/correct`, and independent approval at `/approve`. Preparing or correcting an invoice does not approve it or release payment.

No new approval-system information is requested from an ordinary receiver. The accounting owner supplies the existing authorized rule/account/journal setup and open-period decision. Authentic statutory/country evidence remains a separate responsibility. Synthetic local fixture setup is not an approval template or live activation authorization.

## Verification and limitations

All **14 actual PostgreSQL scenarios passed**, with stable source hashes and unchanged checked records outside newly owned fixtures: [database receipt](lanes/environment/operational-receipt-recognition-25a524d1-7e40-4073-a9ec-2ffae0c92fe1.json). They cover USD receipt plus partial invoices; uninvoiced and mixed returns; exact reversal; missing-rule recovery; stale/authority/tenant/password denial; concurrent exact recovery; atomic pending receipt/return recovery; rollback on an incorrect return rule; closed original period; held acceptance; zero-value and non-stock receipts; and supplier credit after actual return-claim recovery. No payment was created. These are synthetic local fixtures, not customer approvals.

The [combined verification](evidence/operational-receipt-checks-6f145751-0299-4a18-a75e-20fe962f24a9.json) passed **407 tests across 24 suites**, lint across 55 explicit files with zero errors/warnings, and the existing full TypeScript check. Source hashes remained stable. Earlier focused receipts are retained individually; they do not establish final integration by themselves.

All **six actual application journeys passed**: [browser receipt](lanes/environment/operational-receipt-browser-b1f62d52-1c7f-4671-b06e-2104f872d7e5.json), with 28 screenshots, stable sources and unchanged checked records outside fixtures. English desktop (1440px) and French mobile (320px) each covered invoice preparation, invoice correction and receipt/return accounting recovery. Preparation/correction denied eight when seven remained, retained the draft after reload and saved seven without approval or new financial effects. Recovery showed missing-rule guidance, verified a password, rejected stale configuration, committed both journals, deliberately lost the response, recovered the retained request after reload and displayed current posted history. No duplicate journal or stock effect occurred.

Keyboard focus containment/return, actual dialog and document overflow, reduced-motion context and absence of page errors were checked. Visual inspection covered English/French invoice review and recovery results; long references wrap within their containers. Native screen-reader certification, all contrast states, zoom and the wider application remain outside these focused checks.

Local invoice save interactions were 1,006–1,535 ms. Route-plus-draft interactions were 5,162–60,966 ms, including the cold development route and scripted input. Recovery commit/lost-response/reload/retry took 10,176 ms (EN) and 10,889 ms (FR); those timings include several operations and are not isolated server latency. No approved performance budget or production speedup is inferred.

The first database attempt reported 11 passing and two failing scenarios, then failed to save its final JSON; see `evidence/operational-receipt-first-attempt-2026-09-30.md`. Its pending-return failure exposed the different metadata shape used by failed posting batches. The reader now validates both supported shapes and explicitly rejects missing proof.

The receiving preview and lock-order regressions were reproduced before correction. Existing failed browser/test attempts remain historical. No migration, deployment, live customer activation, external message or real payment is performed.

The first new browser attempt is retained at `lanes/environment/operational-receipt-browser-36ba706e-4d04-4439-9747-1a99aad1aacc.json`. Four setup paths generated identifiers longer than the 191-character contract, before the wrapper could register those partial fixtures; its outside-fixture comparison therefore failed. The other two paths encountered a development-server restart. No journey passed. The driver now uses short fixture names while preserving unique parent run identities. The replacement listener and its parent were verified as the existing workspace Next.js command on localhost:3110; no second server was started.

Fractional return costs remain a concrete engineering limitation: returning 0.300 + 0.300 + 0.400 of one unit costing 0.01 independently rounds each return to zero. Such returns remain accounting-review blocked; they cannot correctly discharge the original 0.01 accrual until stock valuation and source allocation share a cumulative residual contract. Do not force a journal or edit immutable quantities to remove that condition.

Complete legacy reconciliation, wider purchasing/close/payroll lifecycles, native assistive-technology checks and representative performance remain open. No security, statutory, accessibility or release certification is claimed.

## Rollout and recovery

No schema migration or backfill is required. Apply normal reviewed release controls before exposing this code to a live cohort. Existing records are not rewritten. Start with authorized purchasing/accounting operators and inspect receipt source, journal/source links, return resolution events and their original periods. If inconsistent evidence appears, stop affected accounting submissions and investigate the retained records. Do not bypass source validation, replay receiving to retry accounting, or remove financial controls as a rollback technique.

| Review responsibility | Applied boundary |
|---|---|
| Architecture/backend/data | One source contract, existing domain services, supplier/order locks, atomic recovery and immutable resolution evidence |
| Finance/purchasing/audit | Inventory/GRNI/claim effects, invoice allocation, original dates, tenant currency, exact retries and reversals |
| IAM/privacy/security | Server identity, current permissions/module eligibility, source isolation and password verification |
| Frontend/UX/localization | Existing dashboard tokens, dialogs and EN/FR controls; text/icon status, focus and mobile review |
| Quality/SRE/support | Source-bound focused tests, owned database and application evidence; honest pending/failed outcomes and recovery instructions |
| Product/SaaS | Existing receiving and finance responsibilities retained; no new subscription or packaging assumption |
| Statutory/country | Existing requirements retained; synthetic accounting mappings do not certify OHADA/SYSCOHADA applicability |
| POS/offline | Shared inventory event kernel is affected and included in focused regression scope; complete POS/offline lifecycle is not certified |
| Payroll/AI/providers | Not applicable to this correction: no payroll calculations, agent decisions or external transport changes |
