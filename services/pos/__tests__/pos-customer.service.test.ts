import { Prisma } from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    location: { findFirst: jest.fn() },
    customer: { findMany: jest.fn(), count: jest.fn() },
  },
}))

jest.mock("@/lib/logger", () => ({
  logger: { warn: jest.fn() },
}))

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import {
  listPOSCustomers,
  POS_CUSTOMER_LOCATION_MISMATCH,
  POS_LOCATION_UNAVAILABLE,
  requirePOSCustomerAtLocation,
} from "../pos-customer.service"

const mockDb = db as unknown as {
  location: { findFirst: jest.Mock }
  customer: { findMany: jest.Mock; count: jest.Mock }
}

function customer(id: string, name: string, total: number) {
  return {
    id,
    name,
    code: id.toUpperCase(),
    email: `${id}@example.test`,
    phone: null,
    creditLimit: new Prisma.Decimal(500),
    isActive: true,
    salesOrders: [{ total: new Prisma.Decimal(total) }],
  }
}

describe("POS customer location scope", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockDb.location.findFirst.mockResolvedValue({ id: "loc-a" })
    mockDb.customer.count.mockResolvedValue(1)
  })

  it("returns current-location and unassigned tenant customers while scoping statistics to Location A", async () => {
    mockDb.customer.findMany.mockResolvedValue([customer("customer-a", "Alice A", 125)])

    const result = await listPOSCustomers({
      organizationId: "org-a",
      locationId: "loc-a",
      search: "alice",
    })

    expect(result).toEqual({
      customers: [expect.objectContaining({ id: "customer-a", totalOrders: 1, totalRevenue: 125 })],
      total: 1,
    })
    expect(mockDb.location.findFirst).toHaveBeenCalledWith({
      where: {
        id: "loc-a",
        organizationId: "org-a",
        isActive: true,
        deletedAt: null,
      },
      select: { id: true },
    })
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-a",
        AND: expect.arrayContaining([{
          OR: expect.arrayContaining([
            {
              locationAssignments: {
                some: { organizationId: "org-a", locationId: "loc-a" },
              },
            },
            {
              locationAssignments: {
                none: { organizationId: "org-a" },
              },
            },
          ]),
        }]),
      }),
      include: {
        salesOrders: {
          where: { locationId: "loc-a", deletedAt: null },
          select: { total: true },
        },
      },
    }))
  })

  it("uses a different database predicate and result for Location B", async () => {
    mockDb.location.findFirst.mockResolvedValue({ id: "loc-b" })
    mockDb.customer.findMany.mockResolvedValue([customer("customer-b", "Bob B", 90)])

    const result = await listPOSCustomers({ organizationId: "org-a", locationId: "loc-b" })

    expect(result.customers.map((row) => row.id)).toEqual(["customer-b"])
    expect(mockDb.customer.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-a",
        AND: expect.arrayContaining([{
          OR: expect.arrayContaining([{
            locationAssignments: {
              some: { organizationId: "org-a", locationId: "loc-b" },
            },
          }]),
        }]),
      }),
    }))
  })

  it("fails closed before customer data is queried when the location is outside the tenant", async () => {
    mockDb.location.findFirst.mockResolvedValue(null)

    await expect(listPOSCustomers({ organizationId: "org-a", locationId: "org-b-location" }))
      .rejects.toMatchObject({ message: POS_LOCATION_UNAVAILABLE, status: 404 })
    expect(mockDb.customer.findMany).not.toHaveBeenCalled()
    expect(mockDb.customer.count).not.toHaveBeenCalled()
  })

  it("rejects a customer not assigned to the sale location without logging customer identity", async () => {
    const client = { customer: { findFirst: jest.fn().mockResolvedValue(null) } }

    await expect(requirePOSCustomerAtLocation(client as never, {
      organizationId: "org-a",
      locationId: "loc-a",
      customerId: "customer-b",
    })).rejects.toMatchObject({ message: POS_CUSTOMER_LOCATION_MISMATCH, status: 404 })

    expect(client.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "customer-b",
        organizationId: "org-a",
        OR: expect.arrayContaining([{
          locationAssignments: {
            some: { organizationId: "org-a", locationId: "loc-a" },
          },
        }, {
          locationAssignments: {
            none: { organizationId: "org-a" },
          },
        }]),
      }),
    }))
    expect(logger.warn).toHaveBeenCalledWith("pos.customer.location_scope_rejected", {
      organizationId: "org-a",
      locationId: "loc-a",
    })
  })

  it("keeps the organization-owned walk-in customer valid at every authorized location", async () => {
    const walkIn = {
      id: "walk-in",
      code: "WALK_IN",
      currentBalance: new Prisma.Decimal(0),
      creditLimit: null,
    }
    const client = { customer: { findFirst: jest.fn().mockResolvedValue(walkIn) } }

    await expect(requirePOSCustomerAtLocation(client as never, {
      organizationId: "org-a",
      locationId: "loc-b",
      customerId: "walk-in",
    })).resolves.toEqual(walkIn)

    expect(client.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        OR: expect.arrayContaining([{ code: "WALK_IN" }]),
      }),
    }))
  })

  it("accepts a tenant customer with no location assignment for a first POS sale", async () => {
    const unassigned = {
      id: "customer-new",
      code: "CUSTOMER-NEW",
      currentBalance: new Prisma.Decimal(0),
      creditLimit: null,
    }
    const client = { customer: { findFirst: jest.fn().mockResolvedValue(unassigned) } }

    await expect(requirePOSCustomerAtLocation(client as never, {
      organizationId: "org-a",
      locationId: "loc-a",
      customerId: "customer-new",
    })).resolves.toEqual(unassigned)

    expect(client.customer.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        organizationId: "org-a",
        OR: expect.arrayContaining([{
          locationAssignments: {
            none: { organizationId: "org-a" },
          },
        }]),
      }),
    }))
  })
})
