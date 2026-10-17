jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { $transaction: jest.fn(), user: { findFirst: jest.fn() }, organization: { findFirst: jest.fn() }, accountantAccessGrant: { findMany: jest.fn() }, closeAssuranceFinding: { findMany: jest.fn() }, businessEventOutbox: { findMany: jest.fn() } } }))
jest.mock("../close-evidence-replacement.service", () => ({ getCloseEvidenceReplacementInTx: jest.fn() }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("../accountant-access.service", () => ({ resolveAccountantClientAccess: jest.fn() }))
jest.mock("../missing-close-evidence-accountant-review-queue.service", () => ({ getAccountantMissingCloseEvidenceReviewQueue: jest.fn() }))
jest.mock("../close-evidence-resolution-records", () => ({ closeHistoryVisibilities: ["CLIENT_ACTION_REQUIRED", "CLIENT_RESPONSE_SUBMITTED", "ACCOUNTANT_RESPONSE_ACCEPTED"], readResolvedCloseEvidence: jest.fn() }))
jest.mock("../close-evidence-recipient.service", () => ({ readCloseEvidenceRecipient: jest.fn() }))

import { db } from "@/prisma/db"
import { getCloseEvidenceReplacementInTx } from "../close-evidence-replacement.service"
import { BusinessRuleError, ForbiddenError } from "@/services/_shared/action-errors"
import { readResolvedCloseEvidence } from "../close-evidence-resolution-records"
import { readCloseEvidenceRecipient } from "../close-evidence-recipient.service"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import { resolveAccountantClientAccess } from "../accountant-access.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "../missing-close-evidence-accountant-review-queue.service"
import { getAccountantWorkDesk, getAccountantWorkDetail, getAccountantWorkClientPage } from "../accountant-work-desk.service"
import { closeEvidenceNextCursor } from "../close-evidence-pagination"

const actor = { homeOrganizationId: "firm", actorId: "reviewer", actorPermissions: ["accounting.audit.read", "accounting.close.accountant.review"] }
const mockGrant = db.accountantAccessGrant.findMany as jest.Mock
const mockUser = db.user.findFirst as jest.Mock
const pending = db.closeAssuranceFinding.findMany as jest.Mock
const notifications = db.businessEventOutbox.findMany as jest.Mock
const access = resolveAccountantClientAccess as jest.Mock
const moduleAccess = observeModuleAccess as jest.Mock
const queue = getAccountantMissingCloseEvidenceReviewQueue as jest.Mock
const item = {
  findingId: "finding",
  finding: { domain: "DATA_TRUST", severity: "HIGH", detail: "private finding", title: "private title" },
  period: { id: "period", name: "September" },
  request: { requestId: "request", correlationId: "original-key", requestedById: "reviewer", requestedFromId: "private employee", dueAt: "2026-09-26T00:00:00Z", requestText: "private request" },
  response: { responseId: "response", correlationId: "response-key", submittedAt: "2026-09-27T08:00:00Z", responseText: "private response" },
}
const grant = { id: "g1", organizationId: "client", organization: { name: "Client One" } }
const currentUser = { id: "reviewer", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null, organization: { isActive: true, deletedAt: null }, roles: [{ organizationId: "firm", permissions: actor.actorPermissions }] }

beforeEach(() => {
  jest.resetAllMocks(); jest.useFakeTimers().setSystemTime(new Date("2026-09-27T10:00:00Z"))
  ;(db.$transaction as jest.Mock).mockImplementation(work => work(db))
  ;(readResolvedCloseEvidence as jest.Mock).mockResolvedValue(null)
  ;(readCloseEvidenceRecipient as jest.Mock).mockImplementation(async (_tx, request) => ({ recipientId: request.metadata.requestedFromId, sequence: 0, changeCorrelationId: null }))
  ;(getCloseEvidenceReplacementInTx as jest.Mock).mockResolvedValue({ status: "UNAVAILABLE", reason: "NEW_ASSESSMENT_REQUIRED" })
  mockUser.mockResolvedValue(currentUser); mockGrant.mockResolvedValue([grant])
  ;(db.organization.findFirst as jest.Mock).mockResolvedValue({ name: "Client One" })
  pending.mockResolvedValue([]); notifications.mockResolvedValue([])
  access.mockResolvedValue({ organizationId: "client" }); moduleAccess.mockResolvedValue({ allowed: true })
  queue.mockResolvedValue({ generatedAt: "2026-09-27T10:00:00Z", summary: { invalidEvidence: 0, truncated: false }, items: [item] })
})

const pendingFinding = {
  id: "finding", periodId: "period", closeRunId: "run", ownerId: "private recipient", domain: "DATA_TRUST", severity: "HIGH", period: { name: "September" }, createdAt: new Date("2026-09-01T00:00:00Z"),
  comments: [{ id: "pending-request", organizationId: "client", periodId: "period", closeRunId: "run", findingId: "finding", authorId: "reviewer", visibility: "CLIENT_ACTION_REQUIRED", body: "private request text", correlationId: "request-key", metadata: { requestType: "MISSING_CLOSE_EVIDENCE", requestedById: "reviewer", requestedFromId: "private recipient", dueAt: "2026-09-26T00:00:00Z", correlationId: "request-key" } }],
}
it("keeps reassigned requests visible and uses the current assignment notification", async () => {
  pending.mockResolvedValue([{ ...pendingFinding, ownerId: "replacement" }])
  ;(readCloseEvidenceRecipient as jest.Mock).mockResolvedValue({ recipientId: "replacement", sequence: 1, changeCorrelationId: "replacement-corr" })
  notifications.mockResolvedValue([
    { eventName: "close.assurance.missing_evidence.requested", idempotencyKey: "close-assurance-finding:finding:missing-evidence-requested:request-key:notification", status: "SENT" },
    { eventName: "close.assurance.missing_evidence.requested", idempotencyKey: "close-evidence-recipient:pending-request:replacement-corr:notification", status: "FAILED" },
  ])
  const result = await getAccountantWorkDesk(actor)
  expect(result.incompleteClients).toBe(0)
  expect(result.items.find(row => row.requestId === "pending-request")).toMatchObject({ delivery: "FAILED", publication: null, evidenceState: "AWAITING_RESPONSE" })
  expect(JSON.stringify(result)).not.toContain("replacement-corr")
})
it("uses the approved retained evidence selection without deleting excluded records", async () => {
  pending.mockResolvedValue([{ ...pendingFinding, comments: [pendingFinding.comments[0], { ...pendingFinding.comments[0], id: "duplicate" }] }])
  ;(readResolvedCloseEvidence as jest.Mock).mockResolvedValue({ records: pendingFinding.comments, excludedIds: ["duplicate"] })
  const result = await getAccountantWorkDesk(actor)
  expect(result.incompleteClients).toBe(0); expect(result.items.some(row => row.requestId === "pending-request")).toBe(true)
  expect(readResolvedCloseEvidence).toHaveBeenCalledWith(db, "client", "finding")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
it.each([readResolvedCloseEvidence, readCloseEvidenceRecipient])("marks invalid retained history incomplete", async reader => {
  pending.mockResolvedValue([pendingFinding]); (reader as jest.Mock).mockRejectedValue(new BusinessRuleError("Needs investigation"))
  const result = await getAccountantWorkDesk(actor)
  expect(result.incompleteClients).toBe(1); expect(result.items.some(row => row.requestId === "pending-request")).toBe(false)
})
it("propagates history storage failure instead of hiding pending work", async () => {
  pending.mockResolvedValue([pendingFinding]); (readResolvedCloseEvidence as jest.Mock).mockRejectedValue(new Error("offline"))
  await expect(getAccountantWorkDesk(actor)).rejects.toThrow("offline")
})
it.each(["PENDING", "FAILED", "SENT"])("keeps durable publication separate from outbox %s", async status => {
  const publishedAt = new Date("2026-09-27T09:00:00Z")
  notifications.mockResolvedValue([{ eventName: "close.assurance.missing_evidence.response_submitted", idempotencyKey: "close-assurance-missing-evidence-request:request:response-submitted:response-key:notification", status, payloadHash: "hash",
    closeEvidenceNotification: { organizationId: "client", periodId: "period", findingId: "finding", requestId: "request", responseId: "response", eventName: "close.assurance.missing_evidence.response_submitted", payloadHash: "hash", publishedAt } }])
  expect((await getAccountantWorkDesk(actor)).items[0]).toMatchObject({ delivery: status, publication: { publishedAt: publishedAt.toISOString() } })
})
it.each(["organizationId", "periodId", "findingId", "requestId", "responseId", "eventName", "payloadHash"])("refuses a publication with mismatched %s", async field => {
  const record = { organizationId: "client", periodId: "period", findingId: "finding", requestId: "request", responseId: "response", eventName: "close.assurance.missing_evidence.response_submitted", payloadHash: "hash", publishedAt: new Date() }
  notifications.mockResolvedValue([{ eventName: record.eventName, idempotencyKey: "close-assurance-missing-evidence-request:request:response-submitted:response-key:notification", status: "SENT", payloadHash: "hash", closeEvidenceNotification: { ...record, [field]: "wrong" } }])
  const result = await getAccountantWorkDesk(actor)
  expect(result.items[0].publication).toBeNull(); expect(result.incompleteClients).toBe(1)
})
it("does not turn a historical SENT status into publication evidence", async () => {
  notifications.mockResolvedValue([{ eventName: "close.assurance.missing_evidence.response_submitted", idempotencyKey: "close-assurance-missing-evidence-request:request:response-submitted:response-key:notification", status: "SENT" }])
  expect((await getAccountantWorkDesk(actor)).items[0].publication).toBeNull()
})
it("includes redacted unanswered work and exact request notification status", async () => {
  pending.mockResolvedValue([pendingFinding])
  notifications.mockResolvedValue([{ eventName: "close.assurance.missing_evidence.requested", idempotencyKey: "close-assurance-finding:finding:missing-evidence-requested:request-key:notification", status: "FAILED" }])
  const result = await getAccountantWorkDesk(actor)
  expect(result.items.find(row => row.requestId === "pending-request")).toMatchObject({ submittedAt: null, evidenceState: "AWAITING_RESPONSE", delivery: "FAILED", owner: "CLIENT_RECIPIENT", nextAction: "AWAIT_RESPONSE" })
  expect(JSON.stringify(result)).not.toContain("private")
  expect(notifications).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "client", channel: "NOTIFICATION", OR: expect.arrayContaining([{ eventName: "close.assurance.missing_evidence.requested", idempotencyKey: { in: ["close-assurance-finding:finding:missing-evidence-requested:request-key:notification"] } }]) }) }))
})

it.each(["PENDING", "FAILED", "DEAD_LETTER", "SENT"])("projects the response's own %s status independently of the sent request", async status => {
  notifications.mockResolvedValue([
    { eventName: "close.assurance.missing_evidence.requested", idempotencyKey: "close-assurance-finding:finding:missing-evidence-requested:original-key:notification", status: "SENT" },
    { eventName: "close.assurance.missing_evidence.response_submitted", idempotencyKey: "close-assurance-missing-evidence-request:request:response-submitted:response-key:notification", status },
  ])
  expect((await getAccountantWorkDesk(actor)).items[0]).toMatchObject({ evidenceState: "RESPONSE_SUBMITTED", delivery: status })
  expect(notifications).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "client", channel: "NOTIFICATION", OR: [
    { eventName: "close.assurance.missing_evidence.requested", idempotencyKey: { in: [] } },
    { eventName: "close.assurance.missing_evidence.response_submitted", idempotencyKey: { in: ["close-assurance-missing-evidence-request:request:response-submitted:response-key:notification"] } },
  ] } }))
})

it.each(["missing", "wrong correlation", "wrong event"])("keeps %s response notification evidence unknown instead of borrowing request success", async variant => {
  const rows = [{ eventName: "close.assurance.missing_evidence.requested", idempotencyKey: "close-assurance-finding:finding:missing-evidence-requested:original-key:notification", status: "SENT" }]
  if (variant !== "missing") rows.push({ eventName: variant === "wrong event" ? "close.assurance.missing_evidence.requested" : "close.assurance.missing_evidence.response_submitted", idempotencyKey: `close-assurance-missing-evidence-request:request:response-submitted:${variant === "wrong correlation" ? "old-response-key" : "response-key"}:notification`, status: "SENT" })
  notifications.mockResolvedValue(rows)
  expect((await getAccountantWorkDesk(actor)).items[0].delivery).toBe("UNKNOWN")
})

it("propagates notification read failure instead of returning an unknown successful read", async () => {
  notifications.mockRejectedValue(new Error("notification storage unavailable"))
  await expect(getAccountantWorkDesk(actor)).rejects.toThrow("notification storage unavailable")
})
it.each(["duplicate", "response exists", "wrong period", "wrong owner", "bad date"])("withholds inconsistent pending evidence: %s", async variant => {
  const finding = JSON.parse(JSON.stringify(pendingFinding))
  if (variant === "duplicate") finding.comments.push(finding.comments[0])
  if (variant === "response exists") finding.comments.push({ ...finding.comments[0], visibility: "CLIENT_RESPONSE_SUBMITTED" })
  if (variant === "wrong period") finding.comments[0].periodId = "another-period"
  if (variant === "wrong owner") finding.ownerId = "another-owner"
  if (variant === "bad date") finding.comments[0].metadata.dueAt = "invalid"
  pending.mockResolvedValue([finding])
  const result = await getAccountantWorkDesk(actor)
  expect(result.incompleteClients).toBe(1)
  expect(result.items.some(row => row.requestId === "pending-request")).toBe(false)
})
it("returns bounded pending work with continuation instead of hiding 101 findings", async () => {
  pending.mockResolvedValue(Array.from({ length: 101 }, (_, index) => ({ ...pendingFinding, id: `finding-${index}`, comments: [{ ...pendingFinding.comments[0], findingId: `finding-${index}`, id: `pending-${index}` }] })))
  const result = await getAccountantWorkDesk(actor)
  expect(result.incompleteClients).toBe(0)
  expect(result.items.filter(row => row.evidenceState === "AWAITING_RESPONSE")).toHaveLength(100)
  expect(result.clientContinuations[0].requests).toBeTruthy()
})
afterEach(() => jest.useRealTimers())

it("projects task metadata without evidence bodies or employee identifiers", async () => {
  const result = await getAccountantWorkDesk(actor)
  expect(result.items[0]).toMatchObject({ urgency: "OVERDUE", owner: "ACCOUNTANT_REVIEW_TEAM", requestedByYou: true, nextAction: "REVIEW_RESPONSE" })
  expect(JSON.stringify(result)).not.toContain("private")
  expect(access).toHaveBeenCalledTimes(2)
  expect(moduleAccess).toHaveBeenCalledWith(expect.objectContaining({ organizationId: "client", moduleSlug: "close_assurance", mode: "enforce" }))
})
it("rejects missing permissions before querying tenant records", async () => {
  await expect(getAccountantWorkDesk({ ...actor, actorPermissions: [] })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(mockGrant).not.toHaveBeenCalled()
})
it("rejects an inactive home actor", async () => {
  mockUser.mockResolvedValue(null)
  await expect(getAccountantWorkDesk(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(queue).not.toHaveBeenCalled()
})
it.each(["expired", "revoked", "wrong tenant"])("withholds %s client information", async () => {
  access.mockRejectedValue(new ForbiddenError())
  const result = await getAccountantWorkDesk(actor)
  expect(result).toMatchObject({ unavailableClients: 1, items: [], clientsRead: 0 })
  expect(JSON.stringify(result)).not.toContain("Client One")
  expect(queue).not.toHaveBeenCalled()
})
it("drops a result if permission is revoked during the queue read", async () => {
  access.mockResolvedValueOnce({ organizationId: "client" }).mockRejectedValueOnce(new ForbiddenError())
  expect(await getAccountantWorkDesk(actor)).toMatchObject({ items: [], unavailableClients: 1 })
})
it("fails closed on target entitlement denial", async () => {
  moduleAccess.mockImplementation(input => ({ allowed: input.organizationId === "firm" }))
  expect(await getAccountantWorkDesk(actor)).toMatchObject({ items: [], unavailableClients: 1 })
  expect(queue).not.toHaveBeenCalled()
})
it("refuses the entire desk when the home accounting module is unavailable", async () => {
  moduleAccess.mockResolvedValue({ allowed: false })
  await expect(getAccountantWorkDesk(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(mockGrant).not.toHaveBeenCalled()
})
it("marks malformed or truncated evidence as incomplete rather than successful empty", async () => {
  queue.mockResolvedValue({ summary: { invalidEvidence: 1, truncated: true }, items: [] })
  expect(await getAccountantWorkDesk(actor)).toMatchObject({ incompleteClients: 1, items: [] })
})
it("propagates database failures instead of claiming an empty portfolio", async () => {
  queue.mockRejectedValue(new Error("offline"))
  await expect(getAccountantWorkDesk(actor)).rejects.toThrow("offline")
})
it("paginates grants and limits per-request fanout", async () => {
  mockGrant.mockResolvedValue(Array.from({ length: 11 }, (_, i) => ({ ...grant, id: `g${i}` })))
  const result = await getAccountantWorkDesk(actor, "before")
  expect(result.nextCursor).toBe("g9"); expect(queue).toHaveBeenCalledTimes(10)
  expect(mockGrant).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ accountantUserId: "reviewer", id: { gt: "before" }, expiresAt: { gt: new Date() }, role: { in: ["REVIEWER", "PREPARER"] } }), take: 11 }))
})
it("sorts by original request deadline and deterministic identity", async () => {
  queue.mockResolvedValue({ summary: { invalidEvidence: 0, truncated: false }, items: [
    { ...item, request: { ...item.request, requestId: "later", dueAt: "2026-10-10T00:00:00Z" } },
    { ...item, request: { ...item.request, requestId: "soon", dueAt: "2026-09-28T00:00:00Z" } }, item,
  ] })
  expect((await getAccountantWorkDesk(actor)).items.map(x => x.urgency)).toEqual(["OVERDUE", "DUE_SOON", "SCHEDULED"])
})
it("reauthorizes detail and will not return a different request", async () => {
  await expect(getAccountantWorkDetail(actor, "client", "other")).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect((await getAccountantWorkDetail(actor, "client", "request")).item).toBe(item)
  expect(queue).toHaveBeenLastCalledWith(expect.objectContaining({ clientOrganizationId: "client", requestId: "request" }))
})

it("continues one client queue without another client-list fanout", async () => {
  const cursor = closeEvidenceNextCursor({ organizationId: "client", actorId: "reviewer", periodId: "", kind: "requests" }, { id: "last", createdAt: new Date("2026-09-01T00:00:00Z") })!
  pending.mockResolvedValue([pendingFinding])
  const result = await getAccountantWorkClientPage(actor, { clientOrganizationId: "client", kind: "requests", cursor })
  expect(result.items).toHaveLength(1); expect(result.clientContinuations[0].requests).toBeNull()
  expect(pending).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: "client", OR: expect.any(Array) }) }))
  expect(mockGrant).not.toHaveBeenCalled(); expect(queue).not.toHaveBeenCalled()
})

it("continues reviews across periods and rechecks delegated access after collection", async () => {
  queue.mockResolvedValue({ items: [item], nextCursor: "next", summary: { invalidEvidence: 0, truncated: false } })
  const result = await getAccountantWorkClientPage(actor, { clientOrganizationId: "client", kind: "reviews", cursor: "position" })
  expect(result.clientContinuations[0].reviews).toBe("next")
  expect(queue).toHaveBeenCalledWith(expect.objectContaining({ clientOrganizationId: "client", page: { cursor: "position" } }))
  expect(pending).not.toHaveBeenCalled()
  access.mockResolvedValueOnce({ organizationId: "client" }).mockResolvedValueOnce({ organizationId: "client" }).mockRejectedValueOnce(new ForbiddenError())
  await expect(getAccountantWorkClientPage(actor, { clientOrganizationId: "client", kind: "reviews", cursor: "position" })).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("refuses client continuation before exposing names when the mandate is unavailable", async () => {
  access.mockRejectedValue(new ForbiddenError())
  await expect(getAccountantWorkClientPage(actor, { clientOrganizationId: "foreign", kind: "reviews", cursor: "position" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(db.organization.findFirst).not.toHaveBeenCalled(); expect(queue).not.toHaveBeenCalled()
})

it("rejects stale caller permissions when home roles were revoked during a read", async () => {
  mockUser.mockResolvedValueOnce(currentUser).mockResolvedValueOnce(currentUser).mockResolvedValue({ ...currentUser, roles: [] })
  await expect(getAccountantWorkDesk(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
})

it("withholds previously collected metadata if home authority expires before aggregate return", async () => {
  mockUser.mockResolvedValueOnce(currentUser).mockResolvedValueOnce(currentUser).mockResolvedValueOnce(currentUser).mockResolvedValue({ ...currentUser, roles: [] })
  await expect(getAccountantWorkDesk(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(queue).toHaveBeenCalledTimes(1)
})

it("does not accept a role from another tenant", async () => {
  mockUser.mockResolvedValue({ ...currentUser, roles: [{ organizationId: "foreign", permissions: actor.actorPermissions }] })
  await expect(getAccountantWorkDesk(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
})
it("returns a source-bound preview without its private binding and rechecks authorization", async () => {
  ;(getCloseEvidenceReplacementInTx as jest.Mock).mockResolvedValue({ status: "AVAILABLE", reason: "VERIFIED_COLLECTION", binding: { private: "source ids" }, selection: { checklistItemId: "receipt", bindingHash: "sha256:hash" }, checklistKey: "ledger-reconciliation", domain: "LEDGER", observedAt: "2026-09-27T10:00:00Z", recoveredEvidenceCount: 1 })
  const result = await getAccountantWorkDetail(actor, "client", "request")
  expect(result.replacement).toMatchObject({ status: "AVAILABLE", recoveredEvidenceCount: 1 })
  expect(result.replacement).not.toHaveProperty("binding")
  expect(getCloseEvidenceReplacementInTx).toHaveBeenCalledWith(db, "client", "finding")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
  moduleAccess.mockResolvedValueOnce({ allowed: true }).mockResolvedValueOnce({ allowed: false })
  await expect(getAccountantWorkDetail(actor, "client", "request")).rejects.toMatchObject({ code: "FORBIDDEN" })
})
