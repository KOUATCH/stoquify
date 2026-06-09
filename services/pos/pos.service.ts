import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { addMoney, moneyToNumber, moneyToString, subtractMoney, toDecimal } from "./money"
import { getSalesReceipt, sendReceipt, type ReceiptDeliveryResult, type SalesReceiptPayload } from "./receipt.service"
import {
  activeCartSchema,
  activePOSSessionSchema,
  addCartLineSchema,
  closeShiftSchema,
  commitSaleSchema,
  openShiftSchema,
  posCatalogSchema,
  type POSTenderInput,
  type POSTenderMethod,
  posTerminalListSchema,
  removeCartLineSchema,
  updateCartLineSchema,
} from "./pos.schemas"

type OrgScoped<T extends object = Record<string, unknown>> = T & {
  organizationId: string
}

type UserScoped<T extends object = Record<string, unknown>> = OrgScoped<T> & {
  userId: string
}

type CartLineInput = {
  quantity: Prisma.Decimal
  unitPrice: Prisma.Decimal
  discount?: Prisma.Decimal
  taxRate?: Prisma.Decimal
}

type TenderAllocation = {
  tender: POSTenderInput
  paymentMethod: "CASH" | "CARD" | "MOBILE_MONEY" | "BANK_TRANSFER" | "STORE_CREDIT" | "CREDIT"
  amount: Prisma.Decimal
  tenderedAmount: Prisma.Decimal
  changeGiven: Prisma.Decimal
}

function nextSessionNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const entropy = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `SES-${date}-${entropy}`
}

function nextCartNumber(terminalNumber: string) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const entropy = Math.random().toString(36).slice(2, 7).toUpperCase()
  return `POS-${terminalNumber}-${date}-${entropy}`
}

function nextPaymentNumber() {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "")
  const entropy = Math.random().toString(36).slice(2, 9).toUpperCase()
  return `PAY-${date}-${entropy}`
}

function lineMath(input: CartLineInput) {
  const quantity = input.quantity
  const unitPrice = input.unitPrice
  const discount = input.discount ?? new Prisma.Decimal(0)
  const taxable = Prisma.Decimal.max(new Prisma.Decimal(0), unitPrice.times(quantity).minus(discount))
  const taxRate = input.taxRate ?? new Prisma.Decimal(0)
  const taxAmount = taxable.times(taxRate).div(100).toDecimalPlaces(2)
  const lineTotal = taxable.plus(taxAmount).toDecimalPlaces(2)

  return { taxAmount, lineTotal }
}

function stockStatus(available: Prisma.Decimal, minimum: Prisma.Decimal, tracked: boolean) {
  if (!tracked) return "not_tracked" as const
  if (available.lte(0)) return "out" as const
  if (available.lte(minimum)) return "low" as const
  return "available" as const
}

function displayName(firstName?: string | null, lastName?: string | null, fallback?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ") || fallback || "Cashier"
}

function toPrismaPaymentMethod(method: POSTenderMethod): TenderAllocation["paymentMethod"] {
  return method === "ON_ACCOUNT" ? "CREDIT" : method
}

function allocateTenders(tenders: POSTenderInput[], total: Prisma.Decimal) {
  let remaining = total
  let changeDue = new Prisma.Decimal(0)
  const allocations: TenderAllocation[] = []

  for (const tender of tenders) {
    const tenderedAmount = toDecimal(tender.amount)
    if (remaining.lte(0)) {
      throw new Error("Tender exceeds sale balance")
    }

    if (tender.method === "CASH") {
      const amount = tenderedAmount.gte(remaining) ? remaining : tenderedAmount
      const changeGiven = tenderedAmount.minus(amount).toDecimalPlaces(2)
      allocations.push({
        tender,
        paymentMethod: "CASH",
        amount,
        tenderedAmount,
        changeGiven,
      })
      remaining = remaining.minus(amount).toDecimalPlaces(2)
      changeDue = changeDue.plus(changeGiven).toDecimalPlaces(2)
      continue
    }

    if (tenderedAmount.gt(remaining)) {
      throw new Error("Only cash tenders can exceed the balance due")
    }

    allocations.push({
      tender,
      paymentMethod: toPrismaPaymentMethod(tender.method),
      amount: tenderedAmount,
      tenderedAmount,
      changeGiven: new Prisma.Decimal(0),
    })
    remaining = remaining.minus(tenderedAmount).toDecimalPlaces(2)
  }

  if (remaining.gt(0)) {
    throw new Error("Insufficient tender for sale total")
  }

  return { allocations, changeDue }
}

function cleanJson(input: Record<string, unknown>): Prisma.JsonObject {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Prisma.JsonObject
}

async function getWalkInCustomer(tx: Prisma.TransactionClient, organizationId: string) {
  return tx.customer.upsert({
    where: { organizationId_code: { organizationId, code: "WALK_IN" } },
    update: {},
    create: {
      organizationId,
      code: "WALK_IN",
      name: "Walk-In Customer",
    },
  })
}

async function getOrCreateDraftCart(
  tx: Prisma.TransactionClient,
  input: UserScoped<{
    locationId: string
    terminalId: string
    sessionId?: string
  }>,
) {
  const existing = await tx.salesOrder.findFirst({
    where: {
      organizationId: input.organizationId,
      locationId: input.locationId,
      terminalId: input.terminalId,
      sessionId: input.sessionId,
      createdById: input.userId,
      status: "DRAFT",
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
  })

  if (existing) return existing

  const terminal = await tx.pOSStation.findFirst({
    where: {
      id: input.terminalId,
      organizationId: input.organizationId,
      locationId: input.locationId,
      isActive: true,
    },
    select: { terminalNumber: true },
  })

  if (!terminal) throw new Error("Terminal not found for this location")

  const customer = await getWalkInCustomer(tx, input.organizationId)

  return tx.salesOrder.create({
    data: {
      orderNumber: nextCartNumber(terminal.terminalNumber),
      organizationId: input.organizationId,
      locationId: input.locationId,
      terminalId: input.terminalId,
      sessionId: input.sessionId,
      createdById: input.userId,
      customerId: customer.id,
      status: "DRAFT",
      paymentStatus: "PENDING",
      subtotal: 0,
      taxAmount: 0,
      discount: 0,
      total: 0,
    },
  })
}

async function recalculateCartTotals(tx: Prisma.TransactionClient, salesOrderId: string) {
  const lines = await tx.salesOrderLine.findMany({
    where: { salesOrderId },
    select: {
      discount: true,
      taxAmount: true,
      lineTotal: true,
      quantity: true,
      unitPrice: true,
    },
  })

  const subtotal = lines.reduce((sum, line) => addMoney(sum, toDecimal(line.unitPrice).times(line.quantity)), new Prisma.Decimal(0))
  const discount = lines.reduce((sum, line) => addMoney(sum, line.discount), new Prisma.Decimal(0))
  const taxAmount = lines.reduce((sum, line) => addMoney(sum, line.taxAmount), new Prisma.Decimal(0))
  const total = lines.reduce((sum, line) => addMoney(sum, line.lineTotal), new Prisma.Decimal(0))

  return tx.salesOrder.update({
    where: { id: salesOrderId },
    data: { subtotal, discount, taxAmount, total },
  })
}

async function mapCart(salesOrderId: string, organizationId: string) {
  const cart = await db.salesOrder.findFirst({
    where: { id: salesOrderId, organizationId, status: "DRAFT", deletedAt: null },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true, currentBalance: true, creditLimit: true } },
      lines: {
        orderBy: { createdAt: "asc" },
        include: {
          item: {
            select: {
              id: true,
              sku: true,
              barcode: true,
              nameEn: true,
              nameFr: true,
              thumbnail: true,
              imageUrls: true,
              trackInventory: true,
              inventoryLevels: {
                select: {
                  locationId: true,
                  quantityOnHand: true,
                  quantityAvailable: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!cart) return null

  return {
    id: cart.id,
    orderNumber: cart.orderNumber,
    status: cart.status,
    locationId: cart.locationId,
    terminalId: cart.terminalId,
    sessionId: cart.sessionId,
    customer: {
      id: cart.customer.id,
      name: cart.customer.name,
      phone: cart.customer.phone,
      email: cart.customer.email,
      currentBalance: moneyToNumber(cart.customer.currentBalance),
      creditLimit: cart.customer.creditLimit ? moneyToNumber(cart.customer.creditLimit) : null,
    },
    subtotal: moneyToNumber(cart.subtotal),
    discount: moneyToNumber(cart.discount),
    taxAmount: moneyToNumber(cart.taxAmount),
    total: moneyToNumber(cart.total),
    lines: cart.lines.map((line) => {
      const inventoryLevel = line.item.inventoryLevels.find((level) => level.locationId === cart.locationId)

      return {
        id: line.id,
        itemId: line.itemId,
        sku: line.item.sku,
        barcode: line.item.barcode,
        nameEn: line.item.nameEn,
        nameFr: line.item.nameFr,
        thumbnail: line.item.thumbnail || line.item.imageUrls[0] || null,
        quantity: moneyToNumber(line.quantity),
        unitPrice: moneyToNumber(line.unitPrice),
        discount: moneyToNumber(line.discount),
        taxRate: moneyToNumber(line.taxRate),
        taxAmount: moneyToNumber(line.taxAmount),
        lineTotal: moneyToNumber(line.lineTotal),
        stock: {
          trackInventory: line.item.trackInventory,
          quantityOnHand: moneyToNumber(inventoryLevel?.quantityOnHand),
          quantityAvailable: moneyToNumber(inventoryLevel?.quantityAvailable),
        },
      }
    }),
  }
}

export async function listPOSLocations(input: OrgScoped) {
  return db.location.findMany({
    where: {
      organizationId: input.organizationId,
      isActive: true,
      deletedAt: null,
    },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      code: true,
      type: true,
      isDefault: true,
      organization: {
        select: {
          name: true,
          currency: true,
          defaultLocale: true,
        },
      },
    },
  })
}

export async function listPOSTerminals(rawInput: OrgScoped) {
  const input = posTerminalListSchema.parse(rawInput)
  return db.pOSStation.findMany({
    where: {
      organizationId: rawInput.organizationId,
      isActive: true,
      ...(input.locationId ? { locationId: input.locationId } : {}),
    },
    orderBy: [{ terminalNumber: "asc" }],
    select: {
      id: true,
      terminalNumber: true,
      name: true,
      hasCashDrawer: true,
      locationId: true,
      currentSessionId: true,
      currentSession: {
        select: {
          id: true,
          sessionNumber: true,
          status: true,
          startTime: true,
        },
      },
    },
  })
}

export async function getActivePOSSession(rawInput: OrgScoped) {
  const input = activePOSSessionSchema.parse(rawInput)
  const session = await db.pOSSession.findFirst({
    where: {
      organizationId: rawInput.organizationId,
      terminalId: input.terminalId,
      status: "ACTIVE",
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
      terminal: { select: { id: true, name: true, terminalNumber: true } },
      location: { select: { id: true, name: true } },
      cashDrawerTransactions: {
        include: {
          cashDrawer: {
            select: {
              id: true,
              currentBalance: true,
              expectedBalance: true,
              isOpen: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!session) return null

  const drawer = session.cashDrawerTransactions[0]?.cashDrawer ?? null

  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    status: session.status,
    startTime: session.startTime.toISOString(),
    terminalId: session.terminalId,
    terminalName: session.terminal.name,
    terminalNumber: session.terminal.terminalNumber,
    locationId: session.locationId,
    locationName: session.location.name,
    cashierName: displayName(session.user.firstName, session.user.lastName, session.user.email),
    openingBalance: moneyToNumber(session.openingBalance),
    expectedBalance: moneyToNumber(session.expectedBalance),
    totalSales: moneyToNumber(session.totalSales),
    totalTax: moneyToNumber(session.totalTax),
    totalDiscount: moneyToNumber(session.totalDiscount),
    transactionCount: session.transactionCount,
    cashTotal: moneyToNumber(session.cashTotal),
    cardTotal: moneyToNumber(session.cardTotal),
    mobileMoneyTotal: moneyToNumber(session.mobileMoneyTotal),
    bankTransferTotal: moneyToNumber(session.bankTransferTotal),
    creditTotal: moneyToNumber(session.creditTotal),
    cashDrawer: drawer
      ? {
          id: drawer.id,
          currentBalance: moneyToNumber(drawer.currentBalance),
          expectedBalance: moneyToNumber(drawer.expectedBalance),
          isOpen: drawer.isOpen,
        }
      : null,
  }
}

export async function openPOSShift(rawInput: UserScoped) {
  const input = openShiftSchema.parse(rawInput)
  const openingBalance = toDecimal(input.openingBalance)

  const terminal = await db.pOSStation.findFirst({
    where: {
      id: input.terminalId,
      organizationId: rawInput.organizationId,
      locationId: input.locationId,
      isActive: true,
    },
    select: { id: true, name: true, terminalNumber: true },
  })

  if (!terminal) throw new Error("Terminal not found for this location")

  const existing = await db.pOSSession.findFirst({
    where: {
      organizationId: rawInput.organizationId,
      terminalId: input.terminalId,
      status: "ACTIVE",
    },
    select: { id: true },
  })

  if (existing) throw new Error("Terminal already has an open shift")

  const session = await db.$transaction(async (tx) => {
    const created = await tx.pOSSession.create({
      data: {
        sessionNumber: nextSessionNumber(),
        organizationId: rawInput.organizationId,
        terminalId: input.terminalId,
        locationId: input.locationId,
        userId: rawInput.userId,
        openingBalance,
        expectedBalance: openingBalance,
        status: "ACTIVE",
        notes: input.notes,
      },
    })

    const drawer = await tx.cashDrawer.findFirst({
      where: {
        terminalId: input.terminalId,
        locationId: input.locationId,
      },
      orderBy: { createdAt: "asc" },
    })

    const cashDrawer = drawer
      ? await tx.cashDrawer.update({
          where: { id: drawer.id },
          data: {
            currentBalance: openingBalance,
            expectedBalance: openingBalance,
            isOpen: true,
          },
        })
      : await tx.cashDrawer.create({
          data: {
            name: `Cash Drawer - ${terminal.name}`,
            drawerNumber: `DRAWER-${terminal.terminalNumber}`,
            terminalId: input.terminalId,
            locationId: input.locationId,
            currentBalance: openingBalance,
            expectedBalance: openingBalance,
            isOpen: true,
          },
        })

    await tx.cashDrawerTransaction.create({
      data: {
        cashDrawerId: cashDrawer.id,
        sessionId: created.id,
        userId: rawInput.userId,
        type: "OPENING_BALANCE",
        amount: openingBalance,
        reason: "Shift opening float",
        notes: input.notes,
        balanceBefore: 0,
        balanceAfter: openingBalance,
      },
    })

    await tx.pOSStation.update({
      where: { id: input.terminalId },
      data: { currentSessionId: created.id },
    })

    return created
  })

  return getActivePOSSession({ organizationId: rawInput.organizationId, terminalId: session.terminalId })
}

export async function closePOSShift(rawInput: UserScoped) {
  const input = closeShiftSchema.parse(rawInput)
  const actualBalance = toDecimal(input.actualBalance)

  const session = await db.pOSSession.findFirst({
    where: {
      id: input.sessionId,
      organizationId: rawInput.organizationId,
      status: "ACTIVE",
    },
    include: {
      terminal: {
        include: {
          cashDrawers: {
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      },
    },
  })

  if (!session) throw new Error("Open shift not found")

  const expectedBalance = toDecimal(session.expectedBalance)
  const variance = subtractMoney(actualBalance, expectedBalance)

  await db.$transaction(async (tx) => {
    await tx.pOSSession.update({
      where: { id: session.id },
      data: {
        status: "CLOSED",
        endTime: new Date(),
        closingBalance: actualBalance,
        variance,
        notes: input.notes,
      },
    })

    const drawer = session.terminal.cashDrawers[0]
    if (drawer) {
      await tx.cashDrawer.update({
        where: { id: drawer.id },
        data: {
          currentBalance: actualBalance,
          isOpen: false,
        },
      })

      await tx.cashDrawerTransaction.create({
        data: {
          cashDrawerId: drawer.id,
          sessionId: session.id,
          userId: rawInput.userId,
          type: "CLOSING_BALANCE",
          amount: actualBalance,
          reason: "Shift closing count",
          notes: input.notes,
          balanceBefore: expectedBalance,
          balanceAfter: actualBalance,
        },
      })
    }

    await tx.pOSStation.update({
      where: { id: session.terminalId },
      data: { currentSessionId: null },
    })
  })

  return {
    sessionId: session.id,
    terminalId: session.terminalId,
    variance: moneyToNumber(variance),
  }
}

export async function listPOSCatalogItems(rawInput: OrgScoped) {
  const input = posCatalogSchema.parse(rawInput)
  const search = input.search?.trim()

  const [categories, items] = await Promise.all([
    db.category.findMany({
      where: {
        organizationId: rawInput.organizationId,
        isActive: true,
        deletedAt: null,
      },
      orderBy: { titleEn: "asc" },
      select: {
        id: true,
        titleEn: true,
        titleFr: true,
        parentId: true,
      },
    }),
    db.item.findMany({
      where: {
        organizationId: rawInput.organizationId,
        isActive: true,
        isDiscontinued: false,
        deletedAt: null,
        ...(input.categoryId ? { categoryId: input.categoryId } : {}),
        ...(search
          ? {
              OR: [
                { nameEn: { contains: search, mode: "insensitive" } },
                { nameFr: { contains: search, mode: "insensitive" } },
                { sku: { contains: search, mode: "insensitive" } },
                { barcode: { contains: search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { nameEn: "asc" },
      take: input.take,
      include: {
        category: { select: { id: true, titleEn: true, titleFr: true } },
        brand: { select: { id: true, nameEn: true, nameFr: true } },
        taxRate: { select: { id: true, rate: true, nameEn: true, nameFr: true } },
        inventoryLevels: {
          where: { locationId: input.locationId },
          select: {
            quantityOnHand: true,
            quantityAvailable: true,
            reorderPoint: true,
            averageCost: true,
            totalValue: true,
          },
          take: 1,
        },
      },
    }),
  ])

  return {
    categories,
    items: items.map((item) => {
      const level = item.inventoryLevels[0]
      const available = toDecimal(level?.quantityAvailable)
      const minimum = toDecimal(item.minStockLevel || level?.reorderPoint)
      return {
        id: item.id,
        sku: item.sku,
        barcode: item.barcode,
        nameEn: item.nameEn,
        nameFr: item.nameFr,
        thumbnail: item.thumbnail || item.imageUrls[0] || null,
        sellingPrice: moneyToNumber(item.sellingPrice),
        costPrice: moneyToNumber(item.costPrice),
        taxRate: item.taxRate ? moneyToNumber(item.taxRate.rate) : 0,
        trackInventory: item.trackInventory,
        category: item.category,
        brand: item.brand,
        stock: {
          quantityOnHand: moneyToNumber(level?.quantityOnHand),
          quantityAvailable: moneyToNumber(available),
          reorderPoint: moneyToNumber(minimum),
          status: stockStatus(available, minimum, item.trackInventory),
        },
      }
    }),
  }
}

export async function getActivePOSCart(rawInput: UserScoped) {
  const input = activeCartSchema.parse(rawInput)
  const cart = await db.salesOrder.findFirst({
    where: {
      organizationId: rawInput.organizationId,
      locationId: input.locationId,
      terminalId: input.terminalId,
      sessionId: input.sessionId,
      createdById: rawInput.userId,
      status: "DRAFT",
      deletedAt: null,
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true },
  })

  return cart ? mapCart(cart.id, rawInput.organizationId) : null
}

export async function addPOSCartLine(rawInput: UserScoped) {
  const input = addCartLineSchema.parse(rawInput)
  const quantityToAdd = toDecimal(input.quantity)

  const cart = await db.$transaction(async (tx) => {
    const item = await tx.item.findFirst({
      where: {
        id: input.itemId,
        organizationId: rawInput.organizationId,
        isActive: true,
        isDiscontinued: false,
        deletedAt: null,
      },
      include: {
        taxRate: { select: { rate: true } },
        inventoryLevels: {
          where: { locationId: input.locationId },
          select: { quantityAvailable: true },
          take: 1,
        },
      },
    })

    if (!item) throw new Error("Item not found")

    const salesOrder = await getOrCreateDraftCart(tx, {
      organizationId: rawInput.organizationId,
      userId: rawInput.userId,
      locationId: input.locationId,
      terminalId: input.terminalId,
      sessionId: input.sessionId,
    })

    const existingLine = await tx.salesOrderLine.findFirst({
      where: {
        salesOrderId: salesOrder.id,
        itemId: item.id,
      },
    })

    const nextQuantity = existingLine ? addMoney(existingLine.quantity, quantityToAdd) : quantityToAdd
    const available = toDecimal(item.inventoryLevels[0]?.quantityAvailable)
    if (item.trackInventory && available.lt(nextQuantity)) {
      throw new Error("Insufficient stock at this location")
    }

    const unitPrice = toDecimal(item.sellingPrice)
    const taxRate = toDecimal(item.taxRate?.rate)
    const { taxAmount, lineTotal } = lineMath({
      quantity: nextQuantity,
      unitPrice,
      taxRate,
      discount: existingLine?.discount ?? new Prisma.Decimal(0),
    })

    if (existingLine) {
      await tx.salesOrderLine.update({
        where: { id: existingLine.id },
        data: {
          quantity: nextQuantity,
          unitPrice,
          taxRate,
          taxAmount,
          lineTotal,
        },
      })
    } else {
      await tx.salesOrderLine.create({
        data: {
          salesOrderId: salesOrder.id,
          itemId: item.id,
          quantity: nextQuantity,
          unitPrice,
          taxRate,
          taxAmount,
          lineTotal,
        },
      })
    }

    await recalculateCartTotals(tx, salesOrder.id)
    return salesOrder
  })

  return mapCart(cart.id, rawInput.organizationId)
}

export async function updatePOSCartLine(rawInput: UserScoped) {
  const input = updateCartLineSchema.parse(rawInput)
  let quantity = toDecimal(input.quantity)

  await db.$transaction(async (tx) => {
    const line = await tx.salesOrderLine.findFirst({
      where: {
        id: input.lineId,
        salesOrderId: input.salesOrderId,
        salesOrder: {
          is: {
            organizationId: rawInput.organizationId,
            createdById: rawInput.userId,
            status: "DRAFT",
            deletedAt: null,
          },
        },
      },
      include: {
        item: {
          select: { trackInventory: true },
        },
        salesOrder: { select: { locationId: true } },
      },
    })

    if (!line) throw new Error("Cart line not found")

    if (quantity.lte(0)) {
      await tx.salesOrderLine.delete({ where: { id: line.id } })
      await recalculateCartTotals(tx, input.salesOrderId)
      return
    }

    const inventoryLevel = await tx.inventoryLevel.findUnique({
      where: { itemId_locationId: { itemId: line.itemId, locationId: line.salesOrder.locationId } },
      select: { quantityOnHand: true },
    })
    const quantityOnHand = toDecimal(inventoryLevel?.quantityOnHand)
    if (line.item.trackInventory && quantityOnHand.lt(quantity)) {
      quantity = quantityOnHand
    }

    if (quantity.lte(0)) {
      await tx.salesOrderLine.delete({ where: { id: line.id } })
      await recalculateCartTotals(tx, input.salesOrderId)
      return
    }

    const { taxAmount, lineTotal } = lineMath({
      quantity,
      unitPrice: toDecimal(line.unitPrice),
      discount: toDecimal(line.discount),
      taxRate: toDecimal(line.taxRate),
    })

    await tx.salesOrderLine.update({
      where: { id: line.id },
      data: { quantity, taxAmount, lineTotal },
    })

    await recalculateCartTotals(tx, input.salesOrderId)
  })

  return mapCart(input.salesOrderId, rawInput.organizationId)
}

export async function removePOSCartLine(rawInput: UserScoped) {
  const input = removeCartLineSchema.parse(rawInput)

  await db.$transaction(async (tx) => {
    const line = await tx.salesOrderLine.findFirst({
      where: {
        id: input.lineId,
        salesOrderId: input.salesOrderId,
        salesOrder: {
          is: {
            organizationId: rawInput.organizationId,
            createdById: rawInput.userId,
            status: "DRAFT",
            deletedAt: null,
          },
        },
      },
      select: { id: true },
    })

    if (!line) throw new Error("Cart line not found")

    await tx.salesOrderLine.delete({ where: { id: line.id } })
    await recalculateCartTotals(tx, input.salesOrderId)
  })

  return mapCart(input.salesOrderId, rawInput.organizationId)
}

export type CommitPOSSaleResult = {
  saleId: string
  orderNumber: string
  status: string
  paymentStatus: string
  total: number
  amountPaid: number
  onAccountAmount: number
  changeDue: number
  receipt: SalesReceiptPayload
  delivery: ReceiptDeliveryResult | null
}

export async function commitPOSSale(rawInput: UserScoped) {
  const input = commitSaleSchema.parse(rawInput)

  const committed = await db.$transaction(async (tx) => {
    const sale = await tx.salesOrder.findFirst({
      where: {
        id: input.salesOrderId,
        organizationId: rawInput.organizationId,
        locationId: input.locationId,
        terminalId: input.terminalId,
        sessionId: input.sessionId,
        createdById: rawInput.userId,
        status: "DRAFT",
        deletedAt: null,
      },
      include: {
        customer: { select: { id: true, code: true, currentBalance: true, creditLimit: true } },
        lines: {
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                costPrice: true,
                trackInventory: true,
                inventoryLevels: {
                  where: { locationId: input.locationId },
                  select: {
                    id: true,
                    quantityOnHand: true,
                    quantityAvailable: true,
                    averageCost: true,
                    version: true,
                  },
                  take: 1,
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!sale) throw new Error("Draft POS sale not found")
    if (sale.lines.length === 0) throw new Error("Cannot commit an empty cart")

    const session = await tx.pOSSession.findFirst({
      where: {
        id: input.sessionId,
        organizationId: rawInput.organizationId,
        terminalId: input.terminalId,
        locationId: input.locationId,
        status: "ACTIVE",
      },
      select: { id: true, expectedBalance: true },
    })

    if (!session) throw new Error("Active cashier shift not found")

    const customerId = input.customerId || sale.customerId
    const customer = await tx.customer.findFirst({
      where: {
        id: customerId,
        organizationId: rawInput.organizationId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        code: true,
        currentBalance: true,
        creditLimit: true,
      },
    })

    if (!customer) throw new Error("Customer not found")

    const total = toDecimal(sale.total).toDecimalPlaces(2)
    if (total.lte(0)) throw new Error("Sale total must be greater than zero")

    const { allocations, changeDue } = allocateTenders(input.tenders, total)
    const onAccountAmount = allocations
      .filter((allocation) => allocation.paymentMethod === "CREDIT")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const amountPaid = total.minus(onAccountAmount).toDecimalPlaces(2)

    if (onAccountAmount.gt(0)) {
      if (customer.code === "WALK_IN") {
        throw new Error("On-account tender requires an attached customer")
      }

      const nextBalance = addMoney(customer.currentBalance, onAccountAmount).toDecimalPlaces(2)
      if (customer.creditLimit && nextBalance.gt(customer.creditLimit)) {
        throw new Error("Customer credit limit would be exceeded")
      }

      await tx.customer.update({
        where: { id: customer.id },
        data: { currentBalance: nextBalance },
      })

      await tx.customerLedgerEntry.create({
        data: {
          customerId: customer.id,
          organizationId: rawInput.organizationId,
          type: "SALE",
          debit: onAccountAmount,
          credit: 0,
          balanceAfter: nextBalance,
          description: `POS sale ${sale.orderNumber}`,
          referenceType: "SALES_ORDER",
          referenceId: sale.id,
        },
      })
    }

    let totalCost = new Prisma.Decimal(0)
    const now = new Date()

    for (const line of sale.lines) {
      const quantity = toDecimal(line.quantity)
      if (quantity.lte(0)) throw new Error(`Invalid quantity for item ${line.item.sku}`)

      if (!line.item.trackInventory) continue

      const level = line.item.inventoryLevels[0]
      if (!level) {
        throw new Error(`No inventory level found for item ${line.item.sku} at this location`)
      }

      const quantityOnHand = toDecimal(level.quantityOnHand)
      const quantityAvailable = toDecimal(level.quantityAvailable)
      if (quantityOnHand.lt(quantity) || quantityAvailable.lt(quantity)) {
        throw new Error(`Insufficient stock for item ${line.item.sku}`)
      }

      const unitCost = toDecimal(level.averageCost).gt(0) ? toDecimal(level.averageCost) : toDecimal(line.item.costPrice)
      const lineCost = unitCost.times(quantity).toDecimalPlaces(2)
      const nextOnHand = quantityOnHand.minus(quantity)
      const nextAvailable = quantityAvailable.minus(quantity)
      const nextTotalValue = unitCost.times(nextOnHand).toDecimalPlaces(2)

      const update = await tx.inventoryLevel.updateMany({
        where: {
          id: level.id,
          version: level.version,
          quantityOnHand: { gte: quantity },
          quantityAvailable: { gte: quantity },
        },
        data: {
          quantityOnHand: nextOnHand,
          quantityAvailable: nextAvailable,
          totalValue: nextTotalValue,
          version: { increment: 1 },
          lastTransactionAt: now,
        },
      })

      if (update.count !== 1) {
        throw new Error(`Inventory changed while selling item ${line.item.sku}; retry the sale`)
      }

      await tx.inventoryTransaction.create({
        data: {
          itemId: line.itemId,
          locationId: input.locationId,
          organizationId: rawInput.organizationId,
          createdById: rawInput.userId,
          type: "SALE",
          quantity: quantity.times(-1),
          unitCost,
          totalCost: lineCost,
          balanceAfter: nextOnHand,
          referenceType: "SALES_ORDER",
          referenceId: sale.id,
          referenceNumber: sale.orderNumber,
          notes: `POS sale ${sale.orderNumber}`,
        },
      })

      totalCost = totalCost.plus(lineCost).toDecimalPlaces(2)
    }

    const cashNet = allocations
      .filter((allocation) => allocation.paymentMethod === "CASH")
      .reduce((sum, allocation) => addMoney(sum, allocation.tenderedAmount.minus(allocation.changeGiven)), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const cashApplied = allocations
      .filter((allocation) => allocation.paymentMethod === "CASH")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const cardApplied = allocations
      .filter((allocation) => allocation.paymentMethod === "CARD")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const mobileMoneyApplied = allocations
      .filter((allocation) => allocation.paymentMethod === "MOBILE_MONEY")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const bankTransferApplied = allocations
      .filter((allocation) => allocation.paymentMethod === "BANK_TRANSFER")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const storeCreditApplied = allocations
      .filter((allocation) => allocation.paymentMethod === "STORE_CREDIT")
      .reduce((sum, allocation) => addMoney(sum, allocation.amount), new Prisma.Decimal(0))
      .toDecimalPlaces(2)

    let drawerId: string | null = null
    if (cashNet.gt(0)) {
      const drawer = await tx.cashDrawer.findFirst({
        where: { terminalId: input.terminalId, locationId: input.locationId },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          isOpen: true,
          currentBalance: true,
          expectedBalance: true,
        },
      })

      if (!drawer?.isOpen) throw new Error("Cash drawer is not open for this terminal")

      drawerId = drawer.id
      const balanceAfter = addMoney(drawer.currentBalance, cashNet).toDecimalPlaces(2)
      await tx.cashDrawer.update({
        where: { id: drawer.id },
        data: {
          currentBalance: balanceAfter,
          expectedBalance: addMoney(drawer.expectedBalance, cashNet).toDecimalPlaces(2),
        },
      })

      await tx.cashDrawerTransaction.create({
        data: {
          cashDrawerId: drawer.id,
          sessionId: session.id,
          userId: rawInput.userId,
          type: "SALE",
          amount: cashNet,
          reason: `POS sale ${sale.orderNumber}`,
          balanceBefore: drawer.currentBalance,
          balanceAfter,
        },
      })
    }

    for (const allocation of allocations) {
      await tx.payment.create({
        data: {
          paymentNumber: nextPaymentNumber(),
          amount: allocation.amount,
          method: allocation.paymentMethod,
          status: allocation.paymentMethod === "CREDIT" ? "PENDING" : "PAID",
          organizationId: rawInput.organizationId,
          salesOrderId: sale.id,
          cashTendered: allocation.paymentMethod === "CASH" ? allocation.tenderedAmount : undefined,
          changeGiven: allocation.paymentMethod === "CASH" ? allocation.changeGiven : undefined,
          cardLast4: allocation.tender.cardLast4,
          cardType: allocation.tender.cardType,
          authorizationCode: allocation.tender.authorizationCode,
          mobileMoneyProvider: allocation.tender.mobileMoneyProvider,
          mobileMoneyPhoneNumber: allocation.tender.mobileMoneyPhoneNumber,
          mobileMoneyReference: allocation.paymentMethod === "MOBILE_MONEY" ? allocation.tender.reference : undefined,
          bankReference: allocation.paymentMethod === "BANK_TRANSFER" ? allocation.tender.reference : undefined,
          bankName: allocation.tender.bankName,
          transactionId: allocation.tender.reference,
          processedAt: allocation.paymentMethod === "CREDIT" ? undefined : now,
          processedById: rawInput.userId,
        },
      })
    }

    await tx.pOSSession.update({
      where: { id: session.id },
      data: {
        totalSales: { increment: total },
        totalTax: { increment: sale.taxAmount },
        totalDiscount: { increment: sale.discount },
        transactionCount: { increment: 1 },
        cashTotal: { increment: cashApplied },
        cardTotal: { increment: cardApplied },
        mobileMoneyTotal: { increment: mobileMoneyApplied },
        bankTransferTotal: { increment: bankTransferApplied },
        creditTotal: { increment: onAccountAmount },
        expectedBalance: addMoney(session.expectedBalance, cashNet).toDecimalPlaces(2),
      },
    })

    const paymentStatus = onAccountAmount.gt(0) ? (amountPaid.gt(0) ? "PARTIAL" : "PENDING") : "PAID"
    const updatedSale = await tx.salesOrder.update({
      where: { id: sale.id },
      data: {
        customerId: customer.id,
        status: "COMPLETED",
        paymentStatus,
        orderDate: now,
        notes: input.notes,
      },
    })

    const revenue = total.minus(sale.taxAmount).toDecimalPlaces(2)
    const journalEntries = [
      { account: "Cash Drawer", debit: cashApplied, credit: new Prisma.Decimal(0) },
      { account: "Card Clearing", debit: cardApplied, credit: new Prisma.Decimal(0) },
      { account: "Mobile Money Clearing", debit: mobileMoneyApplied, credit: new Prisma.Decimal(0) },
      { account: "Bank Clearing", debit: bankTransferApplied, credit: new Prisma.Decimal(0) },
      { account: "Store Credit Liability", debit: storeCreditApplied, credit: new Prisma.Decimal(0) },
      { account: "Customer Accounts Receivable", debit: onAccountAmount, credit: new Prisma.Decimal(0) },
      { account: "Sales Revenue", debit: new Prisma.Decimal(0), credit: revenue },
      { account: "Tax Payable", debit: new Prisma.Decimal(0), credit: sale.taxAmount },
      { account: "Cost of Goods Sold", debit: totalCost, credit: new Prisma.Decimal(0) },
      { account: "Inventory Asset", debit: new Prisma.Decimal(0), credit: totalCost },
    ].filter((entry) => toDecimal(entry.debit).gt(0) || toDecimal(entry.credit).gt(0))

    const totalDebits = journalEntries
      .reduce((sum, entry) => addMoney(sum, entry.debit), new Prisma.Decimal(0))
      .toDecimalPlaces(2)
    const totalCredits = journalEntries
      .reduce((sum, entry) => addMoney(sum, entry.credit), new Prisma.Decimal(0))
      .toDecimalPlaces(2)

    if (!totalDebits.eq(totalCredits)) {
      throw new Error("Finance journal is not balanced")
    }

    await tx.auditLog.create({
      data: {
        entityType: "FinanceLedger",
        entityId: sale.id,
        action: "POS_SALE_POSTED",
        organizationId: rawInput.organizationId,
        userId: rawInput.userId,
        changes: cleanJson({
          orderNumber: sale.orderNumber,
          drawerId,
          entries: journalEntries.map((entry) => ({
            account: entry.account,
            debit: moneyToString(entry.debit),
            credit: moneyToString(entry.credit),
          })),
          totalDebits: moneyToString(totalDebits),
          totalCredits: moneyToString(totalCredits),
        }),
      },
    })

    await tx.auditLog.create({
      data: {
        entityType: "SalesOrder",
        entityId: sale.id,
        action: "POS_SALE_COMMIT",
        organizationId: rawInput.organizationId,
        userId: rawInput.userId,
        changes: cleanJson({
          status: updatedSale.status,
          paymentStatus: updatedSale.paymentStatus,
          amountPaid: moneyToString(amountPaid),
          onAccountAmount: moneyToString(onAccountAmount),
          changeDue: moneyToString(changeDue),
        }),
      },
    })

    return {
      saleId: sale.id,
      orderNumber: sale.orderNumber,
      status: updatedSale.status,
      paymentStatus: updatedSale.paymentStatus,
      total,
      amountPaid,
      onAccountAmount,
      changeDue,
    }
  })

  const receipt = await getSalesReceipt({
    salesOrderId: committed.saleId,
    organizationId: rawInput.organizationId,
  })

  let delivery: ReceiptDeliveryResult | null = null
  if (input.receipt) {
    try {
      delivery = await sendReceipt({
        salesOrderId: committed.saleId,
        organizationId: rawInput.organizationId,
        userId: rawInput.userId,
        channel: input.receipt.channel,
        destination: input.receipt.destination,
        locale: input.receipt.locale,
      })
    } catch (error) {
      delivery = {
        channel: input.receipt.channel,
        status: "FAILED",
        retryable: false,
        message: error instanceof Error ? error.message : "Receipt delivery failed",
        digitalReceiptUrl: receipt.digitalReceiptUrl,
      }
    }
  }

  return {
    saleId: committed.saleId,
    orderNumber: committed.orderNumber,
    status: committed.status,
    paymentStatus: committed.paymentStatus,
    total: moneyToNumber(committed.total),
    amountPaid: moneyToNumber(committed.amountPaid),
    onAccountAmount: moneyToNumber(committed.onAccountAmount),
    changeDue: moneyToNumber(committed.changeDue),
    receipt,
    delivery,
  } satisfies CommitPOSSaleResult
}
