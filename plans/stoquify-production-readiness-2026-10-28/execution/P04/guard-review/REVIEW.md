# P04 shared authority review and native recipe

29 October 2026. Independent source inspection; no application edits or runtime/test/database execution by this reviewer. Test construction is separately authorized. This packet does not certify all routes/actions; the parallel inventories determine the admitted surface coverage.

## Authority invariants found in current source

- `lib/security/rbac.ts:90,108,143–170`: bypass the signed-cookie cache for authorization, resolve the session subject by immutable user ID, require active user/current active nondeleted organization, reject active locks and unverified accounts, reject a supplied stale session organization, and project only same-tenant roles. Permission arrays are re-read on every call; role names alone do not grant ordinary RBAC permissions.
- `lib/security/rbac-permissions.ts`: canonical grants remain narrow during expansion; stored legacy grants retain their declared compatibility. Unknown permissions fail closed. Wildcard is accepted only for low/medium risk operations; high/critical operations require explicit permission. `isSuperUser` means a stored wildcard in effective tenant roles, not a universal cross-tenant override.
- `lib/security/auth-session.ts:103–165`: current exact session ID/token/user/expiry is rechecked in PostgreSQL. Fresh assurance must be present, sufficiently recent, not future-dated, unlocked, sufficiently strong and bound to the current tenant. `branchIds: []` and static `modulesEnabled` at lines83–84 are placeholders, not current location or entitlement evidence.
- `services/_shared/protect.ts:87–110`: assurance actor/tenant must match the separately refreshed permission context; configured module gates default to enforce; tenant fields are checked before the handler. Denial returns `data:null` and safe errors. Tenant extraction is intentionally limited to top-level organizationId/orgId and data.organizationId/data.orgId. It neither authenticates caller-supplied actor IDs nor recursively scopes arbitrary related-resource IDs; handlers must do that.
- `lib/security/server-authz.ts`: API session helpers resolve current authority and organization; callers still need operation permission and applicable module checks. `safeUserSelect` excludes password/session tokens. `hasAppPermission` is a projection helper, not an authentication boundary; its user argument must be server-derived.
- `services/modules/module-entitlement.service.ts`: retained configuration with zero grants is authoritative; missing configuration with grants/history fails closed. Explicit `enforce` denies absent/inactive/read-only incompatible entitlement and required dependencies. Direct calls default to observe, while protect/API helpers select enforce. Observe-only surfaces must not be counted as enforced.
- `services/operating-access/operating-access-scope*.ts`: dashboard.read is required. Wildcard context or normalized admin/administrator/super_admin code obtains tenant-wide scope. Otherwise only active, nondeleted locations whose managerId equals current actor and organizationId equals current tenant are returned. Codes owner/manager alone are not tenant-wide authority. These are product-specific scope rules, separate from ordinary permission strings.
- Role/member write services lock current organization, users, roles/memberships/session and revalidate permission ceiling/fresh auth before mutation. Member assignment revokes recipient sessions. Role grant checks prohibit wildcard and cross-tenant roles but inspect permission arrays, not role-code-derived operating authority.

## Material finding requiring reproduction

**P04-GR01: role-code-derived operating authority can escape the permission grant ceiling.** Source-supported composed behavior, not yet executed by this reviewer.

`services/roles/role-write.service.ts:68–71` derives a new role code from its freely supplied name (`lib/createRoleName.ts`). `services/users/member-access-policy.ts:16–18` and the invitation grant policy authorize a target based on its permission array. `services/operating-access/operating-access-scope-contracts.ts:22–54` independently grants tenant-wide operating scope to admin/administrator/super_admin. There is no reserved-code admission check along the inspected create/assign path.

A location-scoped actor holding legitimate roles.create, roles.permissions.assign, users.read, users.roles.assign and dashboard.read can create an unused Admin role with only dashboard.read, assign it to another location-scoped account, and thereby confer tenant-wide operating scope absent from the actor. The action reviewer confirmed that createRole and changeMemberAccessAction add fresh-auth and ordinary permission gates but no reserved-code gate. The test below uses a distinct recipient and a fresh synthetic tenant, avoiding self-assignment and preexisting reserved-name collisions.

Do not make an application fix from this source finding alone. First retain the expected-red final scope assertion. If reproduced, register the correction before editing. Review code-derived scope as authority when selecting the repair: creation-only rejection would not address already existing reserved-code roles passed through assignment/invitation. Do not silently change established administrator scope or migrate stored roles without an explicit policy decision.

## Existing verification inspected

All the following tests are mocked/pure unless explicitly stated otherwise:

| Existing test | Useful proof and limit |
|---|---|
| `lib/security/__tests__/rbac.test.ts` | Cache-bypass option, subject-ID binding, foreign-role filtering, narrow permission propagation, cross-org wildcard denial; auth and DB mocked. |
| `lib/security/__tests__/auth-session.test.ts` | Exact mirror query, missing/revoked/mismatched row, identity mismatch, stale/future/wrong-tenant/weak/locked assurance; auth/RBAC/DB mocked. |
| `lib/security/__tests__/rbac-permissions.test.ts` | Canonical/legacy isolation, unknown permission and high-risk wildcard denial; pure policy. |
| `services/_shared/__tests__/protect.test.ts` | Fresh-context mismatch, forged tenant fields, module denial/backend failure, no handler call/private response/log leakage; guard and module dependencies mocked. |
| `lib/security/__tests__/server-authz.test.ts` | Safe unauthorized/forbidden API helpers and module metadata; authority/module mocked. |
| `lib/security/__tests__/auth-deactivation.test.ts` | Disabled/permanent-lock rejection and conditional account bookkeeping; Better Auth constructor/adapter mocked. |
| `services/roles/__tests__/role.service.test.ts` | Tenant role scope, locked-write authority, grant/removal ceilings, stale version, last custodian; transactions mocked. |
| `services/users/__tests__/member-access.service.test.ts` | Nonself member control, forged roles, revision/permission changes, session revocation/receipt, last custodian and redacted history; DB mocked. |
| `services/security/__tests__/role-grant-policy.service.test.ts` | Assignment authority, tenant and explicit permission ceiling; pure policy, not reserved-code scope. |
| `services/security/__tests__/account-session.service.test.ts` | Token-free display, own reviewed revocation, current-session denial, transaction audit failure; DB mocked. |
| `services/operating-access/__tests__/operating-access-scope.service.test.ts` | Administrator code versus location-manager scope, tenant predicates and minimal audit; injected client mocked. |
| `services/modules/__tests__/module-entitlement.service.test.ts` | Managed/legacy entitlement semantics; DB mocked. |
| `tests/e2e/customer-rbac-negative.spec.ts` | Existing browser denied-surface/no-private-customer assertions, but depends on its historical server/auth/seed configuration. Do not execute its npm wrapper against arbitrary current environment. |
| P03 `accountant-grant-replay.postgres.test.ts` and native receipt | Real grant receipt concurrency/rollback proof for its identified service bytes. Does not prove shared session-cookie or full current authority behavior. |

The dated `graphify-out/GRAPH_REPORT_actions.md` (2026-08-09) was consulted only for discovery; its counts do not qualify this current review.

## New native test and exact execution boundary

`shared-guards.postgres.test.ts` contains **24 statically enumerated cases: 23 expected ordinary passes and one expected-red reserved-code scope case**. It uses current real Prisma queries, transactions, role/member services, permission policy, module service, audit persistence and operating scope. `@/lib/auth`, `next/headers` and `server-only` are explicit stubs. No route/browser/Next cache operation is exercised.

It covers permission removal on the next real DB read, foreign-tenant role filtering, four forged tenant-field shapes, four exact-session mirror failures, six current account/org failures, five persisted assurance failures through requireFreshAuth and protect, location filtering, managed-empty-module denial, and the composed role-code case. Protected-denial cases assert no handler invocation, no private output and identical before/after full-row digests for both fixture tenants' organizations, users with role memberships, roles, sessions, locations, module configurations/grants/commands. Raw rows remain in memory; assertions report hashes/counts, not tokens. This snapshot does not cover every business table. Expected security audit writes are retained separately and must not be misreported as zero database writes.

Runner requirements before execution:

1. Fresh unique `stoquify_local_p04_*` database on the existing owned P03 PostgreSQL cluster only. Require stopped cluster/available port; verify exact real data_directory before cloning the immutable template. Refuse existing target; no drop/reset/reuse. Set P04_POSTGRES_URL and P04_CLUSTER_DIR only for that owned target.
2. Current schema SHA-256 `1813b8954e67033633071f68db3845e778aacbf06f7cc545452178b6dc2ff607` exactly equals frozen P03 source. Private generated schema SHA `2fdb8c5dc9c1db6f10ab35b1a8c8e7910ad8eca0d9d97661c003b31b5dbe0226` differs in formatting/order only: all452 named model/enum/generator/datasource blocks have matching whitespace-normalized declaration multisets. Recheck current migrations against all120 template migration checksums and lock file; refuse drift. This source comparison is not a fresh DB migration-history check.
3. Map exact `^@prisma/client$` to the previously isolated private index, verify its26-file manifest and all configured environment paths absent, and run environment-read-guard before application imports. If copying the guard, update its relative private-client assertion; retaining the P03 guard path preserves its reviewed resolution.
4. Node test environment; narrow testMatch/roots; no `jest.setup.ts` because it mocks Prisma and inventory globally. No Next app directory passed to nextJest, no dotenv, no production/provider env inheritance, no workers/install/build. Explicit server-only stub and Next headers stub are already in the test. Database URL never persisted with secrets, session tokens never logged.
5. Use one worker and bounded timeouts. Retain tests/result/log/source hashes, including failure. Always disconnect clients, stop only the owned cluster, confirm stopped/ports released and preserve prior evidence. No application/main-register files are owned by this reviewer.

This native lane **cannot certify Better Auth cookie signature/cache/revocation behavior**. The mirror tests intentionally feed retained mocked auth transport into actual requireSession SQL. Real `requireRbacContext` alone relies on actual Better Auth's disableCookieCache path; the test only asserts the option is passed. Installed Better Auth1.6.14 `dist/api/routes/session.mjs:41,93,186–188` verifies a signed session cookie, bypasses cached session data for this query option and reads/rejects absent/expired sessions. To close that distinct runtime gap, a separately reviewed in-process actual Better Auth import/handler test or current sealed HTTP test must reuse the real configuration and signed session, then revoke/expire it and retry. Duplicated auth configuration or a mocked getSession result is not equivalent. Better Auth may delete expired sessions or update session bookkeeping; native assertions should distinguish those expected auth/audit effects from forbidden business writes.

## Review disposition

Shared guard source contracts are identified; one composed scope-escalation hypothesis merits a blocking reproduction. No blanket security PASS. Native tests are authored but not executed by the reviewer. P04 closure must also reconcile the independent route/action inventories, current candidate fingerprints, actual executed lanes and all confirmed defects.
