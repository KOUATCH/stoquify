/** @jest-environment node */
import { db } from "@/prisma/db"
import { listInventoryLevels } from "../inventory-read.service"

jest.mock("@/prisma/db", () => ({ db: { inventoryLevel: { findMany: jest.fn() } } }))

beforeEach(() => { jest.clearAllMocks(); (db.inventoryLevel.findMany as jest.Mock).mockResolvedValue([]) })

it("scopes transferable stock to the tenant, source, active items and positive availability", async () => {
  await listInventoryLevels({ organizationId: "org-1", filters: { locationId: "source", transferEligible: true } })
  expect(db.inventoryLevel.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
    locationId: "source", quantityAvailable: { gt: 0 },
    item: { organizationId: "org-1", deletedAt: null, isActive: true, isDiscontinued: false },
  } }))
})

it("preserves normal inventory reads, including zero and inactive stock", async () => {
  await listInventoryLevels({ organizationId: "org-1", filters: { locationId: "source" } })
  expect(db.inventoryLevel.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
    locationId: "source", item: { organizationId: "org-1", deletedAt: null },
  } }))
})
