# Payroll unblock — execution report

## Engineering continuation — Draft 3 / 29 October 2026

**Statutory approvals remain pending.** Four engineering selections are recorded below; completed substeps do not close ENG-02 through ENG-08. All D-01 through D-16 review statuses and all independent F-01 through F-22 outputs remain pending. The earlier 12 source-supported proposals are preserved.

| Selection | Implemented or selected | Exact remaining boundary |
|---|---|---|
| ED-01 / D-04, D-06, D-08 | Unknown is not zero. Supported YTD evaluation requires both explicit prior base and prior withheld amounts; each named adjustment requires an own, explicit, finite value. Current base and monetary rule values reject NaN/Infinity. Explicit zero remains valid. The fixture adapter preserves absent history instead of defaulting to zero. | Does not certify the supplied history as complete, select the legal tax year/method, supply certified mappings, or change rounding/refund/rate policy. |
| ED-02 / D-12 | For an owning Prisma client, calculation uses the existing payroll transition helper: SERIALIZABLE transaction, at most three attempts for P2034/P2002, re-query idempotency on every attempt, return 409 after exhaustion, do not retry domain errors, redact unexpected internal errors. No external side effect is added to the retry callback. | An injected TransactionClient inherits its caller transaction; caller owns isolation and retry. Same-day statutory membership, stale-history checks at approval/posting, real contention/rollback and uncertain-commit proof remain pending. This is not full ENG-04 completion. |
| ED-03 / D-11, D-13 | New accumulator proofs use version 2 and bind each ordered prior run/line identity, employee, currency, pay date, run status, document hashes, calculation-snapshot hash and recorded line amounts. observedHistoryHash binds that observed list and is included in the accumulator hash. Missing snapshots remain explicitly null. Existing frozen records are not migrated or rewritten. | A fingerprint proves which source data was observed, not legal inclusion or completeness. Legacy proof reads remain supported. Approval-time comparison/invalidation and migration acceptance are not implemented by this slice. |
| ED-04 / D-14, D-16 | Keep mocked/unit, source-integrity, PDF, real-database, statutory-review and release evidence separate. Synthetic zero values and test-only review labels never populate canonical reviewer records. Keep the September-only runner and October pending scope until admitted rules and supported inputs exist. | Independent statutory F-01 through F-22 expected outputs, real integrated acceptance and production admission remain pending. No missing attendance is inferred. |

**Verification:** 152 tests across five suites pass. Evidence is synthetic/unit and mocked service execution, including the real evaluator/service calls with mocked persistence, missing-input denial before run/event creation, conflict retries/replay, production-admission denial, fixture validation and register compatibility. Equal totals with changed prior status or snapshot produce a different observed-history hash; unchanged history produces the same hash. The original three-suite baseline passed 99 tests.

The broader run initially exposed synthetic fixtures relying on omitted zero inputs and an adapter defaulting missing YTD to zero. The adapter was corrected and synthetic scenarios now state their known zero amounts explicitly. No runtime country-pack rate, approval identity or signed fixture was filled by this change.

No real PostgreSQL, provider operation, full project typecheck or browser journey was executed. Mock retries do not establish database rollback or concurrent commit safety. PDF/source validation is separate evidence. See [retained engineering results](PAYROLL-CALCULATION-ENGINEERING-RESULTS.json) and the [scoped task diff](research/engineering-task.diff).

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


## Earlier inventory and engineering record

Updated 2026-10-29 after the authorized engineering continuation.

## Outcome and evidence summary

ENG-10 is complete: reconciled review-tool states, integrated signature/checker validation into preflight, and closed related approval-interval and incomplete-workbook gaps. The field-level register, 36 intended pay dates, review working copies and retained source evidence remain available. Application payroll behavior, canonical approval status and databases were not changed.

| Register status | Entries |
|---|---:|
| VERIFIED | 8 |
| RECORDED | 90 |
| PENDING HUMAN | 319 |
| OPTIONAL OR CONDITIONAL | 52 |
| PENDING INDEPENDENT RECOMPUTATION | 18 |
| PENDING RESEARCH | 49 |
| CONDITIONAL | 15 |
| BLOCKED | 42 |
| PENDING ENGINEERING | 7 |
| COMPLETED ENGINEERING | 1 |

Total: **601 field/dependency entries**. Repeated family/artifact fields are distinct register rows, not unique human questions.

Scoped verification: **22 checks passed**. Workflow contract check: **PASS**. Unit tests: **43/43 passed in 3 isolated suites**; 8 regression failures were reproduced before correction. Actual review preflight remains **4/12** because authentic reviewer/signature/fixture evidence is missing. Real PostgreSQL and browser checks were not run.

The detailed completion packet follows. The [complete Markdown register](../database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [machine-readable register](../database-seed/payroll-unblock-register.json) retain all field-level records; the report explains the remaining inputs, owners, engineering work and acceptance criteria.

## Detailed completion packet

Updated 2026-10-29 after the authorized engineering continuation. Scope: `stoquify_replay_dataset_20261028_01`, localhost:5432/public; synthetic organizations `synth12_douala`, `synth12_yaounde`, `synth12_bafoussam`. Review-tool code and tests were corrected. No database, application payroll behavior, runtime configuration or canonical approval state was changed.

## Completed preparation

- [Field-level register](../database-seed/PAYROLL-UNBLOCK-REGISTER.md) and [structured register](../database-seed/payroll-unblock-register.json): destination, current evidence, requirement, owner, dependencies, next action and verification for each entry. `RECORDED` is not an approval; `VERIFIED` means source-byte integrity only. Repeated artifact/family fields are separate rows, not separate human questions.
- [Current source facts](../database-seed/payroll-unblock-workpapers/current-source-facts.json): exact implemented values, provenance, capabilities, ten relevant fixtures (seven executable CNPS calculation scenarios), thirteen payroll parameter paths, two AP parameter paths and eleven scenario families. Literal AST extraction does not import the application or execute payroll.
- [Engineering integrity report](../database-seed/payroll-unblock-workpapers/engineering-source-integrity.json): six retained CNPS artifacts recomputed from bytes, all matching their index. These calculations do not fulfill the reviewer's independent recomputation/attestation requirement.
- [Expanded review worksheet](../database-seed/payroll-unblock-workpapers/expanded-rule-review-worksheet.json): current rules, source candidates, existing fixture IDs, required purposes, review topics and lifecycle proof fields. Proposed rule envelopes and independent decisions remain null where no authentic evidence exists. It is not a runtime-importable country pack.
- [Pay-date matrix](../database-seed/payroll-unblock-workpapers/pay-date-coverage.json): 36 organization/month rows derived from the current seed. Dates are November 30 and December 31, 2025, followed by January 31, February 28, March 31, April 30, May 31, June 30, July 31, August 31, September 30 and October 31, 2026. Raw attendance stops October 28. This is seed intent, not an approved payroll calendar.
- [Historical evidence index](../database-seed/payroll-unblock-workpapers/historical-evidence-index.json): source hashes and the exact 18 retained AP invoice blockers. [Reference audit](../database-seed/payroll-unblock-workpapers/reference-audit.json) distinguishes repaired links from missing authentic returns.
- **ENG-10 completed:** [engineering results](../database-seed/payroll-unblock-workpapers/engineering-results.json) bind the corrected review tools and isolated tests to current source hashes. The register now contains one completed engineering item and seven remaining engineering items; ENG-01 and ENG-09 still require owner/reviewer inputs.

## Exact return required from the reviewer and checker

These working copies preserve the template's pending values and do not replace the canonical approval packet. Fill them from genuine review evidence. Source filenames in the decision are resolved against the original evidence directory, not the working-copy directory. The hash-verification worksheet's source paths are rebased to the actual retained files. Signed artifacts must never be edited after signature.

| Responsible role | Working document | Required completion |
|---|---|---|
| Qualified Cameroon payroll reviewer | [Qualification/conflict working copy](../database-seed/payroll-unblock-workpapers/reviewer-qualification-conflict.working.json) | Identity, professional capacity, organization, qualification/issuing body, jurisdictional experience, engagement, conflicts, independence, scope acceptance and authentic signature. Keep identity documents and private contact details in the controlled evidence store. |
| Independent evidence verifier | [Source-integrity working copy](../database-seed/payroll-unblock-workpapers/source-hash-verification.working.json) | Personally recompute all six sources; record actual digests/lengths, procedure/tool/version, time, identity and signed attestation. Engineering's populated report is a reference, not the verifier's work. |
| Qualified reviewer | [Four-family fixture workbook](../database-seed/payroll-unblock-workpapers/fixture-review-workbook.working.json) | Provisions, 2026 applicability, independent calculated outputs, rounding/caps/classification, employer procedures and timing, exceptions and decisions. The existing system outputs are comparison inputs only. Confirm a separate 2025 scope; the workbook defaults do not establish it. |
| Qualified reviewer | [Decision working copy](../database-seed/payroll-unblock-workpapers/review-decision.return.working.json) | Review window, independent digest attestations, each family decision/provision/effective interval, final covered/excluded scope, conditions, signed artifact filename/hash/date/method. Generate the four tie-out hashes only after the independent workbook is complete. |
| Independent authorized checker | [Maker/checker working copy](../database-seed/payroll-unblock-workpapers/maker-checker-approval.working.json) | Authenticate reviewer credentials, independence, signed contents and signature; record authority, checks, verification method/tool/version/trust evidence, timestamp and retained validation-file hash. Checker must be a different natural person. Copy genuine verification metadata into the decision. |
| Qualified reviewer + legal owner | [Expanded worksheet](../database-seed/payroll-unblock-workpapers/expanded-rule-review-worksheet.json) | Supply approved 2025/2026 envelopes and independently reviewed executable fixtures for the entire scope below, not only the CNPS workbook. |

Canonical return location after authentic completion: `docs/HR-Payroll/evidence/country-packs/CM/2026-07-19/`, with workbooks/checker records in its `review-package/` as required by the runbook. Retain the signed artifact and signature-validation evidence in the evidence directory; supply explicit `--evidence-dir` and `--decision` when checking working copies. Do not overwrite blank templates. The completed canonical returns were not found in this inspection.

Valid open-ended `effectiveTo: null` is not itself a gap. Notes, exclusions and limitations are conditional; absence is not automatically an approval failure. For independently reviewed content, the fixture-hash helper is stricter: it rejects incomplete independent-review values. Where the reviewer finds no exceptions, they must state that conclusion explicitly rather than engineering inserting it.

## Rule and admission scope

| Requirement | Current inspected evidence | Remaining input |
|---|---|---|
| Four CNPS envelopes | Existing 2026 values, `SUPPORTED_DRAFT` / `SOURCE_CHECKED` | Authentic independent review and approved legal windows for 2025 and 2026. |
| `payroll.irpp.incomeTaxRules` | `REQUIRES_EXPERT_REVIEW`, `productionCalculationSupported: false` | Executable reviewed rule, taxable base/dependants/contributions/brackets/rounding/regularization and independent fixtures. |
| `payroll.productionAdmission` | Absent | Approved scope, contract and genuine catalogue/release evidence hashes. |
| `payroll.compensation.allowances`, `.benefits`, `.deductions` | Absent | Reviewed values and treatment, sources, dates and required scenario coverage. |
| `payroll.attendance.leave`, `.overtime` | Absent | Reviewed paid/unpaid and overtime treatment plus tax/social-base effects. |
| `payroll.composite.registerTieOut` | Absent | Reviewed composite amounts and lifecycle proof requirements. |
| `payroll.declarations.default` | Absent | Reviewed declaration configuration and provenance. |
| `taxes.vat.standardRateBps` | Existing envelope begins 2026-01-01 | Source-backed published 2025 envelope covering the November/December invoice dates. Purposes: `AP_SUPPLIER_INVOICE_INPUT_VAT` and `AP_SUPPLIER_PAYMENT_INPUT_VAT`. |
| `taxes.withholding.supplierPayments` | Absent; AP records `NOT_CONFIGURED` | Assess applicability separately; not the immediate historical invoice blocker. |

Every proposed envelope needs executable `value`, resolvable `legalRef`, effective interval, authentic `verifiedOn`/`verifiedBy` and appropriate `verificationStatus`. Legal-reference metadata needs ID, title, jurisdiction, issuer, official URL, retrieval date and precise provision where applicable. Existing retrieval dates are retained as historical facts, not replaced by today's date. Source and fixture hashes bind exact retained artifacts.

Full release coverage comprises **CNPS_PENSION, CNPS_FAMILY_ALLOWANCE, CNPS_OCCUPATIONAL_RISK, IRPP_PERIOD, IRPP_YTD, IRPP_ADJUSTMENTS, IRPP_CORRECTIONS, ALLOWANCES_BENEFITS, DEDUCTIONS_RECOVERIES, LEAVE_OVERTIME, COMPOSITE_REGISTER_TIE_OUT**. Each needs independently reviewed input/expected-output fixtures, review identity/date, legal reference, source-evidence hash and required topics. YTD/correction fixtures additionally require the exact lifecycle proof fields enumerated in the worksheet. Do not invent hashes to satisfy those fields.

The admission envelope must bind `status: APPROVED`, `calculatorContract: stoquify-payroll-calculator.v1`, `scope: CM_PRIVATE_SME_MONTHLY_SINGLE_EMPLOYER`, and valid `sha256:<64 lowercase hex>` values for `obligationCatalogueHash` and `releaseEvidenceHash`. These are required conditions, not approval values populated by this task.

Legal-owner intake uses the existing protected action and `approvePayrollCountryPackReviewIntakeCertificate`: tenant/actor, fresh authentication, a persisted `READY_FOR_LEGAL_OWNER_SIGNOFF` certificate, `expectedCertificateHash` and authentic `approvalEvidenceHash`. Publication/runtime authority transition is separate. A synthetic user cannot stand in for the statutory reviewer.

## Official-source research

The [official DGI 2026 publication page](https://www.impots.cm/index.php/en/node/1333) links the [2026 tax code PDF](https://www.impots.cm/sites/default/files/publications/CODE%20GENERAL%20DES%20IMPOTS%202026%20%20VERSION%20FRANCAISE.pdf). Both were opened on 2026-10-29. The complete [2026 tax code bytes](../database-seed/payroll-unblock-workpapers/DGI-CGI-2026.pdf) are now retained with SHA-256 and byte length. Discovery and byte retention establish a candidate source; they do not establish an approved calculation contract or applicability to 2025.

The existing 2025 source URL returned 404. Two official-sitemap alternatives also returned 404. The [official DGI document listing](https://www.impots.cm/index.php/fr/documents/39?page=1) exposes the 2025 finance-law PDF. Its web-tool fetch timed out, but direct HTTPS retrieval subsequently succeeded; the complete [2025 finance-law bytes](../database-seed/payroll-unblock-workpapers/DGI-finance-law-2025.pdf) and digest are retained. The consolidated 2025 tax code and amendment/applicability review remain outstanding. Exact URLs, retrieval outcomes, timestamps, lengths and digests are recorded in [official-source candidates](../database-seed/payroll-unblock-workpapers/official-source-candidates.json). No third-party substitute or unverified tax formula was inserted.

## Engineering work and acceptance

| ID | Work | Required proof |
|---|---|---|
| ENG-01 | Obtain reviewed calculation contract: cumulative/annualized basis, tax year, adjusted base and withholding identities, ordering, corrections/reversals, refund treatment. | Independent expected-result fixtures for boundary cases, including year reset. |
| ENG-02 | Wire authoritative YTD taxable base, withholding and adjustment values into `calculatePayrollRun`. | Actual service cross-month results agree with the independent fixtures. |
| ENG-03 | Establish complete historical snapshots and the correct tax-year basis; resolve current missing/zero fallbacks. | Missing/stale/partial history denied; non-calendar fiscal-year case correctly handled. |
| ENG-04 | Define same-day/off-cycle order and consistent concurrent history. Calculation currently uses `inTransaction` without explicit isolation, despite separate serializable helpers existing. | Real PostgreSQL contender, retry/replay and rollback evidence. |
| ENG-05 | Bind original/correction/reversal identities before tax evaluation and avoid duplicate accumulation. | Chained corrections/reversals reconcile withholding and downstream proofs. |
| ENG-06 | Align adjusted taxable-base snapshots and refund/zero-floor behavior with ENG-01. | Base/tax adjustment and negative-tax cases match reviewed outcomes. |
| ENG-07 | Produce integrated register, payslip, posting, declaration, payment and close-invalidation proof. | Service and PostgreSQL evidence; evaluator fixtures alone are insufficient. |
| ENG-08 | Extend the runner beyond its current September-only calculation (`m===10`); use chronological, idempotent lifecycle steps. | Intended organization/month workflows complete with replay showing no duplicates. |
| ENG-09 | Resolve October's October-31 pay date versus observations through October 28 and `CURRENT_PERIOD_PENDING`. | Either a supported complete-period input set or an explicit pending October scope; no fabricated certification. |
| ENG-10 | **COMPLETED_ENGINEERING.** Reconciled checklist/preflight decisions, reviewed manifest states, signature/checker integration and related integrity gaps. | 43 tests passed across three isolated suites; eight original regression failures reproduced before correction. Current code and result hashes retained. |

ENG-10 results:

- `MORE_EVIDENCE_REQUIRED`, `REJECTED` and `CHANGES_REQUIRED` are valid recorded family responses but cannot authorize transition. All required families still need authentic `APPROVED` decisions.
- Post-transition manifests accept `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` with exact reviewer, completion timestamp, effective interval, approval artifact and family bindings, plus reviewed source flags. Legacy manifest `APPROVED`, stale bindings and premature source production flags are rejected. Actual regulator confirmation remains an external evidence requirement.
- Condition 11 now invokes the existing signature/checker validator. Matching approval bytes alone are insufficient: an accepted signature method, separate named checker and retained verification-evidence hash are required. The preflight still has 12 conditions. The separate signature command remains useful for diagnostics; no automated cryptographic or legal authentication is claimed.
- Reversed/invalid approval dates and final scope extending beyond a family's reviewed interval are rejected. Open-ended dates remain valid when the reviewed family intervals permit them.
- Fixture-hash readiness rejects empty/scalar review objects, unnamed families and duplicate families. Checker validation requires a named reviewer. These are structural safeguards; they do not establish independent calculation correctness.

Regression evidence: the initial 34-test run reproduced eight failures with 26 passes. After correction and nine additional boundary tests, all 43 tests passed in the preflight, review-package and synthetic production-gate suites. The isolated configuration avoids Next.js setup, environment files, application imports and database connections. The exact command, result files and source hashes are in the engineering results.

Remaining engineering was reassessed against the current service and runner. ENG-02 through ENG-06 require ENG-01's expected behavior; ENG-07 requires those implementations and approved fixtures; ENG-08 requires the accepted service lifecycle, admitted date-effective rules and ENG-09's October scope. A September-only runner expansion now would attempt incomplete or unsupported calculations. These items remain explicitly pending rather than being filled with guessed tax behavior. Existing unrelated payroll-service edits were preserved.

HRIS reference authoring UI/API coverage remains a separate product capability. Existing synthetic position/assignment/reporting/delegation evidence is not a new request for human approval. Preserve the three deliberate unlinked self-service negative personas unless the test scope explicitly changes. Later people-scenario evidence exists; re-read that evidence before treating every previously pending lifecycle input as still open.

## Ordered continuation

1. Recover missing official 2025 evidence; complete independent 2025/2026 statutory review and ENG-01. Independent engineering preparation may continue now.
2. Complete ENG-02 through ENG-07 against reviewed fixtures, then ENG-08 for the agreed scope; resolve ENG-09 before claiming October completion. ENG-10 is complete with scoped unit evidence.
3. Authenticate the returned signed packet, run the separate signature/maker-checker verification, compute hashes from completed independent review, then require preflight 12/12. Persist legal-owner intake approval and perform the reviewed publication/runtime transition for exactly the approved scope.
4. Confirm the guarded disposable target and current baseline. Create/reuse periods, resolve applicable pending inputs, certify attendance and freeze snapshots.
5. Calculate chronologically, reconcile reviewed outputs, independently approve, emit payslips/post journals, and execute synthetic payment/declaration workflows through normal controls.
6. Re-preview/approve the historical AP invoices with the approved date-effective VAT rules. Reconcile all totals and perform idempotent replay with retained evidence.

No live provider settlement, real payment, regulatory submission, production deployment or production-database access is authorized by this packet. No such access is needed for the disposable scenarios.

## Verification and readiness

See [task validation](../database-seed/payroll-unblock-workpapers/validation.json) for fresh results and [review gate diagnostics](../database-seed/payroll-unblock-workpapers/review-gate-diagnostics.json) for the expected pending-review outcomes. Command definitions/helpers were inspected before execution. The workflow contract check passed, reporting 196 package scripts outside the reviewed manifest; this does not approve those scripts.

- Documentation: inventory and evidence-supported preparation complete for the inspected scope; authentic return fields remain honestly pending.
- Development continuation: review-tool reconciliation is complete; seven engine/runner work items remain dependent on the reviewed contract and acceptance evidence, with exact owner inputs listed above.
- Disposable full payroll: blocked on authentic rules/review/admission, engineering acceptance, and unresolved October input scope.
- Production: blocked; no production readiness claim.
- Unit tests: **43/43 passed in three isolated suites**, using synthetic filesystem evidence; before correction, eight regression failures were reproduced. This includes tests of the production-gate script, not a real release-gate execution.
- Real PostgreSQL tests and browser checks: **NOT_RUN**. Retained 1,081-assertion and replay reports are historical, with later scenario changes; no fresh whole-dataset certification is claimed.

Rollback: revert only this task's changes to the two review-tool scripts, their tests and isolated Jest configuration, then regenerate the register/report to remove the completion claim. For the documentation task, remove only its new register, completion packet/workpapers and its link additions. Preserve original review templates, retained signed/source artifacts, application runtime code, historical evidence and unrelated changes. The current [PDF report](../database-seed/../unblock/PAYROLL-UNBLOCK-REPORT-2026-10-29-ENGINEERING.pdf) and [prompt PDF](../database-seed/../unblock/PAYROLL-UNBLOCK-PROMPT.pdf) are published in `docs/unblock`; older PDFs elsewhere remain historical.
