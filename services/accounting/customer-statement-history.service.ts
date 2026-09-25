import { Prisma } from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"
import type { CustomerStatementSnapshotResult } from "./customer-statement.service"
import { canRetryUnsentStatement, statementRecoveryRevision } from "./customer-statement-delivery-recovery"
import { statementRecoveryQueueSelect } from "./customer-statement-retry.service"

const id = z.string().trim().min(1).max(191)
export const customerStatementHistoryInputSchema = z.object({
  customerId: id,
  cursor: id.optional(),
  limit: z.number().int().min(1).max(25).default(10),
}).strict()
export const customerStatementRecordInputSchema = customerStatementHistoryInputSchema.extend({ statementId: id }).strict()
export type CustomerStatementSummary = Omit<CustomerStatementSnapshotResult, "payload" | "replayed" | "truncated"> & { truncated: boolean }

const snapshotSelect = {
  id: true, statementNumber: true, version: true, contentHash: true, businessEventId: true,
  periodStart: true, periodEnd: true, asOf: true, recordedThrough: true, currency: true,
  openingBalance: true, periodDebits: true, periodCredits: true, closingBalance: true,
  overdueBalance: true, itemCount: true, movementCount: true, truncated: true, createdAt: true,
} satisfies Prisma.CustomerStatementSnapshotSelect

function summary(row: Prisma.CustomerStatementSnapshotGetPayload<{ select: typeof snapshotSelect }>): CustomerStatementSummary {
  return {
    statementId: row.id, statementNumber: row.statementNumber, version: row.version,
    contentHash: row.contentHash, businessEventId: row.businessEventId,
    periodStart: row.periodStart.toISOString(), periodEnd: row.periodEnd.toISOString(),
    asOf: row.asOf.toISOString(), recordedThrough: row.recordedThrough.toISOString(), currency: row.currency,
    openingBalance: row.openingBalance.toFixed(2), periodDebits: row.periodDebits.toFixed(2),
    periodCredits: row.periodCredits.toFixed(2), closingBalance: row.closingBalance.toFixed(2),
    overdueBalance: row.overdueBalance.toFixed(2), itemCount: row.itemCount,
    movementCount: row.movementCount, truncated: row.truncated,
  }
}

const before = (anchor: { id: string; createdAt: Date } | null) => anchor ? {
  OR: [{ createdAt: { lt: anchor.createdAt } }, { createdAt: anchor.createdAt, id: { lt: anchor.id } }],
} : {}

async function requireCustomer(tx: Prisma.TransactionClient, organizationId: string, customerId: string) {
  const customer = await tx.customer.findFirst({ where: { id: customerId, organizationId }, select: { id: true } })
  if (!customer) throw new NotFoundError("Customer not found")
}

export async function listCustomerStatementHistory(
  input: z.input<typeof customerStatementHistoryInputSchema> & { organizationId: string },
  client: typeof db = db,
) {
  const organizationId = id.parse(input.organizationId)
  const { organizationId: _scope, ...query } = input
  const { customerId, cursor, limit } = customerStatementHistoryInputSchema.parse(query)
  return client.$transaction(async tx => {
    await requireCustomer(tx, organizationId, customerId)
    const scope = { organizationId, customerId }
    const anchor = cursor ? await tx.customerStatementSnapshot.findFirst({ where: { ...scope, id: cursor }, select: { id: true, createdAt: true } }) : null
    if (cursor && !anchor) throw new NotFoundError("Statement history cursor not found")
    const rows = await tx.customerStatementSnapshot.findMany({
      where: { ...scope, ...before(anchor) }, select: snapshotSelect,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
    })
    return {
      customerId, checkedAt: new Date().toISOString(), statements: rows.slice(0, limit).map(summary),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export async function getCustomerStatementRecord(
  input: z.input<typeof customerStatementRecordInputSchema> & { organizationId: string },
  client: typeof db = db,
) {
  const organizationId = id.parse(input.organizationId)
  const { organizationId: _scope, ...query } = input
  const { customerId, statementId, cursor, limit } = customerStatementRecordInputSchema.parse(query)
  return client.$transaction(async tx => {
    await requireCustomer(tx, organizationId, customerId)
    const snapshot = await tx.customerStatementSnapshot.findFirst({ where: { organizationId, customerId, id: statementId }, select: snapshotSelect })
    if (!snapshot) throw new NotFoundError("Customer statement not found")
    const scope = { organizationId, statementSnapshotId: statementId }
    const anchor = cursor ? await tx.customerStatementDelivery.findFirst({ where: { ...scope, id: cursor }, select: { id: true, createdAt: true } }) : null
    if (cursor && !anchor) throw new NotFoundError("Delivery history cursor not found")
    const rows = await tx.customerStatementDelivery.findMany({
      where: { ...scope, ...before(anchor) }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: limit + 1,
      select: {
        id: true, createdAt: true, channel: true, redactedDestination: true, consentCapturedAt: true, outboxId: true,
        states: { orderBy: { version: "desc" }, take: 1, select: { status: true, occurredAt: true, errorCode: true } },
        token: { select: { id: true, status: true, expiresAt: true, revokedAt: true } },
      },
    })
    const page = rows.slice(0, limit)
    const outbox = await tx.businessEventOutbox.findMany({
      where: { organizationId, id: { in: page.map(row => row.outboxId) } },
      select: { ...statementRecoveryQueueSelect, availableAt: true },
    })
    const checkedAt = new Date()
    return {
      customerId, checkedAt: checkedAt.toISOString(), statement: summary(snapshot),
      deliveries: page.map(row => {
        const state = row.states[0], queue = outbox.find(item => item.id === row.outboxId)
        const tokenStatus = row.token.revokedAt || row.token.status === "REVOKED" ? "REVOKED" as const
          : row.token.status === "EXPIRED" || row.token.expiresAt <= checkedAt ? "EXPIRED" as const : "ACTIVE" as const
        return {
          deliveryId: row.id, createdAt: row.createdAt.toISOString(), channel: row.channel,
          redactedDestination: row.redactedDestination, consentCapturedAt: row.consentCapturedAt.toISOString(),
          status: state?.status ?? null, statusRecordedAt: state?.occurredAt.toISOString() ?? null,
          errorCode: state?.errorCode ?? null,
          recovery: queue && tokenStatus === "ACTIVE" && !snapshot.truncated && canRetryUnsentStatement(queue, state)
            ? { revision: statementRecoveryRevision(queue) } : null,
          queue: queue ? { status: queue.status, attempts: queue.attempts, availableAt: queue.availableAt.toISOString(), errorCode: queue.lastErrorCode } : null,
          token: { id: row.token.id, status: tokenStatus, expiresAt: row.token.expiresAt.toISOString(), revokedAt: row.token.revokedAt?.toISOString() ?? null },
        }
      }),
      nextCursor: rows.length > limit ? rows[limit - 1].id : null,
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
}

export type CustomerStatementHistory = Awaited<ReturnType<typeof listCustomerStatementHistory>>
export type CustomerStatementRecord = Awaited<ReturnType<typeof getCustomerStatementRecord>>
