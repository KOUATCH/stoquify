const context = { orgId: "tenant", userId: "actor", permissions: ["hris.people.manage"], freshAuth: { claims: { userId: "actor", tenantId: "tenant" } } }, options: any[] = []
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/_shared/protect", () => ({ protect: (config: any, handler: any) => async (input: any) => { options.push(config); return handler(input, context) } }))
jest.mock("@/services/hris/leave-entitlement.service", () => ({ requestLeaveCancellation: jest.fn().mockResolvedValue({}), decideLeaveCancellation: jest.fn().mockResolvedValue({}), executeHrisLeaveEntitlements: jest.fn().mockResolvedValue({}), getManagedLeaveWorkspace: jest.fn().mockResolvedValue({}) }))
jest.mock("@/services/hris/leave-balance.service", () => ({ postHrisLeaveBalanceEntry: jest.fn().mockResolvedValue({}) }))
import { requestLeaveCancellationAction, decideLeaveCancellationAction, executeHrisLeaveEntitlementsAction, getManagedLeaveWorkspaceAction, adjustHrisLeaveBalanceAction } from "../leave-entitlement.actions"
import { requestLeaveCancellation, decideLeaveCancellation, executeHrisLeaveEntitlements, getManagedLeaveWorkspace } from "@/services/hris/leave-entitlement.service"
import { postHrisLeaveBalanceEntry } from "@/services/hris/leave-balance.service"
beforeEach(() => { jest.clearAllMocks(); options.length = 0; context.freshAuth.claims = { userId: "actor", tenantId: "tenant" } })
test.each([[requestLeaveCancellationAction, requestLeaveCancellation, "hris.self_service.request"], [decideLeaveCancellationAction, decideLeaveCancellation, "hris.people.manage"], [executeHrisLeaveEntitlementsAction, executeHrisLeaveEntitlements, "hris.people.manage"], [getManagedLeaveWorkspaceAction, getManagedLeaveWorkspace, "hris.people.manage"]] as const)("protected boundary derives actor, tenant and permissions", async (action, owner, permission) => {
  await action({ organizationId: "forged", actorId: "forged", actorPermissions: ["*"], employeeId: "employee" })
  expect(owner).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "tenant", actorId: "actor", actorPermissions: ["hris.people.manage"] }))
  expect(options[0]).toMatchObject({ permission, freshAuth: true, tenantGuard: "handler-derived", module: { mode: "enforce" } })
})
test("changed fresh session never reaches owner", async () => {
  context.freshAuth.claims.tenantId = "foreign"
  await expect(executeHrisLeaveEntitlementsAction({})).rejects.toThrow("Refresh")
  expect(executeHrisLeaveEntitlements).not.toHaveBeenCalled()
})
test("adjustment binds source type and requires reason", async () => {
  await expect(adjustHrisLeaveBalanceAction({ reason: "short" })).rejects.toThrow("reason")
  await adjustHrisLeaveBalanceAction({ reason: "Reviewed synthetic adjustment", sourceType: "HRIS_LEAVE_SETTLEMENT", entryType: "EXPIRY", idempotencyKey: "stable-key" })
  expect(postHrisLeaveBalanceEntry).toHaveBeenCalledWith(expect.objectContaining({ sourceType: "HRIS_REVIEWED_ADJUSTMENT", entryType: "MANUAL_ADJUSTMENT", sourceId: "stable-key" }))
})
