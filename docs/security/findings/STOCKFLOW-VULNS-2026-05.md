# StockFlow security findings — 2026-05-22

**Source**: This file captures findings produced by an audit subagent during a separate skill-evaluation session on 2026-05-22. The agent was meant to audit a synthetic project but instead read the real StockFlow codebase and produced these findings. They are presented here as-is for your review and triage — not as a polished audit, but as a high-signal handoff worth not losing.

**Context this was produced in**: Multi-tenant SaaS context, Next.js 15 + Prisma 6, ~50 paying orgs, 6 months live, pre-funding milestone. All file paths and line numbers below were cited by the agent against the live codebase; verify each before fixing.

## Reality vs. self-described state (flagged by the agent)

| You said | What the agent found in the repo | Where |
|---|---|---|
| "Auth.js v5" | `next-auth@4.24.11` | `package.json:85` |
| "Sessions are DB-backed" | `session.strategy = "jwt"` | `lib/auth.ts:37` |
| "User.role enum 'admin'/'member'/'viewer'" | No `User.role` column. `Role` m2m model with `permissions String[]` instead | `prisma/schema.prisma:85-185` |
| `if (user.role !== 'admin')` scattered through actions | Couldn't find that pattern in `actions/`. Real pattern is mostly **no permission check at all** | grep `user.role` → 0 hits |
| "No rate limiting anywhere" | Rate limiting exists in middleware but is **in-memory** (per-instance `Map`) — broken on Vercel/serverless | `lib/security/rate-limit.ts:19-79` |
| "Next.js 14" | Next.js 15.1.4 + React 19 | `package.json:84,90` |

> The authz problem is worse than described: almost no permission checks in server actions, and several actions accept `organizationId` straight from the client — that's the cross-tenant leak made concrete.

---

## P0 — Critical (exploitable now, fix before anything else)

### SEC-001 — `createInvitedUser` accepts orgId+roleId from client → account takeover of any org

**Files**: `actions/users/createInvitedUser.ts:14-46`, `prisma/schema.prisma` (Invite model)
**Effort**: S (4–6 hours)

The server action accepts `organizationId` and `roleId` directly from the client and creates a verified admin user in that org. No invite-token verification.

```ts
export async function createInvitedUser(data: InvitedUserProps) {
  const { email, password, ..., organizationId, roleId, organizationName } = data;
  // No auth check. No verification that this email was invited.
  // No verification that roleId belongs to organizationId.
  const newUser = await tx.user.create({
    data: {
      email, password: hashedPassword, ...,
      organizationId,                          // ← from client
      isVerified: true,                        // ← unconditionally
      roles: { connect: { id: roleId } },      // ← from client
    },
  });
}
```

**Attack**: Open devtools, call `createInvitedUser` with `{ email: "attacker@evil.com", password: "...", organizationId: "<any-org-id>", roleId: "<that-org's-admin-role-id>" }`. Now you're a verified admin in someone else's tenant.

**Fix**:
1. Add a `token` column to `Invite` (random 32-byte hex).
2. Invite redemption looks up the row by token only; resolves `organizationId`, `roleId`, `email` server-side. Reject if expired or used.
3. Token is single-use, time-bounded (24h).

---

### SEC-002 — Invite link puts roleId in URL query → recipient self-promotes to admin

**Files**: `actions/users/sendInvite.ts:54-56`
**Effort**: S (combined with SEC-001)

```ts
const linkUrl = `${baseUrl}/user-invite/${(await authUser).organizationId}?roleId=${roleId}&&email=${email}&&organizationName=${(await authUser).organizationName}`
```

The `roleId` is clear-text in the URL and the accepting code (SEC-001) trusts it. Changing `roleId` to the admin role ID escalates privileges. Also note the `&&` instead of `&` is a query-string bug; benign today only because consuming code reads `roleId` first.

**Fix**: Replace with `${baseUrl}/user-invite/<opaque-token>`. All invite metadata resolved server-side from the DB.

---

### SEC-003 — `getAllUsers()` returns every user across every tenant when called with no args

**Files**: `actions/users/getAllUsers.ts:23-36`
**Effort**: S (1–2 hours)

```ts
export async function getAllUsers(organizationId?: string) {
  const users = await db.user.findMany({
    where: organizationId ? { organizationId } : undefined,  // ← undefined → all rows
    orderBy: { createdAt: "desc" },
    take: USER_FETCH_CAP,                                    // 200 users from across all orgs
    include: { roles: true },
  })
  return users
}
```

A `"use server"` action — any authenticated user can invoke it with no arguments and get a 200-user cross-tenant dump including hashed passwords, emails, phones, and role attachments.

**Fix**:
1. Remove the `organizationId` parameter; derive from `requireOrg()`.
2. Add permission check (`users.read`).
3. Audit-log the call.
4. Use a DTO that strips `password`, `verificationToken`, `lockedUntil`, `failedLoginAttempts`.

**Bonus sweep**: any server action whose first arg is a tenant ID with a `?` is suspicious. Grep: `^export.*async.*organizationId\?:` in `actions/`.

---

### SEC-004 — `/api/v1/organisations/[id]/items` doesn't verify caller belongs to `[id]`

**Files**: `app/api/v1/organisations/[id]/items/route.ts:6-23`; `app/api/v1/organisations/[id]/briefItems/route.ts` (likely same)
**Effort**: S

```ts
export async function GET(request, { params }) {
  await requireApiSession()
  const { id: orgId } = await params          // ← from URL, not session
  const result = await ItemService.listItems(orgId, { page, pageSize, search })
}
```

`requireApiSession()` (`lib/api/guard.ts:11-16`) confirms authentication but does NOT compare `session.organizationId` to the URL param.

**Fix**:
```ts
const session = await requireApiSession()
const { id: orgId } = await params
if (session.organizationId !== orgId) throw new ApiError("Forbidden", 403)
```

Or drop the `[id]` segment entirely — make it `/api/v1/items` and resolve org from the session.

---

### SEC-005 — POS session/terminal/station actions trust client orgId + userId

**Files**: `actions/pos-session-actions.ts:24-31, 56-80`; likely `actions/pos-terminal-actions.ts`, `actions/pos-station-actions.ts`
**Effort**: M (2–3 days; POS has several entry points)

```ts
export interface OpenSessionData {
  terminalId: string
  userId: string                  // ← from client
  locationId: string
  organizationId: string          // ← from client
  openingBalance: number
}

export async function openPosSession(data: OpenSessionData) {
  const terminal = await db.pOSStation.findUnique({
    where: { id: data.terminalId },  // ← no orgId filter
  })
}
```

This is the **money path**. Cross-tenant cash-drawer manipulation is possible.

**Fix**:
1. Drop `organizationId` and `userId` from `OpenSessionData`; derive from `requireOrg()`.
2. Terminal lookup: `db.pOSStation.findFirst({ where: { id: data.terminalId, organizationId: ctx.orgId } })`.
3. Same for location, payment methods, items.
4. Permission check `pos.session.open`.
5. Audit-log open/close via `recordAuditEvent`.

---

### SEC-006 — New-org signup connects user to *some other org's* Admin role

**Files**: `actions/users/createUser.ts:68-82`; `prisma/schema.prisma:182` (the `@@unique([organizationId, code])` constraint)
**Effort**: S (1 hour)

```ts
let defaultRole = await tx.role.findFirst({
  where: { name: ADMIN_USER_ROLE.name },   // ← no organizationId filter
});

if (!defaultRole) {
  defaultRole = await tx.role.create({
    data: { ...ADMIN_USER_ROLE, code: "", organizationId: org.id },
  });
}
// ... newUser created with roles: { connect: { id: defaultRole.id } }
```

`findFirst` returns the first match across all orgs — typically the first org ever created. New users in later orgs inherit org A's admin permissions. Also `code: ""` will collide with the next org's signup via the unique constraint.

Bonus issue: `isVerified: true` set unconditionally here, while `lib/auth.ts:259` enforces `existingUser.isVerified` for credentials login.

**Fix**:
1. Signup transaction creates the org → creates the org's admin role with `code: "admin"` → connects the user. No findFirst.
2. `isVerified` defaults to `false`; flips only after OTP confirmation.
3. Move the default admin permission set to `config/permissions.ts` (the `adminPermissions` const already there).

---

### SEC-007 — `listAllItems` returns hardcoded mock data in production

**Files**: `actions/item/listAllItems.ts:29-63`
**Effort**: S

```ts
const mockItems: ItemWithRelations[] = [
  { id: "1", name: "Sample Item 1", sku: "ITEM-001", ..., organizationId: "org-1", ... },
  { id: "2", name: "Sample Item 2", ..., organizationId: "org-1", ... },
  { id: "3", name: "Premium Widget", ..., organizationId: "org-1", ... },
]

export const listAllItems = async (organizationId: string, q?: string, page = 1, pageSize = 25) => {
  let filteredItems = mockItems.filter((item) => item.organizationId === organizationId)
}
```

A `"use server"` action shipping fake items to UI.

**Fix**:
1. `git grep listAllItems` — find all callers.
2. Replace with the real implementation (likely `actions/itemsShow/getOrgItems.ts`).
3. Delete `actions/item/listAllItems.ts`.
4. Add a CI grep check: server-action files must not contain literal arrays of "Sample"/"Mock" data.

**Bonus**: grep `mockItems|Sample Item|fakeUser|TEST_` across `actions/` and `services/`.

---

## P1 — High (fix this month)

### AUTHZ-010 — Org-scoped Prisma extension (defense in depth)

**Effort**: M (3–5 days)

Build a Prisma client extension that injects `organizationId` into every `findMany`, `findFirst`, `update`, `delete`, `count` for tenant-scoped models. Use `AsyncLocalStorage` to thread orgId per request without changing every call site. Keep an explicit `dbRaw` for legitimate cross-tenant queries (admin tools, jobs).

```ts
db.$extends({
  query: {
    $allModels: {
      async findMany({ args, query, model }) {
        const ctx = getAsyncLocalContext()
        if (TENANT_MODELS.has(model) && ctx?.orgId) {
          args.where = { ...args.where, organizationId: ctx.orgId }
        }
        return query(args)
      },
      // ... same for findFirst, findUnique, count, update, delete, etc.
    },
  },
})
```

After this lands, future cross-tenant bugs are caught at the query layer.

**Risk**: `AsyncLocalStorage` doesn't always survive stream boundaries — test with `lib/inngest/functions/*`. Don't apply to `User` / `Account` / `Session` (need cross-tenant for OAuth).

---

### AUTHZ-011 — Wrap every server action in `protect({ permission })`

**Effort**: L (1–2 weeks across ~107 action files)

You have `lib/permissions.ts` with `can()`. Almost nothing uses it. Sampled findings:
- `actions/roles/createRole.ts:13-71` — calls `getAuthenticatedUser()` but no permission check.
- `actions/users/deleteUser.ts:1-65` — uses `requireOrg()` but no permission check.
- `actions/customers/deleteCustomer.ts`, `actions/suppliers/deleteSupplier.ts` — likely same pattern.

Build:
```ts
// services/_shared/protect.ts
export function protect<TInput, TOutput>(
  options: { permission: Action; rateLimit?: string },
  handler: (ctx: AuthedContext, input: TInput) => Promise<TOutput>,
): (input: TInput) => Promise<ActionResponse<TOutput>> {
  return async (input) => {
    const ctx = await requireOrg()
    if (!can(ctx.user, options.permission)) {
      await logSecurityEvent({ type: 'PERMISSION_DENIED', userId: ctx.userId, organizationId: ctx.orgId, resource: options.permission })
      return err('Forbidden')
    }
    return ok(await handler(ctx, input))
  }
}
```

Roll out: pilot `actions/users/*` and `actions/roles/*` first. Add an ESLint rule that flags `"use server"` files not importing `protect`.

**Pre-rollout**: audit `Role.permissions` data on the 50 prod orgs; likely need a backfill granting existing admins `*` so nobody is locked out.

---

### AUTHZ-012 — Pick ONE permission notation

**Files**: `middleware.ts:61-110`, `config/permissions.ts`, `lib/permissions.ts:31-67`
**Effort**: S

Two permission string conventions coexist:
- Dot-style: `"items.read"` — in `middleware.ts` and `config/permissions.ts`.
- Colon-style + normaliser: `"item:read"` → normalised to `"items.read"` — in `lib/permissions.ts`.

The normaliser pluralises naively: `"category:read"` → `"categorys.read"` (wrong). If a seed wrote `"categories.read"`, the check silently fails.

```ts
// lib/permissions.ts:36
const plural = entity.endsWith("s") ? entity : `${entity}s`  // "categorys", "boxs", "personas"
```

**Fix**: Pick dot-style as canonical. Remove the normaliser. Centralise the permission catalog as a `const` union type. Migrate `Role.permissions` arrays via a script audit.

---

### SEC-020 — Replace in-memory rate limiter with Upstash Redis

**Files**: `lib/security/rate-limit.ts:19-79`, used in `middleware.ts`
**Effort**: S

Current limiter stores state in a `Map` per module instance. On serverless edge runtimes, state is per-edge-region and resets on cold start. Effectively non-functional.

```bash
npm i @upstash/ratelimit @upstash/redis
```

```ts
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

export const authRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  prefix: "rl:auth",
})
```

Add `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` to `lib/env.ts`. **Fail open on Redis outage with a logged warning** — don't lock everyone out if Upstash dies. Free tier covers 10k commands/day, plenty for 50 orgs.

---

### SEC-021 — Tighten CSP: drop `unsafe-inline` and `unsafe-eval`

**Files**: `next.config.ts:38`, `middleware.ts:164-173`
**Effort**: M

Current: `"script-src 'self' 'unsafe-inline' 'unsafe-eval'"` and `"style-src 'self' 'unsafe-inline'"`. Defeats the purpose of CSP.

**Fix**:
1. Nonce-based CSP — Next.js 15 supports it. Generate nonce in middleware, set on `<script>`/`<style>` via `nonce` prop.
2. Audit what needs `unsafe-eval` (likely a charting/animation lib — recharts, framer-motion). Remove if possible.
3. Validate final policy at <https://csp-evaluator.withgoogle.com>.

---

### REL-030 — `/api/ready` doesn't touch the DB

**Files**: `app/api/health/route.ts:16-26`, `/api/ready` referenced at `middleware.ts publicRoutes:43`
**Effort**: S (30 min)

`/api/health` correctly returns 200 always (liveness). `/api/ready` likely does the same but should ping the DB:

```ts
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'db' }, { status: 503 })
  }
}
```

Add to uptime monitor.

---

### REL-031 — Audit + security-event writes silently swallow errors

**Files**: `lib/audit/record-event.ts`, `lib/security/audit-log.ts:1-50`
**Effort**: S

The "audit writes never throw" pattern is correct, but failures currently have no escape valve.

**Fix**:
1. On `recordAuditEvent` failure → `logger.error({ err, event })` + Sentry counter.
2. Inngest job `audit-log/integrity-check`: count AuditLog rows daily; alert if drop > 50% vs previous day.
3. For LOGIN_BLOCKED, ROLE_CHANGE, ADMIN_ACTION → `logger.fatal` on write failure; page someone.

---

## P2 — Medium (pre-funding polish)

- **TEST-040** — Integration tests with `@testcontainers/postgresql`. Current `vitest.config.ts:1-17` only covers `services/**`. Add cross-tenant baseline tests (each tenant-scoped action → seed 2 orgs → assert no leak).
- **TEST-041** — Playwright smoke E2E (~10 specs: signup, signin, invite/redeem, item CRUD, POS sale, locale switch, signout). Run against per-PR Vercel preview.
- **OBS-050** — Sentry has no user/org tags. Add `beforeSend` in `sentry.server.config.ts` reading AsyncLocalStorage context. Pipe Pino errors via `@sentry/pino`.
- **OBS-051** — Request-ID correlation. Middleware → AsyncLocalStorage → child logger + `recordAuditEvent` + Sentry tag.
- **DX-060** — `.env.example` is stale vs `lib/env.ts`. Stale vars: `AUTH_SECRET` (should be `NEXTAUTH_SECRET`), `EMAIL_SERVER_*` (Resend is the email provider), `REDIS_URL` (not validated), `JWT_EXPIRATION` (hardcoded in `lib/auth.ts:38`), `ARGON2_*` (hardcoded in `password-utils.ts:54-57`), `TWO_FACTOR_*` (2FA not implemented). Also delete the third copy: `.example.env`.
- **DX-061** — Typo'd dependencies in `package.json:68, 80, 126`: `add`, `init`, `or`. Run `npm uninstall add init or`. Also document Argon2id as the only password hashing path.
- **ARCH-070** — 107 action files with duplicates: `updatTaxRateById` (typo) vs `updateTaxRateByIdNew`; `newUpdateCategoryById` vs `updateCategoryById`; `newLocationUpdateById` vs `updateLocationById`; `listAllItems` (mock) vs `getOrgItems` (real); 4 user-list variants. Plus `services/`, `actions/`, `lib/actions/` all exist as homes for business logic. Pick one. Add `docs/architecture/where-does-code-go.md`.
- **CI-080** — No `.github/workflows/` in repo despite "CI runs" claim. Add `ci.yml` with install → prisma generate → lint → tsc → test → security:check, plus integration job with Postgres service. Configure required status checks on `main`.

## P3 — Low

- **DOC-090** — One-page `docs/runbook.md`: deploy procedure, DB-down/Sentry-down/OAuth-down playbooks, SAR/GDPR export process, severity definitions, post-mortem template. Funding due diligence will ask.

---

## Recommended order

1. **Security sprint** (1–2 days): SEC-001, SEC-002, SEC-003, SEC-006, SEC-007 in one branch.
2. **POS hardening**: SEC-005. Money path.
3. **AUTHZ-010** (Prisma extension). After this, cross-tenant bugs are caught at the query layer.
4. **SEC-020** (Upstash Redis, free tier).
5. **AUTHZ-011** (`protect()` rollout — the long grind).

Total cost for everything listed: Upstash free tier, Testcontainers free, existing Sentry/Resend/Inngest. Well under $50/mo.

## Deliberately not proposed

- Replacing Auth.js (you said no, code works).
- Replacing Prisma with Drizzle (you said no).
- RBAC rewrite — the schema is fine, enforcement is the problem.
- Microservices / GraphQL / API gateway. 50 orgs in. Stay boring.
