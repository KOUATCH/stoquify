import {
  CustomerStatementAccessAction,
  CustomerStatementRecipientActionStatus,
  CustomerStatementRecipientActionType,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  recordCustomerStatementAccessInTx,
  resolveCustomerStatementAccessInTx,
} from "./customer-statement-access.service"
import { receivableMoney } from "./customer-receivable-document.service"

export type SubmitCustomerStatementRecipientActionInput = {
  statementSnapshotId: string
  token?: string | null
  actionType: "DISPUTE" | "PROMISE_TO_PAY"
  customerReceivableDocumentId?: string | null
  requestedAmount: Prisma.Decimal.Value
  promisedFor?: Date | string | null
  note: string
  idempotencyKey: string
  correlationId: string
  now?: Date
  ipAddress?: string | null
  userAgent?: string | null
}

export type CustomerStatementRecipientActionResult = {
  actionId: string
  actionType: CustomerStatementRecipientActionType
  status: CustomerStatementRecipientActionStatus
  customerReceivableDocumentId: string | null
  requestedAmount: string
  promisedFor: string | null
  statementSnapshotId: string
  statementContentHash: string
  payloadHash: string
  stateHash: string
  submittedAt: string
  replayed: boolean
}

function requiredText(value: string, label: string) {
  const normalized = value.trim()
  if (!normalized) throw new BusinessRuleError(label + " is required")
  return normalized
}

function boundedKey(value: string, label: string) {
  const normalized = requiredText(value, label)
  if (normalized.length < 8 || normalized.length > 160) {
    throw new BusinessRuleError(
      label + " must contain between 8 and 160 characters",
    )
  }
  return normalized
}

function noteText(value: string) {
  const normalized = value.trim()
  if (normalized.length < 3 || normalized.length > 500) {
    throw new BusinessRuleError(
      "Recipient note must contain between 3 and 500 characters",
    )
  }
  return normalized
}

function statementJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue
}

function asRecord(value: Prisma.JsonValue): Prisma.JsonObject | null {
  return value && !Array.isArray(value) && typeof value === "object"
    ? value
    : null
}

function statementLines(payload: Prisma.JsonValue) {
  const root = asRecord(payload)
  return Array.isArray(root?.lines)
    ? root.lines
        .map((line) => asRecord(line))
        .filter((line): line is Record<string, Prisma.JsonValue> => Boolean(line))
    : []
}

function lineAmount(
  line: Record<string, Prisma.JsonValue>,
  key: string,
) {
  const value = line[key]
  return typeof value === "string" ? receivableMoney(value, key) : null
}

function actionResult(
  action: {
    id: string
    actionType: CustomerStatementRecipientActionType
    customerReceivableDocumentId: string | null
    requestedAmount: Prisma.Decimal | null
    promisedFor: Date | null
    statementSnapshotId: string
    payloadHash: string
    createdAt: Date
  },
  statementContentHash: string,
  state: {
    status: CustomerStatementRecipientActionStatus
    stateHash: string
  },
  replayed: boolean,
): CustomerStatementRecipientActionResult {
  if (!action.requestedAmount) {
    throw new ConflictError("Recipient action amount evidence is missing")
  }
  return {
    actionId: action.id,
    actionType: action.actionType,
    status: state.status,
    customerReceivableDocumentId:
      action.customerReceivableDocumentId,
    requestedAmount: action.requestedAmount.toFixed(2),
    promisedFor: action.promisedFor?.toISOString() ?? null,
    statementSnapshotId: action.statementSnapshotId,
    statementContentHash,
    payloadHash: action.payloadHash,
    stateHash: state.stateHash,
    submittedAt: action.createdAt.toISOString(),
    replayed,
  }
}

export async function submitCustomerStatementRecipientActionInTx(
  tx: Prisma.TransactionClient,
  input: SubmitCustomerStatementRecipientActionInput,
): Promise<CustomerStatementRecipientActionResult> {
  const now = input.now ? new Date(input.now.getTime()) : new Date()
  const statementSnapshotId = requiredText(
    input.statementSnapshotId,
    "Customer statement",
  )
  const idempotencyKey = boundedKey(input.idempotencyKey, "Idempotency key")
  const correlationId = boundedKey(input.correlationId, "Correlation ID")
  const note = noteText(input.note)
  const noteHash = hashBusinessPayload(note)
  const requestedAmount = receivableMoney(
    input.requestedAmount,
    "Requested amount",
  )
  if (requestedAmount.lte(0)) {
    throw new BusinessRuleError("Requested amount must be positive")
  }
  const actionType =
    input.actionType === "DISPUTE"
      ? CustomerStatementRecipientActionType.DISPUTE
      : input.actionType === "PROMISE_TO_PAY"
        ? CustomerStatementRecipientActionType.PROMISE_TO_PAY
        : null
  if (!actionType) {
    throw new BusinessRuleError("Recipient action type is invalid")
  }
  const accessAction =
    actionType === CustomerStatementRecipientActionType.DISPUTE
      ? CustomerStatementAccessAction.DISPUTE
      : CustomerStatementAccessAction.PROMISE_TO_PAY
  const access = await resolveCustomerStatementAccessInTx(tx, {
    statementSnapshotId,
    token: input.token,
    action: accessAction,
    now,
  })

  let customerReceivableDocumentId: string | null = null
  let promisedFor: Date | null = null
  if (actionType === CustomerStatementRecipientActionType.DISPUTE) {
    customerReceivableDocumentId = requiredText(
      input.customerReceivableDocumentId ?? "",
      "Disputed receivable document",
    )
    const line = statementLines(access.snapshot.statementPayload).find(
      (candidate) =>
        candidate.customerReceivableDocumentId ===
        customerReceivableDocumentId,
    )
    if (!line) {
      throw new BusinessRuleError(
        "Disputed receivable is not present in this statement",
      )
    }
    const opening = lineAmount(line, "openingBalance")
    const debit = lineAmount(line, "debitAmount")
    if (
      !opening ||
      !debit ||
      requestedAmount.gt(opening.plus(debit))
    ) {
      throw new BusinessRuleError(
        "Disputed amount exceeds the statement line amount",
      )
    }
    if (input.promisedFor != null) {
      throw new BusinessRuleError(
        "Disputes cannot include a promise-to-pay date",
      )
    }
  } else {
    if (requestedAmount.gt(access.snapshot.closingBalance)) {
      throw new BusinessRuleError(
        "Promise-to-pay amount exceeds the statement closing balance",
      )
    }
    promisedFor = input.promisedFor
      ? new Date(input.promisedFor)
      : null
    if (!promisedFor || Number.isNaN(promisedFor.getTime())) {
      throw new BusinessRuleError(
        "Promise-to-pay date is required and must be valid",
      )
    }
    const maxPromiseDate = new Date(
      now.getTime() + 365 * 24 * 60 * 60 * 1000,
    )
    if (
      promisedFor.getTime() <= now.getTime() ||
      promisedFor.getTime() > maxPromiseDate.getTime()
    ) {
      throw new BusinessRuleError(
        "Promise-to-pay date must be within the next 365 days",
      )
    }
    if (input.customerReceivableDocumentId) {
      customerReceivableDocumentId = requiredText(
        input.customerReceivableDocumentId,
        "Promised receivable document",
      )
      const lineExists = statementLines(
        access.snapshot.statementPayload,
      ).some(
        (line) =>
          line.customerReceivableDocumentId ===
          customerReceivableDocumentId,
      )
      if (!lineExists) {
        throw new BusinessRuleError(
          "Promised receivable is not present in this statement",
        )
      }
    }
  }

  const payloadHash = hashBusinessPayload({
    organizationId: access.organizationId,
    statementSnapshotId,
    statementContentHash: access.statementContentHash,
    tokenId: access.tokenId,
    actionType,
    customerReceivableDocumentId,
    requestedAmount: requestedAmount.toFixed(2),
    promisedFor: promisedFor?.toISOString() ?? null,
    note,
    idempotencyKey,
    correlationId,
  })
  const existing = await tx.customerStatementRecipientAction.findFirst({
    where: {
      organizationId: access.organizationId,
      statementSnapshotId,
      OR: [{ idempotencyKey }, { correlationId }],
    },
    include: {
      states: {
        orderBy: [{ version: "desc" }, { createdAt: "desc" }],
        take: 1,
      },
    },
  })
  if (existing) {
    if (
      existing.idempotencyKey !== idempotencyKey ||
      existing.payloadHash !== payloadHash ||
      existing.tokenId !== access.tokenId ||
      existing.actionType !== actionType
    ) {
      throw new ConflictError(
        "Recipient action idempotency evidence was reused",
      )
    }
    const state = existing.states[0]
    if (!state) {
      throw new ConflictError(
        "Recipient action lifecycle evidence is missing",
      )
    }
    const result = actionResult(
      existing,
      access.statementContentHash,
      state,
      true,
    )
    const responseHash = hashBusinessPayload(result)
    await recordCustomerStatementAccessInTx(tx, {
      ...access,
      action: accessAction,
      responseHash,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      occurredAt: now,
    })
    return result
  }

  const evidenceHash = hashBusinessPayload({
    statementContentHash: access.statementContentHash,
    tokenId: access.tokenId,
    payloadHash,
  })
  const stateHash = hashBusinessPayload({
    organizationId: access.organizationId,
    statementSnapshotId,
    actionType,
    payloadHash,
    version: 1,
    status: CustomerStatementRecipientActionStatus.OPEN,
    effectiveAt: now.toISOString(),
    actorType: "STATEMENT_RECIPIENT",
    previousStateHash: null,
    evidenceHash,
  })
  const event = await recordBusinessEventInTx(tx, {
    organizationId: access.organizationId,
    eventType: "customer.statement.recipient_action.created",
    eventSource: "API",
    schemaVersion: 1,
    idempotencyKey:
      "customer-statement-recipient-action:" + payloadHash,
    payload: {
      statementSnapshotId,
      statementContentHash: access.statementContentHash,
      actionType,
      customerReceivableDocumentId,
      requestedAmount: requestedAmount.toFixed(2),
      promisedFor: promisedFor?.toISOString() ?? null,
      noteHash,
      payloadHash,
      stateHash,
    },
    occurredAt: now,
    sourceType: "CUSTOMER_STATEMENT_RECIPIENT_ACTION",
    sourceId: statementSnapshotId,
    documentHash: access.statementContentHash,
    metadata: {
      gate: "phase-5-statement-recipient-workflow",
      tokenHashPrefix: access.tokenHashPrefix,
    },
    outboxMessages: [],
  })
  const action = await tx.customerStatementRecipientAction.create({
    data: {
      organizationId: access.organizationId,
      statementSnapshotId,
      tokenId: access.tokenId,
      customerReceivableDocumentId,
      actionType,
      requestedAmount,
      promisedFor,
      recipientNote: note,
      noteHash,
      payloadHash,
      idempotencyKey,
      correlationId,
      businessEventId: event.event.id,
    },
  })
  const state = await tx.customerStatementRecipientActionState.create({
    data: {
      organizationId: access.organizationId,
      actionId: action.id,
      version: 1,
      status: CustomerStatementRecipientActionStatus.OPEN,
      effectiveAt: now,
      actorType: "STATEMENT_RECIPIENT",
      actorId: null,
      reason: null,
      previousStateHash: null,
      stateHash,
      evidenceHash,
      businessEventId: event.event.id,
    },
  })
  await markBusinessEventAppliedInTx(
    tx,
    access.organizationId,
    event.event.id,
  )
  const result = actionResult(
    action,
    access.statementContentHash,
    state,
    false,
  )
  const responseHash = hashBusinessPayload(result)
  await recordCustomerStatementAccessInTx(tx, {
    ...access,
    action: accessAction,
    responseHash,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    occurredAt: now,
  })
  await tx.auditLog.create({
    data: {
      organizationId: access.organizationId,
      entityType: "CustomerStatementRecipientAction",
      entityId: action.id,
      action:
        actionType === CustomerStatementRecipientActionType.DISPUTE
          ? "CUSTOMER_STATEMENT_DISPUTE_CREATED"
          : "CUSTOMER_STATEMENT_PROMISE_TO_PAY_CREATED",
      userId: null,
      changes: statementJson({
        after: {
          statementSnapshotId,
          statementContentHash: access.statementContentHash,
          tokenId: access.tokenId,
          tokenHashPrefix: access.tokenHashPrefix,
          actionType,
          customerReceivableDocumentId,
          requestedAmount: requestedAmount.toFixed(2),
          promisedFor: promisedFor?.toISOString() ?? null,
          noteHash,
          payloadHash,
          stateHash,
          businessEventId: event.event.id,
          correlationId,
        },
      }),
    },
  })
  return result
}

export async function submitCustomerStatementRecipientAction(
  input: SubmitCustomerStatementRecipientActionInput,
  client: typeof db = db,
) {
  return client.$transaction(
    (tx) => submitCustomerStatementRecipientActionInTx(tx, input),
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  )
}
