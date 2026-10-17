jest.mock("@/lib/security/rbac", () => ({ requireRbacContext: jest.fn() }))
jest.mock("next-intl/routing", () => ({ defineRouting: (config: unknown) => config }))
jest.mock("@/components/access-requests/AccessRequests", () => ({ __esModule: true, default: () => null }))
import { requireRbacContext } from "@/lib/security/rbac"
import Page from "../page"
beforeEach(() => { jest.clearAllMocks(); (requireRbacContext as jest.Mock).mockResolvedValue({ orgId: "org", userId: "requester", permissions: [] }) })
it("allows authenticated own-request access without member-directory permissions", async () => {
  const element = await Page({ params: Promise.resolve({ locale: "fr" }), searchParams: Promise.resolve({ target: "items" }) })
  expect(element.props).toMatchObject({ locale: "fr", initialTarget: "items" }); expect(element.key).toContain("requester")
})
it("ignores arbitrary targets and redirects supplied as targets", async () => {
  for (const target of ["https://example.invalid", "../../settings/users", ["items", "admin"]]) {
    const element = await Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ target }) })
    expect(element.props.initialTarget).toBeUndefined()
  }
})
it("requires current authentication even when the URL names a supported target", async () => {
  ;(requireRbacContext as jest.Mock).mockRejectedValue(new Error("expired"))
  await expect(Page({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ target: "items" }) })).rejects.toThrow("expired")
})
