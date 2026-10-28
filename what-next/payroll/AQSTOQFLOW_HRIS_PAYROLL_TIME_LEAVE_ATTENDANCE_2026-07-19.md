# AqStoqFlow HRIS–Payroll Time, Leave, And Attendance

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-08-time-leave-attendance`  
Decision: **IMPLEMENTED AND HARDENED — Payroll calculation and operator readiness now require the same approved, immutable HRIS attendance certification; unresolved or mutable time/leave state fails closed**

## Scope

Verify the bounded HRIS-to-Payroll time, leave, and attendance boundary after document-evidence controls. The review covered policy provenance, approved leave and overtime evidence, period totals, manager scope, maker-checker approval, immutable freeze/correction lineage, Payroll input consumption, payment readiness, command-center readiness, audit, redaction, tenant isolation, and sealed-payroll behavior.

This tranche did not introduce a broader workforce-management product, change payroll formulas, add UI routes, or modify unrelated HRIS functionality.

## Prerequisite result

The employee identity, effective-dated organization/manager scope, contract, compensation, and document-evidence prerequisites are present. The existing HRIS time/leave certification service already derives tenant and actor context server-side, requires effective manager scope, separates preparation from approval, validates policy and evidence manifests, and publishes an immutable frozen Payroll attendance snapshot.

Payroll calculation already invokes the HRIS certification validator and therefore cannot calculate from a legacy aggregate-only, unapproved, mutable, out-of-period, or country-mismatched attendance snapshot.

## Architecture evidence

The available `graphify-out/ordered-code-graph.json` places Payroll attendance freeze and calculation-policy functions in the Payroll control community and payment-readiness functions in a separate readiness community. The current HRIS time/leave service is newer than the graph snapshot and is not represented there. Accordingly, the graph was used to identify the cross-community integration boundary, while current source and focused tests were treated as authoritative for behavior.

## Files inspected

- `services/hris/time-leave.contract.ts`
- `services/hris/time-leave.service.ts`
- `services/hris/__tests__/time-leave.service.test.ts`
- `actions/hris/time-leave.actions.ts`
- `actions/hris/__tests__/time-leave.actions.test.ts`
- `services/hris/org.service.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/command-read-model.service.ts`
- Focused Payroll control, payment-evidence, and command-read-model tests
- Current HRIS/payroll blueprints and the prior time/leave implementation reports

## Baseline controls verified

- HRIS owns attendance certification meaning; Payroll consumes the approved frozen result.
- Certification is versioned and identifies source system, source record, and source revision.
- Country and company policy hashes, leave and overtime policy hashes, work-schedule hash, holiday-calendar hash, effective coverage, and reviewed policy status are mandatory.
- Attendance-import and leave-balance proof are mandatory; approved leave/overtime evidence hashes must reconcile with the period totals.
- Unresolved time entries, leave requests, overtime requests, or corrections invalidate certification.
- Period totals must be finite, non-negative, internally reconciled, and identical to the frozen Payroll snapshot.
- Certification country must match the employee country, and its effective period must cover the payroll period.
- Preparation and approval require different actors.
- Manager approval is constrained by effective-dated HRIS reporting scope; tenant administrators retain the bounded correction authority.
- Frozen snapshots carry the approved certification manifest in `metadata.sourcePayload` and a source hash.
- Corrections create a new snapshot with source-revision progression and immutable `correctedFromId` lineage; prior snapshots are not rewritten.
- Sealed Payroll periods reject in-place attendance correction and require a controlled correction-run path.
- Sensitive correction reasons are reduced to governed hashes/redacted evidence rather than exposed as raw text in read models.
- Payroll input readiness, certified engine input, and snapshot freeze already validate the same HRIS certification contract.

## Gap found and corrected

The Payroll engine boundary was fail-closed, but two operator-facing readiness paths were weaker than the calculation boundary:

1. Payment/attendance readiness treated any frozen, source-hashed, non-drifting snapshot as ready without validating the HRIS certification manifest.
2. The command-center attendance gap used the raw count of frozen/source-hashed snapshots, so it could show zero missing attendance even when the payment-readiness model correctly considered no employee ready.

This could not make Payroll calculate from unapproved attendance, but it could create a false-green operational state and delay discovery until calculation or freeze.

The tranche now:

- Validates `metadata.sourcePayload` with `validateHrisTimeLeaveAttendanceCertification` before payment/attendance readiness can return `READY`.
- Passes the snapshot approver, employee country, payroll period, and period totals into that validator.
- Returns `CERTIFICATION_INVALID` with blocker `ATTENDANCE_CERTIFICATION_INVALID` when the manifest is missing, legacy, unresolved, mismatched, or otherwise invalid.
- Performs source-drift comparison only after certification succeeds.
- Computes the command-center attendance gap from the certified `attendanceReadyCount`, not the raw frozen-snapshot count.
- Adds a focused negative test proving that a frozen snapshot containing an unresolved leave request is not ready.
- Strengthens the command-read-model test to prove that frozen but uncertified snapshots remain an attendance gap.

## Data ownership decision

- HRIS owns work policy provenance, time/leave/overtime approval state, balance/import proof, manager approval, certification, and correction lineage.
- Payroll owns calculation and payroll-period state but may consume only a certified HRIS attendance snapshot.
- Readiness and command-center models report the certified consumption state; they do not reinterpret raw time or leave records.
- Legacy Payroll attendance rows remain compatibility projections and are not accepted as certified merely because they are frozen.

## Tenant, RBAC, approval, audit, and redaction decision

- Actions derive organization, actor, permissions, and fresh-auth state from the server session rather than accepting them from the client.
- Service queries and mutations remain tenant-scoped and employee-scoped.
- Manager authority resolves through effective-dated HRIS organization/reporting relationships for the relevant `asOf` date.
- Cross-tenant, cross-employee, and out-of-scope manager attempts fail closed.
- Maker-checker separation prevents the preparer from approving the same certification.
- Freeze and correction operations retain business-event and audit evidence.
- Correction diffs and source revisions are preserved; sealed Payroll state cannot be silently overwritten.
- Operational reads expose readiness state and governed proof, not raw sensitive correction reasons.

## Gates run

```text
PASS: 5 focused Jest suites
PASS: 68 focused tests
PASS: approved attendance freeze evidence
PASS: unresolved leave readiness denial
PASS: frozen-but-uncertified command-center gap
PASS: country and effective-period validation
PASS: maker-checker approval
PASS: effective manager scope and tenant isolation
PASS: immutable correction diff and source-revision evidence
PASS: sealed-payroll correction-run requirement
PASS: HRIS self-service identity scope
PASS: focused ESLint
PASS: skill-package validation
```

## Baseline-gap delta

- Payment attendance readiness: `frozen + source hash + no drift -> valid HRIS certification + frozen + source hash + no drift`.
- Unapproved leave behavior: `engine denial only -> engine denial and operator-readiness denial`.
- Command-center attendance coverage: `raw frozen snapshot count -> certified attendance-ready count`.
- Legacy aggregate snapshots: `could appear READY in payment/readiness views -> CERTIFICATION_INVALID`.
- Readiness consistency: `calculation gate stronger than workbench -> calculation, payment readiness, and command center aligned on the same certification contract`.
- Payroll calculation behavior: `already fail-closed -> unchanged`.

## Skipped checks

- No schema migration, seed, backfill, or production data mutation was required.
- No browser run was required because no route or component contract changed.
- No payroll formula, country-pack rule, accrual calculation, or statutory interpretation was invented.
- Full-project TypeScript checking was not rerun; focused Jest compilation and scoped ESLint passed.

## Current blockers and residual risk

- This is a certification boundary, not yet a complete time-and-attendance product. First-class policy, accrual-ledger, leave-balance, leave-request, work-schedule, holiday-calendar, time-entry, clock-event, overtime-request, delegated-approval, and jurisdiction-rule records remain absent or incomplete.
- Policy and operational evidence are projected into a versioned certification manifest rather than fully normalized relational models.
- Legacy frozen attendance snapshots without a valid manifest now fail closed and require controlled review, re-certification, or backfill before Payroll readiness can become green.
- The certification service validates supplied import, balance, schedule, holiday, approval, and policy hashes; it does not itself operate clocks, calculate accruals, or execute an external workforce provider.
- Country policy review evidence is mandatory, but the statutory country-pack engine remains the future owner of jurisdiction-specific rule execution and provenance.
- Delegated attendance approval beyond the effective manager/tenant-admin authority model is not implemented in this slice.

## Stop-condition result

The skill stop condition is closed for the implemented surfaces: Payroll calculation cannot consume unapproved attendance or mutable leave state, and the two operator-facing readiness models no longer describe uncertified attendance as ready.

## Next handoff

Proceed to `aqstoqflow-hris-payroll-09-input-readiness-gate` to consolidate the employee, contract, compensation, document, payment-destination, and certified time/leave inputs into one fail-closed Payroll readiness decision with blocker provenance.
