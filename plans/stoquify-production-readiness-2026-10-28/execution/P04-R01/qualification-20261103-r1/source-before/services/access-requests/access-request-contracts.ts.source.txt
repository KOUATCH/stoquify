import { z } from "zod"

// Normalized tasks, never caller-provided URLs, permissions or record identifiers.
export const accessTargets = {
  items: { path: "/dashboard/inventory/items", en: "View inventory items", fr: "Consulter les articles", permissions: ["inventory.items.read"], module: "inventory" },
} as const
export type AccessTarget = keyof typeof accessTargets
export const accessTargetInput = z.enum(["items"])
export const submitAccessRequestInput = z.object({ commandId: z.string().uuid(), target: accessTargetInput, reason: z.string().trim().min(3).max(400) }).strict()
export const requestRevisionInput = z.object({ id: z.string().min(1).max(200), revision: z.number().int().positive() }).strict()
export const decideAccessRequestInput = requestRevisionInput.extend({ decision: z.enum(["APPROVED", "DECLINED"]), reason: z.string().trim().min(3).max(400), roleIds: z.array(z.string().min(1).max(200)).max(100).refine(ids => new Set(ids).size === ids.length), memberRevision: z.string().regex(/^[a-f0-9]{64}$/) }).strict()
export const requestListInput = z.object({ queue: z.enum(["mine", "review"]).default("mine"), beforeId: z.string().min(1).max(200).optional() }).strict()
export const requestHistoryInput = requestRevisionInput.extend({ beforeId: z.string().min(1).max(200).optional() }).strict()
export const accessRequestEvent = z.object({ revision: z.number().int().positive(), decision: z.enum(["PENDING", "APPROVED", "DECLINED", "WITHDRAWN", "EXPIRED"]), application: z.enum(["NOT_REQUIRED", "PENDING", "APPLIED", "FAILED"]), target: accessTargetInput })
export type AccessRequestHistory = { entries: { id: string; at: string; actorId: string; action: string; state: z.infer<typeof accessRequestEvent> | null }[]; nextCursor: string | null }
export type AccessRequestReview = { request: string; revision: number; memberRevision: string; existingRoleCount: number; roles: { id: string; nameEn: string; nameFr: string | null; permissions: string[] }[] }

export type AccessRequestView = {
  id: string; target: AccessTarget; requesterId: string; reviewerId: string | null;
  reason: string; decision: string; application: string; revision: number;
  createdAt: string; expiresAt: string; decidedAt: string | null; appliedAt: string | null;
  decisionReason: string | null; applicationError: string | null;
  canWithdraw: boolean; canReview: boolean; canApply: boolean; canCheckAccess: boolean;
}
export type AccessRequestList = { entries: AccessRequestView[]; nextCursor: string | null; canReview: boolean; submissionsEnabled: boolean }
