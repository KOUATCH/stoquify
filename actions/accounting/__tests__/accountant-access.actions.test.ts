jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "client-org",
        userId: "client-owner",
        permissions: [
          "accounting.audit.read",
          "accounting.close.accountant.invite",
        ],
      })
      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/accounting/accountant-access.service", () => ({
  getAccountantAccessRegister: jest.fn(),
  getAccountantPortfolio: jest.fn(),
  grantAccountantAccess: jest.fn(),
  revokeAccountantAccess: jest.fn(),
}))

import {
  getAccountantAccessRegister,
  getAccountantPortfolio,
  grantAccountantAccess,
  revokeAccountantAccess,
} from "@/services/accounting/accountant-access.service"
import {
  getAccountantAccessRegisterAction,
  getAccountantPortfolioAction,
  grantAccountantAccessAction,
  revokeAccountantAccessAction,
} from "../accountant-access.actions"

const mockRegister = getAccountantAccessRegister as jest.Mock
const mockPortfolio = getAccountantPortfolio as jest.Mock
const mockGrant = grantAccountantAccess as jest.Mock
const mockRevoke = revokeAccountantAccess as jest.Mock

describe("accountant access actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRegister.mockResolvedValue([])
    mockPortfolio.mockResolvedValue({ clients: [] })
    mockGrant.mockResolvedValue({ id: "grant-1" })
    mockRevoke.mockResolvedValue({ id: "grant-1", status: "REVOKED" })
  })

  it("lists the client tenant register and the actor portfolio from session scope", async () => {
    await getAccountantAccessRegisterAction({ organizationId: "attacker-org" })
    await getAccountantPortfolioAction({ accountantUserId: "attacker-user" })

    expect(mockRegister).toHaveBeenCalledWith("client-org")
    expect(mockPortfolio).toHaveBeenCalledWith("client-owner")
  })

  it("derives grantor and client identity from the protected context", async () => {
    const input = {
      organizationId: "attacker-org",
      actorId: "attacker-user",
      accountantEmail: "accountant@example.test",
      accountantFirmName: "Trusted Ledger LLP",
      accountantFirmRegistrationNumber: null,
      role: "REVIEWER",
      consentEvidenceHash: `sha256:${"a".repeat(64)}`,
      expiresAt: "2026-12-31T23:59:59.000Z",
    }

    await grantAccountantAccessAction(input)

    expect(mockGrant).toHaveBeenCalledWith(
      "client-org",
      "client-owner",
      expect.objectContaining({
        accountantEmail: "accountant@example.test",
        role: "REVIEWER",
      }),
    )
  })

  it("scopes revocation to the current client tenant", async () => {
    await revokeAccountantAccessAction({
      organizationId: "attacker-org",
      grantId: "grant-1",
      reason: "Engagement ended",
    })

    expect(mockRevoke).toHaveBeenCalledWith(
      "client-org",
      "client-owner",
      expect.objectContaining({
        grantId: "grant-1",
        reason: "Engagement ended",
      }),
    )
  })
})
