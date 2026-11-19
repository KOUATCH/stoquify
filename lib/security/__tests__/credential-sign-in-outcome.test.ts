import { credentialSignInFailed, credentialSignInSucceeded } from "../credential-sign-in-outcome"

describe("credential sign-in outcome", () => {
  it("recognizes the Better Auth returned success payload", () => {
    expect(
      credentialSignInSucceeded({
        context: { returned: { token: "session-token", user: { id: "user-1" } } },
      }),
    ).toBe(true)
  })

  it("rejects the APIError stored by Better Auth for failed sign-in", () => {
    expect(
      credentialSignInSucceeded({
        context: {
          returned: { name: "APIError", statusCode: 401 },
        },
      }),
    ).toBe(false)
  })

  it("fails closed when the hook result is missing", () => {
    expect(credentialSignInSucceeded({ context: {} })).toBe(false)
    expect(credentialSignInSucceeded({})).toBe(false)
  })

  it.each([{}, { token: "", user: { id: "user-1" } }, { token: "token", user: {} }, { error: "Unavailable" }, true])(
    "does not treat a non-session response as successful sign-in: %j", returned => {
      expect(credentialSignInSucceeded({ context: { returned } })).toBe(false)
    },
  )

  it("recognizes only the native invalid-credential error as a password failure", () => {
    expect(credentialSignInFailed({ context: { returned: {
      name: "APIError", statusCode: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD" },
    } } })).toBe(true)
  })

  it.each([
    { name: "APIError", statusCode: 403, body: { code: "INVALID_ORIGIN" } },
    { name: "APIError", statusCode: 401, body: { code: "FAILED_TO_CREATE_SESSION" } },
    { name: "APIError", statusCode: 400, body: { code: "INVALID_EMAIL_OR_PASSWORD" } },
    { statusCode: 401, body: { code: "INVALID_EMAIL_OR_PASSWORD" } },
    null, undefined,
  ])("does not count an unrelated or missing result as bad credentials: %j", returned => {
    expect(credentialSignInFailed({ context: { returned } })).toBe(false)
  })
})
