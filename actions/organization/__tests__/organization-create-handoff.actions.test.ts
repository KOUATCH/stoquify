jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
jest.mock("@/services/organization/organization-settings.service", () => ({ createOrganizationForSettings: jest.fn() }))
import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { revalidatePath } from "next/cache"
import { createOrganizationForSettings } from "@/services/organization/organization-settings.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { createOrganizationSettings } from "../organization-settings-actions"

beforeEach(() => {
  jest.clearAllMocks()
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { userId: "actor", tenantId: "org" } })
  ;(requirePermission as jest.Mock).mockResolvedValue({ userId: "actor", orgId: "org", permissions: ["system.organization.update"] })
  ;(createOrganizationForSettings as jest.Mock).mockRejectedValue(new BusinessRuleError("Use owner registration.", "INVALID_TRANSITION"))
})
it("returns the unavailable transition instead of reporting a created company", async () => {
  await expect(createOrganizationSettings({ name: "Another company" })).resolves.toMatchObject({ success: false, data: null, code: "INVALID_TRANSITION" })
  expect(revalidatePath).not.toHaveBeenCalled()
})
it.each([{ userId: "other", tenantId: "org" }, { userId: "actor", tenantId: "other" }])("rejects disagreement between fresh authentication and current authority", async claims => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims })
  await expect(createOrganizationSettings({ name: "Another company" })).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(createOrganizationForSettings).not.toHaveBeenCalled()
})
it("keeps the existing caller permission boundary", async () => {
  ;(requirePermission as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(createOrganizationSettings({ name: "Another company" })).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(createOrganizationForSettings).not.toHaveBeenCalled()
})
