/** @jest-environment node */
import { Prisma } from "@prisma/client"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { receiptLedgerRecoveryAuthority } from "../receipt-ledger-recovery-authority"
jest.mock("server-only", () => ({}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-session" }
const permissions = ["purchases.orders.read", "purchasing.ap.invoice.post"]
function fixture() { return { $queryRaw: jest.fn().mockResolvedValue([]), user: { findFirst: jest.fn().mockResolvedValue({ isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions }] }) }, session: { findFirst: jest.fn().mockResolvedValue({ assuranceOrganizationId: "org", assuranceMethod: "password", assuranceLevel: 1, assuranceVerifiedAt: new Date(), assuranceLockedUntil: null }) } } }
beforeEach(() => { jest.clearAllMocks(); (evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: true }) })
test("requires current finance authority and tenant-bound password assurance", async () => {
  const tx = fixture()
  expect(await receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "submit")).toEqual({ fresh: true })
  expect(evaluateModuleAccessInTx).toHaveBeenCalledWith(tx, expect.objectContaining({ organizationId: "org", userId: "actor", moduleSlug: "purchasing", accessIntent: "write", mode: "enforce" }))
  expect(tx.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "session", userId: "actor", token: scope.sessionToken }) }))
})
test.each(["purchases.orders.read", "purchasing.ap.invoice.post"])("rejects missing %s", async removed => {
  const tx = fixture(); tx.user.findFirst.mockResolvedValue({ ...(await tx.user.findFirst()), roles: [{ permissions: permissions.filter(p => p !== removed) }] })
  await expect(receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "submit")).rejects.toMatchObject({ code: "FORBIDDEN" })
})
test("denied module or read-only write never executes", async () => {
  const tx = fixture(); (evaluateModuleAccessInTx as jest.Mock).mockResolvedValue({ allowed: false, reason: "READ_ONLY" })
  await expect(receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "submit")).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(tx.user.findFirst).not.toHaveBeenCalled()
})
test.each(["expired", "other-tenant", "future", "locked", "wrong-method"])("rejects %s password assurance but permits review with a step-up requirement", async mode => {
  const tx = fixture(), assurance = { ...(await tx.session.findFirst()) }
  if (mode === "expired") assurance.assuranceVerifiedAt = new Date(Date.now() - 300001)
  if (mode === "other-tenant") assurance.assuranceOrganizationId = "other"
  if (mode === "future") assurance.assuranceVerifiedAt = new Date(Date.now() + 60000)
  if (mode === "locked") assurance.assuranceLockedUntil = new Date(Date.now() + 60000) as never
  if (mode === "wrong-method") assurance.assuranceMethod = "session"
  tx.session.findFirst.mockResolvedValue(assurance)
  expect(await receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "review")).toEqual({ fresh: false })
  await expect(receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "submit")).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
})
test("rejects revoked sessions", async () => {
  const tx = fixture(); tx.session.findFirst.mockResolvedValue(null as never)
  await expect(receiptLedgerRecoveryAuthority(tx as unknown as Prisma.TransactionClient, scope, "review")).rejects.toMatchObject({ code: "FORBIDDEN" })
})
