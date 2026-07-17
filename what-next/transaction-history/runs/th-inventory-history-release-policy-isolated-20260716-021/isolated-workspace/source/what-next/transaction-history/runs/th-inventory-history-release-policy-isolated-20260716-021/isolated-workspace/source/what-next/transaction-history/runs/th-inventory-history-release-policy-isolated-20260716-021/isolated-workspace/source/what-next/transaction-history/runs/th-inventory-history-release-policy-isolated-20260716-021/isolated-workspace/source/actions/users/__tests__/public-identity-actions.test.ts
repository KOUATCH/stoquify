import { getPublicIdentityRequestContext } from "@/lib/security/public-request-context"
import { safeStatusActionErrorResult } from "@/actions/_shared/safe-action-responses"
import {
  acceptInvitationWorkflow,
  completePasswordResetWorkflow,
  createOrganizationOwner,
  requestPasswordResetLinkWorkflow,
  verifyEmailOtpWorkflow,
} from "@/services/users/user-identity.service"

import createUser from "../createUser"
import { createInvitedUser } from "../createInvitedUser"
import { sendResetLink } from "../sendResetLink"
import { resetUserPassword } from "../updateUserPassword"
import verifyOTP from "../verifyOtp"

jest.mock("@/lib/security/public-request-context", () => ({
  getPublicIdentityRequestContext: jest.fn(),
}))

jest.mock("@/services/users/user-identity.service", () => ({
  acceptInvitationWorkflow: jest.fn(),
  changeUserPasswordWorkflow: jest.fn(),
  completePasswordResetWorkflow: jest.fn(),
  createOrganizationOwner: jest.fn(),
  requestPasswordResetLinkWorkflow: jest.fn(),
  verifyEmailOtpWorkflow: jest.fn(),
}))

jest.mock("@/actions/_shared/safe-action-responses", () => ({
  logSafeActionWarning: jest.fn(),
  safeStatusActionErrorResult: jest.fn(),
}))

jest.mock("@/lib/security/auth-session", () => ({ requireFreshAuth: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({
  requirePermission: jest.fn(),
  requireRbacContext: jest.fn(),
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))

const requestContext = { ipAddress: "203.0.113.10" }
const mockGetPublicIdentityRequestContext = getPublicIdentityRequestContext as jest.Mock
const mockCreateOrganizationOwner = createOrganizationOwner as jest.Mock
const mockAcceptInvitationWorkflow = acceptInvitationWorkflow as jest.Mock
const mockRequestPasswordResetLinkWorkflow = requestPasswordResetLinkWorkflow as jest.Mock
const mockCompletePasswordResetWorkflow = completePasswordResetWorkflow as jest.Mock
const mockVerifyEmailOtpWorkflow = verifyEmailOtpWorkflow as jest.Mock
const mockSafeStatusActionErrorResult = safeStatusActionErrorResult as jest.Mock

describe("public identity action request context", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetPublicIdentityRequestContext.mockResolvedValue(requestContext)
    mockCreateOrganizationOwner.mockResolvedValue({ status: 200 })
    mockAcceptInvitationWorkflow.mockResolvedValue({ status: 200 })
    mockRequestPasswordResetLinkWorkflow.mockResolvedValue({ status: 200, error: null, data: null })
    mockCompletePasswordResetWorkflow.mockResolvedValue({ status: 200, error: null, data: null })
    mockVerifyEmailOtpWorkflow.mockResolvedValue({ status: 200 })
    mockSafeStatusActionErrorResult.mockReturnValue({
      error: "Something went wrong. Please try again.",
      status: 503,
      data: null,
      code: "DATABASE_UNAVAILABLE",
    })
  })

  it("passes server-derived context through every custom public identity action", async () => {
    const registration = {
      email: "owner@example.com",
      password: "Password123!",
      firstName: "Owner",
      lastName: "One",
      name: "Owner One",
      organizationName: "Demo Org",
      phone: "+237600000001",
    }
    const organization = { name: "Demo Org" }
    const invitation = { token: "invite-token", password: "Password123!" }

    await createUser(registration, organization)
    await createInvitedUser(invitation)
    await sendResetLink("owner@example.com")
    await resetUserPassword("owner@example.com", "reset-token", "Password123!")
    await verifyOTP("user-1", "123456")

    expect(mockCreateOrganizationOwner).toHaveBeenCalledWith(registration, organization, requestContext)
    expect(mockAcceptInvitationWorkflow).toHaveBeenCalledWith(invitation, requestContext)
    expect(mockRequestPasswordResetLinkWorkflow).toHaveBeenCalledWith("owner@example.com", requestContext)
    expect(mockCompletePasswordResetWorkflow).toHaveBeenCalledWith(
      "owner@example.com",
      "reset-token",
      "Password123!",
      requestContext,
    )
    expect(mockVerifyEmailOtpWorkflow).toHaveBeenCalledWith("user-1", "123456", requestContext)
    expect(mockGetPublicIdentityRequestContext).toHaveBeenCalledTimes(5)
  })

  it("routes registration infrastructure failures through the safe action mapper", async () => {
    const infrastructureError = new Error("sensitive database connection detail")
    const registration = {
      email: "owner@example.com",
      password: "Password123!",
      firstName: "Owner",
      lastName: "One",
      name: "Owner One",
      organizationName: "Demo Org",
      phone: "+237600000001",
    }
    const organization = { name: "Demo Org" }
    mockCreateOrganizationOwner.mockRejectedValue(infrastructureError)

    const result = await createUser(registration, organization)

    expect(mockSafeStatusActionErrorResult).toHaveBeenCalledWith(
      infrastructureError,
      {
        action: "users.create",
        component: "User",
      },
      "Something went wrong. Please try again.",
    )
    expect(result).toMatchObject({
      error: "Something went wrong. Please try again.",
      status: 503,
      data: null,
      code: "DATABASE_UNAVAILABLE",
    })
    expect(JSON.stringify(result)).not.toContain("sensitive database connection detail")
  })

  it("keeps password-reset request failures enumeration-safe", async () => {
    mockRequestPasswordResetLinkWorkflow.mockRejectedValue(new Error("sensitive database connection detail"))

    const result = await sendResetLink("owner@example.com")

    expect(result).toEqual({ status: 200, error: null, data: null })
    expect(JSON.stringify(result)).not.toContain("sensitive database connection detail")
  })
})
