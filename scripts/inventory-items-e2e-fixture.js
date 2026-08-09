#!/usr/bin/env node

const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const argon2 = require("argon2")
const { Locale, PrismaClient, UnitType } = require("@prisma/client")
const { PrismaPg } = require("@prisma/adapter-pg")
const { Pool } = require("pg")

function expandEnvValue(value) {
  return value.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)}/g,
    (_, key) => process.env[key] || "",
  )
}

function loadLocalEnv() {
  for (const envPath of [
    resolve(process.cwd(), ".env.local"),
    resolve(process.cwd(), ".env"),
  ]) {
    if (!existsSync(envPath)) continue

    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue

      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]] !== undefined) continue

      let value = match[2].trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = expandEnvValue(value).replace(/\\n/g, "\n")
    }
  }

  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (process.env[key]?.includes("${")) {
      process.env[key] = expandEnvValue(process.env[key])
    }
  }
}

loadLocalEnv()
function normalizePrismaUrl(rawUrl) {
  if (!rawUrl) return null
  const url = String(rawUrl).trim()
  if (!url) return null

  const expanded = url.replace(
    /\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g,
    (_, key) => process.env[key] || "",
  )

  if (expanded.startsWith("prisma+postgres://")) {
    return expanded.replace(/^prisma\+postgres:\/\//, "postgresql://")
  }
  return expanded
}

function resolvePrismaUrl(rawUrl) {
  const normalized = normalizePrismaUrl(rawUrl)
  if (!normalized || !normalized.includes("://")) return null

  if (
    normalized.startsWith("postgres://") ||
    normalized.startsWith("postgresql://")
  ) {
    return normalized
  }

  return null
}

function resolveInventoryFixtureDatabaseUrl() {
  const candidate =
    resolvePrismaUrl(process.env.DIRECT_URL) ||
    resolvePrismaUrl(process.env.DATABASE_URL) ||
    resolvePrismaUrl(process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_DATABASE_URL)

  if (candidate) return candidate

  const user = process.env.DB_USER || process.env.PGUSER || "postgres"
  const password = process.env.DB_PASSWORD || process.env.PGPASSWORD || ""
  const host = process.env.DB_HOST || process.env.PGHOST || "127.0.0.1"
  const port = process.env.DB_PORT || process.env.PGPORT || "5432"
  const database =
    process.env.DB_NAME ||
    process.env.PGDATABASE ||
    process.env.INVENTORY_ITEMS_E2E_DATABASE ||
    "dbakesman"
  const schema = process.env.DB_SCHEMA || process.env.DATABASE_SCHEMA || "public"
  const encodedUser = encodeURIComponent(user)
  const encodedPassword = encodeURIComponent(password)
  const auth = password ? `${encodedUser}:${encodedPassword}` : encodedUser

  return `postgresql://${auth}@${host}:${port}/${database}?schema=${schema}`
}

function createInventoryFixturePrismaClient() {
  const databaseUrl = resolveInventoryFixtureDatabaseUrl()
  if (!databaseUrl) {
    throw new Error(
      "No usable PostgreSQL DATABASE_URL found for fixture execution. Set DATABASE_URL or provide DB_* variables.",
    )
  }

  process.env.DATABASE_URL = databaseUrl

  try {
    const pool = new Pool({ connectionString: databaseUrl })
    const adapter = new PrismaPg(pool)
    const prisma = new PrismaClient({ adapter })

    return {
      prisma,
      disconnect: async () => {
        await prisma.$disconnect()
        await pool.end()
      },
    }
  } catch (error) {
    console.warn(
      `[inventory-items-e2e-fixture] Adapter bootstrap failed (${error?.message || error}). Falling back to Prisma direct client.`,
    )
    const prisma = new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
    })
    return {
      prisma,
      disconnect: async () => {
        await prisma.$disconnect()
      },
    }
  }
}


const DEMO_ONLY_NOTICE =
  "Local/CI-only inventory item browser fixture. This is not production inventory truth or a production backfill."
const ORGANIZATION_ID =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_ORG_ID ||
  "org_inventory_items_e2e_local"
const ORGANIZATION_SLUG =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_ORG_SLUG ||
  "stoquify-inventory-items-e2e-local"
const FOREIGN_ORGANIZATION_ID =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_FOREIGN_ORG_ID ||
  "org_inventory_items_e2e_foreign"
const FOREIGN_ORGANIZATION_SLUG =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_FOREIGN_ORG_SLUG ||
  "stoquify-inventory-items-e2e-foreign"
const USER_ID =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_USER_ID ||
  "usr_inventory_items_e2e_local"
const EMAIL = (
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_EMAIL ||
  "inventory.items@stockflow.test"
)
  .trim()
  .toLowerCase()
const PASSWORD =
  process.env.AQSTOQFLOW_INVENTORY_ITEMS_E2E_PASSWORD ||
  "InventoryItems@2026"
const ROLE_CODE = "INVENTORY_ITEMS_E2E"
const ITEM_ID = "item_inventory_items_e2e_editable"
const FOREIGN_ITEM_ID = "item_inventory_items_e2e_foreign"
const CATEGORY_ID = "cat_inventory_items_e2e"
const BRAND_ID = "brand_inventory_items_e2e"
const UNIT_ID = "unit_inventory_items_e2e_each"
const TAX_RATE_ID = "tax_inventory_items_e2e_vat"
const LOCATION_ID = "loc_inventory_items_e2e_douala"
const APP_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || "3000"}`
const ITEM_IMAGE_URL = new URL(
  "/images/assorted-beverages.png", APP_BASE_URL).toString()

const REQUIRED_PERMISSIONS = [
  "dashboard.read",
  "inventory.items.read",
  "inventory.items.create",
  "inventory.items.update",
  "inventory.categories.read",
  "inventory.brands.read",
  "inventory.units.read",
  "locations.read",
  "taxes.read",
]

const INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT = Object.freeze({
  fixtureSource: "scripts/inventory-items-e2e-fixture.js",
  fixturePurpose: "authenticated inventory item create/edit browser matrix",
  productionBackfill: false,
  organizationId: ORGANIZATION_ID,
  foreignOrganizationId: FOREIGN_ORGANIZATION_ID,
  roleCode: ROLE_CODE,
  itemId: ITEM_ID,
  foreignItemId: FOREIGN_ITEM_ID,
  requestedModules: ["inventory"],
  requiredPermissions: [...REQUIRED_PERMISSIONS],
})

function assertLocalFixtureAllowed(env = process.env) {
  const productionMarkers = [
    env.NODE_ENV,
    env.AQSTOQFLOW_ENV,
    env.VERCEL_ENV,
  ].map((value) =>
    String(value || "")
      .trim()
      .toLowerCase(),
  )

  if (productionMarkers.includes("production")) {
    throw new Error(
      `${DEMO_ONLY_NOTICE} Refusing to seed or delete fixtures while an environment marker is production.`,
    )
  }
}

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
}

async function cleanupInventoryItemsFixture(prisma) {
  assertLocalFixtureAllowed()

  await prisma.organization.deleteMany({
    where: {
      id: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] },
    },
  })
  await prisma.verification.deleteMany({
    where: { identifier: EMAIL },
  })

  const residual = {
    organizations: await prisma.organization.count({
      where: { id: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] } },
    }),
    users: await prisma.user.count({ where: { email: EMAIL } }),
    items: await prisma.item.count({
      where: { id: { in: [ITEM_ID, FOREIGN_ITEM_ID] } },
    }),
  }

  if (Object.values(residual).some((count) => count !== 0)) {
    throw new Error(
      `Inventory item E2E cleanup left fixture rows: ${JSON.stringify(residual)}`,
    )
  }

  return residual
}

async function seedInventoryItemsFixture(prisma) {
  assertLocalFixtureAllowed()

  if (!EMAIL || !PASSWORD) {
    throw new Error(
      "AQSTOQFLOW_INVENTORY_ITEMS_E2E_EMAIL and AQSTOQFLOW_INVENTORY_ITEMS_E2E_PASSWORD must be non-empty.",
    )
  }

  await cleanupInventoryItemsFixture(prisma)

  const now = new Date()
  const passwordHash = await hashPassword(PASSWORD)

  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        id: ORGANIZATION_ID,
        name: "Stoquify Inventory Items E2E",
        slug: ORGANIZATION_SLUG,
        industry: "Local browser validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["inventory"],
        onboardingSource: "playwright-inventory-items",
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })

    const foreignOrganization = await tx.organization.create({
      data: {
        id: FOREIGN_ORGANIZATION_ID,
        name: "Stoquify Inventory Items E2E Foreign",
        slug: FOREIGN_ORGANIZATION_SLUG,
        industry: "Local browser tenant-isolation validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["inventory"],
        onboardingSource: "playwright-inventory-items-foreign",
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })

    const role = await tx.role.create({
      data: {
        code: ROLE_CODE,
        nameEn: "Inventory Items E2E Editor",
        nameFr: "Editeur E2E des articles de stock",
        description:
          "Local-only role for the authenticated inventory item create/edit browser matrix.",
        permissions: REQUIRED_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const user = await tx.user.create({
      data: {
        id: USER_ID,
        email: EMAIL,
        firstName: "Inventory",
        lastName: "Editor",
        name: "Inventory Items E2E",
        jobTitle: "Inventory item browser verifier",
        password: passwordHash,
        emailVerified: true,
        isVerified: true,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        preferredLocale: Locale.EN,
        organizationId: organization.id,
        roles: { connect: { id: role.id } },
        updatedAt: now,
      },
    })

    await tx.account.create({
      data: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        scope: "profile email",
        updatedAt: now,
      },
    })

    await tx.location.create({
      data: {
        id: LOCATION_ID,
        code: "ITEM-E2E-DLA",
        name: "Douala Item Matrix",
        organizationId: organization.id,
        isDefault: true,
        isActive: true,
        updatedAt: now,
      },
    })

    await tx.category.create({
      data: {
        id: CATEGORY_ID,
        slug: "inventory-items-e2e-category",
        titleEn: "Browser Matrix Goods",
        titleFr: "Articles matrice navigateur",
        isActive: true,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    await tx.brand.create({
      data: {
        id: BRAND_ID,
        slug: "inventory-items-e2e-brand",
        nameEn: "Matrix Supply",
        nameFr: "Fourniture Matrix",
        isActive: true,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    await tx.unit.create({
      data: {
        id: UNIT_ID,
        symbol: "ea-e2e",
        type: UnitType.QUANTITY,
        nameEn: "inventory item e2e each",
        nameFr: "unite article e2e",
        isActive: true,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    await tx.taxRate.create({
      data: {
        id: TAX_RATE_ID,
        rate: "19.250",
        nameEn: "Inventory Item E2E VAT 19.25%",
        nameFr: "TVA article E2E 19,25 %",
        isActive: true,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const item = await tx.item.create({
      data: {
        id: ITEM_ID,
        slug: "playwright-inventory-item",
        sku: "PW-ITEM-001",
        barcode: "6202608070001",
        nameEn: "Playwright Inventory Item",
        nameFr: "Article inventaire Playwright",
        descriptionEn:
          "Deterministic organization-scoped item for browser evidence.",
        descriptionFr:
          "Article deterministe limite a l'organisation pour les preuves navigateur.",
        imageUrls: [ITEM_IMAGE_URL],
        thumbnail: ITEM_IMAGE_URL,
        costPrice: "1500.00",
        sellingPrice: "2250.00",
        msrp: "2500.00",
        dimensions: "30 x 20 x 10 cm",
        weight: "1.250",
        trackInventory: true,
        minStockLevel: "5.000",
        maxStockLevel: "100.000",
        reorderLevel: "10.000",
        reorderQuantity: "25.000",
        isActive: true,
        isDiscontinued: false,
        categoryId: CATEGORY_ID,
        brandId: BRAND_ID,
        unitId: UNIT_ID,
        taxRateId: TAX_RATE_ID,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const foreignItem = await tx.item.create({
      data: {
        id: FOREIGN_ITEM_ID,
        slug: "playwright-foreign-inventory-item",
        sku: "PW-FOREIGN-001",
        nameEn: "Foreign Tenant Inventory Item",
        descriptionEn: "Must never be exposed to the primary fixture tenant.",
        imageUrls: [],
        costPrice: "900.00",
        sellingPrice: "1200.00",
        organizationId: foreignOrganization.id,
        updatedAt: now,
      },
    })

    return {
      fixtureSource: INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT.fixtureSource,
      productionBackfill: false,
      organizationId: organization.id,
      foreignOrganizationId: foreignOrganization.id,
      userId: user.id,
      email: user.email,
      roleCode: role.code,
      permissions: REQUIRED_PERMISSIONS,
      itemId: item.id,
      foreignItemId: foreignItem.id,
    }
  })
}

async function main() {
  const mode = String(process.argv[2] || "seed").trim().toLowerCase()
  if (!new Set(["seed", "cleanup"]).has(mode)) {
    throw new Error(`Unsupported inventory item E2E fixture mode: ${mode}`)
  }

  const { prisma, disconnect } = createInventoryFixturePrismaClient()

  try {
    const result =
      mode === "cleanup"
        ? await cleanupInventoryItemsFixture(prisma)
        : await seedInventoryItemsFixture(prisma)
    console.log(JSON.stringify({ mode, ...result }, null, 2))
  } finally {
    await disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}

module.exports = {
  assertLocalFixtureAllowed,
  cleanupInventoryItemsFixture,
  seedInventoryItemsFixture,
  INVENTORY_ITEMS_E2E_FIXTURE_CONTRACT,
}


