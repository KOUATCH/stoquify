/** @jest-environment node */
import { createHash, randomUUID } from "node:crypto"
import { db } from "@/prisma/db"
import { sendWhatsAppReceipt } from "@/services/communication/whatsapp-receipt.provider"
import { runWhatsAppReceiptWorker } from "@/services/communication/whatsapp-receipt-worker.service"
import { revokePublicReceiptAccessToken } from "@/services/pos/public-receipt-token-registry.service"
import type { ReceiptDeliveryProviderInput } from "@/services/pos/receipt.service"
import { getPOSWhatsAppReceiptStatus, getPOSWhatsAppReceiptStatusesForScopedSales, queuePOSWhatsAppReceipt } from "@/services/pos/whatsapp-receipt.service"

const { assertTestEnvironment } = require("../../scripts/s04-s05-target.cjs")
const fixtureEnvironment = {
  STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS: "true",
  WHATSAPP_PHONE_NUMBER_ID: "synthetic-only",
  WHATSAPP_ACCESS_TOKEN: "synthetic-only",
  WHATSAPP_RECEIPT_TEMPLATE_NAME: "synthetic_receipt",
}

async function receiptFixture() {
  assertTestEnvironment()
  const organizationId = `whatsapp-fixture-${randomUUID()}`
  const userId = randomUUID()
  await db.organization.create({ data: { id: organizationId, slug: organizationId, name: "Synthetic receipt retry test", currency: "XAF" } })
  await db.user.create({ data: { id: userId, organizationId, email: `${userId}@receipt-test.invalid`, firstName: "Synthetic", lastName: "Cashier", mfaBackupCodes: [] } })
  const { id: locationId } = await db.location.create({ data: { organizationId, name: "Synthetic store", code: "FIXTURE", type: "STORE" } })
  const { id: customerId } = await db.customer.create({ data: { organizationId, name: "Synthetic customer", code: "FIXTURE" } })
  const { id: terminalId } = await db.pOSStation.create({ data: { organizationId, locationId, terminalNumber: "FIXTURE-TERMINAL", name: "Synthetic till" } })
  const { id: sessionId } = await db.pOSSession.create({ data: {
    organizationId, locationId, terminalId, userId, sessionNumber: "FIXTURE-SESSION", status: "ACTIVE", openingBalance: 0, expectedBalance: 0,
  } })
  // Seed an already-completed source directly. No checkout or payment workflow is invoked.
  const { id: salesOrderId } = await db.salesOrder.create({ data: {
    organizationId, locationId, customerId, terminalId, sessionId, createdById: userId, orderNumber: "FIXTURE-001",
    channel: "POS", status: "COMPLETED", paymentStatus: "PAID", subtotal: 1000, total: 1000,
  } })
  const resultEnvelope = { synthetic: true, salesOrderId }
  await db.pOSCommitResult.create({ data: {
    organizationId, locationId, terminalId, sessionId, salesOrderId, actorId: userId,
    clientCommitId: `pos:${randomUUID()}`, requestHash: "a".repeat(64), status: "COMMITTED", resultEnvelope,
    resultHash: createHash("sha256").update(JSON.stringify(resultEnvelope)).digest("hex"), committedAt: new Date(),
  } })
  const environment = {
    ...fixtureEnvironment,
    STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID: organizationId,
    AQSTOQFLOW_RECEIPT_TOKEN_SECRET: "synthetic-pos-receipt-signing-material",
    NEXT_PUBLIC_APP_URL: "https://receipt-test.invalid",
  }
  jest.replaceProperty(process, "env", { ...process.env, ...environment })
  const scope = { organizationId, userId, salesOrderId, locationId }
  const queue = (destination = "+12025550101") => queuePOSWhatsAppReceipt({
    ...scope, destination, locale: "EN", whatsAppCustomerOptInConfirmed: true,
  })
  const state = () => db.businessEventOutbox.findFirstOrThrow({ where: { organizationId } })
  const status = () => getPOSWhatsAppReceiptStatus(scope)
  const activityStatus = async (tenantId = organizationId) => {
    const statuses = await getPOSWhatsAppReceiptStatusesForScopedSales(db, tenantId, [salesOrderId])
    return statuses.get(salesOrderId)
  }
  const tokens = () => db.publicReceiptAccessToken.count({ where: { organizationId, salesOrderId } })
  const revoke = async () => {
    const { id: tokenId } = await db.publicReceiptAccessToken.findFirstOrThrow({ where: { organizationId, salesOrderId } })
    await revokePublicReceiptAccessToken({ organizationId, tokenId, revokedById: userId, reason: "Synthetic delivery test" })
  }
  const sentEvents = () => db.businessEvent.count({ where: { organizationId, eventType: "POS_RECEIPT_WHATSAPP_DELIVERY_SENT" } })
  const run = (workerId: string, time: Date, fetcher: NonNullable<NonNullable<Parameters<typeof sendWhatsAppReceipt>[1]>["fetcher"]>) => runWhatsAppReceiptWorker({
    organizationId,
    workerId,
    now: time,
    environment,
    dependencies: {
      sendWhatsAppReceipt: (input: ReceiptDeliveryProviderInput) => sendWhatsAppReceipt(input, { environment, fetcher }),
    },
  })
  return { organizationId, queue, state, status, activityStatus, tokens, revoke, sentEvents, run }
}

beforeEach(() => {
  jest.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network disabled for synthetic WhatsApp provider test"))
})

afterEach(() => {
  try { expect(globalThis.fetch).not.toHaveBeenCalled() }
  finally { jest.restoreAllMocks() }
})

afterAll(async () => { await db.$disconnect() })

it("retries a provider rejection once despite concurrent workers and retained duplicate requests", async () => {
  const fixture = await receiptFixture()
  const [initial, duplicate] = await Promise.all([fixture.queue(), fixture.queue()])
  expect(duplicate).toEqual(initial)
  expect(initial.status).toBe("QUEUED")
  await expect(fixture.activityStatus()).resolves.toBe("QUEUED")
  await expect(fixture.activityStatus("different-fixture-tenant")).resolves.toBeUndefined()
  await expect(fixture.queue("+12025550102")).rejects.toThrow("already exists")
  expect(await db.businessEventOutbox.count({ where: { organizationId: fixture.organizationId } })).toBe(1)
  expect(await fixture.tokens()).toBe(1)

  const firstAt = (await fixture.state()).availableAt
  const fetcher = jest.fn()
    .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: { code: 130429 } }) })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ messages: [{ id: "synthetic-accepted-1" }] }) })

  await fixture.run("initial-worker", firstAt, fetcher)
  const rejected = await fixture.state()
  expect(rejected).toMatchObject({ status: "FAILED", attempts: 1 })
  expect(await fixture.status()).toEqual({ reference: initial.reference, status: "RETRYING" })
  await expect(fixture.activityStatus()).resolves.toBe("RETRYING")
  expect(rejected.availableAt.getTime()).toBeGreaterThan(firstAt.getTime())
  expect(await fixture.sentEvents()).toBe(0)
  await expect(fixture.run("early-worker", firstAt, fetcher)).resolves.toEqual([])

  const retried = await Promise.all([
    fixture.run("retry-worker-a", rejected.availableAt, fetcher),
    fixture.run("retry-worker-b", rejected.availableAt, fetcher),
  ])
  expect(retried.flat()).toEqual([expect.objectContaining({ requestId: initial.reference, status: "SENT" })])
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[0][1].body)
  expect(await fixture.state()).toMatchObject({ status: "SENT", attempts: 2 })
  expect(await fixture.sentEvents()).toBe(1)

  expect(await fixture.queue()).toEqual({ reference: initial.reference, status: "ACCEPTED" })
  await expect(fixture.activityStatus()).resolves.toBe("ACCEPTED")
  expect(await fixture.tokens()).toBe(1)
  await expect(fixture.run("after-success-worker", new Date(rejected.availableAt.getTime() + 86400000), fetcher)).resolves.toEqual([])
  expect(fetcher).toHaveBeenCalledTimes(2)
  expect(await fixture.sentEvents()).toBe(1)
})

it("preserves an ambiguous outcome without submitting the same message again", async () => {
  const fixture = await receiptFixture()
  const initial = await fixture.queue()
  const firstAt = (await fixture.state()).availableAt
  const fetcher = jest.fn().mockRejectedValueOnce(new Error("Synthetic response lost after simulated acceptance"))

  await fixture.run("initial-worker", firstAt, fetcher)
  expect(await fixture.state()).toMatchObject({ status: "DEAD_LETTER", lastErrorCode: "WHATSAPP_OUTCOME_UNCERTAIN", attempts: 1 })
  expect(await fixture.queue()).toEqual({ reference: initial.reference, status: "UNCERTAIN" })
  await expect(fixture.activityStatus()).resolves.toBe("UNCERTAIN")
  await expect(fixture.run("after-ambiguity-worker", new Date(firstAt.getTime() + 86400000), fetcher)).resolves.toEqual([])
  expect(fetcher).toHaveBeenCalledTimes(1)
  expect(await fixture.sentEvents()).toBe(0)
})

it("fences a worker whose lease expires while the simulated provider is accepting a send", async () => {
  const fixture = await receiptFixture()
  await fixture.queue()
  const firstAt = (await fixture.state()).availableAt
  let providerStarted!: () => void
  let releaseProvider!: () => void
  const started = new Promise<void>(resolve => { providerStarted = resolve })
  const unblock = new Promise<void>(resolve => { releaseProvider = resolve })
  const fetcher = jest.fn(async () => {
    providerStarted()
    await unblock
    return { ok: true, status: 200, json: async () => ({ messages: [{ id: "synthetic-late-acceptance" }] }) }
  })

  const original = fixture.run("slow-worker", firstAt, fetcher)
  try {
    await Promise.race([started, original.then(() => { throw new Error("Expected the original provider call to start") })])
    const afterLeaseExpiry = new Date(firstAt.getTime() + 10 * 60 * 1000)
    await expect(fixture.run("late-worker", afterLeaseExpiry, fetcher)).resolves.toEqual([])
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(await fixture.state()).toMatchObject({ status: "DEAD_LETTER", lastErrorCode: "WHATSAPP_OUTCOME_UNCERTAIN", attempts: 1 })
  } finally {
    releaseProvider()
    await original
  }
  expect(await fixture.state()).toMatchObject({ status: "DEAD_LETTER", lastErrorCode: "WHATSAPP_OUTCOME_UNCERTAIN" })
  expect(await fixture.sentEvents()).toBe(0)
})

it("stops a queued receipt whose access token was revoked before dispatch", async () => {
  const fixture = await receiptFixture()
  const initial = await fixture.queue()
  const availableAt = (await fixture.state()).availableAt
  await fixture.revoke()
  const fetcher = jest.fn()

  await fixture.run("revocation-worker", availableAt, fetcher)
  expect(fetcher).not.toHaveBeenCalled()
  expect(await fixture.status()).toEqual({ reference: initial.reference, status: "FAILED" })
  expect(await fixture.sentEvents()).toBe(0)
})
