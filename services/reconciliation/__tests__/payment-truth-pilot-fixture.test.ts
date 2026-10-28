import { createHmac } from "node:crypto"

import {
  MatchStatus,
  PaymentDirection,
  PaymentStatus,
  PaymentTransactionState,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementLineStatus,
  Prisma,
} from "@prisma/client"

jest.mock("@/prisma/db", () => ({
  db: {
    $transaction: jest.fn(),
    providerAccount: { findFirst: jest.fn(), count: jest.fn() },
    providerEvent: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    statementFile: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn() },
    statementLine: { findMany: jest.fn(), createMany: jest.fn(), update: jest.fn() },
    paymentTransaction: { findMany: jest.fn(), count: jest.fn(), findFirst: jest.fn() },
    payment: { aggregate: jest.fn() },
    matchRecord: { create: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    reconciliationRun: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    paymentException: { create: jest.fn(), count: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    suspenseItem: { create: jest.fn(), count: jest.fn(), aggregate: jest.fn(), findFirst: jest.fn(), findMany: jest.fn() },
    paymentReconciliationInboxItem: { upsert: jest.fn() },
    businessEvent: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    ledgerAuditEvent: { create: jest.fn() },
    closeRun: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    closePackExport: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}))

jest.mock("@/lib/error-handling/monitoring", () => ({
  AlertSeverity: { HIGH: "HIGH" },
  AlertType: { SECURITY: "SECURITY" },
  createAlert: jest.fn().mockResolvedValue({ id: "alert-1" }),
}))

import { db } from "@/prisma/db"
import { MobileMoneyHmacAdapter } from "@/services/payments/adapters/mobile-money-hmac.adapter"
import { captureProviderEvent } from "@/services/payments/provider-event.service"
import { importProviderStatement } from "@/services/payments/statement-import.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"

import { runPaymentReconciliation } from "../payment-reconciliation-run.service"

const mockedDb = db as unknown as {
  $transaction: jest.Mock
  providerAccount: { findFirst: jest.Mock; count: jest.Mock }
  providerEvent: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock; update: jest.Mock }
  statementFile: { findFirst: jest.Mock; create: jest.Mock; findMany: jest.Mock }
  statementLine: { findMany: jest.Mock; createMany: jest.Mock; update: jest.Mock }
  paymentTransaction: { findMany: jest.Mock; count: jest.Mock; findFirst: jest.Mock }
  payment: { aggregate: jest.Mock }
  matchRecord: { create: jest.Mock; count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  reconciliationRun: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock; count: jest.Mock }
  paymentException: { create: jest.Mock; count: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  suspenseItem: { create: jest.Mock; count: jest.Mock; aggregate: jest.Mock; findFirst: jest.Mock; findMany: jest.Mock }
  paymentReconciliationInboxItem: { upsert: jest.Mock }
  businessEvent: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock }
  ledgerAuditEvent: { create: jest.Mock }
  closeRun: { findMany: jest.Mock; findFirst: jest.Mock; update: jest.Mock }
  closePackExport: { findFirst: jest.Mock; update: jest.Mock }
  auditLog: { create: jest.Mock }
}

const adapter = new MobileMoneyHmacAdapter("mtn-momo", 1024, 300)
const secret = "provider-secret"
const pilotNow = new Date("2026-06-14T12:05:00.000Z")
const businessDate = new Date("2026-06-14T09:00:00.000Z")

type StoredRow = Record<string, any>

let providerEvents: StoredRow[]
let statementFiles: StoredRow[]
let statementLines: StoredRow[]
let paymentTransactions: StoredRow[]
let payments: StoredRow[]
let matchRecords: StoredRow[]
let reconciliationRuns: StoredRow[]
let paymentExceptions: StoredRow[]
let suspenseItems: StoredRow[]

function amount(value: number | string) {
  return new Prisma.Decimal(value)
}

function rawProviderEvent() {
  return JSON.stringify({
    eventId: "evt-pilot-1",
    transactionId: "txn-pilot-1",
    reference: "ref-pilot-1",
    eventType: "PAYMENT_SUCCEEDED",
    direction: "INBOUND",
    amount: "10000",
    feeAmount: "0",
    currencyCode: "XAF",
    occurredAt: "2026-06-14T10:00:00.000Z",
    customerMsisdn: "237699000000",
  })
}

function rawStatement() {
  return [
    "transactionId,reference,direction,amount,currencyCode,occurredAt,description,customerMsisdn",
    "txn-pilot-1,ref-pilot-1,CREDIT,10000,XAF,2026-06-14T10:00:00.000Z,Pilot collection,237699000000",
  ].join("\n")
}

function headersFor(rawBody: string) {
  const timestamp = pilotNow.getTime()
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${adapter.canonicalPayload(rawBody)}`)
    .digest("hex")

  return {
    "x-provider-timestamp": String(timestamp),
    "x-provider-signature": `sha256=${signature}`,
  }
}

function inPeriod(date: Date | null | undefined, range?: { gte?: Date; lte?: Date; lt?: Date }) {
  if (!date || !range) return true
  if (range.gte && date < range.gte) return false
  if (range.lte && date > range.lte) return false
  if (range.lt && date >= range.lt) return false
  return true
}

function statusIn(status: unknown, filter?: { in?: unknown[] } | unknown) {
  if (!filter) return true
  if (typeof filter === "object" && filter !== null && "in" in filter) {
    return (filter as { in?: unknown[] }).in?.includes(status) ?? true
  }
  return status === filter
}

function sumAmount(rows: StoredRow[], field: string) {
  return rows.reduce((sum, row) => sum.plus(row[field] ?? 0), new Prisma.Decimal(0))
}

function arrangePilotState() {
  providerEvents = []
  statementFiles = []
  statementLines = []
  matchRecords = []
  reconciliationRuns = []
  paymentExceptions = []
  suspenseItems = []
  paymentTransactions = [
    {
      id: "payment-transaction-1",
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      amount: amount(10000),
      currencyCode: "XAF",
      providerTransactionId: "txn-pilot-1",
      providerReference: "ref-pilot-1",
      direction: PaymentDirection.INBOUND,
      state: PaymentTransactionState.CONFIRMED,
      occurredAt: new Date("2026-06-14T10:00:00.000Z"),
      updatedAt: pilotNow,
    },
  ]
  payments = [
    {
      id: "payment-1",
      organizationId: "org-1",
      amount: amount(10000),
      status: PaymentStatus.PAID,
      createdAt: pilotNow,
      deletedAt: null,
    },
  ]

  const providerAccount = {
    id: "provider-account-1",
    organizationId: "org-1",
    providerCode: "mtn-momo",
    paymentRailId: "rail-mobile-money",
    paymentRail: { id: "rail-mobile-money", isActive: true },
    settlementLedgerAccountId: "settlement-ledger-1",
    suspenseLedgerAccountId: "suspense-ledger-1",
    settlementAccounts: [{ id: "settlement-account-1" }],
    currencyCode: "XAF",
    status: ProviderAccountStatus.ACTIVE,
    archivedAt: null,
    updatedAt: pilotNow,
  }

  mockedDb.$transaction.mockImplementation(async (callback) => callback(mockedDb))
  mockedDb.providerAccount.findFirst.mockResolvedValue(providerAccount)
  mockedDb.providerAccount.count.mockImplementation(async () => 1)

  mockedDb.providerEvent.findFirst.mockImplementation(async ({ where }: { where: StoredRow }) =>
    providerEvents.find((event) => event.providerEventId === where.providerEventId) ?? null,
  )
  mockedDb.providerEvent.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const event = {
      id: `provider-event-${providerEvents.length + 1}`,
      ...data,
      updatedAt: pilotNow,
    }
    providerEvents.push(event)
    return { id: event.id }
  })
  mockedDb.providerEvent.findMany.mockImplementation(async () =>
    providerEvents.filter((event) =>
      [ProviderEventStatus.VERIFIED, ProviderEventStatus.PROCESSED].includes(event.status),
    ),
  )
  mockedDb.providerEvent.update.mockImplementation(async ({ where, data }: { where: StoredRow; data: StoredRow }) => {
    const event = providerEvents.find((row) => row.id === where.id)
    if (!event) throw new Error(`Provider event ${where.id} not found`)
    Object.assign(event, data, { updatedAt: pilotNow })
    return event
  })

  mockedDb.statementFile.findFirst.mockImplementation(async ({ where }: { where: StoredRow }) =>
    statementFiles.find((file) => file.fileHash === where.fileHash) ?? null,
  )
  mockedDb.statementFile.findMany.mockImplementation(async () => statementFiles.map((file) => ({
    ...file,
    _count: { lines: statementLines.filter((line) => line.statementFileId === file.id).length },
  })))
  mockedDb.matchRecord.findMany.mockImplementation(async () => matchRecords)
  mockedDb.paymentException.findMany.mockImplementation(async () => paymentExceptions)
  mockedDb.suspenseItem.findMany.mockImplementation(async () => suspenseItems)
  mockedDb.statementFile.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const file = {
      id: `statement-file-${statementFiles.length + 1}`,
      ...data,
      updatedAt: pilotNow,
    }
    statementFiles.push(file)
    return { id: file.id }
  })
  mockedDb.statementLine.findMany.mockImplementation(async ({ where }: { where: StoredRow }) => {
    if (where?.fingerprint?.in) {
      return statementLines
        .filter((line) => where.fingerprint.in.includes(line.fingerprint))
        .map((line) => ({ fingerprint: line.fingerprint }))
    }
    if (where?.OR) {
      return statementLines.filter((line) =>
        where.OR.some((filter: StoredRow) =>
          (filter.providerTransactionId?.in?.includes(line.providerTransactionId)) ||
          (filter.providerReference?.in?.includes(line.providerReference)),
        ),
      )
    }
    return statementLines.filter((line) => statusIn(line.status, where?.status))
  })
  mockedDb.statementLine.createMany.mockImplementation(async ({ data }: { data: StoredRow[] }) => {
    data.forEach((line) => {
      statementLines.push({
        id: `statement-line-${statementLines.length + 1}`,
        ...line,
        updatedAt: pilotNow,
      })
    })
    return { count: data.length }
  })
  mockedDb.statementLine.update.mockImplementation(async ({ where, data }: { where: StoredRow; data: StoredRow }) => {
    const line = statementLines.find((row) => row.id === where.id)
    if (!line) throw new Error(`Statement line ${where.id} not found`)
    Object.assign(line, data, { updatedAt: pilotNow })
    return line
  })

  mockedDb.paymentTransaction.findMany.mockImplementation(async () => paymentTransactions)
  mockedDb.paymentTransaction.count.mockImplementation(async ({ where }: { where: StoredRow }) =>
    paymentTransactions.filter((transaction) => statusIn(transaction.state, where?.state)).length,
  )
  mockedDb.paymentTransaction.findFirst.mockResolvedValue({ updatedAt: pilotNow })
  mockedDb.payment.aggregate.mockImplementation(async ({ where }: { where: StoredRow }) => ({
    _sum: {
      amount: sumAmount(
        payments.filter((payment) => inPeriod(payment.createdAt, where?.createdAt)),
        "amount",
      ),
    },
  }))

  mockedDb.reconciliationRun.findFirst.mockImplementation(async ({ orderBy }: { orderBy?: StoredRow }) =>
    orderBy ? { updatedAt: reconciliationRuns.at(-1)?.updatedAt ?? pilotNow } : null,
  )
  mockedDb.reconciliationRun.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const run = {
      id: `reconciliation-run-${reconciliationRuns.length + 1}`,
      ...data,
      updatedAt: pilotNow,
      voidedAt: null,
    }
    reconciliationRuns.push(run)
    return { id: run.id }
  })
  mockedDb.reconciliationRun.update.mockImplementation(async ({ where, data }: { where: StoredRow; data: StoredRow }) => {
    const run = reconciliationRuns.find((row) => row.id === where.id)
    if (!run) throw new Error(`Reconciliation run ${where.id} not found`)
    Object.assign(run, data, { updatedAt: pilotNow })
    return run
  })
  mockedDb.reconciliationRun.count.mockImplementation(async ({ where }: { where: StoredRow }) =>
    reconciliationRuns.filter((run) => statusIn(run.status, where?.status) && inPeriod(run.businessDate, where?.businessDate)).length,
  )

  mockedDb.matchRecord.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const match = {
      id: `match-record-${matchRecords.length + 1}`,
      ...data,
      createdAt: pilotNow,
      updatedAt: pilotNow,
    }
    matchRecords.push(match)
    return { id: match.id }
  })
  mockedDb.matchRecord.count.mockImplementation(async ({ where }: { where: StoredRow }) =>
    matchRecords.filter((match) => statusIn(match.status, where?.status) && inPeriod(match.createdAt, where?.createdAt)).length,
  )
  mockedDb.matchRecord.aggregate.mockImplementation(async ({ where }: { where: StoredRow }) => ({
    _sum: {
      amountMatched: sumAmount(
        matchRecords.filter((match) => statusIn(match.status, where?.status) && inPeriod(match.createdAt, where?.createdAt)),
        "amountMatched",
      ),
    },
  }))
  mockedDb.matchRecord.findFirst.mockImplementation(async () => ({ updatedAt: matchRecords.at(-1)?.updatedAt ?? pilotNow }))

  mockedDb.paymentException.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const exception = { id: `payment-exception-${paymentExceptions.length + 1}`, ...data, updatedAt: pilotNow }
    paymentExceptions.push(exception)
    return { id: exception.id }
  })
  mockedDb.paymentException.count.mockImplementation(async () => paymentExceptions.length)
  mockedDb.paymentException.findFirst.mockImplementation(async () =>
    paymentExceptions.at(-1) ? { updatedAt: paymentExceptions.at(-1)?.updatedAt } : null,
  )

  mockedDb.suspenseItem.create.mockImplementation(async ({ data }: { data: StoredRow }) => {
    const suspense = { id: `suspense-item-${suspenseItems.length + 1}`, ...data, updatedAt: pilotNow }
    suspenseItems.push(suspense)
    return { id: suspense.id }
  })
  mockedDb.suspenseItem.count.mockImplementation(async () => suspenseItems.length)
  mockedDb.suspenseItem.aggregate.mockImplementation(async () => ({ _sum: { amount: sumAmount(suspenseItems, "amount") } }))
  mockedDb.suspenseItem.findFirst.mockImplementation(async () =>
    suspenseItems.at(-1) ? { updatedAt: suspenseItems.at(-1)?.updatedAt } : null,
  )

  mockedDb.paymentReconciliationInboxItem.upsert.mockImplementation(async () => ({ id: "inbox-item-1" }))
  mockedDb.businessEvent.findUnique.mockResolvedValue(null)
  mockedDb.businessEvent.create.mockImplementation(async ({ data }: { data: StoredRow }) => ({
    id: "business-event-1",
    ...data,
    outboxMessages: data.outboxMessages?.create ?? [],
  }))
  mockedDb.closeRun.findMany.mockResolvedValue([])
  mockedDb.closeRun.findFirst.mockResolvedValue(null)
  mockedDb.closeRun.update.mockResolvedValue({ id: "close-run-1" })
  mockedDb.closePackExport.findFirst.mockResolvedValue(null)
  mockedDb.closePackExport.update.mockResolvedValue({ id: "close-pack-export-1" })
  mockedDb.ledgerAuditEvent.create.mockResolvedValue({ id: "ledger-audit-1" })
  mockedDb.auditLog.create.mockResolvedValue({ id: "audit-log-1" })
}

describe("payment truth pilot fixture", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(pilotNow)
    jest.clearAllMocks()
    arrangePilotState()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("proves provider capture, statement import, reconciliation, and cash-truth snapshot in one path", async () => {
    const rawBody = rawProviderEvent()

    const captured = await captureProviderEvent({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawBody,
      headers: headersFor(rawBody),
      secret,
      receivedAt: pilotNow,
      now: pilotNow,
      correlationId: "corr-pilot-event",
    })

    const imported = await importProviderStatement({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      adapter,
      rawContent: rawStatement(),
      fileName: "pilot-mtn-statement.csv",
      importedById: "operator-1",
      correlationId: "corr-pilot-statement",
    })

    const run = await runPaymentReconciliation({
      organizationId: "org-1",
      providerAccountId: "provider-account-1",
      businessDate,
      runById: "operator-1",
      correlationId: "corr-pilot-run",
    })

    const snapshot = await getPaymentTruthSnapshot({
      organizationId: "org-1",
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      now: "2026-06-14T12:10:00.000Z",
    })

    expect(captured).toMatchObject({
      status: "CAPTURED",
      providerEventRecordId: "provider-event-1",
      correlationId: "corr-pilot-event",
    })
    expect(imported).toMatchObject({
      status: "IMPORTED",
      statementFileId: "statement-file-1",
      importedLineCount: 1,
      duplicateLineCount: 0,
      correlationId: "corr-pilot-statement",
    })
    expect(run).toMatchObject({
      runId: "reconciliation-run-1",
      status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
      matchCount: 1,
      exceptionCount: 0,
      suspenseCount: 0,
      suspenseAmount: "0.00",
      correlationId: "corr-pilot-run",
    })
    expect(matchRecords).toEqual([
      expect.objectContaining({
        status: MatchStatus.AUTO_MATCHED,
        paymentTransactionId: "payment-transaction-1",
        providerEventId: "provider-event-1",
        statementLineId: "statement-line-1",
        amountMatched: amount(10000),
      }),
    ])
    expect(providerEvents[0]).toEqual(expect.objectContaining({ status: ProviderEventStatus.PROCESSED }))
    expect(statementLines[0]).toEqual(expect.objectContaining({ status: StatementLineStatus.MATCHED }))
    expect(paymentExceptions).toHaveLength(0)
    expect(suspenseItems).toHaveLength(0)
    expect(snapshot.status).toBe("fresh")
    expect(snapshot.evidenceGrade).toBe("operational")
    expect(snapshot.metrics).toMatchObject({
      internalCollectedAmount: 10000,
      externalMatchedAmount: 10000,
      externalMatchedCount: 1,
      cashVarianceAmount: 0,
      recentRunCount: 1,
      readyForSignoffCount: 1,
      openExceptionCount: 0,
      openSuspenseCount: 0,
    })
  })
})
