import { z } from "zod"
import { memberAccessCommand, type MemberAccessCommand } from "@/services/users/member-access-input"

export type MemberDraftScope = { organizationId: string; actorId: string; memberId: string }
const ids = z.array(z.string().min(1).max(200)).max(100).refine(values => new Set(values).size === values.length)
const draftSchema = z.object({ version: z.literal(1), savedAt: z.number().finite(), scope: z.object({ organizationId: z.string(), actorId: z.string(), memberId: z.string() }).strict(), selected: ids, baselineRoleIds: ids, revision: z.string().regex(/^[a-f0-9]{64}$/), reason: z.string().max(400), operation: z.enum(["roles", "reactivate"]), request: memberAccessCommand.nullable() }).strict()
export type MemberDraft = Omit<z.infer<typeof draftSchema>, "savedAt" | "version" | "scope">
const key = (scope: MemberDraftScope) => "stoquify:member-access:v1:" + JSON.stringify([scope.organizationId, scope.actorId, scope.memberId])
const sorted = (values: string[]) => JSON.stringify([...values].sort())
const matches = (draft: MemberDraft, request: MemberAccessCommand | null) => !request || (request.expectedRevision === draft.revision && request.reason === draft.reason.trim() && request.operation === draft.operation && sorted(request.roleIds) === sorted(draft.selected))

export function readMemberDraft(scope: MemberDraftScope, storage: Storage, now = Date.now()): { draft: MemberDraft | null; unavailable: boolean } {
  try {
    const raw = storage.getItem(key(scope))
    if (!raw) return { draft: null, unavailable: false }
    if (raw.length > 60000) { storage.removeItem(key(scope)); return { draft: null, unavailable: false } }
    const parsed = draftSchema.safeParse(JSON.parse(raw))
    if (!parsed.success || parsed.data.savedAt > now || now - parsed.data.savedAt > 86400000 || parsed.data.scope.organizationId !== scope.organizationId || parsed.data.scope.actorId !== scope.actorId || parsed.data.scope.memberId !== scope.memberId || !matches(parsed.data, parsed.data.request)) { storage.removeItem(key(scope)); return { draft: null, unavailable: false } }
    return { draft: parsed.data, unavailable: false }
  } catch { return { draft: null, unavailable: true } }
}

export function writeMemberDraft(scope: MemberDraftScope, draft: MemberDraft | null, storage: Storage, now = Date.now()) {
  try {
    if (!draft) { storage.removeItem(key(scope)); return true }
    const parsed = draftSchema.safeParse({ ...draft, version: 1, savedAt: now, scope })
    if (!parsed.success || !matches(parsed.data, parsed.data.request)) return false
    storage.setItem(key(scope), JSON.stringify(parsed.data)); return true
  } catch { return false }
}
