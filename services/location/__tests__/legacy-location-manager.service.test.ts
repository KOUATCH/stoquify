jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), user: { findFirst: jest.fn() } } }))
import { db } from "@/prisma/db"
import { updateLegacyLocationByIdForOrg } from "../location.service"
import type { LocationDTO } from "@/types/location"

const mockDb = db as unknown as { $transaction: jest.Mock; user: { findFirst: jest.Mock } }
const input = (managerId?: string | null) => ({ name: "Main store", ...(managerId !== undefined ? { managerId } : {}) }) as LocationDTO
const fixture = () => ({
  location: { findFirst: jest.fn().mockResolvedValue({ id: "location-1" }), update: jest.fn().mockResolvedValue({ id: "location-1", organizationId: "org-1" }) },
  user: { findFirst: jest.fn() },
})

describe("legacy location manager assignment", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it.each(["foreign-manager", "inactive-manager"])("rejects %s before changing the location", async managerId => {
    const tx = fixture()
    tx.user.findFirst.mockResolvedValue(null)
    mockDb.user.findFirst.mockResolvedValue(null)
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    await expect(updateLegacyLocationByIdForOrg("org-1", "location-1", input(managerId))).rejects.toThrow("Selected manager does not belong to this organization")
    expect(tx.location.update).not.toHaveBeenCalled()
  })

  it("resolves an active same-tenant manager in the location transaction", async () => {
    const tx = fixture()
    tx.user.findFirst.mockResolvedValue({ id: "manager-1" })
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    await updateLegacyLocationByIdForOrg("org-1", "location-1", input(" manager-1 "))
    expect(tx.user.findFirst).toHaveBeenCalledWith({ where: { id: "manager-1", organizationId: "org-1", isActive: true }, select: { id: true } })
    expect(tx.location.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ managerId: "manager-1" }) }))
    expect(mockDb.user.findFirst).not.toHaveBeenCalled()
  })

  it.each([null, ""])("clears the manager with %p without looking up an identity", async managerId => {
    const tx = fixture()
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    await updateLegacyLocationByIdForOrg("org-1", "location-1", input(managerId))
    expect(tx.location.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ managerId: null }) }))
    expect(tx.user.findFirst).not.toHaveBeenCalled()
  })

  it("preserves the current manager when assignment is omitted", async () => {
    const tx = fixture()
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    await updateLegacyLocationByIdForOrg("org-1", "location-1", input())
    expect(tx.location.update.mock.calls[0][0].data).not.toHaveProperty("managerId")
    expect(tx.user.findFirst).not.toHaveBeenCalled()
  })

  it("denies an unavailable location before resolving its requested manager", async () => {
    const tx = fixture()
    tx.location.findFirst.mockResolvedValue(null)
    mockDb.$transaction.mockImplementation(async handler => handler(tx))
    await expect(updateLegacyLocationByIdForOrg("org-1", "foreign-location", input("manager-1"))).rejects.toThrow("Location not found")
    expect(tx.location.findFirst).toHaveBeenCalledWith({ where: { id: "foreign-location", organizationId: "org-1", deletedAt: null }, select: { id: true } })
    expect(tx.user.findFirst).not.toHaveBeenCalled()
    expect(tx.location.update).not.toHaveBeenCalled()
  })
})
