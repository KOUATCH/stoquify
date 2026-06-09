import { logger } from "@/lib/logger"
import { db } from "@/prisma/db"
import { PaymentStatus, SalesOrderStatus, type Customer, type Prisma } from "@prisma/client"
import { buildPagination, buildPaginatedResult, MAX_PAGE_SIZES } from "../_shared/pagination"
import type { PaginatedResult } from "../_shared/types"
import type { CustomerCreateInput, CustomerListParams, CustomerUpdateInput } from "./customer.schemas"

export type CustomerDTO = Customer

export type CustomerManagementRow = {
  id: string
  organizationId: string
  name: string
  code: string | null
  email: string | null
  phone: string | null
  address: string | null
  taxId: string | null
  creditLimit: number | null
  currentBalance: number
  paymentTerms: number | null
  notes: string | null
  isActive: boolean
  preferredLocale: "EN" | "FR"
  createdAt: Date
  updatedAt: Date
  salesOrdersCount: number
  openSalesOrdersCount: number
  unpaidSalesOrdersCount: number
  ledgerEntriesCount: number
  totalSalesValue: number
  averageOrderValue: number
  lastSalesOrderAt: Date | null
  lastLedgerEntryAt: Date | null
}

export type CustomerManagementSummary = {
  totalCustomers: number
  activeCustomers: number
  inactiveCustomers: number
  salesOrders: number
  openSalesOrders: number
  unpaidSalesOrders: number
  totalSalesValue: number
  totalCreditLimit: number
  totalBalance: number
  averagePaymentTerms: number
  overCreditLimitCustomers: number
  bilingualCustomers: number
  newCustomers30Days: number
}

export type CustomerManagementData = {
  customers: CustomerManagementRow[]
  summary: CustomerManagementSummary
  topBySales: CustomerManagementRow[]
  topByBalance: CustomerManagementRow[]
}

export type CustomerAnalyticsOrder = {
  id: string
  orderNumber: string
  status: string
  paymentStatus: string
  orderDate: Date
  dueDate: Date | null
  total: number
}

export type CustomerAnalyticsLedgerEntry = {
  id: string
  entryDate: Date
  type: string
  debit: number
  credit: number
  balanceAfter: number
  description: string
}

export type CustomerAnalyticsPayment = {
  id: string
  paymentNumber: string
  amount: number
  method: string
  status: string
  processedAt: Date | null
  createdAt: Date
}

export type CustomerDetailAnalytics = {
  customer: CustomerManagementRow
  salesOrders: CustomerAnalyticsOrder[]
  ledgerEntries: CustomerAnalyticsLedgerEntry[]
  payments: CustomerAnalyticsPayment[]
}

const OPEN_SALES_ORDER_STATUSES = [
  SalesOrderStatus.DRAFT,
  SalesOrderStatus.CONFIRMED,
  SalesOrderStatus.PROCESSING,
  SalesOrderStatus.SHIPPED,
]

const UNPAID_PAYMENT_STATUSES = [
  PaymentStatus.PENDING,
  PaymentStatus.PARTIAL,
]

const CUSTOMER_MANAGEMENT_ROW_LIMIT = 500

function toNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : Number(value)
}

const customerManagementSelect = {
  id: true,
  organizationId: true,
  name: true,
  code: true,
  email: true,
  phone: true,
  address: true,
  taxId: true,
  creditLimit: true,
  currentBalance: true,
  paymentTerms: true,
  notes: true,
  isActive: true,
  preferredLocale: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      salesOrders: true,
      ledgerEntries: true,
    },
  },
} satisfies Prisma.CustomerSelect

type CustomerManagementRecord = Prisma.CustomerGetPayload<{
  select: typeof customerManagementSelect
}>

export async function listCustomers(
  orgId: string,
  params: CustomerListParams,
): Promise<PaginatedResult<CustomerDTO>> {
  const { page, pageSize, search, isActive } = params
  const { skip, take, page: p, pageSize: ps } = buildPagination(page, pageSize, MAX_PAGE_SIZES.customers)

  const where = {
    organizationId: orgId,
    deletedAt: null,
    ...(isActive !== undefined && { isActive }),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { email: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search, mode: "insensitive" as const } },
            { code: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [data, total] = await Promise.all([
    db.customer.findMany({ where, orderBy: { name: "asc" }, skip, take }),
    db.customer.count({ where }),
  ])

  return buildPaginatedResult(data as CustomerDTO[], total, p, ps)
}

export async function getCustomerById(orgId: string, id: string): Promise<CustomerDTO> {
  const customer = await db.customer.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!customer) throw new Error("Customer not found")
  return customer as CustomerDTO
}

async function nextCustomerCode(orgId: string): Promise<string> {
  const count = await db.customer.count({ where: { organizationId: orgId } })
  return `CUST-${String(count + 1).padStart(4, "0")}`
}

export async function createCustomer(
  orgId: string,
  input: CustomerCreateInput,
): Promise<CustomerDTO> {
  logger.info("customer.create", { orgId, name: input.name })

  const code = input.code ?? (await nextCustomerCode(orgId))

  const existing = await db.customer.findFirst({
    where: { organizationId: orgId, code },
  })
  if (existing) throw new Error(`Customer with code "${code}" already exists in this organisation`)

  const customer = await db.customer.create({
    data: {
      name: input.name,
      code,
      email: input.email ?? null,
      phone: input.phone ?? null,
      address: input.address ?? null,
      taxId: input.taxId ?? null,
      creditLimit: input.creditLimit ?? null,
      paymentTerms: input.paymentTerms ?? null,
      notes: input.notes ?? null,
      isActive: input.isActive,
      preferredLocale: input.preferredLocale,
      organizationId: orgId,
    },
  })
  return customer as CustomerDTO
}

export async function updateCustomer(
  orgId: string,
  id: string,
  input: CustomerUpdateInput,
): Promise<CustomerDTO> {
  const customer = await db.customer.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!customer) throw new Error("Customer not found")

  if (input.code && input.code !== customer.code) {
    const codeClash = await db.customer.findFirst({
      where: { organizationId: orgId, code: input.code, NOT: { id } },
    })
    if (codeClash) {
      throw new Error(`Customer with code "${input.code}" already exists in this organisation`)
    }
  }

  const updated = await db.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(input.code !== undefined && { code: input.code }),
      ...(input.email !== undefined && { email: input.email }),
      ...(input.phone !== undefined && { phone: input.phone }),
      ...(input.address !== undefined && { address: input.address }),
      ...(input.taxId !== undefined && { taxId: input.taxId }),
      ...(input.creditLimit !== undefined && { creditLimit: input.creditLimit }),
      ...(input.paymentTerms !== undefined && { paymentTerms: input.paymentTerms }),
      ...(input.notes !== undefined && { notes: input.notes }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
      ...(input.preferredLocale !== undefined && { preferredLocale: input.preferredLocale }),
    },
  })
  return updated as CustomerDTO
}

export async function deleteCustomer(orgId: string, id: string): Promise<CustomerDTO> {
  const customer = await db.customer.findFirst({
    where: { id, organizationId: orgId, deletedAt: null },
  })
  if (!customer) throw new Error("Customer not found")

  // Soft delete — the schema includes `deletedAt`, and SalesOrder + ledger
  // entries reference Customer. Hard-delete would orphan history.
  const deleted = await db.customer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  })
  return deleted as CustomerDTO
}

async function buildCustomerManagementRows(
  organizationId: string,
  customers: CustomerManagementRecord[],
) {
  const customerIds = customers.map((customer) => customer.id)

  const [
    salesOrderSummaries,
    openSalesOrderCounts,
    unpaidSalesOrderCounts,
    ledgerSummaries,
  ] = customerIds.length
    ? await Promise.all([
        db.salesOrder.groupBy({
          by: ["customerId"],
          where: { organizationId, customerId: { in: customerIds }, deletedAt: null },
          _count: { _all: true },
          _sum: { total: true },
          _max: { orderDate: true },
        }),
        db.salesOrder.groupBy({
          by: ["customerId"],
          where: {
            organizationId,
            customerId: { in: customerIds },
            deletedAt: null,
            status: { in: OPEN_SALES_ORDER_STATUSES },
          },
          _count: { _all: true },
        }),
        db.salesOrder.groupBy({
          by: ["customerId"],
          where: {
            organizationId,
            customerId: { in: customerIds },
            deletedAt: null,
            paymentStatus: { in: UNPAID_PAYMENT_STATUSES },
          },
          _count: { _all: true },
        }),
        db.customerLedgerEntry.groupBy({
          by: ["customerId"],
          where: { organizationId, customerId: { in: customerIds } },
          _max: { entryDate: true },
        }),
      ])
    : [[], [], [], []]

  const salesSummaryByCustomer = new Map<string, { total: number; count: number; lastAt: Date | null }>()
  salesOrderSummaries.forEach((summary) => {
    salesSummaryByCustomer.set(summary.customerId, {
      total: toNumber(summary._sum.total),
      count: summary._count._all,
      lastAt: summary._max.orderDate ?? null,
    })
  })

  const openOrdersByCustomer = new Map<string, number>()
  openSalesOrderCounts.forEach((summary) => {
    openOrdersByCustomer.set(summary.customerId, summary._count._all)
  })

  const unpaidOrdersByCustomer = new Map<string, number>()
  unpaidSalesOrderCounts.forEach((summary) => {
    unpaidOrdersByCustomer.set(summary.customerId, summary._count._all)
  })

  const lastLedgerEntryByCustomer = new Map<string, Date | null>()
  ledgerSummaries.forEach((summary) => {
    lastLedgerEntryByCustomer.set(summary.customerId, summary._max.entryDate ?? null)
  })

  const rows = customers.map((customer): CustomerManagementRow => {
    const salesSummary = salesSummaryByCustomer.get(customer.id)
    const salesOrdersCount = salesSummary?.count ?? customer._count.salesOrders
    const totalSalesValue = salesSummary?.total ?? 0

    return {
      id: customer.id,
      organizationId: customer.organizationId,
      name: customer.name,
      code: customer.code,
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      taxId: customer.taxId,
      creditLimit: customer.creditLimit !== null ? toNumber(customer.creditLimit) : null,
      currentBalance: toNumber(customer.currentBalance),
      paymentTerms: customer.paymentTerms,
      notes: customer.notes,
      isActive: customer.isActive,
      preferredLocale: customer.preferredLocale,
      createdAt: customer.createdAt,
      updatedAt: customer.updatedAt,
      salesOrdersCount,
      openSalesOrdersCount: openOrdersByCustomer.get(customer.id) ?? 0,
      unpaidSalesOrdersCount: unpaidOrdersByCustomer.get(customer.id) ?? 0,
      ledgerEntriesCount: customer._count.ledgerEntries,
      totalSalesValue,
      averageOrderValue: salesOrdersCount > 0 ? totalSalesValue / salesOrdersCount : 0,
      lastSalesOrderAt: salesSummary?.lastAt ?? null,
      lastLedgerEntryAt: lastLedgerEntryByCustomer.get(customer.id) ?? null,
    }
  })

  return {
    rows,
  }
}

export async function getCustomerManagementDataForOrg(
  organizationId: string,
): Promise<CustomerManagementData> {
  const baseWhere: Prisma.CustomerWhereInput = { organizationId, deletedAt: null }
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    customers,
    totalCustomers,
    activeCustomers,
    newCustomers30Days,
    bilingualCustomers,
    financialSummary,
    salesOrderTotals,
    openSalesOrders,
    unpaidSalesOrders,
    overCreditLimitRows,
    topSalesGroups,
    topBalanceCustomers,
  ] = await Promise.all([
    db.customer.findMany({
      where: baseWhere,
      orderBy: [
        { isActive: "desc" },
        { name: "asc" },
      ],
      take: CUSTOMER_MANAGEMENT_ROW_LIMIT,
      select: customerManagementSelect,
    }),
    db.customer.count({ where: baseWhere }),
    db.customer.count({ where: { ...baseWhere, isActive: true } }),
    db.customer.count({ where: { ...baseWhere, createdAt: { gte: thirtyDaysAgo } } }),
    db.customer.count({ where: { ...baseWhere, preferredLocale: "FR" } }),
    db.customer.aggregate({
      where: baseWhere,
      _sum: { creditLimit: true, currentBalance: true },
      _avg: { paymentTerms: true },
    }),
    db.salesOrder.aggregate({
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
      _sum: { total: true },
    }),
    db.salesOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        status: { in: OPEN_SALES_ORDER_STATUSES },
      },
    }),
    db.salesOrder.count({
      where: {
        organizationId,
        deletedAt: null,
        paymentStatus: { in: UNPAID_PAYMENT_STATUSES },
      },
    }),
    db.$queryRaw<Array<{ count: number | bigint | string }>>`
      SELECT COUNT(*)::int AS count
      FROM "customers"
      WHERE "organizationId" = ${organizationId}
        AND "deletedAt" IS NULL
        AND "creditLimit" IS NOT NULL
        AND "currentBalance" > "creditLimit"
    `,
    db.salesOrder.groupBy({
      by: ["customerId"],
      where: { organizationId, deletedAt: null },
      _sum: { total: true },
      orderBy: { _sum: { total: "desc" } },
      take: 5,
    }),
    db.customer.findMany({
      where: baseWhere,
      orderBy: { currentBalance: "desc" },
      take: 5,
      select: customerManagementSelect,
    }),
  ])

  const { rows } = await buildCustomerManagementRows(organizationId, customers)
  const topSalesCustomerIds = topSalesGroups.map((summary) => summary.customerId)
  const topSalesCustomers = topSalesCustomerIds.length
    ? await db.customer.findMany({
        where: { ...baseWhere, id: { in: topSalesCustomerIds } },
        select: customerManagementSelect,
      })
    : []
  const [{ rows: topSalesRows }, { rows: topBalanceRows }] = await Promise.all([
    buildCustomerManagementRows(organizationId, topSalesCustomers),
    buildCustomerManagementRows(organizationId, topBalanceCustomers),
  ])
  const topSalesRank = new Map(topSalesCustomerIds.map((id, index) => [id, index]))

  return {
    customers: rows,
    summary: {
      totalCustomers,
      activeCustomers,
      inactiveCustomers: totalCustomers - activeCustomers,
      salesOrders: salesOrderTotals._count._all,
      openSalesOrders,
      unpaidSalesOrders,
      totalSalesValue: toNumber(salesOrderTotals._sum.total),
      totalCreditLimit: toNumber(financialSummary._sum.creditLimit),
      totalBalance: toNumber(financialSummary._sum.currentBalance),
      averagePaymentTerms: toNumber(financialSummary._avg.paymentTerms),
      overCreditLimitCustomers: Number(overCreditLimitRows[0]?.count ?? 0),
      bilingualCustomers,
      newCustomers30Days,
    },
    topBySales: topSalesRows.sort(
      (first, second) => (topSalesRank.get(first.id) ?? 0) - (topSalesRank.get(second.id) ?? 0),
    ),
    topByBalance: topBalanceRows,
  }
}

async function reloadCustomerManagementRow(organizationId: string, customerId: string) {
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    select: customerManagementSelect,
  })

  if (!customer) return null

  const { rows } = await buildCustomerManagementRows(organizationId, [customer])
  return rows[0] ?? null
}

export async function createCustomerForManagement(
  organizationId: string,
  input: CustomerCreateInput,
): Promise<CustomerManagementRow> {
  const customer = await createCustomer(organizationId, input)
  const row = await reloadCustomerManagementRow(organizationId, customer.id)

  if (!row) {
    throw new Error("Customer was created but could not be reloaded")
  }

  return row
}

export async function updateCustomerForManagement(
  organizationId: string,
  customerId: string,
  input: CustomerUpdateInput,
): Promise<CustomerManagementRow> {
  await updateCustomer(organizationId, customerId, input)
  const row = await reloadCustomerManagementRow(organizationId, customerId)

  if (!row) {
    throw new Error("Customer was updated but could not be reloaded")
  }

  return row
}

export async function removeCustomerForManagement(
  organizationId: string,
  customerId: string,
): Promise<{ id: string; mode: "archived" | "deactivated" }> {
  const customer = await db.customer.findFirst({
    where: { id: customerId, organizationId, deletedAt: null },
    select: {
      id: true,
      _count: {
        select: {
          salesOrders: true,
          ledgerEntries: true,
        },
      },
    },
  })

  if (!customer) {
    throw new Error("Customer not found")
  }

  const hasHistory = customer._count.salesOrders > 0 || customer._count.ledgerEntries > 0

  await db.customer.update({
    where: { id: customerId },
    data: hasHistory
      ? { isActive: false }
      : { isActive: false, deletedAt: new Date() },
  })

  return { id: customerId, mode: hasHistory ? "deactivated" : "archived" }
}

export async function getCustomerDetailAnalyticsForOrg(
  organizationId: string,
  customerId: string,
): Promise<CustomerDetailAnalytics> {
  const row = await reloadCustomerManagementRow(organizationId, customerId)

  if (!row) {
    throw new Error("Customer not found")
  }

  const [salesOrders, ledgerEntries, payments] = await Promise.all([
    db.salesOrder.findMany({
      where: { organizationId, customerId, deletedAt: null },
      orderBy: { orderDate: "desc" },
      take: 8,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        orderDate: true,
        dueDate: true,
        total: true,
      },
    }),
    db.customerLedgerEntry.findMany({
      where: { organizationId, customerId },
      orderBy: { entryDate: "desc" },
      take: 8,
      select: {
        id: true,
        entryDate: true,
        type: true,
        debit: true,
        credit: true,
        balanceAfter: true,
        description: true,
      },
    }),
    db.payment.findMany({
      where: { organizationId, deletedAt: null, salesOrder: { customerId } },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        paymentNumber: true,
        amount: true,
        method: true,
        status: true,
        processedAt: true,
        createdAt: true,
      },
    }),
  ])

  return {
    customer: row,
    salesOrders: salesOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      orderDate: order.orderDate,
      dueDate: order.dueDate,
      total: toNumber(order.total),
    })),
    ledgerEntries: ledgerEntries.map((entry) => ({
      id: entry.id,
      entryDate: entry.entryDate,
      type: entry.type,
      debit: toNumber(entry.debit),
      credit: toNumber(entry.credit),
      balanceAfter: toNumber(entry.balanceAfter),
      description: entry.description,
    })),
    payments: payments.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      amount: toNumber(payment.amount),
      method: payment.method,
      status: payment.status,
      processedAt: payment.processedAt,
      createdAt: payment.createdAt,
    })),
  }
}
