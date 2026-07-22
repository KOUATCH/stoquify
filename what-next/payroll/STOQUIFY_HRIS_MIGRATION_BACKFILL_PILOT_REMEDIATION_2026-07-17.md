# Stoquify HRIS Migration Backfill Pilot Remediation

Date: 2026-07-17

## Executive outcome

Status: **Five pilot blockers remediated for the local tenant; ready for owner signoff, not yet signed off.**

The local pilot tenant `org_payroll_e2e_local` no longer reports the five migration blockers from the prior dry run. The post-remediation migration pilot now reports `READY_FOR_OWNER_SIGNOFF`, with 1 adoptable employee projection, 0 legacy-unverified projections, 0 blockers, and 0 warnings.

The close pack remains `PENDING_OWNER_SIGNOFF`; no signoff was self-issued.

## Scope

- Tenant: `org_payroll_e2e_local`
- Employee scope: 1 active local pilot employee
- Remediation mode: local-only correction evidence
- Production mutation: none
- Historical payroll rewrite: none

## Files changed

- `scripts/hris-migration-pilot-remediate-local.js`
- `package.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_RERUN_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_RERUN_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_FAIL_GATE_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_FAIL_GATE_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_REMEDIATION_2026-07-17.md`

## Database corrections applied

The remediation script is idempotent and local-only. It refuses production environment markers and non-local tenant ids. It appends deterministic correction evidence for the local pilot rows:

| Blocker | Result |
| --- | --- |
| `EMPLOYEE_SOURCE_PROOF_MISSING` | Added HRIS source-system, source-record, source-hash, and correction business event metadata. |
| `ACTIVE_CONTRACT_DOCUMENT_PROOF_MISSING` | Added approved governed document evidence metadata tied to the existing signed document hash. |
| `ACTIVE_CONTRACT_APPROVAL_PROOF_MISSING` | Added active contract activation business event and approved activation metadata. |
| `ACTIVE_COMPENSATION_APPROVAL_PROOF_MISSING` | Added compensation approval business event and approved compensation metadata. |
| `PAYMENT_DESTINATION_APPLIED_PROOF_MISSING` | Added applied payment-destination business event and metadata. |

The script also corrected the local fixture's payment-destination separation of duties so the applied proof did not reveal `PAYMENT_DESTINATION_SOD_INVALID` on rerun.

## Post-remediation evidence

| Metric | Result |
| --- | --- |
| Status | `READY_FOR_OWNER_SIGNOFF` |
| Close pack | `PENDING_OWNER_SIGNOFF` |
| Employees scanned | 1 |
| Adoptable projections | 1 |
| Legacy-unverified projections | 0 |
| Blockers | 0 |
| Warnings | 0 |
| Rollback mutation count | 0 |
| Rollback destructive operations | 0 |
| Immutable evidence preserved | true |
| Rerun hashes stable | true |
| Fail gate after remediation | exit code 0 |

Evidence hashes:

- Source projection: `sha256:505d71157d80e7a4111f22c1aec277e260f3d966432d1e42bd20787fe9895c6c`
- Reconciliation: `sha256:fd48b8f98d09e01b0d6630f78718f2207edd461bdc8dc8e7e3401555740cccfa`
- Plan: `sha256:3a04f52c32263fb704b9905f31dfac7562a677e3cd17f27097b621796a41db4d`

## Gates run

| Gate | Result |
| --- | --- |
| Remediation script syntax | Passed |
| Remediation script focused ESLint | Passed |
| Remediation dry-run preview | Passed |
| Remediation apply | Passed |
| Remediation package-script idempotency rerun | Passed |
| Post-remediation pilot dry run | Passed |
| Post-remediation idempotency rerun | Passed; stable hashes |
| Post-remediation fail gate | Passed; exit code 0 |
| Focused Jest: final-readiness and migration-pilot suites | Passed: 2 suites, 15 tests |

## Owner signoff state

Still pending:

- `hr-owner`
- `payroll-owner`
- `accounting-controller`
- `security-privacy`
- `operations-owner`

## Handoff

Handed to `stoquify-hris-19-final-readiness` with remediated pilot data and a pending owner-signoff close pack.
