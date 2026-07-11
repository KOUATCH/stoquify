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

describe("GET /api/security-txt", () => {
  it("publishes a fresh security.txt policy with bounded cache headers", async () => {
    const response = await GET()
    const body = await response.text()
    const expires = body.match(/^Expires:\s*(.+)$/m)?.[1]

    expect(response.status).toBe(200)
    expect(response.headers.get("Content-Type")).toBe("text/plain")
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=86400")
    expect(body).toContain("Contact: mailto:security@stoquify.com")
    expect(expires).toBe("2027-07-02T23:59:59.000Z")
    expect(new Date(expires!).getTime()).toBeGreaterThan(new Date("2026-07-03T00:00:00.000Z").getTime())
  })
})
