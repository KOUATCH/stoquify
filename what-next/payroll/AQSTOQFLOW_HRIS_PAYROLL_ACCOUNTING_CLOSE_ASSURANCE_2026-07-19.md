# AqStoqFlow HRIS/Payroll Accounting Close Assurance

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-14-accounting-close-assurance`  
Status: **Focused controls verified; production handoff blocked by upstream provenance**  
Next handoff: `aqstoqflow-hris-payroll-15-self-service` may be inspected independently, but the production-readiness chain remains blocked.

## Executive Decision

The accounting-close assurance controls remain healthy in focused verification. Payroll register, ledger source-link, accountant data-trust, close-assurance, and close-pack services continue to fail closed on missing proof.

This tranche cannot certify the end-to-end production chain because Skill 13 remains blocked by the unresolved Skill 12 country-pack provenance requirements. The official CNPS artifacts are retained and hashed, but the country-pack hashes have not been bound to qualified reviewer approval and the statutory production gate correctly remains blocked at 10/12.

No posted ledger entry, payroll register, close record, accounting service, or statutory formula was changed.

## Scope Inspected

- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_ACCOUNTING_CLOSE_ASSURANCE_2026-07-14.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_PAYMENTS_DECLARATIONS_PROOF_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_COUNTRY_PACK_PROVENANCE_2026-07-19.md`
- `services/accounting/data-trust.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/source-link.service.ts`
- `services/payroll/payroll-register.service.ts`
- their five focused test suites
- available architecture graph evidence under `graphify-out/`

## Controls Confirmed

- Posted/paid payroll runs without ledger posting produce critical close blockers.
- Posted/paid runs without certified HRIS readiness and engine-input proof produce critical close blockers.
- Missing statutory component proof and effective-dated allowance, benefit, leave, or overtime proof block close assurance.
- Missing payslip proof, settled-payment evidence, reconciliation evidence, or provider proof remains visible to accountant data trust.
- Missing declaration register, country-pack register, authority-adapter, or lifecycle proof remains blocked.
- Payroll ledger batches require accounting source links.
- Payroll register-to-ledger tie-out validates mapped line counts, mapping hashes, and component amounts.
- Certified accountant and close-pack exports remain gated by close readiness and critical findings.
- Existing export and register redaction keeps person-level payroll values out of unauthorized outputs.

## Prerequisite Decision

Skill 14 requires payroll output proof and payment/declaration proof. The local payment/declaration controls passed their focused tests, but their production-readiness chain is blocked because the country-pack evidence still lacks qualified signed approval and source-hash binding.

Therefore:

- accounting-close service behavior may be verified;
- production close certification must remain blocked;
- no downstream report may claim statutory or external-provider readiness;
- no posted accounting state may be modified to work around the blocker.

## Data Ownership

- HRIS owns employee and employment truth.
- Payroll owns certified calculations, registers, payments, declarations, corrections, and their proof.
- Accounting owns ledger money truth, source links, reconciliation consumption, and close state.
- Assurance evaluates evidence continuity without inventing upstream truth.

## Tenant, RBAC, Audit, and Redaction

- Existing organization/date scope remains the tenant boundary.
- No permission or public surface changed.
- Existing export authorization and audit-event paths remain in force.
- Only hashes, counts, aggregate facts, status, and blocker metadata were inspected.
- No raw salary, employee identity, payment destination, provider payload, authority payload, or statutory source content was added to broad outputs.

## Verification

Passed:

- `services/accounting/__tests__/data-trust.service.test.ts`
- `services/accounting/__tests__/close-assurance-pack.service.test.ts`
- `services/accounting/__tests__/source-link.service.test.ts`
- `services/accounting/__tests__/close-assurance.service.test.ts`
- `services/payroll/__tests__/payroll-register.service.test.ts`

Result: **5 suites passed, 44 tests passed**.

The current dependency layout required Jest to use the existing relocated runtime plus `node_modules/next/node_modules` for the already-installed `@swc/helpers`; no dependency was installed or changed.

Skipped:

- No live bank, mobile-money provider, tax authority, or social authority was contacted.
- No browser validation was required because no UI changed.
- No full repository test or typecheck was claimed.
- No certified close export was generated from production data.

## Baseline-Gap Delta

| Measure | 2026-07-14 baseline | 2026-07-19 result | Delta |
| --- | --- | --- | --- |
| Focused close controls | Ready | 5 suites / 44 tests passed | No regression found |
| Country-pack prerequisite | Treated as satisfied | Explicitly blocked at 10/12 | Ready → blocked |
| Payment/declaration prerequisite | Ready | Local controls green; production chain blocked | Ready → conditional |
| Accounting/ledger code changed | Prior focused hardening | None | 0 |
| Posted ledger entries changed | 0 | 0 | 0 |

## Residual Risk

- Local tests do not prove live provider settlement, authority acceptance, or legal correctness.
- The signed qualified-review artifact is still required before the country-pack hashes can be promoted.
- The broad dirty worktree remains outside this tranche; existing changes were preserved.

## Handoff Decision

Do not certify the accounting-close chain or hand it to production release yet. After qualified country-pack approval:

1. rerun Skill 12 and clear both statutory provenance blockers;
2. rerun Skill 13 against the corrected country-pack proof;
3. rerun this Skill 14 assurance slice;
4. then hand off to `aqstoqflow-hris-payroll-15-self-service` or `aqstoqflow-hris-payroll-16-browser-accessibility-release` as appropriate.
