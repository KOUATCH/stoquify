#!/usr/bin/env node

const argon2 = require("argon2")
const { Locale, PrismaClient } = require("@prisma/client")

const DATABASE = "stoquify_dev_migrated_20260814"
const SCHEMA = "codex_pos_commit_result_cert_20260817"
const ORGANIZATION_ID = "org_stoquify_pos_g0_cert_001"
const LOCATION_ID = "loc_cm_dla_akwa_cert_001"
const TERMINAL_ID = "term_cm_dla_akwa_cert_001"
const DRAWER_ID = "drawer_cm_dla_akwa_cert_001"
const SESSION_ID = "session_cm_dla_pos_g0_cert_001"
const USER_ID = "usr_cm_dla_pos_g0_cert_001"
const ROLE_CODE = "ADMINISTRATOR"
const EMAIL = "pos.g0.certifier@stoquify.invalid"
const PASSWORD = process.env.AQSTOQFLOW_POS_G0_PASSWORD || "PosG0Synthetic@2026"

const REQUESTED_MODULES = [
  "dashboard",
  "sales",
  "inventory",
  "pos",
  "cash_drawer",
  "finance",
  "accounting",
  "payment_reconciliation",
  "close_assurance",
  "reports",
]

const REQUIRED_PERMISSIONS = [
  "dashboard.read",
  "sales.read",
  "customers.read",
  "inventory.read",
  "inventory.items.read",
  "inventory.levels.read",
  "pos.read",
  "pos.operate",
  "OPERATE_POS",
  "finance.read",
  "finance.dashboard.read",
  "FINANCIAL_READ",
  "payments.reconciliation.read",
  "accounting.journal.read",
  "accounting.reports.read",
  "accounting.close.read",
  "VIEW_FINANCIAL_REPORTS",
  "VIEW_FINANCIAL_AUDIT_TRAIL",
  "reports.read",
]

function assertCertificationTarget(env = process.env) {
  const markers = [env.NODE_ENV, env.AQSTOQFLOW_ENV, env.VERCEL_ENV]
    .map((value) => String(value || "").trim().toLowerCase())
  if (markers.includes("production")) {
    throw new Error("Refusing the synthetic POS G0 fixture in a production-marked environment")
  }

  const url = new URL(env.DATABASE_URL || "")
  if (!["localhost", "127.0.0.1", "::1"].includes(url.hostname.toLowerCase())) {
    throw new Error("POS G0 fixture requires a local PostgreSQL host")
  }
  if (url.pathname.replace(/^\//, "") !== DATABASE) {
    throw new Error(`POS G0 fixture requires database ${DATABASE}`)
  }
  if (url.searchParams.get("schema") !== SCHEMA) {
    throw new Error(`POS G0 fixture requires schema ${SCHEMA}`)
  }
  return url.toString()
}

async function seedFixture(prisma) {
  const passwordHash = await argon2.hash(PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  })
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    await tx.organization.upsert({
      where: { id: ORGANIZATION_ID },
      create: {
        id: ORGANIZATION_ID,
        name: "Stoquify POS G0 Synthetic Certification",
        slug: "stoquify-pos-g0-synthetic-certification",
        industry: "Synthetic local certification",
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: REQUESTED_MODULES,
        onboardingSource: "pos-g0-synthetic-certification",
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
      update: {
        requestedModules: { set: REQUESTED_MODULES },
        defaultLocale: Locale.EN,
        onboardingCompletedAt: now,
        isActive: true,
        updatedAt: now,
      },
    })

    const role = await tx.role.upsert({
      where: { organizationId_code: { organizationId: ORGANIZATION_ID, code: ROLE_CODE } },
      create: {
        code: ROLE_CODE,
        nameEn: "POS G0 Certification Administrator",
        nameFr: "Administrateur de certification POS G0",
        description: "Synthetic local-only administrator for authenticated G0 route evidence.",
        permissions: REQUIRED_PERMISSIONS,
        organizationId: ORGANIZATION_ID,
        updatedAt: now,
      },
      update: { permissions: { set: REQUIRED_PERMISSIONS }, updatedAt: now },
    })

    const user = await tx.user.upsert({
      where: { email: EMAIL },
      create: {
        id: USER_ID,
        email: EMAIL,
        firstName: "POS G0",
        lastName: "Certifier",
        name: "POS G0 Synthetic Certifier",
        jobTitle: "Development certification administrator",
        password: passwordHash,
        emailVerified: true,
        isVerified: true,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        mfaBackupCodes: [],
        preferredLocale: Locale.EN,
        organizationId: ORGANIZATION_ID,
        roles: { connect: { id: role.id } },
        updatedAt: now,
      },
      update: {
        password: passwordHash,
        emailVerified: true,
        isVerified: true,
        isActive: true,
        isLocked: false,
        failedLoginAttempts: 0,
        preferredLocale: Locale.EN,
        organizationId: ORGANIZATION_ID,
        roles: { set: [{ id: role.id }] },
        updatedAt: now,
      },
    })

    await tx.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      create: {
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: passwordHash,
        scope: "profile email",
        updatedAt: now,
      },
      update: { password: passwordHash, userId: user.id, updatedAt: now },
    })

    await tx.location.upsert({
      where: { id: LOCATION_ID },
      create: {
        id: LOCATION_ID,
        code: "DLA-AKWA-CERT-001",
        name: "Douala Akwa Development Certification Store",
        type: "STORE",
        organizationId: ORGANIZATION_ID,
        managerId: user.id,
        isDefault: true,
        isActive: true,
        updatedAt: now,
      },
      update: { managerId: user.id, isDefault: true, isActive: true, updatedAt: now },
    })

    await tx.pOSStation.upsert({
      where: { id: TERMINAL_ID },
      create: {
        id: TERMINAL_ID,
        terminalNumber: "TERM-CERT-001",
        name: "Douala Akwa Certification Terminal 01",
        organizationId: ORGANIZATION_ID,
        locationId: LOCATION_ID,
        hasCashDrawer: true,
        isActive: true,
        updatedAt: now,
      },
      update: { hasCashDrawer: true, isActive: true, updatedAt: now },
    })

    await tx.pOSSession.upsert({
      where: { id: SESSION_ID },
      create: {
        id: SESSION_ID,
        sessionNumber: "POS-G0-CERT-SHIFT-001",
        status: "ACTIVE",
        terminalId: TERMINAL_ID,
        locationId: LOCATION_ID,
        userId: user.id,
        organizationId: ORGANIZATION_ID,
        openingBalance: 0,
        expectedBalance: 0,
        notes: "Synthetic development-only G0 session boundary.",
        updatedAt: now,
      },
      update: { status: "ACTIVE", userId: user.id, updatedAt: now },
    })

    await tx.pOSStation.update({
      where: { id: TERMINAL_ID },
      data: { currentSessionId: SESSION_ID, updatedAt: now },
    })

    await tx.cashDrawer.upsert({
      where: { id: DRAWER_ID },
      create: {
        id: DRAWER_ID,
        name: "Douala Akwa Certification Cash Drawer 01",
        drawerNumber: "DRAWER-CERT-001",
        currentBalance: 0,
        expectedBalance: 0,
        isOpen: true,
        locationId: LOCATION_ID,
        terminalId: TERMINAL_ID,
        updatedAt: now,
      },
      update: { isOpen: true, updatedAt: now },
    })

    return {
      fixtureKind: "synthetic-development-only",
      organizationId: ORGANIZATION_ID,
      locationId: LOCATION_ID,
      terminalId: TERMINAL_ID,
      drawerId: DRAWER_ID,
      sessionId: SESSION_ID,
      userId: user.id,
      email: EMAIL,
      roleCode: role.code,
      requestedModules: REQUESTED_MODULES,
      permissions: REQUIRED_PERMISSIONS,
      passwordRecorded: false,
      realCustomerOrPaymentDataUsed: false,
    }
  })
}

async function main() {
  const databaseUrl = assertCertificationTarget()
  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } })
  try {
    process.stdout.write(`${JSON.stringify(await seedFixture(prisma), null, 2)}\n`)
  } finally {
    await prisma.$disconnect()
  }
}

if (require.main === module) {
  main().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}

module.exports = {
  assertCertificationTarget,
  seedFixture,
  ORGANIZATION_ID,
  LOCATION_ID,
  TERMINAL_ID,
  DRAWER_ID,
  SESSION_ID,
  EMAIL,
  ROLE_CODE,
  REQUESTED_MODULES,
  REQUIRED_PERMISSIONS,
}
