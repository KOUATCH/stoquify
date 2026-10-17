jest.mock("@/services/modules/module-entitlement.service", () => ({ evaluateModuleAccessInTx: jest.fn() }))
import { evaluateModuleAccessInTx } from "@/services/modules/module-entitlement.service"
import { payrollSettlementAuthority } from "../payment-settlement-authority"
const scope = { organizationId: "org", actorId: "actor", sessionId: "session", sessionToken: "private-token" }
function fixture() {
  const actor = { isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, roles: [{ permissions: ["payroll.payments.reconcile"] }] }
  const session = { expiresAt: new Date(Date.now() + 600000), assuranceOrganizationId: "org", assuranceVerifiedAt: new Date(), assuranceLevel: 1, assuranceMethod: "password", assuranceLockedUntil: null }
  return { actor, session, tx: { $queryRaw: jest.fn().mockResolvedValue([{ isolation: "serializable" }]), user: { findFirst: jest.fn().mockResolvedValue(actor) }, session: { findFirst: jest.fn().mockResolvedValue(session) } } }
}
beforeEach(() => { jest.clearAllMocks(); jest.mocked(evaluateModuleAccessInTx).mockResolvedValue({ allowed: true } as never) })
afterEach(() => jest.useRealTimers())
test.each(["sessionId", "sessionToken", "actorId"])("rejects missing %s before database access", async key => {
  const f = fixture()
  await expect(payrollSettlementAuthority(f.tx as never, { ...scope, [key]: undefined }, true)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(f.tx.$queryRaw).not.toHaveBeenCalled()
})
test.each(["inactive", "permission", "session", "expired", "module", "isolation"])("rejects persisted %s denial", async kind => {
  const f = fixture()
  if (kind === "inactive") f.actor.isActive = false
  if (kind === "permission") f.actor.roles = []
  if (kind === "session") f.tx.session.findFirst.mockResolvedValue(null)
  if (kind === "expired") f.session.expiresAt = new Date(0)
  if (kind === "module") jest.mocked(evaluateModuleAccessInTx).mockResolvedValue({ allowed: false } as never)
  if (kind === "isolation") f.tx.$queryRaw.mockResolvedValue([{ isolation: "read committed" }])
  await expect(payrollSettlementAuthority(f.tx as never, scope, true)).rejects.toBeDefined()
})
test.each(["old", "future", "tenant", "method", "level", "locked"])("rejects %s step-up evidence for writes", async kind => {
  const f = fixture()
  if (kind === "old") f.session.assuranceVerifiedAt = new Date(Date.now() - 300001)
  if (kind === "future") f.session.assuranceVerifiedAt = new Date(Date.now() + 60000)
  if (kind === "tenant") f.session.assuranceOrganizationId = "foreign"
  if (kind === "method") f.session.assuranceMethod = "unverified"
  if (kind === "level") f.session.assuranceLevel = 0
  if (kind === "locked") Object.assign(f.session, { assuranceLockedUntil: new Date(Date.now() + 60000) })
  await expect(payrollSettlementAuthority(f.tx as never, scope, true)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
  await expect(payrollSettlementAuthority(f.tx as never, scope, false)).resolves.toBeDefined()
})
test("evaluates time after session lock waits, not from caller-supplied time", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-15T12:00:00Z"))
  const f = fixture()
  f.tx.$queryRaw.mockImplementation(async (sql: TemplateStringsArray) => {
    if (sql.join("").includes("FROM sessions")) jest.setSystemTime(new Date("2026-10-15T12:05:01Z"))
    return [{ isolation: "serializable" }]
  })
  await expect(payrollSettlementAuthority(f.tx as never, scope, true)).rejects.toMatchObject({ code: "FRESH_AUTH_REQUIRED" })
})
test("reads tenant-scoped roles and exact persisted session identity", async () => {
  const f = fixture()
  await expect(payrollSettlementAuthority(f.tx as never, scope, true)).resolves.toMatchObject({ permissions: expect.arrayContaining(["payroll.payments.reconcile"]) })
  expect(f.tx.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "actor", organizationId: "org" }), select: expect.objectContaining({ roles: expect.objectContaining({ where: { organizationId: "org" } }) }) }))
  expect(f.tx.session.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "session", token: "private-token", userId: "actor" } }))
})
