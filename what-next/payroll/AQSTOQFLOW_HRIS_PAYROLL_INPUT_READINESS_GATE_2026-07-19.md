# AqStoqFlow HRIS–Payroll Input Readiness Gate

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-09-input-readiness-gate`  
Decision: **VERIFIED AND HARDENED — every calculation path reaches one service-owned, tenant-scoped, fail-closed readiness verdict before run creation; the action boundary now has explicit anti-bypass coverage**

## Scope

Verify the consolidated HRIS-to-Payroll input-readiness gate after employee identity, contract, compensation, document-evidence, payment-destination, and time/leave/attendance controls. The review covered direct service invocation, server-action delegation, tenant/actor derivation, missing and stale inputs, country-pack capability, readiness proof persistence, audit evidence, and source revalidation.

This tranche did not change payroll formulas, payment or declaration release, accounting posting, schema, routes, or unrelated HRIS functionality.

## Prerequisite result

The prerequisite tranches are present and current:

- Employee identity carries HRIS source-system, source-record, source-hash, and update evidence.
- Active contracts require canonical HRIS approval and approved/scanned document proof.
- Compensation assignments require maker-checker approval, evidence, effective dating, and active-contract linkage.
- Payment destinations require reconciled requested, approved, and applied proof.
- Attendance requires a valid versioned HRIS time/leave certification with no unresolved inputs.

## Architecture evidence

The available `graphify-out/ordered-code-graph.json` identifies Payroll control/run functions and separate readiness/workbench communities, confirming that run creation is the critical integration boundary rather than the UI. The graph predates several current HRIS certification services, so current source, tests, and dated reports were treated as authoritative for detailed behavior.

## Files inspected

- `services/payroll/payroll-control.service.ts`
- `services/payroll/__tests__/payroll-control.service.test.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/hris/__tests__/payroll-readiness-contract.test.ts`
- `services/payroll/payment-evidence.service.ts`
- `services/payroll/command-read-model.service.ts`
- `actions/payroll/payroll-control.actions.ts`
- `actions/payroll/__tests__/payroll-control.actions.test.ts`
- `prisma/schema.prisma`
- Current prerequisite reports in `what-next/payroll/`
- Governing HRIS/payroll blueprints and the prior 2026-07-12 input-readiness report

## Service-owned readiness decision

`calculatePayrollRun` owns the verdict. It does not accept readiness status, blocker lists, employee proof, or verdict hashes from the caller.

Before calculation, run creation, YTD consumption, line creation, or calculated-run event emission, the service:

- Resolves the tenant-scoped payroll period and country pack.
- Rejects unsupported country-pack capability.
- Rejects open effective salary changes and lifecycle requests.
- Loads only active, non-deleted employees in the authenticated organization and requested employee scope.
- Loads only active/effective contracts and compensation assignments.
- Loads only frozen attendance for the exact tenant and payroll period.
- Loads only applied payment-destination requests in the tenant.
- Builds `AQSTOQFLOW_PAYROLL_INPUT_READINESS_VERDICT` with blocker provenance and evidence identifiers/hashes.
- Builds a canonical HRIS readiness export for identity, contract, document, compensation, destination, and attendance proof.
- Fails closed when either verdict is blocked.
- Recomputes and compares each current HRIS employee source before constructing certified engine input.

No UI flag, action payload, or API-supplied readiness assertion can satisfy this service gate.

## Mandatory denial gates verified

- Missing contract: `PAYROLL_INPUT_CONTRACT_MISSING`.
- Stale/open compensation: `PAYROLL_INPUT_COMPENSATION_STALE`.
- Unapproved or uncertified attendance: `PAYROLL_INPUT_ATTENDANCE_CERTIFICATION_MISSING` / HRIS certification proof blocker.
- Missing payment destination: `PAYROLL_INPUT_PAYMENT_DESTINATION_MISSING` and, where a hash exists without governed request proof, `HRIS_PAYROLL_PAYMENT_DESTINATION_PROOF_MISSING`.
- Unsupported country: `PAYROLL_INPUT_COUNTRY_PACK_UNSUPPORTED`.

The service tests also prove that these denials occur before payroll-run creation and calculated-run business-event emission.

## Gap found and corrected

The production action already replaced caller-supplied `organizationId` and `preparedById` with authenticated context before delegating to `calculatePayrollRun`, but the calculation action had no direct regression proving this. Adjacent approval, payment, workbench, declaration, and balance actions had equivalent tests.

This tranche adds a focused calculation-action test that:

- Supplies a forged client organization and preparer.
- Confirms module and permission enforcement uses the authenticated tenant and actor.
- Confirms the service receives the authenticated organization and preparer instead of client values.
- Confirms the action delegates to the service-owned calculation path and revalidates Payroll UI state only after success.

No production code change was needed because the existing action and service already implement the required boundary.

## Audit and evidence decision

For a successful run, the ready verdict and hashes are carried into:

- Certified employee engine-input snapshots.
- Payroll line calculation snapshots.
- Payroll-run metadata.
- Payroll-run document, calculation, attendance, and correction evidence hashes.
- The `payroll.run.calculated` business-event payload.
- The `PAYROLL_RUN_CALCULATED` audit change record.

Blocked verdicts create no Payroll run and emit no calculated-run business event. The thrown service error contains blocker codes and bounded operational messages; raw bank data, tax identifiers, document contents, and raw attendance payloads are not placed in the verdict.

## Data ownership decision

- HRIS owns employee identity, contract approval/document proof, compensation approval, payment-destination evidence, and attendance certification.
- Payroll owns the service-side readiness composition, certified engine input, calculation, and immutable run evidence.
- Country packs own statutory capability and reviewed rule provenance.
- Accounting owns downstream posting truth; Assurance consumes the persisted readiness and run evidence chain.
- The dashboard is a view of readiness and cannot create Payroll truth.

## Tenant and RBAC decision

- The calculation action requires `payroll.runs.calculate` and an entitled Payroll module.
- Organization and preparer are derived from authenticated server context.
- The service independently constrains period, employees, contracts, attendance, compensation, payment requests, events, and run writes by organization.
- Direct service invocation cannot bypass readiness because the verdict is built and asserted inside `calculatePayrollRun`.
- Client-supplied tenant and preparer values are now explicitly covered as rejected/overwritten at the action boundary.

## Gates run

```text
PASS: payroll calculation action suite — 1 suite, 18 tests
PASS: payroll service readiness + HRIS proof-contract suites — 2 suites, 46 tests
PASS: 3 focused suites, 64 tests total
PASS: authenticated tenant/preparer anti-bypass regression
PASS: missing contract denial
PASS: stale/open compensation denial
PASS: unapproved/uncertified attendance denial
PASS: missing payment destination denial
PASS: unsupported country-pack denial
PASS: blocked paths create no run or calculated-run business event
PASS: ready verdict persistence in run, event, engine proof, and audit
PASS: HRIS source drift and compensation-assignment drift rejection
PASS: skill-package validation
```

## Baseline-gap delta

- Production readiness gate: `already service-owned and fail-closed -> verified unchanged`.
- Calculation action anti-bypass proof: `implicit through implementation -> explicit forged-tenant/forged-preparer regression`.
- Required denial evidence: `distributed existing tests -> consolidated verified gate covering all five mandatory cases`.
- Readiness audit chain: `persisted hashes and verdict -> verified across run, line, event, correction, and audit outputs`.
- Payroll formulas and release behavior: `unchanged -> unchanged`.

## Verification environment note

The repository's local development packages were moved under `node_modules/.ignored` during this run, so the ordinary `npm test` and `npx eslint` entry points were unavailable. Tests were executed without installation by using the existing ignored Jest package, Next SWC transformer, JS DOM environment, and server-only shim through temporary local configuration. All temporary configs and dependency copies were removed afterward.

Scoped ESLint could not produce a source result because the split dependency layout caused `@rushstack/eslint-patch` to reject the calling ESLint module before file analysis. This is an environment/toolchain limitation, not a reported lint violation. The changed TypeScript test compiled and passed under the project’s Next SWC Jest transformer.

## Skipped checks

- No schema migration, Prisma validation, seed, backfill, or production mutation was required.
- No browser or accessibility run was required because no route or component behavior changed.
- No payment, declaration, or accounting release retest was required because those downstream paths were not changed.
- Full-project typecheck and full Jest were not run because the current dependency layout does not expose the normal project dev-tool binaries.

## Current blockers and residual risk

- No blocker remains inside the implemented input-readiness gate.
- Blocked readiness attempts are fail-closed and leave no Payroll run. Their detailed verdict exists in the thrown service decision rather than a separately committed denial record because the calculation transaction rolls back. Permission/module denials remain audited by the action protection layer.
- Review-required country-pack capability remains intentionally distinguishable from unsupported capability; statutory execution still depends on reviewed country-pack provenance.
- Legacy HRIS records without complete identity, contract, document, compensation, destination, or attendance proof remain blocked and require controlled certification/backfill.
- The local dependency layout should be restored by the repository owner before relying on ordinary `npm test`, ESLint, or full typecheck commands.

## Stop-condition result

The skill stop condition is closed: readiness is not UI-only and cannot be bypassed by the calculation action or direct service invocation. A Payroll run is created only after a tenant-scoped, service-owned, auditable `READY` verdict and current-source revalidation.

## Next handoff

Proceed to `aqstoqflow-hris-payroll-10-snapshot-correction` to verify immutable input snapshots, correction lineage, stale-source denial after calculation, and controlled recalculation/correction-run behavior.
