jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
jest.mock("@/services/organization/organization-settings.service", () => ({ getOrganizationSettingsForOrg: jest.fn(), updateOrganizationSettingsForOrg: jest.fn(), updateOrganizationCurrencyForOrg: jest.fn(), updateOrganizationTimezoneForOrg: jest.fn(), updateInventoryStartDateForOrg: jest.fn(), updateFiscalYearStartForOrg: jest.fn() }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission, assertCanUseOrganization } from "@/lib/security/rbac"
import { getOrganizationSettings, updateOrganizationSettings, updateOrganizationCurrency, updateOrganizationTimezone, updateInventoryStartDate, updateFiscalYearStart } from "../organization-settings-actions"
import * as service from "@/services/organization/organization-settings.service"
import { ApplicationError, ForbiddenError } from "@/services/_shared/action-errors"
import { revalidatePath } from "next/cache"
const revision = "2026-09-01T00:00:00.000Z"
const identity = { userId: "actor-1", tenantId: "org-1", sessionId: "session-1", sessionToken: "private-test-token" }
const rows = [
  [() => updateOrganizationSettings("org-1", { name: "Changed" }, revision), service.updateOrganizationSettingsForOrg, { name: "Changed" }],
  [() => updateOrganizationCurrency("org-1", "XAF", revision), service.updateOrganizationCurrencyForOrg, "XAF"],
  [() => updateOrganizationTimezone("org-1", "UTC", revision), service.updateOrganizationTimezoneForOrg, "UTC"],
  [() => updateInventoryStartDate("org-1", new Date(revision), revision), service.updateInventoryStartDateForOrg, new Date(revision)],
  [() => updateFiscalYearStart("org-1", "04-01", revision), service.updateFiscalYearStartForOrg, "04-01"],
] as const
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: identity })
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "actor-1", permissions: ["system.organization.read", "system.organization.update"] })
  ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(undefined)
  for (const [, fn] of rows) (fn as jest.Mock).mockResolvedValue({ id: "org-1", updatedAt: new Date() })
})
it.each(rows)("binds update transport to the verified server actor, organization, session and reviewed revision", async (action, fn, data) => {
  const result = await action()
  expect(result.success).toBe(true)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(fn).toHaveBeenCalledWith("org-1", data, { actorUserId: "actor-1", expectedUpdatedAt: revision, session: { id: "session-1", token: identity.sessionToken } })
  expect(JSON.stringify(result)).not.toContain(identity.sessionToken)
})
it.each(["userId", "tenantId"] as const)("rejects a changed %s between fresh authentication and authorization", async field => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { ...identity, [field]: "different" } })
  await expect(updateOrganizationSettings("org-1", { name: "Changed" }, revision)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(service.updateOrganizationSettingsForOrg).not.toHaveBeenCalled(); expect(revalidatePath).not.toHaveBeenCalled()
})
it("rejects a cross-tenant object before reaching the service", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(updateOrganizationSettings("org-other", { name: "Changed" }, revision)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(service.updateOrganizationSettingsForOrg).not.toHaveBeenCalled()
})
it.each(["FRESH_AUTH_REQUIRED", "CONFLICT", "VALIDATION_ERROR"] as const)("retains actionable %s failures across the action boundary", async code => {
  ;(service.updateOrganizationSettingsForOrg as jest.Mock).mockRejectedValueOnce(new ApplicationError(code, "Safe recovery", code === "CONFLICT" ? 409 : 400))
  await expect(updateOrganizationSettings("org-1", { name: "Changed" }, revision)).resolves.toMatchObject({ success: false, code })
  expect(revalidatePath).not.toHaveBeenCalled()
})
it.each([true, false])("derives update affordance from actual read-context permissions: %s", async canUpdate => {
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-1", userId: "actor-1", permissions: canUpdate ? ["system.organization.update"] : ["system.organization.read"] })
  ;(service.getOrganizationSettingsForOrg as jest.Mock).mockResolvedValue({ id: "org-1", name: "Company" })
  await expect(getOrganizationSettings("org-1")).resolves.toMatchObject({ success: true, data: { id: "org-1", canUpdate } })
})
