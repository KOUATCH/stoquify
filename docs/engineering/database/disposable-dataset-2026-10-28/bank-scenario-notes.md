# Synthetic manual bank scenario and verification boundaries

Inspected 2026-10-29. Scope: one synthetic manual bank transfer, retained statement and reconciliation for each of `synth12_douala`, `synth12_yaounde` and `synth12_bafoussam`.

**Implementation:** [disposable-bank-scenarios.ts](../../../../prisma/disposable-bank-scenarios.ts) exports `seedBankScenario(org, actors, out)`. The parent executes it sequentially against its manifest-bound disposable localhost database, with real synthetic persona sessions and a Date-only clock fixed at `2026-10-28T20:00:00Z`. This subtask did not execute the helper or query the database.

The authorized fixture setup inserts explicitly synthetic `PaymentRail`, `ProviderAccount` and `SettlementAccount` reference configuration. Current application source exposes no controlled authoring/approval command for these records. The `APPROVED` reference state, actual synthetic requester/checker IDs and fixture timestamp are configuration prerequisites, **not evidence that an approval UI/workflow ran**. Retained configuration JSON bytes and SHA-256 identify that distinction. No cryptographic provider authority, external transfer or production/provider certification is asserted.

## Required setup

The models are in [schema.prisma](../../../../prisma/schema.prisma) at lines 5826, 5853 and 5916. [Provider readiness](../../../../services/reconciliation/payment-reconciliation-evidence.service.ts) at line 78 and [supplier bank evidence validation](../../../../services/purchasing/payment-reconciliation-evidence.ts) at line 46 enforce:

| Record | Required state for this scenario |
|---|---|
| `PaymentRail` | Same organization; unique code; `type: BANK_TRANSFER`; `isActive: true`; XAF currency. |
| `ProviderAccount` | Same organization and rail; unique provider code and external account hash; `status: ACTIVE`; not archived; XAF currency; settlement and suspense ledger mappings. Synthetic identifiers must be explicitly non-routable. |
| `SettlementAccount` | Same organization/provider; `ledgerAccountId` equal to the provider settlement ledger; `approvalStatus: APPROVED`; effective at the review time. Schema has requester, approver and approval timestamp fields, but no production approval command was found to establish their provenance. |
| Ledger/source | Active tenant settlement account; posted supplier payment journal containing a credit equal to the payment amount on that exact account. A chart account named/mapped `BANK` alone is insufficient. |

Searches of application `services/` and `actions/` found no `create`/`upsert` writers for those three setup models or settlement approval operation. Creators in `scripts/modern-modules-lifecycle-fixture.ts` and PostgreSQL tests establish the same distinction. Existing `graphify-out/` evidence was consulted for discovery, but did not establish a current setup API. No production setup permission is claimed. The helper creates a dedicated suspense chart account through `createChartAccount` when absent.

## Implemented service sequence

1. Retain a synthetic funding document, create a 5,000,000 XAF cash-to-bank journal through `createManualJournalEntry` as owner, and post it through `postJournalEntry` as accountant. Check posted cash before funding, exact retained lines and independent actors, and nonnegative closing cash/bank balances. This reallocates existing cash capital without creating income or claiming an external deposit.
2. Request, independently approve and record the synthetic `BANK_TRANSFER` through payment services (owner/checker/accountant). The source invoice is `${org}-history-2026-03-2` for supplier 0; a new payment requires its unpaid/posted state. Release creates the original outbound transaction and open exception. Its posting rule must credit `BANK` and the returned ledger must be posted.
3. Retain exact UTF-8 CSV bytes and SHA-256 under `synthetic-documents`, then call `importProviderStatement`. Before any setup/import, reuse `paymentReconciliationAuthority` for persisted owner role/session/freshness/module checks and additionally require import/run permissions. The import service also performs transactional module admission. Exact file replay must return `DUPLICATE_FILE` and the original file ID.
4. The fixture adapter reuses the strict shipped `MobileMoneyHmacAdapter` statement parser/fingerprint, sets rail type `BANK_TRANSFER`, and explicitly labels the source `SYNTHETIC_MANUAL_BANK_STATEMENT`. It always rejects signature verification and provider events. This is a fixture format adapter, not a production bank integration. CSV uses one unique transaction ID, `DEBIT`, exact payment amount/currency/reference/date, and a synthetic description.
5. Call supplier `previewPaymentReconciliation` / `proposePaymentReconciliation` as owner, then `reviewPaymentReconciliation` / `decidePaymentReconciliation` as independent manager. Bank evidence becomes `ADMITTED`, binding the original transaction to the provider/reference. Only then call `importProviderStatementForReview` to obtain a run, and independently finalize supplier reconciliation through the manager's fresh session. See [supplier reconciliation service](../../../../services/purchasing/payment-reconciliation-service.ts).
6. Revalidate the manager's persisted permissions, fresh session and module access, obtain `previewReconciliationSignOff`, and call `signReconciliationRun` with its reviewed source/evidence hashes and a stable correlation UUID. The manager differs from the owner who ran reconciliation. Exact sign replay must return the same certificate. The helper validates the retained signature envelope and audit, rebuilds the current source manifest, compares its hash and one-payment/one-statement/one-match coverage, and retains canonical certificate bytes as `${org}-manual-bank-20261028-application-certificate.json`. Those bytes must hash to the application's `certificateHash`.

The import/operator helper must run after supplier admission: it imports **and immediately runs** reconciliation, and running earlier would encounter a pending/unbound supplier transaction. Its duplicate import is intentional; the second operator invocation must reuse the same run. Successful completion expects supplier `RECONCILED`, application run `SIGNED`, current evidence, one payment/file/run/match, one run match, zero run exceptions/suspense, and no `providerAuthorityEventId`. Whole-helper replay skips retained payment stages, revalidates the retained application certificate and current source coverage, and rejects changed retained document bytes/configuration. Application sign-off records the independent synthetic persona's review of retained application evidence; it does not assert a provider signature, real transfer, external bank confirmation or production certification.

## Actor requirements

| Operation | Permissions and independence |
|---|---|
| Payment request / approval / release | `purchasing.ap.payment.request`, `.approve`, `.release` respectively; actual active scoped sessions and password assurance within 300 seconds. Recorder differs from requester and approver. |
| Funding journal posting | Accountant authority for `accounting.journal.post`, fresh assurance and accounting module access; owner maker differs from accountant poster. |
| Statement import | `payments.reconciliation.import`; importer/operator helper additionally requires `.read` and `.run`, active actor and reconciliation module write access. |
| Supplier evidence proposal | `payments.reconciliation.read`, `accounting.journal.read`, `payments.reconciliation.exception.resolve`; current purchasing/reconciliation access and fresh session. |
| Supplier decision/finalization | Above plus `payments.reconciliation.sign`; reviewer differs from requester, approver, execution recorder **and** evidence proposer. Existing owner/checker/accountant may fill the first three roles, and manager may review if its current persisted permissions use the plural `payments.*` keys. |
| Provider run / optional manual match | Run: `payments.reconciliation.run`. Manual proposal/approval, if needed: `.match` / `.override` with independent fresh approver. Separate run sign-off needs independent signer and current readiness; supplier finalization does not certify the run. |
| Application run sign-off | Manager requires `payments.reconciliation.read` and `.sign`, fresh assurance, active scoped identity and writable reconciliation access. The service checks independent maker/signer, open accounting period, provider configuration, complete current source evidence, zero open run exceptions/suspense and the reviewed revisions before signing. No provider secret or network call is required. |

These requirements come from `payment-request-authority.ts`, `payment-reconciliation-authority.ts`, `provider-operations.service.ts` and `actions/payments/reconciliation.actions.ts`; caller-supplied claims must not replace persisted permissions/session checks.

## Verification boundary

- Source inspection: completed; the helper, this note and the scoped bank/HR additions to `scripts/verify-disposable-dataset.cjs` were authored in this subtask. Other agents' edits were preserved.
- `npm run agent:workflow:check`: passed; 196 scripts remain outside the reviewed manifest.
- Source-only TypeScript compiler API check of `prisma/disposable-bank-scenarios.ts` using the repository tsconfig with `noEmit: true`, `incremental: false`, `composite: false`: passed after the final helper edits, zero helper and zero imported-source diagnostics. This only read source/types; it did not load application environment or execute imports.
- `node --check scripts/verify-disposable-dataset.cjs`: passed. The verifier requires one signed application run per organization, checks canonical database certificate hashes and retained certificate/CSV/configuration bytes, and includes the bank/HR records in replay fingerprints with per-component hashes. Syntax checking does not execute these SQL assertions.
- Mocked unit tests: not run; acceptance assertions are embedded in the bounded helper for real service execution by the parent.
- Real database, provider/network, payment, import, sign-off, replay and browser checks: not run by this authoring agent. The parent executes the bounded scenarios and independent verifier separately.
- This note does not itself claim executed payment/import/match/sign-off results. Parent execution reports establish those outcomes. Setup authoring/approval workflow and external provider certification remain outside the tested scope even after successful application sign-off.
