# Prisma Migration Deployment Readiness

Generated: 2026-07-27T05:34:18.633Z
Mode: `fail`
Status: `blocked`

## Summary

- Checks ready: 7/8
- Migrations: 41
- Risk findings: 0
- Approved risks: 0
- Blockers: 2
- Secret values printed: no

## Deployment Decision

- Environment: `production`
- Action: `deploy`
- Reason: `vercel_production`
- Database URL configured: no
- Database target safe: no
- Execution: `pending`

## Checks

- ready: migration_history_present
- ready: migration_files_nonempty
- ready: risk_approval_registry_valid
- ready: destructive_sql_is_exact_hash_approved
- blocked: deployment_target_is_safe
- ready: production_build_orders_secret_migration_and_app_gates
- ready: migration_safety_gate_is_in_policy_chain
- ready: release_verification_has_migration_preflight

## Risk Findings

- No destructive SQL patterns detected.

## Blockers

- deployment_target_is_safe
- database_url_missing

## Safety

- Local and preview deployments skip database mutation by default.
- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.
- Approved destructive SQL is bound to the exact migration file hash.
- Database URLs and credentials are never written to evidence.
