import { Prisma } from "@prisma/client"

import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import { posCustomerListSchema } from "./pos.schemas"

export const POS_CUSTOMER_LOCATION_MISMATCH = "POS_CUSTOMER_LOCATION_MISMATCH"
export const POS_LOCATION_UNAVAILABLE = "POS_LOCATION_UNAVAILABLE"

type POSCustomerScope = {
  organizationId: string
  locationId: string
}

export type POSCustomerListItem = {
  id: string
  name: string
  code: string | null
  email: string | null
  phone: string | null
  creditLimit: number | null
  isActive: boolean
  totalOrders: number
  totalRevenue: number
}

export type POSCustomerListResult = {
  customers: POSCustomerListItem[]
  total: number
}

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : Number(value)
}

async function requireActivePOSLocation(
  client: Pick<Prisma.TransactionClient, "location">,
  scope: POSCustomerScope,
) {
  const location = await client.location.findFirst({
    where: {
      id: scope.locationId,
      organizationId: scope.organizationId,
      isActive: true,
      deletedAt: null,
    },
    select: { id: true },
  })

  if (!location) throw new NotFoundError(POS_LOCATION_UNAVAILABLE)
  return location
}

export async function listPOSCustomers(rawInput: POSCustomerScope & Record<string, unknown>) {
  const input = posCustomerListSchema.parse(rawInput)
  const scope = { organizationId: rawInput.organizationId, locationId: input.locationId }
  await requireActivePOSLocation(db, scope)

  const where: Prisma.CustomerWhereInput = {
    organizationId: scope.organizationId,
    isActive: true,
    deletedAt: null,
    code: { not: "WALK_IN" },
    locationAssignments: {
      some: {
        organizationId: scope.organizationId,
        locationId: scope.locationId,
      },
    },
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" as const } },
            { code: { contains: input.search, mode: "insensitive" as const } },
            { email: { contains: input.search, mode: "insensitive" as const } },
            { phone: { contains: input.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: input.take,
      include: {
        salesOrders: {
          where: { locationId: scope.locationId, deletedAt: null },
          select: { total: true },
        },
      },
    }),
    db.customer.count({ where }),
  ])

  return {
    customers: customers.map((customer): POSCustomerListItem => ({
      id: customer.id,
      name: customer.name,
      code: customer.code,
      email: customer.email,
      phone: customer.phone,
      creditLimit: customer.creditLimit === null ? null : toNumber(customer.creditLimit),
      isActive: customer.isActive,
      totalOrders: customer.salesOrders.length,
      totalRevenue: customer.salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0),
    })),
    total,
  } satisfies POSCustomerListResult
}

export async function requirePOSCustomerAtLocation(
  client: Pick<Prisma.TransactionClient, "customer">,
  input: POSCustomerScope & { customerId: string },
) {
  const customer = await client.customer.findFirst({
    where: {
      id: input.customerId,
      organizationId: input.organizationId,
      isActive: true,
      deletedAt: null,
      OR: [
        { code: "WALK_IN" },
        {
          locationAssignments: {
            some: {
              organizationId: input.organizationId,
              locationId: input.locationId,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      code: true,
      currentBalance: true,
      creditLimit: true,
    },
  })

  if (!customer) {
    logger.warn("pos.customer.location_scope_rejected", {
      organizationId: input.organizationId,
      locationId: input.locationId,
    })
    throw new NotFoundError(POS_CUSTOMER_LOCATION_MISMATCH)
  }

  return customer
}
