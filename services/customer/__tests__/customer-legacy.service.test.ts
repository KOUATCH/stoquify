import { Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    customer: {
      findFirst: jest.fn(),
      updateMany: jest.fn(),
    },
    salesOrder: {
      findMany: jest.fn(),
    },
  },
}))

import { db } from "@/prisma/db"

import {
  archiveLegacyCustomerForOrg,
  getLegacyCustomerByIdForOrg,
  getLegacyCustomerOrdersForOrg,
} from "../customer.service"

const mockDb = db as unknown as {
  customer: {
    findFirst: jest.Mock
    updateMany: jest.Mock
  }
  salesOrder: {
    findMany: jest.Mock
  }
}

const customerRecord = {
  id: "customer-1",
  name: "Retail customer",
  code: "CUST-0001",
  email: null,
  phone: null,
  address: null,
  taxId: null,
  creditLimit: new Prisma.Decimal(50000),
  paymentTerms: 30,
  notes: null,
  isActive: true,
  organizationId: "org-1",
  createdAt: new Date("2026-06-23T08:00:00.000Z"),
  updatedAt: new Date("2026-06-23T08:00:00.000Z"),
}

describe("legacy customer service boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.customer.findFirst.mockResolvedValue(customerRecord)
    mockDb.customer.updateMany.mockResolvedValue({ count: 1 })
    mockDb.salesOrder.findMany.mockResolvedValue([])
  })

  it("loads a legacy customer through an organization-scoped service query", async () => {
    const customer = await getLegacyCustomerByIdForOrg("org-1", "customer-1")

    expect(mockDb.customer.findFirst).toHaveBeenCalledWith({
      where: {
        id: "customer-1",
        organizationId: "org-1",
        deletedAt: null,
      },
    })
    expect(customer).toMatchObject({
      id: "customer-1",
      organizationId: "org-1",
      creditLimit: 50000,
    })
  })

  it("loads legacy customer orders with tenant and customer scope inside the service", async () => {
    mockDb.salesOrder.findMany.mockResolvedValue([
      {
        id: "order-1",
        orderNumber: "SO-001",
        status: "CONFIRMED",
        total: new Prisma.Decimal(12000),
        subtotal: new Prisma.Decimal(10000),
        taxAmount: new Prisma.Decimal(2000),
        discount: new Prisma.Decimal(0),
        createdAt: new Date("2026-06-23T08:30:00.000Z"),
        updatedAt: new Date("2026-06-23T08:45:00.000Z"),
        lines: [
          {
            id: "line-1",
            quantity: new Prisma.Decimal(2),
            unitPrice: new Prisma.Decimal(5000),
            lineTotal: new Prisma.Decimal(10000),
            item: { nameEn: "Coffee", nameFr: null, sku: "COF" },
          },
        ],
        payments: [
          {
            id: "payment-1",
            paymentNumber: "PAY-001",
            amount: new Prisma.Decimal(12000),
            method: "CASH",
            status: "COMPLETED",
            processedAt: new Date("2026-06-23T09:00:00.000Z"),
            createdAt: new Date("2026-06-23T09:00:00.000Z"),
          },
        ],
      },
    ])

    const orders = await getLegacyCustomerOrdersForOrg("org-1", "customer-1")

    expect(mockDb.salesOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerId: "customer-1",
          organizationId: "org-1",
          deletedAt: null,
        },
      }),
    )
    expect(orders[0]).toMatchObject({
      id: "order-1",
      totalAmount: 12000,
      itemCount: 2,
      payments: [expect.objectContaining({ amount: 12000 })],
    })
  })

  it("archives legacy customers through an organization-scoped service mutation", async () => {
    await archiveLegacyCustomerForOrg("org-1", "customer-1")

    expect(mockDb.customer.updateMany).toHaveBeenCalledWith({
      where: {
        id: "customer-1",
        organizationId: "org-1",
        deletedAt: null,
      },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        isActive: false,
        updatedAt: expect.any(Date),
      }),
    })
  })
})
