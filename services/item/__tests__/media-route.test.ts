/** @jest-environment node */
import { GET } from "@/app/api/media/[id]/route"
import { requireApiSessionForCurrentOrg, requireApiModuleAccess, requireAnyAppPermission, hasAppPermission } from "@/lib/security/server-authz"
import { readItemPicture } from "@/services/media/picture.service"

jest.mock("@/lib/security/server-authz", () => ({ requireApiSessionForCurrentOrg: jest.fn(), requireApiModuleAccess: jest.fn(), requireAnyAppPermission: jest.fn(), hasAppPermission: jest.fn() }))
jest.mock("@/services/media/picture.service", () => ({ readItemPicture: jest.fn() }))
jest.mock("@/lib/error-handling/route-response", () => ({
  jsonAuthzError: (message: string, status: number) => Response.json({error:message},{status}),
  jsonErrorResponse: () => Response.json({error:"Unable to load image."},{status:403}),
}))
const run=()=>GET(new Request("https://app.test/api/media/asset-1"),{params:Promise.resolve({id:"asset-1"})})
beforeEach(()=>{
  jest.resetAllMocks()
  jest.mocked(requireApiSessionForCurrentOrg).mockResolvedValue({session:{user:{id:"user-1"}},organizationId:"org-1"} as never)
  jest.mocked(requireApiModuleAccess).mockResolvedValue({allowed:true} as never)
  jest.mocked(hasAppPermission).mockReturnValue(true)
  jest.mocked(readItemPicture).mockResolvedValue({bytes:new Uint8Array([1,2,3]),mimeType:"image/png"})
})
it("denies anonymous reads before touching storage",async()=>{
  jest.mocked(requireApiSessionForCurrentOrg).mockResolvedValue({error:{status:401}} as never)
  expect((await run()).status).toBe(401)
  expect(readItemPicture).not.toHaveBeenCalled()
})
it("denies missing permissions before touching storage",async()=>{
  jest.mocked(requireAnyAppPermission).mockImplementation(()=>{throw Error("Forbidden")})
  expect((await run()).status).toBe(403)
  expect(readItemPicture).not.toHaveBeenCalled()
})
it("enforces module access",async()=>{
  jest.mocked(requireApiModuleAccess).mockResolvedValue({allowed:false} as never)
  expect((await run()).status).toBe(403)
  expect(readItemPicture).not.toHaveBeenCalled()
})
it("uses only the authenticated tenant and prevents shared caching",async()=>{
  const response=await run()
  expect(readItemPicture).toHaveBeenCalledWith("asset-1","org-1")
  expect(response.status).toBe(200)
  expect(response.headers.get("cache-control")).toBe("private, no-store")
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
})
it("uses POS entitlement for POS-only picture readers",async()=>{
  jest.mocked(hasAppPermission).mockReturnValue(false)
  expect((await run()).status).toBe(200)
  expect(requireApiModuleAccess).toHaveBeenCalledWith(expect.objectContaining({moduleSlug:"pos"}))
})
