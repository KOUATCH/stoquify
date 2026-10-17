/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { lockCloseEvidenceAcceptanceAuthorityInTx, lockCloseEvidenceWorkAuthorityInTx, lockCloseEvidenceRecipientInTx, type CloseEvidenceAcceptanceAuthorityInput } from "../close-evidence-acceptance-authority.service"

jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {} }))

const NOW = new Date("2026-10-01T12:00:00.000Z")
const later = (milliseconds: number) => new Date(NOW.getTime() + milliseconds)

function fixture(delegated = false) {
  const input: CloseEvidenceAcceptanceAuthorityInput = {
    homeOrganizationId: "home-z", organizationId: delegated ? "client-a" : "home-z",
    actorId: "reviewer", session: { id: "session", token: "private-session-token" },
  }
  const organizationIds = [...new Set([input.homeOrganizationId, input.organizationId])].sort()
  const organizations = organizationIds.map(id => ({ id, isActive: true, deletedAt: null as Date | null, requestedModules: ["accounting", "close_assurance"] }))
  const actor = { id: input.actorId, organizationId: input.homeOrganizationId, isActive: true, isVerified: true, emailVerified: false, isLocked: false, lockedUntil: null as Date | null }
  const roles = [{ id: "home-reviewer-role", organizationId: input.homeOrganizationId, permissions: ["accounting.close.accountant.review"] }]
  const memberships = [{ roleId: roles[0].id }]
  const session = {
    id: "session", token: "private-session-token", userId: input.actorId,
    expiresAt: later(3_600_000), assuranceVerifiedAt: later(-30_000) as Date | null,
    assuranceMethod: "password" as string | null, assuranceOrganizationId: input.homeOrganizationId as string | null,
    assuranceLevel: 1, assuranceLockedUntil: null as Date | null,
  }
  const grant = {
    id: "client-consent", organizationId: input.organizationId, accountantUserId: input.actorId,
    activeScopeKey: `${input.organizationId}:${input.actorId}` as string | null,
    status: "ACTIVE", role: "REVIEWER", effectiveFrom: later(-60_000), expiresAt: later(3_600_000),
    revokedAt: null as Date | null, revokedById: null as string | null,
  }
  const grants = organizationIds.flatMap(organizationId => ["accounting", "close_assurance"].map(moduleSlug => ({
    id: `${organizationId}:${moduleSlug}`, organizationId, moduleSlug, status: "active", source: "manual_override",
    startsAt: null as Date | null, endsAt: null as Date | null, readOnly: false, trial: false,
  })))
  const state = { organizations, actor, roles, memberships, session, grant, grants, managed: true, actorExists: true, sessionExists: true, grantExists: true }
  const tx: any = {
    $queryRaw: jest.fn(async (sql: Prisma.Sql) => {
      const query = sql.text
      if (query.includes('FROM "organizations"')) return state.organizations
      if (query.includes('FROM "tenant_module_')) return []
      if (query.includes('FROM "users"')) return state.actorExists && sql.values[0] === state.actor.id && sql.values[1] === state.actor.organizationId ? [state.actor] : []
      if (query.includes('FROM "roles"')) return state.roles
      if (query.includes('FROM "_UserRoles"')) return state.memberships
      if (query.includes('FROM "sessions"')) return state.sessionExists && sql.values[0] === state.session.id && sql.values[1] === state.session.token && sql.values[2] === state.session.userId ? [state.session] : []
      if (query.includes('FROM "accountant_access_grants"')) return state.grantExists && sql.values[0] === state.grant.organizationId && sql.values[1] === state.grant.accountantUserId && sql.values[2] === state.grant.activeScopeKey ? [state.grant] : []
      throw new Error(`Unexpected authority query: ${query}`)
    }),
    tenantModuleConfiguration: { findUnique: jest.fn(async () => state.managed ? { version: 1 } : null) },
    tenantModuleGrant: { findMany: jest.fn(async ({ where }: { where: { organizationId: string } }) => state.grants.filter(row => row.organizationId === where.organizationId)) },
    tenantModuleConfigurationCommand: { count: jest.fn(async () => 0) },
  }
  return { input, state, tx }
}

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW) })
afterEach(() => jest.useRealTimers())

it("requires current assignment permission in addition to requesting evidence for recipient replacement", async () => {
  const { input, state, tx } = fixture()
  state.roles[0].permissions = ["accounting.close.read", "accounting.close.evidence.request"]
  const replacement = { ...input, operation: "request" as const, requireFindingAssignment: true }
  await expect(lockCloseEvidenceWorkAuthorityInTx(tx, replacement)).rejects.toMatchObject({ code: "FORBIDDEN" })
  state.roles[0].permissions.push("accounting.close.finding.assign")
  await expect(lockCloseEvidenceWorkAuthorityInTx(tx, replacement)).resolves.toBeDefined()
  state.roles[0].permissions = ["accounting.close.read", "accounting.close.finding.assign"]
  await expect(lockCloseEvidenceWorkAuthorityInTx(tx, replacement)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("retains current home review authority using the exact persisted session", async () => {
  const { input, tx } = fixture()
  const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)
  await expect(authority.revalidate(later(1_000))).resolves.toBeUndefined()
  const queries = tx.$queryRaw.mock.calls.map(([sql]: [Prisma.Sql]) => sql)
  expect(queries[0].text).toContain('ORDER BY "id" FOR SHARE')
  expect(queries.find((sql: Prisma.Sql) => sql.text.includes('FROM "sessions"'))?.values).toEqual(["session", "private-session-token", "reviewer"])
  expect(queries.some((sql: Prisma.Sql) => sql.text.includes('FROM "accountant_access_grants"'))).toBe(false)
  expect(Object.keys(authority)).toEqual(["revalidate"])
  expect(JSON.stringify(authority)).not.toContain("private-session-token")
})

it("locks both organizations first in sorted order, then modules, home actor, roles, memberships, session and consent", async () => {
  const { input, tx } = fixture(true)
  await lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)
  const queries: Prisma.Sql[] = tx.$queryRaw.mock.calls.map(([sql]: [Prisma.Sql]) => sql)
  expect(queries[0].values).toEqual(["client-a", "home-z"])
  expect(queries.map(sql => sql.text.match(/FROM "([^"]+)"/)?.[1])).toEqual([
    "organizations", "tenant_module_configurations", "tenant_module_grants",
    "tenant_module_configurations", "tenant_module_grants", "users", "roles", "_UserRoles", "sessions", "accountant_access_grants",
  ])
  expect(queries.every(sql => sql.text.includes("FOR SHARE"))).toBe(true)
  const membership = queries.find(sql => sql.text.includes('FROM "_UserRoles"'))!
  expect(membership.text).toContain('role."organizationId" =')
  expect(membership.values).toEqual(["reviewer", "home-z"])
})

it.each(["REVIEWER", "PREPARER"])("allows delegated %s without target membership or a target session", async role => {
  const { input, state, tx } = fixture(true)
  state.grant.role = role
  // Home accounting read-only is sufficient; target accounting remains writable.
  state.grants.find(row => row.organizationId === "home-z" && row.moduleSlug === "accounting")!.readOnly = true
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).resolves.toEqual({ revalidate: expect.any(Function) })
  expect(tx.$queryRaw.mock.calls.filter(([sql]: [Prisma.Sql]) => sql.text.includes('FROM "users"'))).toHaveLength(1)
})

it.each(["missing", "foreign-role", "revoked-membership", "unassigned-role"])("denies %s persisted review authority", async kind => {
  const { input, state, tx } = fixture()
  if (kind === "missing") state.roles[0].permissions = []
  if (kind === "foreign-role") state.roles[0].organizationId = "foreign"
  if (kind === "revoked-membership") state.memberships.length = 0
  if (kind === "unassigned-role") state.memberships[0].roleId = "other-role"
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("requires the additional audit permission only for the trusted work-desk caller", async () => {
  const { input, state, tx } = fixture()
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).resolves.toBeDefined()
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, { ...input, requireWorkDeskAccess: true })).rejects.toMatchObject({ code: "FORBIDDEN" })
  state.roles[0].permissions.push("accounting.audit.read")
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, { ...input, requireWorkDeskAccess: true })).resolves.toBeDefined()
})

it.each(["missing", "foreign-home", "inactive", "unverified", "locked", "temporarily-locked"])("denies a %s account", async kind => {
  const { input, state, tx } = fixture()
  if (kind === "missing") state.actorExists = false
  if (kind === "foreign-home") state.actor.organizationId = "foreign"
  if (kind === "inactive") state.actor.isActive = false
  if (kind === "unverified") state.actor.isVerified = false
  if (kind === "locked" || kind === "temporarily-locked") state.actor.isLocked = true
  if (kind === "temporarily-locked") state.actor.lockedUntil = later(1_000)
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("preserves canonical email verification and expired account-lock behavior", async () => {
  const { input, state, tx } = fixture()
  Object.assign(state.actor, { isVerified: false, emailVerified: true, isLocked: true, lockedUntil: later(-1) })
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).resolves.toBeDefined()
})

it.each(["home-missing", "home-inactive", "home-deleted", "target-missing", "target-inactive", "target-deleted"])("denies %s organization", async kind => {
  const { input, state, tx } = fixture(true)
  const id = kind.startsWith("home") ? input.homeOrganizationId : input.organizationId
  if (kind.endsWith("missing")) state.organizations = state.organizations.filter(org => org.id !== id)
  else if (kind.endsWith("inactive")) state.organizations.find(org => org.id === id)!.isActive = false
  else state.organizations.find(org => org.id === id)!.deletedAt = NOW
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it.each(["no-proof", "no-token", "wrong-token", "wrong-id", "revoked", "expired", "missing-assurance", "stale", "future", "wrong-home", "wrong-user", "wrong-method", "insufficient-level", "assurance-lock"])("requires fresh authentication for %s session", async kind => {
  const { input, state, tx } = fixture()
  if (kind === "no-proof") input.session = undefined
  if (kind === "no-token") input.session!.token = ""
  if (kind === "wrong-token") input.session!.token = "forged"
  if (kind === "wrong-id") input.session!.id = "other-session"
  if (kind === "revoked") state.sessionExists = false
  if (kind === "expired") state.session.expiresAt = NOW
  if (kind === "missing-assurance") state.session.assuranceVerifiedAt = null
  if (kind === "stale") state.session.assuranceVerifiedAt = later(-300_001)
  if (kind === "future") state.session.assuranceVerifiedAt = later(1)
  if (kind === "wrong-home") state.session.assuranceOrganizationId = "foreign"
  if (kind === "wrong-user") state.session.userId = "foreign"
  if (kind === "wrong-method") state.session.assuranceMethod = "unverified-claim"
  if (kind === "insufficient-level") state.session.assuranceLevel = 0
  if (kind === "assurance-lock") state.session.assuranceLockedUntil = later(1)
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED", status: 403 })
})

it.each(["missing", "revoked-status", "revoked-timestamp", "revoked-actor", "read-only", "foreign-scope", "future", "expired", "invalid-interval"])("denies %s delegated consent", async kind => {
  const { input, state, tx } = fixture(true)
  if (kind === "missing") state.grantExists = false
  if (kind === "revoked-status") state.grant.status = "REVOKED"
  if (kind === "revoked-timestamp") state.grant.revokedAt = NOW
  if (kind === "revoked-actor") state.grant.revokedById = "controller"
  if (kind === "read-only") state.grant.role = "READ_ONLY"
  if (kind === "foreign-scope") state.grant.activeScopeKey = "foreign:reviewer"
  if (kind === "future") state.grant.effectiveFrom = later(1)
  if (kind === "expired") state.grant.expiresAt = NOW
  if (kind === "invalid-interval") state.grant.effectiveFrom = state.grant.expiresAt
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it.each(["explicit-empty", "home-suspended", "target-suspended", "target-read-only", "dependency-suspended", "dependency-read-only", "not-started", "expired", "duplicates"])("enforces persisted module access for %s", async kind => {
  const { input, state, tx } = fixture(true)
  const target = state.grants.find(row => row.organizationId === input.organizationId && row.moduleSlug === "close_assurance")!
  const dependency = state.grants.find(row => row.organizationId === input.organizationId && row.moduleSlug === "accounting")!
  if (kind === "explicit-empty") state.grants.length = 0
  if (kind === "home-suspended") state.grants.find(row => row.organizationId === input.homeOrganizationId && row.moduleSlug === "accounting")!.status = "suspended"
  if (kind === "target-suspended") target.status = "suspended"
  if (kind === "target-read-only") target.status = "read_only"
  if (kind === "dependency-suspended") dependency.status = "suspended"
  if (kind === "dependency-read-only") dependency.readOnly = true
  if (kind === "not-started") target.startsAt = later(1)
  if (kind === "expired") target.endsAt = NOW
  if (kind === "duplicates") state.grants.push({ ...target, id: "duplicate" })
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("preserves genuine legacy module intent but never restores it after a failed read", async () => {
  const { input, state, tx } = fixture()
  state.managed = false
  state.grants.length = 0
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).resolves.toBeDefined()
  tx.tenantModuleGrant.findMany.mockRejectedValue(new Error("database unavailable"))
  await expect(lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)).rejects.toThrow("database unavailable")
})

it.each(["session-expiry", "session-freshness", "consent-expiry", "home-module-expiry", "target-module-expiry", "dependency-expiry"])("rechecks %s after a later business lock wait", async kind => {
  const { input, state, tx } = fixture(true)
  let at = later(2_000)
  if (kind === "session-expiry") state.session.expiresAt = at
  if (kind === "session-freshness") at = later(270_001)
  if (kind === "consent-expiry") state.grant.expiresAt = at
  if (kind === "home-module-expiry") state.grants.find(row => row.organizationId === input.homeOrganizationId && row.moduleSlug === "accounting")!.endsAt = at
  if (kind === "target-module-expiry") state.grants.find(row => row.organizationId === input.organizationId && row.moduleSlug === "close_assurance")!.endsAt = at
  if (kind === "dependency-expiry") state.grants.find(row => row.organizationId === input.organizationId && row.moduleSlug === "accounting")!.endsAt = at
  const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)
  await expect(authority.revalidate(at)).rejects.toMatchObject({ code: kind.startsWith("session") ? "FRESH_AUTH_REQUIRED" : "FORBIDDEN" })
})

it("accepts the precise freshness boundary and rejects invalid publication time", async () => {
  const { input, tx } = fixture()
  const authority = await lockCloseEvidenceAcceptanceAuthorityInTx(tx, input)
  await expect(authority.revalidate(later(270_000))).resolves.toBeUndefined()
  await expect(authority.revalidate(new Date("invalid"))).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
})

describe.each(["request", "respond"] as const)("%s transaction authority", operation => {
  function workFixture() {
    const value = fixture()
    value.state.roles[0].permissions = ["accounting.close.read", operation === "request" ? "accounting.close.evidence.request" : "accounting.close.finding.comment"]
    value.state.session.assuranceVerifiedAt = null
    value.state.session.assuranceLevel = 0
    return { ...value, input: { ...value.input, operation } }
  }
  it("requires a live session without imposing acceptance step-up", async () => {
    const { tx, input } = workFixture()
    const authority = await lockCloseEvidenceWorkAuthorityInTx(tx, input)
    await expect(authority.revalidate(later(600_000))).resolves.toBeUndefined()
  })
  it.each(["permission", "membership", "account", "session", "module"])("denies revoked %s before work", async kind => {
    const { tx, input, state } = workFixture()
    if (kind === "permission") state.roles[0].permissions = ["accounting.close.read"]
    if (kind === "membership") state.memberships.length = 0
    if (kind === "account") state.actor.isActive = false
    if (kind === "session") state.sessionExists = false
    if (kind === "module") state.grants.find(row => row.moduleSlug === "close_assurance")!.readOnly = true
    await expect(lockCloseEvidenceWorkAuthorityInTx(tx, input)).rejects.toMatchObject({ code: kind === "session" ? "AUTH_REQUIRED" : "FORBIDDEN" })
  })
  it.each(["session", "module"])("rejects %s expiry at publication", async kind => {
    const { tx, input, state } = workFixture(), at = later(1000)
    if (kind === "session") state.session.expiresAt = at
    else state.grants.find(row => row.moduleSlug === "close_assurance")!.endsAt = at
    const authority = await lockCloseEvidenceWorkAuthorityInTx(tx, input)
    await expect(authority.revalidate(at)).rejects.toMatchObject({ code: kind === "session" ? "AUTH_REQUIRED" : "FORBIDDEN" })
  })
  it("rejects missing session proof", async () => {
    const { tx, input } = workFixture()
    input.session = undefined
    await expect(lockCloseEvidenceWorkAuthorityInTx(tx, input)).rejects.toMatchObject({ code: "AUTH_REQUIRED" })
    expect(tx.$queryRaw).not.toHaveBeenCalled()
  })
})

describe("new request recipient eligibility", () => {
  function recipientFixture() {
    const value = fixture()
    value.state.roles[0].permissions = ["accounting.close.read", "accounting.close.finding.comment"]
    return { ...value, recipient: { organizationId: value.input.organizationId, recipientId: value.input.actorId } }
  }
  it("locks the scoped account, roles and membership without requiring a recipient session", async () => {
    const { tx, recipient, state } = recipientFixture()
    state.sessionExists = false
    const authority = await lockCloseEvidenceRecipientInTx(tx, recipient)
    expect(() => authority.revalidate(later(1000))).not.toThrow()
    expect(tx.$queryRaw.mock.calls.map(([sql]: [Prisma.Sql]) => sql.text.match(/FROM "([^"]+)"/)?.[1])).toEqual(["users", "roles", "_UserRoles"])
    expect(tx.$queryRaw.mock.calls.every(([sql]: [Prisma.Sql]) => sql.text.includes("FOR SHARE"))).toBe(true)
  })
  it.each(["missing", "foreign-tenant", "inactive", "unverified", "locked", "foreign-role", "unassigned-role", "no-read", "no-comment"])("refuses %s recipient eligibility", async kind => {
    const { tx, recipient, state } = recipientFixture()
    if (kind === "missing") state.actorExists = false
    if (kind === "foreign-tenant") recipient.organizationId = "other"
    if (kind === "inactive") state.actor.isActive = false
    if (kind === "unverified") state.actor.isVerified = false
    if (kind === "locked") state.actor.isLocked = true
    if (kind === "foreign-role") state.roles[0].organizationId = "other"
    if (kind === "unassigned-role") state.memberships.length = 0
    if (kind === "no-read") state.roles[0].permissions = ["accounting.close.finding.comment"]
    if (kind === "no-comment") state.roles[0].permissions = ["accounting.close.read"]
    await expect(lockCloseEvidenceRecipientInTx(tx, recipient)).rejects.toMatchObject({ code: "FORBIDDEN" })
  })
  it("accepts email verification and an elapsed temporary account lock", async () => {
    const { tx, recipient, state } = recipientFixture()
    state.actor.isVerified = false; state.actor.emailVerified = true; state.actor.isLocked = true; state.actor.lockedUntil = later(-1)
    await expect(lockCloseEvidenceRecipientInTx(tx, recipient)).resolves.toBeDefined()
  })
})

it.each(["REVIEWER", "PREPARER"])("retains delegated %s request authority without requiring a target-tenant session", async role => {
  const { tx, input, state } = fixture(true)
  state.roles[0].permissions = ["accounting.close.read", "accounting.close.evidence.request"]
  state.grant.role = role; state.session.assuranceVerifiedAt = null
  await expect(lockCloseEvidenceWorkAuthorityInTx(tx, { ...input, operation: "request" })).resolves.toBeDefined()
})

it("never treats delegated access as recipient response ownership", async () => {
  const { tx, input, state } = fixture(true)
  state.roles[0].permissions = ["accounting.close.read", "accounting.close.finding.comment"]
  await expect(lockCloseEvidenceWorkAuthorityInTx(tx, { ...input, operation: "respond" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.$queryRaw).not.toHaveBeenCalled()
})
