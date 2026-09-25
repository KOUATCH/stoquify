import { Prisma, type BusinessEvent } from "@prisma/client"
import { hashBusinessPayload, markBusinessEventAppliedInTx, recordBusinessEventInTx } from "@/services/events/business-event.service"
import { submitSupplierPoProposal } from "../supplier-po-acknowledgement.service"
import { verifySupplierPoAccessToken } from "../supplier-po-access-token"

jest.mock("@/prisma/db", () => ({ db: {} }))
jest.mock("@/services/events/business-event.service", () => ({
  ...jest.requireActual("@/services/events/business-event.service"), recordBusinessEventInTx: jest.fn(), markBusinessEventAppliedInTx: jest.fn(),
}))
jest.mock("../supplier-po-access-token", () => ({ ...jest.requireActual("../supplier-po-access-token"), verifySupplierPoAccessToken: jest.fn() }))

const NOW = new Date("2026-08-09T12:00:00.000Z")
const RETRY_AT = new Date("2026-08-11T12:00:00.000Z")
const input = {
  envelopeId: "envelope-1", token: "signed-token", proposalType: "REQUEST_CHANGE" as const,
  requestedDeliveryDate: "2026-08-10T12:00:00.000Z", quantityChanges: [], note: "Please adjust the agreed delivery date.",
  idempotencyKey: "supplier-proposal-retry-001", correlationId: "supplier-proposal-correlation-001", now: NOW,
}
const payload = {
  schemaVersion: 1, purchaseOrder: { orderNumber: "PO-SYNTHETIC-001", expectedDeliveryDate: "2026-08-12T12:00:00.000Z" },
  lines: [], controls: { redacted: true, externalActionsAreProposals: true },
}
const savedEvents = new Map<string, BusinessEvent>()

function fixture(existing: Record<string, unknown> | null = null) {
  const contentHash = hashBusinessPayload(payload)
  const token = { id: "token-1", organizationId: "org-1", envelopeId: "envelope-1", envelopeContentHash: contentHash,
    status: "ACTIVE", revokedAt: null, expiresAt: new Date("2026-09-01T00:00:00.000Z"), allowView: true, allowRespond: true, proposal: existing,
    envelope: { id: "envelope-1", purchaseOrderId: "po-1", contentHash, payload, sourceStateHash: "source-hash", preferredLocale: "EN", createdAt: NOW },
  }
  const tx = {
    businessEvent: { findMany: jest.fn(async ({ where }) => [...savedEvents.values()].filter(event => event.organizationId === where.organizationId && where.id.in.includes(event.id))) },
    supplierPoAccessToken: { findFirst: jest.fn().mockResolvedValue(token), update: jest.fn().mockResolvedValue(token) },
    supplierPoAccessLog: { create: jest.fn().mockResolvedValue({ id: "access-log" }) },
    supplierPoProposal: { findFirst: jest.fn().mockResolvedValue(existing), create: jest.fn(async ({ data }) => ({ id: "proposal-1", createdAt: NOW, ...data, lines: data.lines.create })) },
    supplierPoProposalState: { create: jest.fn(async ({ data }) => ({ id: "state-1", ...data })) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: "audit-1" }) },
  }
  const client = { $transaction: jest.fn(async callback => callback(tx)) }
  ;(verifySupplierPoAccessToken as jest.Mock).mockReturnValue({ ok: true, payload: { organizationId: "org-1", envelopeId: "envelope-1", purchaseOrderId: "po-1", envelopeContentHash: contentHash, jti: "synthetic-jti", permissions: ["view", "respond"] } })
  return { tx, token, client: client as never, transaction: client.$transaction }
}

async function recordedProposal() {
  const first = fixture()
  const result = await submitSupplierPoProposal(input, first.client)
  const saved = await first.tx.supplierPoProposal.create.mock.results[0].value
  const state = await first.tx.supplierPoProposalState.create.mock.results[0].value
  jest.clearAllMocks()
  return { result, ...fixture({ ...saved, states: [state] }) }
}

beforeEach(() => {
  jest.clearAllMocks()
  savedEvents.clear()
  ;(recordBusinessEventInTx as jest.Mock).mockImplementation(async (_tx, command) => {
    const event = { ...command, id: "event-1", actorId: command.actorId ?? null, payloadHash: hashBusinessPayload(command.payload), status: "RECORDED", processedAt: null }
    savedEvents.set(event.id, event)
    return { event }
  })
  ;(markBusinessEventAppliedInTx as jest.Mock).mockImplementation(async (_tx, _organizationId, eventId) => {
    const event = savedEvents.get(eventId)!
    event.status = "APPLIED"
    event.processedAt = NOW
    return event
  })
})

it("replays an identical supplier proposal after the requested date passes without duplicate business effects", async () => {
  const { client, tx, result, transaction } = await recordedProposal()
  await expect(submitSupplierPoProposal({ ...input, now: RETRY_AT }, client)).resolves.toEqual({ ...result, replayed: true })
  expect(verifySupplierPoAccessToken).toHaveBeenCalledWith({ token: "signed-token", envelopeId: "envelope-1", now: RETRY_AT })
  expect(tx.supplierPoAccessToken.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-1", envelopeId: "envelope-1" }) }))
  expect(transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
  expect(tx.supplierPoProposal.create).not.toHaveBeenCalled()
  expect(tx.supplierPoProposalState.create).not.toHaveBeenCalled()
  expect(tx.auditLog.create).not.toHaveBeenCalled()
  expect(recordBusinessEventInTx).not.toHaveBeenCalled()
  expect(markBusinessEventAppliedInTx).not.toHaveBeenCalled()
  expect(tx.supplierPoAccessLog.create).toHaveBeenCalledTimes(1)
})

it("rejects a changed proposal using the same key after the requested date passes", async () => {
  const { client, tx } = await recordedProposal()
  await expect(submitSupplierPoProposal({ ...input, note: "A different supplier explanation.", now: RETRY_AT }, client)).rejects.toThrow("already has a different response")
  expect(tx.supplierPoProposal.create).not.toHaveBeenCalled()
  expect(tx.supplierPoAccessLog.create).not.toHaveBeenCalled()
})

it.each(["2026-08-08T12:00:00.000Z", "2028-08-10T12:00:00.000Z"])("rejects a new proposal outside the current delivery-date window (%s)", async requestedDeliveryDate => {
  const { client, tx } = fixture()
  await expect(submitSupplierPoProposal({ ...input, requestedDeliveryDate }, client)).rejects.toThrow("within the next two years")
  expect(tx.supplierPoProposal.create).not.toHaveBeenCalled()
  expect(recordBusinessEventInTx).not.toHaveBeenCalled()
})

it.each(["revoked", "expired", "foreign envelope", "invalid signature"])("revalidates %s access before retrieving an existing proposal", async denial => {
  const { client, tx, token } = await recordedProposal()
  if (denial === "revoked") tx.supplierPoAccessToken.findFirst.mockResolvedValue({ ...token, status: "REVOKED", revokedAt: NOW })
  if (denial === "expired") tx.supplierPoAccessToken.findFirst.mockResolvedValue({ ...token, expiresAt: RETRY_AT })
  if (denial === "foreign envelope") tx.supplierPoAccessToken.findFirst.mockResolvedValue(null)
  if (denial === "invalid signature") (verifySupplierPoAccessToken as jest.Mock).mockReturnValue({ ok: false })
  await expect(submitSupplierPoProposal({ ...input, now: RETRY_AT }, client)).rejects.toThrow("Supplier purchase order not found")
  expect(tx.supplierPoProposal.findFirst).not.toHaveBeenCalled()
  expect(tx.supplierPoProposal.create).not.toHaveBeenCalled()
  expect(tx.supplierPoAccessLog.create).not.toHaveBeenCalled()
})
