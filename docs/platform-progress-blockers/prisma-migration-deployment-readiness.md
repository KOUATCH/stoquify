# Prisma Migration Deployment Readiness

Generated: 2026-08-10T13:32:14.704Z
Mode: `fail`
Status: `blocked`

## Summary

- Checks ready: 8/9
- Migrations: 62
- Risk findings: 13
- Approved risks: 0
- Blockers: 1
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
- blocked: destructive_sql_is_exact_hash_approved
- ready: deployment_target_is_safe
- ready: production_build_orders_secret_migration_and_app_gates
- ready: migration_safety_gate_is_in_policy_chain
- ready: release_verification_has_migration_preflight
- ready: protected_verification_has_direct_history_health

## Risk Findings

- blocked: drop_table in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:116
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:80
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:81
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:82
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:83
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:84
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:85
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:86
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:87
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:88
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:101
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:102
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:112

## Blockers

- destructive_sql_is_exact_hash_approved

## Safety

- Local and preview deployments skip database mutation by default.
- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.
- Approved destructive SQL is bound to the exact migration file hash.
- Database URLs and credentials are never written to evidence.
