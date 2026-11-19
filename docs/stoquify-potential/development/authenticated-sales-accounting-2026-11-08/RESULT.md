# Authenticated sales-to-accounting verification

Completed 9 November 2026. Baseline: `80e4abb283216b9f8e04b94e5020393f7dcabf62` plus the existing working tree and the scoped changes below. The earlier strategy PDFs and backend-only proof were preserved.

## Result

The real application interface completed a 10 XAF POS sale with 6 XAF cash and 4 XAF customer credit, a later 4 XAF bank collection, and an independent reversal. Normal sign-in and real password confirmation were used. No authentication or financial service was mocked in the running application.

| Observed position | After sale | After collection | After independent reversal |
|---|---:|---:|---:|
| Customer balance / posted invoice due | 4.00 | 0.00 | 4.00 |
| Accounts receivable, debit balance | 4.00 | 0.00 | 4.00 |
| Bank, debit balance | 0.00 | 4.00 | 0.00 |
| Cash, debit balance | 6.00 | 6.00 | 6.00 |
| Revenue, credit balance | 10.00 | 10.00 | 10.00 |
| Cost of goods sold, debit balance | 4.00 | 4.00 | 4.00 |
| Stock quantity / retained value | 4 / 16.00 | 4 / 16.00 | 4 / 16.00 |
| Physical register balance, including opening float | 106.00 | 106.00 | 106.00 |
| Balanced journals | 2 | 3 | 4 |

The authenticated trial-balance report was inspected at each stage. Read-only database corroboration independently asserted these amounts and identities: [sale](after-sale.json), [collection](after-collection.json), [reversal](after-reversal.json). One settlement remains, marked REVERSED, with different receiving and reversing actors and retained original/reversal journals. The original POS tender records remain the historical cash/credit split; the posted receivable lifecycle supplies the current debt position. A [final file-bound consistency summary](VERIFICATION_SUMMARY.json) binds the six final production roots to the tested types and development copy.

## Issues fixed

1. **The workflow had no usable later-collection/reversal interface.** Added current payment controls inside Customer AR History invoice details, a tenant-scoped current-document projection and a protected collection action. Existing controlled accounting writers and independent reversal remain authoritative. Historical as-of views remain read-only.
2. **POS exposed cash alone.** Added the existing on-account tender, with customer-required and credit controls preserved. The footer separates money received from credit: Paid 6, On account 4, Uncovered 0. Provider tenders, store credit and receipt delivery retain their previous restrictions.
3. **The collection service result contains Prisma records and decimals.** The new server action returns a narrow, plain receipt suitable for the application interface.
4. **Authenticated AR History entered a permission-refresh loop.** The new drawer's duplicate permission observer triggered refetch, cleared the parent rows and repeatedly remounted itself. The panel now consumes the parent's already-checked display scope; server reads and writes still reauthorize independently. Actor, organization and permission changes clear stale controls and callbacks.
5. **Payment method labeling and action contrast needed correction.** Separated the native select's label from its options. Applied existing dashboard semantic styling to secondary/destructive controls and the file-selection button. Initial reversal/cancel contrast violations disappeared in the repeated scoped audit.

Forms use decimal strings, explicit confirmation, supporting-file fingerprints and unique payment references. Password confirmation never executes a financial action automatically. Exact requests are retained for authentication and uncertain-result retries; definitive validation/domain declines allow correction. The file content is not uploaded or retained by these controls; the interface explicitly instructs the operator to retain the original externally.

## Authenticated browser evidence

The private development instance ran at `http://127.0.0.1:3196` using current source, an isolated generated Prisma client and a fresh synthetic database. See [target](DATABASE_TARGET.json), [fixture](FIXTURE.json), [schema provenance](SCHEMA_PROVENANCE.json), [source manifest and scoped HMR history](SOURCE_PROVENANCE.json). Synthetic credentials were kept only in the owned ignored runtime directory.

| Check | Observed result / evidence |
|---|---|
| Anonymous protected route | Redirected to sign-in: [record](browser/anonymous-guard-warm.json). |
| Cashier | Real sign-in, register opening with 100 XAF, persisted draft, resumed draft after runtime restart, customer selection and cash/credit sale completion: [record](browser/sale-credit-commit.json). |
| Read-only user | Loaded current invoice and payment evidence; collection and reversal controls absent after the authority read completed: [record](browser/readonly-authority-verified.json). |
| Collector | First payment attempt required actual password confirmation. Incorrect password recovery worked; successful confirmation alone created no settlement or journal: [browser record](browser/collection-password-recovery.json), [database corroboration](after-password-verification.json). Expired assurance required another verification, preserving the request. |
| Posted collection / self-reversal restriction | 4 XAF bank collection posted; current due became zero; original collector, despite having reversal permission, had no reversal control: [record](browser/bank-collection-completed.json), [trial balance](browser/collection-trial-balance.json). This checks the UI capability; forced server self-reversal denial is covered separately by domain/action tests. |
| Independent reviewer, French | Real sign-in, reason, evidence, explicit reversal confirmation and separate password check; debt restored to 4 XAF and receipt retained as reversed: [review](browser/independent-reversal-review-fr.json), [completion](browser/independent-reversal-completed-fr.json), [accountant trial balance](browser/reversal-trial-balance.json). |
| Current history after reload | Invoice, allocation/reversal evidence and payment panel agreed on 4 XAF due. Subsequent visual forms were cancelled without posting another payment. |
| Responsive controls | 1440x1000, 768x1024 and 375x812. The payment section stayed inside the viewport with no internal horizontal overflow: [measurements/audits](browser/payment-controls-responsive.json). [Desktop form](browser/payment-form-visual-desktop.png), [tablet form](browser/payment-form-visual-tablet.png), [mobile form](browser/payment-form-visual-mobile.png), [final file control](browser/file-control-final.png). Screenshots were visually inspected. |
| Scoped accessibility | Final payment and reversal fragments had zero automated WCAG A/AA violations. Some runs retained one automated incomplete result, so this is not a full accessibility or assistive-technology certification. The native file button also received an explicit visible foreground/background treatment. |
| Accountant close review | A real assessment was saved and remained BLOCKED with setup/reconciliation findings; certified export stayed unavailable. [Saved assessment](browser/close-assessment-saved.json), [later review](browser/close-after-collection.json). No valid close certificate was created or claimed invalidated by this browser run. |

## Verification classes

- **Mocked action/service and jsdom components:** 67 tests across four suites passed on the final controls implementation: [results](controls-final.results.json). Includes server-derived authority/fresh authentication, tenant/document/allocation scope, plain serialization, stale callbacks, historical read-only behavior, the permission-observer regression and exact retries.
- **Mocked POS components:** 45 tests passed: [results](pos-ui.results.json). Includes customer-required credit, restricted tender/receipt options, separate cash/credit display and retained split-tender/cart/lease intent after uncertain completion.
- **Focused TypeScript:** six explicit production roots and their imported types, no emit or incremental output: [results](owned-types.result.json). This is not a whole-repository build.
- **Real database evidence:** the financial writers ran through the authenticated interface. The separate inspection script performed read-only corroboration; it did not produce the sale, collection or reversal.
- **Source/workflow:** project workflow contract and owned tracked-file whitespace checks passed. Unrelated working-tree edits were preserved; no commit was requested.

The bounded runners omit application environment/configuration loading for mocked checks. Runtime scripts explicitly pin all database targets, validate the owned cluster/database identity and exclude ambient environment files. See `jest.controls.config.cjs`, `jest.pos-ui.config.cjs`, `check-owned-types.cjs`, `runtime.cjs`, `browser-driver.cjs` and `inspect-financial-effects.cjs` in this directory for reproducible definitions.

## Failed attempts and practical limits

The first anonymous cold navigation exceeded its timeout; the warm retry passed. An environment/session refresh ended the original local runtime; it was restarted against the same owned fixture, then the cashier signed in and explicitly resumed the draft. Development runtime history is retained under `runtime-history/`.

The initial synthetic settlement rule omitted required rail/receivable mapping keys. The first attempted repair temporarily supplied both direct accounts and mappings, which the domain correctly rejects. Both UI attempts rolled back completely. A guarded fixture-only correction then used mapping-only lines, matching the existing accounting controls. No application financial guard was weakened. [Repair history](FIXTURE_REPAIR.json) records these setup mistakes, and the corrected fixture generator uses the valid configuration.

This database was bootstrapped from the current Prisma datamodel. Migration history, custom database triggers, production artifacts and deployment were not qualified. The zero-tax synthetic chart/opening inventory fixture is not a Cameroon statutory setup; its close blockers are not a certificate of pilot readiness. No real bank transfer, provider initiation, fiscal filing, receipt delivery, business enrollment or production-data mutation occurred.

## Owned production scope and rollback

- `actions/finance/customer-settlement.actions.ts`
- `services/accounting/customer-settlement-workbench.service.ts`
- `components/finance/CustomerSettlementControls.tsx`
- `components/finance/AROpenItemsHistoryWorkbench.tsx`
- `hooks/useAROpenItemsHistoryWorkbench.ts`
- The scoped tender/display changes in `components/pos/ProfessionalPOSSystem.tsx`

Related tests and the receivables/POS contracts were updated. Rollback should remove/revert only these owned additions and hunks, preserving the existing POS catalog-accessibility edits and all other unrelated changes. No schema migration is required by this slice. [Runtime shutdown](APPLICATION_STOPPED.json) completed; the [OS listener check](SHUTDOWN_CHECK.json) found no listener on the owned application, browser or database ports.
