#!/usr/bin/env node

const { existsSync, readFileSync } = require("node:fs")
const { resolve } = require("node:path")
const argon2 = require("argon2")
const { Locale, PrismaClient } = require("@prisma/client")

function expandEnvValue(value) {
  return value.replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)}/g, (_, key) => process.env[key] || "")
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
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = expandEnvValue(value).replace(/\\n/g, "\n")
    }
  }
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (process.env[key]?.includes("$" + "{")) process.env[key] = expandEnvValue(process.env[key])
  }
}

loadLocalEnv()

const NOTICE = "Local/CI-only synthetic supplier browser fixture; never production supplier truth."
const FIXTURE_SOURCE = "scripts/supplier-e2e-fixture.js"
const ONBOARDING_SOURCE = "local-playwright-supplier"
const ORGANIZATION_ID = process.env.AQSTOQFLOW_SUPPLIER_E2E_ORG_ID || "org_supplier_e2e_local"
const FOREIGN_ORGANIZATION_ID = process.env.AQSTOQFLOW_SUPPLIER_E2E_FOREIGN_ORG_ID || "org_supplier_e2e_foreign"
const EMAIL = (process.env.AQSTOQFLOW_SUPPLIER_E2E_EMAIL || "supplier.admin@stockflow.test").trim().toLowerCase()
const DENIED_EMAIL = (process.env.AQSTOQFLOW_SUPPLIER_E2E_DENIED_EMAIL || "supplier.denied@stockflow.test").trim().toLowerCase()
const PASSWORD = process.env.AQSTOQFLOW_SUPPLIER_E2E_PASSWORD || "SupplierE2E@2026"
const DENIED_PASSWORD = process.env.AQSTOQFLOW_SUPPLIER_E2E_DENIED_PASSWORD || PASSWORD
const PERMITTED_USER_ID = "usr_supplier_e2e_local"
const PRIMARY_SUPPLIER_ID = "supplier_supplier_e2e_primary"
const FOREIGN_SUPPLIER_ID = "supplier_supplier_e2e_foreign"
const LIFECYCLE_SUPPLIER_IDS = Object.freeze({
  desktop: "supplier_supplier_e2e_archive_desktop",
  tablet: "supplier_supplier_e2e_archive_tablet",
  mobile: "supplier_supplier_e2e_archive_mobile",
})
const REQUIRED_PERMISSIONS = [
  "dashboard.read",
  "purchases.suppliers.read",
  "purchases.suppliers.create",
  "purchases.suppliers.update",
  "purchases.suppliers.delete",
  "purchasing.ap.invoice.view",
  "finance.payables.read",
  "reports.export",
]
const DENIED_PERMISSIONS = ["dashboard.read"]

function normalizePrismaDatasourceUrl(rawUrl) {
  if (!rawUrl) return rawUrl

  const trimmed = String(rawUrl).trim()
  if (!trimmed) return trimmed
  if (trimmed.startsWith("prisma://") || trimmed.startsWith("prisma+postgres://")) return trimmed
  if (trimmed.startsWith("postgres://") || trimmed.startsWith("postgresql://")) {
    return "prisma+postgres://" + trimmed.slice(trimmed.indexOf("://") + 3)
  }

  return trimmed
}

const SUPPLIER_E2E_FIXTURE_CONTRACT = Object.freeze({
  fixtureSource: FIXTURE_SOURCE,
  fixturePurpose: "authenticated supplier workflow browser certification",
  productionBackfill: false,
  organizationId: ORGANIZATION_ID,
  foreignOrganizationId: FOREIGN_ORGANIZATION_ID,
  roleCode: "SUPPLIER_E2E_ADMIN",
  deniedRoleCode: "SUPPLIER_E2E_DENIED",
  primarySupplierId: PRIMARY_SUPPLIER_ID,
  foreignSupplierId: FOREIGN_SUPPLIER_ID,
  lifecycleSupplierIds: { ...LIFECYCLE_SUPPLIER_IDS },
  requestedModules: ["purchasing", "finance"],
  requiredPermissions: [...REQUIRED_PERMISSIONS],
  deniedPermissions: [...DENIED_PERMISSIONS],
  assurance: {
    mode: "local-password-step-up",
    userId: PERMITTED_USER_ID,
    method: "password",
    level: 1,
    organizationBound: true,
  },
})

function resolvedDatabaseUrl(env = process.env) {
  const candidate = expandEnvValue(env.DIRECT_URL || env.DATABASE_URL || env.AQSTOQFLOW_SUPPLIER_E2E_DATABASE_URL || "")
  if (candidate) return normalizePrismaDatasourceUrl(candidate)
  const host = env.DB_HOST || env.PGHOST || "127.0.0.1"
  const port = env.DB_PORT || env.PGPORT || "5432"
  const user = env.DB_USER || env.PGUSER || "postgres"
  const password = env.DB_PASSWORD || env.PGPASSWORD || ""
  const database = env.DB_NAME || env.PGDATABASE || env.SUPPLIER_E2E_DATABASE || "dbakesman"
  const auth = encodeURIComponent(user) + (password ? ":" + encodeURIComponent(password) : "")
  return normalizePrismaDatasourceUrl(
    "postgresql://" + auth + "@" + host + ":" + port + "/" + database,
  )
}

function assertLocalFixtureAllowed(env = process.env, databaseUrl = "postgresql://postgres@127.0.0.1:5432/stoquify") {
  const markers = [env.NODE_ENV, env.AQSTOQFLOW_ENV, env.VERCEL_ENV]
    .map((value) => String(value || "").trim().toLowerCase())
  if (markers.includes("production")) {
    throw new Error(NOTICE + " Refusing to seed or delete fixtures while an environment marker is production.")
  }
  const hostname = new URL(databaseUrl).hostname.toLowerCase()
  if (!new Set(["127.0.0.1", "localhost", "::1", "[::1]"]).has(hostname) && env.AQSTOQFLOW_SUPPLIER_E2E_ALLOW_NONLOCAL !== "1") {
    throw new Error(NOTICE + " Refusing a nonlocal database without AQSTOQFLOW_SUPPLIER_E2E_ALLOW_NONLOCAL=1.")
  }
}

async function assertOwnedOrganizations(prisma) {
  const organizations = await prisma.organization.findMany({
    where: { id: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] } },
    select: { id: true, onboardingSource: true },
  })
  for (const organization of organizations) {
    if (organization.onboardingSource !== ONBOARDING_SOURCE) {
      throw new Error("Refusing to replace or delete non-fixture organization " + organization.id + ".")
    }
  }
}

async function cleanupSupplierFixture(prisma) {
  assertLocalFixtureAllowed(process.env, resolvedDatabaseUrl())
  await assertOwnedOrganizations(prisma)
  const exportAuditsBeforeCleanup = await prisma.auditLog.count({
    where: {
      organizationId: ORGANIZATION_ID,
      entityType: "SupplierManagementExport",
      action: "CONTROLLED_EXPORT_ALLOWED",
    },
  })
  await prisma.organization.deleteMany({
    where: {
      id: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] },
      onboardingSource: ONBOARDING_SOURCE,
    },
  })
  await prisma.verification.deleteMany({ where: { identifier: { in: [EMAIL, DENIED_EMAIL] } } })
  const residual = {
    organizations: await prisma.organization.count({ where: { id: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] } } }),
    users: await prisma.user.count({ where: { email: { in: [EMAIL, DENIED_EMAIL] } } }),
    suppliers: await prisma.supplier.count({ where: { organizationId: { in: [ORGANIZATION_ID, FOREIGN_ORGANIZATION_ID] } } }),
  }
  if (Object.values(residual).some((count) => count !== 0)) {
    throw new Error("Supplier E2E cleanup left fixture rows: " + JSON.stringify(residual))
  }
  return { ...residual, exportAuditsBeforeCleanup }
}

async function assureSupplierFixture(prisma) {
  assertLocalFixtureAllowed(process.env, resolvedDatabaseUrl())
  await assertOwnedOrganizations(prisma)
  const assuranceVerifiedAt = new Date()
  const updated = await prisma.session.updateMany({
    where: {
      userId: PERMITTED_USER_ID,
      expiresAt: { gt: assuranceVerifiedAt },
    },
    data: {
      assuranceVerifiedAt,
      assuranceMethod: "password",
      assuranceOrganizationId: ORGANIZATION_ID,
      assuranceLevel: 1,
      assuranceFailureCount: 0,
      assuranceLockedUntil: null,
    },
  })
  if (updated.count < 1) {
    throw new Error("Supplier E2E assurance requires an active permitted-user session.")
  }
  return {
    fixtureSource: FIXTURE_SOURCE,
    productionBackfill: false,
    userId: PERMITTED_USER_ID,
    organizationId: ORGANIZATION_ID,
    assuranceVerifiedAt: assuranceVerifiedAt.toISOString(),
    assuranceMethod: "password",
    assuranceLevel: 1,
    sessionsUpdated: updated.count,
  }
}

async function createUser(tx, input) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
  const user = await tx.user.create({
    data: {
      id: input.id,
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      name: input.firstName + " " + input.lastName,
      jobTitle: input.jobTitle,
      password: passwordHash,
      emailVerified: true,
      isVerified: true,
      isActive: true,
      isLocked: false,
      failedLoginAttempts: 0,
      preferredLocale: Locale.EN,
      organizationId: ORGANIZATION_ID,
      roles: { connect: { id: input.roleId } },
      updatedAt: input.now,
    },
  })
  await tx.account.create({
    data: {
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
      scope: "profile email",
      updatedAt: input.now,
    },
  })
  return user
}

async function seedSupplierFixture(prisma) {
  assertLocalFixtureAllowed(process.env, resolvedDatabaseUrl())
  await cleanupSupplierFixture(prisma)
  const now = new Date()
  return prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        id: ORGANIZATION_ID,
        name: "Stoquify Supplier E2E",
        slug: "stoquify-supplier-e2e-local",
        industry: "Synthetic browser validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["purchasing", "finance"],
        onboardingSource: ONBOARDING_SOURCE,
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })
    const foreignOrganization = await tx.organization.create({
      data: {
        id: FOREIGN_ORGANIZATION_ID,
        name: "Stoquify Supplier E2E Foreign",
        slug: "stoquify-supplier-e2e-foreign",
        industry: "Synthetic tenant-isolation validation",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["purchasing"],
        onboardingSource: ONBOARDING_SOURCE,
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })
    const role = await tx.role.create({
      data: {
        code: "SUPPLIER_E2E_ADMIN",
        nameEn: "Supplier E2E Administrator",
        nameFr: "Administrateur E2E fournisseurs",
        description: "Local-only superuser role for supplier browser certification.",
        permissions: ["*", ...REQUIRED_PERMISSIONS],
        organizationId: organization.id,
        updatedAt: now,
      },
    })
    const deniedRole = await tx.role.create({
      data: {
        code: "SUPPLIER_E2E_DENIED",
        nameEn: "Supplier E2E Denied User",
        nameFr: "Utilisateur E2E fournisseurs refuse",
        description: "Authenticated role without supplier or export capability.",
        permissions: DENIED_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    })
    const user = await createUser(tx, {
      id: PERMITTED_USER_ID,
      email: EMAIL,
      password: PASSWORD,
      firstName: "Supplier",
      lastName: "Administrator",
      jobTitle: "Synthetic supplier workflow verifier",
      roleId: role.id,
      now,
    })
    const deniedUser = await createUser(tx, {
      id: "usr_supplier_e2e_denied",
      email: DENIED_EMAIL,
      password: DENIED_PASSWORD,
      firstName: "Supplier",
      lastName: "Denied",
      jobTitle: "Synthetic supplier denial verifier",
      roleId: deniedRole.id,
      now,
    })

    await tx.supplier.create({
      data: {
        id: PRIMARY_SUPPLIER_ID,
        name: "Playwright Tenant Supplier",
        code: "SUP-E2E-PRIMARY",
        contactPerson: "Synthetic Contact",
        email: "supplier.primary@stockflow.test",
        phone: "+237600000001",
        city: "Douala",
        country: "Cameroon",
        taxId: "SYNTHETIC-TAX-E2E",
        paymentTerms: 30,
        creditLimit: "250000.00",
        notes: NOTICE,
        preferredLocale: Locale.EN,
        organizationId: organization.id,
        updatedAt: now,
      },
    })
    for (const [viewport, id] of Object.entries(LIFECYCLE_SUPPLIER_IDS)) {
      await tx.supplier.create({
        data: {
          id,
          name: "Playwright Archive Supplier " + viewport,
          code: "SUP-E2E-ARCHIVE-" + viewport.toUpperCase(),
          contactPerson: "Synthetic Lifecycle Contact",
          email: "supplier.archive." + viewport + "@stockflow.test",
          phone: "+23760000000" + (viewport === "desktop" ? "2" : viewport === "tablet" ? "3" : "4"),
          country: "Cameroon",
          paymentTerms: 15,
          creditLimit: "0.00",
          notes: NOTICE,
          preferredLocale: Locale.EN,
          organizationId: organization.id,
          updatedAt: now,
        },
      })
    }
    await tx.supplier.create({
      data: {
        id: FOREIGN_SUPPLIER_ID,
        name: "Foreign Tenant Supplier Must Not Appear",
        code: "SUP-E2E-FOREIGN",
        contactPerson: "Foreign Synthetic Contact",
        email: "supplier.foreign@stockflow.test",
        phone: "+237600009999",
        taxId: "FOREIGN-SYNTHETIC-TAX",
        country: "Cameroon",
        notes: NOTICE,
        preferredLocale: Locale.EN,
        organizationId: foreignOrganization.id,
        updatedAt: now,
      },
    })

    return {
      fixtureSource: FIXTURE_SOURCE,
      productionBackfill: false,
      organizationId: organization.id,
      foreignOrganizationId: foreignOrganization.id,
      userId: user.id,
      deniedUserId: deniedUser.id,
      email: user.email,
      deniedEmail: deniedUser.email,
      roleCode: role.code,
      deniedRoleCode: deniedRole.code,
      permissions: REQUIRED_PERMISSIONS,
      deniedPermissions: DENIED_PERMISSIONS,
      primarySupplierId: PRIMARY_SUPPLIER_ID,
      foreignSupplierId: FOREIGN_SUPPLIER_ID,
      lifecycleSupplierIds: LIFECYCLE_SUPPLIER_IDS,
    }
  })
}

async function main() {
  const mode = String(process.argv[2] || "seed").trim().toLowerCase()
  if (!new Set(["seed", "cleanup", "assure"]).has(mode)) throw new Error("Unsupported supplier E2E fixture mode: " + mode)
  const databaseUrl = resolvedDatabaseUrl()
  assertLocalFixtureAllowed(process.env, databaseUrl)
  process.env.DATABASE_URL = databaseUrl
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    const result = mode === "cleanup"
      ? await cleanupSupplierFixture(prisma)
      : mode === "assure"
        ? await assureSupplierFixture(prisma)
        : await seedSupplierFixture(prisma)
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

module.exports = {
  normalizePrismaDatasourceUrl,
  resolvedDatabaseUrl,
  assertLocalFixtureAllowed,
  assureSupplierFixture,
  cleanupSupplierFixture,
  seedSupplierFixture,
  SUPPLIER_E2E_FIXTURE_CONTRACT,
}
