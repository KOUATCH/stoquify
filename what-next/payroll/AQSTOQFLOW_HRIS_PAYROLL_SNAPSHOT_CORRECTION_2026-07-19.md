# AqStoqFlow HRIS–Payroll Snapshot Correction

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-10-snapshot-correction`  
Decision: **VERIFIED AND HARDENED — certified Payroll inputs become immutable at calculation, ordinary live-data recalculation fails closed, and changes proceed only through evidence-backed correction runs**

## Scope

Verify Payroll input snapshot persistence, source hashing, seal timing, ordinary recalculation denial, correction scoping, original-run proof, delta calculation, posting approval, audit/evidence propagation, and database immutability after the consolidated input-readiness gate.

This tranche did not change payroll formulas, mutate finalized runs, alter ledger/payment/declaration records, add schema, or broaden into unrelated HRIS functionality.

## Prerequisite result

The 2026-07-19 input-readiness tranche passed. `calculatePayrollRun` builds a tenant-scoped readiness verdict from certified HRIS identity, contract/document, compensation, payment-destination, and attendance inputs; revalidates the current source; and constructs certified engine-input snapshots before any run is created.

## Architecture evidence

The available `graphify-out/ordered-code-graph.json` identifies Payroll control calculation, correction-run, register, employee-balance, and proof-backfill functions across the Payroll business-logic communities. It confirms that correction evidence feeds register, posting, declaration, payment, and balance consumers. Current source and tests remain authoritative because the graph predates the newest HRIS readiness and attendance certification additions.

## Files inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/payroll-employee-balance.service.ts`
- `services/payroll/payroll-completion.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `components/payroll/PayrollRunActionPanel.tsx`
- `components/payroll/PayrollRunWorkbench.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/20260625110000_payroll_kernel_immutability/migration.sql`
- `scripts/payroll-immutability-runtime-check.js`
- `what-next/payroll/payroll-immutability-runtime-check.md`
- The 2026-07-12 snapshot-correction report and 2026-07-19 input-readiness report
- Governing HRIS/payroll blueprints and current migration/backfill evidence

## Snapshot decision

Each successful calculation persists a service-owned proof chain containing:

- The complete `AQSTOQFLOW_PAYROLL_INPUT_READINESS_VERDICT` and verdict hash.
- The canonical HRIS readiness export hash.
- Per-employee certified engine-input snapshots and hashes.
- An aggregate engine-input snapshot hash.
- Contract, attendance snapshot, attendance source, and attendance certification references.
- Country-pack, statutory coverage, rounding, YTD, rule-set, calculation, attendance, document, and evidence hashes.
- Immutable Payroll line calculation snapshots.

The ready verdict and hashes are repeated in the Payroll run, run lines, calculated-run business event, correction evidence, and audit record so downstream consumers can trace which certified inputs produced the run.

## Seal and live-data recalculation decision

An ordinary Payroll input snapshot is sealed as soon as its run reaches `CALCULATED`. It remains sealed through `REVIEWED`, `APPROVED`, `EMITTED`, `POSTED`, `PAID`, and `ARCHIVED`.

When a different idempotency key attempts another ordinary calculation for the same tenant and period, the service queries for a sealed non-correction run and throws `PAYROLL_INPUT_SNAPSHOT_ALREADY_SEALED` before country-pack resolution, salary/lifecycle checks, employee reads, YTD reads, run creation, or calculated-run event emission.

Same-key replay remains idempotent only when its payload hash matches. A changed payload under the same key is rejected.

This closes the skill stop condition: a sealed run cannot be recalculated from mutable live HRIS state.

## Controlled correction path

Corrections are separate Payroll runs, not mutations of the original run. They require:

- `runType: CORRECTION`.
- A posted or paid original run in the authenticated tenant.
- A separate correction payroll period.
- Explicit employee scope.
- Original run document, evidence, and calculation hashes.
- An original line with a document hash for every corrected employee.
- A fresh READY input-readiness verdict and current HRIS source certification.
- Delta calculation against the original immutable register line.

The correction line records original, corrected, and delta amounts plus original run/line identifiers and hashes. `correctionBasisHash` and aggregate `correctionEvidenceHash` bind the original proof, corrected employee scope, line documents, calculation/rule/attendance hashes, readiness hashes, and engine-input snapshot hash.

Correction posting requires a separate approver and emits reversal/delta ledger evidence. Missing correction evidence blocks posting. Negative employee corrections are routed to the employee-balance/receivable workflow rather than being released as negative payments.

## Database immutability decision

The Payroll immutability migration installs database triggers that protect finalized runs, lines, emitted payslips, released payment batches/allocations, declaration payload/evidence, and employee-balance events from mutation or deletion outside permitted lifecycle fields.

The most recent dedicated runtime report dated 2026-07-17 records all 9 required triggers present, all 14 forbidden mutations blocked, and all 3 permitted lifecycle mutations accepted in the isolated `stockflow_immutability_test` database.

This tranche did not rerun the database-mutating runtime harness; it reran the migration-definition tests and treated the dated isolated runtime report as supporting operational evidence.

## Gap found and corrected

Production already sealed snapshots at `CALCULATED`, but the focused recalculation regression used only a `POSTED` run. That proved post-finalization safety without explicitly proving immutability at the moment the input snapshot is created.

The existing test is now parameterized across both `CALCULATED` and `POSTED`. Each case proves:

- The second ordinary calculation is rejected with `PAYROLL_INPUT_SNAPSHOT_ALREADY_SEALED`.
- No country-pack or organization resolution occurs.
- No salary-change, employee, YTD, or live HRIS read occurs.
- No Payroll run or calculated-run business event is created.

No production code change was required.

## Data ownership decision

- HRIS owns mutable people, contract, compensation, destination, and attendance source truth.
- Payroll owns certified point-in-time consumption snapshots, calculation results, correction deltas, and run evidence.
- Corrections consume current certified HRIS truth but never rewrite the historical original Payroll snapshot.
- Accounting owns posted money truth and receives correction reversal/delta entries rather than modified original entries.
- Assurance consumes the original, correction, readiness, engine-input, and ledger evidence chain.

## Tenant and RBAC decision

- Period, sealed-run, original-run, employee, contract, attendance, compensation, event, and write queries remain constrained by `organizationId`.
- Correction runs require explicit employee IDs, preventing accidental tenant-wide or workforce-wide correction scope.
- Calculation actions derive tenant and preparer from authenticated context and require `payroll.runs.calculate` plus Payroll module entitlement.
- Posting requires `payroll.runs.approve`, fresh authentication, a different approver, and service-side correction proof.
- No public or UI-only correction bypass was found.

## Audit and redaction decision

- Calculated run events and audit records contain readiness and snapshot hashes, not raw bank accounts, tax identifiers, HR documents, or raw attendance payloads.
- Correction evidence records identifiers, hashes, original/corrected/delta amounts, rule provenance, and approval actors needed for financial traceability.
- Ordinary read surfaces remain governed by existing salary/document redaction policy.
- Original finalized records are preserved; corrections add linked evidence rather than overwriting history.

## Gates run

```text
PASS: 2 focused Jest suites
PASS: 53 focused tests
PASS: snapshot sealing at CALCULATED
PASS: post-finalization sealing at POSTED
PASS: no live HRIS/YTD/run work after seal denial
PASS: same-key replay and changed-payload idempotency controls
PASS: correction diff with original, corrected, and delta amounts
PASS: original run/line proof requirements
PASS: separate period and explicit employee scope
PASS: approved correction posting with reversal evidence
PASS: missing correction evidence posting denial
PASS: finalized-record database trigger definitions
PASS: skill-package validation
PASS: Prettier formatting of the changed test file
```

## Baseline-gap delta

- Snapshot-seal coverage: `POSTED only -> CALCULATED and POSTED explicitly proven`.
- Immediate immutability confidence: `production behavior implicit in status catalog -> regression begins at snapshot creation`.
- Live-data recalculation denial: `already service-enforced -> verified before every mutable-source read`.
- Correction diff/evidence: `already implemented -> verified unchanged`.
- Finalized database immutability: `migration and dated runtime proof present -> migration definitions rerun, runtime evidence referenced`.
- Payroll formulas and downstream records: `unchanged -> unchanged`.

## Verification environment note

Project development packages remain under `node_modules/.ignored`, so the ordinary `npm test` entry point is unavailable. Focused tests were executed without installing dependencies by using the existing ignored Jest package, Next SWC transformer, JS DOM environment, and server-only shim through a temporary configuration. The temporary configuration was removed after execution.

## Skipped checks

- The database-mutating runtime immutability harness was not rerun; its current 2026-07-17 isolated-database report is READY, and the migration-definition suite passed.
- No schema migration, seed, backfill, or production data mutation was required.
- No browser or accessibility run was required because no route/component behavior changed.
- No full Jest, full typecheck, or scoped ESLint was run because the current dependency layout does not expose the normal project development binaries consistently.
- Payment/declaration/accounting behavior was inspected but not modified or broadly retested.

## Current blockers and residual risk

- No blocker remains inside the implemented snapshot/correction boundary.
- There is no dedicated correction-planning API or operator diff preview separate from calculation; the current authoritative diff is created inside the controlled correction run.
- Historical data should still be audited for multiple ordinary runs per tenant/period before migration certification.
- Database-trigger runtime proof is dated 2026-07-17 and environment-specific; release certification should rerun it against a freshly migrated isolated database.
- Correction calculation trusts database immutability for the posted/paid original line after checking its proof fields. Trigger deployment therefore remains a release prerequisite.
- Legacy runs without readiness, engine-input, original-line, or correction hashes remain ineligible for the controlled correction path until reviewed backfill/signoff.

## Stop-condition result

The stop condition is closed: Payroll cannot recalculate a sealed ordinary snapshot from mutable live HRIS data. Changes after calculation require a new, scoped, evidence-backed correction run tied to the original immutable proof.

## Next handoff

Proceed to `aqstoqflow-hris-payroll-11-payroll-engine-integration` to verify that formula execution consumes only certified engine-input snapshots and produces traceable outputs without re-reading mutable HRIS truth during calculation.
