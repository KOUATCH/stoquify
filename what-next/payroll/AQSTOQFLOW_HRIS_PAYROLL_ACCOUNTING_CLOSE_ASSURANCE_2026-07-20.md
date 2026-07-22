# AqStoqFlow HRIS/Payroll Accounting Close Assurance

Date: 2026-07-20  
Skill: `aqstoqflow-hris-payroll-14-accounting-close-assurance`  
Development status: **READY_FOR_DEVELOPMENT_ACCOUNTING_CLOSE_ASSURANCE — 10/10**  
Production status: **BLOCKED by upstream country-pack provenance — 10/12**  
Next handoff: Skills 15 and 16 are already development-complete; proceed to Skill 17 only as a synthetic migration/backfill dry run.

## Executive decision

The payroll-to-accounting close chain is ready for deterministic development and synthetic close testing. A new executable ratchet verifies register-to-ledger/component tie-out, unresolved-proof close blockers, tenant-scoped and idempotent source links, certification segregation, stale-evidence invalidation, and controlled redacted auditor exports.

This does not authorize a production close, certified production export, posted-ledger mutation, or reliance on unapproved Cameroon statutory results. Production remains blocked until genuine qualified country-pack approval and downstream reruns are complete.

## Scope and files inspected

- `services/payroll/payroll-register.service.ts`
- `services/accounting/data-trust.service.ts`
- `services/accounting/close-assurance.service.ts`
- `services/accounting/close-assurance-pack.service.ts`
- `services/accounting/source-link.service.ts`
- their five focused test suites
- `scripts/payroll-payments-declarations-development-gate.js`
- `scripts/payroll-accounting-close-development-gate.js`
- `graphify-out/ordered-code-graph.json`
- latest Skills 12–14 evidence

The graph evidence confirms distinct register, accounting source-link, data-trust, close-assurance, and close-pack communities. No payroll, accounting, ledger, action, route, component, database schema, posted entry, statutory fixture, or production adapter was changed in this tranche.

## Implemented readiness ratchet

Command:

```powershell
npm run payroll:accounting-close:dev:gate
```

The gate passes 10/10 checks:

1. Skill 13 development/sandbox proof is ready while production remains blocked;
2. production close claims and live effects remain disabled;
3. register-to-ledger/component mapping tie-out is present;
4. unresolved payroll, payment, declaration, payslip, source-link, or country-pack proof blocks close;
5. accounting source links are tenant-scoped, audited, and idempotent;
6. certified exports require clean evidence, fresh authorization, and segregation of duties;
7. stale evidence invalidates prior certification;
8. auditor exports are controlled, watermarked, audited, and redacted;
9. all five focused negative-test harnesses remain present;
10. the development gate is excluded from the production policy chain.

## Data ownership

- HRIS owns people and employment truth.
- Payroll owns certified calculations, registers, payslips, payments, declarations, and corrections.
- Accounting owns posted ledger money truth, source links, fiscal-period state, and close state.
- Assurance evaluates continuity and blockers without inventing upstream evidence.

UI, exports, and close dashboards are read models; they do not own payroll or ledger truth.

## Tenant, RBAC, audit, and redaction decision

Organization and fiscal-period scope remain mandatory. Cross-tenant period access is denied. Source links must match their posting-batch and journal ownership. Same-actor close waiver or close-pack certification remains blocked. Draft exports are watermarked and cannot claim certification. Sensitive person-level payroll amounts, salaries, destinations, provider payloads, authority payloads, secrets, and tenant internals remain redacted or excluded. Ledger and sensitive-action audit events remain part of the proof pack.

## Verification

| Gate | Result |
|---|---|
| New Skill 14 gate suite | Passed: 1 suite, 4 tests |
| Five Skill 14 service suites | Passed: 5 suites, 52 tests |
| Accounting-close development gate | Passed: 10/10 |
| Embedded Skill 13 development prerequisite | Passed: 9/9 |
| Embedded Skill 12 development prerequisite | Passed: 11/11 |
| Country-pack production prerequisite | Correctly blocked: 10/12 |

Negative coverage includes missing certified HRIS input proof, missing statutory/effective component proof, incomplete payment/declaration/payslip evidence, missing ledger/source links, unbalanced or unmapped ledger lines, same-actor approval, cross-tenant access, stale annex evidence, invalidated certifications, and unauthorized or unredacted exports.

## Baseline-gap delta

| Measure | Previous state | Current state | Delta |
|---|---|---|---|
| Skill 14 development readiness | Controls green but production blocker dominated status | Executable 10/10 synthetic-close ratchet | +1 explicit readiness gate |
| Focused service verification | 5 suites / 44 tests on 2026-07-19 | 5 suites / 52 tests passed | +8 observed tests in current suite set |
| Development blockers | Conditional/implicit | 0 | Clarified |
| Production blockers | 2 country-pack blockers | Same 2 blockers | 0; intentionally unchanged |
| Posted ledger entries changed | 0 | 0 | 0 |
| Production-use flags | False | False | 0 |

## Stop conditions

Stop if payroll cannot tie to mapped ledger components and source links; unresolved payment or declaration proof is ignored; a certified export can proceed with critical/high findings; same-actor certification is allowed; stale evidence does not invalidate certification; a cross-tenant period can be resolved; raw salary, person, destination, provider, authority, or credential data appears in broad exports; or any test proposes direct mutation of posted entries instead of reversal/correction.

## Skipped checks

- No production close, certified production export, or posted ledger mutation was performed.
- No real employee, provider, bank, mobile-money, or authority data was used.
- No browser test was required because no UI changed.
- No full-repository test, typecheck, lint, build, migration, or release suite was claimed.

## Residual risk and handoff

Local assurance proves close-control behavior, not statutory correctness, live settlement, authority acceptance, or production data quality. Skills 15 and 16 already hold development evidence. The next safe handoff is Skill 17 for a synthetic, dry-run-only migration/backfill pilot with stable hashes, idempotency, reconciliation, correction-only rollback, redaction, and no production writes. Production Skill 17 and Skill 18 remain blocked until Skills 12–14 pass their production prerequisites.
