jest.mock("server-only", () => ({}))
jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn(), hasAllRbacPermissions: jest.requireActual("@/lib/security/rbac-permissions").hasAllRbacPermissions }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { requireRbacContext } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { getItemAccessRequestDenial } from "../access-request-entry"
beforeEach(() => {
  jest.clearAllMocks(); process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED = "true"
  ;(requireRbacContext as jest.Mock).mockResolvedValue({ orgId: "org", userId: "requester", permissions: [] })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
})
afterEach(() => { delete process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED })
it("offers only the normalized task for a valid permission denial", async () => {
  expect(await getItemAccessRequestDenial()).toEqual({ moduleBlocked: false, requestHref: "/dashboard/access-requests?target=items" })
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org", userId: "requester", moduleSlug: "inventory", mode: "enforce" }))
})
it("distinguishes module denial without offering a permission request", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
  expect(await getItemAccessRequestDenial()).toEqual({ moduleBlocked: true, requestHref: null })
})
it("does not offer a request when submissions are disabled", async () => {
  delete process.env.ACCESS_REQUEST_SUBMISSIONS_ENABLED
  expect(await getItemAccessRequestDenial()).toEqual({ moduleBlocked: false, requestHref: null })
})
it("does not confuse existing access or an expired session with a requestable denial", async () => {
  ;(requireRbacContext as jest.Mock).mockResolvedValue({ orgId: "org", userId: "requester", permissions: ["inventory.items.read"] })
  expect(await getItemAccessRequestDenial()).toBeNull()
  ;(requireRbacContext as jest.Mock).mockRejectedValue(new Error("expired"))
  expect(await getItemAccessRequestDenial()).toBeNull(); expect(observeModuleAccess).not.toHaveBeenCalled()
})
