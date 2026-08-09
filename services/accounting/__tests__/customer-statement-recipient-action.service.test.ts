import {
  CustomerStatementAccessAction,
  CustomerStatementRecipientActionStatus,
  CustomerStatementRecipientActionType,
  Prisma,
} from "@prisma/client"

import {
  markBusinessEventAppliedInTx,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"

import {
  recordCustomerStatementAccessInTx,
  resolveCustomerStatementAccessInTx,
} from "../customer-statement-access.service"
import {
  submitCustomerStatementRecipientActionInTx,
} from "../customer-statement-recipient-action.service"

jest.mock("../customer-statement-access.service", () => ({
  resolveCustomerStatementAccessInTx: jest.fn(),
  recordCustomerStatementAccessInTx: jest.fn(),
}))

jest.mock("@/services/events/business-event.service", () => {
  const actual = jest.requireActual(
    "@/services/events/business-event.service",
  )
  return {
    ...actual,
    recordBusinessEventInTx: jest.fn(),
    markBusinessEventAppliedInTx: jest.fn(),
  }
})

const mockResolve = resolveCustomerStatementAccessInTx as jest.MockedFunction<
  typeof resolveCustomerStatementAccessInTx
>
const mockRecordAccess =
  recordCustomerStatementAccessInTx as jest.MockedFunction<
    typeof recordCustomerStatementAccessInTx
  >
const mockRecordEvent = recordBusinessEventInTx as jest.MockedFunction<
  typeof recordBusinessEventInTx
>
const mockMarkEvent = markBusinessEventAppliedInTx as jest.MockedFunction<
  typeof markBusinessEventAppliedInTx
>

const NOW = new Date("2026-08-09T12:00:00.000Z")

function access() {
  return {
    organizationId: "org-1",
    statementSnapshotId: "statement-1",
    tokenId: "token-1",
    tokenHash: "a".repeat(64),
    tokenHashPrefix: "a".repeat(12),
    statementContentHash: "b".repeat(64),
    expiresAt: new Date("2026-09-01T00:00:00.000Z"),
    permissions: ["dispute", "promise_to_pay", "view"] as const,
    snapshot: {
      id: "statement-1",
      statementNumber: "STM-001",
      version: 1,
      contentHash: "b".repeat(64),
      currency: "XAF",
      periodStart: new Date("2026-08-01T00:00:00.000Z"),
      periodEnd: new Date("2026-08-09T11:00:00.000Z"),
      closingBalance: new Prisma.Decimal(25),
      truncated: false,
      statementPayload: {
        lines: [
          {
            customerReceivableDocumentId: "receivable-1",
            openingBalance: "40.00",
            debitAmount: "0.00",
            closingBalance: "25.00",
          },
        ],
      },
    },
  }
}

function buildTx(options: {
  existing?: Record<string, unknown> | null
} = {}) {
  const actionCreate = jest.fn(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "action-1",
      createdAt: NOW,
      ...data,
    }),
  )
  const stateCreate = jest.fn(
    async ({ data }: { data: Record<string, unknown> }) => ({
      id: "state-1",
      createdAt: NOW,
      ...data,
    }),
  )
  return {
    tx: {
      customerStatementRecipientAction: {
        findFirst: jest.fn().mockResolvedValue(options.existing ?? null),
        create: actionCreate,
      },
      customerStatementRecipientActionState: {
        create: stateCreate,
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "audit-1" }),
      },
    } as unknown as Prisma.TransactionClient,
    actionCreate,
    stateCreate,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockResolve.mockResolvedValue(access() as never)
  mockRecordAccess.mockResolvedValue({ id: "access-log-1" } as never)
  mockRecordEvent.mockResolvedValue({ event: { id: "event-1" } } as never)
  mockMarkEvent.mockResolvedValue(undefined as never)
})

describe("customer statement recipient actions", () => {
  it("creates an immutable dispute with an OPEN hash-chained state and no raw-note audit", async () => {
    const { tx, actionCreate, stateCreate } = buildTx()

    const result = await submitCustomerStatementRecipientActionInTx(tx, {
      statementSnapshotId: "statement-1",
      token: "signed-token",
      actionType: "DISPUTE",
      customerReceivableDocumentId: "receivable-1",
      requestedAmount: "10.00",
      note: "The delivered quantity does not match the invoice.",
      idempotencyKey: "dispute-idempotency-001",
      correlationId: "dispute-correlation-001",
      now: NOW,
      ipAddress: "203.0.113.20",
      userAgent: "Statement Client/1.0",
    })

    expect(result).toMatchObject({
      actionId: "action-1",
      actionType: CustomerStatementRecipientActionType.DISPUTE,
      status: CustomerStatementRecipientActionStatus.OPEN,
      customerReceivableDocumentId: "receivable-1",
      requestedAmount: "10.00",
      promisedFor: null,
      replayed: false,
    })
    expect(mockResolve).toHaveBeenCalledWith(tx, {
      statementSnapshotId: "statement-1",
      token: "signed-token",
      action: CustomerStatementAccessAction.DISPUTE,
      now: NOW,
    })
    expect(actionCreate.mock.calls[0][0].data).toMatchObject({
      tokenId: "token-1",
      recipientNote: "The delivered quantity does not match the invoice.",
      noteHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      payloadHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      businessEventId: "event-1",
    })
    expect(stateCreate.mock.calls[0][0].data).toMatchObject({
      version: 1,
      status: CustomerStatementRecipientActionStatus.OPEN,
      actorType: "STATEMENT_RECIPIENT",
      previousStateHash: null,
      stateHash: expect.stringMatching(/^[0-9a-f]{64}$/),
      evidenceHash: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(mockRecordEvent.mock.invocationCallOrder[0]).toBeLessThan(
      actionCreate.mock.invocationCallOrder[0],
    )
    expect(actionCreate.mock.invocationCallOrder[0]).toBeLessThan(
      stateCreate.mock.invocationCallOrder[0],
    )
    const audit = tx.auditLog.create as jest.Mock
    expect(JSON.stringify(audit.mock.calls[0][0])).not.toContain(
      "The delivered quantity",
    )
    expect(mockRecordAccess).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: CustomerStatementAccessAction.DISPUTE,
        ipAddress: "203.0.113.20",
        userAgent: "Statement Client/1.0",
      }),
    )
  })

  it("creates a bounded promise-to-pay against the statement closing balance", async () => {
    const { tx, actionCreate } = buildTx()
    const promisedFor = new Date("2026-08-30T12:00:00.000Z")

    const result = await submitCustomerStatementRecipientActionInTx(tx, {
      statementSnapshotId: "statement-1",
      token: "signed-token",
      actionType: "PROMISE_TO_PAY",
      requestedAmount: "20.00",
      promisedFor,
      note: "We will settle by the promised date.",
      idempotencyKey: "promise-idempotency-001",
      correlationId: "promise-correlation-001",
      now: NOW,
    })

    expect(result).toMatchObject({
      actionType: CustomerStatementRecipientActionType.PROMISE_TO_PAY,
      requestedAmount: "20.00",
      promisedFor: promisedFor.toISOString(),
      status: CustomerStatementRecipientActionStatus.OPEN,
    })
    expect(actionCreate.mock.calls[0][0].data).toMatchObject({
      actionType: CustomerStatementRecipientActionType.PROMISE_TO_PAY,
      promisedFor,
    })
    expect(mockResolve).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        action: CustomerStatementAccessAction.PROMISE_TO_PAY,
      }),
    )
  })

  it.each([
    [
      "a dispute above the statement line amount",
      {
        actionType: "DISPUTE",
        customerReceivableDocumentId: "receivable-1",
        requestedAmount: "41.00",
        promisedFor: null,
      },
      "exceeds the statement line amount",
    ],
    [
      "a promise above the closing balance",
      {
        actionType: "PROMISE_TO_PAY",
        customerReceivableDocumentId: null,
        requestedAmount: "26.00",
        promisedFor: new Date("2026-08-30T12:00:00.000Z"),
      },
      "exceeds the statement closing balance",
    ],
  ])("fails closed for %s", async (_name, fields, message) => {
    const { tx, actionCreate } = buildTx()

    await expect(
      submitCustomerStatementRecipientActionInTx(tx, {
        statementSnapshotId: "statement-1",
        token: "signed-token",
        note: "A bounded recipient explanation.",
        idempotencyKey: "recipient-idempotency-001",
        correlationId: "recipient-correlation-001",
        now: NOW,
        ...fields,
      } as never),
    ).rejects.toThrow(message)
    expect(actionCreate).not.toHaveBeenCalled()
    expect(mockRecordEvent).not.toHaveBeenCalled()
    expect(mockRecordAccess).not.toHaveBeenCalled()
  })

  it("replays exact recipient evidence without creating a second action or state", async () => {
    const existing = {
      id: "action-existing",
      organizationId: "org-1",
      statementSnapshotId: "statement-1",
      tokenId: "token-1",
      customerReceivableDocumentId: "receivable-1",
      actionType: CustomerStatementRecipientActionType.DISPUTE,
      requestedAmount: new Prisma.Decimal(10),
      promisedFor: null,
      recipientNote: "The delivered quantity does not match the invoice.",
      noteHash: "c".repeat(64),
      payloadHash: "",
      idempotencyKey: "dispute-idempotency-001",
      correlationId: "dispute-correlation-001",
      businessEventId: "event-existing",
      createdAt: NOW,
      states: [
        {
          status: CustomerStatementRecipientActionStatus.OPEN,
          stateHash: "d".repeat(64),
        },
      ],
    }
    const { tx, actionCreate, stateCreate } = buildTx({ existing })
    const baseInput = {
      statementSnapshotId: "statement-1",
      token: "signed-token",
      actionType: "DISPUTE" as const,
      customerReceivableDocumentId: "receivable-1",
      requestedAmount: "10.00",
      note: "The delivered quantity does not match the invoice.",
      idempotencyKey: "dispute-idempotency-001",
      correlationId: "dispute-correlation-001",
      now: NOW,
    }
    const firstAttempt = submitCustomerStatementRecipientActionInTx(
      tx,
      baseInput,
    )
    await expect(firstAttempt).rejects.toThrow(
      "Recipient action idempotency evidence was reused",
    )

    expect(actionCreate).not.toHaveBeenCalled()
    expect(stateCreate).not.toHaveBeenCalled()
  })
})
