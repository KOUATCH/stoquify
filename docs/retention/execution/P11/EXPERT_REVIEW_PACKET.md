# P11 — Accountant and country-review packet

18 October 2026. **Prepared for review; no reviewer assigned, contacted or signed.** This packet addresses P01 D05/D14 and P03's unresolved accounting decisions. It does not execute P13, P15 or P21. Read the [support matrix](COUNTRY_SUPPORT_MATRIX.md) and [official-source register](evidence/PRIMARY_SOURCES.md).

## Review decision requested

Decide whether one named Cameroon retail/distribution legal entity, reporting period and operational scope can use the proposed opening/close workflow, subject to runtime and operational gates. Decide accounting regime separately from tax regime. Confirm which national obligations remain manual/excluded. Do not approve the entire platform, all OHADA jurisdictions or a payroll engine by approving this pilot.

Required independent roles: qualified accountant familiar with current SYSCOHADA and Cameroon practice; Cameroon tax/payroll specialist for any national rule; privacy/legal reviewer for retention and provider role; internal domain maker; independent QA verifier. One person may cover competent review disciplines, but must not self-approve their own implementation or source preparation. Names, credentials, conflicts, availability, engagement and decision authority are **unassigned**.

## Evidence intake and decision ownership

| ID | Missing evidence / decision | Accountable role | Decision required before |
|---|---|---|---|
| E01 | Entity legal form, activity/sector, domicile, NIU/RCCM evidence, fiscal period, turnover basis and accounting/tax history; regulator-specific exclusions | Customer-authorized finance owner + accountant | Applicable regime and opening design |
| E02 | Written normal-system/SMT/other-applicable-framework decision with current article references; distinguish accounting and tax classification | Qualified accountant | Reporting templates, mapping and promise |
| E03 | 2026 CGI and subsequent amendments; transaction/tax matrix, exemptions, taxable events, invoice/credit-note requirements, period/deadline treatment, rounding | Cameroon tax reviewer | Any national-rule acceptance; L02 contents not fully retrieved here |
| E04 | Dated physical inventory by site/item/unit; unit costs/valuation basis; source AR/AP residuals and original documents; cash/bank statements; prior trial balance; retained attachments | Finance/onboarding owner | Real opening reconciliation |
| E05 | Approved chart/posting map and decision on stock-generated versus opening-journal effects; complete source-to-ledger coverage exactly once | Accountant + inventory/accounting domain owners | P13 posting implementation/admission |
| E06 | Close checklist, independent expected reports, evidence completeness, unresolved-exception disposition, adjustment/reopening policy and reviewer grants | Accountant + close domain owner | P15 accepted close; no self-sign-off |
| E07 | Complete payroll obligation catalogue by employer/activity/period, reviewed rule inputs and scenario outputs; CNPS/IRPP and non-CNPS obligations; supported exceptions | Payroll/tax reviewer | Any P21 payroll increment; otherwise leave excluded |
| E08 | Authority filing applicability, official format/protocol/receipt evidence, mandate and credentials custodian | Domain/integration lead + reviewer | Any authority-submission implementation; no automatic filing now |
| E09 | Record-class retention/hold/deletion schedule, controller/processor roles, hosting/transfer/access obligations, termination access and authorized evidence exports | Privacy/legal owner + records owner | Approved policy; P10 proposed archive durations are not law |
| E10 | Named maker/reviewer/operator, support capacity, safe manual fallback and source/fixture/deployment acceptance | Programme/QA/support leads | Pilot entry; not satisfied by P11 documents |

All rows OPEN. No real personal data or credentials should be pasted into this repository. Later authorized intake needs controlled access and sanitized evidence references/hashes. Customer data ownership and meaningful authorized exports remain part of acceptance; withholding data or obstructing cancellation is not a control.

## Opening position — concrete review agenda

Use [P03 contract](../P03/OPENING_POSITION_CONTRACT.md), [manifest](../P03/FIXTURE_MANIFEST.md), [source fixture](../../../../services/onboarding/__tests__/fixtures/opening-position-source.json) and [independent controls](../../../../services/onboarding/__tests__/fixtures/opening-position-controls.json). The source/control/checker/test/config fingerprints are compared with P03 in [prerequisites](evidence/PREREQUISITES.json). They are synthetic, not customer records.

The independent example expects 7 stock rows = 4 accepted + 3 retained rejections; 15.000 EA and 3.750 KG, never one summed physical quantity. Site values are 2,000.00 and 1,000.00; inventory 3,000.00; AR 1,200.00; AP 700.00; cash 500.00; equity 4,000.00; debits and credits each 4,700.00. These are inherited non-statutory arithmetic, not new rates or account decisions. Hundredths and thousandths are fixture conventions; XAF display, statutory rounding and unit precision require explicit review.

Reviewer decisions:

1. Establish entity/period/cutoff/timezone and freeze source/control versions. Prove opening totals against authoritative legacy records and independent physical/statement evidence. Keep rejected/corrected revisions, reasons and reviewer history.
2. Map symbolic FIXTURE accounts to reviewed accounts and justify valuation, residual AR/AP, source cash/equity and taxes. Never invent a balancing plug or historical invoice to fit a service API.
3. Decide how stock quantity/value enters the stock kernel and how GL gets the matching opening value exactly once. Current P03 identifies an opening-stock review blocker and external AR/AP importer gaps; current readiness still labels these unsupported/unverified. Do not route an external balance through an unrelated sale/purchase merely to bypass that gap.
4. Rehearse on a separately authorized disposable database with tenant/site denial, replay, conflicting revision, period lock, interrupted commit and independent tie-out. P11 does not perform this rehearsal.
5. Obtain distinct maker and accountant acceptance bound to the source hash, mapping version, cutoff, candidate revision and totals. If inputs change, invalidate approval. Posted mistakes need reviewed corrections, not destructive resets.

## Close review — acceptance contents

Accountant must specify required period statements and supporting schedules for E02, not infer them from a chart's labels. Working papers must link opening balances, posted activity, stock valuation, cash shifts, bank/provider evidence, AR/AP aging and accepted adjustments to the period trial balance and reports. Show both unresolved and resolved exceptions, reviewer independence, period/source revision, attachment manifest and access permissions. A balanced journal alone does not establish complete or correct accounting.

Require evidence freshness: changed source, late statement, corrected tax basis, revoked accountant grant or reopened period must prevent reuse of stale acceptance. Separate accountant review of the close pack from statutory filing and from a provider's settlement confirmation. Retain authorized export/read access and redacted views without exposing payroll or credentials. Restore and deployed evidence retrieval remain separate operational gates.

## Planned independent expected-result cases for P21

**NOT_RUN.** QA must retain a separately authored expected-result sheet signed by the competent reviewer, with source article/period, input/source hashes, calculation steps, exact output/denial, tolerance/rounding, reviewer and fixture version. Do not generate golden outputs from the implementation. Numeric tax/payroll expectations are deliberately pending E03/E07; these are executable-case specifications to finish after review, not claimed calculations.

| Case | Input / disturbance | Independent expectation to establish | Owner / later evidence |
|---|---|---|---|
| C01 Regime selection | Retail entity facts; boundary turnover/activity and excluded sector | Documented applicable regime or explicit unsupported decision; no silent fallback from a taxRegime string | Accountant; signed applicability sheet + bounded runtime/UI cases |
| C02 Opening conservation | Unchanged P03 synthetic source and controls | Exact quantities/values above, every accepted source covered once; no rejected row posted | Accountant + QA; independent sheet, later DB tie-out |
| C03 Duplicate/imbalanced opening | Balanced duplicate stock debit/offset; one-unit error; changed input with unchanged approval | Denial even if overall debits equal credits; unchanged accepted source evidence | QA; pure negative + transaction rollback/replay |
| C04 Ordinary taxed/exempt/credit-note transaction | Reviewed transaction matrix, including exempt or zero treatment where legally applicable | Reviewer-authored base/tax/gross and journal lines; no inference that absence means exemption | Tax/accounting reviewer; exact calculation and ledger evidence |
| C05 Effective-date/rounding boundary | Before/on/after a reviewed rule change; invoice/line and aggregate rounding edges | Correct pinned version and independent amounts; no retroactive mutation of prior evidence | Reviewer + QA; pure and real DB checks |
| C06 CNPS families | Employer sector/risk category, ceiling boundaries, absent/invalid classification | Independent amounts or explicit denial; SOURCE_CHECKED never accepted as production review | Payroll reviewer; signed legal basis and fixture runner |
| C07 IRPP scope | Ordinary pay, dependent treatment, taxable benefits/deductions, zero withholding, cumulative/YTD correction | Full reviewed formula/status and exact net/register totals; unsupported cases remain blocked | Tax/payroll reviewer; independent expected outputs, no new formula in P11 |
| C08 Full payroll reconciliation | All applicable obligations, payslip/register/payments/GL, retroactive correction | Gross-to-net, employer cost and liability tie-out; CNPS-only success insufficient | Payroll/accounting reviewer; DB and controlled operator checks |
| C09 Admission and stale proof | Source-check only, missing release hash, changed rule/input hash, different country or non-monthly run | Denial without bypass; retain archived read evidence | QA/security; current mocked and DB boundary checks required later |
| C10 Authority lifecycle | Accepted/rejected/amendment/payment-due receipt, timeout and retry | Evidence-bound status; sandbox cannot imply statutory acceptance; uncertainty remains visible | Integration/domain; official contract/sandbox then separately authorized live proof |
| C11 Close corrections | Late provider statement, reopening, source revision after review | Invalidate stale proof, require independent rereview and balanced adjustment | Accountant + QA; period DB and UI evidence |
| C12 Privacy/access/exit | Revoked grant, wrong tenant/site, payroll-sensitive attachment, retention hold | Role-correct denial/redaction and authorized complete retained evidence; no invented deletion date | Legal/security; approved policy + access/export/restore checks |

P20's payment format, fees, reversal and settlement cases are in [provider prerequisites](PROVIDER_PREREQUISITES.md). They do not replace statutory expected results.

## Review record template and completion rule

Record ID; capability; country/entity/sector; period and effective dates; source document/page/hash; candidate commit plus relevant dirty-file hashes; implementation rule/version; independent expected sheet/hash; actual evidence classes; differences and resolution; reviewer name/qualification/independence; maker; decision APPROVE_EXACT_SCOPE / REJECT / NEEDS_EVIDENCE; exclusions; expiry/review trigger; signed date and evidence reference.

**Current record:** decision NEEDS_EVIDENCE; E01–E10 OPEN; reviewer/maker assignment and signature absent. No approval field is prefilled. A later prompt may consume the packet and existing synthetic controls; it cannot treat document completion as an approval. Re-review on law/provider change, new country/sector/regime, changed rule/cutoff/mapping, unaddressed material discrepancy or changed source evidence. Country lead owns the register, QA owns evidence reproducibility, qualified reviewer owns the domain decision.
