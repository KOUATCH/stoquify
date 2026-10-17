jest.mock("server-only", () => ({}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
import { Prisma } from "@prisma/client"
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { paymentReconciliationAuthority } from "../payment-reconciliation-authority"

const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "opaque-token" }
const read = ["payments.reconciliation.read", "accounting.journal.read"], resolve = [...read, "payments.reconciliation.exception.resolve"], decide = [...resolve, "payments.reconciliation.sign"]
function fixture(permissions = decide) {
  const actor = { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions }] }
  const session = { assuranceOrganizationId: "org", assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: "password", assuranceLockedUntil: null }
  const order: string[] = []
  const tx = { $queryRaw: jest.fn(async (sql: TemplateStringsArray) => { order.push(sql.join("?")); return [] }), user: { findFirst: jest.fn(async () => actor) }, session: { findFirst: jest.fn(async () => session) } }
  return { actor, session, order, tx, client: tx as unknown as Prisma.TransactionClient }
}
beforeEach(() => { jest.clearAllMocks(); jest.mocked(evaluateModuleAccessInTx).mockResolvedValue({ allowed: true } as never) })
it("checks persisted module admission before identity locks and requires both financial read permissions", async () => {
  const f = fixture(read)
  await expect(paymentReconciliationAuthority(f.client, scope, "read", false)).resolves.toMatchObject({ fresh: true })
  expect(jest.mocked(evaluateModuleAccessInTx).mock.invocationCallOrder[0]).toBeLessThan(f.tx.$queryRaw.mock.invocationCallOrder[0])
  expect(jest.mocked(evaluateModuleAccessInTx).mock.calls.map(call => call[1])).toEqual(expect.arrayContaining([expect.objectContaining({ moduleSlug: "payment_reconciliation", accessIntent: "read", mode: "enforce" }), expect.objectContaining({ moduleSlug: "purchasing", accessIntent: "read", mode: "enforce" })]))
  expect(f.tx.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "session", token: "opaque-token", userId: "actor" }) }))
})
it("denies an unavailable commercial grant before touching actor/source state", async () => {
  const f = fixture(); jest.mocked(evaluateModuleAccessInTx).mockResolvedValue({ allowed: false } as never)
  await expect(paymentReconciliationAuthority(f.client, scope, "propose", true)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(f.tx.user.findFirst).not.toHaveBeenCalled()
})
it("sign permission alone cannot resolve a supplier obligation", async () => {
  const f = fixture([...read, "payments.reconciliation.sign"])
  await expect(paymentReconciliationAuthority(f.client, scope, "decide", true)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("a resolver may propose, while approval requires additional current sign authority", async () => {
  const f = fixture(resolve)
  await expect(paymentReconciliationAuthority(f.client, scope, "propose", true)).resolves.toBeDefined()
  await expect(paymentReconciliationAuthority(f.client, scope, "decide", true)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it.each(["other organization", "stale", "future", "wrong method", "locked"])("refuses %s assurance for a write", async failure => {
  const f = fixture()
  if (failure === "other organization") f.session.assuranceOrganizationId = "foreign"
  if (failure === "stale") f.session.assuranceVerifiedAt = new Date(Date.now() - 300001)
  if (failure === "future") f.session.assuranceVerifiedAt = new Date(Date.now() + 60000)
  if (failure === "wrong method") f.session.assuranceMethod = "oauth"
  if (failure === "locked") Object.assign(f.session, { assuranceLockedUntil: new Date(Date.now() + 60000) })
  await expect(paymentReconciliationAuthority(f.client, scope, "decide", true)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
})
it("checks actual time after the session lock wait", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-01T10:00:00Z"))
  try {
    const f = fixture(); f.session.assuranceVerifiedAt = new Date(Date.now() - 299000)
    f.tx.$queryRaw.mockImplementation(async sql => { if (sql.join("").includes("sessions")) jest.setSystemTime(Date.now() + 2000); return [] })
    await expect(paymentReconciliationAuthority(f.client, scope, "decide", true)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  } finally { jest.useRealTimers() }
})
