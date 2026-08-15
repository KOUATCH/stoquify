import { createHash } from "node:crypto"
import { spawnSync } from "node:child_process"

import { loadEnvConfig } from "@next/env"
import { Client } from "pg"

import "./server-only-node-shim"

const DATABASE_NAME = "stoquify_statement_browser_e2e"
const FIXTURE_ORGANIZATION_ID = "customer_statement_browser_org"
const FIXTURE_USER_ID = "customer_statement_browser_user"
const FIXTURE_LOCATION_ID = "customer_statement_browser_location"
const FIXTURE_CUSTOMER_ID = "customer_statement_browser_customer"
const FIXTURE_ORDER_ID = "customer_statement_browser_order"
const STATEMENT_ID = "customer_statement_browser_statement"
const RECEIVABLE_ID = "customer_statement_browser_receivable"
const ACTIVE_TOKEN_ID = "customer_statement_browser_token_active"
const REVOKED_TOKEN_ID = "customer_statement_browser_token_revoked"
const TOKEN_SECRET =
  "customer-statement-browser-e2e-local-secret-2026-08-13"
const FIXTURE_NOW = new Date("2026-08-13T10:00:00.000Z")
const TOKEN_TTL_SECONDS = 90 * 24 * 60 * 60
const PORT = process.env.CUSTOMER_STATEMENT_BROWSER_PORT ?? "3012"
const BASE_URL = "http://127.0.0.1:" + PORT

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function fixtureDatabaseUrl() {
  loadEnvConfig(process.cwd())
  const configured = process.env.DATABASE_URL?.trim()
  assert(configured, "DATABASE_URL is required")
  const parsed = new URL(configured)
  assert(
    ["postgres:", "postgresql:"].includes(parsed.protocol),
    "Customer statement browser fixture requires PostgreSQL",
  )
  assert(
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      parsed.hostname.toLowerCase(),
    ),
    "Customer statement browser fixture refuses non-local databases",
  )
  parsed.pathname = "/" + DATABASE_NAME
  return parsed.toString()
}

async function ensureDatabase(databaseUrl: string) {
  const adminUrl = new URL(databaseUrl)
  adminUrl.pathname = "/postgres"
  const client = new Client({ connectionString: adminUrl.toString() })
  await client.connect()
  try {
    const existing = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [DATABASE_NAME],
    )
    if (existing.rowCount === 0) {
      await client.query('CREATE DATABASE "' + DATABASE_NAME + '"')
    }
  } finally {
    await client.end()
  }
}

function run(command: string, args: string[], databaseUrl: string) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      DATABASE_URL: databaseUrl,
      AQSTOQFLOW_STATEMENT_TOKEN_SECRET: TOKEN_SECRET,
      NEXT_PUBLIC_BASE_URL: BASE_URL,
    },
    shell: process.platform === "win32",
    stdio: "inherit",
  })
  if (result.error) throw result.error
  assert(result.status === 0, command + " exited with status " + result.status)
}

function invalidToken(token: string) {
  const separator = token.indexOf(".")
  assert(separator > 0, "Fixture token is malformed")
  const payload = token.slice(0, separator + 1)
  const signature = token.slice(separator + 1)
  const replacement = signature.startsWith("a") ? "b" : "a"
  return payload + replacement + signature.slice(1)
}

async function seed(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl
  process.env.AQSTOQFLOW_STATEMENT_TOKEN_SECRET = TOKEN_SECRET
  process.env.NEXT_PUBLIC_BASE_URL = BASE_URL

  const [{ db }, eventService, tokenService, accessService] =
    await Promise.all([
      import("../prisma/db"),
      import("../services/events/business-event.service"),
      import("../services/accounting/customer-statement-token"),
      import("../services/accounting/customer-statement-access.service"),
    ])

  await db.organization.upsert({
    where: { id: FIXTURE_ORGANIZATION_ID },
    update: {},
    create: {
      id: FIXTURE_ORGANIZATION_ID,
      name: "Stoquify Browser Fixture SARL",
      tradeName: "Stoquify Fixture",
      slug: "customer-statement-browser-fixture",
      country: "Cameroon",
      countryCode: "CM",
      currency: "XAF",
      timezone: "Africa/Douala",
      defaultLocale: "EN",
      requestedModules: ["Accounting"],
      onboardingSource: "customer-statement-browser-fixture",
      onboardingCompletedAt: FIXTURE_NOW,
    },
  })
  await db.user.upsert({
    where: { id: FIXTURE_USER_ID },
    update: {},
    create: {
      id: FIXTURE_USER_ID,
      organizationId: FIXTURE_ORGANIZATION_ID,
      name: "Statement Fixture Owner",
      email: "customer-statement-browser-owner@example.test",
      emailVerified: true,
      isActive: true,
      isVerified: true,
      preferredLocale: "EN",
      mfaBackupCodes: [],
    },
  })
  await db.location.upsert({
    where: { id: FIXTURE_LOCATION_ID },
    update: {},
    create: {
      id: FIXTURE_LOCATION_ID,
      organizationId: FIXTURE_ORGANIZATION_ID,
      name: "Browser Fixture Branch",
      code: "CS-BROWSER",
      isActive: true,
      isDefault: true,
    },
  })
  await db.customer.upsert({
    where: { id: FIXTURE_CUSTOMER_ID },
    update: {},
    create: {
      id: FIXTURE_CUSTOMER_ID,
      organizationId: FIXTURE_ORGANIZATION_ID,
      name: "Ada Retail",
      code: "ADA-001",
      preferredLocale: "EN",
      isActive: true,
    },
  })
  await db.salesOrder.upsert({
    where: { id: FIXTURE_ORDER_ID },
    update: {},
    create: {
      id: FIXTURE_ORDER_ID,
      organizationId: FIXTURE_ORGANIZATION_ID,
      locationId: FIXTURE_LOCATION_ID,
      customerId: FIXTURE_CUSTOMER_ID,
      createdById: FIXTURE_USER_ID,
      orderNumber: "SO-BROWSER-2026-001",
      status: "COMPLETED",
      orderDate: new Date("2026-07-10T00:00:00.000Z"),
      dueDate: new Date("2026-07-25T00:00:00.000Z"),
      subtotal: "125000.00",
      taxAmount: 0,
      shippingCost: 0,
      discount: 0,
      total: "125000.00",
    },
  })

  const sourceOrder = await db.salesOrder.findFirst({
    where: { id: FIXTURE_ORDER_ID, deletedAt: null },
    orderBy: [{ orderDate: "asc" }, { id: "asc" }],
    select: {
      id: true,
      customerId: true,
      orderDate: true,
      total: true,
      customer: { select: { name: true, code: true } },
      organization: {
        select: {
          id: true,
          name: true,
          currency: true,
          users: {
            where: { isActive: true },
            orderBy: { id: "asc" },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  })
  assert(sourceOrder, "Comprehensive seed has no active sales order")
  const actor = sourceOrder.organization.users[0]
  assert(actor, "Comprehensive seed has no active organization user")

  const organization = await db.organization.findUnique({
    where: { id: sourceOrder.organization.id },
    select: {
      id: true,
      name: true,
      tradeName: true,
      country: true,
      currency: true,
    },
  })
  assert(organization, "Fixture organization is missing")
  const fixtureOrganization = organization

  const amount = "125000.00"
  const paid = "25000.00"
  const open = "100000.00"
  const invoiceDate = new Date("2026-07-10T00:00:00.000Z")
  const dueDate = new Date("2026-07-25T00:00:00.000Z")
  const documentEvidence = {
    fixture: "customer-statement-browser-v1",
    sourceSalesOrderId: sourceOrder.id,
    amount,
    paid,
    open,
  }
  const documentHash = eventService.hashBusinessPayload(documentEvidence)
  const stateHash = eventService.hashBusinessPayload({
    ...documentEvidence,
    status: "PARTIALLY_PAID",
    version: 1,
  })

  const receivable = await db.customerReceivableDocument.findUnique({
    where: { id: RECEIVABLE_ID },
    select: { id: true, organizationId: true, customerId: true },
  })
  if (!receivable) {
    await db.customerReceivableDocument.create({
      data: {
        id: RECEIVABLE_ID,
        organizationId: fixtureOrganization.id,
        customerId: sourceOrder.customerId,
        sourceSalesOrderId: sourceOrder.id,
        documentNumber: "INV-BROWSER-2026-001",
        version: 1,
        sourceVersion: 1,
        issuedAt: invoiceDate,
        invoiceDate,
        dueDate,
        paymentTermsDays: 15,
        currency: fixtureOrganization.currency,
        currencyPrecision: 2,
        subtotal: amount,
        taxAmount: 0,
        shippingAmount: 0,
        discountAmount: 0,
        totalAmount: amount,
        initialPaidAmount: 0,
        initialUnpaidAmount: amount,
        organizationSnapshot: {
          id: fixtureOrganization.id,
          name: fixtureOrganization.name,
          tradeName: fixtureOrganization.tradeName,
        },
        customerSnapshot: {
          id: sourceOrder.customerId,
          name: sourceOrder.customer.name,
          code: sourceOrder.customer.code,
        },
        sourceSnapshot: documentEvidence,
        metadata: { fixture: "customer-statement-browser-v1" },
        documentHash,
        sourceEvidenceHash: documentHash,
        metadataHash: eventService.hashBusinessPayload({
          fixture: "customer-statement-browser-v1",
        }),
        issuedById: actor.id,
      },
    })
    await db.customerReceivableDocumentState.create({
      data: {
        organizationId: fixtureOrganization.id,
        documentId: RECEIVABLE_ID,
        version: 1,
        status: "PARTIALLY_PAID",
        paidAmount: paid,
        unpaidAmount: open,
        effectiveAt: FIXTURE_NOW,
        actorId: actor.id,
        sourceType: "CUSTOMER_STATEMENT_BROWSER_FIXTURE",
        sourceId: RECEIVABLE_ID,
        previousStateHash: null,
        stateHash,
        evidenceHash: documentHash,
        metadata: { fixture: "customer-statement-browser-v1" },
      },
    })
  } else {
    assert(
      receivable.organizationId === fixtureOrganization.id &&
        receivable.customerId === sourceOrder.customerId,
      "Existing browser receivable fixture has a different tenant or customer",
    )
  }

  const payload = {
    schemaVersion: "customer-statement.v1",
    organization: {
      name: fixtureOrganization.name,
      tradeName: fixtureOrganization.tradeName,
      country: fixtureOrganization.country,
    },
    customer: {
      name: sourceOrder.customer.name,
      code: sourceOrder.customer.code,
    },
    balances: {
      opening: "0.00",
      periodDebits: amount,
      periodCredits: paid,
      closing: open,
      overdue: open,
    },
    lines: [
      {
        customerReceivableDocumentId: RECEIVABLE_ID,
        documentNumber: "INV-BROWSER-2026-001",
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: "PARTIALLY_PAID",
        daysPastDue: 19,
        openingBalance: "0.00",
        debitAmount: amount,
        periodCreditAmount: paid,
        closingBalance: open,
      },
    ],
  }
  const contentHash = eventService.hashBusinessPayload(payload)
  const statement = await db.customerStatementSnapshot.findUnique({
    where: { id: STATEMENT_ID },
    select: { id: true, organizationId: true, contentHash: true },
  })
  if (!statement) {
    await db.customerStatementSnapshot.create({
      data: {
        id: STATEMENT_ID,
        organizationId: fixtureOrganization.id,
        customerId: sourceOrder.customerId,
        statementNumber: "STM-BROWSER-2026-001",
        version: 1,
        periodStart: new Date("2026-07-01T00:00:00.000Z"),
        periodEnd: new Date("2026-07-31T23:59:59.999Z"),
        asOf: new Date("2026-07-31T23:59:59.999Z"),
        recordedThrough: FIXTURE_NOW,
        generatedAt: FIXTURE_NOW,
        currency: fixtureOrganization.currency,
        currencyPrecision: 2,
        openingBalance: 0,
        periodDebits: amount,
        periodCredits: paid,
        closingBalance: open,
        overdueBalance: open,
        itemCount: 1,
        movementCount: 1,
        sourceItemCount: 1,
        includedItemCount: 1,
        itemLimit: 500,
        truncated: false,
        organizationSnapshot: payload.organization,
        customerSnapshot: payload.customer,
        statementPayload: payload,
        sourceTables: ["customer_receivable_documents"],
        sourceDocumentHashes: [documentHash],
        sourceStateHashes: [stateHash],
        sourceLedgerEntryIds: [],
        contentHash,
        idempotencyKey: "customer-statement-browser-fixture-v1",
        idempotencyPayloadHash: contentHash,
        correlationId: "customer-statement-browser-fixture-correlation-v1",
        generatedById: actor.id,
        businessEventId: "customer-statement-browser-fixture-event-v1",
      },
    })
  } else {
    assert(
      statement.organizationId === fixtureOrganization.id &&
        statement.contentHash === contentHash,
      "Existing browser statement fixture does not match its immutable payload",
    )
  }

  async function ensureToken(input: {
    id: string
    jti: string
    revoked: boolean
  }) {
    const token = tokenService.createCustomerStatementAccessToken({
      organizationId: fixtureOrganization.id,
      statementSnapshotId: STATEMENT_ID,
      statementContentHash: contentHash,
      jti: input.jti,
      permissions: ["view", "dispute", "promise_to_pay"],
      now: FIXTURE_NOW,
      ttlSeconds: TOKEN_TTL_SECONDS,
    })
    assert(token, "Customer statement token signing is unavailable")
    const tokenHash = createHash("sha256").update(token).digest("hex")
    const jtiHash = createHash("sha256").update(input.jti).digest("hex")
    const existing = await db.customerStatementAccessToken.findUnique({
      where: { id: input.id },
    })
    if (!existing) {
      await db.customerStatementAccessToken.create({
        data: {
          id: input.id,
          organizationId: fixtureOrganization.id,
          statementSnapshotId: STATEMENT_ID,
          tokenHash,
          jtiHash,
          statementContentHash: contentHash,
          allowView: true,
          allowDispute: true,
          allowPromiseToPay: true,
          status: "ACTIVE",
          issuedById: actor.id,
          issuedAt: FIXTURE_NOW,
          expiresAt: new Date(
            FIXTURE_NOW.getTime() + TOKEN_TTL_SECONDS * 1000,
          ),
          metadata: { fixture: "customer-statement-browser-v1" },
        },
      })
    } else {
      assert(
        existing.organizationId === fixtureOrganization.id &&
          existing.statementContentHash === contentHash &&
          existing.tokenHash === tokenHash,
        "Existing browser token fixture does not match signed evidence",
      )
    }
    if (input.revoked) {
      const current = await db.customerStatementAccessToken.findUniqueOrThrow({
        where: { id: input.id },
      })
      if (current.status === "ACTIVE") {
        await accessService.revokeCustomerStatementAccessToken(
          {
            organizationId: fixtureOrganization.id,
            tokenId: input.id,
            revokedById: actor.id,
            reason: "Browser certification revoked-token fixture",
            now: new Date(FIXTURE_NOW.getTime() + 60_000),
          },
          db,
        )
      }
    }
    return token
  }

  const activeToken = await ensureToken({
    id: ACTIVE_TOKEN_ID,
    jti: "customer-statement-browser-active-jti-v1",
    revoked: false,
  })
  const revokedToken = await ensureToken({
    id: REVOKED_TOKEN_ID,
    jti: "customer-statement-browser-revoked-jti-v1",
    revoked: true,
  })

  const base = BASE_URL + "/customer-statement/" + STATEMENT_ID
  console.log(
    JSON.stringify(
      {
        status: "ready",
        database: DATABASE_NAME,
        organizationId: fixtureOrganization.id,
        statementId: STATEMENT_ID,
        activeUrl: base + "?token=" + encodeURIComponent(activeToken),
        revokedUrl: base + "?token=" + encodeURIComponent(revokedToken),
        invalidUrl:
          base + "?token=" + encodeURIComponent(invalidToken(activeToken)),
      },
      null,
      2,
    ),
  )
}

async function inspect(databaseUrl: string) {
  process.env.DATABASE_URL = databaseUrl
  const { db } = await import("../prisma/db")
  const [tokens, accessLogs, actions, audits] = await Promise.all([
    db.customerStatementAccessToken.findMany({
      where: { statementSnapshotId: STATEMENT_ID },
      orderBy: { id: "asc" },
      select: {
        id: true,
        status: true,
        allowView: true,
        allowDispute: true,
        allowPromiseToPay: true,
        accessCount: true,
      },
    }),
    db.customerStatementAccessLog.groupBy({
      by: ["action", "outcome"],
      where: { statementSnapshotId: STATEMENT_ID },
      _count: { _all: true },
    }),
    db.customerStatementRecipientAction.findMany({
      where: { statementSnapshotId: STATEMENT_ID },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        actionType: true,
        requestedAmount: true,
        promisedFor: true,
        states: {
          orderBy: { version: "desc" },
          take: 1,
          select: { status: true, version: true },
        },
      },
    }),
    db.auditLog.findMany({
      where: {
        entityType: "CustomerStatementRecipientAction",
        entityId: {
          in: await db.customerStatementRecipientAction
            .findMany({
              where: { statementSnapshotId: STATEMENT_ID },
              select: { id: true },
            })
            .then((rows) => rows.map((row) => row.id)),
        },
      },
      orderBy: { createdAt: "asc" },
      select: { action: true, entityId: true, userId: true },
    }),
  ])
  console.log(
    JSON.stringify(
      {
        database: DATABASE_NAME,
        statementId: STATEMENT_ID,
        tokens,
        accessLogs,
        actions: actions.map((action) => ({
          ...action,
          requestedAmount: action.requestedAmount?.toFixed(2) ?? null,
          promisedFor: action.promisedFor?.toISOString() ?? null,
        })),
        audits,
      },
      null,
      2,
    ),
  )
}

async function main() {
  const mode = process.argv[2] ?? "prepare"
  const databaseUrl = fixtureDatabaseUrl()
  if (mode === "prepare") {
    await ensureDatabase(databaseUrl)
    run("npx", ["prisma", "migrate", "deploy"], databaseUrl)
    await seed(databaseUrl)
    return
  }
  if (mode === "inspect") {
    await inspect(databaseUrl)
    return
  }
  if (mode === "serve") {
    run("npx", ["next", "dev", "-p", PORT], databaseUrl)
    return
  }
  throw new Error("Mode must be prepare, inspect, or serve")
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : error)
  process.exitCode = 1
})
