// Aggregate-only diagnostics for the local X1 fixture; never prints credentials or rows.
const { loadEnvConfig } = require("@next/env")
const { PrismaClient } = require("@prisma/client")
const { mkdirSync, writeFileSync } = require("node:fs")
const { join } = require("node:path")

async function main() {
  loadEnvConfig(process.cwd())
  const connection = (process.env.DATABASE_URL ?? "").replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, key) => process.env[key] ?? "")
  const target = new URL(connection)
  const database = decodeURIComponent(target.pathname.slice(1))
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || database !== "stoquify_replay_next_20260830") {
    throw new Error("Requires the named local X1 replay database.")
  }
  const prisma = new PrismaClient({ datasources: { db: { url: connection } } })
  const organizationId = "rds_org_001"
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const readings = []
  const timed = async (name, read) => {
    const start = performance.now()
    const value = await read()
    readings.push({ name, elapsedMs: Math.round(performance.now() - start), value })
    return value
  }
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe("SET TRANSACTION READ ONLY")
      await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '15s'")
      await timed("transactionReadOnly", () => tx.$queryRawUnsafe("SHOW transaction_read_only"))
      await timed("receivableDocumentsAsOfNow", () => tx.customerReceivableDocument.count({ where: { organizationId, issuedAt: { lte: now }, createdAt: { lte: now } } }))
      await timed("receivableDocumentDates", () => tx.customerReceivableDocument.aggregate({ where: { organizationId }, _min: { issuedAt: true }, _max: { issuedAt: true } }))
      await timed("paymentsAllTime", () => tx.payment.count({ where: { organizationId, deletedAt: null } }))
      await timed("paymentsMonthToDate", () => tx.payment.count({ where: { organizationId, deletedAt: null, createdAt: { gte: monthStart, lte: now } } }))
      await timed("outboundPaymentsAllTime", () => tx.payment.count({ where: { organizationId, deletedAt: null, salesOrderId: null, purchaseOrderId: { not: null } } }))
      await timed("paymentDates", () => tx.payment.aggregate({ where: { organizationId, deletedAt: null }, _min: { createdAt: true }, _max: { createdAt: true } }))
      await timed("latest80PaymentDirections", async () => {
        const rows = await tx.payment.findMany({ where: { organizationId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 80, select: { salesOrderId: true, purchaseOrderId: true } })
        return { count: rows.length, incoming: rows.filter(x => x.salesOrderId).length, outgoing: rows.filter(x => !x.salesOrderId && x.purchaseOrderId).length }
      })
      const period = await timed("defaultFinancialStatementPeriod", () => tx.accountingPeriod.findFirst({ where: { organizationId, startDate: { lte: now } }, orderBy: [{ endDate: "desc" }, { createdAt: "desc" }], select: { id: true, name: true, startDate: true, endDate: true, status: true } }))
      if (period) {
        await timed("postedEntriesInSelectedPeriod", () => tx.journalEntry.count({ where: { organizationId, status: { in: ["POSTED", "REVERSED"] }, entryDate: { gte: period.startDate, lte: period.endDate } } }))
        await timed("postedEntriesCumulativeThroughPeriodEnd", () => tx.journalEntry.count({ where: { organizationId, status: { in: ["POSTED", "REVERSED"] }, entryDate: { lte: period.endDate } } }))
      }
      await timed("postedEntryDates", () => tx.journalEntry.aggregate({ where: { organizationId, status: { in: ["POSTED", "REVERSED"] } }, _min: { entryDate: true }, _max: { entryDate: true } }))
    }, { timeout: 90_000 })
    const result = { capturedAt: now.toISOString(), classification: "LOCAL_READ_ONLY_DIAGNOSTIC_NOT_RELEASE_EVIDENCE", database, organizationId, monthStart: monthStart.toISOString(), note: "Aggregate query timings are not route or full service latency. Dates and records reflect this diagnostic time, not the historical capture.", readings }
    const directory = join(process.cwd(), "what-next/development-progression-agent/finance-investigation-2026-09-02")
    mkdirSync(directory, { recursive: true })
    writeFileSync(join(directory, "fixture-observations.json"), JSON.stringify(result, null, 2) + "\n")
    console.log(JSON.stringify(result, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

main().catch(() => {
  console.error("Finance fixture inspection failed; check the local target and schema. Connection details suppressed.")
  process.exitCode = 1
})
