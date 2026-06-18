import { db } from "@/prisma/db"
import { deleteUnit, removeUnitForManagement } from "../unit.service"

jest.mock("@/prisma/db", () => ({
  db: {
    unit: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  unit: {
    findFirst: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

const now = new Date("2026-06-17T10:00:00Z")

function unitRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "unit-1",
    organizationId: "org-1",
    nameEn: "Piece",
    nameFr: null,
    symbol: "pc",
    type: "QUANTITY",
    baseUnit: null,
    conversionRate: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("unit.service immutability", () => {
  it("deactivates units instead of hard deleting them", async () => {
    mockDb.unit.findFirst.mockResolvedValue({ id: "unit-1" })
    mockDb.unit.update.mockResolvedValue(unitRow({ isActive: false }))

    const result = await deleteUnit("org-1", "unit-1")

    expect(result.isActive).toBe(false)
    expect(mockDb.unit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "unit-1" },
        data: expect.objectContaining({ isActive: false }),
      }),
    )
    expect(mockDb.unit.delete).not.toHaveBeenCalled()
  })

  it("returns deactivated mode for management removal without hard deleting", async () => {
    mockDb.unit.findFirst.mockResolvedValue({ id: "unit-1" })
    mockDb.unit.update.mockResolvedValue(unitRow({ isActive: false }))

    const result = await removeUnitForManagement("org-1", "unit-1")

    expect(result).toEqual({ id: "unit-1", mode: "deactivated" })
    expect(mockDb.unit.delete).not.toHaveBeenCalled()
  })
})
