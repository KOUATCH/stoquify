# UX06/UX07 implementation discovery

Status: guided proof projection, transactional resolution, action boundary and EN/FR selectors implemented. Transactional database and eligible browser-fixture verification remain open; this is not a release approval.

## Existing authority and transaction boundary

`actions/payroll/payroll-payment-reconciliation.actions.ts` derives the organization and actor from the current session. The write action requires `payroll.payments.reconcile`, fresh authentication and enforced payroll write entitlement. Preserve this entry boundary.

`services/payroll/payment-reconciliation.service.ts` performs settlement inside a serializable transaction with bounded conflict retries. It already checks batch/transaction linkage, eligible batch status, ledger evidence, unresolved exceptions/suspense, settlement balance revision, duplicate evidence, command identity and close invalidation. Extend that transaction rather than resolving selected evidence in a separate preliminary transaction.

## Stored sources to use

`PayrollRun` has an organization, run number, version, status, document/evidence hashes, posted event identity and cancellation/deletion timestamps. There is no separate persisted PayrollRegister model in the inspected schema. The register report service computes a report hash; do not treat a newly generated report hash as an immutable released register record. Existing proof backfill uses POSTED, PAID and ARCHIVED run statuses for register proof.

`MatchRecord` carries a transaction link, status, currency, matched amount, provider event and/or statement line identities, correction linkage and update timestamp. Existing settlement accepts APPROVED and AUTO_MATCHED records. Provider and statement relations use simple record foreign keys in parts of the schema, so independently validate related organizations; an organization-scoped match query alone cannot establish every relation's tenant integrity.

`ProviderEvent` carries account, currency, amount, signature validity, processing status, raw payload hash and archive state. `StatementLine` carries organization/account/currency/amount, line hash, file identity and archive state; `StatementFile` supplies the stored file hash. Select only the proof fields required for validation. Raw payloads and employee/bank details do not belong in the selector DTO.

## Implementation contract

1. Define a minimal eligible-source DTO over the linked released payroll run and approved matches for the batch's unambiguous transaction. Include readable run number/version and evidence type/date, plus server-generated revision tokens. Apply existing monetary/provider/proof redaction decisions to any displayed values.
2. Add an explicit guided-selection command variant using run ID/version and match ID/revision. Keep legacy internal caller compatibility deliberate: provider bridge and inbox worker callers currently submit hashes. Do not silently weaken their contracts to fit the UI.
3. Resolve and validate the selected records inside the existing serializable settlement transaction. Require current run/batch linkage, posted source proof, currency/account/amount consistency and valid stored provider/statement proof. Derive hashes and provider references server-side. Reject ambiguous or missing proof rather than selecting a fallback hash merely because it is nonempty.
4. Define replay identity from the immutable submitted selection and user-reviewed amount/balance revision. On replay, compare that identity against the stored successful command before reevaluating mutable eligibility; revoked or edited evidence must not cause the same successful request to be posted again or silently become a new command.
5. Preserve the form's unknown-outcome state and identical retry payload, explicit adoption of a changed balance, and fresh-authentication flow. Replace manual proof identifiers only after the controlled command and read DTO are verified together.
6. Add authoritative transactional fixtures for evidence changes between selection/submission, foreign relations, revoked/corrected matches, duplicate evidence, concurrency and lost responses. Mocked tests alone cannot close UX06.

## Implemented source semantics

The posting writer in `payroll-control.service.ts` persists `documentHash`, `postedBusinessEventId` and `ledgerPostingBatchId` through the versioned payroll transition. The guided path uses that posted run document hash, requires POSTED/PAID/ARCHIVED with no deletion/cancellation, and includes run version and posted proof identities in the selection revision. It does not use historical backfill fallback chains or a newly generated register report hash.

`payment-settlement-proof.ts` validates approved/auto-matched evidence against the batch transaction, source organization/account, outgoing direction, currency and amount. Provider proof requires verified/processed status and valid signature; statement proof requires a matched debit line in a processed file. Archived, mismatched, conflicting and corrected evidence is ineligible. A provider/statement reference, type, amount and date make choices distinguishable; the selector does not display source hashes.

The browser action now requires record selection, explicit amount and explicit balance revision. It whitelists inputs and derives actor/tenant context, ignoring caller hashes/provider identifiers. Internal provider bridge/worker callers retain the existing service contract. Guided submission resolves stored proof within the existing serializable transaction and recomputes the selection revision. Successful replay checks the recorded command identity before mutable source eligibility and performs no second settlement. Original balance, exception/suspense, amount, maker-checker, fresh-authentication and close-invalidation controls remain in the service/action paths.

`PayrollSettlementProofSelector` replaces manual proof fields. Missing proof disables submission with recovery advice; changed proof requires reselection. Unknown responses lock the entered command and retain identical retry semantics. Balance adoption clears the proof selection for another review.

## Verification and remaining gates

- `payroll-guided-proof-jest.json`: 76 passing tests across six suites: projection, settlement service, browser action, workbench/form, provider bridge and provider inbox worker.
- Focused ESLint passed for the modified production paths.
- Authenticated localhost page loaded for the supplied account. Both pages of its 12 payroll batches were inspected: all were DRAFT / LEDGER_BLOCKED, without linked payment transactions or eligible matches. The blocked state was visible; no settlement or provider action was attempted. Screenshot: `C:/Users/J COMPUTER/.codex/visualizations/2026/10/04/01a10672-554e-77c3-bc80-19e54163cb72/payroll-fixture-readiness.jpg`.
- No disposable test URL is present in this shell under `TEST_DATABASE_URL` or `PAYROLL_IMMUTABILITY_DATABASE_URL`; `docker` and `psql` were not found by command discovery. The existing PostgreSQL certification script requires a local disposable test database. Environment clarification is pending; unrelated roadmap work can continue.
- Still required: real transaction/race/rollback fixtures, eligible and restricted-role browser flows, accessible EN/FR/mobile review, controls-owner acceptance and pilot evidence. No package is marked release-complete.
