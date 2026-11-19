# HR21 development03 — native authentication/session boundary

Use the actual lib/auth.ts BetterAuth configuration, password implementation, PostgreSQL adapter, cookie sessions, lib/security/auth-session.ts and fresh RBAC owner with isolated synthetic accounts. Adapt only the Prisma connection to the owned loopback target and next/headers to per-request test headers. The application .env, social providers and external network are not used. This is actual native authentication/session integration, not full Next rendering or browser acceptance.

Check successful and failed credential login, no-session denial, current HR read scope, own/other employee denial, role revocation under an existing cookie, inactive/locked account denial, tenant mismatch and session deletion. Retain no passwords, tokens or cookie strings in artifacts. Create/clean only namespaced fixtures. Final PASS requires all assertions and cleanup.

Owned files: this harness/evidence directory and only reproduced narrowly necessary auth fixes, plus execution-register append. Independent reviewer required. Development02 is sealed before this work. No deployment details are required.
