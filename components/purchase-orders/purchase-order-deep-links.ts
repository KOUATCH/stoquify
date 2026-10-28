import type { PurchaseOrderActionCapability } from "@/services/purchase-order/purchase-order-capabilities"

export function resolveReceiveDeepLink(
  requestedAction: "receive" | undefined,
  capability: PurchaseOrderActionCapability,
) {
  if (requestedAction !== "receive") {
    return { open: false, explanation: null } as const
  }

  if (capability.allowed) {
    return { open: true, explanation: null } as const
  }

  return {
    open: false,
    explanation: capability.reason ?? "Receiving is unavailable for this purchase order.",
  } as const
}
