jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/rbac", () => ({ requireAllPermissions: jest.fn(), assertCanUseOrganization: jest.fn() }))
jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/organization/organization-directory-export.service", () => ({ getOrganizationDirectoryExportPreview: jest.fn(), exportOrganizationDirectory: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn(), warn: jest.fn() } }))
import { requireAllPermissions, assertCanUseOrganization } from "@/lib/security/rbac"
import { requireFreshAuth } from "@/lib/security/auth-session"
import * as service from "@/services/organization/organization-directory-export.service"
import { exportOrganizationDirectoryAction, getOrganizationDirectoryExportPreviewAction } from "../organization-directory-export.actions"
import { ForbiddenError, ApplicationError } from "@/services/_shared/action-errors"
const input = { locale: "en" as const, filters: { search: "", status: "all" as const }, expectedHash: "a".repeat(64), requestId: "e1d8c7ce-79b0-4998-8590-866fc5c0727d" }
const claims = { userId: "actor", tenantId: "org", sessionId: "session", sessionToken: "private-proof" }
beforeEach(() => {
  jest.resetAllMocks()
  ;(requireAllPermissions as jest.Mock).mockResolvedValue({ orgId: "org", userId: "actor", permissions: ["system.organization.read", "reports.export"] })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims })
  ;(service.exportOrganizationDirectory as jest.Mock).mockResolvedValue({ auditId: "issued-export" })
  ;(service.getOrganizationDirectoryExportPreview as jest.Mock).mockResolvedValue({ rowCount: 1 })
})
it("binds export identity and freshness to current server claims", async () => {
  await expect(exportOrganizationDirectoryAction("org", input)).resolves.toMatchObject({ success: true, data: { auditId: "issued-export" } })
  expect(requireAllPermissions).toHaveBeenCalledWith(["system.organization.read", "reports.export"], expect.anything())
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(service.exportOrganizationDirectory).toHaveBeenCalledWith({ organizationId: "org", actorId: "actor" }, input, { id: "session", token: "private-proof" })
})
it.each(["userId", "tenantId"])("rejects changed %s between guards", async field => {
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { ...claims, [field]: "different" } })
  await expect(exportOrganizationDirectoryAction("org", input)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(service.exportOrganizationDirectory).not.toHaveBeenCalled()
})
it.each([exportOrganizationDirectoryAction, getOrganizationDirectoryExportPreviewAction])("rejects foreign organization before service read", async action => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new ForbiddenError())
  await expect(action("foreign", input)).resolves.toMatchObject({ success: false, code: "FORBIDDEN" })
  expect(service.exportOrganizationDirectory).not.toHaveBeenCalled(); expect(service.getOrganizationDirectoryExportPreview).not.toHaveBeenCalled()
})
it.each(["FRESH_AUTH_REQUIRED", "CONFLICT", "IDEMPOTENCY_CONFLICT"])("retains the actionable %s code", async code => {
  ;(service.exportOrganizationDirectory as jest.Mock).mockRejectedValue(new ApplicationError(code as any, "Safe message", 409))
  await expect(exportOrganizationDirectoryAction("org", input)).resolves.toMatchObject({ success: false, code })
})
it("does not turn a failed preview into a successful empty directory", async () => {
  ;(service.getOrganizationDirectoryExportPreview as jest.Mock).mockRejectedValue(new Error("private database detail"))
  const result = await getOrganizationDirectoryExportPreviewAction("org", input)
  expect(result.success).toBe(false); expect(JSON.stringify(result)).not.toContain("private database detail")
})
