# AqStoqFlow HR/Payroll Prompt 18 Close Data-Trust Country-Pack Proof Gate Report

Date: 2026-07-01
Prompt: 18 - Close Assurance And Data-Trust Expansion
Workspace: E:\ohada saas\newStockFlow\aqstoqflow

## Decision

Status: PASS for this Prompt 18 hardening slice.

This slice feeds the new payroll declaration country-pack register proof chain into accountant data-trust readiness. Certified close/trust-pack export can no longer remain eligible when close-impacting payroll declaration evidence has source payroll register proof but lacks matched country-pack register proof.

This is not a full HR/payroll production go-live decision. The broader roadmap remains active.

## Expert Lenses Applied

- Close assurance architect: blocked false-fresh certified close evidence when declaration statutory provenance is incomplete.
- Accountant/data-trust reviewer: added a proof-quality blocker and payroll module fact without adding salary/person data.
- Security/privacy reviewer: consumed proof hashes and statuses only; no personal payroll amounts were added to accountant surfaces.
- Enterprise architecture reviewer: kept the change in the existing accounting data-trust service instead of creating a dashboard-only or duplicate close service.

## Source Prerequisites

- P5.04 Close Assurance And Data-Trust Expansion
- P0.25 Payment, Declaration, And Correction Close-Impact Classification
- P4.04 Payroll Register And Livre De Paie Tie-Out
- P5.01 Declaration Lifecycle Service
- P5.03 Payroll Payment Reconciliation

## Files Inspected

- `docs/prompts/skills/AQSTOQFLOW_HR_PAYROLL_EXPERT_GRADE_IMPLEMENTATION_PROMPT_SUITE_2026-06-25.md`
- `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_ORDERED_PREREQUISITE_IMPLEMENTATION_ROADMAP_2026-06-25.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_1_CLOSE_DATA_TRUST_REPORT_2026-06-27.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_LINE_COUNTRY_PACK_PROVENANCE_REGISTER_GATE_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PAYSLIP_COUNTRY_PACK_PROOF_CONTINUITY_REPORT_2026-07-01.md`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_DECLARATION_COUNTRY_PACK_REGISTER_PROOF_CONTINUITY_REPORT_2026-07-01.md`
- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/payroll-register.service.ts`

## Prerequisite Gate

Status: passed for a targeted close/data-trust hardening slice.

- Payroll register tie-out exists and now carries line-level country-pack proof.
- Declaration lifecycle exists and now propagates country-pack register proof into declaration metadata and evidence.
- Payment reconciliation exists and remains covered by existing register/component/provider proof gates.
- Close-impact classification exists for declaration lifecycle and payment settlement evidence.
- Prior Prompt 18 data-trust gates were present for source register proof, authority adapter proof, authority lifecycle proof, payment settlement proof, ledger posting, source links, payslips, and run-line proof.

## Implementation Summary

Updated `services/accounting/data-trust.service.ts`:

- Added a close-impacting payroll declaration evidence scan for missing or non-matched `countryPackRegisterProofHash` / `countryPackRegisterProofStatus`.
- Added high-severity blocker `payroll-declaration-country-pack-register-proof-missing`.
- Added payroll module fact `Declaration country-pack register proof gaps`.
- Included the new gap in payroll module blocked-state calculation.
- Updated certified evidence text to explicitly include declaration country-pack proof.

Updated `services/accounting/__tests__/data-trust.service.test.ts`:

- Added focused coverage proving accountant trust packs are blocked when declaration country-pack register proof is missing even if other payroll trust data is otherwise clean.
- Expanded the payroll close data-trust regression test to expect the new blocker, module fact, and evidence description.

## Security And Privacy Decisions

- No salary, personal identity, bank, or employee-level values were added to close/data-trust projections.
- The blocker consumes metadata proof hashes and proof statuses only.
- No client-owned metrics, UI-owned close logic, or browser-computed payroll truth was introduced.

## Accounting And Finance Decisions

- Declaration source register proof alone is no longer sufficient for close/data-trust certification when statutory country-pack proof is absent or not matched.
- The gate is high severity because it blocks certified trust-pack export without implying a ledger imbalance.
- No new close invalidation source was added; this is a proof-quality readiness gate over already close-impacting declaration evidence.

## UI/UX Decisions

No UI changed.

Close and accountant surfaces should render this server-owned blocker/fact when present. They must not recompute country-pack proof status in the browser.

## Validation Evidence

- `npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts --runInBand`
  - PASS: 1 suite, 12 tests
- `npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/payroll/__tests__/payroll-register.service.test.ts services/payroll/__tests__/declaration-lifecycle.service.test.ts services/payroll/__tests__/payroll-payment-reconciliation.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts --runInBand`
  - PASS: 6 suites, 75 tests
- `npm run typecheck`
  - PASS
- `npm run prisma:validate`
  - PASS
- `npm run service:boundary:fail`
  - PASS: active service-boundary violations 0
- `npm run regulatory:hardcode:fail`
  - PASS: active findings 0
- `npm run policy:gates`
  - PASS: inventory boundary, service boundary, workflow assurance runtime, payroll immutability runtime, hard-delete, regulatory hardcode, demo trust, and raw-error boundary gates all reported zero active blockers.
- `npm run lint -- --quiet`
  - PASS: 0 errors, 4 existing warnings outside this slice.
- `git diff --check -- services/accounting/data-trust.service.ts services/accounting/__tests__/data-trust.service.test.ts`
  - PASS

Skipped:

- `npm run prisma:generate`: skipped because no schema or Prisma Client shape changed.
- Browser smoke: skipped because this slice changed no UI routes or components.

## Files Changed

- `services/accounting/data-trust.service.ts`
- `services/accounting/__tests__/data-trust.service.test.ts`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- `what-next/payroll/payroll-immutability-runtime-check.json`
- `what-next/payroll/AQSTOQFLOW_HR_PAYROLL_PROMPT_18_CLOSE_DATA_TRUST_COUNTRY_PACK_PROOF_GATE_REPORT_2026-07-01.md`

## Source-Of-Truth Risks Avoided

- Avoided treating declaration register proof as enough when statutory country-pack provenance is missing.
- Avoided adding close assertions to UI or BI layers.
- Avoided salary/person data leakage in accountant trust evidence.
- Avoided unjustified close invalidation by using data-trust eligibility rather than inventing a new close-impact event.

## Remaining Roadmap Work

Next safe slice:

1. Add operator proof drawers and denied states for declaration/payment/payroll close surfaces using these service-owned blockers.
2. Complete production authority adapter mappings, rejection/amendment receipts, idempotency, retry, and provider settlement proof.
3. Run Prompt 19 assurance/chaos/browser smoke over the implemented scope.
4. Continue controlled pilot reconciliation across register, declarations, payments, ledger, close, and BI before unrestricted production rollout.

## Handoff Decision

Prompt 18 is pass for this country-pack proof-quality hardening slice. Close/data-trust gates now consume the declaration country-pack register proof chain and are ready for the next assurance/operator-surface pass.
