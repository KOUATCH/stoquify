/** @jest-environment node */
import { authClient, signOut } from "../auth-client"
jest.mock("better-auth/react", () => ({ createAuthClient: () => ({ signOut: jest.fn() }) }))
jest.mock("next-intl/routing", () => ({ defineRouting: (value: unknown) => value }))
const location = { origin: "https://local.example.invalid", pathname: "/fr/dashboard/profile", href: "unchanged" }
beforeEach(() => {
  jest.resetAllMocks()
  location.href = "unchanged"
  Object.defineProperty(globalThis, "window", { value: { location }, configurable: true })
})
afterAll(() => { Reflect.deleteProperty(globalThis, "window") })
it.each([{ data: null, error: { status: 503 } }, { data: { success: false }, error: null }, { data: {}, error: null }])("keeps the current location on an unconfirmed result", async result => {
  ;(authClient.signOut as jest.Mock).mockResolvedValue(result)
  await expect(signOut()).rejects.toThrow("SIGN_OUT_UNCONFIRMED")
  expect(location.href).toBe("unchanged")
})
it("propagates an interrupted request without navigating", async () => {
  ;(authClient.signOut as jest.Mock).mockRejectedValue(new Error("network"))
  await expect(signOut()).rejects.toThrow("network")
  expect(location.href).toBe("unchanged")
})
it("redirects to the current language only after confirmed success", async () => {
  ;(authClient.signOut as jest.Mock).mockResolvedValue({ data: { success: true }, error: null })
  await signOut()
  expect(location.href).toBe("https://local.example.invalid/fr/login")
})
it("honors an explicitly suppressed redirect", async () => {
  ;(authClient.signOut as jest.Mock).mockResolvedValue({ data: { success: true }, error: null })
  await signOut({ redirect: false })
  expect(location.href).toBe("unchanged")
})
