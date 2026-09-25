jest.mock("@/actions/_shared/safe-action-responses", () => ({ safeLoggedActionErrorMessage: (_m: string, _e: unknown, _c: unknown, fallback: string) => fallback }))
jest.mock("@/lib/security/rbac", () => ({ assertCanUseOrganization: jest.fn(), auditRbacDecision: jest.fn(), requireAnyPermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({observeModuleAccess: jest.fn()}))
jest.mock("@/services/media/picture.service", () => ({uploadItemPicture: jest.fn(), deleteUnattachedPicture: jest.fn()}))
import { assertCanUseOrganization, requireAnyPermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { uploadItemPicture, deleteUnattachedPicture } from "@/services/media/picture.service"
import { uploadPhoto, deletePhoto } from "../photo-upload-actions"
const ctx = { orgId:"org-session", userId:"user-session", permissions:["inventory.items.create"] }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requireAnyPermission as jest.Mock).mockResolvedValue(ctx)
  ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(true)
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({allowed:true})
  ;(uploadItemPicture as jest.Mock).mockResolvedValue("/api/media/test")
})
it("derives upload ownership from server auth and enforces module access", async () => {
  const file = new File(["image"],"image.png",{type:"image/png"})
  expect(await uploadPhoto(file,"org-session")).toEqual({success:true,url:"/api/media/test"})
  expect(uploadItemPicture).toHaveBeenCalledWith(file,ctx.orgId,ctx.userId)
  expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({moduleSlug:"inventory",mode:"enforce"}))
})
it("rejects a foreign organization before provider access", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValueOnce(new Error("Forbidden"))
  expect((await uploadPhoto({} as File,"org-other")).success).toBe(false)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("fails closed when the module is unavailable", async () => {
  ;(observeModuleAccess as jest.Mock).mockResolvedValueOnce({allowed:false})
  expect((await uploadPhoto({} as File,"org-session")).success).toBe(false)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("fails closed when permission is denied", async () => {
  ;(requireAnyPermission as jest.Mock).mockRejectedValueOnce(new Error("Forbidden"))
  expect((await uploadPhoto({} as File,"org-session")).success).toBe(false)
  expect(assertCanUseOrganization).not.toHaveBeenCalled()
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("uses the same tenant and actor boundary for staged-image cleanup", async () => {
  expect(await deletePhoto("/api/media/test","org-session")).toEqual({success:true})
  expect(deleteUnattachedPicture).toHaveBeenCalledWith("/api/media/test",ctx.orgId,ctx.userId)
})
