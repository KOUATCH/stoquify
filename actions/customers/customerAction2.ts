"use server"

import { randomUUID } from "crypto"

import type { ServerActionResult } from "@/lib/error-handling/types"
import { requirePermission } from "@/lib/security/rbac"
import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import type {
  Customer,
  CustomerOrder,
  CustomerOrderPayment,
  CustomerWithStats,
} from "@/types/customerTypes"
import type { CustomerEditFormData, CustomerFormData } from "@/validations/customer"
import type { Customer as PrismaCustomer, Payment } from "@prisma/client"

type DecimalLike = { toNumber?: () => number; toString: () => string } | number | string | null | undefined
type CustomerPermission = "customers.read" | "customers.create" | "customers.update" | "customers.delete"

function toNumber(value: DecimalLike): number {
  if (value == null) return 0
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value) || 0
  if (typeof value.toNumber === "function") return value.toNumber()
  return Number(value.toString()) || 0
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function mapCustomer(customer: PrismaCustomer): Customer {
  return {
    id: customer.id,
    name: customer.name,
    code: customer.code,
    email: customer.email,
    phone: customer.phone,
    address: customer.address,
    taxId: customer.taxId,
    creditLimit: customer.creditLimit == null ? null : toNumber(customer.creditLimit),
    paymentTerms: customer.paymentTerms ?? 30,
    notes: customer.notes,
    isActive: customer.isActive,
    organizationId: customer.organizationId,
    createdAt: customer.createdAt,
    updatedAt: customer.updatedAt,
  }
}

function mapPayment(payment: Payment): CustomerOrderPayment {
  return {
    id: payment.id,
    paymentNumber: payment.paymentNumber,
    amount: toNumber(payment.amount),
    method: payment.method,
    status: payment.status,
    processedAt: payment.processedAt,
    createdAt: payment.createdAt,
  }
}

async function requireCustomerAccess(
  permission: CustomerPermission,
  options: { resourceId?: string; auditAllowed?: boolean } = {},
): Promise<string> {
  const ctx = await requirePermission(permission, {
    resource: "Customer",
    ...(options.resourceId ? { resourceId: options.resourceId } : {}),
    ...(options.auditAllowed !== undefined ? { auditAllowed: options.auditAllowed } : {}),
  })

  if (!ctx.orgId) {
    throw new BusinessRuleError("Organization ID is required")
  }

  return ctx.orgId
}

async function nextCustomerCode(organizationId: string): Promise<string> {
  const customerCount = await db.customer.count({
    where: { organizationId },
  })

  return `CUST-${String(customerCount + 1).padStart(4, "0")}`
}

export async function getCustomers(): Promise<ServerActionResult<CustomerWithStats[]>> {
  const organizationId = await requireCustomerAccess("customers.read")

  const customers = await db.customer.findMany({
    where: {
      organizationId,
      deletedAt: null,
    },
    include: {
      salesOrders: {
        select: {
          id: true,
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const result = customers.map((customer): CustomerWithStats => {
    const totalOrders = customer.salesOrders.length
    const totalRevenue = customer.salesOrders.reduce((sum, order) => sum + toNumber(order.total), 0)

    return {
      ...mapCustomer(customer),
      totalOrders,
      totalRevenue,
      totalOrderValue: totalRevenue,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      lastOrderDate: customer.salesOrders[0]?.createdAt ?? null,
    }
  })

  return { success: true, data: result }
}

export async function getCustomer(id: string, _organizationId?: string): Promise<ServerActionResult<Customer | null>> {
  if (!id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.read", { resourceId: id })

  const customer = await db.customer.findFirst({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
  })

  return { success: true, data: customer ? mapCustomer(customer) : null }
}

export async function createCustomer(data: CustomerFormData): Promise<ServerActionResult<Customer>> {
  if (!data.name) {
    throw new BusinessRuleError("Customer name is required")
  }

  const organizationId = await requireCustomerAccess("customers.create", { auditAllowed: true })
  const now = new Date()

  const customer = await db.customer.create({
    data: {
      id: randomUUID(),
      name: data.name.trim(),
      code: emptyToNull(data.code) ?? await nextCustomerCode(organizationId),
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      address: emptyToNull(data.address),
      taxId: emptyToNull(data.taxId),
      creditLimit: data.creditLimit ?? null,
      paymentTerms: data.paymentTerms ?? 30,
      notes: emptyToNull(data.notes),
      isActive: data.isActive ?? true,
      organizationId,
      updatedAt: now,
    },
  })

  return { success: true, data: mapCustomer(customer) }
}

export async function updateCustomer(data: CustomerEditFormData): Promise<ServerActionResult<Customer>> {
  if (!data.id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  if (!data.name) {
    throw new BusinessRuleError("Customer name is required")
  }

  const organizationId = await requireCustomerAccess("customers.update", {
    resourceId: data.id,
    auditAllowed: true,
  })

  const updated = await db.customer.updateMany({
    where: {
      id: data.id,
      organizationId,
      deletedAt: null,
    },
    data: {
      name: data.name.trim(),
      code: emptyToNull(data.code),
      email: emptyToNull(data.email),
      phone: emptyToNull(data.phone),
      address: emptyToNull(data.address),
      taxId: emptyToNull(data.taxId),
      creditLimit: data.creditLimit ?? null,
      paymentTerms: data.paymentTerms,
      notes: emptyToNull(data.notes),
      isActive: data.isActive,
      updatedAt: new Date(),
    },
  })

  if (updated.count === 0) {
    throw new NotFoundError("Customer not found or update failed")
  }

  const customer = await db.customer.findFirst({
    where: {
      id: data.id,
      organizationId,
      deletedAt: null,
    },
  })

  if (!customer) {
    throw new NotFoundError("Customer not found after update")
  }

  return { success: true, data: mapCustomer(customer) }
}

export async function getCustomerOrders(customerId: string): Promise<ServerActionResult<CustomerOrder[]>> {
  if (!customerId) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.read", { resourceId: customerId })

  const orders = await db.salesOrder.findMany({
    where: {
      customerId,
      organizationId,
      deletedAt: null,
    },
    include: {
      lines: {
        include: {
          item: {
            select: {
              nameEn: true,
              nameFr: true,
              sku: true,
            },
          },
        },
      },
      payments: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  const result = orders.map((order): CustomerOrder => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: toNumber(order.total),
    subtotal: toNumber(order.subtotal),
    taxAmount: toNumber(order.taxAmount),
    discountAmount: toNumber(order.discount),
    itemCount: order.lines.reduce((sum, line) => sum + toNumber(line.quantity), 0),
    lineItems: order.lines.length,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    lines: order.lines.map((line) => ({
      id: line.id,
      itemName: line.item?.nameEn || line.item?.nameFr || "Unknown Item",
      sku: line.item?.sku || "",
      quantity: toNumber(line.quantity),
      unitPrice: toNumber(line.unitPrice),
      lineTotal: toNumber(line.lineTotal),
    })),
    payments: order.payments.map(mapPayment),
  }))

  return { success: true, data: result }
}

export async function deleteCustomer(id: string): Promise<ServerActionResult<void>> {
  if (!id) {
    throw new BusinessRuleError("Customer ID is required")
  }

  const organizationId = await requireCustomerAccess("customers.delete", {
    resourceId: id,
    auditAllowed: true,
  })

  await db.customer.updateMany({
    where: {
      id,
      organizationId,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
      isActive: false,
      updatedAt: new Date(),
    },
  })

  return { success: true, data: undefined }
}
