# AqStoqFlow HRIS/Payroll Payments and Declarations Proof

Date: 2026-07-20  
Skill: `aqstoqflow-hris-payroll-13-payments-declarations-proof`  
Development status: **READY_FOR_DEVELOPMENT_AND_SANDBOX_PROOF — 9/9**  
Production status: **BLOCKED by upstream country-pack provenance — 10/12**  
Next handoff: `aqstoqflow-hris-payroll-14-accounting-close-assurance` in development/sandbox mode only.

## Executive decision

The payment and declaration proof chain is ready for deterministic development and sandbox/UAT work using synthetic or anonymized data. A new executable ratchet verifies that the approved-destination boundary, maker-checker separation, provider callback idempotency, conflicting-proof rejection, authority certification proof, settlement amount/currency tie-out, tenant boundaries, audit, and redaction remain present.

This does not authorize real disbursements, production provider callbacks, production authority calls, or legally effective declarations. The production chain remains blocked until the Cameroon country-pack production gate passes with genuine qualified review evidence.

## Scope and files inspected

- `services/payroll/payment-evidence.service.ts`
- `services/payroll/payment-reconciliation.service.ts`
- `services/payroll/declaration-lifecycle.service.ts`
- `services/payroll/authority-adapter-execution.service.ts`
- `services/payroll/payroll-provider-settlement-bridge.service.ts`
- `services/payroll/payroll-provider-inbox-settlement-worker.service.ts`
- their six focused service test suites
- `scripts/statutory-country-pack-development-gate.js`
- `scripts/payroll-payments-declarations-development-gate.js`
- `graphify-out/ordered-code-graph.json`
- latest Skill 12 and Skill 13 reports

The architecture graph confirms separate payment-evidence, reconciliation, declaration-lifecycle, authority-execution, provider-bridge, and inbox-worker communities with actions and workbench consumers. No service, action, component, route, schema, statutory fixture, or provider adapter was changed in this tranche.

## Implemented readiness ratchet

Command:

```powershell
npm run payroll:payments-declarations:dev:gate
```

The gate passes 9/9 checks:

1. statutory development prerequisite is ready while production remains blocked;
2. live payment, declaration, authority, and production-use claims remain disabled;
3. approved destination and maker-checker guards are present;
4. provider callback replay and conflicting-proof rejection are covered;
5. authority proof, idempotency, certification, and redaction guards are covered;
6. settlement amount, currency, and provider-evidence tie-out is present;
7. tenant, RBAC, audit, and redaction evidence is present;
8. all six focused negative-test harnesses remain present;
9. the development command is deliberately excluded from the production policy chain.

## Data ownership

- HRIS owns employee identity and approved payment-destination evidence.
- Payroll owns certified runs, payment batches, declaration records, and proof envelopes.
- Provider/reconciliation services own callback, match, exception, settlement, and idempotency evidence.
- Authority services own submission and response lifecycle proof.
- Accounting owns ledger and close truth.
- Assurance owns the evidence chain and readiness decisions.

No UI or external provider response may create payroll or HRIS truth directly.

## Tenant, RBAC, audit, and redaction decision

Existing organization scoping and permission checks remain authoritative. Payment-destination request, approval, and application retain separate permissions and requester/approver/applicator separation. Provider and authority proof records remain tenant-scoped and idempotent. Sensitive destinations, salary values, provider references, raw authority payloads, credentials, and employee identity are masked, hashed, redacted, or omitted according to existing policies. Audit records retain control outcomes and proof identifiers without copying raw secrets or destinations.

## Verification

| Gate | Result |
|---|---|
| New gate unit suite | Passed: 1 suite, 4 tests |
| Six Skill 13 service suites | Passed: exit code 0 |
| Payments/declarations development gate | Passed: 9/9 |
| Statutory development prerequisite | Passed: 11/11 |
| Country-pack production prerequisite | Correctly blocked: 10/12 |

Negative coverage includes missing or unapproved destination evidence, maker-checker violations, duplicate callback replay, conflicting callback proof, incomplete authority certification, conflicting authority idempotency, redacted proof identifiers, amount disagreement, currency disagreement, and missing provider evidence.

## Baseline-gap delta

| Measure | Previous state | Current state | Delta |
|---|---|---|---|
| Skill 13 development readiness | Controls green but only described in a blocked report | Executable 9/9 development/sandbox ratchet | +1 explicit readiness gate |
| Development blockers | Upstream production blocker conflated with tranche status | 0 development blockers | Clarified |
| Production blockers | 2 country-pack blockers | Same 2 blockers | 0; intentionally unchanged |
| Production-use flags | False | False | 0 |
| Payment/declaration production behavior | Prohibited | Prohibited | 0 |

## Current blockers and stop conditions

Production remains blocked by:

- `source_artifact_hash_verification`
- `source_artifact_expert_approval`
- downstream provider/authority production certification and final assurance evidence.

Stop if any sandbox path can reach a production provider or authority; real employee destinations or credentials enter fixtures; a callback mutates evidence on conflicting replay; a payment can release without approved destination evidence; a declaration can advance without authority proof; amount or currency does not tie out; tenant scope is ambiguous; or redaction/audit controls regress.

## Skipped checks

- No real payment or employee destination was used.
- No production provider callback or credential was used.
- No legally effective declaration or authority submission was made.
- No browser test was required because no UI changed.
- No full-repository test, typecheck, lint, build, migration, or release suite was claimed.

## Residual risk and handoff

Static and service-level evidence proves local control behavior, not Cameroon statutory correctness or external provider/authority certification. Continue to Skill 14 only for synthetic accounting-close and invalidation testing. Production Skill 14, migration/backfill, and final readiness remain blocked until Skill 12 is genuinely approved and Skills 13–14 are rerun against that approved provenance.
