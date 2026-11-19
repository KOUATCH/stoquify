import { db } from "@/prisma/db"
import { queueWhatsAppReceiptDeliveryInTx, whatsAppReceiptIdempotencyKey } from "@/services/communication/whatsapp-receipt-outbox.service"
import { hashWhatsAppDestination } from "@/services/communication/whatsapp-receipt.provider"
import { issuePublicReceiptAccessToken } from "../public-receipt-token-registry.service"
import { getPOSReceiptPrintPreview } from "../receipt.service"
import { getPOSWhatsAppReceiptCapability, getPOSWhatsAppReceiptStatus, getPOSWhatsAppReceiptStatusesForScopedSales, queuePOSWhatsAppReceipt } from "../whatsapp-receipt.service"

jest.mock("@/services/communication/whatsapp-receipt-outbox.service", () => ({
  ...jest.requireActual("@/services/communication/whatsapp-receipt-outbox.service"),
  queueWhatsAppReceiptDeliveryInTx: jest.fn(),
}))
jest.mock("../public-receipt-token-registry.service", () => ({ issuePublicReceiptAccessToken: jest.fn() }))
jest.mock("../receipt.service", () => ({ getPOSReceiptPrintPreview: jest.fn() }))

const scope = { organizationId: "fixture-org", userId: "fixture-cashier", salesOrderId: "fixture-sale", locationId: "fixture-location" }
const request = { ...scope, destination: "+1 (202) 555-0112", locale: "FR" as const, whatsAppCustomerOptInConfirmed: true as const }
const key = whatsAppReceiptIdempotencyKey(scope.salesOrderId, hashWhatsAppDestination("+12025550112"))
const scopedOutbox = { id: "fixture-outbox", idempotencyKey: key, status: "PENDING", lastErrorCode: null }
const tx = {
  $queryRaw: jest.fn().mockResolvedValue([{ id: scope.salesOrderId }]),
  pOSCommitResult: { findFirst: jest.fn() },
  businessEventOutbox: { findMany: jest.fn() },
  auditLog: { create: jest.fn() },
}
const mintToken = jest.mocked(issuePublicReceiptAccessToken)
const readReceipt = jest.mocked(getPOSReceiptPrintPreview)
const enqueue = jest.mocked(queueWhatsAppReceiptDeliveryInTx)

beforeEach(() => {
  jest.clearAllMocks()
  jest.replaceProperty(process, "env", {
    ...process.env,
    NEXT_PUBLIC_APP_URL: "https://fixture.example.invalid",
    AQSTOQFLOW_RECEIPT_TOKEN_SECRET: "fixture-receipt-signing-secret-example-only",
    STOQUIFY_WHATSAPP_RECEIPT_ORGANIZATION_ID: scope.organizationId,
    STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS: "1",
    WHATSAPP_PHONE_NUMBER_ID: "fixture-sender-id",
    WHATSAPP_ACCESS_TOKEN: "fixture-provider-secret",
  })
  Object.assign(db, tx)
  jest.mocked(db.$transaction).mockImplementation(async (handler: any) => handler(tx))
  tx.pOSCommitResult.findFirst.mockResolvedValue({ id: "fixture-commit" })
  tx.businessEventOutbox.findMany.mockReset().mockResolvedValue([])
  readReceipt.mockResolvedValue({ receipt: { id: scope.salesOrderId }, certification: { legalDeliveryBlocked: false } } as Awaited<ReturnType<typeof getPOSReceiptPrintPreview>>)
  mintToken.mockResolvedValue({ token: "fixture-bearer" } as Awaited<ReturnType<typeof issuePublicReceiptAccessToken>>)
})

afterEach(jest.restoreAllMocks)

it("enables the queue only for the configured tenant and a configured secure receipt link", () => {
  expect(getPOSWhatsAppReceiptCapability(scope.organizationId)).toEqual({ available: true })
  expect(getPOSWhatsAppReceiptCapability("different-org")).toEqual({ available: false })
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000"
  expect(getPOSWhatsAppReceiptCapability(scope.organizationId)).toEqual({ available: false })
  process.env.NEXT_PUBLIC_APP_URL = "https://fixture.example.invalid"
  process.env.AQSTOQFLOW_RECEIPT_TOKEN_SECRET = "short"
  expect(getPOSWhatsAppReceiptCapability(scope.organizationId)).toEqual({ available: false })
  process.env.STOQUIFY_WHATSAPP_RECEIPT_LIVE_SENDS = "0"
  expect(getPOSWhatsAppReceiptCapability(scope.organizationId)).toEqual({ available: false })
})

it("rejects an unconfigured tenant or missing consent before opening a transaction", async () => {
  await expect(queuePOSWhatsAppReceipt({ ...request, organizationId: "different-org" })).rejects.toThrow("unavailable")
  await expect(queuePOSWhatsAppReceipt({ ...request, whatsAppCustomerOptInConfirmed: false as true })).rejects.toThrow("consent")
  expect(db.$transaction).not.toHaveBeenCalled()
  expect(mintToken).not.toHaveBeenCalled()
})

it("requires a durable own sale in the active tenant location before creating a token or request", async () => {
  tx.pOSCommitResult.findFirst.mockResolvedValueOnce(null)
  await expect(queuePOSWhatsAppReceipt(request)).rejects.toThrow("Confirmed receipt is unavailable")
  expect(tx.pOSCommitResult.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
    organizationId: scope.organizationId,
    actorId: scope.userId,
    locationId: scope.locationId,
    salesOrderId: scope.salesOrderId,
    status: { in: ["COMMITTED", "COMPLETED"] },
    salesOrder: { is: expect.objectContaining({ status: "COMPLETED", channel: "POS" }) },
  }) }))
  expect(mintToken).not.toHaveBeenCalled()
  expect(enqueue).not.toHaveBeenCalled()
})

it("enqueues one consented receipt with its token and audit in the same transaction, returning only safe status", async () => {
  tx.businessEventOutbox.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([scopedOutbox])
  await expect(queuePOSWhatsAppReceipt(request)).resolves.toEqual({ reference: scopedOutbox.id, status: "QUEUED" })
  expect(readReceipt).toHaveBeenCalledWith({ organizationId: scope.organizationId, locationId: scope.locationId, locale: "FR", selection: { salesOrderId: scope.salesOrderId, actorId: scope.userId } }, tx)
  expect(mintToken).toHaveBeenCalledWith({ organizationId: scope.organizationId, salesOrderId: scope.salesOrderId, issuedById: scope.userId }, tx)
  expect(enqueue).toHaveBeenCalledWith(tx, expect.objectContaining({
    destination: "+12025550112",
    receipt: expect.objectContaining({ digitalReceiptUrl: "https://fixture.example.invalid/digital-receipt/fixture-sale?token=fixture-bearer" }),
  }))
  expect(tx.auditLog.create).toHaveBeenCalledWith({ data: {
    entityType: "SalesOrder", entityId: scope.salesOrderId, action: "POS_WHATSAPP_RECEIPT_CONSENT_CONFIRMED",
    organizationId: scope.organizationId, userId: scope.userId,
    changes: { locationId: scope.locationId, outboxId: scopedOutbox.id, customerOptInConfirmed: true },
  } })
})

it("reuses an accepted request after a lost queue response and rejects a different recipient", async () => {
  tx.businessEventOutbox.findMany.mockResolvedValue([{ ...scopedOutbox, status: "SENT" }])
  await expect(queuePOSWhatsAppReceipt(request)).resolves.toEqual({ reference: scopedOutbox.id, status: "ACCEPTED" })
  await expect(queuePOSWhatsAppReceipt({ ...request, destination: "+12025550113" })).rejects.toThrow("already exists")
  expect(mintToken).not.toHaveBeenCalled()
  expect(enqueue).not.toHaveBeenCalled()
  expect(tx.auditLog.create).not.toHaveBeenCalled()
})

it("honors a fiscal delivery block before issuing a public link", async () => {
  readReceipt.mockResolvedValueOnce({ certification: { legalDeliveryBlocked: true } } as Awaited<ReturnType<typeof getPOSReceiptPrintPreview>>)
  await expect(queuePOSWhatsAppReceipt(request)).rejects.toThrow("Fiscal review blocks delivery")
  expect(mintToken).not.toHaveBeenCalled()
  expect(enqueue).not.toHaveBeenCalled()
})

it.each([
  ["FAILED", "WHATSAPP_RETRYABLE_REJECTION", "RETRYING"],
  ["FAILED", "WHATSAPP_RECEIPT_FAILED", "UNCERTAIN"],
  ["DEAD_LETTER", "WHATSAPP_OUTCOME_UNCERTAIN", "UNCERTAIN"],
  ["DEAD_LETTER", "SAFE_PERMANENT_REJECTION", "FAILED"],
  ["DEFERRED", "WHATSAPP_PROVIDER_NOT_CONFIGURED", "UNAVAILABLE"],
])("presents %s with %s as %s without claiming delivery", async (status, lastErrorCode, expected) => {
  tx.businessEventOutbox.findMany.mockResolvedValueOnce([{ ...scopedOutbox, status, lastErrorCode }])
  await expect(getPOSWhatsAppReceiptStatus(scope)).resolves.toEqual({ reference: scopedOutbox.id, status: expected })
  expect(enqueue).not.toHaveBeenCalled()
})

it("refuses a receipt with ambiguous legacy requests instead of showing another recipient's status", async () => {
  tx.businessEventOutbox.findMany.mockResolvedValueOnce([scopedOutbox, { ...scopedOutbox, id: "second-outbox" }])
  await expect(getPOSWhatsAppReceiptStatus(scope)).rejects.toThrow("Multiple receipt delivery requests need review")
})

it("projects recent sales delivery states without exposing destination data or inferring delivery", async () => {
  const saleIds = ["accepted-sale", "retrying-sale", "legacy-sale", "unqueued-sale"]
  tx.businessEventOutbox.findMany.mockResolvedValueOnce([
    { id: "accepted-outbox", status: "SENT", lastErrorCode: null, businessEvent: { sourceId: "accepted-sale" } },
    { id: "retry-outbox", status: "FAILED", lastErrorCode: "WHATSAPP_RETRYABLE_REJECTION", businessEvent: { sourceId: "retrying-sale" } },
    { id: "legacy-outbox-a", status: "SENT", lastErrorCode: null, businessEvent: { sourceId: "legacy-sale" } },
    { id: "legacy-outbox-b", status: "PENDING", lastErrorCode: null, businessEvent: { sourceId: "legacy-sale" } },
  ])
  const statuses = await getPOSWhatsAppReceiptStatusesForScopedSales(db, scope.organizationId, saleIds)
  expect(statuses).toEqual(new Map([
    ["accepted-sale", "ACCEPTED"],
    ["retrying-sale", "RETRYING"],
    ["legacy-sale", "UNCERTAIN"],
  ]))
  expect(tx.businessEventOutbox.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({
      organizationId: scope.organizationId,
      businessEvent: { is: expect.objectContaining({
        organizationId: scope.organizationId, sourceType: "POS_SALE", sourceId: { in: saleIds },
      }) },
    }),
    select: { id: true, status: true, lastErrorCode: true, businessEvent: { select: { sourceId: true } } },
  }))
})
