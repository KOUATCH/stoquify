jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {
    constructor() {
      super("Fresh authentication required")
      this.name = "FreshAuthRequiredError"
    }
  },
  SESSION_ASSURANCE_LEVEL: {
    NONE: 0,
    PASSWORD: 1,
  },
}))

jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      const lastAuthAt = new Date("2026-08-01T09:57:00.000Z")
      const baseContext = {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["accounting.audit.read", "accounting.exports.create"],
        freshAuth: {
          lastAuthAt,
          claims: {
            userId: "user-session",
            tenantId: "org-session",
            assuranceOrganizationId: "org-session",
            assuranceLevel: 1,
            lastAuthAt: lastAuthAt.getTime(),
          },
        },
      }
      const contextOverride = (
        globalThis as typeof globalThis & {
          __dataTrustActionContextOverride?: Record<string, unknown>
        }
      ).__dataTrustActionContextOverride
      const data = await handler(input, { ...baseContext, ...contextOverride })

      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

function setDataTrustActionContextOverride(
  value: Record<string, unknown> | undefined,
) {
  const store = globalThis as typeof globalThis & {
    __dataTrustActionContextOverride?: Record<string, unknown>
  }
  if (value) store.__dataTrustActionContextOverride = value
  else delete store.__dataTrustActionContextOverride
}

jest.mock("@/services/accounting/data-trust.service", () => ({
  getAccountantPortalData: jest.fn(),
  exportAccountantTrustPack: jest.fn(),
}))
jest.mock("@/services/accounting/accountant-access.service", () => ({
  resolveAccountantClientAccess: jest.fn(),
}))

import { resolveAccountantClientAccess } from "@/services/accounting/accountant-access.service"
import {
  exportAccountantTrustPack,
  getAccountantPortalData,
} from "@/services/accounting/data-trust.service"
import {
  exportAccountantTrustPackAction,
  getAccountantPortalAction,
} from "../data-trust.actions"

const mockResolveAccountantClientAccess = resolveAccountantClientAccess as jest.Mock
const mockGetAccountantPortalData = getAccountantPortalData as jest.Mock
const mockExportAccountantTrustPack = exportAccountantTrustPack as jest.Mock

describe("accountant data-trust actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setDataTrustActionContextOverride(undefined)
    mockResolveAccountantClientAccess.mockImplementation(({ homeOrganizationId }) => Promise.resolve({ organizationId: homeOrganizationId, mode: "TENANT_MEMBER", grant: null }))
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
      lastAuthAt: "1900-01-01T00:00:00.000Z",
      freshAuth: { lastAuthAt: "1900-01-01T00:00:00.000Z" },
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
    expect(mockExportAccountantTrustPack.mock.calls[0][0].lastAuthAt).toEqual(
      new Date("2026-08-01T09:57:00.000Z"),
    )
    expect(mockExportAccountantTrustPack.mock.calls[0][0]).not.toHaveProperty("freshAuth")
    expect(mockExportAccountantTrustPack.mock.calls[0][0]).not.toHaveProperty("claims")
  })

  it.each([
    ["missing evidence", undefined],
    ["user identity", freshAuthFixture({ userId: "user-other" })],
    ["tenant identity", freshAuthFixture({ tenantId: "org-other" })],
    [
      "assurance organization",
      freshAuthFixture({ assuranceOrganizationId: "org-other" }),
    ],
    ["assurance level", freshAuthFixture({ assuranceLevel: 0 })],
    ["missing assurance level", freshAuthFixture({ assuranceLevel: undefined })],
    ["nonnumeric assurance level", freshAuthFixture({ assuranceLevel: "1" })],
    [
      "authentication timestamp",
      freshAuthFixture({ lastAuthAt: Date.parse("2026-08-01T09:56:00.000Z") }),
    ],
  ])("fails closed for cross-context %s mismatch", async (_name, freshAuth) => {
    setDataTrustActionContextOverride({ freshAuth })

    await expect(
      exportAccountantTrustPackAction({ clientOrganizationId: "client-org" }),
    ).rejects.toThrow("Fresh authentication required")

    expect(mockResolveAccountantClientAccess).not.toHaveBeenCalled()
    expect(mockExportAccountantTrustPack).not.toHaveBeenCalled()
  })
})

function freshAuthFixture(claimOverrides: Record<string, unknown> = {}) {
  const lastAuthAt = new Date("2026-08-01T09:57:00.000Z")
  return {
    lastAuthAt,
    claims: {
      userId: "user-session",
      tenantId: "org-session",
      assuranceOrganizationId: "org-session",
      assuranceLevel: 1,
      lastAuthAt: lastAuthAt.getTime(),
      ...claimOverrides,
    },
  }
}
