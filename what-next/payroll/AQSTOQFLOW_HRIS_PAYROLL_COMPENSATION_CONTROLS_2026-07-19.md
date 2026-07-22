# AqStoqFlow HRIS–Payroll Compensation Controls

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-06-compensation-controls`  
Decision: **VERIFIED AND HARDENED — Payroll consumes approved, effective, traceable compensation records only**

## Scope

Verify the bounded compensation boundary after contract-lifecycle hardening: compensation and rubrique ownership, assignment and salary-change maker-checker controls, benefits/deductions traceability, effective dating, payroll draft exclusion, stale-source denial, tenant scope, audit evidence, and salary redaction. No statutory formula, unrelated HRIS workflow, payment, or accounting behavior was changed.

## Prerequisite result

The source-truth map assigns compensation and benefits business ownership to HRIS, retains the current Payroll-named tables as compatibility storage, assigns statutory meaning to reviewed country packs, and requires Payroll to consume approved effective-dated source proof. Skill 05 passed and now makes canonical HRIS contract approval and document evidence a prerequisite for compensation activation.

## Files inspected

- `services/hris/compensation.service.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/hris/approval-inbox.service.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-employee-balance.service.ts`
- `actions/payroll/payroll-compensation.actions.ts`
- Focused HRIS compensation, readiness, approval-inbox, Payroll compensation, calculation, and employee-balance tests
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_SOURCE_TRUTH_MAP_2026-07-19.md`
- `what-next/payroll/AQSTOQFLOW_HRIS_PAYROLL_CONTRACT_LIFECYCLE_2026-07-19.md`

No current top-level compensation/action knowledge-graph artifact was available in `graphify-out`; conclusions were grounded directly in the current source and focused tests.

## Control findings

- The HRIS compensation facade owns the business workflow while delegating compatibility persistence to the Payroll-named compensation service.
- Assignment requests are forced to `DRAFT`; callers cannot create an active assignment directly.
- Assignment activation requires evidence, a separate approver, and a canonically approved effective contract.
- Salary changes follow request, independent approval, and independent apply stages; they create a new effective-dated contract version instead of mutating the active salary.
- Duplicate open salary requests and retroactive changes that overlap existing payroll run lines fail closed.
- Payroll calculation queries only `ACTIVE`, non-deleted assignments effective for the payroll period, and only active rubrique definitions.
- The HRIS readiness export requires approved compensation metadata, request and approval event references, evidence hashes, and the active contract identity.
- Every approved assignment is included by identifier and content hash in the certified employee source snapshot.
- Payroll rechecks the current HRIS source against the certification before consumption; a changed amount, rate, quantity, period, evidence reference, approval reference, rubrique, currency, or contract link makes the proof stale.
- Earning, deduction, and employer-charge rubriques are carried into payroll component proof; formula-reference benefits additionally retain reviewed country-pack parameter and legal provenance.
- Employee balance cases are downstream correction/settlement evidence and do not act as an alternate mutable compensation source.

## Gap found and corrected

The stale-source mechanism already hashed compensation assignments, but the focused readiness suite only demonstrated drift using contract salary. That left the compensation-specific fail-closed behavior implicit.

This tranche adds a regression that certifies an approved compensation assignment, mutates its amount after certification, and proves `assertHrisPayrollEmployeeSourceCurrent` rejects the source as stale. No production service change was needed because the existing implementation already enforced the intended boundary.

## Data ownership decision

- HRIS owns employee compensation intent, assignment approval, salary-change workflow, effective dates, and readiness certification.
- Payroll-named assignment and salary-change records remain compatibility storage during the migration; they do not redefine ownership.
- Payroll owns calculation consumption and component output, but may consume only active, effective, certified HRIS source records.
- Country packs own statutory benefit/deduction meaning and formula provenance.
- Accounting and balance-case services own downstream posting, correction, and settlement evidence, not compensation source truth.

## Tenant and RBAC decision

- Reads and mutations remain constrained by `organizationId` and employee scope.
- HRIS facade operations require HRIS compensation read/manage authority and bind decisions to the scoped employee before delegation.
- Existing Payroll compatibility actions are permission-protected and call the same guarded service rather than a second mutation implementation.
- Requester, approver, and applier separation remains enforced for salary changes; assignment requesters cannot approve their own requests.
- No permission vocabulary, global administrator scope, route, sidebar, or navigation change was introduced.

## Audit and redaction decision

- Assignment and salary-change requests require evidence and record business-event references.
- Approval and application retain actor separation, approval evidence, before/after state, and effective dates.
- Ordinary compensation reads redact salary and sensitive amounts unless the caller has explicit salary access.
- Approval-inbox summaries exclude authority internals, salary values, payment values, and raw document values.
- Readiness exports expose source hashes and identifiers, not raw base salary or compensation values.

## Gates run

```text
PASS: 6 focused Jest suites
PASS: 74 focused tests
PASS: compensation assignment draft and direct-active denial
PASS: assignment maker-checker and approved-contract evidence
PASS: salary-change requester/approver/applier separation
PASS: effective-dated salary versioning and payroll-run overlap denial
PASS: earning, deduction, employer-charge, and country-pack formula traceability
PASS: Payroll ACTIVE/effective assignment consumption
PASS: HRIS readiness approval proof and tamper detection
PASS: compensation-assignment stale-source denial
PASS: approval-inbox scope and redaction
PASS: employee-balance downstream boundary
PASS: focused ESLint
PASS: skill-package validation
```

## Baseline-gap delta

- Compensation stale-proof coverage: `assignment hashes implemented but only contract drift demonstrated -> approved assignment mutation explicitly rejected after certification`.
- Draft-consumption confidence: `query guard present -> verified with the calculation and compensation control suite`.
- Benefit/deduction traceability confidence: `component and country-pack evidence present -> verified across earning, deduction, employer-charge, and formula-reference cases`.
- Production behavior: `already conformant after prerequisite tranches -> no speculative service or schema change`.
- Required focused gate: `implicit coverage across separate suites -> one recorded 6-suite/74-test compensation-control gate`.

## Skipped checks

- No schema migration, seed, backfill, or production data mutation was required.
- No statutory rates or formulas were changed; formula completeness remains country-pack provenance work.
- No browser or accessibility flow was changed, so browser execution was outside this bounded service-control tranche.
- Full-project TypeScript checking was not rerun because the established repository baseline exhausts the available V8 heap; focused Jest compilation and ESLint passed.

## Residual risk

- Physical table, service, and action names remain partly Payroll-named compatibility surfaces; the source-truth map schedules their adapter migration rather than duplicating storage now.
- Salary-change-created contract versions remain intentionally blocked from Payroll until they satisfy the same canonical HRIS contract approval and document-evidence proof as every other active contract.
- Legacy active assignments without complete request, approval, evidence, and contract-link metadata require reviewed backfill/certification and are intentionally denied.
- Country-pack legal and statutory coverage is not expanded by this tranche.

## Next handoff

Skill 06's stop condition is closed: Payroll calculation cannot read mutable compensation drafts, and certified approved compensation becomes unusable if its source changes. Hand off to `aqstoqflow-hris-payroll-07-document-evidence-redaction` for the next bounded tranche.
