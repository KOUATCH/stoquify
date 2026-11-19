jest.mock("server-only", () => ({}))
// Only a scheduling seam: every call delegates to the actual SQL projection.
jest.mock("../accountant-portfolio-proof.service", () => {
  const actual = jest.requireActual("../accountant-portfolio-proof.service")
  return { ...actual, readAccountantPortfolioProof: jest.fn(actual.readAccountantPortfolioProof) }
})
jest.mock("@/services/events/business-event.service", () => ({
  recordBusinessEventInTx: () => { throw new Error("Portfolio must not publish events") },
}))
jest.mock("@/prisma/db", () => {
  const { PrismaClient } = require("@prisma/client")
  const target = new URL(process.env.AF01_POSTGRES_URL || "")
  if (process.env.RUN_AF01_POSTGRES !== "1" || target.hostname !== "127.0.0.1" ||
      target.port !== "55441" || !/^\/stoquify_local_af01_[a-z0-9_]+$/.test(target.pathname)) {
    throw new Error("AF01 requires an explicitly owned disposable PostgreSQL target")
  }
  return { db: new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [{ emit: "event", level: "query" }] }) }
})

import { Prisma, PrismaClient } from "@prisma/client"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { db } from "@/prisma/db"
import { getAccountantPortfolio } from "../accountant-portfolio.service"
import * as proofService from "../accountant-portfolio-proof.service"
import { deriveCloseCurrentProof } from "../close-assurance-current-proof"
import { applyCloseAssessmentSelection, deriveCloseAssessmentSelection, readCloseAssessmentOrderInTx } from "../close-assessment-order.service"

const writer = new PrismaClient({ datasources: { db: { url: process.env.AF01_POSTGRES_URL! } } })
const actor = { actorId: "af01-actor", homeOrganizationId: "af01-firm", actorPermissions: ["accounting.audit.read"] }
const clients = Array.from({ length: 105 }, (_, i) => "af01-client-" + String(i).padStart(3, "0"))
const grants = clients.map((organizationId, i) => ({ id: "af01-grant-" + String(i).padStart(3, "0"), organizationId,
  accountantUserId: actor.actorId, accountantFirmName: "Synthetic firm", role: "READ_ONLY" as const, activeScopeKey: organizationId + ":" + actor.actorId,
  consentGrantedById: "synthetic-owner", consentEvidenceHash: "sha256:" + "a".repeat(64),
  effectiveFrom: new Date("2020-01-01"), expiresAt: new Date("2099-01-01") }))
const queries: Array<{ query: string; duration: number }> = []
const measurements: Record<string, unknown> = {}
const now = new Date()
const startDate = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
const endDate = new Date(Date.UTC(now.getUTCFullYear(), 11, 31, 23, 59, 59))
const scope = { organizationId: clients[0], periodId: "af01-period", closeRunId: "af01-run" }

beforeAll(async () => {
  ;(db as any).$on("query", (e: { query: string; duration: number }) => queries.push({ query: e.query, duration: e.duration }))
  expect((await db.$queryRaw<Array<{ name: string }>>(Prisma.sql`SELECT current_database() AS name`))[0].name)
    .toBe(new URL(process.env.AF01_POSTGRES_URL!).pathname.slice(1))
  await db.organization.createMany({ data: [actor.homeOrganizationId, ...clients].map(id => ({
    id, name: id, slug: id, requestedModules: ["accounting", "close_assurance"], currency: "XAF",
  })) })
  await db.role.create({ data: { id: "af01-role", organizationId: actor.homeOrganizationId, code: "AF01", nameEn: "Read", permissions: actor.actorPermissions } })
  await db.user.create({ data: { id: actor.actorId, email: "af01@example.invalid", organizationId: actor.homeOrganizationId,
    emailVerified: true, roles: { connect: { id: "af01-role" } } } })
  await db.accountantAccessGrant.createMany({ data: grants })
  await db.fiscalYear.create({ data: { id: "af01-year", organizationId: clients[0], name: "Synthetic", startDate, endDate } })
  await db.accountingPeriod.create({ data: { id: scope.periodId, organizationId: clients[0], fiscalYearId: "af01-year", periodNumber: 1, name: "Synthetic", startDate, endDate } })
  await db.closeRun.create({ data: { id: scope.closeRunId, organizationId: clients[0], periodId: scope.periodId,
    status: "CERTIFIED", readinessScore: 100, asOf: now } })
  await db.closePackExport.create({ data: { ...scope, watermarkId: "af01-watermark", contentHash: "af01-current", isCertified: true } })
}, 60000)

afterAll(async () => {
  if (process.env.AF01_EVIDENCE_DIR) writeFileSync(join(process.env.AF01_EVIDENCE_DIR,
    new URL(process.env.AF01_POSTGRES_URL!).pathname.slice(1) + "-query-evidence.json"), JSON.stringify(measurements, null, 2))
  await Promise.all([db.$disconnect(), writer.$disconnect()])
})

it("traverses 105 actual grants with bounded pages and records query evidence", async () => {
  const ids: string[] = []
  let cursor: string | undefined
  let pageCount = 0
  queries.length = 0
  const began = performance.now()
  do {
    const page = await getAccountantPortfolio(actor, { pageSize: 20, cursor })
    expect(page.page.loadedCount).toBe(page.clients.length)
    expect(page.clients.length).toBeLessThanOrEqual(20)
    ids.push(...page.clients.map(row => row.grant.id))
    cursor = page.page.nextCursor ?? undefined
    pageCount++
  } while (cursor)
  expect(ids).toEqual(grants.map(g => g.id))
  expect(queries.some(q => /^\s*(INSERT|UPDATE|DELETE)/i.test(q.query))).toBe(false)
  measurements.pagination = { clients: ids.length, pages: pageCount, elapsedMs: performance.now() - began,
    queryCount: queries.length, maxQueryMs: Math.max(...queries.map(q => q.duration)),
    readOnly: true, maxClientsPerPage: 20 }
})

it("handles real JSON null/SQL null/stale exports and unsampled adverse evidence", async () => {
  await db.closePackExport.createMany({ data: [
    { ...scope, watermarkId: "af01-json-null", contentHash: "af01-json-null", isCertified: true, metadata: Prisma.JsonNull },
    { ...scope, watermarkId: "af01-stale", contentHash: "af01-stale", isCertified: true, metadata: { staleState: { status: "EVIDENCE_STALE" } } },
  ] })
  await db.closeAssuranceFinding.createMany({ data: Array.from({ length: 121 }, (_, i) => ({
    ...scope, domain: "LEDGER" as const, severity: i === 120 ? "HIGH" as const : "MEDIUM" as const,
    status: "OPEN" as const, title: "Synthetic finding", detail: "Synthetic", sourceService: "AF01",
  })) })
  const result = await db.$transaction(tx => proofService.readAccountantPortfolioProof(tx, clients[0], now), { isolationLevel: "RepeatableRead" })
  const run = await db.closeRun.findFirstOrThrow({ where: { id: scope.closeRunId }, include: {
    findings: true, checklistItems: true, evidenceItems: true, packExports: { where: { isCertified: true } },
  } })
  const order = await db.$transaction(tx => readCloseAssessmentOrderInTx(tx, clients[0], scope.periodId))
  expect(result.currentProof).toEqual(applyCloseAssessmentSelection(deriveCloseCurrentProof(run, now), deriveCloseAssessmentSelection(order, run)))
  expect(result.currentProof?.grade).toBe("blocked")
  expect(result.currentProof?.blockers).toContainEqual(expect.objectContaining({ detail: "121 finding(s) remain unresolved in the selected close runs." }))
  await db.closeAssuranceFinding.updateMany({ where: scope, data: { status: "RESOLVED" } })
})

it("keeps a repeatable snapshot coherent while another connection commits invalidation", async () => {
  const old = await db.$transaction(async tx => {
    await tx.closeRun.findFirstOrThrow({ where: { id: scope.closeRunId } })
    await writer.closeRun.update({ where: { id: scope.closeRunId }, data: { metadata: { staleState: { status: "EVIDENCE_STALE" } } } })
    return proofService.readAccountantPortfolioProof(tx, clients[0], now)
  }, { isolationLevel: "RepeatableRead" })
  const fresh = await db.$transaction(tx => proofService.readAccountantPortfolioProof(tx, clients[0], new Date()), { isolationLevel: "RepeatableRead" })
  expect(old.proofState).toBe("CURRENT")
  expect(old.currentProof?.grade).toBe("certified")
  expect(fresh.proofState).toBe("STALE")
  expect(fresh.currentProof?.grade).toBe("blocked")
  measurements.snapshot = { oldSnapshot: old.proofState, afterCommit: fresh.proofState, independentWriter: true }
})

it("reauthorizes against committed revocation after a client snapshot", async () => {
  const realRead = jest.requireActual("../accountant-portfolio-proof.service").readAccountantPortfolioProof
  const hook = proofService.readAccountantPortfolioProof as jest.Mock
  hook.mockImplementationOnce(async (...args) => {
    const row = await realRead(...args)
    await writer.accountantAccessGrant.update({ where: { id: grants[0].id }, data: { status: "REVOKED", activeScopeKey: null, revokedAt: new Date() } })
    return row
  })
  try {
    const result = await getAccountantPortfolio(actor, { pageSize: 1 })
    expect(result.clients).toEqual([])
    expect(JSON.stringify(result)).not.toContain(clients[0])
    expect(result.page.hasMore).toBe(true)
  } finally { hook.mockImplementation(realRead) }
})

it("omits expired, scheduled, inactive and malformed-scope grants using persisted state", async () => {
  await db.accountantAccessGrant.update({ where: { id: grants[2].id }, data: { expiresAt: new Date("2020-01-01") } })
  await db.accountantAccessGrant.update({ where: { id: grants[3].id }, data: { effectiveFrom: new Date("2098-01-01") } })
  await db.organization.update({ where: { id: clients[4] }, data: { isActive: false } })
  await db.accountantAccessGrant.update({ where: { id: grants[5].id }, data: { activeScopeKey: "malformed-synthetic-scope" } })
  for (const client of clients.slice(2, 6)) {
    const result = await getAccountantPortfolio(actor, { search: client })
    expect(result.clients).toEqual([])
    // Search is the caller's own input; client identity/proof rows stay absent.
    expect(result.clientCount).toBe(0)
  }
})

it("denies persisted module/role loss and rejects a cross-home continuation", async () => {
  const page = await getAccountantPortfolio(actor, { pageSize: 1 })
  await db.organization.update({ where: { id: clients[1] }, data: { requestedModules: ["accounting"] } })
  expect((await getAccountantPortfolio(actor, { pageSize: 1, search: clients[1] })).clients).toEqual([])
  await expect(getAccountantPortfolio({ ...actor, homeOrganizationId: "other" }, { pageSize: 1, cursor: page.page.nextCursor! })).rejects.toThrow()
  await db.role.update({ where: { id: "af01-role" }, data: { permissions: [] } })
  await expect(getAccountantPortfolio(actor)).rejects.toThrow("read access")
})
