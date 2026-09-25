jest.mock("next/cache", () => ({ revalidatePath: jest.fn() }))
jest.mock("@/services/_shared/protect", () => ({ protect: jest.fn((options, handler) => {
  const global = globalThis as typeof globalThis & { __compositionOptions?: Record<string, unknown>[] }
  global.__compositionOptions = [...(global.__compositionOptions ?? []), options]
  return async (input: unknown) => ({ success: true, data: await handler(input, { orgId: "org-session", userId: "user-session", permissions: ["MANAGE_SYSTEM_SETTINGS", "dashboard.read"] }), error: null, status: 200 })
}) }))
jest.mock("@/services/modules/module-composition.service", () => ({ getModuleCompositionData: jest.fn(), getModuleCompositionHistory: jest.fn(), previewModuleComposition: jest.fn(), saveModuleCompositionDraft: jest.fn(), reopenModuleComposition: jest.fn(), applyModuleComposition: jest.fn(), resumeModuleComposition: jest.fn() }))

import { revalidatePath } from "next/cache"
import { applyModuleComposition, getModuleCompositionData, getModuleCompositionHistory, previewModuleComposition, reopenModuleComposition, saveModuleCompositionDraft, resumeModuleComposition } from "@/services/modules/module-composition.service"
import { applyModuleCompositionAction, getModuleCompositionAction, getModuleCompositionHistoryAction, previewModuleCompositionAction, reopenModuleCompositionAction, saveModuleCompositionDraftAction, resumeModuleCompositionAction } from "../module-composition.actions"

const actor = { organizationId: "org-session", actorId: "user-session", actorPermissions: ["MANAGE_SYSTEM_SETTINGS", "dashboard.read"] }
const selection = { selectedModules: ["sales"], expectedRevision: 0 }
beforeEach(() => { jest.clearAllMocks(); (applyModuleComposition as jest.Mock).mockResolvedValue({ state: "ACTIVE" }) })

it("derives scope for read and preview and discards attacker tenant fields", async () => {
  await getModuleCompositionAction({ organizationId: "attacker" })
  await previewModuleCompositionAction({ ...selection, organizationId: "attacker", actorId: "attacker" })
  expect(getModuleCompositionData).toHaveBeenCalledWith(actor)
  expect(previewModuleComposition).toHaveBeenCalledWith(actor, selection)
})
it("requires settings permission and fresh authentication for all durable mutations", () => {
  const options = (globalThis as typeof globalThis & { __compositionOptions?: Record<string, any>[] }).__compositionOptions!
  expect(options).toHaveLength(7)
  expect(options.every((option) => option.permission === "MANAGE_SYSTEM_SETTINGS" && option.tenantGuard === "handler-derived")).toBe(true)
  expect(options.filter((option) => option.freshAuth?.maxAgeSeconds === 600)).toHaveLength(4)
})
it("validates the revision and exact preview hash before committing", async () => {
  await expect(applyModuleCompositionAction({ ...selection, expectedRevision: -1, idempotencyKey: "test-command", previewHash: "bad" })).rejects.toThrow()
  expect(applyModuleComposition).not.toHaveBeenCalled()
})
it("never accepts a caller's grants, operational readiness or tenant authority", async () => {
  const input = { ...selection, idempotencyKey: "apply-command", previewHash: "a".repeat(64) }
  await applyModuleCompositionAction({ ...input, organizationId: "attacker", grants: [{ moduleSlug: "payroll" }], setupReady: true })
  expect(applyModuleComposition).toHaveBeenCalledWith(actor, input)
  expect(revalidatePath).toHaveBeenCalledWith("/en/dashboard/settings/modules")
  expect(revalidatePath).toHaveBeenCalledWith("/fr/dashboard", "layout")
})
it("refreshes a failed preparation result while keeping it distinct from activation", async () => {
  ;(applyModuleComposition as jest.Mock).mockResolvedValue({ state: "FAILED" })
  const result = await applyModuleCompositionAction({ ...selection, idempotencyKey: "failed-command", previewHash: "a".repeat(64) })
  expect(result.data?.state).toBe("FAILED")
  expect(revalidatePath).toHaveBeenCalledWith("/en/dashboard/settings/modules")
})
it("derives tenant and actor for resume and accepts only an explicit stop policy", async () => {
  const input = { operationId: "request-1", expectedRevision: 2, idempotencyKey: "resume-key-1" }
  ;(resumeModuleComposition as jest.Mock).mockResolvedValue({ state: "REQUESTED" })
  await resumeModuleCompositionAction({ ...input, organizationId: "attacker", setupReady: true, authorityHash: "forged" })
  expect(resumeModuleComposition).toHaveBeenCalledWith(actor, input)
  await previewModuleCompositionAction({ ...selection, stopNewWorkModules: ["inventory"] })
  expect(previewModuleComposition).toHaveBeenCalledWith(actor, { ...selection, stopNewWorkModules: ["inventory"] })
})
it("scopes draft and history reopen commands through the authenticated actor", async () => {
  await saveModuleCompositionDraftAction({ ...selection, idempotencyKey: "save-command", organizationId: "attacker" })
  await reopenModuleCompositionAction({ commandId: "history-1", expectedRevision: 0, idempotencyKey: "reopen-command", organizationId: "attacker" })
  expect(saveModuleCompositionDraft).toHaveBeenCalledWith(actor, { ...selection, idempotencyKey: "save-command" })
  expect(reopenModuleComposition).toHaveBeenCalledWith(actor, { commandId: "history-1", expectedRevision: 0, idempotencyKey: "reopen-command" })
})
it("derives tenant scope for older history and rejects unbounded cursor input", async () => {
  await getModuleCompositionHistoryAction({ beforeId: "earlier-command", organizationId: "attacker", take: 100000 })
  expect(getModuleCompositionHistory).toHaveBeenCalledWith(actor, { beforeId: "earlier-command" })
  await expect(getModuleCompositionHistoryAction({ beforeId: "x".repeat(129) })).rejects.toThrow()
  expect(getModuleCompositionHistory).toHaveBeenCalledTimes(1)
})
