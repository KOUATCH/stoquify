jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

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
  protect: jest.fn((options, handler) => {
    const store = globalThis as typeof globalThis & {
      __customerSettlementProtectOptions?: Record<string, unknown>
      __customerSettlementContextOverride?: Record<string, unknown>
    }
    store.__customerSettlementProtectOptions = options

    return async (input: unknown) => {
      const lastAuthAt = new Date("2026-08-08T10:00:00.000Z")
      const baseContext = {
        orgId: "org-session",
        userId: "user-session",
        permissions: ["finance.receivables.reverse"],
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
      const data = await handler(input, {
        ...baseContext,
        ...store.__customerSettlementContextOverride,
      })
      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock(
  "@/services/accounting/customer-settlement-reversal.service",
  () => ({
    reverseCustomerSettlementWithControls: jest.fn(),
  }),
)

import { revalidatePath } from "next/cache"

import { reverseCustomerSettlementWithControls } from "@/services/accounting/customer-settlement-reversal.service"

import { reverseCustomerSettlementAction } from "../customer-settlement.actions"

const mockRevalidatePath = revalidatePath as jest.Mock
const mockReverseCustomerSettlementWithControls =
  reverseCustomerSettlementWithControls as jest.Mock

describe("customer settlement reversal action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setContextOverride(undefined)
    mockReverseCustomerSettlementWithControls.mockResolvedValue(
      reversalResult(),
    )
  })

  it("uses the exact critical permission, fresh-auth, audit, and finance module gate", () => {
    expect(protectOptions()).toEqual({
      permission: "finance.receivables.reverse",
      auditResource: "CustomerSettlement",
      auditAllowed: true,
      freshAuth: { maxAgeSeconds: 300 },
      module: {
        moduleSlug: "finance",
        surface:
          "actions/finance/customer-settlement.actions.ts:reverseCustomerSettlementAction",
        surfaceType: "action",
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      },
    })
  })

  it("derives bounded control evidence from the protected context", async () => {
    const result = await reverseCustomerSettlementAction({
      ...validInput(),
      organizationId: "org-attacker",
      actorId: "user-attacker",
      actorPermissions: ["*"],
      freshAuth: { lastAuthAt: "1900-01-01T00:00:00.000Z" },
    })

    expect(result).toEqual({
      success: true,
      data: reversalResult(),
      error: null,
      status: 200,
    })
    expect(mockReverseCustomerSettlementWithControls).toHaveBeenCalledTimes(1)
    expect(mockReverseCustomerSettlementWithControls).toHaveBeenCalledWith(
      validInput(),
      {
        organizationId: "org-session",
        actorId: "user-session",
        actorPermissions: ["finance.receivables.reverse"],
        freshAuth: {
          lastAuthAt: new Date("2026-08-08T10:00:00.000Z"),
          claims: {
            userId: "user-session",
            tenantId: "org-session",
            assuranceOrganizationId: "org-session",
            assuranceLevel: 1,
            lastAuthAt: Date.parse("2026-08-08T10:00:00.000Z"),
          },
        },
      },
    )
    expect(mockReverseCustomerSettlementWithControls.mock.calls[0][1]).not.toHaveProperty(
      "now",
    )
  })

  it.each([
    ["missing evidence", undefined],
    ["invalid timestamp", freshAuthFixture({}, new Date(Number.NaN))],
    [
      "non-Date timestamp",
      { ...freshAuthFixture(), lastAuthAt: "2026-08-08T10:00:00.000Z" },
    ],
    ["user identity", freshAuthFixture({ userId: "user-other" })],
    ["tenant identity", freshAuthFixture({ tenantId: "org-other" })],
    [
      "assurance organization",
      freshAuthFixture({ assuranceOrganizationId: "org-other" }),
    ],
    ["assurance level", freshAuthFixture({ assuranceLevel: 0 })],
    ["nonnumeric assurance level", freshAuthFixture({ assuranceLevel: "1" })],
    [
      "authentication timestamp",
      freshAuthFixture({ lastAuthAt: Date.parse("2026-08-08T09:59:00.000Z") }),
    ],
  ])("fails closed for %s mismatch", async (_name, freshAuth) => {
    setContextOverride({ freshAuth })

    await expect(reverseCustomerSettlementAction(validInput())).rejects.toThrow(
      "Fresh authentication required",
    )

    expect(mockReverseCustomerSettlementWithControls).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("rejects malformed input before calling the service", async () => {
    await expect(
      reverseCustomerSettlementAction({ ...validInput(), reason: "x" }),
    ).rejects.toThrow()

    expect(mockReverseCustomerSettlementWithControls).not.toHaveBeenCalled()
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it("revalidates affected surfaces only after a successful reversal", async () => {
    await reverseCustomerSettlementAction(validInput())

    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/dashboard/finance/receivables", "page"],
      ["/dashboard/accounting", "page"],
    ])
  })

  it("does not revalidate when the reversal service fails", async () => {
    mockReverseCustomerSettlementWithControls.mockRejectedValue(
      new Error("reversal denied"),
    )

    await expect(reverseCustomerSettlementAction(validInput())).rejects.toThrow(
      "reversal denied",
    )

    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })
})

function protectOptions() {
  return (
    globalThis as typeof globalThis & {
      __customerSettlementProtectOptions?: Record<string, unknown>
    }
  ).__customerSettlementProtectOptions
}

function setContextOverride(value: Record<string, unknown> | undefined) {
  const store = globalThis as typeof globalThis & {
    __customerSettlementContextOverride?: Record<string, unknown>
  }
  if (value) store.__customerSettlementContextOverride = value
  else delete store.__customerSettlementContextOverride
}

function freshAuthFixture(
  claimOverrides: Record<string, unknown> = {},
  lastAuthAt = new Date("2026-08-08T10:00:00.000Z"),
) {
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

function validInput() {
  return {
    customerSettlementId: "settlement-1",
    reversalDate: "2026-08-08T10:00:00.000Z",
    reason: "Duplicate customer collection",
    idempotencyKey: "reverse-settlement-1",
    correlationId: "correlation-reverse-1",
    documentHash: "a".repeat(64),
    evidenceHash: "b".repeat(64),
  }
}

function reversalResult() {
  return {
    settlementId: "settlement-1",
    status: "REVERSED",
    originalCustomerLedgerEntryIds: ["ledger-original-1"],
    reversalCustomerLedgerEntryIds: ["ledger-reversal-1"],
    originalPostingBatchId: "batch-original-1",
    originalJournalEntryId: "journal-original-1",
    reversalPostingBatchId: "batch-reversal-1",
    reversalJournalEntryId: "journal-reversal-1",
    reversalSourceLinkId: "source-link-reversal-1",
    reversalBusinessEventId: "event-reversal-1",
    reversalDate: "2026-08-08T10:00:00.000Z",
    replayed: false,
  }
}
