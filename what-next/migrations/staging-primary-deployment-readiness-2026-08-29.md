# Prisma Migration Deployment Readiness

Generated: 2026-08-29T08:04:00.112Z
Mode: `fail`
Status: `ready`

## Summary

- Checks ready: 10/10
- Migrations: 80
- Risk findings in active scope: 0
- Risk findings in full catalog: 13
- Approved risks: 0
- Stale approvals: 0
- Revoked approvals: 0
- Blockers: 0
- Secret values printed: no

## Deployment Decision

- Environment: `local`
- Action: `skip`
- Reason: `non_production_default_skip`
- Database URL configured: no
- Database target safe: yes
- Execution: `skipped`
- Risk scope: `unmanifested_catalog_delta`
- Scoped migrations: 0
- Baseline path: `not_applicable`
- Automatic baseline execution allowed: no

## Target History

- Not required for this non-deployment scan.

## Catalog Manifest

- Status: `ready`
- Hash contract: `stoquify-migration-sql-sha256-v1`
- Catalog SHA-256: `82d4b81e7dbb388b732402e3920dcbe701ad96354fbcf11985b8375e92a3d630`
- Grandfathered timestamp collisions: 1

## Checks

- ready: migration_history_present
- ready: migration_files_nonempty
- ready: risk_approval_registry_valid
- ready: destructive_sql_is_exact_hash_approved
- ready: migration_catalog_manifest_integrity
- ready: deployment_target_is_safe
- ready: production_build_orders_secret_migration_and_app_gates
- ready: migration_safety_gate_is_in_policy_chain
- ready: release_verification_has_migration_preflight
- ready: protected_verification_has_direct_history_health

## Risk Findings

- No destructive SQL patterns detected in the active scope.

## Blockers

- None

## Safety

- Local and preview deployments skip database mutation by default.
- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.
- Each approved destructive finding is independently bound to the exact migration and SQL-clause hashes.
- Full-catalog history integrity is evaluated separately from target-pending destructive execution risk.
- Revoked, expired, hash-drifted, and missing-finding approvals remain blocked.
- Database URLs and credentials are never written to evidence.
