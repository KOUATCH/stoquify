import { Prisma } from "@prisma/client"
import { ZodError } from "zod"
import * as actions from "@/actions/item/items"
import * as services from "@/services/item/item.service"
import { ApplicationError, BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from "@/services/_shared/action-errors"
import { requirePermission } from "@/lib/security/rbac"
import { revalidateItem } from "@/lib/item/revalidation"
import { logger } from "@/lib/logger"
import { revalidatePath, revalidateTag } from "next/cache"

jest.mock("@/services/item/item.service", () => ({
  getItemWithRelations: jest.fn(), listItemsWithRelations: jest.fn(),
  updateItemBasicInfoWithRelations: jest.fn(), updateItemDetailsWithRelations: jest.fn(),
  updateItemPricingWithRelations: jest.fn(), updateItemRelationsWithRelations: jest.fn(),
  updateItemStockFromForm: jest.fn(), updateItemTrackingWithRelations: jest.fn(), archiveItem: jest.fn(),
}))
jest.mock("@/lib/security/rbac", () => ({ requirePermission: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/lib/item/revalidation", () => ({ revalidateItem: jest.fn() }))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))

const sentinel = "PRIVATE_CANARY_7b98_customer_margin"
const item = { id: "item-1", organizationId: "server-org", nameEn: "Rice" }
const input = { id: item.id, organizationId: "forged-org" }
const permission = requirePermission as jest.Mock
const cases = [
  { name: "getItemAction", action: actions.getItemAction, service: services.getItemWithRelations, permission: "inventory.items.read", fallback: "Failed to fetch item" },
  { name: "listItemsAction", action: actions.listItemsAction, service: services.listItemsWithRelations, permission: "inventory.items.read", fallback: "Failed to list items" },
  { name: "updateItemBasicInfoAction", action: actions.updateItemBasicInfoAction, service: services.updateItemBasicInfoWithRelations, permission: "inventory.items.update", fallback: "Failed to update item", message: "Item updated" },
  { name: "updateItemDetailsAction", action: actions.updateItemDetailsAction, service: services.updateItemDetailsWithRelations, permission: "inventory.items.update", fallback: "Failed to update item details", message: "Item details updated" },
  { name: "updateItemPricingAction", action: actions.updateItemPricingAction, service: services.updateItemPricingWithRelations, permission: "inventory.items.update", fallback: "Failed to update pricing", message: "Item pricing updated" },
  { name: "updateItemRelationsAction", action: actions.updateItemRelationsAction, service: services.updateItemRelationsWithRelations, permission: "inventory.items.update", fallback: "Failed to update relations", message: "Item relations updated" },
  { name: "updateItemStockAction", action: actions.updateItemStockAction, service: services.updateItemStockFromForm, permission: "inventory.items.update", fallback: "Failed to update stock", message: "Stock change submitted for approval" },
  { name: "updateItemTrackingAction", action: actions.updateItemTrackingAction, service: services.updateItemTrackingWithRelations, permission: "inventory.items.update", fallback: "Failed to update tracking", message: "Item tracking updated" },
  { name: "deleteItemAction", action: actions.deleteItemAction, service: services.archiveItem, permission: "inventory.items.delete", fallback: "Failed to delete item", message: "Item deleted" },
]
const failures = [
  ["plain service Error", () => new Error(sentinel)],
  ["thrown string", () => sentinel],
  ["unknown provider code", () => Object.assign(new Error(sentinel), { code: "E_PROVIDER", status: 422 })],
  ["Prisma unique conflict", () => new Prisma.PrismaClientKnownRequestError(sentinel, { code: "P2002", clientVersion: "6.19.3", meta: { target: [sentinel] } })],
  ["Prisma missing record", () => new Prisma.PrismaClientKnownRequestError(sentinel, { code: "P2025", clientVersion: "6.19.3" })],
  ["unapproved typed business error", () => new BusinessRuleError(sentinel)],
  ["unapproved typed not found", () => new NotFoundError(sentinel)],
  ["unapproved typed conflict", () => new ConflictError(sentinel)],
  ["non-exposing typed error", () => new ApplicationError("BUSINESS_RULE_VIOLATION", sentinel, 422, false)],
  ["message-shaped object", () => ({ message: sentinel, code: "NOT_FOUND", status: 404 })],
] as const

beforeEach(() => {
  jest.resetAllMocks()
  permission.mockResolvedValue({ orgId: "server-org", userId: "server-user", permissions: [] })
  for (const entry of cases) (entry.service as jest.Mock).mockResolvedValue(item)
})

describe.each(cases)("$name response boundary", entry => {
  test.each(failures)("redacts %s", async (_label, makeError) => {
    ;(entry.service as jest.Mock).mockRejectedValue(makeError())
    expect(await entry.action(input)).toEqual({ success: false, error: entry.fallback })
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
    expect(logger.error).toHaveBeenCalledWith("Item action failed", expect.objectContaining({ correlationId: expect.any(String), code: expect.any(String) }))
    expect(revalidateItem).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  test.each([
    ["arbitrary guard detail", () => new Error(sentinel), entry.fallback],
    ["forbidden guard detail", () => new ForbiddenError(sentinel), "Forbidden"],
    ["unauthenticated detail", () => Object.assign(new Error(sentinel), { code: "UNAUTHENTICATED" }), "Unauthenticated"],
    ["missing active org detail", () => Object.assign(new Error(sentinel), { code: "NO_ACTIVE_ORG" }), "Unauthenticated"],
  ] as const)("denies %s before any service/write", async (_label, makeError, expected) => {
    permission.mockRejectedValue(makeError())
    expect(await entry.action(input)).toEqual({ success: false, error: expected })
    for (const candidate of cases) expect(candidate.service).not.toHaveBeenCalled()
    expect(revalidateItem).not.toHaveBeenCalled()
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  test("rejects invalid input before guards or service calls", async () => {
    expect(await entry.action({})).toEqual({ success: false, error: "Invalid input. Please review the form and try again." })
    expect(permission).not.toHaveBeenCalled()
    expect(entry.service).not.toHaveBeenCalled()
  })

  test("redacts Zod issue metadata", async () => {
    ;(entry.service as jest.Mock).mockRejectedValue(new ZodError([{ code: "custom", path: [sentinel], message: sentinel }]))
    expect(await entry.action(input)).toEqual({ success: false, error: "Invalid input. Please review the form and try again." })
    expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
  })

  test("preserves fresh authentication recovery without its private detail", async () => {
    permission.mockRejectedValue(Object.assign(new Error(sentinel), { name: "FreshAuthRequiredError" }))
    expect(await entry.action(input)).toEqual({ success: false, error: "Fresh authentication required" })
    expect(entry.service).not.toHaveBeenCalled()
  })

  test.each(["NEXT_REDIRECT;replace;/login;307;", "NEXT_NOT_FOUND"])("preserves framework control flow %s", async digest => {
    const error = Object.assign(new Error(sentinel), { digest })
    permission.mockRejectedValue(error)
    await expect(entry.action(input)).rejects.toBe(error)
    expect(entry.service).not.toHaveBeenCalled()
  })

  test("keeps authorized success and server-owned tenant arguments", async () => {
    const data = entry.name === "listItemsAction" ? { data: [item], total: 1, page: 1, pageSize: 20, totalPages: 1 } : item
    ;(entry.service as jest.Mock).mockResolvedValue(data)
    const result = await entry.action(input)
    expect(result).toEqual({ success: true, data: entry.name === "deleteItemAction" ? { id: item.id } : data, ...(entry.message ? { message: entry.message } : {}) })
    expect(permission).toHaveBeenCalledWith(entry.permission, {
      resource: "Item", ...(entry.name === "listItemsAction" ? {} : { resourceId: item.id }), auditAllowed: !!entry.message,
    })
    expect(entry.service).toHaveBeenCalledTimes(1)
    const args = (entry.service as jest.Mock).mock.calls[0]
    if (entry.name === "listItemsAction") expect(args[0].organizationId).toBe("server-org")
    else expect(args.slice(0, entry.name === "updateItemStockAction" ? 3 : 2)).toEqual(entry.name === "updateItemStockAction" ? ["server-org", "server-user", item.id] : ["server-org", item.id])
    if (entry.name === "deleteItemAction") {
      expect(revalidateTag).toHaveBeenNthCalledWith(1, "items")
      expect(revalidateTag).toHaveBeenNthCalledWith(2, "item-item-1")
      expect(revalidateTag).toHaveBeenNthCalledWith(3, "org-server-org-items")
      expect(revalidatePath).toHaveBeenCalledWith("/dashboard/inventory/items")
    } else if (entry.message) expect(revalidateItem).toHaveBeenCalledWith(item.id, "server-org")
    else expect(revalidateItem).not.toHaveBeenCalled()
  })
})

test("keeps explicit absent item response", async () => {
  ;(services.getItemWithRelations as jest.Mock).mockResolvedValue(null)
  expect(await actions.getItemAction(input)).toEqual({ success: false, error: "Item not found" })
})

test.each(cases.filter(entry => !!entry.message))("$name preserves typed Item not found", async entry => {
  ;(entry.service as jest.Mock).mockRejectedValue(new NotFoundError("Item not found"))
  expect(await entry.action(input)).toEqual({ success: false, error: "Item not found" })
})

test.each([
  ["updateItemBasicInfoAction", new BusinessRuleError("Upload an image before saving this item.")],
  ["updateItemBasicInfoAction", new BusinessRuleError("This image is unavailable. Upload it again before saving.")],
  ["updateItemDetailsAction", new ConflictError("Another item with this SKU already exists")],
  ["updateItemStockAction", new BusinessRuleError("Item is not inventory-tracked.")],
  ["updateItemStockAction", new BusinessRuleError("A default active location is required before requesting a stock adjustment.")],
  ["updateItemStockAction", new BusinessRuleError("One or more adjustment items were not found for this organization.")],
  ["updateItemStockAction", new NotFoundError("Item not found or inactive for this organization.")],
  ["updateItemStockAction", new NotFoundError("Inventory location not found or inactive for this organization.")],
  ["updateItemStockAction", new NotFoundError("Adjustment location not found.")],
  ["updateItemStockAction", new NotFoundError("Active organization not found")],
  ["updateItemStockAction", new ConflictError("Operation policy is ambiguous")],
  ["updateItemStockAction", new ConflictError("The stored operation policy requires reconciliation")],
  ["updateItemStockAction", new ConflictError("Capability dependencies require reconciliation")],
  ["updateItemStockAction", new ApplicationError("FORBIDDEN", "This capability is not accepting new work. Existing records and permitted completion workflows remain available.", 403)],
] as const)("%s preserves approved %s", async (name, error) => {
  const entry = cases.find(candidate => candidate.name === name)!
  ;(entry.service as jest.Mock).mockRejectedValue(error)
  expect(await entry.action(input)).toEqual({ success: false, error: error.message })
})

test("does not trust a provider error borrowing an approved business message", async () => {
  ;(services.updateItemDetailsWithRelations as jest.Mock).mockRejectedValue(Object.assign(new Error("Another item with this SKU already exists"), { code: "CONFLICT", status: 409 }))
  expect(await actions.updateItemDetailsAction(input)).toEqual({ success: false, error: "Failed to update item details" })
})

test("secondary stock permission denial cannot change stock policy", async () => {
  permission.mockResolvedValueOnce({ orgId: "server-org", userId: "server-user" }).mockRejectedValueOnce(new ForbiddenError(sentinel))
  expect(await actions.updateItemStockAction({ ...input, minStockLevel: 7, adjustInventory: { locationId: "location-1", deltaQty: 2 } })).toEqual({ success: false, error: "Forbidden" })
  expect(permission).toHaveBeenNthCalledWith(2, "inventory.stock.adjust", { resource: "StockAdjustment", resourceId: item.id, auditAllowed: true })
  expect(services.updateItemStockFromForm).not.toHaveBeenCalled()
  expect(revalidateItem).not.toHaveBeenCalled()
})

test("authorized stock adjustment retains actor, policy and second permission", async () => {
  await actions.updateItemStockAction({ ...input, minStockLevel: 7, adjustInventory: { locationId: "location-1", deltaQty: 2 } })
  expect(permission).toHaveBeenCalledTimes(2)
  expect(services.updateItemStockFromForm).toHaveBeenCalledWith("server-org", "server-user", item.id, expect.objectContaining({ minStockLevel: 7, adjustInventory: expect.objectContaining({ deltaQty: 2 }) }))
})

test.each(cases.filter(entry => !!entry.message))("$name redacts post-write cache failures without implying rollback", async entry => {
  const revalidate = entry.name === "deleteItemAction" ? revalidateTag : revalidateItem
  ;(revalidate as jest.Mock).mockImplementationOnce(() => { throw new Error(sentinel) })
  expect(await entry.action(input)).toEqual({ success: false, error: entry.fallback })
  // The service already succeeded. This is response safety, not a no-write denial.
  expect(entry.service).toHaveBeenCalledTimes(1)
  expect(JSON.stringify((logger.error as jest.Mock).mock.calls)).not.toContain(sentinel)
})
