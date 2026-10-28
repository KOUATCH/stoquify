# AqStoqFlow HRIS–Payroll Engine Integration

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-11-payroll-engine-integration`  
Decision: **IMPLEMENTED AND VERIFIED — the existing Payroll kernel now receives detached, certified HRIS source copies with deterministic snapshot/hash proof; formulas and country-pack rules remain unchanged**

## Scope

Verify and harden the adapter between the service-owned HRIS input-readiness/snapshot boundary and the existing Payroll calculation kernel. The review covered employee ordering, contract and attendance inputs, compensation assignments, country-pack resolution, statutory fixture compatibility, readiness denial, correction calculations, engine-input hashing, audit/evidence propagation, and downstream certified-input proof.

This tranche did not change payroll formulas, statutory rates, country-pack values, accounting posting, payment/declaration release, schema, or unrelated HRIS behavior.

## Prerequisite result

The 2026-07-19 input-readiness and snapshot-correction tranches passed:

- Payroll builds and asserts a tenant-scoped READY verdict inside `calculatePayrollRun`.
- Current HRIS identity, contract/document, compensation, destination, and attendance proofs are revalidated before engine input construction.
- An ordinary run seals its certified input snapshot at `CALCULATED` and cannot be recalculated from live HRIS state.
- Post-calculation changes require a separate, scoped correction run tied to posted/paid original proof.

## Architecture evidence

The available `graphify-out/ordered-code-graph.json` places Payroll control calculation, country-pack fixture execution, correction, register, declaration, and proof consumers in related Payroll business-logic communities. It confirms that the certified adapter is upstream of several financial proof consumers. Current source and focused tests remain authoritative because the graph predates the latest HRIS certification services.

## Files inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-control.schemas.ts`
- `services/payroll/certified-input-proof.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/payroll/__tests__/certified-input-proof.test.ts`
- `services/payroll/__tests__/payroll-country-pack-fixture-runner.test.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/hris/time-leave.contract.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-register.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/snapshots/tenant-operating-snapshot.service.ts`
- Current input-readiness and snapshot-correction reports
- Prior 2026-07-12 engine-integration report and governing HRIS/payroll blueprints

## Certified adapter decision

`buildCertifiedPayrollEngineInputs` runs only after a READY input-readiness verdict. For every employee it:

- Revalidates the versioned HRIS attendance certification against approver, country, period, and totals.
- Rebuilds the current HRIS employee source and compares it with the certified readiness proof.
- Requires active contract, frozen certified attendance, payment-destination proof, and complete source hashes.
- Canonically sorts employees and compensation assignments.
- Normalizes decimal, currency, timestamp, attendance, and assignment values.
- Builds `AQSTOQFLOW_PAYROLL_CERTIFIED_ENGINE_INPUT` containing readiness, employee proof, contract, attendance, destination, compensation, and country-pack references.
- Hashes every employee snapshot and the sorted aggregate input-hash set.

The kernel iterates only the adapter result. The original `payrollEmployee.findMany` collection is not passed directly into formula execution.

## Gap found and corrected

The adapter correctly built and hashed an immutable engine-input snapshot, and it already copied compensation assignments plus their rubrique definitions. However, its kernel-facing return value retained the original ORM contract and attendance object references.

Although the transaction executes synchronously and current-source proof was already checked, retaining those references weakened the architectural claim that the kernel consumes a detached certified input boundary rather than mutable persistence objects.

This tranche now:

- Copies the validated contract immediately after readiness/source validation.
- Copies the validated attendance snapshot at the same boundary.
- Builds the persisted engine-input snapshot from those certified copies.
- Supplies those copies—not the original ORM references—to the existing calculation kernel.
- Preserves the already-detached compensation/rubrique copies.

No formula, ordering, decimal, attendance, compensation, tax, statutory, correction, or output behavior changed.

## Kernel compatibility decision

The existing kernel remains responsible for:

- Attendance ratio and reviewed overtime policy execution.
- Base gross, taxable base, and social base.
- Approved fixed/rate/formula-reference compensation rubriques.
- Employee and employer pension contributions.
- Family allowance and occupational-risk employer contributions.
- Reviewed income-tax capability behavior.
- Net payable, statutory payable, component mapping, YTD, rounding, and correction deltas.

All rule inputs continue to come from resolved country-pack values and approved compensation metadata. No statutory value was introduced in the certified adapter.

## Determinism and traceability decision

Each line calculation snapshot retains:

- The full certified engine-input snapshot and employee input hash.
- Payroll and HRIS readiness hashes.
- Contract and attendance source identifiers/hashes.
- Country-pack version, schema, capability, resolution, legal provenance, and scenario coverage.
- Rounding and YTD policy/hash proof.
- Formula traces for supported rubrique calculations.
- Component mapping and calculation outputs.

Run metadata, document hash, correction evidence, calculated-run business event, and audit evidence retain the sorted employee input hashes and aggregate snapshot hash. Downstream posting, payment, declaration, and operating-snapshot consumers require explicit certified-input proof metadata.

## Negative readiness decision

The kernel cannot be reached when readiness is blocked. Focused coverage verifies denial for:

- Missing or invalid HRIS identity proof.
- Missing/unapproved contract and document proof.
- Stale or unapproved compensation.
- Missing or uncertified attendance.
- Missing or unreconciled payment destination.
- Unsupported country-pack capability.
- Sealed ordinary snapshots.

Blocked paths create no Payroll run or calculated-run business event.

## Data ownership decision

- HRIS owns mutable employee, contract, compensation, destination, and attendance truth plus approval/certification evidence.
- Payroll owns the certified adapter, deterministic snapshot, formula execution, result, and correction proof.
- Country packs own statutory parameters, capability, legal provenance, review state, and fixtures.
- Accounting owns posted monetary truth; Assurance consumes the end-to-end hashes and source evidence.
- The adapter translates HRIS truth for Payroll but does not become a second HRIS master.

## Tenant and RBAC decision

- Employee and all related source queries are constrained by authenticated `organizationId` and active/effective scope.
- The calculation action derives organization and preparer from server context and requires `payroll.runs.calculate` plus Payroll module entitlement.
- Corrections require explicit employee scope and tenant-scoped original proof.
- Posting remains separately approved with fresh authentication.
- No UI-provided engine snapshot, formula input, readiness verdict, or source hash is accepted.

## Audit and redaction decision

- Engine proofs store hashes, identifiers, normalized financial inputs, country-pack provenance, and calculation outputs required for audit.
- Raw HR documents, bank account values, tax identifiers, and raw attendance payloads are not added to downstream read models by this change.
- Existing salary/document redaction remains service-controlled.
- The adapter change creates no new public surface or expanded permission.

## Gates run

```text
PASS: 3 focused Jest suites
PASS: 55 focused tests
PASS: existing payroll kernel calculation and correction tests
PASS: certified-input proof parsing and missing-proof denials
PASS: deterministic employee and assignment snapshot/hash evidence
PASS: ordinary and correction engine-input proof propagation
PASS: negative readiness and sealed-snapshot denials
PASS: country-pack fixture runner and reviewed statutory scenarios
PASS: unchanged gross, deduction, employer-charge, net, and correction outputs
PASS: Prettier formatting of the changed service
PASS: skill-package validation
```

## Baseline-gap delta

- Contract input boundary: `certified/hash snapshot plus original ORM reference -> certified/hash snapshot plus detached validated copy`.
- Attendance input boundary: `certified/hash snapshot plus original ORM reference -> certified/hash snapshot plus detached validated copy`.
- Compensation input boundary: `already detached assignments/rubriques -> unchanged`.
- Kernel formula behavior: `existing reviewed path -> unchanged`.
- Engine proof propagation: `already persisted -> verified across ordinary and correction runs`.
- Stop-condition confidence: `adapter proof present but two persistence references retained -> all kernel-facing HRIS row inputs detached after validation`.

## Verification environment note

Project development packages remain under `node_modules/.ignored`, so the ordinary `npm test` entry point is unavailable. Focused tests were executed without installing dependencies by using the existing ignored Jest package, Next SWC transformer, JS DOM environment, and server-only shim through a temporary configuration. The temporary configuration was removed after execution.

## Skipped checks

- No schema migration, Prisma validation, seed, backfill, or production data mutation was required.
- No browser/accessibility run was required because no route, action contract, or component changed.
- No full Jest, full typecheck, or scoped ESLint was run because the current dependency layout does not expose the normal project development binaries consistently.
- No external authority or production country-pack execution was attempted.
- Downstream payment, declaration, and accounting releases were not modified.

## Current blockers and residual risk

- No blocker remains in the bounded certified engine-input adapter.
- The kernel-facing contract and attendance copies are shallow because nested metadata is not used by formulas. If future formulas consume nested metadata, the adapter must explicitly normalize and include it in the certified snapshot rather than pass it through.
- The downstream `certified-input-proof` parser currently verifies required proof-field presence and canonicalizes hash arrays; it does not independently recompute every stored aggregate hash from full line snapshots. Database immutability and run document hashes remain part of that assurance chain.
- Country-pack statutory provenance, legal authority, effective dating, and golden scenario completeness remain the next dedicated gate.
- Historical runs without certified engine-input proof require controlled backfill/signoff and remain blocked from proof-dependent downstream paths.

## Stop-condition result

The stop condition is closed for current formula inputs: calculation operates on certified, detached adapter outputs and does not pass mutable HRIS ORM rows directly into the Payroll kernel. Ordinary recalculation after snapshot creation remains blocked.

## Next handoff

Proceed to `aqstoqflow-hris-payroll-12-country-pack-provenance` to certify statutory parameter authority, legal references, effective dates, review evidence, scenario coverage, and golden outputs without weakening the engine boundary.
