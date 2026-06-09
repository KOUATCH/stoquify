import { randomUUID } from "crypto"
import argon2 from "argon2"
import {
  Locale,
  LocationType,
  POSSessionStatus,
  PrismaClient,
  TaxType,
  TransactionReferenceType,
  TransactionType,
  UnitType,
} from "@prisma/client"

const prisma = new PrismaClient()

const ORGANIZATION_ID = "org_stockflow_demo"
const STORE_LOCATION_ID = "loc_stockflow_store"
const WAREHOUSE_LOCATION_ID = "loc_stockflow_warehouse"

const ROLE_PERMISSIONS = {
  ADMIN: ["*"],
  MANAGER: [
    "DASHBOARD_READ",
    "READ_ITEMS",
    "CREATE_ITEMS",
    "UPDATE_ITEMS",
    "READ_USERS",
    "READ_ROLES",
    "VIEW_INVENTORY_REPORTS",
    "MANAGE_INVENTORY_LEVELS",
    "ORDERS_READ",
    "ANALYTICS_READ",
    "CASH_SYSTEM_READ",
  ],
  CASHIER: [
    "DASHBOARD_READ",
    "READ_ITEMS",
    "ORDERS_READ",
    "CASH_DRAWER_READ",
    "CASH_SYSTEM_READ",
  ],
} as const

type SeedUser = {
  id: string
  email: string
  firstName: string
  lastName: string
  roleCode: keyof typeof ROLE_PERMISSIONS
  password: string
}

type SeedItem = {
  id: string
  sku: string
  slug: string
  nameEn: string
  nameFr: string
  descriptionEn: string
  descriptionFr: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderPoint: number
}

const now = () => new Date()

const safeDelete = async (label: string, operation: () => Promise<unknown>) => {
  try {
    await operation()
  } catch (error) {
    console.warn(`Skipped ${label} cleanup`, error instanceof Error ? error.message : error)
  }
}

const hashPassword = (password: string) =>
  argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })

const clearDatabase = async () => {
  await safeDelete("payment_refunds", () => prisma.paymentRefund.deleteMany())
  await safeDelete("cash_drawer_transactions", () => prisma.cashDrawerTransaction.deleteMany())
  await safeDelete("payments", () => prisma.payment.deleteMany())
  await safeDelete("sales_order_lines", () => prisma.salesOrderLine.deleteMany())
  await safeDelete("sales_orders", () => prisma.salesOrder.deleteMany())
  await safeDelete("daily_sales_report_cash_events", () => prisma.dailySalesReportCashEvent.deleteMany())
  await safeDelete("daily_sales_report_items", () => prisma.dailySalesReportItem.deleteMany())
  await safeDelete("daily_sales_reports", () => prisma.dailySalesReport.deleteMany())
  await safeDelete("goods_receipt_lines", () => prisma.goodsReceiptLine.deleteMany())
  await safeDelete("goods_receipts", () => prisma.goodsReceipt.deleteMany())
  await safeDelete("purchase_order_lines", () => prisma.purchaseOrderLine.deleteMany())
  await safeDelete("purchase_orders", () => prisma.purchaseOrder.deleteMany())
  await safeDelete("stock_transfer_lines", () => prisma.stockTransferLine.deleteMany())
  await safeDelete("stock_transfers", () => prisma.stockTransfer.deleteMany())
  await safeDelete("stock_adjustment_lines", () => prisma.stockAdjustmentLine.deleteMany())
  await safeDelete("stock_adjustments", () => prisma.stockAdjustment.deleteMany())
  await safeDelete("production_batches", () => prisma.productionBatch.deleteMany())
  await safeDelete("recipe_ingredients", () => prisma.recipeIngredient.deleteMany())
  await safeDelete("recipes", () => prisma.recipe.deleteMany())
  await safeDelete("pos_sessions", () => prisma.pOSSession.deleteMany())
  await safeDelete("cash_drawers", () => prisma.cashDrawer.deleteMany())
  await safeDelete("pos_terminals", () => prisma.pOSStation.deleteMany())
  await safeDelete("inventory_transactions", () => prisma.inventoryTransaction.deleteMany())
  await safeDelete("inventory_levels", () => prisma.inventoryLevel.deleteMany())
  await safeDelete("serial_numbers", () => prisma.serialNumber.deleteMany())
  await safeDelete("item_suppliers", () => prisma.itemSupplier.deleteMany())
  await safeDelete("supplier_ledger_entries", () => prisma.supplierLedgerEntry.deleteMany())
  await safeDelete("customer_ledger_entries", () => prisma.customerLedgerEntry.deleteMany())
  await safeDelete("items", () => prisma.item.deleteMany())
  await safeDelete("suppliers", () => prisma.supplier.deleteMany())
  await safeDelete("customers", () => prisma.customer.deleteMany())
  await safeDelete("tax_rates", () => prisma.taxRate.deleteMany())
  await safeDelete("units", () => prisma.unit.deleteMany())
  await safeDelete("brands", () => prisma.brand.deleteMany())
  await safeDelete("categories", () => prisma.category.deleteMany())
  await safeDelete("locations", () => prisma.location.deleteMany())
  await safeDelete("invites", () => prisma.invite.deleteMany())
  await safeDelete("audit_logs", () => prisma.auditLog.deleteMany())
  await safeDelete("password_history", () => prisma.passwordHistory.deleteMany())
  await safeDelete("sessions", () => prisma.session.deleteMany())
  await safeDelete("accounts", () => prisma.account.deleteMany())
  await safeDelete("users", () => prisma.user.deleteMany())
  await safeDelete("roles", () => prisma.role.deleteMany())
  await safeDelete("organizations", () => prisma.organization.deleteMany())
}

const seedOrganization = () =>
  prisma.organization.create({
    data: {
      id: ORGANIZATION_ID,
      name: "StockFlow Demo",
      slug: "stockflow-demo",
      industry: "Retail and inventory management",
      country: "Cameroon",
      state: "Littoral",
      address: "Boulevard de la Liberte, Douala",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: Locale.EN,
      fiscalYearStart: "01-01",
      inventoryStartDate: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
      updatedAt: now(),
    },
  })

const seedRoles = async () => {
  const roles = await Promise.all(
    Object.entries(ROLE_PERMISSIONS).map(([code, permissions]) =>
      prisma.role.create({
        data: {
          id: `role_${code.toLowerCase()}`,
          code,
          nameEn: code
            .toLowerCase()
            .replace(/_/g, " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
          nameFr:
            code === "ADMIN"
              ? "Administrateur"
              : code === "MANAGER"
                ? "Gestionnaire"
                : "Caissier",
          description: `${code} demo role`,
          permissions: [...permissions],
          organizationId: ORGANIZATION_ID,
          updatedAt: now(),
        },
      }),
    ),
  )

  return Object.fromEntries(roles.map((role) => [role.code, role]))
}

const seedUsers = async (roles: Awaited<ReturnType<typeof seedRoles>>) => {
  const users: SeedUser[] = [
    {
      id: "usr_demo_admin",
      email: "admin@stockflow-demo.test",
      firstName: "Amina",
      lastName: "Admin",
      roleCode: "ADMIN",
      password: "Admin@123",
    },
    {
      id: "usr_demo_manager",
      email: "manager@stockflow-demo.test",
      firstName: "Marc",
      lastName: "Manager",
      roleCode: "MANAGER",
      password: "Manager@123",
    },
    {
      id: "usr_demo_cashier",
      email: "cashier@stockflow-demo.test",
      firstName: "Claire",
      lastName: "Cashier",
      roleCode: "CASHIER",
      password: "Cashier@123",
    },
  ]

  const createdUsers = []

  for (const user of users) {
    createdUsers.push(
      await prisma.user.create({
        data: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          password: await hashPassword(user.password),
          isActive: true,
          isVerified: true,
          preferredLocale: user.roleCode === "CASHIER" ? Locale.FR : Locale.EN,
          organization: {
            connect: { id: ORGANIZATION_ID },
          },
          roles: {
            connect: { id: roles[user.roleCode].id },
          },
          updatedAt: now(),
        },
      }),
    )
  }

  return createdUsers
}

const seedLocations = () =>
  Promise.all([
    prisma.location.create({
      data: {
        id: STORE_LOCATION_ID,
        name: "StockFlow Demo Store",
        code: "STORE-001",
        type: LocationType.STORE,
        address: "Akwa, Douala",
        phone: "+237 600 000 001",
        email: "store@stockflow-demo.test",
        isActive: true,
        isDefault: true,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
    prisma.location.create({
      data: {
        id: WAREHOUSE_LOCATION_ID,
        name: "StockFlow Demo Warehouse",
        code: "WH-001",
        type: LocationType.WAREHOUSE,
        address: "Bonaberi, Douala",
        phone: "+237 600 000 002",
        email: "warehouse@stockflow-demo.test",
        isActive: true,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
  ])

const seedCatalog = async () => {
  const [category, brand, unit, taxRate] = await Promise.all([
    prisma.category.create({
      data: {
        id: "cat_demo_beverages",
        slug: "beverages",
        titleEn: "Beverages",
        titleFr: "Boissons",
        descriptionEn: "Shelf-stable drinks and refreshments",
        descriptionFr: "Boissons et rafraichissements",
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
    prisma.brand.create({
      data: {
        id: "brand_demo_house",
        brandName: "StockFlow House",
        slug: "stockflow-house",
        descriptionEn: "Demo private-label products",
        descriptionFr: "Produits de demonstration en marque propre",
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
    prisma.unit.create({
      data: {
        id: "unit_demo_piece",
        nameEn: "Piece",
        nameFr: "Piece",
        symbol: "pc",
        type: UnitType.QUANTITY,
        baseUnit: "pc",
        conversionRate: 1,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
    prisma.taxRate.create({
      data: {
        id: "tax_demo_vat",
        nameEn: "VAT 19.25%",
        nameFr: "TVA 19,25 %",
        rate: 19.25,
        type: TaxType.VAT,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
  ])

  return { category, brand, unit, taxRate }
}

const seedPartners = async () => {
  const [supplier, customer] = await Promise.all([
    prisma.supplier.create({
      data: {
        id: "sup_demo_primary",
        name: "Central Supply Co.",
        code: "SUP-001",
        contactPerson: "Jean Supplier",
        email: "supplier@stockflow-demo.test",
        phone: "+237 600 100 001",
        address: "Industrial Zone, Douala",
        city: "Douala",
        country: "Cameroon",
        paymentTerms: 30,
        creditLimit: 1_000_000,
        preferredLocale: Locale.EN,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
    prisma.customer.create({
      data: {
        id: "cust_demo_walkin",
        name: "Walk-in Customer",
        code: "CUST-001",
        email: "customer@stockflow-demo.test",
        phone: "+237 600 200 001",
        address: "Douala",
        paymentTerms: 0,
        creditLimit: 0,
        preferredLocale: Locale.FR,
        organizationId: ORGANIZATION_ID,
        updatedAt: now(),
      },
    }),
  ])

  return { supplier, customer }
}

const seedItems = async (
  catalog: Awaited<ReturnType<typeof seedCatalog>>,
  supplierId: string,
) => {
  const items: SeedItem[] = [
    {
      id: "item_demo_water",
      sku: "BEV-WATER-500",
      slug: "mineral-water-500ml",
      nameEn: "Mineral Water 500 ml",
      nameFr: "Eau minerale 500 ml",
      descriptionEn: "Single bottle of mineral water",
      descriptionFr: "Bouteille individuelle d'eau minerale",
      costPrice: 150,
      sellingPrice: 250,
      quantityOnHand: 240,
      reorderPoint: 60,
    },
    {
      id: "item_demo_juice",
      sku: "BEV-JUICE-1L",
      slug: "tropical-juice-1l",
      nameEn: "Tropical Juice 1 L",
      nameFr: "Jus tropical 1 L",
      descriptionEn: "Shelf-stable tropical fruit juice",
      descriptionFr: "Jus de fruits tropicaux longue conservation",
      costPrice: 700,
      sellingPrice: 1_100,
      quantityOnHand: 96,
      reorderPoint: 24,
    },
    {
      id: "item_demo_energy",
      sku: "BEV-ENERGY-330",
      slug: "energy-drink-330ml",
      nameEn: "Energy Drink 330 ml",
      nameFr: "Boisson energisante 330 ml",
      descriptionEn: "Canned energy drink",
      descriptionFr: "Boisson energisante en canette",
      costPrice: 450,
      sellingPrice: 750,
      quantityOnHand: 144,
      reorderPoint: 36,
    },
  ]

  const createdItems = []

  for (const item of items) {
    const createdItem = await prisma.item.create({
      data: {
        id: item.id,
        slug: item.slug,
        sku: item.sku,
        nameEn: item.nameEn,
        nameFr: item.nameFr,
        descriptionEn: item.descriptionEn,
        descriptionFr: item.descriptionFr,
        imageUrls: [],
        costPrice: item.costPrice,
        sellingPrice: item.sellingPrice,
        trackInventory: true,
        minStockLevel: item.reorderPoint,
        maxStockLevel: item.quantityOnHand * 2,
        reorderLevel: item.reorderPoint,
        reorderQuantity: item.reorderPoint * 2,
        isActive: true,
        organizationId: ORGANIZATION_ID,
        categoryId: catalog.category.id,
        brandId: catalog.brand.id,
        unitId: catalog.unit.id,
        taxRateId: catalog.taxRate.id,
        updatedAt: now(),
      },
    })

    await prisma.itemSupplier.create({
      data: {
        id: `item_supplier_${item.id}`,
        itemId: createdItem.id,
        supplierId,
        supplierSku: `SUP-${item.sku}`,
        supplierName: "Central Supply Co.",
        isPreferred: true,
        leadTimeDays: 3,
        minOrderQuantity: item.reorderPoint,
        unitCost: item.costPrice,
        updatedAt: now(),
      },
    })

    for (const locationId of [STORE_LOCATION_ID, WAREHOUSE_LOCATION_ID]) {
      const quantityOnHand =
        locationId === STORE_LOCATION_ID ? item.quantityOnHand : item.quantityOnHand * 2
      const totalValue = quantityOnHand * item.costPrice

      await prisma.inventoryLevel.create({
        data: {
          id: `inv_${item.id}_${locationId}`,
          itemId: createdItem.id,
          locationId,
          quantityOnHand,
          quantityReserved: 0,
          quantityAvailable: quantityOnHand,
          quantityInTransit: 0,
          quantityOnOrder: 0,
          reorderPoint: item.reorderPoint,
          averageCost: item.costPrice,
          totalValue,
          lastCountDate: now(),
          lastTransactionAt: now(),
          updatedAt: now(),
        },
      })

      await prisma.inventoryTransaction.create({
        data: {
          id: randomUUID(),
          type: TransactionType.INITIAL_STOCK,
          quantity: quantityOnHand,
          unitCost: item.costPrice,
          totalCost: totalValue,
          itemId: createdItem.id,
          locationId,
          organizationId: ORGANIZATION_ID,
          referenceType: TransactionReferenceType.MANUAL,
          referenceNumber: "SEED-INITIAL-STOCK",
          notes: "Initial seed stock",
          serialNumbers: [],
          balanceAfter: quantityOnHand,
        },
      })
    }

    createdItems.push(createdItem)
  }

  return createdItems
}

const seedProduction = async (items: Awaited<ReturnType<typeof seedItems>>, userId: string) => {
  const outputItem = items[1]
  const ingredientItem = items[0]
  const recipe = await prisma.recipe.create({
    data: {
      id: "recipe_demo_juice_pack",
      nameEn: "Juice Pack Assembly",
      nameFr: "Assemblage pack de jus",
      outputItemId: outputItem.id,
      outputQuantity: 12,
      laborCost: 1_500,
      overheadCost: 500,
      version: 1,
      isActive: true,
      notes: "Demo production recipe using current bilingual fields.",
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
  })

  await prisma.recipeIngredient.create({
    data: {
      id: "recipe_ing_demo_water",
      recipeId: recipe.id,
      itemId: ingredientItem.id,
      quantity: 12,
      wastePercent: 0,
      notes: "Packaging input for demo recipe",
      updatedAt: now(),
    },
  })

  await prisma.productionBatch.create({
    data: {
      id: "batch_demo_001",
      batchNumber: "BATCH-DEMO-001",
      recipeId: recipe.id,
      plannedQuantity: 24,
      actualQuantity: 24,
      status: "COMPLETED",
      startedAt: new Date("2026-05-01T08:00:00.000Z"),
      completedAt: new Date("2026-05-01T11:00:00.000Z"),
      totalInputCost: 4_000,
      unitCost: 166.67,
      notes: "Completed demo production batch",
      locationId: STORE_LOCATION_ID,
      organizationId: ORGANIZATION_ID,
      createdById: userId,
      updatedAt: now(),
    },
  })
}

const seedPOS = async (cashierId: string) => {
  const terminal = await prisma.pOSStation.create({
    data: {
      id: "pos_terminal_demo_001",
      terminalNumber: "TERM-001",
      name: "Main Register",
      isActive: true,
      hasCashDrawer: true,
      locationId: STORE_LOCATION_ID,
      organizationId: ORGANIZATION_ID,
      updatedAt: now(),
    },
  })

  const session = await prisma.pOSSession.create({
    data: {
      id: "pos_session_demo_001",
      sessionNumber: "SESSION-DEMO-001",
      status: POSSessionStatus.ACTIVE,
      terminalId: terminal.id,
      locationId: STORE_LOCATION_ID,
      userId: cashierId,
      openingBalance: 50_000,
      organizationId: ORGANIZATION_ID,
      notes: "Seeded active POS session",
      updatedAt: now(),
    },
  })

  await prisma.pOSStation.update({
    where: { id: terminal.id },
    data: {
      currentSessionId: session.id,
      updatedAt: now(),
    },
  })

  await prisma.cashDrawer.create({
    data: {
      id: "cash_drawer_demo_001",
      name: "Main Cash Drawer",
      drawerNumber: "DRAWER-001",
      currentBalance: 50_000,
      expectedBalance: 50_000,
      isOpen: true,
      locationId: STORE_LOCATION_ID,
      terminalId: terminal.id,
      updatedAt: now(),
    },
  })
}

export async function seedCurrentDemo() {
  console.log("Resetting demo data")
  await clearDatabase()

  console.log("Seeding organization")
  await seedOrganization()

  console.log("Seeding roles and users")
  const roles = await seedRoles()
  const users = await seedUsers(roles)
  const admin = users.find((user) => user.email === "admin@stockflow-demo.test")
  const cashier = users.find((user) => user.email === "cashier@stockflow-demo.test")

  if (!admin || !cashier) {
    throw new Error("Seed users were not created")
  }

  console.log("Seeding locations, catalog, partners, and inventory")
  await seedLocations()
  const catalog = await seedCatalog()
  const { supplier } = await seedPartners()
  const items = await seedItems(catalog, supplier.id)

  console.log("Seeding production and POS data")
  await seedProduction(items, admin.id)
  await seedPOS(cashier.id)

  console.log("Seed complete")
  console.log("Admin: admin@stockflow-demo.test / Admin@123")
  console.log("Manager: manager@stockflow-demo.test / Manager@123")
  console.log("Cashier: cashier@stockflow-demo.test / Cashier@123")
}

export async function runCurrentSeed() {
  try {
    await seedCurrentDemo()
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  runCurrentSeed()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}
