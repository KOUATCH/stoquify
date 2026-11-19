const mockGet = jest.fn()
const mockValidateSession = jest.fn()
const mockLoadSession = jest.fn()

jest.mock("next/headers", () => ({ cookies: async () => ({ get: mockGet }) }))
jest.mock("@/lib/auth-server", () => {
  mockLoadSession()
  return { getSession: mockValidateSession }
})

import { getPublicSession } from "../public-session"

beforeEach(() => { mockGet.mockReset(); mockValidateSession.mockReset() })

test("anonymous public rendering does not even load the authentication graph", async () => {
  await expect(getPublicSession()).resolves.toBeNull()
  expect(mockLoadSession).not.toHaveBeenCalled()
  expect(mockValidateSession).not.toHaveBeenCalled()
})

test.each(["better-auth.session_token", "__Secure-better-auth.session_token"])("%s is validated, not treated as an authenticated session", async name => {
  mockGet.mockImplementation((key: string) => key === name ? { value: "untrusted-cookie" } : undefined)
  mockValidateSession.mockResolvedValue(null)
  await expect(getPublicSession()).resolves.toBeNull()
  expect(mockValidateSession).toHaveBeenCalledTimes(1)
  const validated = { user: { id: "verified-user" } }
  mockValidateSession.mockResolvedValue(validated)
  await expect(getPublicSession()).resolves.toBe(validated)
})

test("empty or unrelated cookies do not trigger a session lookup", async () => {
  mockGet.mockReturnValue({ value: "" })
  await expect(getPublicSession()).resolves.toBeNull()
  expect(mockValidateSession).not.toHaveBeenCalled()
})
