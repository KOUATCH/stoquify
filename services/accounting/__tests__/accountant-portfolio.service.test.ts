jest.mock("server-only", () => ({}))
jest.mock("@/services/events/business-event.service", () => ({ recordBusinessEventInTx: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("../accountant-portfolio-proof.service", () => ({ readAccountantPortfolioProof: jest.fn() }))
jest.mock("@/prisma/db", () => {
  const db = { firmEngagementGrantLink: { findUnique: jest.fn() }, user: { findFirst: jest.fn() }, accountantAccessGrant: { findFirst: jest.fn(), findMany: jest.fn() }, $transaction: jest.fn() }
  db.$transaction.mockImplementation(cb => cb(db))
  return { db }
})

import { db } from "@/prisma/db"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { readAccountantPortfolioProof } from "../accountant-portfolio-proof.service"
import { getAccountantPortfolio } from "../accountant-access.service"
import { accountantPortfolioInputSchema } from "../accountant-access.schemas"

const mock = db as any
const moduleAccess = observeModuleAccess as jest.Mock
const readProof = readAccountantPortfolioProof as jest.Mock
const actor = { actorId: "accountant", homeOrganizationId: "firm", actorPermissions: ["accounting.audit.read"] }
const grant = (id = "001") => ({
  id, organizationId: "client-" + id, accountantUserId: actor.actorId, accountantFirmName: "Firm",
  accountantFirmRegistrationNumber: null, role: "READ_ONLY", status: "ACTIVE", activeScopeKey: "client-" + id + ":accountant",
  consentGrantedById: "owner", consentGrantedAt: new Date("2020-01-01"), consentEvidenceHash: "sha256:" + "a".repeat(64),
  effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01"),
  revokedById: null, revokedAt: null, revocationReason: null,
  organization: { id: "client-" + id, name: "Private Client " + id, countryCode: "CM", currency: "XAF" },
})
const user = () => ({
  id: actor.actorId, organizationId: "firm", isActive: true, isVerified: true, emailVerified: true,
  isLocked: false, lockedUntil: null, organization: { isActive: true, deletedAt: null },
  roles: [{ organizationId: "firm", permissions: ["accounting.audit.read"] }],
})

describe("accountant portfolio authorization and paging", () => {
  beforeEach(() => {
    jest.resetAllMocks()
    mock.firmEngagementGrantLink.findUnique.mockResolvedValue(null)
    mock.$transaction.mockImplementation((cb: any) => cb(mock))
    mock.user.findFirst.mockImplementation(async () => user())
    moduleAccess.mockResolvedValue({ allowed: true })
    mock.accountantAccessGrant.findMany.mockResolvedValue([grant()])
    mock.accountantAccessGrant.findFirst.mockResolvedValue(grant())
    readProof.mockResolvedValue({ selectedPeriod: null, checkedAt: new Date().toISOString(), assessmentAsOf: null, close: null, currentProof: null, proofState: "NO_PERIOD" })
  })

  it("traverses 105 grants with bounded queries, immutable ordering and page-only counts", async () => {
    const rows = Array.from({ length: 105 }, (_, i) => grant(String(i).padStart(3, "0")))
    mock.accountantAccessGrant.findMany.mockImplementation(async ({ where, take }: any) => rows.filter(r => !where.id || r.id > where.id.gt).slice(0, take))
    mock.accountantAccessGrant.findFirst.mockImplementation(async ({ where }: any) => rows.find(r => r.organizationId === where.organizationId))
    const ids: string[] = []
    let cursor: string | undefined
    do {
      const result = await getAccountantPortfolio(actor, { cursor, pageSize: 20 })
      ids.push(...result.clients.map(c => c.grant.id))
      expect(result.clientCount).toBe(result.clients.length)
      expect(result.page.loadedCount).toBe(result.clientCount)
      expect(result.page.hasMore).toBe(!!result.page.nextCursor)
      cursor = result.page.nextCursor ?? undefined
    } while (cursor)
    expect(ids).toEqual(rows.map(r => r.id))
    expect(new Set(ids).size).toBe(105)
    expect(mock.accountantAccessGrant.findMany).toHaveBeenCalledTimes(6)
    for (const [query] of mock.accountantAccessGrant.findMany.mock.calls) {
      expect(query).toMatchObject({ orderBy: { id: "asc" }, take: 21, where: {
        accountantUserId: actor.actorId, organizationId: { not: "firm" }, status: "ACTIVE",
        effectiveFrom: { lte: expect.any(Date) }, expiresAt: { gt: expect.any(Date) },
        organization: { is: { isActive: true, deletedAt: null } },
      } })
    }
    expect(mock.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  })

  it("accepts read-only mandates and returns no misleading total", async () => {
    const result = await getAccountantPortfolio(actor)
    expect(result.clients[0].grant.role).toBe("READ_ONLY")
    expect(result.page).toMatchObject({ scope: "AUTHORIZED_CLIENTS_IN_GRANT_PAGE", coverage: "END_OF_SCAN" })
    expect(result).not.toHaveProperty("totalCount")
  })

  it.each(["actor", "home", "search", "size", "malformed"])("rejects %s cursor reuse before client reads", async change => {
    mock.accountantAccessGrant.findMany.mockResolvedValue([grant("001"), grant("002")])
    const first = await getAccountantPortfolio(actor, { pageSize: 1 })
    mock.accountantAccessGrant.findMany.mockClear()
    const other = { ...actor, ...(change === "actor" ? { actorId: "other" } : {}), ...(change === "home" ? { homeOrganizationId: "other" } : {}) }
    mock.user.findFirst.mockResolvedValue({ ...user(), roles: [{ organizationId: other.homeOrganizationId, permissions: actor.actorPermissions }] })
    await expect(getAccountantPortfolio(other, {
      cursor: change === "malformed" ? "garbage" : first.page.nextCursor!,
      search: change === "search" ? "other" : "", pageSize: change === "size" ? 2 : 1,
    })).rejects.toThrow("portfolio page")
    expect(mock.accountantAccessGrant.findMany).not.toHaveBeenCalled()
  })

  it("bounds and trims search, scopes its predicate and rejects unknown client IDs", async () => {
    await getAccountantPortfolio(actor, { search: "  Client  " })
    expect(mock.accountantAccessGrant.findMany.mock.calls[0][0].where.organization.is.name).toEqual({ contains: "Client", mode: "insensitive" })
    expect(() => accountantPortfolioInputSchema.parse({ search: "x".repeat(101) })).toThrow()
    expect(() => accountantPortfolioInputSchema.parse({ pageSize: 21 })).toThrow()
    expect(() => accountantPortfolioInputSchema.parse({ clientOrganizationId: "intruder" })).toThrow()
  })

  it.each(["inactive", "locked", "unverified", "role", "foreign-role", "home-module"])("rejects %s actors without returning client metadata", async state => {
    const row = user()
    if (state === "inactive") mock.user.findFirst.mockResolvedValue(null)
    else {
      if (state === "locked") row.isLocked = true
      if (state === "unverified") { row.isVerified = false; row.emailVerified = false }
      if (state === "role") row.roles = []
      if (state === "foreign-role") row.roles[0].organizationId = "other"
      mock.user.findFirst.mockResolvedValue(row)
    }
    if (state === "home-module") moduleAccess.mockResolvedValue({ allowed: false })
    await expect(getAccountantPortfolio(actor)).rejects.toThrow()
    expect(mock.accountantAccessGrant.findMany).not.toHaveBeenCalled()
  })

  it.each(["revoked", "expired", "client-module", "missing-tenant", "replaced"])("redacts %s clients", async reason => {
    if (["revoked", "expired"].includes(reason)) mock.accountantAccessGrant.findFirst.mockResolvedValue(null)
    if (reason === "replaced") mock.accountantAccessGrant.findFirst.mockResolvedValue(grant("other"))
    if (reason === "client-module") moduleAccess.mockImplementation(async ({ organizationId }) => ({ allowed: organizationId === "firm" }))
    if (reason === "missing-tenant") mock.accountantAccessGrant.findFirst.mockRejectedValue(new ForbiddenError("Gone"))
    const result = await getAccountantPortfolio(actor)
    expect(result.clients).toEqual([])
    expect(JSON.stringify(result)).not.toContain("Private Client")
    expect(readProof).not.toHaveBeenCalled()
  })

  it("removes the first client's data when access is revoked during later fan-out", async () => {
    const rows = [grant("001"), grant("002")]
    let revoked = false
    mock.accountantAccessGrant.findMany.mockResolvedValue(rows)
    mock.accountantAccessGrant.findFirst.mockImplementation(async ({ where }: any) => revoked && where.organizationId === "client-001" ? null : rows.find(r => r.organizationId === where.organizationId))
    readProof.mockImplementation(async (_tx, org) => {
      if (org === "client-002") revoked = true
      return { proofState: "NO_PERIOD", selectedPeriod: null, checkedAt: new Date().toISOString(), assessmentAsOf: null, close: null, currentProof: null }
    })
    const result = await getAccountantPortfolio(actor)
    expect(result.clients.map(c => c.client.organizationId)).toEqual(["client-002"])
    expect(JSON.stringify(result)).not.toContain("Private Client 001")
  })

  it("fails the whole response if the home role is revoked after reading", async () => {
    readProof.mockImplementation(async () => { mock.user.findFirst.mockResolvedValue(null); return {} })
    await expect(getAccountantPortfolio(actor)).rejects.toThrow("membership")
  })

  it("preserves continuation through a denied candidate page", async () => {
    mock.accountantAccessGrant.findMany.mockResolvedValue([grant("001"), grant("002")])
    moduleAccess.mockImplementation(async ({ organizationId }) => ({ allowed: organizationId === "firm" }))
    const result = await getAccountantPortfolio(actor, { pageSize: 1 })
    expect(result.clients).toEqual([])
    expect(result.page).toMatchObject({ hasMore: true, coverage: "PARTIAL", loadedCount: 0 })
    expect(result.page.nextCursor).toEqual(expect.any(String))
  })

  it("does not convert operational query failures into healthy empty data", async () => {
    readProof.mockRejectedValue(new Error("database unavailable"))
    await expect(getAccountantPortfolio(actor)).rejects.toThrow("database unavailable")
  })
})
