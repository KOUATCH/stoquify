const mockRevalidateTag = jest.fn()

jest.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}))

jest.mock("@/lib/security/auth-session", () => ({
  requireFreshAuth: jest.fn(),
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {},
}))

jest.mock("@/lib/security/rbac", () => ({
  RbacError: class RbacError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly status: number,
    ) {
      super(message)
    }
  },
  requirePermission: jest.fn(),
  isRbacError: (error: unknown) =>
    error instanceof Error && error.constructor.name === "RbacError",
}))

jest.mock("@/services/modules/module-entitlement.service", () => ({
  observeModuleAccess: jest.fn(),
}))

jest.mock("@/services/order-to-cash/delivery-order.service", () => ({
  createDeliveryOrder: jest.fn(),
  confirmDeliveryOrder: jest.fn(),
  postDeliveryGoodsIssue: jest.fn(),
  createDeliveryBillingOutcome: jest.fn(),
}))

import { requireFreshAuth } from "@/lib/security/auth-session"
import { requirePermission } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  confirmDeliveryOrder,
  createDeliveryBillingOutcome,
  createDeliveryOrder,
  postDeliveryGoodsIssue,
} from "@/services/order-to-cash/delivery-order.service"
import {
  confirmDeliveryOrderAction,
  createDeliveryBillingOutcomeAction,
  createDeliveryOrderAction,
  postDeliveryGoodsIssueAction,
} from "../delivery-order.actions"

const mockRequirePermission = requirePermission as jest.Mock
const mockRequireFreshAuth = requireFreshAuth as jest.Mock
const mockObserveModuleAccess = observeModuleAccess as jest.Mock
const mockCreate = createDeliveryOrder as jest.Mock
const mockConfirm = confirmDeliveryOrder as jest.Mock
const mockIssue = postDeliveryGoodsIssue as jest.Mock
const mockBill = createDeliveryBillingOutcome as jest.Mock

function context(permission: string) {
  return {
    userId: "actor-1",
    orgId: "org-trusted",
    permissions: [permission],
    roles: [],
    isSuperUser: false,
    fetchedAt: Date.now(),
    source: "better-auth",
  }
}

function result(version: number) {
  return { order: { id: "order-1", locationId: "loc-1", version }, replayed: false }
}

describe("delivery order-to-cash actions", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRequireFreshAuth.mockResolvedValue({ claims: { lastAuthAt: Date.now() } })
    mockObserveModuleAccess.mockResolvedValue({ allowed: true, wouldBlock: false })
    mockCreate.mockResolvedValue(result(0))
    mockConfirm.mockResolvedValue(result(1))
    mockIssue.mockResolvedValue(result(2))
    mockBill.mockResolvedValue(result(3))
  })

  it("derives tenant and actor for creation and ignores caller-supplied identities", async () => {
    mockRequirePermission.mockResolvedValue(context("sales.orders.create"))

    const response = await createDeliveryOrderAction({
      organizationId: "org-attacker",
      actorId: "actor-attacker",
      commandId: "create-1",
      customerId: "customer-1",
      locationId: "loc-1",
      lines: [{ itemId: "item-1", quantity: "2.000" }],
    })

    expect(response.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith("sales.orders.create", {
      resource: "DeliveryOrder",
      auditAllowed: true,
    })
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-trusted",
      actorId: "actor-1",
      commandId: "create-1",
    }))
    expect(mockCreate.mock.calls[0][0]).not.toMatchObject({
      organizationId: "org-attacker",
      actorId: "actor-attacker",
    })
  })

  it.each([
    [confirmDeliveryOrderAction, mockConfirm, "sales.orders.update"],
    [postDeliveryGoodsIssueAction, mockIssue, "inventory.levels.adjust"],
  ])("enforces the command-specific permission", async (action, service, permission) => {
    mockRequirePermission.mockResolvedValue(context(permission))

    const response = await action({
      commandId: `${permission}-1`,
      salesOrderId: "order-1",
      expectedVersion: 0,
    })

    expect(response.success).toBe(true)
    expect(mockRequirePermission).toHaveBeenCalledWith(permission, expect.any(Object))
    expect(service).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-trusted",
      actorId: "actor-1",
      salesOrderId: "order-1",
    }))
  })

  it("requires fresh authentication before creating the billing and AR outcome", async () => {
    mockRequirePermission.mockResolvedValue(context("accounting.journal.post"))

    const response = await createDeliveryBillingOutcomeAction({
      commandId: "bill-1",
      salesOrderId: "order-1",
      expectedVersion: 2,
    })

    expect(response.success).toBe(true)
    expect(mockRequireFreshAuth).toHaveBeenCalledWith(300)
    expect(mockRequirePermission).toHaveBeenCalledWith("accounting.journal.post", {
      resource: "DeliveryBillingOutcome",
      auditAllowed: true,
    })
    expect(mockBill).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org-trusted",
      actorId: "actor-1",
    }))
  })

  it("fails closed when the sales module is not entitled", async () => {
    mockRequirePermission.mockResolvedValue(context("sales.orders.update"))
    mockObserveModuleAccess.mockResolvedValue({ allowed: false, wouldBlock: true, result: "deny" })

    const response = await confirmDeliveryOrderAction({
      commandId: "confirm-denied",
      salesOrderId: "order-1",
      expectedVersion: 0,
    })

    expect(response).toEqual(expect.objectContaining({ success: false, status: 403 }))
    expect(mockConfirm).not.toHaveBeenCalled()
  })
})
