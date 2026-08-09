jest.mock("@/services/_shared/protect", () => ({
  protect: jest.fn((_options, handler) => {
    return async (input: unknown) => {
      const data = await handler(input, {
        orgId: "org-1",
        userId: "user-1",
        permissions: ["accounting.exports.create"],
      })
      return { success: true, data, error: null, status: 200 }
    }
  }),
}))

jest.mock("@/services/accounting/customer-statement.service", () => ({
  createCustomerStatementSnapshot: jest.fn(),
}))

jest.mock("@/services/accounting/customer-statement-delivery.service", () => ({
  queueCustomerStatementDelivery: jest.fn(),
}))

jest.mock("@/services/accounting/customer-statement-access.service", () => ({
  revokeCustomerStatementAccessToken: jest.fn(),
}))

import { revokeCustomerStatementAccessToken } from "@/services/accounting/customer-statement-access.service"
import { queueCustomerStatementDelivery } from "@/services/accounting/customer-statement-delivery.service"
import { createCustomerStatementSnapshot } from "@/services/accounting/customer-statement.service"
import { protect } from "@/services/_shared/protect"
import {
  createCustomerStatementAction,
  queueCustomerStatementDeliveryAction,
  revokeCustomerStatementAccessAction,
} from "../customer-statement.actions"

const mockCreate = createCustomerStatementSnapshot as jest.Mock
const mockQueue = queueCustomerStatementDelivery as jest.Mock
const mockRevoke = revokeCustomerStatementAccessToken as jest.Mock
const mockProtect = protect as jest.Mock

describe("customer statement actions", () => {
  beforeEach(() => {
    mockCreate.mockClear()
    mockQueue.mockClear()
    mockRevoke.mockClear()
    mockCreate.mockResolvedValue({ statementId: "statement-1" })
    mockQueue.mockResolvedValue({ deliveryId: "delivery-1" })
    mockRevoke.mockResolvedValue({
      token: { id: "token-1", status: "REVOKED" },
      replayed: false,
    })
  })

  it("registers every statement mutation behind the enforced accounting entitlement", () => {
    expect(mockProtect).toHaveBeenCalledTimes(3)
    expect(mockProtect.mock.calls.map(([options]) => options)).toEqual([
      expect.objectContaining({
        permission: "accounting.exports.create",
        auditResource: "CustomerStatementSnapshot",
        auditAllowed: true,
        module: {
          moduleSlug: "accounting",
          surface: "actions/accounting/customer-statement.actions.ts:create",
          surfaceType: "action",
          accessIntent: "export",
          mode: "enforce",
          audit: true,
        },
      }),
      expect.objectContaining({
        permission: "accounting.exports.create",
        auditResource: "CustomerStatementDelivery",
        auditAllowed: true,
        module: {
          moduleSlug: "accounting",
          surface: "actions/accounting/customer-statement.actions.ts:deliver",
          surfaceType: "action",
          accessIntent: "export",
          mode: "enforce",
          audit: true,
        },
      }),
      expect.objectContaining({
        permission: "accounting.exports.create",
        auditResource: "CustomerStatementAccessToken",
        auditAllowed: true,
        module: {
          moduleSlug: "accounting",
          surface: "actions/accounting/customer-statement.actions.ts:revoke",
          surfaceType: "action",
          accessIntent: "write",
          mode: "enforce",
          audit: true,
        },
      }),
    ])
  })

  it("derives statement tenant and generator from the protected context", async () => {
    await createCustomerStatementAction({
      organizationId: "attacker-org",
      generatedById: "attacker-user",
      customerId: "customer-1",
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-07-31T23:59:59.999Z",
      currency: "xaf",
      idempotencyKey: "statement-key-1",
      correlationId: "statement-correlation-1",
    })

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        generatedById: "user-1",
        customerId: "customer-1",
        currency: "XAF",
        periodStart: expect.any(Date),
        periodEnd: expect.any(Date),
      }),
    )
  })

  it("derives delivery issuer from the protected context", async () => {
    await queueCustomerStatementDeliveryAction({
      organizationId: "attacker-org",
      issuedById: "attacker-user",
      statementSnapshotId: "statement-1",
      channel: "EMAIL",
      destination: "customer@example.test",
      consentBasis: "EXPLICIT",
      consentEvidenceHash: `sha256:${"a".repeat(64)}`,
      consentCapturedAt: "2026-08-09T16:00:00.000Z",
      idempotencyKey: "delivery-key-1",
      correlationId: "delivery-correlation-1",
    })

    expect(mockQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        organizationId: "org-1",
        issuedById: "user-1",
        statementSnapshotId: "statement-1",
        destination: "customer@example.test",
      }),
    )
  })

  it("scopes access-token revocation to the protected tenant and actor", async () => {
    await revokeCustomerStatementAccessAction({
      organizationId: "attacker-org",
      revokedById: "attacker-user",
      tokenId: "token-1",
      reason: "Customer requested a new link",
    })

    expect(mockRevoke).toHaveBeenCalledWith({
      organizationId: "org-1",
      revokedById: "user-1",
      tokenId: "token-1",
      reason: "Customer requested a new link",
    })
  })
})
