jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: {
  user: { findFirst: jest.fn() }, providerAccount: { findFirst: jest.fn() },
  paymentReconciliationInboxItem: { findFirst: jest.fn(), create: jest.fn() },
  reconciliationRun: { findFirst: jest.fn() }, statementFile: { findFirst: jest.fn() },
} }))
jest.mock("../statement-import.service", () => ({ importProviderStatement: jest.fn() }))
jest.mock("@/services/reconciliation/payment-reconciliation-run.service", () => ({ runPaymentReconciliation: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
import { db } from "@/prisma/db"
import { importProviderStatement } from "../statement-import.service"
import { runPaymentReconciliation } from "@/services/reconciliation/payment-reconciliation-run.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { importProviderStatementForReview, ingestAndSignProviderStatement } from "../provider-operations.service"
import { MobileMoneyHmacAdapter, sha256 } from "../adapters/mobile-money-hmac.adapter"

const mockDb = db as unknown as {
  user: { findFirst: jest.Mock }; providerAccount: { findFirst: jest.Mock };
  paymentReconciliationInboxItem: { findFirst: jest.Mock; create: jest.Mock };
  reconciliationRun: { findFirst: jest.Mock }; statementFile: { findFirst: jest.Mock };
}
const importer = importProviderStatement as jest.Mock, runner = runPaymentReconciliation as jest.Mock, access = observeModuleAccess as jest.Mock
const command = { providerAccountId: "provider", businessDate: new Date("2026-09-13T10:00:00Z"), rawContent: "[]", fileName: "statement.json", idempotencyKey: "7c8e63ba-d89f-4d3b-a67a-60e819a6d754", adapter: new MobileMoneyHmacAdapter("mtn-momo") }
const control = { organizationId: "org", actorId: "operator", actorPermissions: ["payments.reconciliation.read", "payments.reconciliation.import", "payments.reconciliation.run"] }
let receipt: Record<string, unknown> | null, run: Record<string, unknown> | null
beforeEach(() => {
  jest.resetAllMocks(); receipt = null; run = null
  mockDb.user.findFirst.mockResolvedValue({ id: "operator" }); mockDb.providerAccount.findFirst.mockResolvedValue({ id: "provider" })
  mockDb.paymentReconciliationInboxItem.findFirst.mockImplementation(async () => receipt)
  mockDb.paymentReconciliationInboxItem.create.mockImplementation(async ({ data }) => (receipt = data))
  mockDb.reconciliationRun.findFirst.mockImplementation(async () => run)
  mockDb.statementFile.findFirst.mockResolvedValue({ id: "file" })
  access.mockImplementation(async args => ({ ...args, allowed: true, result: "allow", wouldBlock: false }))
  importer.mockResolvedValue({ status: "IMPORTED", statementFileId: "file", fileHash: sha256(command.rawContent) })
  runner.mockImplementation(async () => { run = { id: "run", status: "READY_FOR_SIGNOFF", businessDate: new Date("2026-09-13T00:00:00Z"), signedAt: null }; return { runId: "run" } })
})

it("retires automatic signing before any side effect", async () => {
  await expect(ingestAndSignProviderStatement({})).rejects.toThrow(/retired/)
  expect(importer).not.toHaveBeenCalled(); expect(runner).not.toHaveBeenCalled(); expect(mockDb.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
it("binds an unsigned review handoff and reuses the committed run on exact retry", async () => {
  const result = await importProviderStatementForReview(command, control)
  expect(result).toMatchObject({ stage: "REVIEW_REQUIRED", runId: "run", currentStatus: "READY_FOR_SIGNOFF", signingPerformed: false, reviewPath: "/dashboard/finance/reconciliation?reviewRun=run" })
  expect(receipt).toMatchObject({ status: "PROCESSED", payloadSummary: { actorId: "operator", fileHash: sha256("[]") } })
  expect(receipt?.payloadSummary).not.toHaveProperty("rawContent")
  expect(runner).toHaveBeenCalledWith(expect.objectContaining({ providerOperationId: result.intentId, correlationId: result.intentId, runById: "operator" }))
  expect(await importProviderStatementForReview(command, control)).toEqual(result)
  expect(importer).toHaveBeenCalledTimes(1); expect(runner).toHaveBeenCalledTimes(1)
})
it("retains imported evidence through a failed run and retries the same intent", async () => {
  runner.mockRejectedValueOnce(new Error("private infrastructure details"))
  const partial = await importProviderStatementForReview(command, control)
  expect(partial).toMatchObject({ stage: "IMPORTED_RECONCILIATION_UNCONFIRMED", statementFileId: "file", reason: "OUTCOME_UNCONFIRMED", retrySameRequest: true, signingPerformed: false })
  expect(JSON.stringify(partial)).not.toContain("private infrastructure")
  expect(await importProviderStatementForReview(command, control)).toMatchObject({ stage: "REVIEW_REQUIRED", intentId: partial.intentId })
  expect(mockDb.paymentReconciliationInboxItem.create).toHaveBeenCalledTimes(1)
})
it("recovers a committed run after its response was lost", async () => {
  runner.mockImplementationOnce(async () => { run = { id: "run", status: "NEEDS_REVIEW", businessDate: new Date("2026-09-13T00:00:00Z"), signedAt: null }; throw new Error("lost response") })
  expect(await importProviderStatementForReview(command, control)).toMatchObject({ stage: "REVIEW_REQUIRED", currentStatus: "NEEDS_REVIEW", signingPerformed: false })
})
it("reports unconfirmed import and retained duplicate evidence without running", async () => {
  importer.mockRejectedValueOnce(new Error("connection"))
  expect(await importProviderStatementForReview(command, control)).toMatchObject({ stage: "IMPORT_UNCONFIRMED", signingPerformed: false })
  importer.mockResolvedValueOnce({ status: "DUPLICATE_LINE", exceptionId: "duplicate" })
  expect(await importProviderStatementForReview(command, control)).toMatchObject({ stage: "IMPORT_BLOCKED", exceptionId: "duplicate", signingPerformed: false })
  expect(runner).not.toHaveBeenCalled()
})
it("rejects reuse of a request by another actor or with different contents", async () => {
  await importProviderStatementForReview(command, control)
  await expect(importProviderStatementForReview({ ...command, rawContent: "[{}]" }, control)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  await expect(importProviderStatementForReview(command, { ...control, actorId: "other" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  expect(importer).toHaveBeenCalledTimes(1)
})
it("requires permission, active membership and current module eligibility before intent creation", async () => {
  await expect(importProviderStatementForReview(command, { ...control, actorPermissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  mockDb.user.findFirst.mockResolvedValueOnce(null)
  await expect(importProviderStatementForReview(command, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  access.mockResolvedValueOnce({ allowed: false })
  await expect(importProviderStatementForReview(command, control)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(mockDb.paymentReconciliationInboxItem.create).not.toHaveBeenCalled()
})
