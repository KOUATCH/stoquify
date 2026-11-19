# Exact prerequisites for payroll and historical AP

Scope: the disposable `stoquify_replay_dataset_20261028_01` database; source inspection on 2026-10-28 and 2026-10-29. All employees and commercial transactions are synthetic. None of the test-persona approvals below constitute expert regulatory approval.

## What is actually blocking payroll

The period service rejects the current Cameroon rules before a payroll period can be created. The first error is insufficiently reviewed CNPS rules. Fixing that first error alone is insufficient.

The only published registry pack is `CM-2026.1`, effective from 2026-01-01. The requested history also includes November and December 2025. Rules resolve at **pay date**, so the selected pack and every required envelope must cover each of the twelve pay dates. A version pin cannot fill an effective-date gap.

Required country-pack parameter paths:

| Parameter | Required result |
|---|---|
| `payroll.cnps.pensionRatesBps` | Reviewed employee/employer rates and ceilings |
| `payroll.cnps.familyAllowanceRatesBps` | Reviewed sector rules |
| `payroll.cnps.occupationalRiskRatesBps` | Reviewed occupational-risk rules |
| `payroll.cnps.employerRules` | Reviewed employer obligations/base rules |
| `payroll.irpp.incomeTaxRules` | Reviewed executable income-tax rules with production calculation supported |
| `payroll.productionAdmission` | Separate approved release-admission envelope |
| `payroll.compensation.allowances` | Reviewed allowance rules for allowance scenarios |
| `payroll.compensation.benefits` | Reviewed benefit rules for benefit scenarios |
| `payroll.compensation.deductions` | Reviewed deduction/recovery rules for deduction scenarios |
| `payroll.attendance.leave` | Reviewed paid/unpaid leave treatment when leave affects calculation |
| `payroll.attendance.overtime` | Reviewed overtime multiplier and tax/social-base treatment |
| `payroll.composite.registerTieOut` | Reviewed composite-register verification rules |
| `payroll.declarations.default` | Reviewed declaration configuration for declaration preparation |

The four CNPS envelopes must resolve as `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED`. Their current `SOURCE_CHECKED` / `SUPPORTED_DRAFT` status is insufficient. IRPP currently requires expert review and has `productionCalculationSupported: false`. These flags cannot honestly be changed by a seed script.

The employer configuration already has explicit synthetic GENERAL family-allowance sector and occupational-risk group A. Those are test assumptions, not verified classifications of real employers. Calculation supports HALF_UP rounding at scale 2 and requires suitable fiscal-year settings.

Source: `services/payroll/payroll-control.service.ts`, function `resolvePayrollCountryPackStatus`.

## What must be supplied by a qualified reviewer/legal owner

1. Source-backed rule envelopes covering the intended 2025 and 2026 pay dates, with legal authority, official source URL, retrieval date, legal reference, effective dates, verified date/person and appropriate verification status. Use separate versions where rules changed; do not backdate the 2026 pack by assumption.
2. Independently reviewed executable fixtures: inputs, expected outputs, `reviewedBy`, `reviewedOn`, `legalRef`, `sourceEvidenceHash`, and review topics. Supply genuine reviewer identity/signature evidence and hashes binding the exact proposed pack and fixtures.
3. Approval of the complete statutory scenario scope, not just CNPS: pension, family allowance, occupational risk; IRPP period, YTD, adjustments and corrections; allowances/benefits; deductions/recoveries; leave/overtime; and composite register tie-out. All 11 families must be READY for full release admission.
4. A reviewed `payroll.productionAdmission` envelope with `status: APPROVED`, `calculatorContract: stoquify-payroll-calculator.v1`, `scope: CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER`, and valid SHA-256 `obligationCatalogueHash` and `releaseEvidenceHash`.
5. Persisted legal-owner approval through the existing review-intake workflow, followed by the authorized pack publication/runtime transition. A review-intake approval does not itself publish the runtime pack.

The existing CNPS process is documented in [POST_SIGNATURE_RUNBOOK](../../../HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/POST_SIGNATURE_RUNBOOK.md). Resolve this path from the repository as `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/POST_SIGNATURE_RUNBOOK.md` if a viewer does not normalize relative links. The packet covers CNPS/employer families; it does not supply complete IRPP and expanded-scenario approval.

The runbook requires authentic reviewer return, independent identity/signature/hash verification, maker/checker evidence, independently completed fixture workbook, signature validation, fixture tie-out hashes, preflight 12/12 and scoped runtime transition. Invented signatures or a test user's approval would not meet these requirements.

Sources: `services/payroll/payroll-country-pack-review-intake.service.ts`, `services/payroll/payroll-production-admission.ts`.

## Engineering integration and remaining execution

There is a source-confirmed integration gap to resolve before claiming annual payroll correctness: `calculatePayrollRun` currently calls `evaluatePayrollTaxRule` with only current taxable base, capability and currency. The evaluator accepts `ytdTaxableBaseAmount`, `ytdTaxWithheldAmount` and `adjustmentValues`, but this caller does not supply them. Missing YTD values become zero. A reviewed YTD rule alone therefore cannot establish correct cross-month calculations.

Current source pointers: `services/payroll/payroll-control.service.ts:6496` is the three-field call inside `calculatePayrollRun`; `services/payroll/payroll-tax-rule-evaluator.ts:40` declares the optional YTD/adjustment inputs, `:77` begins the decimal helper that defaults absent amounts to zero, `:345` reads the YTD values, and `:400` applies cumulative taxable base and subtracts prior withholding for `PROGRESSIVE_YTD`.

Before selecting a YTD implementation, obtain a reviewed calculation contract and matching independent expected-result fixtures specifying cumulative versus annualized calculation, the tax-year basis, the exact adjusted taxable-base and withholding identities, same-day/off-cycle ordering, reversal and correction treatment, and refund/zero-floor behavior. These are unresolved acceptance requirements, not assertions about applicable law. The existing tenant-fiscal-year accumulator is not by itself proof of the required tax-year basis.

A simple sum of prior runs is insufficient: the query at `services/payroll/payroll-control.service.ts:6349` reads POSTED/PAID runs with strictly earlier pay dates; its transaction helper at `:1553` does not set an isolation level. The prior-line amount helper at `:2406` tolerates missing historical snapshots using stored-column/zero fallbacks. The evaluator adjusts the current base before adding YTD, while `currentAmounts.taxableBaseAmount` at `:6536` retains the pre-adjustment base. Correction deltas at `:6564` subtract the original amounts after tax evaluation. Feeding an unqualified sum into that path could misidentify historical bases or double-count the original correction amounts. The evaluator's zero floor at `services/payroll/payroll-tax-rule-evaluator.ts:412` also needs to match the reviewed refund contract.

Required engineering proof: bind authoritative historical inputs to the reviewed contract, with explicit history completeness, ordering/concurrency, correction/reversal and adjustment rules; verify actual payroll-service cross-month results against the independent fixtures. Pure evaluator fixture tests are insufficient. Engineering can prepare the integration and tests in parallel with review, but the calculation contract, reviewed fixtures and country-pack admission are required before claiming accepted payroll correctness. This continuation does not modify the payroll engine or claim the YTD gap is fixed.

After reviewed rules and integration proof are available, the remaining dataset operations can be automated:

1. Validate and publish approved effective-dated packs through normal controls.
2. Create the 36 organization/month payroll periods using the intended pay dates.
3. Resolve pending compensation and lifecycle inputs; approve/certify attendance; freeze current input snapshots. Raw attendance already exists for all twelve months; raw rows are not certification.
4. Run readiness gates and calculation; reconcile employee lines, register, employer charges and accounting amounts against the reviewed fixtures.
5. Independently approve runs, emit payslips, post journals, prepare/release synthetic payments and declarations through normal controls.
6. Reconcile synthetic evidence and verify payroll/ledger/close tie-outs. Real provider settlement or regulatory submission remains a separate external process.

Three deliberately unlinked employee personas (one per organization) are negative readiness cases. Link them if testing requires every employee to use self-service. They are not a reason to fabricate payroll input proofs.

## Historical purchasing prerequisite

November–December 2025 invoice approval also needs a source-backed published Cameroon pack with `taxes.vat.standardRateBps` effective on each invoice date, purpose `AP_SUPPLIER_INVOICE_INPUT_VAT`. Supplier-payment resolution uses `AP_SUPPLIER_PAYMENT_INPUT_VAT`. This gate applies even to zero-tax fixtures.

The current pack begins 2026-01-01. The 2025 receipts and sales can be exercised; affected invoices remain pending with `COUNTRY_SETUP`. `taxes.withholding.supplierPayments` is attempted too, but its absence is recorded as `NOT_CONFIGURED` and is not the immediate invoice blocker.

Sources: `services/purchasing/ap-control.service.ts`, function `resolveAPCountryPackStatus`; `services/purchasing/invoice-approval.service.ts`.

## Exact handoff needed

Provide the authentic reviewed 2025/2026 rule envelopes and fixture/evidence package, plus the legal-owner approval/publication decision for those exact artifacts. No production database access, real employee records, bank credentials or real payments are needed to finish this disposable dataset. The source-confirmed YTD/adjustment integration work and service-level proof must also be completed before full payroll readiness can be declared.

## HRIS reference fixtures and remaining workflow coverage

The current application exposes controlled organization-unit creation, but source inspection found no authoring mutation APIs for positions, employment assignments, reporting relationships or manager delegations. Their absence does **not** prevent synthetic reference seeding and does not require a human-supplied approval artifact to construct this disposable configuration.

`prisma/disposable-hr-structure.ts` now implements explicitly labelled direct Prisma reference fixtures: six positions, twelve primary assignments, eleven reporting relationships and one temporary Operations read delegation per organization. It derives assignments from retained employee, department, location and active-contract facts; preserves employee/contract/schedule/time records; and requires exact replay matches for rows and retained provenance bytes. Existing setup APIs provide the branch/department units. Required approval fields point to synthetic persona/configuration evidence whose contents expressly disclaim real approval, signature and certification. The unrelated `compliance-hris-role-seed.ts` is not reused.

The helper's employee-directory, own-profile and manager-scope checks, including denial and effective-date boundaries, passed through the guarded runner for all three organizations. At the earlier HRIS-only checkpoint, its replay created zero additional positions, assignments, reporting links or delegations, and 1,081 PostgreSQL assertions passed with an unchanged business fingerprint. Those are historical checkpoint results; the current continuation totals and replay outcome appear below. Retained execution evidence is in [additional scenarios](additional-scenarios.json), [verification](verification.json) and [replay](replay-result.json). Authoring UI/API and approval-workflow coverage remain untested because the reference fixture does not execute such workflows; implementing those product capabilities is engineering work, not a missing human input for this seed.

The human-supplied prerequisites remain the authentic reviewed 2025/2026 statutory rule envelopes, independently reviewed fixtures/evidence, and legal-owner approval/publication decisions described above. Engineering can construct and verify synthetic HRIS references, implement YTD/adjustment integration, and automate the remaining approved dataset operations. None of that substitutes for the country-pack, `payroll.productionAdmission`, scenario-fixture or legal-owner gates.

Fixture details: [HR structure notes](hr-structure-notes.md).

<!-- REMAINING-CONTINUATION-START -->
## Remaining-table continuation evidence

The continuation assesses all 131 originally pending tables. At the retained verification time 2026-10-29T13:02:54.889Z, 115 contain scenario rows and 16 remain empty with explicit prerequisites. See [the complete remaining-table register](REMAINING-TABLE-SCENARIOS.md) and [its exact source-backed assessment](remaining-table-assessment.json).

Autonomous synthetic reference setup and controlled non-statutory workflows do not replace the authentic review/publication gates above. Payroll policies, rubrique/company parameters, employee evidence, lifecycle tasks, attendance anomalies and import/correction cases are classified by their actual retained state. A pending or rejected case is useful negative testing evidence and is not payroll-ready input. Any pilot, agent, opening, firm or branch approval performed by a test persona concerns that bounded synthetic workflow; it is not expert approval of Cameroon rules.

The auxiliary `synth12_opening_aux` tenant is a financially empty-client capability laboratory, separate from the three core trading organizations. Its opening journal and supporting workpapers do not unblock payroll for the core organizations. The separate `synth12_close_aux` funded-period test uses actual independent system-evidence close approval and period controls; it has no employees or payroll activity and no statutory authority approval. Other close evidence retains unresolved source findings; draft exports and a branch review signature do not imply payroll readiness or period closure.

Verification remains separated: current source inspection and 0/0 owned/imported TypeScript diagnostics; 1117 actual PostgreSQL assertions (PASS); ordered business-state replay (PASS); and prior limited browser evidence. No new full payroll calculation, annual YTD correctness, live settlement, tax filing, or end-to-end browser certification is claimed.

The required handoff is unchanged: genuine reviewed effective-dated statutory rule envelopes and independent fixtures, reviewer/legal-owner evidence and runtime publication/admission, followed by the YTD/adjustment integration and real service-level proof described above. Test credentials and real-world bank or employee data are not required from the user for this disposable dataset.
<!-- REMAINING-CONTINUATION-END -->
