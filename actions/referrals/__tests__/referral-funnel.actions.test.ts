jest.mock("@/lib/security/rbac", () => ({
  assertCanUseOrganization: jest.fn(),
  requirePermission: jest.fn(),
}))
jest.mock("@/services/referrals/referral-funnel-read-model.service", () => ({
  getReferralFunnelReadModel: jest.fn(),
}))

import {
  assertCanUseOrganization,
  requirePermission,
} from "@/lib/security/rbac"
import { getReferralFunnelReadModel } from "@/services/referrals/referral-funnel-read-model.service"

import { getReferralFunnelAction } from "../referral-funnel.actions"

const mockRequirePermission = requirePermission as jest.Mock
const mockAssertCanUseOrganization = assertCanUseOrganization as jest.Mock
const mockGetReadModel = getReferralFunnelReadModel as jest.Mock
const context = {
  orgId: "org-session",
  userId: "user-1",
  permissions: ["analytics.read"],
  isSuperUser: false,
}

describe("referral funnel action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequirePermission.mockResolvedValue(context)
    mockAssertCanUseOrganization.mockResolvedValue(undefined)
    mockGetReadModel.mockResolvedValue({ organizationId: "org-session" })
  })

  it("requires analytics authority and uses the session tenant by default", async () => {
    await expect(getReferralFunnelAction()).resolves.toEqual({
      organizationId: "org-session",
    })

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics.read", {
      resource: "ReferralFunnel",
      resourceId: undefined,
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      context,
      "org-session",
    )
    expect(mockGetReadModel).toHaveBeenCalledWith("org-session")
  })

  it("checks requested tenant access before loading referral evidence", async () => {
    mockAssertCanUseOrganization.mockRejectedValue(new Error("Forbidden"))

    await expect(getReferralFunnelAction("org-other")).rejects.toThrow(
      "Forbidden",
    )

    expect(mockRequirePermission).toHaveBeenCalledWith("analytics.read", {
      resource: "ReferralFunnel",
      resourceId: "org-other",
    })
    expect(mockAssertCanUseOrganization).toHaveBeenCalledWith(
      context,
      "org-other",
    )
    expect(mockGetReadModel).not.toHaveBeenCalled()
  })

  it("does not load referral evidence when permission is denied", async () => {
    mockRequirePermission.mockRejectedValue(new Error("Forbidden"))

    await expect(getReferralFunnelAction()).rejects.toThrow("Forbidden")

    expect(mockAssertCanUseOrganization).not.toHaveBeenCalled()
    expect(mockGetReadModel).not.toHaveBeenCalled()
  })
})
