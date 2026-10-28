import { GET as apiGET } from "../../../api/security-txt/route"
import { GET } from "../route"

jest.mock("next/server", () => ({
  NextResponse: class {
    status: number
    headers: Headers

    constructor(private readonly body: string, init?: { status?: number; headers?: HeadersInit }) {
      this.status = init?.status ?? 200
      this.headers = new Headers(init?.headers)
    }

    async text() {
      return this.body
    }
  },
}))

describe("GET /.well-known/security.txt", () => {
  it("serves the same fresh disclosure policy and headers as /api/security-txt", async () => {
    const canonical = await GET()
    const api = await apiGET()

    await expect(canonical.text()).resolves.toBe(await api.text())
    expect(canonical.status).toBe(api.status)
    expect(canonical.headers.get("Content-Type")).toBe(api.headers.get("Content-Type"))
    expect(canonical.headers.get("Cache-Control")).toBe(api.headers.get("Cache-Control"))
  })
})
