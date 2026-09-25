"use server"

import { protect } from "@/services/_shared/protect"
import { requirePermission } from "@/lib/security/rbac"
import { acknowledgeOfflineConflict, getOfflineConflictReview, listOfflineConflictHistory, listOfflineConflictTimeline, type OfflineConflictHistoryInput, type OfflineConflictTimelineInput } from "@/services/pos/offline-review.service"
import { revalidateTag } from "next/cache"
import { previewOfflineConflictResolution, resolveOfflineRecordedReplay } from "@/services/pos/offline-resolution.service"

export const listOfflineConflictHistoryAction = protect(
  { permission: "pos.transactions.read", auditResource: "POSOfflineSyncConflict", auditAllowed: true },
  async (input: OfflineConflictHistoryInput, ctx) => listOfflineConflictHistory({ ...input, organizationId: ctx.orgId, userId: ctx.userId }),
)
export const listOfflineConflictTimelineAction = protect(
  { permission: "pos.transactions.read", auditResource: "POSOfflineSyncConflict", auditAllowed: true },
  async (input: OfflineConflictTimelineInput, ctx) => listOfflineConflictTimeline({ ...input, organizationId: ctx.orgId, userId: ctx.userId }),
)

export const previewOfflineConflictResolutionAction = protect(
  { permission: "controls.manage", auditResource: "POSOfflineSyncConflict", auditAllowed: true },
  async (input: { conflictId: string }, ctx) => {
    await requirePermission("pos.transactions.read")
    return previewOfflineConflictResolution({ ...input, organizationId: ctx.orgId, userId: ctx.userId })
  },
)
export const resolveOfflineRecordedReplayAction = protect(
  { permission: "controls.manage", auditResource: "POSOfflineSyncConflict", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 } },
  async (input: { conflictId: string; expectedRevision: string; note: string }, ctx) => {
    await requirePermission("pos.transactions.read")
    const result = await resolveOfflineRecordedReplay({ ...input, organizationId: ctx.orgId, userId: ctx.userId })
    revalidateTag("pos-offline-sync")
    return result
  },
)

export const getOfflineConflictReviewAction = protect(
  { permission: "pos.transactions.read", auditResource: "POSOfflineSyncConflict", auditAllowed: true },
  async (input: { conflictId: string }, ctx) => getOfflineConflictReview({ ...input, organizationId: ctx.orgId, userId: ctx.userId }),
)
export const acknowledgeOfflineConflictAction = protect(
  { permission: "controls.manage", auditResource: "POSOfflineSyncConflict", auditAllowed: true, freshAuth: { maxAgeSeconds: 300 } },
  async (input: { conflictId: string; expectedRevision: string; note: string }, ctx) => {
    await requirePermission("pos.transactions.read")
    const result = await acknowledgeOfflineConflict({ ...input, organizationId: ctx.orgId, userId: ctx.userId })
    revalidateTag("pos-offline-sync")
    return result
  },
)
