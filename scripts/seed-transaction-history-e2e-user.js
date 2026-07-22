#!/usr/bin/env node

const { existsSync, readFileSync } = require("fs")
const { resolve } = require("path")
const argon2 = require("argon2")
const { Locale, PrismaClient } = require("@prisma/client")

function loadLocalEnv() {
  for (const envPath of [resolve(process.cwd(), ".env.local"), resolve(process.cwd(), ".env")]) {
    if (!existsSync(envPath)) continue
    for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (!match || process.env[match[1]]) continue
      let value = match[2].trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      process.env[match[1]] = value
    }
  }
}

loadLocalEnv()

const prisma = new PrismaClient()
const ORGANIZATION_ID = process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_ORG_ID || "org_transaction_history_e2e_local"
const ORGANIZATION_SLUG = process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_ORG_SLUG || "stoquify-transaction-history-e2e-local"
const ROLE_CODE = "TRANSACTION_HISTORY_E2E"
const USER_ID = process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_USER_ID || "usr_transaction_history_e2e_local"
const EMAIL = (process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_EMAIL || "transaction.history@stockflow.test").trim().toLowerCase()
const PASSWORD = process.env.AQSTOQFLOW_TRANSACTION_HISTORY_E2E_PASSWORD || "TransactionHistory@2026"

const REQUIRED_PERMISSIONS = [
  "dashboard.read",
  "finance.read",
  "finance.payments.read",
  "finance.payables.read",
  "finance.receivables.read",
  "finance.cash-drawer.read",
  "payments.reconciliation.read",
  "pos.read",
  "OPERATE_POS",
  "purchasing.ap.invoice.view",
  "reports.export",
]

async function hashPassword(password) {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  })
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    throw new Error("AQSTOQFLOW_TRANSACTION_HISTORY_E2E_EMAIL and AQSTOQFLOW_TRANSACTION_HISTORY_E2E_PASSWORD must be non-empty.")
  }

  const now = new Date()
  const passwordHash = await hashPassword(PASSWORD)

  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.upsert({
      where: { id: ORGANIZATION_ID },
      update: {
        name: "Stoquify Transaction History E2E",
        slug: ORGANIZATION_SLUG,
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: { set: ["finance", "purchasing", "pos", "accounting"] },
        updatedAt: now,
      },
      create: {
        id: ORGANIZATION_ID,
        name: "Stoquify Transaction History E2E",
        slug: ORGANIZATION_SLUG,
        country: "Cameroon",
        countryCode: "CM",
        currency: "XAF",
        timezone: "Africa/Douala",
        defaultLocale: Locale.EN,
        requestedModules: ["finance", "purchasing", "pos", "accounting"],
        updatedAt: now,
      },
    })

    const role = await tx.role.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: ROLE_CODE } },
      update: {
        nameEn: "Transaction History E2E",
        nameFr: "Historique transactions E2E",
        description: "Local-only E2E role for cash/payment, supplier AP, and customer AR transaction-history release checks.",
        permissions: { set: REQUIRED_PERMISSIONS },
        updatedAt: now,
      },
      create: {
        code: ROLE_CODE,
        nameEn: "Transaction History E2E",
        nameFr: "Historique transactions E2E",
        description: "Local-only E2E role for cash/payment, supplier AP, and customer AR transaction-history release checks.",
        permissions: REQUIRED_PERMISSIONS,
        organizationId: organization.id,
        updatedAt: now,
      },
    })

    const existingUser = await tx.user.findUnique({
      where: { email: EMAIL },
      select: { id: true, organizationId: true },
    })
    if (existingUser && existingUser.organizationId !== organization.id) {
      throw new Error(`Refusing to move existing user ${EMAIL} from ${existingUser.organizationId} to ${organization.id}. Use a different AQSTOQFLOW_TRANSACTION_HISTORY_E2E_EMAIL.`)
    }

    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            firstName: "Transaction",
            lastName: "History",
            name: "Transaction History E2E",
            jobTitle: "Finance and purchasing history verifier",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            roles: { set: [{ id: role.id }] },
            updatedAt: now,
          },
        })
      : await tx.user.create({
          data: {
            id: USER_ID,
            email: EMAIL,
            firstName: "Transaction",
            lastName: "History",
            name: "Transaction History E2E",
            jobTitle: "Finance and purchasing history verifier",
            password: passwordHash,
            emailVerified: true,
            isVerified: true,
            isActive: true,
            isLocked: false,
            lockedUntil: null,
            failedLoginAttempts: 0,
            lastFailedLogin: null,
            preferredLocale: Locale.EN,
            organizationId: organization.id,
            roles: { connect: { id: role.id } },
            updatedAt: now,
          },
        })

    await tx.account.upsert({
      where: { providerId_accountId: { providerId: "credential", accountId: user.id } },
      update: { userId: user.id, password: passwordHash, scope: "profile email", updatedAt: now },
      create: { accountId: user.id, providerId: "credential", userId: user.id, password: passwordHash, scope: "profile email", updatedAt: now },
    })

    await tx.session.deleteMany({ where: { userId: user.id } })

    return {
      organizationId: organization.id,
      userId: user.id,
      email: user.email,
      roleCode: role.code,
      permissions: REQUIRED_PERMISSIONS,
    }
  })

  console.log(JSON.stringify(result, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
