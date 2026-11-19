import { credentialSignInSucceeded } from "../credential-sign-in-outcome"

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
})
