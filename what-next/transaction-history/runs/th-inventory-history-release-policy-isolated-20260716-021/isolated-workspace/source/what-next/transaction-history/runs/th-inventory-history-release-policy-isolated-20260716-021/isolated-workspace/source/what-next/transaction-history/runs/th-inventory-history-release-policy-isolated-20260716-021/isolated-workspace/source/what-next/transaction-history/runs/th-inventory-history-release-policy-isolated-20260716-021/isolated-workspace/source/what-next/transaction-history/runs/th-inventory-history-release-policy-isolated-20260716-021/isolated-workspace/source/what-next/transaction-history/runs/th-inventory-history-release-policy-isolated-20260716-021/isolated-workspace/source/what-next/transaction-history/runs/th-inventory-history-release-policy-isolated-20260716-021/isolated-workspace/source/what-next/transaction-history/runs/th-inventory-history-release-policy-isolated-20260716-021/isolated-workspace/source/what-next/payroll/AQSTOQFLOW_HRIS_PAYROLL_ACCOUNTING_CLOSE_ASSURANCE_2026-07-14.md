# AQSTOQFLOW HRIS/Payroll Accounting Close Assurance

Date: 2026-07-14
Skill: aqstoqflow-hris-payroll-14-accounting-close-assurance
Next handoff: aqstoqflow-hris-payroll-15-self-service

## Scope

This pass connected the certified HRIS input proof chain to accounting close/data-trust assurance.

The previous payments/declarations proof step made payment release and declaration preparation require:

- `payrollInputReadinessHash`
- `payrollEngineInputHashes`
- `payrollEngineInputSnapshotHash`

This step made the accountant data-trust close gate fail closed when posted or paid payroll runs are missing those same certified-input anchors.

## Files Inspected

- `docs/HR-Payroll/README.md`
- `docs/HR-Payroll/AQSTOQFLOW_PAYROLL_GRADE_HRIS_FIRST_BLUEPRINT_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HR_PAYROLL_SYSTEM_DEEP_ANALYSIS_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_ENTERPRISE_HRIS_PAYROLL_EXECUTION_ROADMAP_2026-07-12.md`
- `docs/HR-Payroll/AQSTOQFLOW_HRIS_PAYROLL_SKILL_SYSTEM_BLUEPRINT_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-14.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_INPUT_READINESS_GATE_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SNAPSHOT_CORRECTION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ENGINE_INTEGRATION_2026-07-12.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_2026-07-12.md`
- `services/accounting/data-trust.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/source-link.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/payroll-final-release-readiness.service.ts`

## What Was Working

- Payroll run posting already creates ledger posting evidence and source links through the existing payroll-control path.
- Accountant data-trust already blocks on missing payroll ledger posting, missing payroll ledger source links, missing statutory component proof, missing effective component proof, missing payslips, missing payslip proof hashes, unsettled payroll payments, missing settlement/reconciliation evidence, missing declaration lifecycle proof, missing authority adapter proof, and missing country-pack register proof.
- Close pack export already blocks certified exports when the close run is not ready, high-risk findings remain open, critical evidence is unavailable, reconciliation evidence is unsigned, inventory annex evidence is stale, or persisted payroll pilot-cycle certification is missing.
- Close pack payloads already include redacted payroll finance forecast proof and redacted pilot-cycle certification summaries rather than raw person-level payroll amounts.

## Gap Closed

The close/data-trust gate did not yet understand the certified HRIS input proof anchors introduced earlier in the HRIS/payroll spine.

This pass added a critical accountant data-trust blocker:

- `payroll-posted-runs-certified-input-proof-missing`

The blocker is raised when any posted or paid payroll run in scope is missing certified HRIS input readiness proof or certified engine input proof. The payroll module evidence panel now also reports:

- `Posted run certified input proof gaps`

This makes accounting close refuse payroll money truth that cannot be traced back to certified HRIS input truth.

## Data Ownership

- HRIS still owns people truth.
- Payroll still owns certified calculation, payment, declaration, and correction proof.
- Accounting still owns ledger money truth, source links, accountant data-trust gates, and close-pack certification.
- Assurance proves the chain by checking payroll proof before certified close/export, rather than allowing UI or accounting screens to invent payroll truth.

## Tenant And RBAC Decision

- The new gate is tenant-scoped through the existing `organizationId` and selected accounting-period/date scope in accountant data-trust.
- No new public surface or permission was added.
- Export authorization remains in the existing accountant trust-pack and close-pack export control paths.

## Audit And Redaction Decision

- The new close gate checks only proof hashes and metadata presence.
- No raw salary, bank/mobile-money destination, employee identity payload, provider payload, or authority payload was added to accountant data-trust output.
- Existing close-pack redaction remains intact: payroll forecast proof is aggregate-only, and pilot-cycle certification is redacted to certificate/status/hash summaries.

## Focused Tests Added Or Extended

- Extended accountant data-trust payroll close evidence coverage so missing certified HRIS input proof appears as a critical blocker.
- Extended payroll module evidence facts so accountants can see the certified-input proof gap count.
- Preserved existing ledger/source-link and redacted close-pack export tests.

## Verification Run

Passed:

- `npm test -- --runTestsByPath services/accounting/__tests__/data-trust.service.test.ts services/accounting/__tests__/close-assurance-pack.service.test.ts services/accounting/__tests__/source-link.service.test.ts services/accounting/__tests__/close-assurance.service.test.ts services/payroll/__tests__/payroll-control.service.test.ts services/payroll/__tests__/payroll-completion.service.test.ts --runInBand`
  - 6 suites passed
  - 75 tests passed
- `npm run typecheck`
- `npm run prisma:validate`

## Skipped Checks

- No browser validation: this was a backend accounting close/data-trust gate.
- No full Jest run: the worktree contains broad unrelated module, HRIS/payroll, roadmap, and docs changes, so the focused close/data-trust/payroll proof suite was used.
- No live provider, bank, mobile-money, tax authority, or social authority integration certification was attempted.

## Current Blockers

No blocker remains for this focused accounting close assurance slice.

Unrestricted production close still depends on real-world evidence outside this local gate:

- Live provider settlement evidence and signed reconciliation evidence.
- Live authority declaration proof and statutory acceptance/payment evidence.
- Qualified statutory review for all required payroll country-pack families.
- Resolution of unrelated dirty-worktree whitespace issues before a broad commit.

## Residual Risk

- This pass proves that accountant data-trust fails closed on missing certified HRIS payroll input proof. It does not certify legal correctness of payroll formulas or live provider/authority integrations.
- Close-pack export still depends on the close run having captured current evidence items. This step did not alter close-run generation or posted ledger entries.
- The repository remains broadly dirty from earlier roadmap/module/HRIS work; this report claims only the accounting close assurance gate added in this pass.

## Decision

The accounting close assurance slice is ready to hand off to `aqstoqflow-hris-payroll-15-self-service`.

The next step should make payroll/HRIS self-service useful without turning employee or manager screens into a new source of payroll truth, and should preserve manager scope, redaction, and proof access boundaries.
