import { AccountingPostingPurpose, AccountingSourceType, Prisma } from "@prisma/client"
import { createLedgerPostingBatch, type LedgerPostingBatchInput } from "../posting.service"

jest.mock("@/prisma/db", () => ({ db: {} }))

const input: LedgerPostingBatchInput = {
  organizationId: "org", sourceType: AccountingSourceType.PAYMENT_SUSPENSE,
  sourceId: "suspense", postingPurpose: AccountingPostingPurpose.SUSPENSE_RECLASSIFICATION,
  sourceVersion: 1, idempotencyKey: "request-key", periodId: "period",
}
const retained = { id: "batch", ...input, status: "POSTED", metadata: { retained: true } }

describe("posting batch identity", () => {
  const batch = { findFirst: jest.fn(), create: jest.fn() }
  const tx = { ledgerPostingBatch: batch } as unknown as Prisma.TransactionClient
  beforeEach(() => { jest.resetAllMocks(); batch.create.mockImplementation(async ({ data }) => ({ id: "new", ...data })) })

  it.each([
    { sourceId: "another-source" }, { organizationId: "another-tenant" },
    { sourceType: AccountingSourceType.MANUAL }, { postingPurpose: AccountingPostingPurpose.REVERSAL },
    { sourceVersion: 2 }, { periodId: "another-period" },
    { postingCycle: 2 },
  ])("refuses a retained key with conflicting financial identity: %p", async patch => {
    batch.findFirst.mockResolvedValue({ ...retained, ...patch })
    await expect(createLedgerPostingBatch(input, tx)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(batch.create).not.toHaveBeenCalled()
  })

  it("looks up the tenant key before the canonical source, so an OR result cannot conceal a conflicting key", async () => {
    batch.findFirst.mockResolvedValue({ ...retained, sourceId: "another-source" })
    await expect(createLedgerPostingBatch(input, tx)).rejects.toThrow()
    expect(batch.findFirst.mock.calls[0][0]).toEqual({ where: { organizationId: input.organizationId, idempotencyKey: input.idempotencyKey } })
    expect(batch.findFirst).toHaveBeenCalledTimes(1)
  })

  it("replays the exact retained batch without rewriting it", async () => {
    batch.findFirst.mockResolvedValue(retained)
    expect(await createLedgerPostingBatch(input, tx)).toBe(retained)
    expect(batch.create).not.toHaveBeenCalled()
  })

  it("keeps canonical source deduplication when a caller uses a different request key", async () => {
    batch.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(retained)
    expect(await createLedgerPostingBatch({ ...input, idempotencyKey: "retry-key" }, tx)).toBe(retained)
    expect(batch.findFirst.mock.calls[1][0]).toEqual({ where: { organizationId: input.organizationId, sourceType: input.sourceType, sourceId: input.sourceId, postingPurpose: input.postingPurpose, postingCycle: 1 } })
    expect(batch.create).not.toHaveBeenCalled()
  })

  it("does not present an old source version as a newly requested version", async () => {
    batch.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(retained)
    await expect(createLedgerPostingBatch({ ...input, sourceVersion: 2, idempotencyKey: "v2-key" }, tx)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    expect(batch.create).not.toHaveBeenCalled()
  })

  it.each([null, undefined, 1])("preserves historical version-one identity represented by %p", async version => {
    batch.findFirst.mockResolvedValue({ ...retained, sourceVersion: version })
    await expect(createLedgerPostingBatch(input, tx)).resolves.toMatchObject({ id: retained.id })
  })

  it("allows callers that omit a period to replay the period-bound source batch", async () => {
    batch.findFirst.mockResolvedValue(retained)
    await expect(createLedgerPostingBatch({ ...input, periodId: undefined }, tx)).resolves.toMatchObject({ id: retained.id })
  })

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid source version %p before database access", async sourceVersion => {
    await expect(createLedgerPostingBatch({ ...input, sourceVersion }, tx)).rejects.toThrow(/version/i)
    expect(batch.findFirst).not.toHaveBeenCalled()
    expect(batch.create).not.toHaveBeenCalled()
  })

  it("creates a first batch with the supplied identity only after both uniqueness checks", async () => {
    batch.findFirst.mockResolvedValue(null)
    await expect(createLedgerPostingBatch(input, tx)).resolves.toMatchObject({ id: "new", sourceId: input.sourceId, sourceVersion: 1 })
    expect(batch.findFirst).toHaveBeenCalledTimes(2)
    expect(batch.create).toHaveBeenCalledTimes(1)
  })
})
