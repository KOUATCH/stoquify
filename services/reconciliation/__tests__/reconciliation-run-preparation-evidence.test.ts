import { assertCurrentRunPreparationInTx, preparationHash, preparedRunHash } from "../reconciliation-run-preparation-evidence"

function fixture() {
  const at = new Date("2026-09-27T12:00:00Z"), sourceHash = "a".repeat(64)
  const run = { id: "run", organizationId: "org", metadata: { additionalSourcesReceiptId: "second", preparationReceiptId: "prepared" } }
  const receipt = (id: string, actorId: string, previous?: string) => {
    const payload = { kind: "RECONCILIATION_ADDITIONAL_SOURCES_V1", organizationId: "org", runId: "run", actorId,
      incorporatedAt: at.toISOString(), reason: "Review additional sources", requestHash: "sha256:" + "d".repeat(64), reviewedRevision: "sha256:" + "e".repeat(64),
      beforeRun: { metadata: previous ? { additionalSourcesReceiptId: previous } : {} } }
    return { id, payloadSummary: payload, payloadHash: preparationHash(payload).slice(7), processedAt: at, idempotencyKey: "reconciliation-additional-sources:" + id }
  }
  const prepared = { kind: "RECONCILIATION_RUN_PREPARED_V1", organizationId: "org", runId: "run", preparedById: "preparer",
    preparedAt: at.toISOString(), reason: "Independent source review", requestHash: "sha256:" + "b".repeat(64), reviewedRevision: "sha256:" + "c".repeat(64),
    afterRunHash: preparedRunHash(run), sourceHash, beforeRun: {} }
  const records: Record<string, any> = { first: receipt("first", "first-operator"), second: receipt("second", "second-operator", "first"),
    prepared: { id: "prepared", payloadSummary: prepared, payloadHash: preparationHash(prepared).slice(7), processedAt: at, idempotencyKey: "reconciliation-run-preparation:prepared" } }
  const tx = { paymentReconciliationInboxItem: { findFirst: jest.fn(async ({ where }) => records[where.id] ?? null) }, ledgerAuditEvent: { findFirst: jest.fn(async () => ({ id: "audit" })) } }
  return { tx, run, sourceHash, records }
}

it.each(["first-operator", "second-operator", "preparer"])("refuses self-signing by retained participant %s", async signer => {
  const { tx, run, sourceHash } = fixture()
  await expect(assertCurrentRunPreparationInTx(tx as never, run, sourceHash, signer)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("accepts an independent signer only with the current preparation and every retained recovery receipt", async () => {
  const { tx, run, sourceHash } = fixture()
  await expect(assertCurrentRunPreparationInTx(tx as never, run, sourceHash, "independent")).resolves.toBeUndefined()
  expect(tx.paymentReconciliationInboxItem.findFirst.mock.calls.map(([args]) => args.where.id)).toEqual(["second", "first", "prepared"])
  expect(tx.ledgerAuditEvent.findFirst).toHaveBeenCalledTimes(3)
})

it.each(["missing", "tampered", "foreign", "cycle", "audit"])("refuses %s additional-source history", async problem => {
  const { tx, run, sourceHash, records } = fixture()
  if (problem === "missing") delete records.first
  if (problem === "tampered") records.first.payloadHash = "0".repeat(64)
  if (problem === "foreign") { records.first.payloadSummary.organizationId = "foreign"; records.first.payloadHash = preparationHash(records.first.payloadSummary).slice(7) }
  if (problem === "cycle") { records.first.payloadSummary.beforeRun.metadata.additionalSourcesReceiptId = "second"; records.first.payloadHash = preparationHash(records.first.payloadSummary).slice(7) }
  if (problem === "audit") tx.ledgerAuditEvent.findFirst.mockResolvedValue(null as never)
  await expect(assertCurrentRunPreparationInTx(tx as never, run, sourceHash, "independent")).rejects.toMatchObject({ code: "CONFLICT" })
})

it("requires preparation after incorporating sources into an originally unprepared run", async () => {
  const { tx, run, sourceHash } = fixture()
  await expect(assertCurrentRunPreparationInTx(tx as never, { ...run, metadata: { additionalSourcesReceiptId: "second" } }, sourceHash, "independent")).rejects.toMatchObject({ code: "CONFLICT" })
})
