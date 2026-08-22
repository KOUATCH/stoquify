# Prisma Migration Deployment Readiness

Generated: 2026-08-18T03:33:49.679Z
Mode: `report`
Status: `blocked`

## Summary

- Checks ready: 8/9
- Migrations: 71
- Risk findings: 13
- Approved risks: 0
- Stale approvals: 0
- Revoked approvals: 0
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

- blocked: drop_table in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:116 (`69294f51328a0a7575cff0524e5196accf0159913177b11dd249b65e554295fe`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:80 (`4781af03745e807d47ccdc89b62f0562b923707465d36d215cbeaea3e3e164fb`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:81 (`277a312724a1c524d910f7c5966d70170825cf1d6a60679269b2388a6c9f3e55`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:82 (`5807ad92f5163c0922dce2373dd15df9d064a28a61b1601e063a510448c52c13`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:83 (`fbc401c6980f7b01658bb2b2f3702c618e2378e92395b4caee631fd8d8bee2cb`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:84 (`b5d38ed4fd3e87f368f0948c54731873ffdbec440832c219a078af57364ec76b`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:85 (`07a6cfdfae6507d5572505bc8a0505c74d4f0f1b496f0864b1e2d4e537ce1492`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:86 (`6ad18571cee52ce1386eacb37d9b18e40c4d6ffbb3b3166de4ffe4710df83988`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:87 (`42bf676feeb19705c6bd4a57cf83ac0f99d8cbb830b46cd42b1f980243a31165`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:88 (`5f168672b10fcdcbe1af94b0da9d9ead18688f6254a326c146ccb1aecda6d9de`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:101 (`8f4f2215000c21bc293358a28c8c4f8df6b90abdbc7c5200cb0b4e7d814807b9`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:102 (`ec44f20e8dd677d05d2303eef1758a22bebb08077983362349f6d9c5e4fd9178`)
- blocked: drop_column in prisma/migrations/20260611130000_accounting_auth_baseline_bridge/migration.sql:112 (`4b1479492af21a9dd97c0a5212afe7c7383b8cd3b31045310e8ab0e0143bc95d`)

## Blockers

- destructive_sql_is_exact_hash_approved

## Safety

- Local and preview deployments skip database mutation by default.
- Production deployment requires a non-local PostgreSQL DATABASE_URL supplied through the process environment.
- Each approved destructive finding is independently bound to the exact migration and SQL-clause hashes.
- Revoked, expired, hash-drifted, and missing-finding approvals remain blocked.
- Database URLs and credentials are never written to evidence.
