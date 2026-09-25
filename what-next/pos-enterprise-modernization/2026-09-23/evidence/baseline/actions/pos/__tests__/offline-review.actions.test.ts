jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))
jest.mock("@/services/pos/offline-resolution.service", () => ({ previewOfflineConflictResolution: jest.fn(), resolveOfflineRecordedReplay: jest.fn() }))
jest.mock("@/lib/security/rbac", () => {
  class RbacError extends Error { code = "FORBIDDEN"; status = 403 }
  return { RbacError, isRbacError: (error: unknown) => error instanceof RbacError, requirePermission: jest.fn(), assertCanUseOrganization: jest.fn() }
})
jest.mock("@/lib/security/auth-session", () => ({ FreshAuthRequiredError: class extends Error {}, requireFreshAuth: jest.fn() }))
jest.mock("@/services/pos/offline-review.service", () => ({ getOfflineConflictReview: jest.fn(), acknowledgeOfflineConflict: jest.fn(), listOfflineConflictHistory: jest.fn(), listOfflineConflictTimeline: jest.fn() }))
import { requirePermission, RbacError, assertCanUseOrganization } from "@/lib/security/rbac"
import { requireFreshAuth, FreshAuthRequiredError } from "@/lib/security/auth-session"
import { acknowledgeOfflineConflict, listOfflineConflictHistory, listOfflineConflictTimeline } from "@/services/pos/offline-review.service"
import { acknowledgeOfflineConflictAction, previewOfflineConflictResolutionAction, resolveOfflineRecordedReplayAction, listOfflineConflictHistoryAction, listOfflineConflictTimelineAction } from "../offline-review.actions"
import { previewOfflineConflictResolution, resolveOfflineRecordedReplay } from "@/services/pos/offline-resolution.service"

const input = { conflictId: "conflict", expectedRevision: "a".repeat(64), note: "Reviewing the source evidence" }
beforeEach(() => {
  jest.clearAllMocks()
  ;(requirePermission as jest.Mock).mockResolvedValue({ orgId: "org", userId: "reviewer", permissions: ["controls.manage", "pos.transactions.read"] })
  ;(requireFreshAuth as jest.Mock).mockResolvedValue({ claims: { lastAuthAt: new Date().toISOString() } })
  ;(assertCanUseOrganization as jest.Mock).mockResolvedValue(undefined)
  ;(acknowledgeOfflineConflict as jest.Mock).mockResolvedValue({ replayed: false })
})
it("uses current reviewer identity and both permissions with fresh authentication", async () => {
  expect((await acknowledgeOfflineConflictAction({ ...input, userId: "injected" } as typeof input)).success).toBe(true)
  expect(requireFreshAuth).toHaveBeenCalledWith(300)
  expect(requirePermission).toHaveBeenCalledWith("controls.manage", expect.anything())
  expect(requirePermission).toHaveBeenCalledWith("pos.transactions.read")
  expect(acknowledgeOfflineConflict).toHaveBeenCalledWith({ ...input, organizationId: "org", userId: "reviewer" })
})
it.each(["controls.manage", "pos.transactions.read"])("denies missing %s before saving", async denied => {
  ;(requirePermission as jest.Mock).mockImplementation(async permission => { if (permission === denied) throw new RbacError("Denied", "FORBIDDEN", 403); return { orgId: "org", userId: "reviewer" } })
  expect((await acknowledgeOfflineConflictAction(input)).success).toBe(false)
  expect(acknowledgeOfflineConflict).not.toHaveBeenCalled()
})
it("does not save with stale authentication", async () => {
  ;(requireFreshAuth as jest.Mock).mockRejectedValue(new FreshAuthRequiredError("Sign in again"))
  expect(await acknowledgeOfflineConflictAction(input)).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" })
  expect(acknowledgeOfflineConflict).not.toHaveBeenCalled()
})
it("rejects an injected foreign organization", async () => {
  ;(assertCanUseOrganization as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  expect((await acknowledgeOfflineConflictAction({ ...input, organizationId: "foreign" } as typeof input)).success).toBe(false)
  expect(acknowledgeOfflineConflict).not.toHaveBeenCalled()
})

describe("recorded replay resolution boundary", () => {
  it("derives tenant/reviewer identity and requires both permissions for preview and resolution", async () => {
    expect((await previewOfflineConflictResolutionAction({ conflictId: input.conflictId })).success).toBe(true)
    expect(previewOfflineConflictResolution).toHaveBeenCalledWith({ conflictId: input.conflictId, organizationId: "org", userId: "reviewer" })
    expect((await resolveOfflineRecordedReplayAction({ ...input, userId: "cashier" } as typeof input)).success).toBe(true)
    expect(resolveOfflineRecordedReplay).toHaveBeenCalledWith({ ...input, organizationId: "org", userId: "reviewer" })
    expect(requireFreshAuth).toHaveBeenCalledWith(300)
    expect(requirePermission).toHaveBeenCalledWith("pos.transactions.read")
  })
  it.each(["controls.manage", "pos.transactions.read"])("denies preview and mutation without %s", async permission => {
    ;(requirePermission as jest.Mock).mockImplementation(async requested => { if (requested === permission) throw new RbacError("Denied", "FORBIDDEN", 403); return { orgId: "org", userId: "reviewer" } })
    expect((await previewOfflineConflictResolutionAction({ conflictId: input.conflictId })).success).toBe(false)
    expect((await resolveOfflineRecordedReplayAction(input)).success).toBe(false)
    expect(previewOfflineConflictResolution).not.toHaveBeenCalled(); expect(resolveOfflineRecordedReplay).not.toHaveBeenCalled()
  })
  it("requires fresh authentication before resolution", async () => {
    ;(requireFreshAuth as jest.Mock).mockRejectedValue(new FreshAuthRequiredError("Confirm identity"))
    expect(await resolveOfflineRecordedReplayAction(input)).toMatchObject({ success: false, code: "FRESH_AUTH_REQUIRED" })
    expect(resolveOfflineRecordedReplay).not.toHaveBeenCalled()
  })
})
it("uses server scope for history and timeline and denies revoked read permission", async () => {
  const request = { locationId: "location", terminalId: "terminal", status: "ALL" as const }
  expect((await listOfflineConflictHistoryAction({ ...request, userId: "injected" } as typeof request)).success).toBe(true)
  expect(listOfflineConflictHistory).toHaveBeenCalledWith({ ...request, organizationId: "org", userId: "reviewer" })
  expect((await listOfflineConflictTimelineAction({ conflictId: "conflict" })).success).toBe(true)
  expect(listOfflineConflictTimeline).toHaveBeenCalledWith({ conflictId: "conflict", organizationId: "org", userId: "reviewer" })
  jest.clearAllMocks(); (requirePermission as jest.Mock).mockRejectedValue(new RbacError("Denied", "FORBIDDEN", 403))
  expect((await listOfflineConflictHistoryAction(request)).success).toBe(false); expect((await listOfflineConflictTimelineAction({ conflictId: "conflict" })).success).toBe(false)
  expect(listOfflineConflictHistory).not.toHaveBeenCalled(); expect(listOfflineConflictTimeline).not.toHaveBeenCalled()
})
