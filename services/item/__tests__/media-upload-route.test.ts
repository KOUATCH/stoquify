/** @jest-environment node */
import { POST } from "@/app/api/media/upload/route"
import { requireInventoryPhotoWrite } from "@/services/media/picture-authorization"
import { uploadItemPicture } from "@/services/media/picture.service"
import { AuthRequiredError, ForbiddenError } from "@/services/_shared/action-errors"

jest.mock("@/services/media/picture-authorization",()=>({requireInventoryPhotoWrite:jest.fn()}))
jest.mock("@/services/media/picture.service",()=>({uploadItemPicture:jest.fn()}))
jest.mock("@/lib/error-handling/route-response",()=>({jsonErrorResponse:(error:{message:string;status:number})=>Response.json({error:error.message},{status:error.status||500})}))
function request(options: {origin?:string;url?:string;bytes?:number;headers?:Record<string,string>;field?:string}={}) {
  const body=new FormData()
  body.set(options.field??"file",new File([new Uint8Array(options.bytes??100)],"picture.png",{type:"image/png"}))
  return new Request(options.url??"https://app.test/api/media/upload",{method:"POST",body,headers:{origin:options.origin??"https://app.test","x-organization-id":"org-1",...options.headers}})
}
const originalEnv = process.env
beforeEach(()=>{
  process.env = {...originalEnv, NEXTAUTH_URL:"https://app.test", NEXT_PUBLIC_BASE_URL:"https://app.test"}
  jest.resetAllMocks()
  jest.mocked(requireInventoryPhotoWrite).mockResolvedValue({orgId:"org-1",userId:"user-1"} as never)
  jest.mocked(uploadItemPicture).mockResolvedValue("/api/media/owned-id")
})
afterEach(()=>{process.env=originalEnv})
it("accepts the configured browser origin when Next.js uses an internal request URL",async()=>{
  expect((await POST(request({url:"http://0.0.0.0:3000/api/media/upload"}))).status).toBe(200)
})
it.each([
  {origin:"",headers:{}},
  {origin:"https://app.test",headers:{"sec-fetch-site":"cross-site"}},
  {origin:"https://foreign.test",headers:{host:"foreign.test","x-forwarded-host":"foreign.test"}},
])("rejects missing, cross-site, and spoofed origins",async options=>{
  expect((await POST(request(options))).status).toBe(403)
  expect(requireInventoryPhotoWrite).not.toHaveBeenCalled()
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("returns direct JSON for a picture over 1 MB",async()=>{
  const response=await POST(request({bytes:1266422}))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({success:true,url:"/api/media/owned-id"})
  expect(requireInventoryPhotoWrite).toHaveBeenCalledWith("org-1","POST /api/media/upload","api")
  expect(uploadItemPicture).toHaveBeenCalledWith(expect.objectContaining({size:1266422,type:"image/png"}),"org-1","user-1")
  expect(response.headers.get("cache-control")).toBe("no-store")
})
it("rejects cross-site uploads before reading the file",async()=>{
  expect((await POST(request({origin:"https://foreign.test"}))).status).toBe(403)
  expect(requireInventoryPhotoWrite).not.toHaveBeenCalled()
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("rejects unauthenticated uploads",async()=>{
  jest.mocked(requireInventoryPhotoWrite).mockRejectedValue(new AuthRequiredError())
  expect((await POST(request())).status).toBe(401)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("preserves tenant, permission, and module denial",async()=>{
  jest.mocked(requireInventoryPhotoWrite).mockRejectedValue(new ForbiddenError())
  expect((await POST(request())).status).toBe(403)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("bounds multipart bodies even without a Content-Length header",async()=>{
  expect((await POST(request({bytes:5*1024*1024}))).status).toBe(400)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("rejects declared oversized bodies before upload",async()=>{
  expect((await POST(request({headers:{"content-length":String(8*1024*1024)}}))).status).toBe(400)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
it("rejects a missing picture",async()=>{
  expect((await POST(request({field:"wrong-field"}))).status).toBe(400)
  expect(uploadItemPicture).not.toHaveBeenCalled()
})
