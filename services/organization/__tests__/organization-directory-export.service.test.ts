jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn() } }))
import { createHash, randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { exportOrganizationDirectory, getOrganizationDirectoryExportPreview } from "../organization-directory-export.service"

const scope = { organizationId: "org-current", actorId: "actor-current" }
const input = { locale: "en" as const, filters: { search: "", status: "all" as const } }
const proof = { id: "session", token: "private-test-token" }
let actor: any, session: any, row: any, total: string, saved: any
const tx = { $queryRaw: jest.fn(), user: { findFirst: jest.fn() }, organization: { findMany: jest.fn() }, payment: { groupBy: jest.fn() }, auditLog: { findFirst: jest.fn(), create: jest.fn() } }
beforeEach(() => {
  jest.resetAllMocks(); saved = null; total = "9007199254740993.25"
  actor = { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions: ["system.organization.read", "reports.export"] }] }
  session = { expiresAt: new Date(Date.now() + 3600000), assuranceVerifiedAt: new Date(), assuranceOrganizationId: scope.organizationId, assuranceMethod: "password", assuranceLevel: 1 }
  row = { id: scope.organizationId, name: ' =SUM(1,2) "Company"', slug: "company", industry: null, country: "CM", state: null, address: null, currency: "XAF", timezone: "UTC", defaultLocale: "EN", isActive: true, updatedAt: new Date("2026-09-01T00:00:00Z"), _count: { users: 1, items: 0, locations: 0, suppliers: 0, customers: 0, purchaseOrders: 0, salesOrders: 0, payments: 2 } }
  ;(db.$transaction as jest.Mock).mockImplementation(callback => callback(tx))
  tx.$queryRaw.mockImplementation(async ([query]) => query.includes("FROM sessions") ? [session] : query.includes("FROM users") ? [actor] : [])
  tx.user.findFirst.mockImplementation(async () => actor)
  tx.organization.findMany.mockImplementation(async ({ where }) => where.id === row.id ? [row] : [])
  tx.payment.groupBy.mockImplementation(async () => [{ organizationId: row.id, _sum: { amount: total } }])
  tx.auditLog.findFirst.mockImplementation(async () => saved)
  tx.auditLog.create.mockImplementation(async ({ data }) => { saved = data; return data })
})
async function command() { const preview = await getOrganizationDirectoryExportPreview(scope, input); return { ...input, expectedHash: preview.snapshotHash, requestId: randomUUID() } }

it("exports the reviewed current tenant, preserves decimal cents and neutralizes formula cells", async () => {
  const file = await exportOrganizationDirectory(scope, await command(), proof)
  const bytes = Buffer.from(file.contentBase64, "base64"), csv = bytes.toString("utf8")
  expect(bytes.subarray(0, 3).toString("hex")).toBe("efbbbf")
  expect(createHash("sha256").update(bytes).digest("hex")).toBe(file.contentHash)
  expect(csv).toContain('"\' =SUM(1,2) ""Company"""'); expect(csv).toContain('"9007199254740993.25"')
  expect(csv).toContain("before subtracting refunds"); expect(csv).toContain(file.auditId)
  expect(saved).toMatchObject({ id: file.auditId, organizationId: scope.organizationId, userId: scope.actorId, action: "CONTROLLED_EXPORT_ALLOWED" })
  expect(JSON.stringify(saved)).not.toContain(proof.token)
  expect(file.replayed).toBe(false)
})
it("replays the same exact file after its underlying data changes, without a second audit", async () => {
  const request = await command(), first = await exportOrganizationDirectory(scope, request, proof)
  row.name = "Changed later"; total = "1.00"
  const replay = await exportOrganizationDirectory(scope, request, proof)
  expect(replay).toEqual({ ...first, replayed: true }); expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
})
it("rejects reuse of a request ID for different filters", async () => {
  const request = await command(); await exportOrganizationDirectory(scope, request, proof)
  await expect(exportOrganizationDirectory(scope, { ...request, filters: { ...input.filters, search: "changed" } }, proof)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(tx.auditLog.create).toHaveBeenCalledTimes(1)
})
it("rejects stale data and never releases an unreviewed replacement", async () => {
  const request = await command(); total = "13.55"
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toMatchObject({ code: "CONFLICT" }); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it.each(["missing", "inactive", "unverified", "permission"])("rejects %s actor authority before export", async condition => {
  const request = await command()
  if (condition === "missing") actor = null
  if (condition === "inactive") actor.isActive = false
  if (condition === "unverified") { actor.emailVerified = false; actor.isVerified = false }
  if (condition === "permission") actor.roles[0].permissions = ["system.organization.read"]
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toMatchObject({ code: "FORBIDDEN" }); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it.each(["expired", "future", "wrong-tenant", "locked", "wrong-method"])("rejects %s fresh-auth proof", async condition => {
  const request = await command()
  if (condition === "expired") session.assuranceVerifiedAt = new Date(Date.now() - 301000)
  if (condition === "future") session.assuranceVerifiedAt = new Date(Date.now() + 60000)
  if (condition === "wrong-tenant") session.assuranceOrganizationId = "org-other"
  if (condition === "locked") session.assuranceLockedUntil = new Date(Date.now() + 60000)
  if (condition === "wrong-method") session.assuranceMethod = "unknown"
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" }); expect(tx.auditLog.create).not.toHaveBeenCalled()
})
it("rechecks current authority before releasing a retained file", async () => {
  const request = await command(); await exportOrganizationDirectory(scope, request, proof); actor.roles = []
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("does not return a file when the audit cannot be written", async () => {
  const request = await command(); tx.auditLog.create.mockRejectedValue(new Error("audit unavailable"))
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toThrow("audit unavailable")
})
it("propagates failed payment queries instead of returning zero rows or a zero balance", async () => {
  tx.payment.groupBy.mockRejectedValue(new Error("payment read unavailable"))
  await expect(getOrganizationDirectoryExportPreview(scope, input)).rejects.toThrow("payment read unavailable")
})
it("rejects a corrupted retained file", async () => {
  const request = await command(); await exportOrganizationDirectory(scope, request, proof); saved.changes.metadata.receipt.contentBase64 = Buffer.from("altered").toString("base64")
  await expect(exportOrganizationDirectory(scope, request, proof)).rejects.toMatchObject({ code: "INTERNAL_ERROR" })
})
it("explains a genuine empty filtered selection and refuses an empty export", async () => {
  const filtered = { ...input, filters: { search: "absent", status: "all" as const } }
  const preview = await getOrganizationDirectoryExportPreview(scope, filtered)
  expect(preview.rowCount).toBe(0)
  await expect(exportOrganizationDirectory(scope, { ...filtered, expectedHash: preview.snapshotHash, requestId: randomUUID() }, proof)).rejects.toMatchObject({ code: "VALIDATION_ERROR" })
})
