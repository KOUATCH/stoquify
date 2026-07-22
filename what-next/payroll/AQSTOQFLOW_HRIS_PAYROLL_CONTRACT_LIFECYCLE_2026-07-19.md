# AqStoqFlow HRIS–Payroll Contract Lifecycle

Date: 2026-07-19  
Skill: `aqstoqflow-hris-payroll-05-contract-lifecycle`  
Decision: **IMPLEMENTED — approved effective contract proof now gates compensation activation and payroll readiness**

## Scope

Verify and harden contract creation, effective dating, signed-document evidence, maker-checker activation, salary amendment, termination, payroll-readiness blockers, audit evidence, redaction, and tenant isolation after the organization-scope prerequisite passed.

## Prerequisite result

Skill 04 was rerun before this tranche. Prisma validation and all five organization-scope suites passed: 25 tests covering durable manager scope, historical `asOf`, delegation, cross-tenant denial, cross-branch denial, approval-time resolution, audit, and redaction.

## Files inspected

- `prisma/schema.prisma`
- `services/hris/contract.service.ts`
- `services/payroll/contract.service.ts`
- `services/hris/document-evidence.service.ts`
- `services/hris/approval-inbox.service.ts`
- `services/hris/payroll-readiness-contract.ts`
- `services/payroll/compensation.service.ts`
- `services/payroll/payroll-control.service.ts`
- `services/payroll/payroll-setup-readiness.service.ts`
- Focused HRIS and Payroll contract, evidence, approval, readiness, and compensation tests

No current top-level contract/action knowledge-graph artifact was available in `graphify-out`; conclusions were grounded directly in the current source and focused tests.

## Baseline behavior

- Contracts are effective-dated and cannot be created directly as active.
- Signed document hashes cannot be written through the generic contract create/update path.
- Activation requires approved HRIS document evidence, a request, a separate approver, overlap checks, an activation business event, and audit history.
- Salary changes use a maker-checker-apply workflow and create a new effective-dated contract version rather than mutating the active salary.
- Termination records the end date, reason, lifecycle event, and before/after audit evidence.
- Payroll calculation consumes the HRIS payroll-readiness export and blocks missing activation or document proof.

## Gap found and corrected

The active compensation-assignment guard queried for an active contract with non-null `signedDocumentHash` and `activatedBusinessEventId`, but did not validate the underlying HRIS maker-checker and scanned-document metadata. A superficially populated legacy contract could therefore pass compensation activation even though the canonical HRIS readiness export would later reject it.

The tranche now:

- Exports one canonical `evaluateHrisContractReadinessProof` evaluator from the HRIS readiness contract.
- Uses that evaluator both when building payroll-readiness proof and before activating a compensation assignment.
- Requires an approved activation record whose event matches the contract activation event.
- Requires approved document evidence whose artifact hash matches the contract hash and includes malware-scan, approval-evidence, and approval-event proof.
- Fails before compensation mutation or event creation when either proof chain is incomplete.
- Rejects all generic in-place amendments to active contracts; salary changes and termination remain separate audited effective-dated workflows.

## Data ownership decision

- HRIS owns contract approval, document evidence, lifecycle meaning, and readiness proof.
- `PayrollContract` remains compatibility storage and the effective-dated salary-bearing record during migration.
- Payroll consumes the certified HRIS readiness proof; it does not infer approval from status or field presence.
- Compensation may activate only against the canonical HRIS contract proof evaluator.

## Tenant and RBAC decision

- Contract and compensation queries remain constrained by `organizationId` and employee identity.
- Contract activation and document approval retain their existing HRIS manage permissions.
- Maker-checker separation remains enforced for document approval, contract activation, compensation approval, and salary-change application.
- No permission vocabulary, global administrator scope, route, or navigation change was introduced.

## Audit and redaction decision

- Contract activation, update, salary amendment, and termination retain before/after audit evidence and business-event references.
- Missing contract proof fails before compensation mutation and event recording.
- Salary values, raw document hashes, artifact hashes, and internal organization-scope evidence identifiers remain excluded from ordinary HRIS contract payloads.
- Raw document access remains separately permissioned and denied by default.

## Gates run

```text
Skill 04 prerequisite:
PASS: Prisma validation
PASS: 5 suites, 25 tests

Skill 05 focused gate:
PASS: 6 suites, 47 tests
PASS: payroll contract lifecycle
PASS: HRIS contract facade and redaction
PASS: document evidence and raw-access denial
PASS: approval inbox and maker-checker
PASS: HRIS payroll-readiness proof
PASS: compensation approved-contract requirement
PASS: focused ESLint
```

## Baseline-gap delta

- Compensation contract gate: `active + non-null fields -> canonical HRIS activation and scanned-document proof`.
- Shared contract-proof evaluator: `duplicated implicit checks -> one HRIS-owned evaluator`.
- Regression coverage: `no superficially-active-contract case -> explicit fail-closed compensation and readiness tests`.
- Contract lifecycle status: `effective-dated/audited but downstream guard inconsistent -> consistent activation, readiness, and compensation proof boundary`.
- Active amendment behavior: `generic in-place mutation allowed -> fail-closed; approved versioning or termination required`.

## Skipped checks

- No migration or production data change was required for this tranche.
- No browser flow, provider, payroll finalization, statutory formula, compensation formula, or payment-destination behavior changed.
- Full-project TypeScript checking was not rerun because the established baseline exhausts the available V8 heap; focused Jest compilation and ESLint passed.
- General non-compensation contract amendments receive no new UI or state machine here; the generic active-record update path now fails closed.

## Residual risk

- Physical storage and several compatibility action names remain Payroll-named.
- Legacy active contracts without complete HRIS metadata remain intentionally blocked and require reviewed backfill/certification rather than automatic promotion.
- The bounded organization-scope migration and reporting relationship backfill are not yet deployed.
- Salary-change-created contract versions must continue to pass the same HRIS readiness evaluator before payroll consumption.

## Next handoff

Skill 05’s stop condition is closed: new compensation activation cannot rely on a superficially active, unapproved contract. Hand off to `aqstoqflow-hris-payroll-06-compensation-controls` for the next bounded tranche.
