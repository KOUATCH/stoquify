# Cash Command: payroll posting and settlement forecast

Engineering checkpoint, 2026-09-30. Primary: FA-CASH-COMMAND; supporting dependency: payroll posting and forecast obligations. Branch `codex/migration-control-plane-release-2026-08-29`, HEAD `62a56036a5ac9b37236a20c9b148052199069479`; shared working-tree changes preserved. Exact current files, receipts and screenshots are bound in `evidence/cash-payroll-posting-review-2026-09-30.json`. No workflow closure or production readiness claim.

## Findings and corrections

1. **Settled pay was still forecast as upcoming cash.** A settled 350,000 batch plus a 90,000 declaration returned 440,000 upcoming instead of 90,000, and retained an upcoming pay date. The forecast now excludes settled payment obligations while retaining their evidence. A mixed settled/released case counts only the released amount. Statutory obligations remain separate. Batch status now participates in the source fingerprint.
2. **Partial settlements used the original amount without a verified remaining balance.** The settlement writer records individual evidence but does not expose a canonical cumulative remaining amount. The forecast now withholds the aggregate with `PAYROLL_FORECAST_SETTLEMENT_BALANCE_UNVERIFIED`, including EN/FR recovery copy. This prevents an incorrect number; implementing the remaining-balance contract is still engineering work. Do not manually alter immutable released amounts to suppress this warning.
3. **Real payslip emission failed against database immutability.** The service created an EMITTED parent before its nested lines. The database rejected the inserts with “Cannot add payslip lines to immutable payslip.” The service now assembles a DRAFT and seals it as EMITTED inside the same serializable transition transaction. No trigger, migration, permission or separation-of-duties rule changed.

## Verification

- Before-fix arithmetic: `evidence/payroll-settlement-forecast-before.json`: two failed assertions, 15 passed. Preserved as reproduction evidence.
- Before-fix real lifecycle: `lanes/environment/payroll-posting-proof-b4f3647d-e6a6-4f8b-b499-10d707048f67.json` and diagnostic `payroll-posting-proof-5ea44f30-ce18-4328-b054-4d31dcd714da.json`: review and approval persisted; emission rolled back with the immutability error. The diagnostic captured the original error outside the service's safe public message.
- Final static: `evidence/payroll-forecast-settlement-checks-45eefbb7-831c-4b1c-a1b0-ce924c00b979.json`: **136 tests in five suites**, changed-file ESLint and `tsc --noEmit --pretty false` passed. Exact commands and source hashes are in the receipt. Runner: `run-payroll-forecast-settlement-checks.cjs`; no migration-bearing build.
- Final real-service lifecycle: `lanes/environment/payroll-posting-proof-83e84e0e-86f5-42a0-b264-18145720fcbe.json`: review → approve → emit → post, four persisted transitions, source link and posting batch, **112,950.00 debit = 112,950.00 credit**, posted proof with no blockers. Self-review denied; injected seal failure leaves no new event, payslip or transition and preserves APPROVED; retry succeeds. Emitted line update and late insertion rejected. Posting replay creates no duplicate journal.
- Actual browser: `lanes/environment/posted-payroll-browser-5c547733-18e6-4f28-bd65-253822f8ec8d.json`: EN 1440, FR 768 and FR 320, reduced motion and America/New_York timezone. Actual authenticated action response references the posted journal. Localized posted reason, keyboard containment/Escape return, no horizontal drawer overflow or page errors, fresh permission revocation and unchanged business-record fingerprints passed. Three screenshots retained; FR mobile visually inspected.
- Browser duration includes inspection, screenshot and revocation; it is **not a route-latency benchmark**.

Environment: guarded, owned local database `stoquify_local_registration_20260906_01`, app `http://127.0.0.1:3110`. Synthetic calculated input and distinct test actors; services performed real local transitions/posting. Country provenance explicitly says synthetic/expert-review-required. The verifier's trust-spine flag is process-local after ownership checks. No real bank payment, declaration submission, external communication, production activation or schema change occurred.

## User and operator guidance

Open `/en/dashboard/finance/cash-command` or `/fr/dashboard/finance/cash-command`. An authorized accounting reader can open Ledger proof / Preuves comptables. A posted proof describes the journal and its source links; it does not certify statutory calculation or unrelated finance sources. Limited source access remains visible as partial data.

For the partial-settlement warning, payroll/reconciliation owners supply the batch, settlement events and provider or bank reconciliation evidence from their controlled records. Engineering must establish a cumulative remaining-obligation contract before this forecast can display a reliable amount. A signature, approval document, status override or original batch amount cannot substitute for it. No user approval is currently needed to continue that implementation.

If emission failed with the reproduced defect, refresh the actual run and confirm it is still APPROVED with no emitted batch. Use the normal authorized retry; do not insert payslips manually. Successful existing emitted records stay immutable. A failed transaction is not an emission; a replay of a completed command must not duplicate effects.

## Review and rollout

Architecture/backend/data: service-owned assembly and sealing use the existing transaction and immutable schema. Security: existing authority/fresh-auth/maker-checker checks retained; self-review and read revocation verified, not a new full security certification. Finance/audit: decimal arithmetic, balanced ledger, source linkage, transitions, immutable evidence and replay checked. Statutory: synthetic input only, no expert approval inferred. UI/localization: new blocker translation unit-covered; successful proof actual EN/FR behavior verified using existing presentation and tokens. SRE/release: isolated runtime and migration-free checks only, no production latency claim. Commercial/billing, AI, offline/POS and provider transport: not applicable to this patch; no contracts changed there.

No migration. Release through the existing reviewed deployment process, with a non-live cohort exercising emission, posted proof and forecast before broader enablement. Monitor emission failures and forecast blocker codes. Code rollback must not delete posted journals, emitted payslips or transitions. Reverting the emission ordering reintroduces the failure; reverting the forecast reintroduces double-counting. Recovery of genuine posted financial data belongs to the existing correction/reversal workflow.

## Still open

Full HRIS calculation/certification → payment → reconciliation → declarations → forecast admission is not proved by this synthetic calculated-input slice. Remaining partial balances need implementation and the new warning needs actual EN/FR UI verification. Other successful payment/reconciliation/certified-close proof states, complete Cash accessibility, enlarged text, nested payroll landmarks and route-latency baseline remain open. Native assistive-technology, browser zoom and production performance remain unverified. The primary workflow and full-platform goal remain active.
