# Payroll calculation reviewer checklist

Packet: `STOQUIFY-CM-PAYROLL-CALCULATION-2026-11-02-DRAFT-4`  
Prepared: 29 October 2026; updated: 2 November 2026. Status: **PREPARED FOR REVIEW — NO APPROVAL RECORDED**.

This checklist accompanies the [calculation contract](PAYROLL-CALCULATION-CONTRACT.md) and [structured return form](PAYROLL-CALCULATION-REVIEW-RETURN.json). It is designed to obtain the decisions and independent expected results needed for ENG-02 through ENG-08. Preparing this checklist does not complete those tasks.

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

## Historical engineering handoff — Draft 3

ED-01 through ED-04 in the contract record engineering choices and scoped implementation. 152 synthetic/mocked tests across five suites pass. Statutory approvals, reviewer signatures, independent expected amounts and the seven parent task completion gates remain pending.

- [x] Require explicit YTD totals and named adjustment inputs; reject non-finite money; keep unknown values distinct from zero in the fixture adapter.
- [x] Use the existing SERIALIZABLE/retry boundary for calculation-owned transactions; verify retry, replay, exhaustion and error handling with mocks.
- [x] Bind version-2 accumulator evidence to ordered historical identities, snapshots and line amounts; verify equal-total source changes alter its hash.
- [x] Preserve unreviewed admission denial and register/fixture compatibility in the focused unit lane.
- [ ] Engineering: retain the audited owning-client entry points; require an explicit isolation/retry contract for future injected callers and run actual PostgreSQL concurrency, rollback and uncertain-commit tests.
- [ ] Engineering plus reviewer: define legal history membership and implement completeness and approval-time stale-history comparison/invalidation.
- [ ] Reviewer/accounting: supply approved calculation, correction, rounding/refund, tax/CAC and branch-base treatments, with independent F-01 through F-22 evidence.
- [ ] Dataset/legal owners: supply October scope and actual admitted rule/release evidence before runner expansion.

Checked items above mean scoped engineering verification only. They do not check any statutory box or sign D-12/D-13 on behalf of an independent reviewer. [Engineering results](../unblock/PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) retain the test output hash and before/after source hashes.

Current production caller audit: actions/payroll/payroll-control.actions.ts and prisma/disposable-business-workflows.ts both call calculatePayrollRun without an injected client, so both use the owning-client SERIALIZABLE/retry boundary. No additional production caller change is needed in this checkout. Future injected TransactionClient callers must establish isolation/retry explicitly; mocked callers are not database proof.

## 1. How to complete the packet

Use the D-01 through D-16 identifiers in the contract and F-01 through F-22 fixture schedule. Complete the structured return or an equivalent signed worksheet that preserves these identifiers. Each approval must identify its precise scope; no blank field means approval.

For each decision, return: selected treatment/formula; rationale; source and exact provision where statutory; effective interval; covered/excluded population; fixture IDs and calculation workings; reviewer name/date; status; conditions and affected engineering tasks. Use **APPROVED**, **REJECTED**, **CHANGES_REQUIRED** or **MORE_EVIDENCE_REQUIRED**. Unanswered decisions remain **PENDING_REVIEW** in this working packet. Technical choices require named engineering acceptance and any applicable reviewer concurrence.

For every fixture, return independently calculated inputs and expected intermediate/final outputs, not values copied from the application. Clearly separate true zero from unknown. Enter an approved reason for any not-applicable case; engineering cannot silently omit it. Final release acceptance still requires actual executable and lifecycle evidence.

## 2. Already prepared from evidence

| Item | Prefilled status | Meaning |
|---|---|---|
| Scope and task mapping | RECORDED | CM, monthly, single-employer proposed release scope; seven tasks mapped to decisions and acceptance cases. |
| Implementation baseline | RECORDED | Current evaluator, YTD query/proof, correction sequence, snapshot and September-only runner behavior inspected. |
| Rule candidates | RECORDED, UNAPPROVED | Official CNPS/IRPP proposals now populated for review; no approved executable IRPP rule yet. |
| Date inventory | RECORDED | 36 intended organization/month entries, November 2025 through October 2026; October observations end on the 28th. |
| Source provenance | ENGINEERING HASHES | Source manifest binds inspected bytes and document identity; this is not the reviewer's independent attestation. |
| Legal-source candidates | AVAILABLE FOR REVIEW | Official 2024/2026 codes, 2024–2026 circulars, CNPS decree and indicative tables retained; full 2025 rule chain still unresolved. |
| Review tooling | PRIOR SCOPED EVIDENCE | ENG-10's 43 tests passed in the earlier engineering task. They do not certify payroll math, signatures or release readiness. |
| Reviewer identity, decisions, fixtures and signature | PENDING | No authentic reviewer/checker fields were supplied by automation. |

## 3. Assign accountable people

| Responsibility | Required return | Current value |
|---|---|---|
| Qualified Cameroon payroll reviewer | Full name, professional capacity, organization, qualification/issuer/reference, relevant jurisdictional experience, scope, authority and conflict declaration | PENDING |
| Independent checker | Different natural person; identity, authority, qualification, conflict declaration and signature-validation responsibilities | PENDING |
| Payroll/product owner | Operational population, input ownership, treatment of source-data exceptions | PENDING |
| Engineering lead | Input lineage, ordering, transaction, evidence and implementation acceptance | PENDING |
| QA/accounting owner | Independent expected-results protocol, reconciliation identities, ledger/declaration/payment and close checks | PENDING |
| Dataset owner | Explicit October cutoff/completion decision D-15 and agreed organization/month scope | PENDING |
| Legal owner/release authority | Scope-bound legal-owner intake and subsequent publication/admission authorization | PENDING |

Do not substitute synthetic dataset personas for qualified statutory reviewers. Store sensitive identity documentation in the controlled evidence store; return references and hashes, not unnecessary personal documents in this repository.

## Research review action sheet — revision 2

**12 decisions partially supported; all 16 approvals pending.** Read the matching D-record in the [updated contract](PAYROLL-CALCULATION-CONTRACT.md), then accept, amend or reject its proposed treatment. The [research index](../unblock/PAYROLL-CALCULATION-OFFICIAL-RESEARCH.json) identifies exact provisions, artifact hashes and inspection limits. Approval fields are intentionally separate from research fields.

| Decision | Prefilled research / exact remaining response | Evidence |
|---|---|---|
| D-01 | Qualified reviewer: confirm complete 2025 amendment chain and operative dates, residency/treaty exclusions, employee/employer categories and whether exceptional income is supported or explicitly denied. Return signed 2025/2026 envelopes; do not extrapolate CM-2026.1 backwards. | S-01, S-02, S-03, S-04, S-06 |
| D-02 | Reviewer must select monthly conversion/annualization, partial-year/joiner treatment, cap consumption and regularization. Do not feed annual thresholds directly into current-month gross or treat P(Y+A)−W as validated by these provisions. Resolve exceptional-income art 65 bis separately. | S-01, S-07 |
| D-03 | Reviewer to approve tax-year mapping for payroll and delayed/backdated/cross-year corrections; engineering to define the Cameroon local-date/time-zone conversion. The annual statement supports the calendar proposal but does not prescribe every internal YTD algorithm. | S-01 |
| D-04 | Payroll reviewer/owner must decide prior-employer and off-cycle membership; engineering must map real payment/withholding facts to POSTED/PAID and correction statuses, gap detection and approved opening-balance migration. The statute does not define application statuses. | S-01 |
| D-05 | Reviewer must validate branch-specific remuneration/exemptions, benefit valuation denominator and anti-double-counting, cap allocation across irregular/multiple payments, sector/risk classification and current applicability. Do not import the tax 30% expense deduction into the social base without its own authority. The common capped service base conflicts with the proposed ATMP treatment. Leave/overtime/recovery amounts remain unresolved pending operative labour instruments and applicable collective agreements. | S-01, S-02, S-03, S-04 |
| D-06 | Payroll/engineering owners must bind each logical item to certified source fields, determine sign and stage, period allocation, required evidence, missing-input denial and actual evaluator keys. No invented field mapping or omission-as-zero is authorized. | S-01, S-02 |
| D-07 | Reviewer to approve boundary/decimal representation, deduction order and monthly allocation, exceptional-income eligibility and three-year history, any dependant relief and other exemptions, and bounds. No independently verified basis was found here for a new dependant deduction or a universal minimum/maximum tax. The below-62,000 withholding exemption must not be generalized into exemption from every payroll levy. | S-01, S-03, S-04, S-06 |
| D-08 | Reviewer must supply applicable scale/tie rule and rounding stage for each tax/contribution, correction, total and declaration; engineering must reconcile unit names and residual allocation. Do not adopt two decimals or infer half-up/half-even from a few table rows. | S-01, S-02, S-07 |
| D-09 | Reviewer must distinguish employer correction from taxpayer annual claim, choose the allowed interim treatment, authority and evidence, and map approved credits/refunds into future withholding, declarations and ledger. Current zero floor is not approved merely because the annual refund procedure exists. | S-01, S-03 |
| D-10 | Reviewer and engineering must decide replacement/delta semantics, reverse/reissue treatment, negative deltas, already-paid/declared cases and downstream recomputation. A legal provision about annual claims does not settle this data model. | NO_DETERMINATIVE_SOURCE_FOUND |
| D-11 | Reviewer/accounting owner must select the authoritative YTD base, stored full/delta identities, payslip/declaration/journal mappings and net-pay reconciliation. Validate whether current incomeTaxAmount includes CAC; never assume it does. | S-01, S-02 |
| D-12 | ED-02 selects and implements owning-client SERIALIZABLE with bounded retries. Engineering must audit/enforce injected TransactionClient isolation/retry and provide real PostgreSQL contention, rollback and uncertain-commit evidence; reviewer must confirm same-day/off-cycle membership. Approval-time stale-history checks remain required. | OWNER_ENGINEERING_DECISION |
| D-13 | ED-03 implements version-2 observed-source fingerprints without rewriting legacy snapshots. Engineering/QA must implement and test history completeness, approval-time fingerprint comparison/invalidation, authorized migration and downstream lifecycle binding; reviewer must accept the trace for the approved calculation policy. | OWNER_ENGINEERING_DECISION |
| D-14 | Reviewer must confirm the undated table’s applicability and independently calculate the complete fixture suite with intermediate amounts. Benchmarks do not establish rounding, irregular-pay/YTD behavior or independent approval; all 22 expected-output records remain pending. | S-07, S-01, S-02 |
| D-15 | Dataset owner must provide supported completion evidence or explicitly leave October pending. Any change in salary/absence projection policy requires payroll review; statutory sources do not justify fabricated attendance. | OWNER_ENGINEERING_DECISION |
| D-16 | Reviewer to establish effective declaration calendars and employer/taxpayer classification, including 2025 rules and any extensions. Engineering/operations must agree chronological/idempotent execution; legal owner must complete actual admission. A research-backed deadline does not certify remittance or release. | S-01, S-09 |

### Priority validation checklist

- [ ] Confirm pension/family ceilings versus the separate occupational-risk base (S-02 arts 2–4, 8–10); approve sector/risk classification and verify above-ceiling cases.
- [ ] Confirm the 30% professional-expense deduction, 4,800,000 annual cap, 500,000 allowance, mandatory pension deduction and each benefit valuation; resolve circular 2024 paragraph 113's implementation text.
- [ ] Approve monthly/annualized/YTD method using annual brackets and payment-time withholding; explicitly cover joiners, variable pay, prior employers and annual cap allocation.
- [ ] Keep principal IRPP and 10% CAC separate; test below/at/above 62,000 gross monthly withholding boundary and each annual bracket. Do not treat this threshold as exemption from every levy.
- [ ] Approve qualifying exceptional-income handling, including the 2026 25%-to-35% change and three-year-history requirements; ordinary recurring bonuses are not automatically exceptional.
- [ ] Reconcile calendar-year reporting, payment/availability date, employer remittance by following-month 15th and annual statement by 15 March. Confirm category-specific annual taxpayer dates; do not use the 2024 circular's June date as the 2026 rule.
- [ ] Approve taxpayer-requested, authority-validated annual refund/credit treatment and separately define employer correction behavior; avoid losing overwithholding evidence through a zero floor.
- [ ] Supply CCF/FNE/CRTV/TDL obligation applicability, current rates/bases and payer allocation, or explicit justified scope exclusions. Confirm labour/collective-agreement rules for leave/overtime/recoveries.
- [ ] Verify source dates and amendments, then independently compute all applicable F-cases. S-07 indicative rows 63,500/12/1; 64,000/45/4; 65,000/110/11 are benchmarks only, not approved expected outputs or a rounding specification.

Research cannot complete D-10's correction contract or D-12/D-13/D-15 owner decisions. Obtain the named responses in the table, then execute the existing engineering and release gates. No box above has been checked by automation.

## 4. Reviewer decision checklist

Every row below is **OPEN**. The question states the exact missing input; the last column identifies the supporting fixture cases. The contract and structured return now contain source-backed proposals for 12 decisions. Approved selections remain blank; distinguish a source fact from acceptance of its application.

| Decision | Required reviewer/owner response | Fixture references |
|---|---|---|
| D-01: applicability | Identify approved 2025/2026 windows, eligible population, exclusions, joiner/prior-employer treatment and rule changes. | F-01, F-04, F-05 |
| D-02: calculation method | Provide period/cumulative/annualized formula, bracket period, annualization factors if applicable and regularization timing. | F-02, F-03, F-04 |
| D-03: tax year | Confirm governing date/time zone, reset, fiscal-year independence and cross-year correction treatment. | F-04, F-05, F-16 |
| D-04: history membership | Define eligible runs/statuses, opening balances, completeness evidence, currency separation and missing-history denial/migration. | F-05, F-06, F-07, F-17 |
| D-05: bases and social caps | Define salary/leave/overtime/benefits/allowances/contribution treatment and each contribution's base and ceiling. | F-08, F-09, F-18 |
| D-06: adjustments | Supply each inputKey, trusted source field, sign, unit, approval, date, rate/cap, scope and missing-value treatment. | F-09, F-10 |
| D-07: brackets and reliefs | Supply rates/thresholds, boundary inclusivity, dependants, deductible contributions, bounds and relief ordering. | F-02, F-08, F-09, F-11 |
| D-08: units and rounding | Define units, scale and tie rule at each calculation/aggregation stage, plus residual allocation. | F-08, F-11, F-18 |
| D-09: overwithholding | Decide zero floor, credit, refund or correction treatment, authority and downstream effect. | F-12, F-14, F-16 |
| D-10: corrections/reversals | Specify identity chain, full/delta basis, inclusion rules, effective year and recomputation of later periods. | F-13, F-14, F-15, F-16, F-20 |
| D-11: authoritative outputs | Define raw/adjusted/YTD base, withheld versus remitted tax, stored deltas and report/accounting mapping. | F-09, F-13, F-18, F-19 |
| D-12: ordering/concurrency | Reviewer states policy constraints; engineering specifies stable order/revision, conflict, rollback and retry controls. | F-07, F-17, F-20 |
| D-13: evidence lifecycle | Specify immutable input/history/rule bindings, stale-evidence denial, migration and downstream invalidation. | F-06, F-17, F-19, F-20 |
| D-14: acceptance method | Approve independent calculations and exact comparison/tolerance; explain exclusions case by case. | F-01 through F-22 |
| D-15: October scope | Dataset owner returns supported complete-period input or explicit pending scope; expert reviews any pay-policy change. | F-21 |
| D-16: execution/release | Engineering agrees chronological/idempotent lifecycle; operations/legal owner identify approval and admission gates. | F-18 through F-22 |

### Decision recording form — repeat for each D-ID

- Decision ID and affected tasks: **PENDING reviewer/owner entry**.
- Status and selected treatment/formula: **PENDING**.
- Legal reference, article/paragraph, official artifact filename/hash: **PENDING**, or explained technical-only scope.
- Effective start/end and covered/excluded population: **PENDING**.
- Independent fixture IDs, working-paper filenames/hashes and comparison tolerance: **PENDING**.
- Conditions, unresolved exceptions and required implementation change: **PENDING**; expressly state none when that is the reviewer's conclusion.
- Reviewer/owner name, qualification or role, review timestamp and signed reference: **PENDING**.

## 5. Independent calculation workpaper checklist

For each applicable F-ID, require the following before accepting an expected result:

1. Identify country, employer/employee scenario, currency/unit, payroll period, pay date and tax-year boundaries. Use synthetic or appropriately controlled data.
2. Identify exact approved source provisions, pack/envelope version, effective dates and the D-decisions used. Include applicable review topics.
3. List salary/components, attendance/leave/overtime, dependants/classifications, adjustment values and their approved source identities. State all assumptions explicitly.
4. List every eligible prior run or approved opening balance, prior taxable base, withholding, refund/credit and correction/reversal membership. Reconcile the opening balance independently.
5. Show raw base, each base adjustment/cap, adjusted base, cumulative base, bracket slices/rates, prior withholding subtraction, relief/bounds/refund operation and rounding at each stage.
6. Provide expected current and cumulative tax, contributions, gross, net, liabilities, full/replacement/delta values and the output mappings needed by the fixture. For denial cases, specify expected denial and no-write outcome.
7. Record expected register, payslip, journal, declaration and payment totals where applicable, along with any correction/reversal impact on close evidence. Distinguish synthetic workflow proof from real provider settlement.
8. Record independent author, method/tool/version, date, source evidence hash, review status and reviewer/checker acceptance. Preserve working bytes before producing tie-out hashes.

The application's existing synthetic evaluator examples are comparison tests only. Their 6500 and 4250 outputs are not statutory expected results for this packet. Do not derive the independent answer by running the same evaluator under review.

### Existing fixture and proof field alignment

Engineering must translate the independently approved workpapers into the existing scenario schema, including inputs/expectedOutput and review evidence: `reviewedBy`, `reviewedOn`, `legalRef`, `sourceEvidenceHash`, `coveredReviewTopics`. Validate against the actual schema; this draft's return JSON is not a runtime country pack.

IRPP YTD purpose: `PAYROLL_IRPP_YTD_REGULARIZATION`. Required proof fields: `yearToDatePolicyHash`, `yearToDateAccumulatorHash`, `registerProofHash`, `payslipProofHash`.

IRPP correction purpose: `PAYROLL_IRPP_YTD_CORRECTION_REPLAY`. In addition to the YTD fields, require `originalRunDocumentHash`, `originalRunEvidenceHash`, `originalCalculationHash`, `correctionBasisHash`, `correctionEvidenceHash`, `ledgerPostingProofHash`, `declarationProofHash`, `paymentProofHash`.

Real lifecycle hashes cannot be supplied until those workflows execute. The reviewer supplies approved calculation expectations first; engineering supplies service/database proof afterward; the checker then confirms the resulting evidence chain. Merely entering hash-shaped strings must not be treated as completion.

## 6. Source and signature acceptance

These checks remain **PENDING AUTHENTIC REVIEW**:

- Confirm the authoritative 2025 source set and amendments. Do not extrapolate the 2026 pack or treat the retained 2025 finance law alone as a complete consolidated rule set.
- Identify precise 2025/2026 provisions for base, rates/brackets, dependants, contributions, ceilings, regularization and rounding. Resolve the existing IRPP reference/year mismatch.
- Independently recompute hashes/byte lengths for the existing six CNPS evidence-index artifacts and every additional source used by the contract. Record verifier, procedure, tool/version and time.
- Complete reviewer qualification/conflict and source-verification records in the existing [working copies](../database-seed/PAYROLL-UNBLOCK-COMPLETION-PACKET.md). Keep authentic approval values pending until returned.
- Complete the existing four CNPS family workbook and decision separately from the wider IRPP contract. Produce tie-out hashes only after independent work is complete.
- Retain the signed contract and approval artifact unchanged; record actual filename, SHA-256, signedAt and signature method.
- An independent checker authenticates credentials, signature and signed scope, records authority/conflicts/method/time, and retains signature-validation evidence with its actual hash.
- Record explicit approved/excluded scope and conditions. A requested clarification or conditional unresolved decision cannot become an unconditional approval.

The source manifest contains engineering-computed digests, not reviewer attestations. Source discovery is supported by the official [2026 DGI publication page](https://www.impots.cm/index.php/en/node/1333) and [DGI legislation listing](https://www.impots.cm/index.php/fr/documents/39?page=1), reopened on 29 October 2026. The legal interpretation and effective scope still require the reviewer.

## 7. Handoff gates for the seven tasks

| Gate | Required evidence | Current status |
|---|---|---|
| G-01: reviewed contract / ENG-01 | Required D-decisions accepted by appropriate people; independent expected calculations; source provisions/windows; immutable signed artifact and checker validation | PENDING |
| G-02: ENG-02 and ENG-03 | Actual service receives authoritative YTD/adjustments; complete history and correct tax year; F-01 through F-06 and relevant adjustment cases | PENDING ENGINEERING, dependent on G-01 |
| G-03: ENG-04 | Real PostgreSQL same-day/concurrency, retry, rollback and replay proof with agreed ordering | PENDING ENGINEERING |
| G-04: ENG-05 and ENG-06 | Correction/reversal identity, adjusted snapshots and approved refund/rounding behavior; independent totals agree | PENDING ENGINEERING |
| G-05: ENG-07 | All 11 required release families plus integrated register/payslip/ledger/declaration/payment and close-invalidation proof | PENDING ENGINEERING |
| G-06: publication/admission | Accepted review return, existing 12/12 preflight, persisted legal-owner intake and approved date-effective pack/admission with genuine evidence hashes | PENDING APPROVAL/RELEASE |
| G-07: ENG-08 and ENG-09 scope | Guarded disposable target, ready inputs, agreed October treatment, chronological lifecycle across approved scope, idempotent replay | PENDING ENGINEERING / OWNER INPUT |

G-01 allows implementation against an agreed contract. It does not replace G-05 or G-06. ENG-08 requires G-05/G-06 and the dataset scope decision before full execution can be claimed. The canonical review packet currently remains pending; document preparation changes none of these gates.

### Existing review-tool sequence after authentic return

Supply explicit evidence-directory and decision paths so that working copies cannot be confused with canonical returns. Follow the existing [post-signature runbook](../HR-Payroll/evidence/country-packs/CM/2026-07-19/review-package/POST_SIGNATURE_RUNBOOK.md): verify signature/checker evidence, compute completed independent workbook hashes, copy hashes to matching family decisions, and run preflight in fail mode. Require 12/12 before the authorized manifest transition. Any subsequent publication/runtime change needs its own scope-bound review and release checks.

`MORE_EVIDENCE_REQUIRED` is a valid response but never approval. Reviewed manifest states are `EXPERT_REVIEWED` or, only with actual regulator confirmation, `REGULATOR_CONFIRMED`. Tool passes establish structure/integrity; the independent checker performs signature authentication. The four-family preflight alone does not admit the full seven-task calculation implementation.

## 8. Return package and final record

Return this exact bundle through the controlled review channel; no message or external dispatch was performed by this task:

1. Completed structured return or equivalent decision sheet preserving all D-IDs, with scope/exclusions and named owners.
2. Signed, versioned calculation contract, plus its actual filename/hash/date/method.
3. Independent calculation worksheets for applicable F-IDs, sources, expected amounts, tolerance and reviewer evidence.
4. Source artifact index and independent hash-verification record, including missing/recovered 2025 sources and any amendments.
5. Reviewer qualification/conflict record and independent checker signature/authority evidence.
6. Existing CNPS workbook/decision/checker records for their four-family scope, and broader IRPP/other-family evidence for legal-owner intake.
7. Dataset owner's D-15 decision and engineering/QA acceptance of D-12, D-13, D-14 and D-16 as applicable.
8. After implementation, separate service/database/lifecycle results and authorized publication/admission evidence. These are not expected to exist merely because a contract is signed.

Overall decision: **PENDING**. Approved decision IDs: **none recorded**. Excluded IDs and reason: **PENDING**. Effective interval: **PENDING**. Reviewer signature: **PENDING**. Independent checker: **PENDING**. Legal-owner intake reference: **PENDING**. Engineering acceptance reference: **PENDING**. October owner decision: **PENDING**.

## 9. Publication checks and limitations

This packet was prepared from current repository source and retained evidence. Matching Markdown/PDF copies, cross-referenced decision/fixture IDs, source hashes and extracted PDF text are checked during publication; page previews are inspected. Draft 3 ran the focused synthetic/mocked engineering suite recorded above. No real database test or live workflow execution is claimed. The earlier review-tool test results remain a different evidence class.

The return form now populates research proposals, source references, remaining questions, logical input candidates and official comparison rows. Approved selections, independent fixture expected outputs, identities, signatures and approval hashes remain null. Completing documentation makes those inputs reviewable; it does not create them.
