import { revalidateTag } from "next/cache"
import { getAuthenticatedUser } from "@/lib/auth-server"
import { requirePermission } from "@/lib/security/rbac"
import { postInventoryReservation } from "@/services/inventory/inventory-stock-event.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { reserveInventory as reserveBatch } from "../inventoryActions"
import { reserveInventory, reserveInventoryMovement } from "../inventoryMovementActions"

jest.mock("@/lib/error-handling", () => ({ inventoryAction: (handler: unknown) => handler }))
jest.mock("@/lib/auth-server", () => ({ getAuthenticatedUser: jest.fn() }))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/inventory/inventory-stock-event.service", () => ({ postInventoryReservation: jest.fn() }))
jest.mock("@/services/inventory/inventory-adjustment.service", () => ({}))
jest.mock("@/services/inventory/inventory-read.service", () => ({}))
jest.mock("@/services/inventory/inventory-transfer.service", () => ({}))
jest.mock("@/services/item/item.service", () => ({}))
jest.mock("next/cache", () => ({ revalidateTag: jest.fn(), revalidatePath: jest.fn() }))

const permission = requirePermission as jest.Mock
const observe = observeModuleAccess as jest.Mock
const reserve = postInventoryReservation as jest.Mock
const expiresAt = new Date("2026-09-06T12:00:00Z")
const input = { organizationId: "org-session", itemId: "item-1", locationId: "loc-1", quantity: 3, reason: "Owned reservation", expiresAt }
const adapters = [
  { name: "movement", call: (organizationId = input.organizationId) => reserveInventoryMovement({ ...input, organizationId }), surface: "actions/inventory/inventoryMovementActions.ts:reserveInventoryMovement" },
  { name: "legacy batch", call: (organizationId = input.organizationId) => reserveBatch({ data: { organizationId, reservations: [{ inventoryLevelId: "level-1", itemId: input.itemId, locationId: input.locationId, quantity: input.quantity }] } }), surface: "actions/inventory/inventoryActions.ts:reserveInventory" },
]

beforeEach(() => {
  jest.clearAllMocks()
  permission.mockReset().mockResolvedValue({ orgId: "org-session", userId: "actor-session", permissions: ["inventory.levels.adjust"] })
  observe.mockReset().mockResolvedValue({ allowed: true })
  reserve.mockReset().mockResolvedValue({ reservationId: "saved-1" })
  ;(getAuthenticatedUser as jest.Mock).mockReset().mockResolvedValue({ id: "legacy-auth-actor" })
})

describe.each(adapters)("$name reservation authority", ({ call, surface }) => {
  it("rejects a foreign organization before any module lookup or stock effect", async () => {
    await expect(call("org-foreign")).rejects.toThrow("Organization mismatch")
    expect(observe).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it.each(["permission denied", "no authenticated session"])("rejects %s before any stock effect", async (message) => {
    permission.mockRejectedValueOnce(new Error(message))
    await expect(call()).rejects.toThrow(message)
    expect(observe).not.toHaveBeenCalled()
    expect(reserve).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("enforces the inventory write decision before reserving", async () => {
    observe.mockResolvedValueOnce({ allowed: false })
    await expect(call()).rejects.toThrow("Inventory module is not available")
    expect(reserve).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("does not turn a failed authority read into permission", async () => {
    observe.mockRejectedValueOnce(new Error("authority unavailable"))
    await expect(call()).rejects.toThrow("authority unavailable")
    expect(reserve).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("uses current RBAC identity and exact enforced write scope", async () => {
    const result = await call()
    expect(result.success).toBe(true)
    expect(permission).toHaveBeenCalledWith("inventory.levels.adjust", expect.objectContaining({ resource: "InventoryReservation", auditAllowed: true }))
    expect(observe).toHaveBeenCalledWith({ organizationId: "org-session", userId: "actor-session", actorPermissions: ["inventory.levels.adjust"], moduleSlug: "inventory", surfaceType: "action", surface, accessIntent: "write", mode: "enforce", audit: true })
    expect(reserve).toHaveBeenCalledTimes(1)
    expect(reserve).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "org-session", actorId: "actor-session", itemId: "item-1", locationId: "loc-1", quantity: 3 }))
  })

  it("preserves a kernel failure without successful cache refresh", async () => {
    reserve.mockRejectedValueOnce(new Error("stock changed"))
    await expect(call()).rejects.toThrow("stock changed")
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})

it("keeps reason/expiry and the positional compatibility entry behind the same guard", async () => {
  await reserveInventory(input.itemId, input.locationId, input.quantity, input.reason, input.organizationId, expiresAt)
  expect(reserve).toHaveBeenCalledWith({ ...input, actorId: "actor-session" })
  permission.mockRejectedValueOnce(new Error("permission revoked"))
  await expect(reserveInventory(input.itemId, input.locationId, input.quantity, input.reason, input.organizationId)).rejects.toThrow("permission revoked")
  expect(reserve).toHaveBeenCalledTimes(1)
})

it("denies the entire legacy batch before its first stock effect", async () => {
  observe.mockResolvedValueOnce({ allowed: false })
  await expect(reserveBatch({ data: { organizationId: input.organizationId, reservations: [1, 2].map(index => ({ inventoryLevelId: `level-${index}`, itemId: `item-${index}`, locationId: input.locationId, quantity: 1 })) } })).rejects.toThrow("Inventory module is not available")
  expect(reserve).not.toHaveBeenCalled()
})
