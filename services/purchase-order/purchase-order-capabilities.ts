import type { PurchaseOrderStatus } from "./purchase-order.schemas"
import {
  canArchivePurchaseOrderStatus,
  canReceivePurchaseOrderStatus,
  canTransition,
} from "./purchase-order.service"

export type PurchaseOrderActionCapability = Readonly<{
  allowed: boolean
  reason: string | null
}>

export type PurchaseOrderCapabilities = Readonly<{
  edit: PurchaseOrderActionCapability
  submit: PurchaseOrderActionCapability
  approve: PurchaseOrderActionCapability
  receive: PurchaseOrderActionCapability
  cancel: PurchaseOrderActionCapability
  archive: PurchaseOrderActionCapability
  complete: PurchaseOrderActionCapability
  clone: PurchaseOrderActionCapability
}>

export type PurchaseOrderPresentation = Readonly<{
  currency: string
  capabilities: PurchaseOrderCapabilities
}>

type CapabilityLine = Readonly<{
  orderedQuantity: unknown
  receivedQuantity?: unknown
}>

type CapabilityOrder = Readonly<{
  status: PurchaseOrderStatus
  createdById?: string | null
  lines?: readonly CapabilityLine[] | null
}>

type CapabilityActor = Readonly<{
  userId: string
  permissions: readonly string[]
}>

const allowed = (): PurchaseOrderActionCapability => ({ allowed: true, reason: null })
const denied = (reason: string): PurchaseOrderActionCapability => ({ allowed: false, reason })

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0
  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (value && typeof value === "object" && "toNumber" in value) {
    const parsed = Number((value as { toNumber: () => number }).toNumber())
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function hasPermission(actor: CapabilityActor, permission: string) {
  return actor.permissions.includes(permission)
}

function permissionDenied(permission: string) {
  return denied(`This action requires the ${permission} permission.`)
}

export function derivePurchaseOrderCreateCapability(
  permissions: readonly string[],
): PurchaseOrderActionCapability {
  return permissions.includes("purchases.orders.create")
    ? allowed()
    : permissionDenied("purchases.orders.create")
}

export function derivePurchaseOrderCapabilities(
  order: CapabilityOrder,
  actor: CapabilityActor,
): PurchaseOrderCapabilities {
  const lines = order.lines ?? []
  const remainingQuantity = lines.reduce(
    (total, line) => total + Math.max(0, numberValue(line.orderedQuantity) - numberValue(line.receivedQuantity)),
    0,
  )

  const edit = !hasPermission(actor, "purchases.orders.update")
    ? permissionDenied("purchases.orders.update")
    : order.status !== "DRAFT"
      ? denied("Only draft purchase orders can be edited.")
      : allowed()

  const submit = !hasPermission(actor, "purchases.orders.update")
    ? permissionDenied("purchases.orders.update")
    : !canTransition(order.status, "SUBMITTED")
      ? denied("Only draft purchase orders can be submitted.")
      : lines.length === 0
        ? denied("Add at least one line item before submitting this purchase order.")
        : allowed()

  const approve = !hasPermission(actor, "purchases.orders.approve")
    ? permissionDenied("purchases.orders.approve")
    : !canTransition(order.status, "APPROVED")
      ? denied("Only submitted purchase orders can be approved.")
      : order.createdById === actor.userId
        ? denied("The requester cannot approve their own purchase order.")
        : allowed()

  const receive = !hasPermission(actor, "purchases.orders.receive")
    ? permissionDenied("purchases.orders.receive")
    : !canReceivePurchaseOrderStatus(order.status)
      ? denied("Items can be received only after the purchase order is approved.")
      : remainingQuantity <= 0
        ? denied("All ordered quantities have already been received.")
        : allowed()

  const cancel = !hasPermission(actor, "purchases.orders.cancel")
    ? permissionDenied("purchases.orders.cancel")
    : !canTransition(order.status, "CANCELLED")
      ? denied("This purchase order can no longer be cancelled in its current status.")
      : allowed()

  const archive = !hasPermission(actor, "purchases.delete")
    ? permissionDenied("purchases.delete")
    : !canArchivePurchaseOrderStatus(order.status)
      ? denied("Received, partially received, and completed purchase orders cannot be archived.")
      : allowed()

  const complete = !hasPermission(actor, "purchases.orders.update")
    ? permissionDenied("purchases.orders.update")
    : order.status === "PARTIALLY_RECEIVED"
      ? denied(
          "Completion requires all ordered quantities to be received. Short-close is unavailable until a residual-quantity policy is configured.",
        )
      : !canTransition(order.status, "COMPLETED")
        ? denied("Only fully received purchase orders can be completed.")
        : allowed()

  return {
    edit,
    submit,
    approve,
    receive,
    cancel,
    archive,
    complete,
    clone: derivePurchaseOrderCreateCapability(actor.permissions),
  }
}

export function projectPurchaseOrderForActor<T extends CapabilityOrder>(
  order: T,
  actor: CapabilityActor,
  currency: string,
): T & PurchaseOrderPresentation {
  return {
    ...order,
    currency,
    capabilities: derivePurchaseOrderCapabilities(order, actor),
  }
}
