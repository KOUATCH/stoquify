jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db", () => ({ db: { user: { findFirst: jest.fn(), findMany: jest.fn() }, accountingPeriod: { findFirst: jest.fn() }, closeRun: { findMany: jest.fn() }, closeAssuranceFinding: { findMany: jest.fn() }, $transaction: jest.fn() } }))
jest.mock("@/services/modules/module-entitlement.service", () => ({ getManagedModuleState: jest.fn().mockResolvedValue({ explicitEntitlements: [] }), evaluateModuleEntitlement: jest.fn().mockReturnValue({ allowed: true }) }))
jest.mock("../missing-close-evidence-request-queue.service", () => ({ getClientMissingCloseEvidenceRequestQueue: jest.fn() }))
jest.mock("../missing-close-evidence-accountant-review-queue.service", () => ({ getAccountantMissingCloseEvidenceReviewQueue: jest.fn() }))
jest.mock("../close-evidence-replacement.service", () => ({ getCloseEvidenceReplacementInTx: jest.fn() }))
jest.mock("../close-evidence-request-tracking", () => ({ readCloseEvidenceRequestTrackingInTx: jest.fn() }))
jest.mock("../close-evidence-investigation", () => ({ readCloseEvidenceInvestigationInTx: jest.fn() }))
import { db } from "@/prisma/db"
import { evaluateModuleEntitlement } from "@/services/modules/module-entitlement.service"
import { getClientMissingCloseEvidenceRequestQueue } from "../missing-close-evidence-request-queue.service"
import { getAccountantMissingCloseEvidenceReviewQueue } from "../missing-close-evidence-accountant-review-queue.service"
import { getCloseEvidenceReplacementInTx } from "../close-evidence-replacement.service"
import { assertCloseEvidenceActor, getCloseEvidenceWorkflow, getCloseEvidenceReview, getCloseEvidenceInvestigation } from "../close-evidence-workflow.service"
import { readCloseEvidenceInvestigationInTx } from "../close-evidence-investigation"
import { closeEvidenceNextCursor } from "../close-evidence-pagination"
import { readCloseEvidenceRequestTrackingInTx } from "../close-evidence-request-tracking"
const actor = { organizationId: "org", actorId: "actor" }
const supervisorPermissions = ["accounting.close.read", "accounting.close.evidence.request", "accounting.close.finding.assign"]

test("supervision is tenant scoped and remains readable without write eligibility", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(supervisorPermissions))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  const result = await getCloseEvidenceWorkflow(actor, "period")
  expect(result).toMatchObject({ canSupervise: true, canReplace: false, writable: false })
  expect(readCloseEvidenceRequestTrackingInTx).toHaveBeenCalledWith({}, actor, "period", undefined, true)
})

test.each(["accounting.close.evidence.request", "accounting.close.finding.assign"])("supervision requires %s and refuses explicit pages before reading", async permission => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(supervisorPermissions.filter(value => value !== permission)))
  expect(await getCloseEvidenceWorkflow(actor, "period")).toMatchObject({ canSupervise: false, supervision: [] })
  expect((readCloseEvidenceRequestTrackingInTx as jest.Mock).mock.calls.some(call => call[4] === true)).toBe(false)
  await expect(getCloseEvidenceWorkflow(actor, "period", { kind: "supervision", cursor: "untrusted" })).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test.each(["accounting.close.evidence.request", "accounting.close.finding.assign"])("withholds supervision after %s is revoked during collection", async permission => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(user(supervisorPermissions)).mockResolvedValueOnce(user(supervisorPermissions.filter(value => value !== permission)))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test("supervision continuation collects only that scope and propagates incomplete evidence", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(supervisorPermissions))
  const cursor = closeEvidenceNextCursor({ ...actor, periodId: "period", kind: "supervision" }, { id: "last", createdAt: new Date() })!
  ;(readCloseEvidenceRequestTrackingInTx as jest.Mock).mockResolvedValue({ items: [], nextCursor: "next", evidenceIssue: true })
  expect(await getCloseEvidenceWorkflow(actor, "period", { kind: "supervision", cursor })).toMatchObject({ cursors: { supervision: "next" }, partial: true, evidenceIssue: true })
  expect(readCloseEvidenceRequestTrackingInTx).toHaveBeenCalledTimes(1)
  expect(readCloseEvidenceRequestTrackingInTx).toHaveBeenCalledWith({}, actor, "period", cursor, true)
  expect(getClientMissingCloseEvidenceRequestQueue).not.toHaveBeenCalled()
  expect(getAccountantMissingCloseEvidenceReviewQueue).not.toHaveBeenCalled()
})

test("investigation requires current reviewer access and withholds data after revocation", async () => {
  await expect(getCloseEvidenceInvestigation(actor, "period", "request")).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(readCloseEvidenceInvestigationInTx).not.toHaveBeenCalled()
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(user(["accounting.close.read", "accounting.close.accountant.review"])).mockResolvedValueOnce(user(["accounting.close.read"]))
  ;(readCloseEvidenceInvestigationInTx as jest.Mock).mockResolvedValue({ revision: "private" })
  await expect(getCloseEvidenceInvestigation(actor, "period", "request")).rejects.toMatchObject({ code: "FORBIDDEN" })
})

test("reviewers can inspect retained evidence in a read-only module", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.accountant.review"]))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  ;(readCloseEvidenceInvestigationInTx as jest.Mock).mockResolvedValue({ revision: "retained" })
  expect(await getCloseEvidenceInvestigation(actor, "period", "request")).toEqual({ revision: "retained" })
  expect(readCloseEvidenceInvestigationInTx).toHaveBeenCalledWith({}, "org", "period", "request", "actor")
  expect(db.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: "RepeatableRead" })
})
const user = (permissions: string[]) => ({ id: "actor", organizationId: "org", isActive: true, isVerified: true, emailVerified: true, isLocked: false, lockedUntil: null,
  organization: { isActive: true, deletedAt: null, requestedModules: [] }, roles: [{ organizationId: "org", permissions }] })
beforeEach(() => {
  jest.clearAllMocks()
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read"]))
  ;(db.user.findMany as jest.Mock).mockResolvedValue([])
  ;(db.accountingPeriod.findFirst as jest.Mock).mockResolvedValue({ id: "period" })
  ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValue([])
  ;(db.closeRun.findMany as jest.Mock).mockResolvedValue([])
  ;(evaluateModuleEntitlement as jest.Mock).mockReturnValue({ allowed: true })
  ;(getClientMissingCloseEvidenceRequestQueue as jest.Mock).mockResolvedValue({ requests: [], blockers: [], summary: { truncated: false } })
  ;(getAccountantMissingCloseEvidenceReviewQueue as jest.Mock).mockResolvedValue({ items: [], blockers: [], summary: { truncated: false } })
  ;(db.$transaction as jest.Mock).mockImplementation(work => work({}))
  ;(readCloseEvidenceRequestTrackingInTx as jest.Mock).mockResolvedValue({ items: [], nextCursor: null, evidenceIssue: false })
})
test("uses current tenant roles and refuses roles from another tenant", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue({ ...user([]), roles: [{ organizationId: "other", permissions: ["accounting.close.read"] }] })
  await expect(assertCloseEvidenceActor(actor)).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(db.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "actor", organizationId: "org" } }))
})
test("denies missing users and module access without returning work", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(null)
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toMatchObject({ code: "FORBIDDEN" })
  ;(evaluateModuleEntitlement as jest.Mock).mockReturnValue({ allowed: false })
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toMatchObject({ code: "FORBIDDEN" })
  expect(getClientMissingCloseEvidenceRequestQueue).not.toHaveBeenCalled()
})
test("rejects foreign periods before retrieving queues", async () => {
  ;(db.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(null)
  await expect(getCloseEvidenceWorkflow(actor, "foreign")).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(db.accountingPeriod.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "foreign", organizationId: "org" } }))
})
test("read-only actors get assigned work but no colleague directory, findings or reviewer response bodies", async () => {
  const result = await getCloseEvidenceWorkflow(actor, "period")
  expect(result).toMatchObject({ canRequest: false, canRespond: false, canReview: false, recipients: [], findings: [], reviews: [] })
  expect(db.user.findMany).not.toHaveBeenCalled()
  expect(getAccountantMissingCloseEvidenceReviewQueue).not.toHaveBeenCalled()
})
test("retains historical period scope, marks bounded reads partial, and filters ineligible recipients", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request"]))
  ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ id: String(i), createdAt: new Date("2026-10-03T00:00:00Z") })))
  ;(db.user.findMany as jest.Mock).mockResolvedValue([{ ...user(["accounting.close.read", "accounting.close.finding.comment"]), name: "Owner" }, { ...user([]), name: "No permission" }])
  const result = await getCloseEvidenceWorkflow(actor, "period")
  expect(result.findings).toHaveLength(100); expect(result.partial).toBe(true); expect(result.recipients).toEqual([{ id: "actor", name: "Owner" }])
  const query = (db.closeAssuranceFinding.findMany as jest.Mock).mock.calls[0][0]
  expect(query.where).toMatchObject({ organizationId: "org", periodId: "period" }); expect(query.where.closeRunId).toBeUndefined()
})
test("source read failure propagates instead of returning a successful empty list", async () => {
  ;(getClientMissingCloseEvidenceRequestQueue as jest.Mock).mockRejectedValue(new Error("database unavailable"))
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toThrow("database unavailable")
})
test("does not return a privileged read after that permission is revoked during collection", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(user(["accounting.close.read", "accounting.close.evidence.request"])).mockResolvedValueOnce(user(["accounting.close.read"]))
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toMatchObject({ code: "FORBIDDEN" })
})
test("read-only modules suppress request and response controls despite role permissions", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request", "accounting.close.finding.comment"]))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  expect(await getCloseEvidenceWorkflow(actor, "period")).toMatchObject({ canRequest: false, canRespond: false, findings: [], recipients: [] })
})
test("redacts internal replacement binding and refuses self-acceptance in the preview", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.accountant.review"]))
  ;(getAccountantMissingCloseEvidenceReviewQueue as jest.Mock).mockResolvedValue({ items: [{ request: { requestId: "request" }, response: { respondedById: "actor" }, findingId: "finding", closeRunId: "run", period: { id: "period" } }] })
  ;(getCloseEvidenceReplacementInTx as jest.Mock).mockResolvedValue({ status: "AVAILABLE", selection: { checklistItemId: "item", bindingHash: "hash" }, binding: { private: true }, checklistKey: "data-trust", controlStatus: "PASSED", observedAt: "time", recoveredEvidenceCount: 1 })
  const result = await getCloseEvidenceReview(actor, "request")
  expect(result.canAccept).toBe(false); expect(result.replacement).not.toHaveProperty("binding")
  expect(getAccountantMissingCloseEvidenceReviewQueue).toHaveBeenCalledWith(expect.objectContaining({ requestId: "request" }))
  await expect(getCloseEvidenceReview(actor, "foreign")).rejects.toMatchObject({ code: "NOT_FOUND" })
})

test("filters both queues by period before limits and exposes their continuation", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.accountant.review"]))
  ;(getClientMissingCloseEvidenceRequestQueue as jest.Mock).mockResolvedValue({ requests: [], blockers: [], nextCursor: "assigned-next", summary: { truncated: true } })
  ;(getAccountantMissingCloseEvidenceReviewQueue as jest.Mock).mockResolvedValue({ items: [], blockers: [], nextCursor: "review-next", summary: { truncated: true } })
  expect(await getCloseEvidenceWorkflow(actor, "period")).toMatchObject({ cursors: { requests: "assigned-next", reviews: "review-next" } })
  expect(getClientMissingCloseEvidenceRequestQueue).toHaveBeenCalledWith(expect.objectContaining({ page: { periodId: "period", cursor: undefined } }))
  expect(getAccountantMissingCloseEvidenceReviewQueue).toHaveBeenCalledWith(expect.objectContaining({ page: { periodId: "period", cursor: undefined } }))
})

test("an ineligible colleague batch still advances to eligible colleagues without other reads", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request"]))
  ;(db.user.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ ...user([]), id: `user-${String(i).padStart(3, "0")}` })))
  const first = await getCloseEvidenceWorkflow(actor, "period")
  expect(first.recipients).toEqual([]); expect(first.cursors.recipients).toBeTruthy()
  jest.clearAllMocks()
  ;(db.user.findMany as jest.Mock).mockResolvedValue([{ ...user(["accounting.close.read", "accounting.close.finding.comment"]), id: "user-100", name: "Eligible" }])
  const next = await getCloseEvidenceWorkflow(actor, "period", { kind: "recipients", cursor: first.cursors.recipients! })
  expect(next.recipients).toEqual([{ id: "user-100", name: "Eligible" }]); expect(next.cursors.recipients).toBeNull()
  expect(db.user.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId: "org", isActive: true, id: { gt: "user-099" } } }))
  expect(db.closeAssuranceFinding.findMany).not.toHaveBeenCalled(); expect(getClientMissingCloseEvidenceRequestQueue).not.toHaveBeenCalled()
})

test.each(["organizationId", "actorId", "periodId", "kind"])("refuses a cursor from another %s", async key => {
  const scope = { ...actor, periodId: "period", kind: "findings" as const }
  const cursor = closeEvidenceNextCursor({ ...scope, [key]: key === "kind" ? "reviews" : "other" }, { id: "last", createdAt: new Date() })!
  await expect(getCloseEvidenceWorkflow(actor, "period", { kind: "findings", cursor })).rejects.toMatchObject({ code: "BUSINESS_RULE_VIOLATION" })
  expect(db.closeAssuranceFinding.findMany).not.toHaveBeenCalled()
})

test("binds historical assessment context to the tenant, period and visible page only", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request"]))
  ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValue(Array.from({ length: 101 }, (_, i) => ({ id: String(i), closeRunId: i === 100 ? "unseen" : "historical", createdAt: new Date() })))
  const asOf = new Date("2026-09-01T12:30:00Z"), recordedAt = new Date("2026-09-01T12:31:00Z")
  ;(db.closeRun.findMany as jest.Mock).mockResolvedValue([{ id: "historical", asOf, createdAt: recordedAt }])
  const result = await getCloseEvidenceWorkflow(actor, "period")
  expect(db.closeRun.findMany).toHaveBeenCalledWith({ where: { organizationId: "org", periodId: "period", id: { in: ["historical"] } }, select: { id: true, asOf: true, createdAt: true } })
  expect(result.assessments).toEqual({ historical: { asOf: asOf.toISOString(), recordedAt: recordedAt.toISOString() } })
})

test("assessment context failure remains a read failure and does not become an empty successful result", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request"]))
  ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValue([{ id: "finding", closeRunId: "run" }])
  ;(db.closeRun.findMany as jest.Mock).mockRejectedValueOnce(new Error("assessment unavailable"))
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toThrow("assessment unavailable")
})

test("requesters retain tracking in a read-only module but cannot create new work", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValue(user(["accounting.close.read", "accounting.close.evidence.request"]))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  const result = await getCloseEvidenceWorkflow(actor, "period")
  expect(result).toMatchObject({ canTrack: true, canRequest: false, writable: false })
  expect(readCloseEvidenceRequestTrackingInTx).toHaveBeenCalledWith({}, actor, "period", undefined)
})

test("tracking permission revocation after collection withholds the projection even in a read-only module", async () => {
  ;(db.user.findFirst as jest.Mock).mockResolvedValueOnce(user(["accounting.close.read", "accounting.close.evidence.request"])).mockResolvedValueOnce(user(["accounting.close.read"]))
  ;(evaluateModuleEntitlement as jest.Mock).mockImplementation(input => ({ allowed: input.accessIntent === "read" }))
  await expect(getCloseEvidenceWorkflow(actor, "period")).rejects.toMatchObject({ code: "FORBIDDEN" })
})
