import {
  derivePurchaseOrderCapabilities,
  derivePurchaseOrderCreateCapability,
} from "@/services/purchase-order/purchase-order-capabilities"

const allMutationPermissions = [
  "purchases.orders.create",
  "purchases.orders.update",
  "purchases.orders.approve",
  "purchases.orders.receive",
  "purchases.orders.cancel",
  "purchases.delete",
]

function order(
  status: "DRAFT" | "SUBMITTED" | "APPROVED" | "PARTIALLY_RECEIVED" | "RECEIVED",
  overrides: Record<string, unknown> = {},
) {
  return {
    status,
    createdById: "requester-1",
    lines: [{ orderedQuantity: 10, receivedQuantity: 0 }],
    ...overrides,
  }
}

describe("purchase-order server capability projection", () => {
  it("denies every mutation for a read-only actor", () => {
    const capabilities = derivePurchaseOrderCapabilities(order("DRAFT"), {
      userId: "viewer-1",
      permissions: ["purchases.orders.read"],
    })

    expect(derivePurchaseOrderCreateCapability(["purchases.orders.read"]).allowed).toBe(false)
    expect(Object.values(capabilities).every((capability) => !capability.allowed)).toBe(true)
  })

  it("allows only lifecycle-valid draft actions for an authorized buyer", () => {
    const capabilities = derivePurchaseOrderCapabilities(order("DRAFT"), {
      userId: "buyer-1",
      permissions: allMutationPermissions,
    })

    expect(derivePurchaseOrderCreateCapability(allMutationPermissions).allowed).toBe(true)
    expect(capabilities).toMatchObject({
      edit: { allowed: true },
      submit: { allowed: true },
      cancel: { allowed: true },
      archive: { allowed: true },
      clone: { allowed: true },
      approve: { allowed: false },
      receive: { allowed: false },
      complete: { allowed: false },
    })
  })

  it("enforces maker-checker approval in the projected capability", () => {
    const requesterCapabilities = derivePurchaseOrderCapabilities(order("SUBMITTED"), {
      userId: "requester-1",
      permissions: allMutationPermissions,
    })
    const approverCapabilities = derivePurchaseOrderCapabilities(order("SUBMITTED"), {
      userId: "approver-2",
      permissions: allMutationPermissions,
    })

    expect(requesterCapabilities.approve).toEqual({
      allowed: false,
      reason: "The requester cannot approve their own purchase order.",
    })
    expect(approverCapabilities.approve.allowed).toBe(true)
  })

  it("allows receiving but denies archive and unsupported short-close for a partial receipt", () => {
    const capabilities = derivePurchaseOrderCapabilities(
      order("PARTIALLY_RECEIVED", {
        lines: [{ orderedQuantity: 10, receivedQuantity: 4 }],
      }),
      { userId: "receiver-1", permissions: allMutationPermissions },
    )

    expect(capabilities.receive.allowed).toBe(true)
    expect(capabilities.cancel.allowed).toBe(true)
    expect(capabilities.archive.allowed).toBe(false)
    expect(capabilities.complete).toEqual({
      allowed: false,
      reason:
        "Completion requires all ordered quantities to be received. Short-close is unavailable until a residual-quantity policy is configured.",
    })
  })
})
