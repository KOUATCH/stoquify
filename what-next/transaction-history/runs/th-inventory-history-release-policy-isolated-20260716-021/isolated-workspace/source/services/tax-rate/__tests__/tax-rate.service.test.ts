import { db } from "@/prisma/db"
import { deleteTaxRate, removeTaxRateForManagement } from "../tax-rate.service"

jest.mock("@/prisma/db", () => ({
  db: {
    taxRate: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

const mockDb = db as unknown as {
  taxRate: {
    findFirst: jest.Mock
    update: jest.Mock
    delete: jest.Mock
  }
}

const now = new Date("2026-06-17T10:00:00Z")

function taxRateRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "tax-1",
    organizationId: "org-1",
    nameEn: "VAT",
    nameFr: null,
    rate: { toString: () => "19.25" },
    type: "SALES",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe("tax-rate.service immutability", () => {
  it("deactivates tax rates instead of hard deleting them", async () => {
    mockDb.taxRate.findFirst.mockResolvedValue({ id: "tax-1" })
    mockDb.taxRate.update.mockResolvedValue(taxRateRow({ isActive: false }))

    const result = await deleteTaxRate("org-1", "tax-1")

    expect(result.isActive).toBe(false)
    expect(mockDb.taxRate.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "tax-1" },
        data: expect.objectContaining({ isActive: false }),
      }),
    )
    expect(mockDb.taxRate.delete).not.toHaveBeenCalled()
  })

  it("returns deactivated mode for management removal without hard deleting", async () => {
    mockDb.taxRate.findFirst.mockResolvedValue({ id: "tax-1" })
    mockDb.taxRate.update.mockResolvedValue(taxRateRow({ isActive: false }))

    const result = await removeTaxRateForManagement("org-1", "tax-1")

    expect(result).toEqual({ id: "tax-1", mode: "deactivated" })
    expect(mockDb.taxRate.delete).not.toHaveBeenCalled()
  })
})
