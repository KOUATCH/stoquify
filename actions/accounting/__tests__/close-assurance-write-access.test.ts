// Real protect/action/context adapters; authentication, entitlement and writers
// are mocked. These are boundary tests, not persisted session or lock evidence.
jest.mock("server-only", () => ({}))
jest.mock("next/cache", () => ({ revalidatePath: jest.fn(), revalidateTag: jest.fn() }))
jest.mock("@/lib/logger", () => ({ logger: { warn: jest.fn(), error: jest.fn() } }))
jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error {
    constructor(message: string, public readonly code: string, public readonly status: number) {
      super(message)
      this.name = "RbacError"
    }
  }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({
  FreshAuthRequiredError: class FreshAuthRequiredError extends Error {
    constructor() { super("Fresh authentication required"); this.name = "FreshAuthRequiredError" }
  },
  requireFreshAuth: jest.fn(), requireSession: jest.fn(), SESSION_ASSURANCE_LEVEL: { NONE: 0, PASSWORD: 1 },
}))
jest.mock("@/services/modules/module-entitlement.service", () => ({ observeModuleAccess: jest.fn() }))
jest.mock("@/services/accounting/close-assurance.service", () => ({
  runCloseAssurance: jest.fn(), assignCloseFinding: jest.fn(), commentOnCloseFinding: jest.fn(),
  requestCloseWaiver: jest.fn(), approveCloseWaiver: jest.fn(), updateAccountantReview: jest.fn(),
  getCloseAssuranceDashboard: jest.fn(), getCloseEvidenceGraph: jest.fn(),
  requestMissingCloseEvidence: jest.fn(), respondToMissingCloseEvidence: jest.fn(), acceptMissingCloseEvidenceResponse: jest.fn(),
}))
jest.mock("@/services/accounting/close-assurance-pack.service", () => ({ exportClosePack: jest.fn(), getRetainedClosePackExport: jest.fn(), listClosePackExports: jest.fn() }))

import { FreshAuthRequiredError, requireFreshAuth, requireSession } from "@/lib/security/auth-session"
import { RbacError, requirePermission, assertCanUseOrganization } from "@/lib/security/rbac"
import { observeModuleAccess } from "@/services/modules/module-entitlement.service"
import {
  runCloseAssurance, assignCloseFinding, commentOnCloseFinding, requestCloseWaiver, approveCloseWaiver, updateAccountantReview,
} from "@/services/accounting/close-assurance.service"
import { exportClosePack, getRetainedClosePackExport, listClosePackExports } from "@/services/accounting/close-assurance-pack.service"
import {
  runCloseAssuranceAction, assignCloseFindingAction, commentOnCloseFindingAction, requestCloseWaiverAction,
  approveCloseWaiverAction, updateAccountantReviewAction, exportDraftClosePackAction, exportCertifiedClosePackAction,
  getRetainedClosePackExportAction, listClosePackExportsAction,
} from "../close-assurance.actions"

const verifiedAt = Date.now()
const permissions = ["accounting.close.run", "accounting.close.finding.assign", "accounting.close.finding.comment",
  "accounting.close.waiver.request", "accounting.close.waiver.approve", "accounting.close.accountant.review",
  "accounting.close.export", "accounting.close.certify"]
const context = { orgId: "org-authorized", userId: "actor-authorized", permissions }
const trustedSession = { id: "server-session", token: "server-session-token" }
const claims = () => ({ userId: context.userId, tenantId: context.orgId,
  sessionId: trustedSession.id, sessionToken: trustedSession.token,
  assuranceOrganizationId: context.orgId, assuranceLevel: 1, lastAuthAt: verifiedAt })

const writes = [
  { name: "assessment", action: runCloseAssuranceAction, service: runCloseAssurance, permission: "accounting.close.run", intent: "write", sensitive: false,
    input: { periodId: "period-1" }, parsed: { periodId: "period-1" } },
  { name: "assignment", action: assignCloseFindingAction, service: assignCloseFinding, permission: "accounting.close.finding.assign", intent: "write", sensitive: false,
    input: { findingId: "finding-1", assignedToId: "assignee-1" }, parsed: { findingId: "finding-1", assignedToId: "assignee-1" } },
  { name: "comment", action: commentOnCloseFindingAction, service: commentOnCloseFinding, permission: "accounting.close.finding.comment", intent: "write", sensitive: false,
    input: { findingId: "finding-1", body: "Review supporting evidence" }, parsed: { findingId: "finding-1", body: "Review supporting evidence" } },
  { name: "waiver request", action: requestCloseWaiverAction, service: requestCloseWaiver, permission: "accounting.close.waiver.request", intent: "write", sensitive: false,
    input: { findingId: "finding-1", reason: "Review the retained evidence before deciding" }, parsed: { findingId: "finding-1", reason: "Review the retained evidence before deciding" } },
  { name: "waiver approval", action: approveCloseWaiverAction, service: approveCloseWaiver, permission: "accounting.close.waiver.approve", intent: "write", sensitive: true,
    input: { findingId: "finding-1" }, parsed: { findingId: "finding-1" } },
  { name: "accountant review", action: updateAccountantReviewAction, service: updateAccountantReview, permission: "accounting.close.accountant.review", intent: "write", sensitive: false,
    input: { closeRunId: "run-1", status: "APPROVED_FOR_CLOSE" }, parsed: { closeRunId: "run-1", status: "APPROVED_FOR_CLOSE" } },
  { name: "draft export", action: exportDraftClosePackAction, service: exportClosePack, permission: "accounting.close.export", intent: "export", sensitive: false,
    input: { closeRunId: "run-1" }, parsed: { closeRunId: "run-1", mode: "DRAFT_NOT_CERTIFIED" } },
  { name: "certified export", action: exportCertifiedClosePackAction, service: exportClosePack, permission: "accounting.close.certify", intent: "write", sensitive: true,
    input: { closeRunId: "run-1" }, parsed: { closeRunId: "run-1", mode: "CERTIFIED" } },
] as const

beforeEach(() => {
  jest.resetAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue(context)
  ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(context.orgId)
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: claims() })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: claims() })
  ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: true, result: "allow" })
  for (const write of writes) (write.service as jest.Mock).mockResolvedValue({ marker: "committed close work", periodId: "period-1" })
})

describe.each(writes)("legacy $name action boundary", write => {
  it("denies disabled module access before invoking the writer", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false, result: "deny" })
    expect(await write.action(write.input)).toMatchObject({ success: false, status: 403, code: "FORBIDDEN", data: null })
    expect(write.service).not.toHaveBeenCalled()
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: context.orgId, userId: context.userId, actorPermissions: permissions,
      moduleSlug: "close_assurance", accessIntent: write.intent, mode: "enforce", audit: true,
    }))
  })

  it("does not turn an unavailable entitlement lookup into a write", async () => {
    ;(observeModuleAccess as jest.Mock).mockRejectedValue(new Error("private entitlement failure canary"))
    const result = await write.action(write.input)
    expect(result).toMatchObject({ success: false, status: 500, data: null })
    expect(JSON.stringify(result)).not.toContain("private entitlement failure canary")
    expect(write.service).not.toHaveBeenCalled()
  })

  it("forwards only server-bound actor and session proof", async () => {
    const result = await write.action({ ...write.input, actorId: "spoofed-actor", actorPermissions: ["*"],
      session: { id: "spoofed-session", token: "spoofed-token" }, lastAuthAt: "1900-01-01", freshAuth: { actorId: "spoofed-actor" } })
    expect(result).toMatchObject({ success: true, data: { marker: "committed close work" } })
    expect(requirePermission).toHaveBeenCalledWith(write.permission, expect.any(Object))
    expect(write.service).toHaveBeenCalledWith(context.orgId, write.parsed, expect.objectContaining({
      actorId: context.userId, actorPermissions: permissions, session: trustedSession,
    }))
    expect(JSON.stringify((write.service as jest.Mock).mock.calls)).not.toContain("spoofed")
    expect(JSON.stringify(result)).not.toContain(trustedSession.token)
    if (write.sensitive) {
      expect(requireFreshAuth).toHaveBeenCalledWith(300)
      expect(requireSession).not.toHaveBeenCalled()
      expect((write.service as jest.Mock).mock.calls[0][2]).toMatchObject(write.name === "certified export"
        ? { lastAuthAt: new Date(verifiedAt) }
        : { freshAuth: { actorId: context.userId, organizationId: context.orgId, lastAuthAt: new Date(verifiedAt) } })
    } else {
      expect(requireSession).toHaveBeenCalledTimes(1)
      expect(requireFreshAuth).not.toHaveBeenCalled()
    }
  })
})

describe.each(writes.filter(write => !write.sensitive))("legacy $name live session", write => {
  it("denies a session revoked after the permission lookup", async () => {
    ;(requireSession as jest.Mock).mockRejectedValue(new RbacError("Session expired or revoked", "UNAUTHENTICATED", 401))
    expect(await write.action(write.input)).toMatchObject({ success: false, status: 401, code: "AUTH_REQUIRED", data: null })
    expect(write.service).not.toHaveBeenCalled()
  })
})

it.each([
  ["other actor", { userId: "actor-other" }],
  ["other tenant", { tenantId: "org-other" }],
  ["missing session", { sessionId: "" }],
  ["missing token", { sessionToken: "" }],
])("denies %s in the second live session read", async (_name, override) => {
  ;(requireSession as jest.Mock).mockResolvedValue({ claims: { ...claims(), ...override } })
  expect(await runCloseAssuranceAction({ periodId: "period-1" })).toMatchObject({ success: false, status: 401, data: null })
  expect(runCloseAssurance).not.toHaveBeenCalled()
})

describe.each(writes.filter(write => write.sensitive))("legacy $name fresh authentication", write => {
  it("honors a stale or missing password-assurance denial", async () => {
    ;(requireFreshAuth as jest.Mock).mockRejectedValue(new FreshAuthRequiredError())
    expect(await write.action(write.input)).toMatchObject({ success: false, status: 403, code: "FRESH_AUTH_REQUIRED", data: null })
    expect(requireFreshAuth).toHaveBeenCalledWith(300)
    expect(write.service).not.toHaveBeenCalled()
  })

  it("rejects a revoked session before entering the sensitive handler", async () => {
    ;(requireFreshAuth as jest.Mock).mockRejectedValue(new RbacError("Session expired or revoked", "UNAUTHENTICATED", 401))
    expect(await write.action(write.input)).toMatchObject({ success: false, status: 401, data: null })
    expect(write.service).not.toHaveBeenCalled()
  })

  it.each([
    ["other actor", { userId: "actor-other" }],
    ["other tenant", { tenantId: "org-other" }],
    ["other assurance tenant", { assuranceOrganizationId: "org-other" }],
    ["missing session", { sessionId: "" }],
    ["missing token", { sessionToken: "" }],
    ["insufficient assurance", { assuranceLevel: 0 }],
    ["invalid assurance time", { lastAuthAt: Number.NaN }],
  ])("rejects %s in a supposedly verified assurance snapshot", async (_name, override) => {
    ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { ...claims(), ...override } })
    expect(await write.action(write.input)).toMatchObject({ success: false, status: 403, code: "FRESH_AUTH_REQUIRED", data: null })
    expect(write.service).not.toHaveBeenCalled()
  })
})

const retainedReads = [
  { name: "receipt list", action: listClosePackExportsAction, service: listClosePackExports, input: { closeRunId: "run-1" }, certified: false },
  { name: "draft document", action: getRetainedClosePackExportAction, service: getRetainedClosePackExport, input: { exportId: "export-1", mode: "DRAFT_NOT_CERTIFIED" }, certified: false },
  { name: "certified document", action: getRetainedClosePackExportAction, service: getRetainedClosePackExport, input: { exportId: "export-1", mode: "CERTIFIED" }, certified: true },
] as const

describe.each(retainedReads)("retained $name boundary (real protect, mocked dependencies)", read => {
  it("enforces the module export gate before reading retained data", async () => {
    ;(observeModuleAccess as jest.Mock).mockResolvedValue({ allowed: false, result: "deny" })
    expect(await read.action(read.input)).toMatchObject({ success: false, code: "FORBIDDEN", status: 403 })
    expect(read.service).not.toHaveBeenCalled()
    expect(observeModuleAccess).toHaveBeenCalledWith(expect.objectContaining({ moduleSlug: "close_assurance", accessIntent: "export", mode: "enforce" }))
  })

  it("passes current server export identity and ignores spoofed form authority", async () => {
    ;(read.service as jest.Mock).mockResolvedValue({ marker: "retained historical snapshot" })
    expect(await read.action({ ...read.input, actorId: "spoofed", actorPermissions: ["*"], session: { id: "spoofed", token: "spoofed" }, lastAuthAt: "2099-01-01" })).toMatchObject({ success: true })
    expect(requirePermission).toHaveBeenCalledWith("accounting.close.export", expect.any(Object))
    expect(read.service).toHaveBeenCalledWith(context.orgId, read.input, expect.objectContaining({ actorId: context.userId, actorPermissions: permissions, session: trustedSession,
      ...(read.certified ? { lastAuthAt: new Date(verifiedAt) } : {}),
    }))
    expect(JSON.stringify((read.service as jest.Mock).mock.calls)).not.toContain("spoofed")
    if (read.certified) expect(requireFreshAuth).toHaveBeenCalledWith(300)
    else expect(requireFreshAuth).not.toHaveBeenCalled()
  })

  it("rejects revoked sessions before reading bytes or receipts", async () => {
    const revoked = new RbacError("Session revoked", "UNAUTHENTICATED", 401)
    ;((read.certified ? requireFreshAuth : requireSession) as jest.Mock).mockRejectedValue(revoked)
    expect(await read.action(read.input)).toMatchObject({ success: false, code: "AUTH_REQUIRED", status: 401 })
    expect(read.service).not.toHaveBeenCalled()
  })
})

it("requires fresh proof for retained certified reads without trusting client timestamps", async () => {
  ;(requireFreshAuth as jest.Mock).mockRejectedValue(new FreshAuthRequiredError())
  expect(await getRetainedClosePackExportAction({ exportId: "export-1", mode: "CERTIFIED", lastAuthAt: new Date().toISOString() })).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED", status: 403 })
  expect(getRetainedClosePackExport).not.toHaveBeenCalled()
})
