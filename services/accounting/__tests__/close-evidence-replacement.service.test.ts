jest.mock("server-only", () => ({}))

import { CloseChecklistStatus, CloseEvidenceType, CloseFindingDomain, CloseFindingSeverity, CloseFindingStatus, CloseRunStatus, type Prisma } from "@prisma/client"
import { buildCloseEvidenceCollectionReceipt } from "../close-evidence-collection"
import { closeEvidenceReplacementSelection, getCloseEvidenceReplacementInTx, getVerifiedCloseEvidenceReplacementsInTx, parseCloseEvidenceReplacementBinding } from "../close-evidence-replacement.service"

const first = new Date("2026-10-01T10:00:00Z"), next = new Date("2026-10-01T11:00:00Z"), acceptedAt = new Date("2026-10-01T12:00:00Z")
const period = { id: "period", organizationId: "org" }
const sourceService = "services/accounting/reconciliations.service.ts"
function closeRun(id: string, createdAt: Date) {
  return { id, organizationId: "org", periodId: period.id, period: { ...period }, createdAt, completedAt: new Date(createdAt.getTime() + 1), status: CloseRunStatus.BLOCKED, voidedAt: null as Date | null, metadata: null as Prisma.JsonValue }
}
function evidence(id: string, closeRunId: string, available: boolean) {
  return { id, organizationId: "org", periodId: period.id, closeRunId, checklistItemId: `${closeRunId}-checklist`, findingId: available ? null : "finding",
    evidenceType: CloseEvidenceType.REPORT_EXPORT, sourceTable: "journal_entry_lines", sourceType: available ? "TrialBalanceCurrency" : "LedgerReconciliation",
    sourceId: available ? "XAF" : period.id, sourceLabel: "private source label", sourceDate: next, sourceHash: null, provenance: available ? "POSTED" : "UNAVAILABLE",
    available, unavailableReason: available ? null : "private source failure", metadata: null as Prisma.JsonValue, correlationId: "source-correlation", createdAt: next, updatedAt: next }
}
function checklist(id: string, createdAt: Date, available: boolean) {
  return { id: `${id}-checklist`, organizationId: "org", periodId: period.id, closeRunId: id, period: { ...period }, closeRun: closeRun(id, createdAt), key: "ledger-reconciliation",
    domain: CloseFindingDomain.LEDGER, sourceService, status: available ? CloseChecklistStatus.PASSED : CloseChecklistStatus.UNAVAILABLE,
    severity: CloseFindingSeverity.HIGH, label: "Ledger", detail: "retained collection detail", evidenceCount: Number(available), blockerReason: available ? null : "missing",
    createdAt, updatedAt: createdAt, metadata: null as Prisma.JsonValue, evidenceItems: [evidence(`${id}-evidence`, id, available)] }
}
function fixture() {
  const previous = checklist("old", first, false), replacement = checklist("new", next, true)
  replacement.metadata = { collectionReceipt: buildCloseEvidenceCollectionReceipt(replacement, replacement.evidenceItems, true) }
  const original = { id: "finding", organizationId: "org", periodId: period.id, closeRunId: "old", period: { ...period }, closeRun: previous.closeRun, checklistItemId: previous.id,
    checklistItem: previous, domain: CloseFindingDomain.LEDGER, severity: CloseFindingSeverity.HIGH, title: "missing source", detail: "private finding detail", sourceService,
    sourceType: "LedgerReconciliation", sourceId: period.id, createdAt: first, status: CloseFindingStatus.IN_REVIEW, ownerId: "respondent", resolvedById: null as string | null,
    resolvedAt: null as Date | null, correlationId: "finding-correlation" }
  const request = { id: "request", organizationId: "org", periodId: period.id, closeRunId: "old", findingId: "finding", authorId: "requester", correlationId: "request-correlation",
    visibility: "CLIENT_ACTION_REQUIRED", body: "private request text", createdAt: first, metadata: { requestType: "MISSING_CLOSE_EVIDENCE", requestedById: "requester", requestedFromId: "respondent", dueAt: next.toISOString(), correlationId: "request-correlation" } as Prisma.JsonValue }
  const response = { ...request, id: "response", authorId: "respondent", visibility: "CLIENT_RESPONSE_SUBMITTED", correlationId: "response-correlation", createdAt: next,
    metadata: { responseType: "MISSING_CLOSE_EVIDENCE_RESPONSE", requestId: request.id, requestCorrelationId: request.correlationId, requestedById: "requester", requestedFromId: "respondent", respondedById: "respondent", correlationId: "response-correlation" } as Prisma.JsonValue }
  const acceptance = { ...request, id: "acceptance", authorId: "reviewer", visibility: "ACCOUNTANT_RESPONSE_ACCEPTED", correlationId: "acceptance-correlation", createdAt: acceptedAt,
    metadata: { acceptanceType: "MISSING_CLOSE_EVIDENCE_RESPONSE_ACCEPTANCE", requestId: request.id, responseId: response.id, requestCorrelationId: request.correlationId,
      responseCorrelationId: response.correlationId, findingId: original.id, periodId: period.id, closeRunId: "old", respondedById: "respondent", acceptedById: "reviewer",
      decision: "ACCEPTED", findingStatus: "RESOLVED", resolvedAt: acceptedAt.toISOString(), correlationId: "acceptance-correlation" } as Prisma.JsonValue }
  const mock = {
    $queryRaw: jest.fn().mockImplementation(async (query: { text: string }) => query.text.includes("FOR NO KEY UPDATE") ? [{ id: "new" }] : []),
    closeRun: { findMany: jest.fn().mockResolvedValue([replacement.closeRun, previous.closeRun]) },
    closeAssuranceFinding: { findFirst: jest.fn().mockResolvedValue(original) },
    closeChecklistItem: { findFirst: jest.fn().mockResolvedValue(replacement) },
    accountantComment: { findMany: jest.fn().mockResolvedValue([acceptance]), findFirst: jest.fn().mockImplementation(async ({ where }: { where: { id: string } }) => where.id === "request" ? request : where.id === "response" ? response : null) },
  }
  return { original, previous, replacement, request, response, acceptance, mock, tx: mock as unknown as Prisma.TransactionClient }
}
type Fixture = ReturnType<typeof fixture>
const metadata = (value: { metadata: Prisma.JsonValue }) => value.metadata as Prisma.JsonObject
async function acceptedFixture() {
  const f = fixture(), preview = await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")
  if (preview.status !== "AVAILABLE") throw new Error("fixture receipt unavailable")
  metadata(f.acceptance).replacementBinding = preview.binding
  f.original.status = CloseFindingStatus.RESOLVED
  f.original.resolvedById = "reviewer"
  f.original.resolvedAt = acceptedAt
  f.original.correlationId = f.acceptance.correlationId
  return { ...f, binding: preview.binding }
}

it("binds a later real collector while preserving unavailable evidence and requiring no whole-run READY", async () => {
  const f = fixture(), before = JSON.stringify(f.original)
  const result = await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")
  expect(result).toMatchObject({ status: "AVAILABLE", reason: "VERIFIED_COLLECTION", checklistKey: "ledger-reconciliation", controlStatus: "PASSED", recoveredEvidenceCount: 1,
    selection: { checklistItemId: "new-checklist", bindingHash: expect.stringMatching(/^sha256:[a-f0-9]{64}$/) }, binding: { originalEvidence: [{ id: "old-evidence", hash: expect.stringMatching(/^[a-f0-9]{64}$/) }] } })
  expect(JSON.stringify(f.original)).toBe(before)
  expect(f.mock.closeChecklistItem.findFirst.mock.calls[0][0].include.evidenceItems).toEqual({ orderBy: { id: "asc" } })
})

it("binds every unavailable row of the checklist even when the finding relation is incomplete", async () => {
  const f = fixture()
  f.previous.evidenceItems.push({ ...evidence("second-unavailable", "old", false), findingId: null })
  const result = await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")
  expect(result).toMatchObject({ status: "AVAILABLE", recoveredEvidenceCount: 2 })
})

it("supports an honest persisted empty collection receipt without a fabricated domain hash", async () => {
  const f = fixture()
  f.replacement.evidenceItems = []
  f.replacement.evidenceCount = 0
  f.replacement.status = CloseChecklistStatus.WARNING
  f.replacement.metadata = { collectionReceipt: buildCloseEvidenceCollectionReceipt(f.replacement, [], true) }
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toMatchObject({ status: "AVAILABLE", controlStatus: "WARNING" })
})

it("exposes a collected FAILED control without presenting recovery as control clearance", async () => {
  const f = fixture()
  f.replacement.status = CloseChecklistStatus.FAILED
  f.replacement.blockerReason = "Ledger business failure remains"
  f.replacement.metadata = { collectionReceipt: buildCloseEvidenceCollectionReceipt(f.replacement, f.replacement.evidenceItems, true) }
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toMatchObject({ status: "AVAILABLE", controlStatus: "FAILED" })
})

it.each<[string, (f: Fixture) => void, string]>([
  ["tenant", f => { f.previous.period.organizationId = "foreign" }, "ORIGINAL_SCOPE_INVALID"],
  ["evidence tenant", f => { f.previous.evidenceItems[0].organizationId = "foreign" }, "ORIGINAL_SCOPE_INVALID"],
  ["domain", f => { f.replacement.domain = CloseFindingDomain.DATA_TRUST }, "COLLECTION_UNVERIFIED"],
  ["source service", f => { f.replacement.sourceService = "untrusted" }, "COLLECTION_UNVERIFIED"],
  ["replacement period", f => { f.replacement.periodId = "foreign" }, "COLLECTOR_NOT_FOUND"],
  ["missing receipt", f => { f.replacement.metadata = null }, "COLLECTION_UNVERIFIED"],
  ["changed row", f => { f.replacement.evidenceItems[0].sourceLabel = "changed" }, "COLLECTION_UNVERIFIED"],
  ["unavailable collector", f => { f.replacement.evidenceItems[0].available = false }, "COLLECTION_UNVERIFIED"],
  ["running", f => { f.replacement.closeRun.status = CloseRunStatus.RUNNING }, "ASSESSMENT_INCOMPLETE"],
  ["unfinished", f => { f.replacement.closeRun.completedAt = null as unknown as Date }, "ASSESSMENT_INCOMPLETE"],
  ["void", f => { f.replacement.closeRun.voidedAt = next }, "ASSESSMENT_VOIDED"],
  ["stale", f => { f.replacement.closeRun.metadata = { staleState: { status: "EVIDENCE_STALE" } } }, "ASSESSMENT_STALE"],
])("rejects %s without inferring proof from an available row", async (_case, mutate, reason) => {
  const f = fixture(); mutate(f)
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toEqual({ status: "UNAVAILABLE", reason })
})

it("rejects tied latest timestamps and does not search backward for good evidence", async () => {
  const f = fixture()
  f.mock.closeRun.findMany.mockResolvedValue([f.replacement.closeRun, { ...f.previous.closeRun, createdAt: next }])
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toEqual({ status: "UNAVAILABLE", reason: "CURRENT_ASSESSMENT_AMBIGUOUS" })
  expect(f.mock.closeChecklistItem.findFirst).not.toHaveBeenCalled()
})

it("requires an actual original missing condition and a strictly later assessment", async () => {
  const f = fixture()
  f.mock.closeRun.findMany.mockResolvedValue([f.previous.closeRun])
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toMatchObject({ status: "UNAVAILABLE", reason: "NEW_ASSESSMENT_REQUIRED" })
  f.mock.closeRun.findMany.mockResolvedValue([f.replacement.closeRun, f.previous.closeRun])
  f.previous.status = CloseChecklistStatus.PASSED
  f.previous.evidenceCount = 1
  f.previous.evidenceItems[0].available = true
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toMatchObject({ status: "UNAVAILABLE", reason: "ORIGINAL_NOT_MISSING" })
})

it("does not resolve a period preflight business finding using a different collector's recovered observation", async () => {
  const f = fixture()
  f.original.sourceService = "services/accounting/periods.service.ts"
  f.original.sourceType = "TrialBalance"
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding")).toMatchObject({ status: "UNAVAILABLE", reason: "ORIGINAL_SCOPE_INVALID" })
})

it("takes period then pack-compatible row lock and rereads authoritative evidence", async () => {
  const f = fixture()
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding", { lock: true })).toMatchObject({ status: "AVAILABLE" })
  expect(f.mock.$queryRaw.mock.calls.map(call => call[0].text)).toEqual([expect.stringContaining("pg_advisory_xact_lock"), expect.stringContaining("FOR NO KEY UPDATE")])
  expect(f.mock.closeAssuranceFinding.findFirst).toHaveBeenCalledTimes(2)
  expect(f.mock.closeRun.findMany).toHaveBeenCalledTimes(2)
})

it("rejects an original scope changed across lock acquisition", async () => {
  const f = fixture()
  f.mock.closeAssuranceFinding.findFirst.mockResolvedValueOnce(f.original).mockResolvedValueOnce({ ...f.original, periodId: "changed" })
  expect(await getCloseEvidenceReplacementInTx(f.tx, "org", "finding", { lock: true })).toMatchObject({ status: "UNAVAILABLE", reason: "ORIGINAL_SCOPE_INVALID" })
})

it("retains only verified resolution bindings while preserving old proof rows", async () => {
  const f = await acceptedFixture(), before = JSON.stringify(f.previous)
  const result = await getVerifiedCloseEvidenceReplacementsInTx(f.tx, "org")
  expect(result.evidenceIds).toEqual(["old-evidence"])
  expect(result.sourceBindings).toEqual([expect.objectContaining({ acceptanceId: "acceptance", replacementChecklistId: "new-checklist", replacementReceiptHash: f.binding.replacementReceiptHash })])
  expect(JSON.stringify(result)).not.toContain("private")
  expect(JSON.stringify(f.previous)).toBe(before)
})

it("preserves point-in-time recovery after newer assessments and ordinary source invalidation", async () => {
  const f = await acceptedFixture()
  f.replacement.closeRun.metadata = { staleState: { status: "EVIDENCE_STALE" } }
  f.mock.closeRun.findMany.mockRejectedValue(new Error("reader must not depend on latest assessment"))
  expect((await getVerifiedCloseEvidenceReplacementsInTx(f.tx, "org")).evidenceIds).toEqual(["old-evidence"])
})

it.each<[string, (f: Awaited<ReturnType<typeof acceptedFixture>>) => void]>([
  ["legacy text-only acceptance", f => { delete metadata(f.acceptance).replacementBinding }],
  ["unresolved finding", f => { f.original.status = CloseFindingStatus.REOPENED }],
  ["different resolver", f => { f.original.resolvedById = "other" }],
  ["different resolution time", f => { f.original.resolvedAt = next }],
  ["source mutation", f => { f.previous.evidenceItems[0].sourceId = "changed" }],
  ["replacement mutation", f => { f.replacement.evidenceItems[0].sourceLabel = "changed" }],
  ["replacement void", f => { f.replacement.closeRun.voidedAt = acceptedAt }],
  ["request context mismatch", f => { f.request.periodId = "other" }],
  ["wrong request type", f => { metadata(f.request).requestType = "OTHER" }],
  ["response context mismatch", f => { f.response.organizationId = "foreign" }],
  ["response author mismatch", f => { f.response.authorId = "other" }],
  ["response correlation mismatch", f => { metadata(f.response).requestCorrelationId = "other" }],
  ["self approval", f => { f.acceptance.authorId = "respondent"; metadata(f.acceptance).acceptedById = "respondent"; f.original.resolvedById = "respondent" }],
  ["binding hash swapped", f => { f.binding.replacementReceiptHash = "a".repeat(64) }],
  ["binding evidence omitted", f => { f.binding.originalEvidence = [] }],
  ["unbound extra unavailable row", f => { f.previous.evidenceItems.push(evidence("extra-old-proof", "old", false)) }],
  ["future replacement completion", f => { f.replacement.closeRun.completedAt = new Date(acceptedAt.getTime() + 1) }],
  ["wrong binding version", f => { (metadata(f.acceptance).replacementBinding as Prisma.JsonObject).version = 2 }],
])("retains obligations for %s", async (_case, mutate) => {
  const f = await acceptedFixture(); mutate(f)
  expect(await getVerifiedCloseEvidenceReplacementsInTx(f.tx, "org")).toEqual({ evidenceIds: [], sourceBindings: [] })
})

it("changes binding revision when an original source or replacement identity changes", async () => {
  const f = await acceptedFixture(), before = closeEvidenceReplacementSelection(f.binding)
  expect(parseCloseEvidenceReplacementBinding(f.binding)).toEqual(f.binding)
  expect(closeEvidenceReplacementSelection({ ...f.binding, replacementChecklistId: "other" }).bindingHash).not.toBe(before.bindingHash)
  expect(parseCloseEvidenceReplacementBinding({ ...f.binding, originalEvidence: [f.binding.originalEvidence[0], f.binding.originalEvidence[0]] })).toBeNull()
})

it.each(["preview", "reader"])("propagates %s database failures", async kind => {
  const f = fixture(), error = new Error("database unavailable")
  if (kind === "preview") f.mock.closeAssuranceFinding.findFirst.mockRejectedValue(error)
  else f.mock.accountantComment.findMany.mockRejectedValue(error)
  await expect(kind === "preview" ? getCloseEvidenceReplacementInTx(f.tx, "org", "finding") : getVerifiedCloseEvidenceReplacementsInTx(f.tx, "org")).rejects.toBe(error)
})
