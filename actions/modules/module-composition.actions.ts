"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { protect, type ProtectedActionContext } from "@/services/_shared/protect"
import { applyModuleComposition, getModuleCompositionData, getModuleCompositionHistory, previewModuleComposition, reopenModuleComposition, saveModuleCompositionDraft, resumeModuleComposition } from "@/services/modules/module-composition.service"
import type { CompositionHistoryEntry, CompositionHistoryPage, ModuleCompositionApplyResult, ModuleCompositionData, ModuleCompositionPreview } from "@/services/modules/module-composition-contracts"

const scopeId = z.string().trim().min(1).max(128)
const selection = z.object({ selectedModules: z.array(z.string().trim().min(1).max(64)).max(30), stopNewWorkModules: z.array(z.string().trim().min(1).max(64)).max(30).optional(), setupInputs: z.object({ payrollPeriodId: scopeId.optional(), complianceAdapterId: scopeId.optional() }).optional(), expectedRevision: z.number().int().min(0) })
const key = z.string().trim().min(8).max(128)
const draft = selection.extend({ idempotencyKey: key })
const apply = draft.extend({ previewHash: z.string().regex(/^[a-f0-9]{64}$/) })
const reopen = z.object({ commandId: z.string().trim().min(1).max(128), expectedRevision: z.number().int().min(0), idempotencyKey: key })
const resumeInput = z.object({ operationId: z.string().trim().min(1).max(128), expectedRevision: z.number().int().min(0), idempotencyKey: key })
const actor = (ctx: ProtectedActionContext) => ({ organizationId: ctx.orgId, actorId: ctx.userId, actorPermissions: ctx.permissions })
const readOptions = { permission: "MANAGE_SYSTEM_SETTINGS", auditResource: "ModuleComposition", auditAllowed: true, tenantGuard: "handler-derived" as const }
const writeOptions = { ...readOptions, freshAuth: { maxAgeSeconds: 600 } }
const read = protect<unknown, ModuleCompositionData>(readOptions, async (_input, ctx) => getModuleCompositionData(actor(ctx)))
const history = protect<unknown, CompositionHistoryPage>(readOptions, async (input, ctx) => getModuleCompositionHistory(actor(ctx), z.object({ beforeId: scopeId }).parse(input)))
const preview = protect<unknown, ModuleCompositionPreview>(readOptions, async (input, ctx) => previewModuleComposition(actor(ctx), selection.parse(input)))
const save = protect<unknown, CompositionHistoryEntry>(writeOptions, async (input, ctx) => saveModuleCompositionDraft(actor(ctx), draft.parse(input)))
const restore = protect<unknown, CompositionHistoryEntry>(writeOptions, async (input, ctx) => reopenModuleComposition(actor(ctx), reopen.parse(input)))
function refreshComposition() {
  for (const locale of ["en", "fr"]) {
    revalidatePath(`/${locale}/dashboard/settings/modules`)
    revalidatePath(`/${locale}/dashboard`, "layout")
  }
}
const resume = protect<unknown, ModuleCompositionApplyResult>(writeOptions, async (input, ctx) => {
  const result = await resumeModuleComposition(actor(ctx), resumeInput.parse(input))
  refreshComposition()
  return result
})
const commit = protect<unknown, ModuleCompositionApplyResult>(writeOptions, async (input, ctx) => {
  const result = await applyModuleComposition(actor(ctx), apply.parse(input))
  refreshComposition()
  return result
})

export async function getModuleCompositionAction(input: unknown = {}) { return read(input) }
export async function getModuleCompositionHistoryAction(input: unknown) { return history(input) }
export async function previewModuleCompositionAction(input: unknown) { return preview(input) }
export async function saveModuleCompositionDraftAction(input: unknown) { return save(input) }
export async function reopenModuleCompositionAction(input: unknown) { return restore(input) }
export async function applyModuleCompositionAction(input: unknown) { return commit(input) }
export async function resumeModuleCompositionAction(input: unknown) { return resume(input) }
