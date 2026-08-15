#!/usr/bin/env node

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require("node:fs")
const { dirname, resolve } = require("node:path")
const argon2 = require("argon2")
const { Locale, PrismaClient, PurchaseOrderStatus } = require("@prisma/client")

function expandEnvValue(value) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] || "")
}

function loadLocalEnv() {
  for (const envPath of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
      process.env[match[1]] = expandEnvValue(value).replace(/\\n/g, "\n")
    }
  }
}

loadLocalEnv()

const FIXTURE_PATH = resolve(process.cwd(), "playwright/.auth/supplier-po-ack-fixture.json")
const STORAGE_STATE_PATH = resolve(process.cwd(), "playwright/.auth/supplier-po-ack.json")
const ORGANIZATION_ID = "org_supplier_po_ack_e2e"
const USER_ID = "usr_supplier_po_ack_e2e"
const ROLE_CODE = "SUPPLIER_PO_ACK_E2E_BUYER"
const EMAIL = (process.env.AQSTOQFLOW_SUPPLIER_PO_ACK_E2E_EMAIL || "supplier.po.buyer@stockflow.test").trim().toLowerCase()
const PASSWORD = process.env.AQSTOQFLOW_SUPPLIER_PO_ACK_E2E_PASSWORD || "SupplierPoAckE2E@2026"
const ONBOARDING_SOURCE = "local-playwright-supplier-po-ack"
const PERMISSIONS = ["dashboard.read", "purchases.orders.read", "purchases.orders.update"]

function resolvedDatabaseUrl() {
  return expandEnvValue(process.env.DIRECT_URL || process.env.DATABASE_URL || "")
}

function assertLocalDatabase(databaseUrl) {
  if (String(process.env.NODE_ENV || "").toLowerCase() === "production") {
    throw new Error("Supplier PO acknowledgement fixture refuses production environments.")
  }
  if (!databaseUrl) throw new Error("DATABASE_URL or DIRECT_URL is required.")
  const hostname = new URL(databaseUrl).hostname.toLowerCase()
  if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(hostname) && process.env.AQSTOQFLOW_SUPPLIER_PO_ACK_E2E_ALLOW_NONLOCAL !== "1") {
    throw new Error("Supplier PO acknowledgement fixture refuses a nonlocal database.")
  }
}

function runId() {
  return new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14) + "_" + Math.random().toString(36).slice(2, 8)
}

async function upsertBuyer(prisma, passwordHash, now) {
  const organization = await prisma.organization.upsert({
    where: { id: ORGANIZATION_ID },
    create: {
      id: ORGANIZATION_ID,
      name: "Stoquify Supplier PO Acknowledgement E2E",
      slug: "stoquify-supplier-po-ack-e2e",
      tradeName: "Stoquify Test Buyer",
      industry: "Synthetic browser certification",
      country: "Cameroon",
      countryCode: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: Locale.EN,
      requestedModules: ["purchasing"],
      onboardingSource: ONBOARDING_SOURCE,
      onboardingCompletedAt: now,
      isActive: true,
    },
    update: {
      requestedModules: ["purchasing"],
      isActive: true,
      deletedAt: null,
    },
  })
  if (organization.onboardingSource !== ONBOARDING_SOURCE) {
    throw new Error("Refusing to reuse a non-fixture organization.")
  }
  const role = await prisma.role.upsert({
    where: { organizationId_code: { organizationId: ORGANIZATION_ID, code: ROLE_CODE } },
    create: {
      code: ROLE_CODE,
      nameEn: "Supplier PO acknowledgement E2E buyer",
      nameFr: "Acheteur E2E accusé fournisseur",
      description: "Local browser-certification role.",
      permissions: PERMISSIONS,
      organizationId: ORGANIZATION_ID,
    },
    update: { permissions: PERMISSIONS },
  })
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      id: USER_ID,
      email: EMAIL,
      firstName: "Pilot",
      lastName: "Buyer",
      name: "Pilot Buyer",
      jobTitle: "Synthetic procurement reviewer",
      password: passwordHash,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      preferredLocale: Locale.EN,
      organizationId: ORGANIZATION_ID,
      roles: { connect: { id: role.id } },
    },
    update: {
      password: passwordHash,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      isLocked: false,
      lockedUntil: null,
      failedLoginAttempts: 0,
      organizationId: ORGANIZATION_ID,
      roles: { set: [{ id: role.id }] },
    },
  })
  await prisma.account.upsert({
    where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
    create: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
      scope: "profile email",
    },
    update: { password: passwordHash },
  })
  return user
}

async function seed(prisma) {
  const now = new Date()
  const id = runId()
  const passwordHash = await argon2.hash(PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
  const user = await upsertBuyer(prisma, passwordHash, now)
  const expectedDeliveryDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)

  const result = await prisma.$transaction(async (tx) => {
    const supplier = await tx.supplier.create({
      data: {
        name: "Fournitures Pilote " + id,
        code: "ACK-" + id,
        contactPerson: "PRIVATE CONTACT MUST BE REDACTED",
        email: "supplier.ack@stockflow.test",
        phone: "+237699000999",
        address: "PRIVATE SUPPLIER ADDRESS MUST BE REDACTED",
        country: "Cameroon",
        paymentTerms: 30,
        notes: "PRIVATE SUPPLIER NOTES MUST BE REDACTED",
        preferredLocale: Locale.FR,
        organizationId: ORGANIZATION_ID,
      },
    })
    const location = await tx.location.create({
      data: {
        name: "Douala Pilot Warehouse",
        code: "ACK-LOC-" + id,
        type: "WAREHOUSE",
        address: "PRIVATE INTERNAL LOCATION ADDRESS",
        isActive: true,
        organizationId: ORGANIZATION_ID,
      },
    })
    const item = await tx.item.create({
      data: {
        slug: "supplier-po-ack-item-" + id.toLowerCase(),
        sku: "ACK-SKU-" + id,
        nameEn: "Pilot cartons",
        nameFr: "Cartons pilote",
        descriptionEn: "Synthetic pilot item",
        descriptionFr: "Article pilote synthétique",
        imageUrls: [],
        costPrice: "2500.00",
        sellingPrice: "3500.00",
        organizationId: ORGANIZATION_ID,
      },
    })
    const inventoryLevel = await tx.inventoryLevel.create({
      data: {
        itemId: item.id,
        locationId: location.id,
        quantityOnHand: "40.000",
        quantityAvailable: "40.000",
        quantityOnOrder: "7.000",
        averageCost: "2400.00",
        totalValue: "96000.00",
      },
    })
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        orderNumber: "PO-ACK-" + id,
        status: PurchaseOrderStatus.APPROVED,
        orderDate: now,
        expectedDeliveryDate,
        paymentTerms: "Net 30",
        notes: "PRIVATE BUYER NOTE MUST BE REDACTED",
        internalNotes: "PRIVATE INTERNAL APPROVAL NOTE MUST BE REDACTED",
        subtotal: "25000.00",
        taxAmount: "4812.50",
        shippingCost: "500.00",
        discount: "0.00",
        total: "30312.50",
        supplierId: supplier.id,
        locationId: location.id,
        organizationId: ORGANIZATION_ID,
        createdById: user.id,
        approvedById: user.id,
        approvedAt: now,
        lines: {
          create: [{
            itemId: item.id,
            orderedQuantity: "10.000",
            receivedQuantity: "0.000",
            unitCost: "2500.00",
            discount: "0.00",
            taxRate: "19.250",
            taxAmount: "4812.50",
            lineTotal: "29812.50",
            notes: "PRIVATE LINE NOTE MUST BE REDACTED",
          }],
        },
      },
      include: { lines: true },
    })
    return { supplier, location, item, inventoryLevel, purchaseOrder }
  })

  const evidenceDir = resolve(process.cwd(), "what-next/evidence/supplier-po-acknowledgement-2026-08-15", id)
  const fixture = {
    runId: id,
    fixtureSource: "scripts/supplier-po-ack-e2e-fixture.js",
    productionBackfill: false,
    organizationId: ORGANIZATION_ID,
    userId: user.id,
    email: EMAIL,
    password: PASSWORD,
    roleCode: ROLE_CODE,
    permissions: PERMISSIONS,
    purchaseOrderId: result.purchaseOrder.id,
    purchaseOrderLineId: result.purchaseOrder.lines[0].id,
    orderNumber: result.purchaseOrder.orderNumber,
    supplierId: result.supplier.id,
    locationId: result.location.id,
    itemId: result.item.id,
    inventoryLevelId: result.inventoryLevel.id,
    expectedDeliveryDate: expectedDeliveryDate.toISOString(),
    evidenceDir,
    storageStatePath: STORAGE_STATE_PATH,
  }
  mkdirSync(dirname(FIXTURE_PATH), { recursive: true })
  mkdirSync(evidenceDir, { recursive: true })
  writeFileSync(FIXTURE_PATH, JSON.stringify(fixture, null, 2) + "\n")
  return fixture
}

async function assure(prisma) {
  const now = new Date()
  const updated = await prisma.session.updateMany({
    where: { userId: USER_ID, expiresAt: { gt: now } },
    data: {
      assuranceVerifiedAt: now,
      assuranceMethod: "password",
      assuranceOrganizationId: ORGANIZATION_ID,
      assuranceLevel: 1,
      assuranceFailureCount: 0,
      assuranceLockedUntil: null,
    },
  })
  if (updated.count < 1) throw new Error("Fresh-auth assurance requires an active buyer session.")
  return { sessionsUpdated: updated.count, assuranceVerifiedAt: now.toISOString() }
}

async function main() {
  const mode = String(process.argv[2] || "seed").trim().toLowerCase()
  if (!new Set(["seed", "assure"]).has(mode)) throw new Error("Unsupported mode: " + mode)
  const databaseUrl = resolvedDatabaseUrl()
  assertLocalDatabase(databaseUrl)
  process.env.DATABASE_URL = databaseUrl
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    const result = mode === "assure" ? await assure(prisma) : await seed(prisma)
    console.log(JSON.stringify({ mode, ...result }, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
