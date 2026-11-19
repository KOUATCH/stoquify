/** @jest-environment node */

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}))

jest.mock("@/prisma/db", () => ({ db: {} }))

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
      __customerSettlementProtectOptions?: Record<string, Record<string, unknown>>
      __customerSettlementContextOverride?: Record<string, unknown>
    }
    store.__customerSettlementProtectOptions ??= {}
    store.__customerSettlementProtectOptions[options.permission] = options

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

jest.mock("@/services/accounting/customer-settlement.service", () => ({
  collectCustomerSettlementWithControls: jest.fn(),
}))

jest.mock("@/services/accounting/customer-settlement-workbench.service", () => ({
  ...jest.requireActual("@/services/accounting/customer-settlement-workbench.service"),
  getCustomerSettlementWorkbench: jest.fn(),
}))

jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))

import { revalidatePath } from "next/cache"

import { reverseCustomerSettlementWithControls } from "@/services/accounting/customer-settlement-reversal.service"
import { collectCustomerSettlementWithControls } from "@/services/accounting/customer-settlement.service"
import { getCustomerSettlementWorkbench } from "@/services/accounting/customer-settlement-workbench.service"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"

import {
  collectCustomerSettlementAction,
  getCustomerSettlementWorkbenchAction,
  reverseCustomerSettlementAction,
} from "../customer-settlement.actions"

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
    expect(result).toEqual(JSON.parse(JSON.stringify(result)))
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
      ["/[locale]/dashboard/finance/receivables", "page"],
      ["/[locale]/dashboard/finance/receivables/history", "page"],
      ["/[locale]/dashboard/accounting", "layout"],
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

describe("customer settlement collection action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setContextOverride(undefined)
    ;(collectCustomerSettlementWithControls as jest.Mock).mockResolvedValue({
      settlementId: "settlement-1",
      settlement: { settlementNumber: "ARSET-1", status: "POSTED", amount: { toJSON: () => "25.00" } },
      journalEntryId: "journal-1",
      replayed: false,
    })
  })

  it("requires the critical collection permission, finance module and fresh authentication", () => {
    expect(protectOptions("finance.receivables.collect")).toEqual({
      permission: "finance.receivables.collect",
      auditResource: "CustomerSettlement",
      auditAllowed: true,
      freshAuth: { maxAgeSeconds: 300 },
      module: {
        moduleSlug: "finance",
        surface: "actions/finance/customer-settlement.actions.ts:collectCustomerSettlementAction",
        surfaceType: "action",
        accessIntent: "write",
        mode: "enforce",
        audit: true,
      },
    })
  })

  it("derives actor, tenant and last authentication only from the protected server context", async () => {
    setContextOverride({ permissions: ["finance.receivables.collect"] })
    const result = await collectCustomerSettlementAction({
      ...collectionInput(),
      organizationId: "org-attacker",
      actorId: "user-attacker",
      actorPermissions: ["*"],
      lastAuthAt: new Date(),
      now: new Date("1900-01-01"),
    })
    expect(collectCustomerSettlementWithControls).toHaveBeenCalledWith(collectionInput(), {
      organizationId: "org-session",
      actorId: "user-session",
      actorPermissions: ["finance.receivables.collect"],
      lastAuthAt: new Date("2026-08-08T10:00:00.000Z"),
    })
    expect(result).toEqual({ success: true, error: null, status: 200, data: {
      settlementId: "settlement-1", settlementNumber: "ARSET-1", status: "POSTED", journalEntryId: "journal-1", replayed: false,
    } })
    expect(result).toEqual(JSON.parse(JSON.stringify(result)))
    expect(result.data).not.toHaveProperty("settlement")
  })

  it.each([
    ["missing", undefined],
    ["actor", freshAuthFixture({ userId: "user-other" })],
    ["tenant", freshAuthFixture({ tenantId: "org-other" })],
    ["assurance organization", freshAuthFixture({ assuranceOrganizationId: "org-other" })],
    ["assurance level", freshAuthFixture({ assuranceLevel: 0 })],
    ["timestamp", freshAuthFixture({ lastAuthAt: 0 })],
  ])("rejects %s fresh-auth evidence", async (_label, freshAuth) => {
    setContextOverride({ freshAuth })
    await expect(collectCustomerSettlementAction(collectionInput())).rejects.toThrow("Fresh authentication required")
    expect(collectCustomerSettlementWithControls).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("forwards an explicitly selected native receipt while retaining trusted actor controls", async () => {
    const input = { ...collectionInput(), paymentTransactionId: "provider-receipt-1" }
    await collectCustomerSettlementAction({ ...input, providerAccountId: "forged-account", providerEventId: "forged-event" })
    expect(collectCustomerSettlementWithControls).toHaveBeenCalledWith(input, expect.objectContaining({ organizationId: "org-session", actorId: "user-session" }))
    expect((collectCustomerSettlementWithControls as jest.Mock).mock.calls[0][0]).not.toHaveProperty("providerAccountId")
  })

  it("rejects malformed allocations and does not invalidate on service failure", async () => {
    await expect(collectCustomerSettlementAction({ ...collectionInput(), allocations: [] })).rejects.toThrow()
    expect(collectCustomerSettlementWithControls).not.toHaveBeenCalled()
    ;(collectCustomerSettlementWithControls as jest.Mock).mockRejectedValue(new Error("collection denied"))
    await expect(collectCustomerSettlementAction(collectionInput())).rejects.toThrow("collection denied")
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("invalidates localized invoice, history and accounting surfaces only after success", async () => {
    await collectCustomerSettlementAction(collectionInput())
    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/[locale]/dashboard/finance/receivables", "page"],
      ["/[locale]/dashboard/finance/receivables/history", "page"],
      ["/[locale]/dashboard/accounting", "layout"],
    ])
  })
})

describe("customer settlement workbench read action", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setContextOverride({ permissions: ["finance.receivables.read", "finance.receivables.collect", "finance.receivables.reverse"] })
    ;(getCustomerSettlementWorkbench as jest.Mock).mockResolvedValue(workbenchResult())
    ;(requirePermission as jest.Mock).mockResolvedValue({
      orgId: "org-session", userId: "user-session",
      permissions: ["finance.receivables.read", "finance.receivables.collect", "finance.receivables.reverse"],
    })
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true })
  })

  it("requires a scoped read permission and enforced finance read module", () => {
    expect(protectOptions("finance.receivables.read")).toEqual({
      permission: "finance.receivables.read",
      auditResource: "CustomerSettlement",
      module: {
        moduleSlug: "finance",
        surface: "actions/finance/customer-settlement.actions.ts:getCustomerSettlementWorkbenchAction",
        surfaceType: "action", accessIntent: "read", mode: "enforce", audit: true,
      },
    })
  })

  it("returns the bounded plain DTO using server scope and rechecks authority", async () => {
    const result = await getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })
    expect(getCustomerSettlementWorkbench).toHaveBeenCalledWith(
      { customerId: "customer-1", referenceId: "document-1" },
      { organizationId: "org-session", actorUserId: "user-session", permissions: ["finance.receivables.read", "finance.receivables.collect", "finance.receivables.reverse"] },
    )
    expect(result.data).toEqual(workbenchResult())
    expect(result).toEqual(JSON.parse(JSON.stringify(result)))
    expect(requirePermission).toHaveBeenCalledWith("finance.receivables.read", { resource: "CustomerSettlement" })
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", userId: "user-session", moduleSlug: "finance", accessIntent: "read", mode: "enforce" }))
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it.each([
    { orgId: "org-other", userId: "user-session", permissions: ["finance.receivables.read"] },
    { orgId: "org-session", userId: "user-other", permissions: ["finance.receivables.read"] },
  ])("rejects changed tenant or actor after the read", async current => {
    ;(requirePermission as jest.Mock).mockResolvedValue(current)
    await expect(getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })).rejects.toThrow("workspace changed")
  })

  it("fails closed for revoked read/module access and rejects client scope", async () => {
    ;(requirePermission as jest.Mock).mockRejectedValueOnce(new Error("read revoked"))
    await expect(getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })).rejects.toThrow("read revoked")
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false })
    await expect(getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })).rejects.toThrow("Finance module is not available")
    ;(getCustomerSettlementWorkbench as jest.Mock).mockClear()
    await expect(getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1", organizationId: "org-other", openAmount: "999" })).rejects.toThrow()
    expect(getCustomerSettlementWorkbench).not.toHaveBeenCalled()
  })

  it("removes stale mutation capabilities if permissions are revoked during the read", async () => {
    ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org-session", userId: "user-session", permissions: ["finance.receivables.read"] })
    const result = await getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })
    expect(result.data).toEqual({ ...workbenchResult(), canCollect: false, providerReceipts: [], settlements: [expect.objectContaining({ canReverse: false })] })
  })

  it("does not return provider previews when the source document is already read-only", async () => {
    ;(getCustomerSettlementWorkbench as jest.Mock).mockResolvedValue({ ...workbenchResult(), canCollect: false })
    const result = await getCustomerSettlementWorkbenchAction({ customerId: "customer-1", referenceId: "document-1" })
    expect(result.data.providerReceipts).toEqual([])
  })
})

function protectOptions(permission = "finance.receivables.reverse") {
  return (
    globalThis as typeof globalThis & {
      __customerSettlementProtectOptions?: Record<string, Record<string, unknown>>
    }
  ).__customerSettlementProtectOptions?.[permission]
}

function collectionInput() {
  return {
    customerId: "customer-1", method: "BANK_TRANSFER", amount: "25.00",
    settlementDate: "2026-08-08T10:00:00.000Z",
    idempotencyKey: "collect-settlement-1", correlationId: "correlation-collect-1",
    documentHash: "a".repeat(64), evidenceHash: "b".repeat(64),
    allocations: [{ salesOrderId: "sale-1", amount: "25.00" }],
  }
}

function workbenchResult() {
  return {
    scope: { organizationId: "org-session", actorUserId: "user-session" },
    document: { customerId: "customer-1", referenceId: "document-1", salesOrderId: "sale-1", documentNumber: "AR-1", currency: "XAF", openAmount: "25.00", status: "PARTIALLY_PAID" },
    canCollect: true,
    providerReceipts: [{ id: "provider-receipt-1", method: "BANK_TRANSFER", providerReference: "BANK-RECEIPT-1", accountLabel: "Operating bank", amount: "25.00", currency: "XAF", occurredAt: "2026-08-08T10:00:00.000Z" }],
    settlements: [{ id: "settlement-1", settlementNumber: "ARSET-1", method: "BANK_TRANSFER", amount: "10.00", allocatedAmount: "10.00", currency: "XAF", settlementDate: "2026-08-08T10:00:00.000Z", status: "POSTED", externalReference: null, canReverse: true }],
  }
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
