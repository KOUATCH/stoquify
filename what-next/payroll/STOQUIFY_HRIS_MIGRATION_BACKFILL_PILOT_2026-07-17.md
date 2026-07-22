# Stoquify HRIS Migration Backfill Pilot

Date: 2026-07-17

## Executive outcome

Status: **Blocked for final readiness, ready for correction-only remediation and rerun.**

The migration/backfill pilot tooling is present and the local pilot dry run is repeatable, redacted, reversible by correction, and fail-closed. It must not be handed to `stoquify-hris-19-final-readiness` yet because the pilot tenant data is not adoptable into HRIS People Core ownership: the current compatibility rows lack complete HRIS source proof and maker-checker evidence for active contract, compensation, and payment-destination facts.

No production data was mutated. The pilot remains dry-run only.

## Scope

- Skill: `stoquify-hris-18-migration-backfill-pilot`
- Pilot tenant: `org_payroll_e2e_local`
- Scan limit: 250 employees
- Employees scanned: 1
- Compatibility storage: `PayrollEmployee` and related payroll source tables
- Target ownership: HRIS People Core
- Mutation mode: unavailable/refused

## Files inspected

- `C:\Users\J COMPUTER\.codex\skills\stoquify-hris-18-migration-backfill-pilot\SKILL.md`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/payroll/STOQUIFY_HRIS_BROWSER_ACCESSIBILITY_RBAC_RELEASE_2026-07-16.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_DRY_RUN_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_EVIDENCE_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_EVIDENCE_RERUN_2026-07-17.json`

## Files changed

- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_DRY_RUN_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_EVIDENCE_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_DRY_RUN_RERUN_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_EVIDENCE_RERUN_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_FAIL_GATE_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_FAIL_GATE_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_2026-07-17.md`

Existing migration pilot implementation files were already present and clean in the working tree during this run:

- `services/hris/migration-backfill-pilot.service.ts`
- `services/hris/__tests__/migration-backfill-pilot.service.test.ts`
- `scripts/hris-migration-backfill-pilot.ts`
- `scripts/hris-migration-backfill-pilot.js`
- `package.json`

No unrelated dirty-worktree files were reverted, reformatted, staged, or committed.

## Data ownership

- HRIS owns employee identity, source lineage, contracts, approval evidence, compensation facts, payment-destination provenance, and People Core adoption decisions.
- Payroll keeps compatibility storage during the transition and consumes only certified HRIS-backed facts.
- Accounting owns ledger truth and must not be forced to reconcile payroll outputs against unproven HRIS facts.
- Assurance owns the evidence pack, hashes, close-pack signoff state, and remediation trail.

The pilot does not create a second employee master and does not rewrite historical payroll outputs.

## Tenant and RBAC decision

The pilot is tenant-scoped to `org_payroll_e2e_local`. Evidence uses a redacted organization reference and does not expose raw person identifiers, salary values, payment destination data, raw documents, raw proof hashes, provider payloads, or authority payloads.

The previous browser/RBAC slice established controlled authenticated route and denied-role evidence for the same local tenant context. This migration pilot only validates server-side data readiness; it does not broaden UI permissions or create business truth from the browser layer.

## Audit and redaction decision

- Dry-run only: yes
- Mutation mode available: no
- Rollback strategy: correction-only
- Mutation count in rollback simulation: 0
- Destructive operations in rollback simulation: 0
- Immutable evidence preserved: true
- Immutable evidence hash before equals after: true
- Raw person data included: false
- Raw salary included: false
- Raw payment destination included: false
- Raw document content included: false
- Raw proof hashes included: false

## Reconciliation result

| Metric | Count |
| --- | ---: |
| Employees | 1 |
| Contracts | 1 |
| Compensation assignments | 1 |
| Payment-destination requests | 1 |
| Attendance snapshots | 2 |
| Payroll runs | 2 |
| Adoptable projections | 0 |
| Legacy-unverified projections | 1 |
| Blockers | 5 |
| Warnings | 0 |

## Current blockers

| Code | Count | Required remediation |
| --- | ---: | --- |
| `EMPLOYEE_SOURCE_PROOF_MISSING` | 1 | Append reviewed HRIS source-system, source-record, and source-hash proof, or keep the row classified as legacy-unverified. |
| `ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING` | 1 | Capture governed signed-document evidence under retention, malware-scan, and legal-hold controls. |
| `ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING` | 1 | Append HRIS maker-checker activation proof and an activation business event. |
| `ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING` | 1 | Append compensation approval evidence and business-event proof. |
| `PAYMENT_DESTINATION_APPLIED_PROOF_MISSING` | 1 | Reconcile the current destination hash to a complete applied request with document, approval, and business-event proof. |

## Evidence hashes

First dry run and rerun matched on all stable evidence hashes.

| Evidence | Hash |
| --- | --- |
| Source projection | `sha256:f2a9f18dbbcc36170bd37221a905f9fb05960892fe381493154a41c522095796` |
| Correction plan | `sha256:8fd13d3004a375fad5f06d9dc52f1a4be5226edb0f8945a468f7574c1c3fc60f` |
| Immutable evidence before | `sha256:34af8a4c7429451ecdcb66e88319aefba5d8356608a23d57656cbb9fab25a237` |
| Immutable evidence after | `sha256:34af8a4c7429451ecdcb66e88319aefba5d8356608a23d57656cbb9fab25a237` |
| Reconciliation | `sha256:5a748cf6e836ca8eb82330021a9a4c6f403a9e08e2172cf84b8f35fd49c25f31` |
| Plan | `sha256:d7f13d84f046a7796c0c3bdd859442ef2ad7d6182ce21ffd91baf11a0be6ff93` |

## Gates run

| Gate | Result |
| --- | --- |
| Skill file read and contract confirmed | Passed |
| Orphan `tsc --noEmit` process check after interruption | Passed; no orphan before rerun, later timed-out children were stopped |
| `node --check scripts/hris-migration-backfill-pilot.js` | Passed |
| Focused ESLint for migration pilot service, test, and scripts | Passed |
| Focused Jest: `services/hris/__tests__/migration-backfill-pilot.service.test.ts` | Passed: 1 suite, 4 tests |
| `npm run prisma:validate` | Passed |
| Migration readiness evidence | Passed from existing gate: 8/8 ready, 17 migrations, 0 destructive findings |
| First dry-run pilot report | Passed; wrote redacted Markdown and JSON |
| Idempotency rerun | Passed; all stable hashes matched |
| Rollback/correction simulation | Passed; mutation count 0, destructive operations 0, immutable evidence preserved |
| Fail-closed gate | Passed; blocked pilot exited with code 1 |

## Checks that did not fully pass

`npm run typecheck` did not complete during this run. The default heap attempt from the previous run failed with Node heap exhaustion and no TypeScript diagnostic. The expanded heap retry ran for 15 minutes and timed out without diagnostics; two orphan `tsc --noEmit --pretty false` child processes from that timeout were identified in this repository and stopped.

This is reported as a project-wide gate limitation, not as a migration pilot pass. The focused TypeScript-adjacent gates for the active files passed through ESLint, Jest execution, script syntax validation, and runtime CLI execution.

## Skipped checks

- No production migration/backfill execution.
- No owner signoff was self-issued.
- No manual mutation rollback was performed because mutation mode is unavailable and the pilot is dry-run only.
- No final-readiness handoff was claimed because the pilot data remains blocked.

## Residual risk

- The local pilot proves the dry-run planner, hashing, redaction, correction plan, and fail-closed behavior, but it does not prove that real tenant HRIS data is adoptable.
- The pilot tenant contains legacy-unverified compatibility data, so Payroll must not treat this as certified HRIS People Core truth.
- Full project typecheck remains unresolved and should be rerun in a stable environment before landing a release branch.
- Owner signoffs remain pending for HR, payroll, accounting control, security/privacy, and operations.

## Next handoff

Do not hand off to `stoquify-hris-19-final-readiness` yet.

Next action: remediate the five tenant data-quality blockers by appending correction evidence without rewriting historical payroll outputs, then rerun `stoquify-hris-18-migration-backfill-pilot`. Only after a clean adoptable projection, stable rerun hashes, preserved immutable evidence, and explicit owner signoff should the work proceed to `stoquify-hris-19-final-readiness`.
