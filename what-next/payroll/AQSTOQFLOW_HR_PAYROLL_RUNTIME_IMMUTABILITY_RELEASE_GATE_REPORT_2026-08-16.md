# AqStoqFlow HR/Payroll Runtime Immutability Release Gate Report

Date: 2026-08-16

Prompt name and phase: Prompt 02, Runtime DB Immutability And Correction Boundary — release aggregate follow-through.

Expert lenses applied: database architecture, payroll evidence audit, cybersecurity, release assurance, and accounting controls.

Source prerequisite IDs: P0.06, P0.07, P0.08, P0.09, P0.10, P0.11.

## Decision

Decision: passed for the isolated PostgreSQL immutability engineering control; production release remains fail closed.

The enterprise release/control-tower read model now selects the newest direct payroll immutability runtime proof by evidence `generatedAt`, validates its detailed trigger and mutation rows plus isolated-database provenance, and records when that proof invalidates a conflicting stale aggregate.

The current selected source is `what-next/payroll/payroll-immutability-runtime-check-run-2.json`, generated at `2026-08-12T19:21:43.961Z`, with 9/9 triggers present, 14/14 forbidden mutations blocked, 3/3 allowed lifecycle mutations verified, and zero runtime blockers.

## Prerequisite Gate

| Gate                                        | Result | Evidence                                                                                             |
| ------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Prompt 01 governance/source-of-truth report | Passed | `docs/domains/hr-payroll/AQSTOQFLOW_HR_PAYROLL_PHASE_0_INVENTORY_AND_OWNERSHIP_REPORT_2026-06-25.md` |
| Payroll core models are tenant-scoped       | Passed | Current `prisma/schema.prisma`                                                                       |
| Immutability migrations exist               | Passed | Kernel, declaration-evidence, payment-lifecycle, and employee-balance migrations                     |
| Safe runtime database path exists           | Passed | Dedicated `stockflow_immutability_test` proof harness                                                |
| Current direct PostgreSQL proof exists      | Passed | Independent run 2 evidence dated 2026-08-12                                                          |

## Implementation Summary

- Replaced the single stale immutability input assumption in `scripts/enterprise-release-blocker-status.js` with discovery and arbitration across the canonical runtime proof and numbered direct proof runs.
- The newest evidence timestamp wins; on an equal timestamp, a numbered direct PostgreSQL proof outranks the canonical copy.
- The selected proof must be release-enforced, identify an isolated non-production database, contain all nine present trigger rows, all fourteen passing forbidden-mutation rows, all three passing lifecycle rows, and no blockers.
- The report records source path, source kind, evidence timestamp, SHA-256 digest, superseded sources, prior aggregate state, conflict detection, and whether a newer proof invalidated that aggregate.
- Schema version `1.1` adds explicit claim semantics for isolated immutability, country-pack production evidence, operator readiness, and the overall release decision.
- Regenerated `what-next/enterprise-release-blocker-status.json` and `.md`: B02 is now ready, while the aggregate remains `BLOCKED` with 3/12 blocker families ready.

## Claim Semantics And Fail-Closed Boundaries

- `ISOLATED_POSTGRESQL_RUNTIME_CONTROL_VERIFIED` means the runtime trigger boundary passed in the dedicated non-production PostgreSQL proof database.
- It does not claim that the production database was inspected, migrated, or verified.
- It does not authorize production release or activation.
- Country-pack production evidence remains independently fail closed through B05-B06.
- Credential, operational, freeze, governance, and operator evidence remain independently fail closed through B07-B10.
- The overall release claim remains `NOT_READY`; activation remains unauthorized.

## Focused Tests

Added coverage proving that:

- a newer passing direct proof invalidates a conflicting older blocked aggregate;
- a newer failing direct proof invalidates an older passing proof and fails closed;
- a passing immutability control cannot open country-pack or operator production gates;
- the report never turns isolated engineering evidence into a production-database or activation claim.

## Validation

- `node --check scripts/enterprise-release-blocker-status.js`: passed.
- Focused Jest batch: 4 suites, 40 tests passed.
  - `scripts/__tests__/enterprise-release-blocker-status.test.js`
  - `scripts/__tests__/payroll-immutability-runtime-check.test.js`
  - `scripts/__tests__/with-payroll-immutability-test-db.test.js`
  - `services/payroll/__tests__/payroll-immutability-migration.test.ts`
- `npm run prisma:validate`: passed.
- Prettier check on the two implementation/test files and regenerated Markdown/JSON read model: passed.
- `git diff --check` on the changed gate, tests, and read-model outputs: passed.
- Parsed read-model assertion: schema `1.1`, aggregate `BLOCKED`, B02 ready, run 2 selected, country and operator claims `FAIL_CLOSED`.

`prisma:generate` was skipped because the Prisma schema and generated-client contract did not change. Typecheck, service-boundary, payroll service, action, accounting, and UI checks were skipped because this slice changes CommonJS release evidence arbitration, focused tests, and generated release read-model artifacts only. The live database proof was not rerun because the task was to consume the existing current isolated proof; its two independent successful runs remain the source evidence.

## Security, Privacy, Accounting, And UI Decisions

- No salary, person, payment destination, provider, authority, or database credential values are copied into the release read model.
- Only the already-redacted proof path, timestamp, digest, isolated scope, and aggregate counts are exposed.
- Finalized payroll evidence mutation rules and correction boundaries were not widened.
- No payroll service mutation path, country-pack decision, operator approval, accounting posting rule, route, component, or UI action changed.

## Files Changed

- `scripts/enterprise-release-blocker-status.js`
- `scripts/__tests__/enterprise-release-blocker-status.test.js`
- `what-next/enterprise-release-blocker-status.json`
- `what-next/enterprise-release-blocker-status.md`
- This dated report.

## Handoff

The stale B02 aggregate conflict is closed. The isolated PostgreSQL immutability engineering control is now represented truthfully and reproducibly in the release/control-tower read model. Production remains blocked by the existing database-target, managed-secret, qualified country-pack review, credential, operational, freeze, governance, Phase 2B, and Phase 3 gates.
