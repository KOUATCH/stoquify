# P04-R02 full-app database fixture and controls

The parent confirmed this exact local target on 2026-10-29: PostgreSQL 17 at `127.0.0.1:53528`, using the existing owned cluster `.codex-tmp/p03-grant-20261028-r1/postgres`. This worker exclusively owns its lifecycle. The two admitted fresh databases are `stoquify_local_p04r02_20261029_build_r1` and `stoquify_local_p04r02_20261029_full_r1`. No production database or existing tenant data is used.

## Admission and observed preparation

`cluster-control.cjs start` requires a stopped cluster, unoccupied loopback port and a new exclusive ownership marker. It starts only the pinned binary/data directory and checks the server address, port, database and real data directory before querying. Failed owned starts attempt bounded exact-directory cleanup and retain a failure/cleanup receipt. Cleanup is bound to the recorded postmaster PID, so it refuses to stop a restarted different owner. A failed SQL identity lookup does not strand that already-identified owned process: cleanup may use the recorded PID plus exact data-directory status, explicitly reporting that fallback.

`cluster-control.cjs clone` requires the candidate at `D:/Codex-Stoquify-P04-R02-20261029-01a1816a/source`. All 120 completed migration names and checksums must match the candidate; its Prisma schema hash must equal the pinned schema that produced the original template. Any mismatch blocks cloning for review. Catalog fingerprints cover columns, constraints, indexes, enum values and policies. Both clones must match the captured template fingerprint and contain zero organizations, users, accounts, sessions, roles, items and module authority rows before seeding.

These checks passed. See `cluster-start.json`, `database-clones.json` and `cluster-pid-binding.json`. The catalog comparison proves template/clone equality and migration/schema provenance; this package does not claim a fresh migration replay or independent Prisma schema diff.

Connections use explicit host, port, role, empty local password, SSL setting and session options, avoiding ambient `PG*` target/credential settings. No helper imports the application, its generated Prisma client or dotenv. The parent separately owns isolated client generation/build/runtime environment validation.

## Synthetic fixture

`seed-fixture.cjs` writes only to the admitted empty full-app clone. It generates random credentials using the current `lib/password.ts` Argon2id contract, creates verified active users and real Better Auth credential-account records, and creates **zero sessions**. Sessions must be obtained through the actual `/api/auth/sign-in/email` handler.

| Alias | Tenant | Intended case |
|---|---|---|
| `ui` | `p04-upload-a` | Authorized list/edit rendering and image reads |
| `foreign` | `p04-upload-b` | Positive own image, denied tenant-A image |
| `revocation` | `p04-upload-a` | Warm actual list/image read, then delete persisted sessions |
| `expiry` | `p04-upload-a` | Warm image read, then expire persisted sessions |
| `permissionChange` | `p04-upload-a` | Warm image read, then remove `dashboard.read` |
| `moduleChange` | `p04-upload-a` | Warm image read, then suspend its dashboard grant |
| `permissionDenied` | `p04-upload-a` | Existing valid session without `dashboard.read` |
| `moduleDenied` | `p04-upload-disabled` | Own image path, managed configuration with zero grants |

Every actor has an exclusive custom role. None has a wildcard, a reserved administrator role code, or another permission source that would survive the targeted removal. UI grants include the actual inventory dropdown reads (`taxes.read` for tax rates); the revocation actor has read-only list permissions and its own managed location. UI/foreign/module-denied fixture locations and three item/stock rows support genuine page rendering.

Tenants A and B have explicit active dashboard, inventory and settings grants. The disabled tenant has a managed configuration and zero grants, preventing legacy fallback. `requireApiModuleAccess` already uses `mode: "enforce"`, so no feature flag changes are needed.

Each item references only a dedicated generated fixture URL: `/uploads/<p04-upload-tenant>/sentinel.png`. The parent generates these distinct synthetic images and owns their hash/dimension metadata. Original `cmp_org_005` image content is never rendered by this fixture.

Seeding passed: eight actors, three items and zero sessions. Public evidence is `fixture-seeded.json`; passwords exist only in `.codex-tmp/p04r02-fullapp-database-20261029-r1/browser-fixture.private.json`. Do not print or copy that file into retained evidence. The parent adds candidate/artifact IDs, generated asset metadata and runtime URL to it before browser execution.

## Controller contract

`fixture-control.cjs` exports `readPrivateFixture()` for the parent's private adapter and `createControls()` returning:

```js
await controls.transition({ actorAlias: "revocation", kind: "revoke" });
// Positional transition(actorAlias, kind) is also supported.
const state = await controls.snapshot("revocation-denial-before");
await controls.close();
```

Transitions admit only their fixed fixture actor and operation. They perform persisted state changes under a transaction and a filesystem orchestration lock. Every connection rechecks the exact server/database identity. Supported kinds are `revoke`, `expire`, `restore-expiry`, `remove-permission`, `restore-permission`, `disable-module` and `restore-module`.

Module suspension affects tenant A, so serialize those tests and restore its grant before subsequent positive UI checks. Role permission restoration uses the original actor-exclusive set. Expiry restoration can restore a retained row; if Better Auth removes it, recover through a new real sign-in. Revoked tokens are never reinserted; recovery creates a fresh real session.

Each transition returns a redacted receipt with actor/tenant IDs, operation and affected-row count. Session tokens and plaintext credentials are not emitted. The browser retains actual signed cookies privately and replays them after the persisted mutation.

Snapshots run in a repeatable-read read-only transaction and hash every public business table. Full synthetic rows stay in memory only. Receipts contain per-table counts/hashes and `businessSha256`. Only `sessions` and `audit_logs` are excluded, with their counts/action summaries reported separately as expected authentication/security observability effects. Take the before snapshot **after** the intentional fixture transition, then compare with the after snapshot around denied requests.

The seeded baseline snapshot passed across **245 business tables**, with no sessions. This is evidence that the controller can inspect the isolated database; real signed-cookie, denial and browser outcomes belong to the parent's runtime/browser receipts and are not claimed by fixture preparation.

## Remaining execution and cleanup

The parent builds against the separate empty build clone, serves the real candidate against the seeded full clone and runs the browser worker. No application fixes are owned here. Any application failure remains a qualification finding.

Keep the cluster running until the parent explicitly requests cleanup. Stop only the owned PID/data directory after the app/proxies/browser have stopped. Retain disposable databases and evidence unless separately authorized to delete them. Synthetic credential files remain ignored; retained reports contain no passwords or tokens. No commit, push, production flag change, production migration or deployment is authorized.
