# Prisma Migration Deployment Readiness

Generated: 2026-07-27T05:30:37.850Z
Mode: `fail`
Status: `ready`

## Summary

- Checks ready: 8/8
- Migrations: 41
- Risk findings: 0
- Approved risks: 0
- Blockers: 0
- Secret values printed: no

## Deployment Decision

- Environment: `local`
- Action: `skip`
- Reason: `non_production_default_skip`
- Database URL configured: no
- Database target safe: yes
- Execution: `skipped`

## Checks

- ready: migration_history_present
- ready: migration_files_nonempty
- ready: risk_approval_registry_valid
- ready: destructive_sql_is_exact_hash_approved
- ready: deployment_target_is_safe
- ready: production_build_orders_secret_migration_and_app_gates
- ready: migration_safety_gate_is_in_policy_chain
- ready: release_verification_has_migration_preflight

## Risk Findings

- No destructive SQL patterns detected.

## Blockers

- None

## Safety

- Local and preview deployments skip database mutation by default.
- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.
- Approved destructive SQL is bound to the exact migration file hash.
- Database URLs and credentials are never written to evidence.
