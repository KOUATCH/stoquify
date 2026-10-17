jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ SESSION_ASSURANCE_LEVEL: { PASSWORD: 1 } }))
jest.mock("@/services/_shared/protect", () => {
  const state = { context: {} as any, policies: [] as any[] }
  return { state, protect: (policy: unknown, handler: Function) => { state.policies.push(policy); return (input: unknown) => handler(input, state.context) } }
})
jest.mock("@/services/accounting/accounting-settings.service", () => ({}))
jest.mock("@/services/accounting/control-center.service", () => ({}))
jest.mock("@/services/accounting/journals.service", () => ({}))
jest.mock("@/services/accounting/periods.service", () => ({ closeAccountingPeriod: jest.fn() }))
jest.mock("@/services/accounting/period-control.service", () => ({ ...jest.requireActual("@/services/accounting/period-control.service"), reopenAccountingPeriod: jest.fn() }))
import { closeAccountingPeriodAction, reopenAccountingPeriodAction } from "@/actions/accounting/settings.actions"
import { closeAccountingPeriod } from "@/services/accounting/periods.service"
import { reopenAccountingPeriod } from "@/services/accounting/period-control.service"
const state = jest.requireMock("@/services/_shared/protect").state
const input = { periodId: "period", expectedVersion: 1, reason: "Record omitted invoice", idempotencyKey: "reopen-1" }
beforeEach(() => {
  jest.clearAllMocks()
  const time = new Date()
  state.context = { orgId: "server-org", userId: "server-user", permissions: ["accounting.period.reopen"], freshAuth: { lastAuthAt: time, claims: { userId: "server-user", tenantId: "server-org", assuranceOrganizationId: "server-org", assuranceLevel: 1, lastAuthAt: +time } } }
})
it("registers explicit permissions and fresh authentication for both transitions", () => {
  for (const permission of ["accounting.period.close", "accounting.period.reopen"]) expect(state.policies).toEqual(expect.arrayContaining([expect.objectContaining({ permission, freshAuth: { maxAgeSeconds: 300 } })]))
})
it("passes the server-owned assurance timestamp, actor and organization", async () => {
  await reopenAccountingPeriodAction(input)
  expect(reopenAccountingPeriod).toHaveBeenCalledWith(input, expect.objectContaining({ organizationId: "server-org", actorId: "server-user", lastAuthAt: state.context.freshAuth.lastAuthAt }))
  await closeAccountingPeriodAction({ periodId: "period", expectedVersion: 1 })
  expect(closeAccountingPeriod).toHaveBeenCalledWith("server-org", "period", "server-user", expect.objectContaining({ expectedVersion: 1, lastAuthAt: state.context.freshAuth.lastAuthAt }))
})
it.each(["missing", "user", "tenant", "assurance", "timestamp"])("rejects %s assurance before mutation", async kind => {
  if (kind === "missing") state.context.freshAuth = undefined
  else state.context.freshAuth.claims[{ user: "userId", tenant: "tenantId", assurance: "assuranceOrganizationId", timestamp: "lastAuthAt" }[kind]!] = "foreign"
  await expect(reopenAccountingPeriodAction(input)).rejects.toThrow("Fresh")
  await expect(closeAccountingPeriodAction({ periodId: "period", expectedVersion: 1 })).rejects.toThrow("Fresh")
  expect(reopenAccountingPeriod).not.toHaveBeenCalled()
  expect(closeAccountingPeriod).not.toHaveBeenCalled()
})
it("rejects client authority, missing version and missing reopening reason", async () => {
  await expect(reopenAccountingPeriodAction({ ...input, actorId: "other" })).rejects.toThrow()
  await expect(reopenAccountingPeriodAction({ ...input, reason: "" })).rejects.toThrow()
  await expect(closeAccountingPeriodAction({ periodId: "period" })).rejects.toThrow()
  expect(reopenAccountingPeriod).not.toHaveBeenCalled()
  expect(closeAccountingPeriod).not.toHaveBeenCalled()
})
