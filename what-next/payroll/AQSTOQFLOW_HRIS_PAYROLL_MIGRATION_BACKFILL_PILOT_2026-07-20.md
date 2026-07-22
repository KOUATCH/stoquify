# AqStoqFlow HRIS/Payroll Migration and Backfill Pilot

Date: 2026-07-20  
Skill: `aqstoqflow-hris-payroll-17-migration-backfill-pilot`  
Development status: **READY_FOR_SYNTHETIC_MIGRATION_DRY_RUN — 11/11**  
Production status: **BLOCKED by upstream country-pack provenance — 10/12**  
Next handoff: `aqstoqflow-hris-payroll-18-final-readiness` for a development-readiness audit only.

## Executive decision

The HRIS/payroll migration and proof-backfill controls are ready for synthetic dry-run planning and reconciliation. A new executable ratchet chains the current Skills 12–14 development evidence into Skill 17 and verifies mutation-before-read rejection, tenant isolation, stable evidence hashes, deterministic idempotency, correction-only rollback, immutable-evidence preservation, certificate reconciliation, redaction, and pending owner signoff.

This gate does not execute a migration. Mutation mode, production tenant writes, owner signoff, and final readiness remain disabled. No database CLI or local remediation script was run.

## Scope and files inspected

- `services/hris/migration-backfill-pilot.service.ts`
- `services/hris/__tests__/migration-backfill-pilot.service.test.ts`
- `services/payroll/payroll-seed-backfill-plan.service.ts`
- `services/payroll/__tests__/payroll-seed-backfill-plan.service.test.ts`
- `services/payroll/payroll-proof-backfill-reconciliation.service.ts`
- `services/payroll/__tests__/payroll-proof-backfill-reconciliation.service.test.ts`
- `scripts/hris-migration-backfill-pilot.ts`
- `scripts/hris-migration-pilot-remediate-local.js`
- `scripts/hris-payroll-migration-development-gate.js`
- the current Skills 12–14 development reports
- historical 2026-07-17 pilot evidence
- `graphify-out/ordered-code-graph.json`

The architecture graph contains the payroll seed/backfill plan and proof reconciliation services. Direct source remains authoritative for the HRIS pilot service. No HRIS/payroll business logic, schema, tenant record, correction record, audit record, migration, or backfill was changed.

## Implemented readiness ratchet

Command:

```powershell
npm run hris-payroll:migration:dev:gate
```

The gate passes 11/11 checks:

1. Skill 14 development accounting-close assurance is ready while production remains blocked;
2. production migration, posted-ledger mutation, production close, and final readiness remain disabled;
3. mutation requests fail before database reads;
4. tenant and cross-tenant rows fail closed, and local remediation remains `_local`-only;
5. projection, correction-plan, reconciliation, and dry-run hashes are deterministic;
6. rollback remains `CORRECTION_ONLY` with zero planner mutations and immutable evidence preservation;
7. reconciliation requires a persisted source certificate and matching expected hash;
8. reports exclude raw person, salary, destination, provider, document, and proof data;
9. owner signoff remains pending and cannot be automated by the gate;
10. all three focused negative-test harnesses remain present;
11. the development gate is excluded from the production policy chain.

## Data ownership

- HRIS owns identity, employment, contract, compensation, payment-destination provenance, and People Core adoption decisions.
- Payroll consumes certified HRIS facts and owns compatibility proof-backfill planning.
- Accounting owns immutable posted ledger truth.
- Assurance owns dry-run evidence, hashes, reconciliation certificates, and signoff lineage.

The planner cannot create a second employee master, derive HRIS truth from payroll output, or rewrite immutable payroll/accounting history.

## Tenant, RBAC, audit, and redaction decision

All scans require an explicit organization. Cross-tenant users, locations, contracts, assignments, snapshots, attendance records, and payment requests become blockers with deterministic correction steps. The remediation helper remains limited to organization IDs ending in `_local`; it was not invoked. Evidence uses redacted organization, actor, employee, audit, and certificate references. Raw person data, salary, payment destinations, documents, proof hashes, and provider payloads remain excluded.

## Verification

| Gate | Result |
|---|---|
| New Skill 17 gate suite | Passed: 1 suite, 4 tests |
| Three migration/backfill service suites | Passed: 3 suites, 13 tests |
| Migration/backfill development gate | Passed: 11/11 |
| Embedded Skill 14 development prerequisite | Passed: 10/10 |
| Embedded Skill 13 development prerequisite | Passed: 9/9 |
| Embedded Skill 12 development prerequisite | Passed: 11/11 |
| Country-pack production prerequisite | Correctly blocked: 10/12 |

Negative coverage includes mutation before database reads, ambiguous/cross-tenant legacy rows, evidence drift, immutable-evidence changes, missing source certificates, mismatched certificate hashes, unresolved data-trust proof gaps, and unredacted evidence.

## Baseline-gap delta

| Measure | Previous state | Current state | Delta |
|---|---|---|---|
| Skill 17 development readiness | Historical pilot evidence only; current tranche stopped | Executable 11/11 synthetic dry-run ratchet | +1 current readiness gate |
| Focused migration tests | Not rerun on 2026-07-19 | 3 suites / 13 tests passed | Current evidence restored |
| Development blockers | Upstream production blockers stopped all execution | 0 for synthetic planning/testing | Clarified |
| Production blockers | 2 country-pack blockers plus downstream release evidence | Unchanged | 0; intentionally unchanged |
| Database/tenant mutations | 0 | 0 | 0 |
| Owner signoff | Development-local historical acceptance only | Explicitly false in current gate | No promotion |

## Stop conditions

Stop if mutation occurs before dry-run review and owner signoff; tenant scope is ambiguous; hashes drift across an idempotent rerun; rollback overwrites or deletes immutable evidence; reconciliation accepts a missing or mismatched source certificate; proof gaps are hidden; raw sensitive data enters reports; local-only remediation accepts a non-local tenant; or any result is presented as production or final readiness.

## Skipped checks

- No fresh database-connected pilot CLI was executed.
- No remediation script, correction event, backfill job, or tenant mutation was executed.
- No owner signoff or close-pack certification was granted.
- No production data, credentials, provider, or authority connection was used.
- No full-repository test, typecheck, lint, build, migration, or release suite was claimed.

## Residual risk and handoff

Static and mocked-service evidence proves the safety of the planner and reconciliation controls, not the cleanliness of a current real tenant snapshot. A real controlled pilot still requires an approved snapshot, explicit tenant owner, dry-run evidence, stable rerun hashes, reviewed correction plan, reconciliation, rollback simulation, and signed owner approval. Statutory production approval remains a separate prerequisite.

The next safe handoff is Skill 18 for a development-readiness audit that aggregates the new 11/11, 9/9, 10/10, and 11/11 gates. Skill 18 must report production as blocked and must not issue final certification.
