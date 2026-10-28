jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["accounting.audit.read", "accounting.exports.create"],
      })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/accounting/data-trust.service", () => ({
  getAccountantPortalData: jest.fn(),
  exportAccountantTrustPack: jest.fn(),
}))

import {
  exportAccountantTrustPack,
  getAccountantPortalData,
} from "@/services/accounting/data-trust.service"
import {
  exportAccountantTrustPackAction,
  getAccountantPortalAction,
} from "../data-trust.actions"

const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock
const mockExportAccountantTrustPack = exportAccountantTrustPack as jest.Mock

describe("accountant data-trust actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAccountantPortalData.mockResolvedValue({ source: { trustLevel: "T4" } })
    mockExportAccountantTrustPack.mockResolvedValue({ exportId: "export-1" })
  })

  it("derives portal tenant scope from the RBAC context", async () => {
    const result = await getAccountantPortalAction({
      organizationId: "attacker-org",
      periodId: "period-1",
      limit: 7,
    })

    expect(result.success).toBe(true)
    expect(mockGetAccountantPortalData).toHaveBeenCalledWith({
      organizationId: "org-session",
      periodId: "period-1",
      startDate: undefined,
      endDate: undefined,
      limit: 7,
    })
  })

  it("derives export actor and permission context from the RBAC context", async () => {
    const result = await exportAccountantTrustPackAction({
      organizationId: "attacker-org",
      exportedById: "attacker-user",
      includeLedgerRows: true,
    })

    expect(result.success).toBe(true)
    expect(mockExportAccountantTrustPack).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-session",
        exportedById: "user-session",
        actorPermissions: ["accounting.audit.read", "accounting.exports.create"],
        includeLedgerRows: true,
      }),
    )
    expect(mockExportAccountantTrustPack.mock.calls[0][0].lastAuthAt).toBeInstanceOf(Date)
  })
})
