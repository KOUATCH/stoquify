# Stoquify HRIS Owner Signoff Pack

Date: 2026-07-17

## Purpose

This pack is the next step after remediating the migration/backfill pilot blockers for `org_payroll_e2e_local`.

It is **not** an owner approval. It is the evidence packet owners should review before signing the migration close pack.

## Signoff request

Requested decision: approve the controlled local pilot migration/backfill close pack for the remediated tenant evidence only.

Not requested: unrestricted production release, production data migration, statutory payroll certification, or cross-tenant rollout.

## Current pilot state

| Item | Status |
| --- | --- |
| Migration pilot status | `READY_FOR_OWNER_SIGNOFF` |
| Close pack status | `PENDING_OWNER_SIGNOFF` |
| Tenant | `org_payroll_e2e_local` |
| Employees scanned | 1 |
| Adoptable projections | 1 |
| Legacy-unverified projections | 0 |
| Blockers | 0 |
| Warnings | 0 |
| Rollback mutation count | 0 |
| Rollback destructive operations | 0 |
| Immutable evidence preserved | true |

## Required owner approvals

| Owner role | Requested approval |
| --- | --- |
| `hr-owner` | Approve that the employee source proof and People Core ownership metadata are acceptable for the controlled pilot tenant. |
| `payroll-owner` | Approve that payroll compatibility rows may be consumed as HRIS-backed pilot facts after the correction evidence, without rewriting historical payroll outputs. |
| `accounting-controller` | Approve that the pilot does not alter ledger truth and does not claim accounting close certification beyond the controlled evidence scope. |
| `security-privacy` | Approve that redaction, payment-destination evidence, separation of duties, and sensitive data handling are acceptable for the controlled pilot tenant. |
| `operations-owner` | Approve that the correction-only rollback posture, rerun evidence, and operational remediation steps are acceptable for the controlled pilot tenant. |

## Evidence to review

- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_REMEDIATION_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_POST_REMEDIATION_RERUN_2026-07-17.json`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_SIGNOFF_READY_GATE_2026-07-17.md`
- `what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_SIGNOFF_READY_GATE_2026-07-17.json`
- `what-next/prisma-migration-deployment-readiness.md`
- `what-next/payroll/STOQUIFY_HRIS_FINAL_READINESS_2026-07-17.md`

## Evidence hashes

| Evidence | Hash |
| --- | --- |
| Source projection | `sha256:505d71157d80e7a4111f22c1aec277e260f3d966432d1e42bd20787fe9895c6c` |
| Reconciliation | `sha256:fd48b8f98d09e01b0d6630f78718f2207edd461bdc8dc8e7e3401555740cccfa` |
| Plan | `sha256:3a04f52c32263fb704b9905f31dfac7562a677e3cd17f27097b621796a41db4d` |

## Gates completed in this next step

| Gate | Result |
| --- | --- |
| Prisma migration safety gate | Passed: 8/8 ready, 17 migrations, 0 destructive findings |
| Signoff-ready migration pilot gate | Passed: `READY_FOR_OWNER_SIGNOFF`, 0 blockers |
| Focused pilot/final readiness Jest replay | Passed: 3 suites, 21 tests |

Test note: Jest reported that a worker process was force-exited after passing tests. Treat this as test teardown hygiene to investigate, not as a failed assertion.

## Non-waivable before unrestricted production

- All five owner approvals listed above.
- Current full project typecheck completion.
- Full release gate replay, including policy gates and browser validation in a stable environment.
- No production mutation until the signed close pack exists.

## Suggested signoff language

Each owner should record:

```text
I approve the Stoquify HRIS migration/backfill controlled local pilot close pack for tenant org_payroll_e2e_local only.
I do not approve unrestricted production release from this evidence alone.
Role:
Approver:
Date:
Evidence reviewed:
Conditions or exceptions:
```

## Decision after signoff

After all owner approvals are recorded, rerun:

```powershell
node scripts/hris-migration-backfill-pilot.js --mode fail --organization-id org_payroll_e2e_local --max-employees 250 --out what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_SIGNED_GATE_2026-07-17.md --json-out what-next/payroll/STOQUIFY_HRIS_MIGRATION_BACKFILL_PILOT_SIGNED_GATE_2026-07-17.json
```

Then rerun `stoquify-hris-19-final-readiness`.
