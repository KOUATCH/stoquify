jest.mock("@/prisma/db", () => ({
  db: {
    customer: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  },
}))

import { db } from "@/prisma/db"
import { removeCustomerForManagement } from "../customer.service"

const mockDb = db as unknown as {
  customer: {
    findFirst: jest.Mock
    update: jest.Mock
  }
}

describe("customer management lifecycle", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.customer.update.mockResolvedValue({ id: "customer-1" })
  })

  it("deactivates customers with retained financial or statement evidence", async () => {
    mockDb.customer.findFirst.mockResolvedValue({
      id: "customer-1",
      _count: {
        salesOrders: 0,
        ledgerEntries: 0,
        receivableDocuments: 0,
        statementSnapshots: 1,
        settlements: 0,
      },
    })

    const result = await removeCustomerForManagement("org-1", "customer-1")

    expect(result).toEqual({ id: "customer-1", mode: "deactivated" })
    expect(mockDb.customer.findFirst).toHaveBeenCalledWith({
      where: { id: "customer-1", organizationId: "org-1", deletedAt: null },
      select: {
        id: true,
        _count: {
          select: {
            salesOrders: true,
            ledgerEntries: true,
            receivableDocuments: true,
            statementSnapshots: true,
            settlements: true,
          },
        },
      },
    })
    expect(mockDb.customer.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: { isActive: false },
    })
  })

  it("soft-archives customers only when no retained history exists", async () => {
    mockDb.customer.findFirst.mockResolvedValue({
      id: "customer-1",
      _count: {
        salesOrders: 0,
        ledgerEntries: 0,
        receivableDocuments: 0,
        statementSnapshots: 0,
        settlements: 0,
      },
    })

    const result = await removeCustomerForManagement("org-1", "customer-1")

    expect(result).toEqual({ id: "customer-1", mode: "archived" })
    expect(mockDb.customer.update).toHaveBeenCalledWith({
      where: { id: "customer-1" },
      data: {
        isActive: false,
        deletedAt: expect.any(Date),
      },
    })
  })
})
