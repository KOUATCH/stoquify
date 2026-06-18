import { registerUser, signInWithCredentials } from "@/actions/auth"
import { auth } from "@/lib/auth"
import { registerOrganizationAccount } from "@/services/users/user-identity.service"

jest.mock("@/services/users/user-identity.service", () => ({
  registerOrganizationAccount: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({
  auth: {
    api: {
      signInEmail: jest.fn(),
    },
  },
}))

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    set: jest.fn(),
  })),
}))

const mockRegisterOrganizationAccount = registerOrganizationAccount as jest.Mock
const mockSignInEmail = auth.api.signInEmail as jest.Mock

const validRegistration = {
  firstName: "Alice",
  lastName: "Owner",
  email: "alice@example.com",
  phone: "+237600000001",
  companyName: "Alice SARL",
  companySize: "1-10",
  password: "Password123!",
  confirmPassword: "Password123!",
  termsAccepted: true,
}

beforeEach(() => {
  mockRegisterOrganizationAccount.mockReset()
  mockSignInEmail.mockReset()
})

describe("auth action edge cases", () => {
  it("rejects registration password mismatches before calling the service", async () => {
    const result = await registerUser({
      ...validRegistration,
      confirmPassword: "Different123!",
    })

    expect(result).toEqual({
      success: false,
      error: "Passwords do not match",
    })
    expect(mockRegisterOrganizationAccount).not.toHaveBeenCalled()
  })

  it("rejects registration without terms acceptance before calling the service", async () => {
    const result = await registerUser({
      ...validRegistration,
      termsAccepted: false,
    })

    expect(result).toEqual({
      success: false,
      error: "You must accept the terms and conditions",
    })
    expect(mockRegisterOrganizationAccount).not.toHaveBeenCalled()
  })

  it("delegates valid registration to the service and preserves the response", async () => {
    const serviceResult = {
      success: true,
      message: "Account created successfully! Please check your email to verify your account.",
      data: {
        userId: "user-1",
        organizationId: "org-1",
        email: "alice@example.com",
      },
    }
    mockRegisterOrganizationAccount.mockResolvedValue(serviceResult)

    const result = await registerUser(validRegistration)

    expect(result).toEqual(serviceResult)
    expect(mockRegisterOrganizationAccount).toHaveBeenCalledWith(validRegistration)
  })

  it("keeps missing credential responses local to the action boundary", async () => {
    const result = await signInWithCredentials({
      email: "",
      password: "",
    })

    expect(result).toEqual({
      success: false,
      error: "Email and password are required",
    })
    expect(mockSignInEmail).not.toHaveBeenCalled()
  })

  it("normalizes Better Auth email-not-verified responses", async () => {
    mockSignInEmail.mockResolvedValue({
      ok: false,
      json: jest.fn(async () => ({ code: "EMAIL_NOT_VERIFIED" })),
    })

    const result = await signInWithCredentials({
      email: "alice@example.com",
      password: "Password123!",
    })

    expect(result).toEqual({
      success: false,
      error: "Please verify your email address before signing in. Check your inbox for the verification code.",
    })
    expect(mockSignInEmail).toHaveBeenCalledWith({
      body: {
        email: "alice@example.com",
        password: "Password123!",
      },
      asResponse: true,
    })
  })
})
