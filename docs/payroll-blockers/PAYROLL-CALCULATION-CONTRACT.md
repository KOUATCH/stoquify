# Payroll calculation contract — reviewer draft

Contract ID: `STOQUIFY-CM-PAYROLL-CALCULATION-2026-11-02-DRAFT-4`  
Prepared: 29 October 2026; updated: 2 November 2026. Status: **DRAFT — REQUIRES EXPERT REVIEW**. Production use allowed: **false**.

This document prepares ENG-01 so that ENG-02 through ENG-08 can be implemented against explicit, independently reviewed requirements. Revision 2 adds source-backed proposed treatments from official Cameroon publications. No statutory treatment is approved, and the present implementation is not certified. The existing runtime identifier `stoquify-payroll-calculator.v1` is recorded for compatibility; this draft does not approve that calculator.

Use the companion [reviewer checklist](PAYROLL-CALCULATION-REVIEWER-CHECKLIST.md) and [structured return form](PAYROLL-CALCULATION-REVIEW-RETURN.json). The [current source manifest](PAYROLL-CALCULATION-SOURCE-MANIFEST.json) records inspected file hashes and anchors. The existing [unblock register](PAYROLL-UNBLOCK-REGISTER.md) remains authoritative for overall task status.

## Research revision — 29 October 2026

**12 of 16 decisions now have partially source-supported proposals; 0 are approved.** D-10 has no determinative prescription for application correction identity in the inspected sources; D-12, D-13 and D-15 require engineering/owner decisions. All 16 remain PENDING_REVIEW and ENG-02 through ENG-08 remain pending. This count measures populated research, not completed tasks.

The main findings are separate CNPS branch ceilings, the 30% professional-expense deduction capped at 4,800,000 FCFA/year, the 500,000 annual salary allowance, annual progressive IRPP, 10% CAC, calendar-year reporting, the validated annual refund/credit procedure, and the 2026 exceptional-income change. Dates, calculation method, rounding and independent fixtures still need qualified review. The [official research index](../unblock/PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json) records proposals, exact source hashes and remaining questions for every D-ID.

## Database engineering update — Draft 4

Updated 2 November 2026. Real PostgreSQL: 7/7 service transaction tests and 3/3 SQL approval/rollback checks passed on a fresh local database after 120 migrations. Existing mocked/unit regression: 152/152 tests across five suites passed. Disposable-target guards: 7/7 pure checks passed.

ED-05 closes the scoped transaction-proof gap. The fresh target is `stoquify_local_payroll_blockers_20261102_b27d8e04`, localhost, PostgreSQL 17.5. No application dataset was reset or migrated. The database contains synthetic test records and is retained for inspection; reruns require a different fresh name.

| Evidence | Result | Exact boundary |
|---|---|---|
| Shared production transaction helper | PASS | Real Serializable write contention retries from a new snapshot; real uniqueness conflicts retry and exhaust at three attempts; failed attempts leave no audit rows. |
| Rollback and injected caller | PASS | Domain failure rolls back without retry. An injected transaction inherits caller isolation and rolls back with its caller; it is not upgraded to Serializable. |
| Commit acknowledgement | PASS, injected loss | Real commit followed by synthetic response loss; idempotent callback replay finds one retained event. No physical network interruption. |
| Calculation service | PASS, stored-run replay only | Two concurrent replays return the same stored run; changed payload and cross-tenant period access are denied. No new statutory run is calculated. |
| SQL approval race | PASS | Two pre-write snapshots; one winner, one SQLSTATE 40001 loser; exactly one transition, event, outbox and audit. Duplicate evidence rejected; injected failure rolls back all effects. |

The first SQL harness run timed out because it awaited both write-preparation phases while the close-source revision trigger serialized them. The harness now lets each contender proceed to commit after both snapshots are established and has bounded database statement/connection timeouts. The first service test run had six passes and one assertion defect (`statusCode` instead of `status`); this was corrected without changing runtime error behavior. Initial evidence is retained under `evidence/attempt-2026-10-29` in the publication folder.

Full new-payroll creation with admitted statutory rules, cross-month history membership, approval-time stale-history comparison, real network-loss testing, and the complete downstream lifecycle remain unverified. The acknowledgement-loss test injects a client error after a real commit; it does not cut the network. SQL approval checks exercise migrations/triggers directly, not the full authenticated approval service.

All 16 decision records remain PENDING_REVIEW; all 22 independent fixture expectations remain null. ENG-02 through ENG-08 remain pending parent tasks. Current ENG-04 work is to integrate the verified boundary with approved history and same-day/off-cycle rules, then prove complete new-run/correction creation. ENG-07 still requires the full register, payslip, posting, declarations, payments and close lifecycle with independently approved expectations.

Workflow contract: passed at initial inspection on 29 October; recheck on 2 November failed on unrelated pre-existing `test:dev:startup -> next.config.mjs` fingerprint drift. This was recorded, not repaired by blindly updating the registry. The scoped test commands were individually inspected. No full project typecheck, browser journey or production release is claimed.

Evidence: [database engineering report](PAYROLL-UNBLOCK-REPORT-2026-11-02-ENGINEERING-V4.md), [machine results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json).

## Historical engineering continuation — Draft 3 / 29 October 2026

**Statutory approvals remain pending.** Four engineering selections are recorded below; completed substeps do not close ENG-02 through ENG-08. All D-01 through D-16 review statuses and all independent F-01 through F-22 outputs remain pending. The earlier 12 source-supported proposals are preserved.

| Selection | Implemented or selected | Exact remaining boundary |
|---|---|---|
| ED-01 / D-04, D-06, D-08 | Unknown is not zero. Supported YTD evaluation requires both explicit prior base and prior withheld amounts; each named adjustment requires an own, explicit, finite value. Current base and monetary rule values reject NaN/Infinity. Explicit zero remains valid. The fixture adapter preserves absent history instead of defaulting to zero. | Does not certify the supplied history as complete, select the legal tax year/method, supply certified mappings, or change rounding/refund/rate policy. |
| ED-02 / D-12 | For an owning Prisma client, calculation uses the existing payroll transition helper: SERIALIZABLE transaction, at most three attempts for P2034/P2002, re-query idempotency on every attempt, return 409 after exhaustion, do not retry domain errors, redact unexpected internal errors. No external side effect is added to the retry callback. | An injected TransactionClient inherits its caller transaction; caller owns isolation and retry. Same-day statutory membership, stale-history checks at approval/posting, real contention/rollback and uncertain-commit proof remain pending. This is not full ENG-04 completion. |
| ED-03 / D-11, D-13 | New accumulator proofs use version 2 and bind each ordered prior run/line identity, employee, currency, pay date, run status, document hashes, calculation-snapshot hash and recorded line amounts. observedHistoryHash binds that observed list and is included in the accumulator hash. Missing snapshots remain explicitly null. Existing frozen records are not migrated or rewritten. | A fingerprint proves which source data was observed, not legal inclusion or completeness. Legacy proof reads remain supported. Approval-time comparison/invalidation and migration acceptance are not implemented by this slice. |
| ED-04 / D-14, D-16 | Keep mocked/unit, source-integrity, PDF, real-database, statutory-review and release evidence separate. Synthetic zero values and test-only review labels never populate canonical reviewer records. Keep the September-only runner and October pending scope until admitted rules and supported inputs exist. | Independent statutory F-01 through F-22 expected outputs, real integrated acceptance and production admission remain pending. No missing attendance is inferred. |

**Verification:** 152 tests across five suites pass. Evidence is synthetic/unit and mocked service execution, including the real evaluator/service calls with mocked persistence, missing-input denial before run/event creation, conflict retries/replay, production-admission denial, fixture validation and register compatibility. Equal totals with changed prior status or snapshot produce a different observed-history hash; unchanged history produces the same hash. The original three-suite baseline passed 99 tests.

The broader run initially exposed synthetic fixtures relying on omitted zero inputs and an adapter defaulting missing YTD to zero. The adapter was corrected and synthetic scenarios now state their known zero amounts explicitly. No runtime country-pack rate, approval identity or signed fixture was filled by this change.

In the historical Draft 3 slice, no real PostgreSQL, provider operation, full project typecheck or browser journey was executed; the Draft 4 update above supersedes that database limitation. Mock retries do not establish database rollback or concurrent commit safety. PDF/source validation is separate evidence. See [retained engineering results](../unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) and the [scoped task diff](../unblock/research/engineering-task.diff).

### Seven-task remaining work after this slice

| Task | Completed substep | Still required |
|---|---|---|
| ENG-02 | Explicit YTD/adjustment presence and finite-value checks in evaluator; fixture adapter preserves omissions | Approved algorithm and certified service input mappings; authoritative amounts still must be wired into the evaluator. Unsupported wiring now fails closed. |
| ENG-03 | Version-2 fingerprint binds observed historical source identities and snapshots | Approved tax-year/membership/opening-balance policy, period-gap/completeness checks and approval-time stale-history denial. |
| ENG-04 | Owning-client SERIALIZABLE transaction and existing three-attempt conflict/replay handling | Current production callers audited (both use owning client); future injected callers require an isolation/retry contract. Approved same-day/off-cycle policy; real PostgreSQL contenders, rollback, uncertain-commit and stale-history tests. |
| ENG-05 | Existing correction-only lifecycle preserved | Approved full/delta/reversal/negative/cross-year semantics; implementation and independent evidence. |
| ENG-06 | Invalid/non-finite money and absent required input denied | Approved adjusted bases, branch-specific social caps, tax/CAC storage, rounding and refund handling; no proposed statutory number installed. |
| ENG-07 | Five focused suites pass; proof change and register consumers checked | Independent statutory expectations, real integrated lifecycle and all eleven release families; no F-case marked independently approved. |
| ENG-08 | Release/runner/October boundaries retained | ENG-07 acceptance, admitted date-effective rules and supported D-15 scope before chronological full execution. |

### Engineering decision details and rollback

D-12 selects SERIALIZABLE for transactions owned by calculation and reuses the existing transition retry/error policy; supplied transaction clients remain the responsibility of their caller. This scope is explicit and is not a claim that every call path is proven serializable. No automatic external retry is introduced for an unknown commit outcome.

Current production caller audit: actions/payroll/payroll-control.actions.ts and prisma/disposable-business-workflows.ts both call calculatePayrollRun without an injected client, so both use the owning-client SERIALIZABLE/retry boundary. No additional production caller change is needed in this checkout. Future injected TransactionClient callers must establish isolation/retry explicitly; mocked callers are not database proof.

D-13 selects a versioned source fingerprint over the existing pay-date/run-ID/line-ID ordering. It does not select additional legal history members. Missing evidence remains missing, and existing version-1 snapshots are left untouched. A future approval gate must recompute and compare the selected history before accepting its evidence; a hash alone is not that gate.

Rollback only the hunks in the retained task diff and the added isolated Jest configuration. Preserve preexisting service edits and all frozen financial records. Future calculations using proof version 2 create new evidence; no database migration, historical backfill or production publication was performed. This does not authorize rewriting a retained snapshot during rollback.

## 1. Status vocabulary and scope

- **RECORDED IMPLEMENTATION:** established by current source inspection; not a finding that the behavior complies with law.
- **PROPOSED ENGINEERING REQUIREMENT:** acceptance rule for reviewer/engineering agreement; not yet implemented or approved merely because it appears here.
- **EXPERT DECISION REQUIRED:** a qualified Cameroon payroll reviewer must provide the treatment, legal basis, dates and independent examples. Research proposals are populated; the approved selection remains pending.
- **OWNER DECISION REQUIRED:** operational scope or technical design needs a named responsible owner; it is distinct from statutory approval.

Recorded scope: Cameroon (`CM`), monthly payroll, proposed release scope `CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER`, currency default `XAF`. Target dataset: `stoquify_replay_dataset_20261028_01`, localhost:5432/public, synthetic organizations `synth12_douala`, `synth12_yaounde`, `synth12_bafoussam`. The target dataset has not been queried for Draft 4; database tests used only the fresh synthetic target named above.

The intended 36 organization/month combinations span November 2025 through October 2026. Pay dates are month-end: 2025-11-30, 2025-12-31, 2026-01-31, 02-28, 03-31, 04-30, 05-31, 06-30, 07-31, 08-31, 09-30 and 10-31. Attendance observations stop on 2026-10-28. October completion remains an owner decision under ENG-09. Pay-date coverage is recorded seed intent, not an approved statutory calendar.

## 2. Evidence-supported implementation baseline

| Area | Recorded implementation | Review implication |
|---|---|---|
| Country pack | Current pack `CM-2026.1` begins 2026-01-01. CNPS is `SUPPORTED_DRAFT` / `SOURCE_CHECKED`; IRPP is `REQUIRES_EXPERT_REVIEW`, with `productionCalculationSupported: false`. | Do not infer coverage for November/December 2025 or promote the pack from this draft. |
| Evaluator interface | `taxableBaseAmount`, optional `ytdTaxableBaseAmount`, `ytdTaxWithheldAmount`, `adjustmentValues`, plus capability and currency. | Supported YTD mode now requires both explicit history amounts; named adjustments require explicit finite inputs. Explicit zero is accepted, but is not proof of complete history. |
| Service integration | `calculatePayrollRun` calls the evaluator with current taxable base, capability and currency only. | ENG-02 must supply authoritative YTD and named adjustment inputs where the reviewed mode requires them. |
| YTD population | Prior nondeleted runs in the same organization, status POSTED or PAID, with pay date at/after the policy start and strictly before the current pay date. Matching employee lines only. | Same-day runs and other statuses are excluded; inclusion policy requires a reviewed decision. |
| Year basis | Accounting settings supply fiscal-year start; absent settings default to January 1. Dates are normalized to UTC days. | Tax year must be explicitly confirmed independently of the tenant accounting year. |
| Prior amounts | Snapshot amount, then available line amount, then zero; missing snapshot/hash counts are retained in accumulator proof. | Counting missing evidence is not equivalent to denying an incomplete history. |
| Ordering and transactions | Database ordering uses creation time; proof lines sort by pay date, run ID, line ID. Calculation now uses `inPayrollTransitionTransaction`: owning-client SERIALIZABLE with bounded conflict retries. Injected transactions inherit their caller’s settings. | Source inspection does not prove a stable concurrent tax history. |
| Corrections | Tax is evaluated before the original-line delta is applied. Effective amounts subtract original snapshot amounts; accumulator proof is built afterward. | Correction and reversal membership must be defined before evaluating tax. |
| Stored base | `currentAmounts.taxableBaseAmount` uses the pre-evaluator-adjustment base. | Define the exact stored, cumulative, register and payslip bases in D-11. |
| Dataset runner | Only `m===10` attempts calculation, using September 2026's key. October attendance returns `CURRENT_PERIOD_PENDING`. | ENG-08 needs an accepted chronological lifecycle, not simply removal of the September condition. |

These observations come from the evaluator, payroll-control service, admission gate and disposable runner identified in the source manifest. Existing action graph nodes were checked for navigation; behavioral conclusions above use current service source, not graph coverage or historical test totals.

### Existing numeric candidates — not approved rates

The retained source-facts worksheet records the following literal pack values. They are comparison inputs for the reviewer, not values selected by this contract. All four CNPS envelopes begin 2026-01-01 in the current pack.

| Pack field | Existing literal | Outstanding review |
|---|---|---|
| Pension employee / employer / total | 420 / 420 / 840 basis points | Legal applicability, contribution base, employee/employer split, effective periods. |
| Pension monthly / annual ceiling | `monthlyCeilingMinorUnits: 750000`; `annualCeilingMinorUnits: 9000000` | Exact amount unit and whether/how each ceiling applies. The inspected calculation uses the monthly field directly as a Decimal ceiling. |
| Family allowance general / agriculture / private education | 700 / 565 / 370 basis points | Sector classification and applicable base/ceiling. |
| Occupational risk A / B / C | 175 / 250 / 500 basis points | Risk classification and applicable base/ceiling. |
| IRPP | No approved executable brackets; placeholder mode `OFFICIAL_IRPP_FORMULA_REVIEW_REQUIRED` | Reviewer must supply formula, treatment, brackets and dates; do not insert synthetic test rates. |

The service currently uses a common capped social base in the inspected contribution calculations. Research S-02 now supports separate capped pension/family and uncapped occupational-risk bases; the reviewer must approve the applicable treatment before implementation. The annual ceiling's presence in the pack does not establish its application in the service.

## 3. Existing evaluator semantics to accept or replace

**RECORDED IMPLEMENTATION.** Only `PROGRESSIVE_PERIOD` and `PROGRESSIVE_YTD` are supported modes. There is no annualization operation in this evaluator. If the reviewed method needs annualization or another algorithm, record it as an explicit contract change; do not label it YTD merely to fit the interface.

Let B be current taxable base, A the adjusted current base, Y prior taxable base, W prior withholding, and P the progressive-bracket function. Existing sequence:

1. Apply each taxable-base adjustment to B. Each adjustment uses a fixed amount plus either its named input or that input multiplied by `rateBps / 10000`; an optional upper cap is applied. Each adjustment amount is rounded to two decimals. ADD/SUBTRACT is then applied, and the resulting aggregate base is floored at zero.
2. For period mode, evaluate P(A). For YTD mode, evaluate P(A + Y), then subtract W. Brackets use sorted, nonoverlapping ceilings and nonnegative rates in basis points.
3. Floor the raw tax at zero. Apply tax-amount adjustments, with another zero floor; apply optional minimum and maximum tax bounds; round using `roundingScale`, default two decimals.
4. Return base, adjusted base, cumulative base, tax and trace. No explicit rounding mode is supplied at these call sites; the deployed Decimal configuration and legally required tie rule must be resolved in D-08.

This sequence is descriptive. **All statutory choices in it remain subject to D-02 through D-11.** In particular, it discards a negative raw YTD difference before subsequent adjustments; that is not an approved refund policy.

Existing evaluator tests contain synthetic examples: base 200000 with a capped 25000 deduction and 1000 tax relief expects adjusted base 175000 and tax 6500; another YTD example expects 4250. Their fixture brackets and amounts demonstrate software behavior only. The synthetic tests were rerun in Draft 3 and still cannot serve as independently reviewed Cameroon tax outcomes.

## 4. Required decisions and return fields

Every D-record requires: selected treatment or formula; rationale; exact legal reference/provision where statutory; effective start/end; covered population and exclusions; fixture IDs; reviewer identity and review date; decision status; and any implementation constraints. For technical/operational decisions, name the responsible engineering or dataset owner and distinguish their acceptance from legal review. Optional open-ended end dates may be null only with an explicit reviewed explanation.

### D-01 — Applicable periods and population

**EXPERT DECISION REQUIRED.** Supply separate approved 2025 and 2026 applicability windows, employer/employee eligibility, residency or other classification needed by the formula, and version transitions. Confirm the single-employer scope and treatment of midyear joiners and prior-employer amounts. Existing evidence: current pack starts in 2026; 2025 scope is unresolved. Return: legal provisions, scope exclusions, effective rule versions. Fixtures: F-01, F-04, F-05. Affects ENG-02, ENG-03, ENG-07, ENG-08.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Use separate date-effective 2025 and 2026 envelopes. CGI arts 24–25 and 30 support residence/source-based scope, with treaty exceptions. The 2024 code already contains the benefit schedule and 4,800,000 FCFA expense cap, corroborated by circular 2024 paragraphs 112–113. Circular 2026 paragraphs 144–146 expressly changes the qualifying exceptional-income abatement from 25% to 35% for the 2026 reform. These are source-backed candidates, not an approved 2025 consolidated rule set.

**Evidence:** S-01, S-02, S-03, S-04, S-06; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Qualified reviewer: confirm complete 2025 amendment chain and operative dates, residency/treaty exclusions, employee/employer categories and whether exceptional income is supported or explicitly denied. Return signed 2025/2026 envelopes; do not extrapolate CM-2026.1 backwards.

### D-02 — Period, cumulative or annualized algorithm

**EXPERT DECISION REQUIRED.** Select and fully specify the method, bracket period, annualization/proration factors if any, partial employment periods and regularization timing. Existing evaluator has period/YTD modes only. Return: executable formula and independent calculations, not a mode name alone. Fixtures: F-02, F-03, F-04. Affects ENG-02, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** CGI art 69 states annual progressive brackets; art 81 requires employer withholding at each payment. The DGI indicative table supplies monthly comparisons. Candidate annual ordinary-income model: G = approved annual taxable gross including approved benefits; E = min(30% × G, 4,800,000 FCFA); R = qualifying mandatory employee retirement contributions; B = G − E − R − 500,000 FCFA. Apply art 69 to the reviewed nonnegative taxable base and CAC = 10% of principal IRPP under art 71. This is an annual model proposal, not an approved monthly or YTD algorithm. The base definition and benefit construction need review before this notation is executable.

**Evidence:** S-01, S-07; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer must select monthly conversion/annualization, partial-year/joiner treatment, cap consumption and regularization. Do not feed annual thresholds directly into current-month gross or treat P(Y+A)−W as validated by these provisions. Resolve exceptional-income art 65 bis separately.

### D-03 — Tax-year boundaries

**EXPERT DECISION REQUIRED.** Define year start/end, controlling date and time zone, year-reset behavior and cross-year corrections. State whether payroll tax year may follow accounting fiscal year. Existing policy does so when accounting settings exist. Fixtures: F-04, F-05, F-16. Affects ENG-03 through ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** CGI art 74 bis(5), PDF p.75, expressly requires the annual pay/withholding statement for the preceding calendar year. Arts 68 and 81 tie salary liability/withholding to availability/payment. Proposed tax accumulation window: January 1 through December 31, independent of the tenant accounting fiscal year, with actual payment/availability date recorded separately from earning period.

**Evidence:** S-01; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer to approve tax-year mapping for payroll and delayed/backdated/cross-year corrections; engineering to define the Cameroon local-date/time-zone conversion. The annual statement supports the calendar proposal but does not prescribe every internal YTD algorithm.

### D-04 — Prior history membership and completeness

**EXPERT DECISION REQUIRED + ENGINEERING DESIGN.** Specify eligible statuses, prior-employer balances, off-cycle membership, currency separation and authoritative opening balances. Define proof of a genuine zero opening balance versus unavailable history. Proposed engineering rule: missing/stale/partial required history must block, with an explicit approved migration path. Fixtures: F-05, F-06, F-07, F-17. Affects ENG-02, ENG-03, ENG-04.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Art 74 bis(2),(5) requires annual income and withholding information; art 80 accounts for source withholding/advances in annual liability. Preserve separate actual payments, withholding, remittance and supported opening balances. Proposed internal gate: required unavailable history is an error, while genuine zero requires affirmative evidence.

**Evidence:** S-01; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Payroll reviewer/owner must decide prior-employer and off-cycle membership; engineering must map real payment/withholding facts to POSTED/PAID and correction statuses, gap detection and approved opening-balance migration. The statute does not define application statuses.

### D-05 — Taxable and social bases

**EXPERT DECISION REQUIRED.** Define treatment of salary, paid/unpaid leave, overtime, taxable allowances, benefits in kind, deductions/recoveries and employee contributions. Specify each social-contribution base and cap independently, including annual versus monthly ceilings. Existing service computes components and a common capped social base; approve or replace that behavior explicitly. Fixtures: F-08, F-09, F-18. Affects ENG-02, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** CGI arts 31–34 support qualifying exemptions, inclusion/valuation of benefits and deduction of mandatory retirement contributions. Art 33 percentage valuations on gross taxable salary: housing 15%; electricity 4%; water 2%; each domestic worker 5%; each vehicle 10%; food 10%; telephone 5%; fuel 10%; guarding 5%; internet 5%. Unlisted benefits use actual cost; cash equivalents use actual amount unless expressly exempt. CNPS pension is 4.2% employee + 4.2% employer. Family rates are 7% general, 5.65% agricultural, 3.7% private education. Decree art 4 limits pension/family remuneration to 750,000 francs monthly / 9,000,000 annually. Occupational risk is employer-only A 1.75%, B 2.5%, C 5% on remuneration less professional expenses (art 8); art 4 does not extend that ceiling to occupational risk. Family contributions are also employer-only (art 10).

**Evidence:** S-01, S-02, S-03, S-04; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer must validate branch-specific remuneration/exemptions, benefit valuation denominator and anti-double-counting, cap allocation across irregular/multiple payments, sector/risk classification and current applicability. Do not import the tax 30% expense deduction into the social base without its own authority. The common capped service base conflicts with the proposed ATMP treatment. Leave/overtime/recovery amounts remain unresolved pending operative labour instruments and applicable collective agreements.

### D-06 — Adjustment input dictionary

**EXPERT DECISION REQUIRED + PAYROLL OWNER.** For every inputKey, return source record/field, meaning, currency/unit, sign, applicable date, approval evidence, cap/rate, whether it changes the taxable base or final tax, and treatment when missing. Proposed logical keys are now populated in the structured return; certified field mappings and runtime keys remain pending. Proposed engineering rule: absent required input must not silently become zero. Fixtures: F-09, F-10. Affects ENG-02, ENG-03, ENG-06.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Prefill a proposed logical dictionary for professionalExpenseDeduction (30%, annual cap 4,800,000), mandatoryRetirementDeduction (actual qualifying employee contribution), annualSalaryAllowance (500,000), benefitValuations (art 33), professionalExpenseReimbursementExclusion (art 31 conditions), irppPrincipal and cacSurcharge (10% of principal). Exceptional income is a separate eligibility/calculation branch, not a generic percentage adjustment. Other payroll levies require their own obligation catalogue.

**Evidence:** S-01, S-02; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Payroll/engineering owners must bind each logical item to certified source fields, determine sign and stage, period allocation, required evidence, missing-input denial and actual evaluator keys. No invented field mapping or omission-as-zero is authorized.

### D-07 — Brackets, reliefs and bounds

**EXPERT DECISION REQUIRED.** Supply actual brackets, ceiling inclusivity, rates, family/dependant treatment, contribution deductibility, minimum/maximum amounts and combination order. State whether reliefs are periodic, annual or cumulative and how caps are consumed across runs. Existing test values must not be copied. Fixtures: F-02, F-08, F-09, F-11. Affects ENG-02, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Populate annual IRPP brackets: first 2,000,000 FCFA at 10%; next 1,000,000 at 15%; next 2,000,000 at 25%; excess over 5,000,000 at 35% (art 69). Art 29 supplies annual salary allowance 500,000; art 34 supplies 30% expense deduction capped 4,800,000/year and mandatory retirement deduction; art 71 adds CAC equal to 10% of principal tax. Art 81 exempts gross monthly salary strictly below 62,000 from employer withholding; exactly 62,000 is not inside that exemption, although calculated liability can be zero. Art 65 bis adds conditional exceptional-income treatment, including the 2026 35% abatement; it is not a general bonus exemption.

**Evidence:** S-01, S-03, S-04, S-06; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer to approve boundary/decimal representation, deduction order and monthly allocation, exceptional-income eligibility and three-year history, any dependant relief and other exemptions, and bounds. No independently verified basis was found here for a new dependant deduction or a universal minimum/maximum tax. The below-62,000 withholding exemption must not be generalized into exemption from every payroll levy.

### D-08 — Money units and rounding

**EXPERT DECISION REQUIRED + ENGINEERING DESIGN.** Define currency amount unit, minor-unit conversion, precision and tie rule at each stage: input, adjustment, bracket slice, contribution, tax, correction delta and aggregate. Resolve `MinorUnits` field naming versus the service's Decimal arithmetic. Specify rounding residual handling; do not assume two decimals is a statutory rule. Fixtures: F-08, F-11, F-18. Affects ENG-02, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Official amounts are expressed in francs/FCFA: the CNPS ceiling is 750,000 francs, not 7,500 francs. Proposed contract display unit is one FCFA; require an explicit storage-unit conversion rather than infer units from MinorUnits names. Indicative-table p.1 shows gross 64,000 → principal IRPP 45 and CAC 4, and gross 65,000 → IRPP 110 and CAC 11. These are source comparison rows, not proof of a universal tie rule or intermediate rounding sequence.

**Evidence:** S-01, S-02, S-07; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer must supply applicable scale/tie rule and rounding stage for each tax/contribution, correction, total and declaration; engineering must reconcile unit names and residual allocation. Do not adopt two decimals or infer half-up/half-even from a few table rows.

### D-09 — Negative tax, credits and refunds

**EXPERT DECISION REQUIRED.** Choose the permitted treatment of overwithholding: zero floor, carry-forward credit, refund, correction liability or another supported process; identify who may authorize it and its declaration/accounting effect. Existing evaluator floors negative raw tax before adjustments. Fixtures: F-12, F-14, F-16. Affects ENG-05, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** CGI art 74 bis(4), 2026 PDF p.75 and 2024 p.71, allows an overpayment shown by the annual declaration to be refunded or applied to future taxes at the taxpayer’s request, after validation by competent services. Preserve an identifiable overpayment claim and the validation/request evidence. This establishes a procedure; it does not authorize automatic employer net-pay refunds or a silent negative-tax clamp.

**Evidence:** S-01, S-03; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer must distinguish employer correction from taxpayer annual claim, choose the allowed interim treatment, authority and evidence, and map approved credits/refunds into future withholding, declarations and ledger. Current zero floor is not approved merely because the annual refund procedure exists.

### D-10 — Corrections, replacements and reversals

**EXPERT DECISION REQUIRED + ENGINEERING DESIGN.** Define event identity, original/replacement chain, whether each event contributes full values or deltas, effective pay-date/year, inclusion/exclusion of reversals, and recalculation of downstream runs. Specify negative deltas and already paid/declared periods. Proposed invariant: one economic effect per chain, no double accumulation. Fixtures: F-13 through F-16, F-20. Affects ENG-02, ENG-03, ENG-05, ENG-07.

**Research update — NO_DETERMINATIVE_SOURCE_FOUND.** No determinative official prescription for application correction/reversal identity or full-versus-delta storage was found in the reviewed sources. Retain the proposed invariant of one economic effect per correction chain, preserving actual payment/withholding and year attribution.

**Evidence:** No determinative official rule for this internal choice; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer and engineering must decide replacement/delta semantics, reverse/reissue treatment, negative deltas, already-paid/declared cases and downstream recomputation. A legal provision about annual claims does not settle this data model.

### D-11 — Stored and presented amounts

**EXPERT DECISION REQUIRED + ACCOUNTING OWNER.** Identify which base is authoritative for YTD: raw current base, adjusted base or another explicitly defined amount. Define full/current/delta fields, withheld amount versus remitted amount, and mapping to register, payslip, liability, declaration and ledger. Preserve raw inputs and adjustment trace alongside authoritative outputs. Fixtures: F-09, F-13, F-18, F-19. Affects ENG-02, ENG-03, ENG-06, ENG-07.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Arts 81–82 distinguish withholding shown on a payslip from later remittance; art 74 bis requires annual gross gains and withholding detail. Proposed distinct outputs: gross taxable income, professional-expense allowance, deductible pension, annual allowance allocation, net taxable base, principal IRPP, CAC, total tax withheld, remitted amount, each employee/employer social contribution, and correction deltas. Keep raw/current/annual bases and trace distinct; do not report employer charges as employee deductions.

**Evidence:** S-01, S-02; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer/accounting owner must select the authoritative YTD base, stored full/delta identities, payslip/declaration/journal mappings and net-pay reconciliation. Validate whether current incomeTaxAmount includes CAC; never assume it does.

### D-12 — Same-day ordering and concurrent changes

**PAYROLL POLICY REVIEW + ENGINEERING DESIGN.** Reviewer defines legal ordering constraints; engineering selects stable sequence/version and transaction strategy. Cover two runs sharing a pay date, backdated input, concurrent correction/posting, retry and uncertain commit. Proposed acceptance: recompute/deny on stale history; no duplicate tax or writes after rollback. Fixtures: F-07, F-17, F-20. Affects ENG-03, ENG-04, ENG-07.

**Research update — OWNER_ENGINEERING_DECISION.** Official sources reviewed do not select database isolation, ordering keys or retry mechanics. Retain the engineering proposal: stable sequence and history revision, conflict detection, atomic calculation persistence, stale-history recomputation/denial and idempotent retry.

**Evidence:** No determinative official rule for this internal choice; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** ED-02 selects and implements owning-client SERIALIZABLE with bounded retries. Engineering must audit/enforce injected TransactionClient isolation/retry and provide real PostgreSQL contention, rollback and uncertain-commit evidence; reviewer must confirm same-day/off-cycle membership. Approval-time stale-history checks remain required.

### D-13 — Snapshot and evidence validity

**ENGINEERING DESIGN + REVIEWER ACCEPTANCE.** Define required history hashes/revisions, certified-input provenance, immutable calculation trace, invalidation triggers and authorized migration of older snapshots. Changes to rules, inputs or correction ancestry must invalidate affected acceptance evidence. Do not treat a syntactically valid hash as proof of a correct calculation. Fixtures: F-06, F-17, F-19, F-20. Affects ENG-03 through ENG-08.

**Research update — OWNER_ENGINEERING_DECISION.** Official sources reviewed do not establish application hash formats or snapshot-version semantics. Retain immutable bindings among certified inputs, rule version, source/approval artifacts, included history and correction ancestry, with downstream invalidation when dependencies change.

**Evidence:** No determinative official rule for this internal choice; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** ED-03 implements version-2 observed-source fingerprints without rewriting legacy snapshots. Engineering/QA must implement and test history completeness, approval-time fingerprint comparison/invalidation, authorized migration and downstream lifecycle binding; reviewer must accept the trace for the approved calculation policy.

### D-14 — Independent acceptance tolerance

**EXPERT DECISION REQUIRED + QA.** Supply independent expected amounts for F-01 through F-22 as applicable, intermediate calculation steps, exact rounding and allowed tolerance. Default proposal for deterministic monetary fields is exact equality after the approved rounding rule; approve or replace it. Explain excluded fixtures; never equate exclusion with passing evidence. Affects ENG-07 and every implementation task.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** Add official-table benchmark rows as a separate evidence class: gross 63,500 → IRPP 12 / CAC 1; 64,000 → 45 / 4; 65,000 → 110 / 11 (S-07 p.1). Extend F-02/F-08/F-09/F-11/F-18 for the 62,000 withholding boundary, each annual bracket, 750,000 branch-specific social cap, 4,800,000 annual expense cap, CAC separation and exceptional-income version transition. Proposed tolerance remains exact equality after approved rounding.

**Evidence:** S-07, S-01, S-02; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer must confirm the undated table’s applicability and independently calculate the complete fixture suite with intermediate amounts. Benchmarks do not establish rounding, irregular-pay/YTD behavior or independent approval; all 22 expected-output records remain pending.

### D-15 — October and incomplete-period scope

**OWNER DECISION REQUIRED; EXPERT REVIEW IF PAY POLICY CHANGES.** Choose supported complete-period inputs through the approved cutoff, or explicitly retain October as pending. Do not infer missing observations or certify unobserved days. Record pay date, observation cutoff, affected employees and acceptance scope. Fixture: F-21. This resolves ENG-09 and constrains ENG-08; it is not a statutory signature substitute.

**Research update — OWNER_ENGINEERING_DECISION.** Official tax research cannot supply missing October attendance after 28 October or prove period completion. Preserve the observed cutoff and intended 31 October pay date as separate facts.

**Evidence:** No determinative official rule for this internal choice; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Dataset owner must provide supported completion evidence or explicitly leave October pending. Any change in salary/absence projection policy requires payroll review; statutory sources do not justify fabricated attendance.

### D-16 — Chronological lifecycle and release boundary

**ENGINEERING/OPERATIONS DESIGN + LEGAL OWNER RELEASE.** Agree the run order and idempotency scope for each organization/month, employee population, retries, approval separation, posting, payslip, synthetic payment/declaration and close checks. Proposed sequence: resolve admitted rules and ready inputs; freeze; calculate/reconcile; independent approval; downstream lifecycle; replay. Source-backed rules and admission are prerequisites. Fixtures: F-18 through F-22. Affects ENG-07, ENG-08.

**Research update — PARTIALLY_SOURCE_SUPPORTED_PROPOSAL.** CGI arts 81–82 require withholding at payment and remittance by the 15th of the following month. Art 74 bis(5) requires the preceding-calendar-year pay/withholding statement by 15 March. The 2026 art 74 bis(1) has category-specific annual taxpayer filing dates: 31 July for specified high personalities/public/parapublic employees, 30 September for private employees of DGE/CIME/CSI taxpayers, 31 October for other individuals. The 2024 circular’s June date must not be copied as the 2026 rule. Keep these obligations separate from the internal calculation/posting/release sequence.

**Evidence:** S-01, S-09; exact artifacts, provisions and inspection limits are in section 10 and the research index.

**Still required:** Reviewer to establish effective declaration calendars and employer/taxpayer classification, including 2025 rules and any extensions. Engineering/operations must agree chronological/idempotent execution; legal owner must complete actual admission. A research-backed deadline does not certify remittance or release.

## 5. Integration data contract

The following is a proposed logical mapping, not a new API or database schema. Preserve existing server-owned tenant/actor and certified-input controls. Each amount requires a unit/currency and source identity; do not take trusted history from caller-supplied totals.

| Logical value | Current location or evidence | Required definition before implementation |
|---|---|---|
| Current raw taxable base B | Calculated service components; evaluator `taxableBaseAmount` | D-05/D-08 define composition and rounding. |
| Adjusted current base A | Evaluator `adjustedTaxableBaseAmount` | D-06/D-11 decide persisted and cumulative treatment. |
| Prior taxable base Y | Existing prior-run lines and accumulator proof; not wired into tax call | D-03/D-04/D-10 define year, eligible events, completeness and corrections. |
| Prior withholding W | Snapshot income-tax amount; not wired into tax call | D-09/D-11 define withheld versus paid/remitted and credit/refund effect. |
| Named adjustment values | Evaluator accepts a map; service does not provide it | D-06 supplies complete input dictionary and missing-input policy. |
| Rule identity | Pay-date-selected envelope, country-pack/version/schema/resolution evidence | D-01 supplies reviewed scope; retain source and approval hashes. |
| Original/correction identity | Existing original run/line hashes and correction context | D-10/D-12 define ancestry and inclusion before tax evaluation. |
| History revision and sequence | ED-02 selects owning-client isolation/retry; caller and real-database acceptance remain pending | D-12/D-13 specify stable revision, conflict detection and replay behavior. |
| Output amounts | Raw/adjusted/cumulative base, tax, contribution components, net, liabilities and trace | D-08/D-11 define names, signs, rounding and reconciliation identities. |

## 6. Independent fixture schedule

All numeric statutory expected outputs are **PENDING INDEPENDENT REVIEW**. For each fixture return inputs, rule version/effective date, manual or independently implemented workings, expected intermediate/final amounts, tolerance, source provision, reviewer/date and review status. Denial fixtures need exact expected denial and proof that no financial mutation occurred. Lifecycle hashes are generated from real retained execution evidence after implementation; placeholders do not satisfy release checks.

| ID | Required case | Primary tasks |
|---|---|---|
| F-01 | November/December 2025 versus January 2026 applicability; rule-version boundary | ENG-02, ENG-03, ENG-08 |
| F-02 | Period calculation below/at/above every bracket and final open bracket | ENG-02, ENG-06 |
| F-03 | Two and three successive months with independent cumulative tax and prior withholding | ENG-02, ENG-07 |
| F-04 | December/January reset and a non-calendar accounting year | ENG-03 |
| F-05 | Midyear hire; genuine zero opening balance versus supported prior-employer balance | ENG-02, ENG-03 |
| F-06 | Missing snapshot/hash/period, partial history and stale opening balance: deny | ENG-03 |
| F-07 | Same-day regular/off-cycle runs; both permitted processing orders | ENG-04 |
| F-08 | Each social base/cap and sector/risk classification; cap minus/at/plus one approved unit | ENG-02, ENG-06 |
| F-09 | Base adjustment, relief, contribution deduction, cap and combined ordering | ENG-02, ENG-06 |
| F-10 | Required adjustment absent, wrong unit/currency or unauthorized source: deny | ENG-02, ENG-03 |
| F-11 | Fractional/tie rounding at every defined stage; minimum/maximum tax boundaries | ENG-06 |
| F-12 | Prior withholding exceeds cumulative liability; chosen credit/refund behavior | ENG-06 |
| F-13 | One correction: full replacement versus posted delta; no double accumulation | ENG-05 |
| F-14 | Multiple chained corrections, including a negative delta | ENG-05, ENG-06 |
| F-15 | Reversal and subsequent replacement; historical inclusion reconciles | ENG-05 |
| F-16 | Correction crossing tax year, paid period or declaration boundary | ENG-03, ENG-05 |
| F-17 | Concurrent run/correction/posting, stale revision, rollback and retry | ENG-04, ENG-07 |
| F-18 | Allowance, benefit, recovery, paid/unpaid leave and overtime in composite register | ENG-07 |
| F-19 | Register/payslip/ledger/declaration/payment equality and close invalidation | ENG-07 |
| F-20 | Same-key replay, changed-payload replay, uncertain commit; no duplicate effect | ENG-04, ENG-05, ENG-07 |
| F-21 | October partial input denied or explicitly pending; supported completed alternative | ENG-08 / ENG-09 |
| F-22 | Agreed organization/month scope processed chronologically, then replayed | ENG-08 |

Existing release families remain required: CNPS_PENSION, CNPS_FAMILY_ALLOWANCE, CNPS_OCCUPATIONAL_RISK, IRPP_PERIOD, IRPP_YTD, IRPP_ADJUSTMENTS, IRPP_CORRECTIONS, ALLOWANCES_BENEFITS, DEDUCTIONS_RECOVERIES, LEAVE_OVERTIME and COMPOSITE_REGISTER_TIE_OUT. These 22 fixture cases are a review schedule, not 22 implemented tests or a replacement for those 11 coverage families.

Exact existing YTD lifecycle fields: `yearToDatePolicyHash`, `yearToDateAccumulatorHash`, `registerProofHash`, `payslipProofHash`. Correction coverage additionally requires `originalRunDocumentHash`, `originalRunEvidenceHash`, `originalCalculationHash`, `correctionBasisHash`, `correctionEvidenceHash`, `ledgerPostingProofHash`, `declarationProofHash`, `paymentProofHash`. Preserve field names when preparing executable fixtures and downstream evidence.

## 7. Implementation handoff and completion gates

| Task | Contract prerequisites | Completion evidence |
|---|---|---|
| ENG-02 — bind YTD/adjustments | D-01, D-02, D-04 through D-11 | Authoritative values reach the actual service evaluator call; F-03/F-09/F-10 match independent outcomes. |
| ENG-03 — history/year completeness | D-01, D-03, D-04, D-10, D-13 | Correct reset/membership; missing or stale required history denied; F-04/F-05/F-06/F-16. |
| ENG-04 — ordering/concurrency | D-04, D-10, D-12, D-13 | Real PostgreSQL contender, retry, rollback and replay results; F-07/F-17/F-20. |
| ENG-05 — correction/reversal identity | D-03, D-09, D-10, D-11, D-13 | F-13 through F-16 and F-20 reconcile lineage, deltas and liabilities. |
| ENG-06 — adjusted snapshots/refunds | D-02, D-05 through D-09, D-11 | Persisted bases, bounds, rounding and negative-tax outcomes agree with independent calculations. |
| ENG-07 — integrated acceptance | Accepted applicable decisions and ENG-02 through ENG-06 | Service and real-database proof for all required families, register, payslip, posting, declaration/payment and close invalidation. |
| ENG-08 — full runner | ENG-07, approved date-effective pack/admission, D-15, D-16 | Each agreed organization/month has lifecycle evidence; replay has zero duplicates. Report October pending if chosen. |

Acceptance has three distinct stages: (1) signed calculation contract and independently reviewed expected outputs; (2) engineering implementation and fresh service/database evidence; (3) legal-owner admission and controlled publication/release. Signing this draft cannot skip stages 2 or 3. ENG-10's retained 43-test review-tool result does not test payroll calculations.

## 8. Review evidence and signature record

Reviewer name, qualifications, organization, scope of authority, conflict declaration, review window, decision, effective interval, approved/excluded decisions and fixture versions: **PENDING AUTHENTIC REVIEW**. Signed artifact filename/hash/date/method: **PENDING**. Independent checker identity, authority, signature validation method, timestamp and retained evidence hash: **PENDING**. Dataset owner decision D-15 and engineering acceptance of D-12/D-13/D-16: **PENDING**.

Return immutable signed contract and independently calculated worksheets together with the structured return. State APPROVED, REJECTED, CHANGES_REQUIRED or MORE_EVIDENCE_REQUIRED for each decision; only explicit approved required scope can advance. Record conditions as unresolved until actually fulfilled. Keep private identity evidence in the controlled evidence store, linked by reference.

The current four-family CNPS decision packet does not cover the entire IRPP contract by itself. Use its established reviewer/checker records for their intended scope and attach this broader signed contract plus fixture evidence to the legal-owner intake. Do not invent a runtime parser for the draft JSON or replace canonical templates with this working form.

## 9. Sources and limitations

Local source references and exact SHA-256 hashes are in the source manifest. Main sources: `payroll-tax-rule-evaluator.ts`, `payroll-control.service.ts`, `payroll-production-admission.ts`, `payroll-country-pack-fixture-runner.ts`, `payroll-statutory-scenario-coverage.service.ts`, the Cameroon pack/constants, evaluator tests and disposable workflow scripts. The [expanded worksheet](../database-seed/payroll-unblock-workpapers/expanded-rule-review-worksheet.json) records wider review topics and envelope requirements.

The official [DGI 2026 tax-code page](https://www.impots.cm/index.php/en/node/1333) and [DGI legislation listing](https://www.impots.cm/index.php/fr/documents/39?page=1) were reopened on 29 October 2026 to confirm candidate document identity. Retained [2026 tax code](../database-seed/payroll-unblock-workpapers/DGI-CGI-2026.pdf) and [2025 finance law](../database-seed/payroll-unblock-workpapers/DGI-finance-law-2025.pdf) are available for review; revision 2 now records targeted source analysis and proposals, while expert approval remains pending. The consolidated 2025 code remains unresolved in the retained evidence inventory. The existing IRPP envelope's `CM_DGI_CGI_2025` reference with a 2026 start is a review question, not proof of applicability.

Draft 4 adds the scoped real database evidence above to the retained source inspection and mocked tests. No provider operation, statutory approval or production release was performed. Draft 3 includes the scoped evaluator, fixture-runner and calculation-service changes described above; canonical approval states and statutory values remain unchanged.

## 10. Official-source research and conflict register

Page references are one-based PDF pages; printed page numbers may differ. The research index records the complete SHA-256 and inspected scope for each source. A retained file is not a claim that every page or every subsequent amendment was reviewed.

| Source | Official authority and exact evidence | Inspection / applicability limit |
|---|---|---|
| S-01 | [DGI consolidated tax code, edition 2026](https://www.impots.cm/sites/default/files/publications/CODE%20GENERAL%20DES%20IMPOTS%202026%20%20VERSION%20FRANCAISE.pdf) — Arts 24–34, 65 bis, 67–71, 74 bis, 80–84; PDF pp.58–61, 70, 73–76 | Text extraction of first 120 pages; targeted provisions inspected. Not an audit of the whole code. |
| S-02 | [CNPS decree 2016/072 of 15 February 2016](https://www.cnps.cm/images/documentutile/decret%20fixant%20taux%20de%20cotisations%20sociales%20et%20plafonds%20des%20rmunrations_baremes%202.pdf) — Arts 2–4, 8–10; PDF pp.1–3; classification annex pp.4–5 | Retained signed decree/OCR inspected; temporal applicability and employer classification require review. |
| S-03 | [DGI consolidated tax code, edition 2024](https://www.impots.cm/sites/default/files/documents/CGI%202024%20version%20francaise.pdf) — Arts 33–34 PDF p.57; art 65 bis pp.66–67; art 74 bis pp.70–71 | Targeted historical comparison; not a substitute for a complete 2025 amendment review. |
| S-04 | [DGI finance circular 2024](https://www.impots.cm/sites/default/files/documents/Circulaire%20LF%202024.pdf) — Section 1.15, paragraphs 112–113, PDF p.19 | Scanned contents and p.19 visually inspected; implementation text referred to in paragraph 113 not recovered. |
| S-05 | [DGI finance circular 2025](https://www.impots.cm/sites/default/files/documents/CIRCULAIRE%20LF2025..pdf) — Contents PDF p.2 | Retained 68-page scan; contents inspected only. Absence from contents is not proof of no amendment. |
| S-06 | [DGI finance circular 2026](https://impots.cm/sites/default/files/publications/circulaire%20lf%202026%20VF%20%281%29-compress%C3%A9.pdf) — Section 1.12, paragraphs 144–146, PDF p.29 | Contents and exceptional-income section visually inspected; not a full circular review. |
| S-07 | [DGI indicative IRPP and other payroll withholding table](https://www.impots.cm/sites/default/files/documents/BAREME%20IRPP_DSSI%20final.pdf) — PDF p.1; gross monthly salary / IRPP / CAC columns | Undated indicative table, first-page sample rows visually inspected. Effective applicability not established. |
| S-08 | [DGI indicative local development tax table](https://www.impots.cm/sites/default/files/documents/BAREME%20TDL_DSSI%20final.pdf) — PDF p.1 | Discovery and first-page text extraction only; 2025/2026 local-tax applicability unresolved. |
| S-09 | [DGI non-professional annual declaration circular, 20 March 2024](https://www.impots.cm/sites/default/files/documents/circulaire%20d%C3%A9claration%20IRPP.pdf) — PDF pp.1–4, particularly paragraph 12 | Cover, contents and p.4 visually inspected. Its June deadline must not override the differing 2026 code. |
| S-10 | [Finance law 2024/013 of 23 December 2024 for 2025](https://www.impots.cm/sites/default/files/documents/loi_n_2024_013_du_23_12_2024-web.pdf) — Cover / document identity | Retained scanned law; no claim of complete provision-by-provision payroll review. |

### Material conflicts and engineering consequences

1. **Shared social ceiling:** CNPS decree art 4 covers pension/family; art 8 has a distinct occupational-risk base. ENG-02/ENG-06 must support branch-specific bases, with F-08 above 750,000. Employer sector and risk classification remain inputs requiring evidence.
2. **Incomplete IRPP candidate:** the current placeholder does not establish the 30% deduction/cap, 500,000 allowance, principal tax or CAC. ENG-02/ENG-06 need reviewed calculation stages and stored outputs. Do not label annual brackets as a monthly formula.
3. **Effective-year differences:** the 4,800,000 cap and expanded benefits already appear in official 2024 material; they are not a newly inferred 2026 reform. Circular 2026 expressly changes the conditional exceptional-income abatement from 25% to 35%. F-01/F-09 must cover approved transitions or deny exceptional income outside scope. The complete 2025 amendment set still needs confirmation.
4. **Indicative table limits:** S-07 sample monthly gross/IRPP/CAC rows are 63,500/12/1; 64,000/45/4; 65,000/110/11. They are not signed independent fixtures, do not specify the whole algorithm, and do not settle rounding or date applicability. Preserve them separately from approved expectedOutput values.
5. **Calendar and refund distinctions:** calendar-year annual reporting and taxpayer refund validation constrain design but do not select internal YTD correction mechanics. ENG-03/ENG-05/ENG-06 must preserve amounts rather than silently erase overwithholding. Employer remittance, taxpayer annual declaration and annual pay statement have different deadlines.
6. **Wider payroll obligations:** the official tables also identify CCF, FNE, CRTV and TDL. The legal owner must provide an obligation catalogue with payer, base, rate, threshold, exemptions and effective dates, or reasoned exclusions. This packet does not certify a complete payslip merely because IRPP/CNPS candidates are populated. Do not infer levy ownership from ambiguous table headers.
7. **Unrecovered implementation sources:** circular 2024 paragraph 113 refers benefit/expense implementation details to a specific text, still needed. The CNPS labour-code URL returned a contents index; official labour/overtime download links were unavailable. Full operative labour rules, collective agreements, employee classification and supported attendance are still needed for F-18.

### Exact remaining approval and input bundle

- Qualified reviewer: complete 2025 source/amendment chain and dates; approve ordinary/exceptional-income eligibility, monthly/annual/YTD method, partial-year/prior-employer rules, benefit and social bases, cap consumption, other levies, rounding, credits/refunds and correction-year policy.
- Reviewer plus independent checker: independently calculated F-01 through F-22 as applicable, intermediate steps, approved tolerance, verified source bytes, signed scope, credentials/conflicts and authentic signature validation. The three official benchmark rows are not a substitute.
- Payroll/engineering/accounting owners: certified dictionary mappings, actual runtime key names, distinct principal/CAC and withheld/remitted outputs, authoritative YTD amounts, correction identity, concurrency strategy, immutable evidence and ledger/declaration mapping.
- Dataset/release owners: D-15 October completion or explicit pending scope, D-16 chronological lifecycle and actual admission evidence. Research does not generate missing attendance, settlement or release approval.

No automatic legal approval was recorded. Proposed numbers may be used to prepare review workpapers; executing production payroll still requires the established review and admission gates.
