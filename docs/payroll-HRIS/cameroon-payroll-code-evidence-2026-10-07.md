# Cameroon payroll calculation and financial lifecycle — source evidence

Audit date: 2026-10-07. Scope: private-sector SMEs with 10–250 employees, as confirmed during discovery. This document supplements the existing HRIS realization roadmap and Payroll Trust Spine execution register. It does not replace either program, certify current statutory compliance, or claim to have executed their historical test evidence.

Research only: no application/configuration changes, database connections, migrations, seed or calculation/payment commands were executed for this subtask. Paths and line numbers below identify inspected current source. Official-law validation is a separate workstream in the parent audit; numeric examples here isolate code behavior rather than prescribe payroll amounts for a real employee.

## Architecture retained

Graph discovery used `graphify-out/graph_actions.json`, including `payroll_payroll_control_actions_ts` and its calculate/approve/post/read-model nodes in community 5, and the payroll reconciliation action node in community 73. Source inspection supersedes graph lines and historical graph coverage.

Existing layers are substantial and should be extended:

- `services/regulatory/country-packs/{schemas,validation,resolve,hash,registry}.ts`: effective-dated parameter envelopes, source provenance, version pinning, capability status, legal references and resolution hashes. Registry currently contains CM only (`registry.ts:4`).
- `services/payroll/payroll-country-pack-fixture-runner.ts`, `payroll-statutory-scenario-coverage.service.ts`, `payroll-country-pack-review-intake.service.ts`: executable fixture evidence, required statutory scenario families, source hashes and legal-owner intake. Approval evidence persists through `payroll-country-pack-review-intake-persistence.service.ts:229`; a stored review certificate is not itself a runtime registry deployment.
- `services/payroll/payroll-control.service.ts:5349`: validates period and immutable original correction proof, rejects unresolved HR changes, constructs certified HRIS engine inputs, calculates Decimal components, stores employee-level input/calculation/provenance/YTD hashes.
- Current lifecycle is `CALCULATED → REVIEWED → APPROVED → EMITTED → POSTED` (source functions at `:6800`, `:6947`, `:7149`, `:7457`; existing machine contract in `docs/HRIS-Payroll/payroll-trust-spine-execution/contracts/payroll-lifecycle-contract.json`). Distinct actors, fresh authorization, expected versions, transaction-bound events, replay and close invalidation must survive changes. Legacy combined approval/posting is disabled at `:7807`.
- Payment request/approval/release functions at `:8227`, `:8618`, `:8796`; `payment-reconciliation.service.ts` retains source-linked proof and closes settlement obligations. Declaration preparation at `:9304` feeds separate declaration lifecycle/authority-adapter services.
- Accounting remains authoritative: `createPayrollLedgerPosting` at `:4143` requires effective posting rules, active tenant journal and accounts; posting checks the open period at `:7549`. `services/accounting/default-posting-rules.ts:673` defines payroll recognition. Payroll does not replace the accounting kernel.

The July realization roadmap says controlled local pilot and has pending phases. The August Trust Spine register reports completed internal engineering work. These refer to different scopes and dates; neither is current Cameroon statutory acceptance. Reconcile status with live code and present verification rather than restarting either roadmap.

## Findings

### F1 — Country publication is not payroll activation (retain safeguards; complete release contract)

`services/regulatory/country-packs/cameroon.ts:10–29` records source-check dates and mandatory independent approval. The pack header at `:44` is `PUBLISHED`, but `:52–53` marks CNPS `SUPPORTED_DRAFT` and IRPP `REQUIRES_EXPERT_REVIEW`; IRPP `productionCalculationSupported` is false. `payroll-control.service.ts:3061` requires CNPS `EXPERT_REVIEWED` or `REGULATOR_CONFIRMED` provenance and applies that check at `:4006`. Therefore the shipped `SOURCE_CHECKED` CNPS envelope is not evidence of an operationally approved calculation.

There is a second boundary to define before promoting only CNPS: `isPayrollCountryPackInputReady` at `:878` allows aggregate `REQUIRES_EXPERT_REVIEW`; the evaluator at `payroll-tax-rule-evaluator.ts:363` returns blocked status with zero un-applied tax. Component evidence retains the blocked status (`payroll-control.service.ts:6189–6216`). Posting validates component consistency and retains blocked-component metadata (`:7568–7600`), so the presence of the word BLOCKED is not a demonstrated universal prohibition on later financial effects.

**Action:** define an explicit employer production admission rule separate from engineering/partial calculation. Require complete applicable statutory coverage before emission/payment for live employers; preserve truthful review-only scenarios. Test partial pack promotion end to end, not just its displayed capability.

### F2 — AT/MP contribution shares the pension ceiling in the calculation path (correct before activation)

`payroll-control.service.ts:5742` takes the monthly pension ceiling. At `:5825–5842`, one capped `socialBase` is used for employee pension, employer pension, family allowance and occupational risk. The pack contains 750,000 monthly / 9,000,000 annual pension ceiling values (`cameroon.ts:351–352`) and AT/MP A/B/C rates of 175/250/500 basis points (`:366–368`).

For a synthetic contributable remuneration of 1,000,000 XAF in group A, the current capped branch yields 750,000 × 175 / 10,000 = 13,125. A calculation using the uncapped 1,000,000 base yields 17,500. The parent official-source review identifies different statutory cap treatment for AT/MP versus PF/PVID; qualified validation must confirm remuneration inclusions/exclusions as well as the cap.

The fixture runner calculates AT/MP directly from its supplied `contributionBaseAmount` (`payroll-country-pack-fixture-runner.ts:748–778`), while shipped fixtures use 100,000 (`cameroon.ts:892` and related groups). Thus the fixture path does not expose the run-level ceiling discrepancy. No malformed basis-point literals were found; the issue is base selection and coverage.

**Action:** distinct named contribution bases and cap policies, shared calculation implementation between official fixtures and the run path, tests below/at/above ceiling for all risk groups and eligible sectors. Preserve source hashes and financial tie-out. Do not merely change fixture expected values to match current code.

### F3 — YTD and adjustment support is not wired into run-level tax evaluation (complete integration)

`payroll-tax-rule-evaluator.ts:42–44` accepts YTD taxable base, YTD tax withheld and adjustment values. It implements progressive period/YTD modes at `:385–410`, and omitted values default to zero (`:345–351`, `:165`). The actual run call at `payroll-control.service.ts:5843–5851` supplies only taxable base, capability and currency. Prior runs are fetched at `:5695`, and accumulator proof is constructed later at `:5984`; storing that proof does not supply it to the tax formula.

Tests at `services/payroll/__tests__/payroll-tax-rule-evaluator.test.ts:114` and `:188` are synthetic evaluator scenarios with explicit YTD inputs. They do not prove the production run passes those inputs. Prior-run selection also uses pay date strictly less than the current pay date (`payroll-control.service.ts:5702`), excluding same-day prior off-cycle/correction runs from that query.

**Action:** reviewer-approved tax context with explicit year basis, prior eligible runs, same-day ordering, contribution deductions, reliefs/allowances, advances/regularization and correction semantics. Fail closed for required context that is missing; distinguish legitimate zero from absent input. Verify evaluator and actual `calculatePayrollRun` with the same golden scenarios.

### F4 — Statutory rounding/year policy inherits accounting configuration (separate responsibilities)

`resolvePayrollRoundingPolicy` at `payroll-control.service.ts:1968–2000` permits only HALF_UP scale 2 and derives its source from organization accounting settings. `resolvePayrollYearToDatePolicy` at `:2029–2063` uses the tenant accounting fiscal-year start, defaulting to a calendar year. Many component calculations round at scale 2; tax rules independently expose `roundingScale` (`payroll-tax-rule-evaluator.ts:424`).

The code does not by itself establish the legally correct payroll tax year, contribution period, taxable-base rounding, tax/payment rounding or treatment of fractions in XAF. The pack's field name `monthlyCeilingMinorUnits` is passed directly as an amount, so monetary-unit naming also needs an explicit contract.

**Action:** separate approved national statutory policy from ledger precision and settlement denomination; pin effective policies in snapshots. Audit each rounding stage and year boundary, including corrections across a policy change. Do not globally round all accounting entries to zero decimals without a reviewed accounting decision.

### F5 — One active contract/employee view limits historical and segmented payroll (complete supported scenarios)

At `payroll-control.service.ts:5611–5632`, the employee query requires current ACTIVE status and retrieves only the latest ACTIVE overlapping contract (`effectiveFrom` descending, `take:1`). At `:5768`, its base salary feeds the period's attendance ratio. The attendance calculation (`:3257–3350`) supports paid/unpaid time ratios and one overtime-rate mode; it is not an independently verified implementation of every weekly/night/weekend/collective-agreement rule. Default Cameroon pack has no reviewed attendance policy to supply these branches.

Corrections are controlled deltas against immutable original lines, require a separate period and explicit employees (`:5410–5532`), but resolve country rules at the correction period pay date (`:5449`). This needs an explicit original-period-rule versus current-rule policy. HRIS readiness may reject unsupported inputs; this finding does not assume every unsupported case currently calculates silently.

**Action:** support or explicitly reject joiner/leaver, mid-period contract/salary changes, arrears, retroactive and off-cycle cases using period-eligible people and effective-dated segments. Define formula treatment through official/sector evidence. Retain snapshots and correction deltas; never mutate finalized source payroll.

### F6 — Declarations are an internal-review fallback, not a national filing implementation (complete per-authority outputs)

The default Cameroon payroll parameters (`cameroon.ts:327–410`) include CNPS and an IRPP blocker, not `payroll.declarations.default`. Preparation attempts that key at `payroll-control.service.ts:9418`, catches resolution failure, and creates `INTERNAL_PAYROLL_CONTROL / PAYROLL_LIABILITY_REVIEW`, no due date, with `REQUIRES_COUNTRY_PACK_EXPANSION` (`:9453–9463`). This is an honest fallback.

Future expansion cannot just add two declaration configurations: inside the loop, each declaration currently receives the same total `declarationCorrectionWorkflow.declarationAmount` (`:9482`) from aggregated statutory liability (`:2983`). CNPS and tax authority outputs require their own component/base/detail mapping and tie-outs. Targeted search of the inspected payroll/default-pack paths found no first-class CFC/FNE/RAV/TDL/CAC implementation; their exact applicability must come from the legal matrix, not acronym-based assumptions.

**Action:** per-authority schema/version, liability mapping, period/deadline resolver, employee detail, artifact, amendment, submission and acknowledgment evidence. Manual verified authority workflows are a valid initial scope; adapter registry already distinguishes manual review from production automation (`payroll-adapter-registry.service.ts:319–414`). Do not claim automatic filing merely from generating an internal record.

### F7 — Strong payment/accounting/close controls need current end-to-end proof (retain and verify)

Existing calculation, payslip, register, payment, declaration and accounting artifacts carry source/provenance hashes. Posting validates component proof and creates journal/source links transactionally. Lifecycle transitions use Serializable retry at `payroll-control.service.ts:1507`, expected version checks and independent actors. Payroll payment reconciliation binds proof to a batch/transaction and reviewed balance, audits sensitive actions, then invalidates close (`payment-reconciliation.service.ts:1600`, `:1642–1666`, `:1861`).

Source and historical unit/database reports do not prove the current deployed schema, rollback, concurrency or provider behavior. Small employers also need staffing/delegation design: existing three-person control contract should not be bypassed through self-approval simply to reduce onboarding friction.

**Action:** isolated PostgreSQL tests for calculation→review→approval→payslip→posting→payment→settlement→declaration/close, including duplicate callbacks, conflicting commands, denied actors, partial/failed payments and stale close evidence. Reuse existing certification runners after target review. Design external payroll/accountant delegation or independently reviewed exception policy separately.

### F8 — Country-pack envelopes are reusable; payroll orchestration is still Cameroon-shaped (prepare minimal extension)

Registry currently includes only Cameroon. `resolvePayrollCountryPackStatus` (`payroll-control.service.ts:3900–4070`) always requires CNPS family sector/risk classification and resolves fixed `payroll.cnps.*` and `payroll.irpp.*` paths; a new registry entry alone cannot provide a different national calculation. Existing hashes/effective dates/fixtures/review intake are useful shared mechanisms.

**Action:** after Cameroon acceptance, introduce a narrow country-specific payroll capability/provider boundary for component definitions, context, tax/contribution policy and declarations. Keep the existing workflow/authorization/snapshots/payment/accounting interfaces shared. Add no generic expression language or new rules engine without a demonstrated rule requirement. Research each later CEMAC country independently; qualify language, demand, evidence, reviewer and operator readiness before ordering rollout.

## Scoped backlog for the existing roadmap

### Completeness follow-up — compensation balances and payslip artifact

Approved component support exists: `prisma/schema.prisma:2569–2580` defines EARNING, DEDUCTION, EMPLOYER_CHARGE and INFORMATION with FIXED_AMOUNT, RATE_BPS, QUANTITY_RATE and FORMULA_REFERENCE. `PayrollRubrique` at `:3041` carries taxable/social base treatment, payslip label, account codes and statutory provenance; effective-dated employee assignments at `:3085` carry approval/evidence links. `services/hris/compensation.service.ts:81–88` assigns employee compensation ownership to HRIS and statutory meaning to the country pack. `payroll-control.service.ts:5641` consumes ACTIVE assignments overlapping the period; `:3670–3795` aggregates earning, deduction and employer-charge effects. These are useful recurring-benefit/authorized-component primitives and should be retained.

They do not demonstrate a loan/advance balance lifecycle. In the bounded search of `services/payroll`, `services/hris`, `actions/payroll`, `actions/hris` and the Prisma schema, no distinct loan/advance principal, disbursement, installment schedule, remaining-principal or final-installment mechanism was found. A LOAN example exists as a fixed deduction test fixture (`services/payroll/__tests__/payroll-control.service.test.ts:2566–2582`). `payroll-employee-balance.service.ts:1444` expressly permits new balance cases only from posted correction payroll runs; its `SETTLE_DEDUCTION` event is not evidence of general loan origination or scheduled repayment. Also verify one-off deduction consumption and duplicate application across ordinary/off-cycle runs before claiming that support.

Minimum follow-up is a separately authorized balance/repayment source, consumed by approved payroll components: principal/disbursement evidence, consent or other lawful authority, schedule and balance revisions, deduction limits, cancellation/early settlement, idempotent actual-payroll allocations and correction reversals. Reuse correction-balance audit patterns without forcing loans to masquerade as payroll corrections. Legal limits and the employer's need for lending must be resolved before deciding whether this is launch scope.

Payslip export is explicitly JSON-only: `payslip-self-service.service.ts:36` accepts `json`, `:900` records `NOT_GENERATED_NO_APPROVED_PAYROLL_PDF_RENDERER`, and `:947` returns `application/json`. Targeted searches of payroll/services/actions/components/app/lib found no separate production payslip PDF renderer; a `.pdf` archive URI in a component test is fixture data, not an implementation (`components/payroll/__tests__/PayrollPayslipSelfService.test.tsx:137`). This bounded result does not claim the repository lacks PDF libraries for other documents. Add an approved EN/FR statutory payslip template and immutable artifact rendering/delivery on top of existing self-service privacy, watermark and audit controls; independently review required content and readable exported output.

| Item | Priority / owner | Scope / acceptance | Verification / estimate / rollback |
|---|---|---|---|
| CP-01 statutory release contract and source matrix | Launch prerequisite; payroll owner + Cameroon reviewer | Reconcile pack publication, capability, source checking, legal approval and employer activation; complete applicable obligation inventory; CNPS-only/IRPP-blocked scenarios cannot be presented as full payroll | Negative capability/admission tests and legal review; 3–5 engineer-days plus review latency; disable new activation and keep reviewed draft workflow |
| CP-02 contribution-base correction | Launch blocker; backend + CNPS specialist | Separate pension/PF/ATMP bases and cap semantics; same production implementation in fixtures; boundary scenarios and register/ledger tie-out | Formula unit + actual run fixture + PostgreSQL posting proof; 2–4 days after signed rules; revert unactivated pack/code together, never silently recalculate finalized payroll |
| CP-03 complete IRPP/context/rounding pipeline | Launch blocker; payroll engineer + tax reviewer | 2026 source-backed formula and applicable related obligations; required context supplied by run; year/rounding/adjustment/correction policy pinned | Independently calculated employee/year/threshold examples and actual run tests; 5–10 days after source decisions; deactivate new version, preserve old snapshots |
| CP-04 effective-period employment and correction cases | Launch scope decision; HRIS + payroll owners | Define supported joiner/leaver/mid-period/retro/off-cycle scenarios; segment inputs or deny explicitly; deterministic original-vs-correction rule version | Multi-contract and termination fixtures, sealed replay and same-day ordering; 5–8 days; additive snapshot version and guarded rollout |
| CP-05 national declarations and liability allocation | Launch prerequisite for claimed filing support; compliance/accounting | Distinct CNPS/DGI applicable outputs, per-authority totals/deadlines, validated manual submission/ack/amendment evidence | Component-to-declaration-to-ledger reconciliation, official output reviewer acceptance; 4–8 days; retain old evidence, stop new output version |
| CP-06 financial chain and employer pilot | Launch prerequisite; QA + independent domain reviewer | Current disposable-DB concurrency/rollback/tenant/SoD/settlement/close tests and synthetic employer payroll; separate mocked, DB, browser and legal outcomes | Reuse existing isolated runners; 4–7 days plus environment/pilot time; reversible tenant rollout and correction-only financial rollback |
| CP-07 maintainability and country boundary | Later, after Cameroon stable; architecture + payroll owners | Characterize the 11k-line control service before extracting narrow functions; country extension contract without cloned Cameroon taxes; keep country registry/review pipeline | Behavioral parity, unsupported-country failures, independent target-country research; 3–6 days for boundary only; retain stable facade, no mass refactor |
| CP-08 employee document and deduction completeness | Payslip is launch prerequisite; loan scope conditional; HRIS/payroll + reviewer | Approved bilingual payslip artifact and immutable source binding; separately scope authorized loan/advance balances, schedules and one-off deductions when required by pilot employer; retain existing approved component engine | Document content/privacy/render tests and human review; repayment cap/final installment/replay/correction tests; payslip 3–5 days, balance lifecycle 5–8 days after decisions; version artifacts and disable new origination without deleting evidence |

Estimates assume existing infrastructure and one engineer familiar with the code; they exclude unresolved legislation, domain reviewer turnaround, missing database environments and unrelated HRIS implementation. Route these items into the existing realization roadmap/trust-spine program, not a parallel replacement program.

## Verification status and next evidence

**Inspected:** graph nodes, current calculation/control/evaluator/country-pack/declaration/adapter sources, selected test source and existing roadmaps. **Not run for this audit:** payroll formula suites, PostgreSQL certification, live provider/authority integration, browser journeys or qualified payroll calculation review. Prior 2026-10-07 ECC pilot coverage was mocked/static/component evidence; its payroll immutability test only inspects SQL text.

Useful existing targets: `services/payroll/__tests__/payroll-control.service.test.ts` (input readiness, corrections, component proof, declaration fallback, close invalidation), `payroll-tax-rule-evaluator.test.ts` (synthetic period/YTD/adjustment/invalid bracket cases), `payroll-country-pack-fixture-runner.test.ts`, `payroll-statutory-scenario-coverage.service.test.ts`, `payroll-country-pack-review-intake*.test.ts`, `declaration-lifecycle.service.test.ts`, and `payroll-payment-reconciliation.service.test.ts`. Existing real-DB tooling includes `scripts/payroll-trust-spine-postgres-certification.js` and immutability runtime runners; inspect commands, dependencies and disposable target before using them.

Persistent ECC contribution: keep invariant/test mapping, official-source-to-rule/fixture traceability, command effects and evidence classes in project artifacts; require focused security review for lifecycle/payment changes and search-first before new abstractions. UIUX contribution: represent readiness, partial calculations, review-required rules, pending payments, manual filing and stale close proof honestly through existing shared states. Neither skill can provide professional statutory sign-off.
