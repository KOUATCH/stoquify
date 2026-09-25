/** @jest-environment node */
import { GET, POST } from "../[...all]/route"
import { updateSelfProfileHttp } from "@/services/users/self-profile-http.service"
jest.mock("@/lib/auth", () => ({ auth: {} }))
jest.mock("@/services/users/self-profile-http.service", () => ({ updateSelfProfileHttp: jest.fn().mockResolvedValue("reviewed") }))
jest.mock("better-auth/next-js", () => ({ toNextJsHandler: jest.fn().mockReturnValue({ GET: jest.fn().mockResolvedValue("get"), POST: jest.fn().mockResolvedValue("auth") }) }))
beforeEach(() => jest.clearAllMocks())
it.each(["/api/auth/update-user", "/api/auth/update-user/", "/api/auth/%75pdate-user", "/api/auth//update-user", "/api/auth/update%2Duser?ignored=true"])("routes profile write %s through the reviewed service", async path => {
  const request = new Request("http://localhost:3000" + path, { method: "POST" })
  expect(await POST(request)).toBe("reviewed"); expect(updateSelfProfileHttp).toHaveBeenCalledWith(request)
})
it("preserves other auth handlers", async () => {
  expect(await POST(new Request("http://localhost:3000/api/auth/sign-in/email", { method: "POST" }))).toBe("auth")
  expect(await GET(new Request("http://localhost:3000/api/auth/get-session"))).toBe("get")
  expect(updateSelfProfileHttp).not.toHaveBeenCalled()
})
