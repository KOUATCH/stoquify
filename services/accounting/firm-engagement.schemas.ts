import { z } from "zod"

const id = z.string().trim().min(1).max(191)
const version = z.number().int().nonnegative()
const scope = z.enum(["READ_ONLY", "REVIEWER", "PREPARER"])
const reason = z.string().trim().min(10).max(500)
const receipt = { idempotencyKey: z.string().trim().min(8).max(191) }
const existing = { ...receipt, engagementId: id, expectedVersion: version }
const terms = { scope, effectiveFrom: z.coerce.date(), expiresAt: z.coerce.date() }
export const firmEngagementCommandSchema = z.discriminatedUnion("command", [
  z.object({ command: z.literal("CREATE"), ...receipt, clientOrganizationId: id, ownerUserId: id, ...terms }).strict(),
  z.object({ command: z.literal("TRANSITION"), ...existing, status: z.enum(["ACTIVE", "SUSPENDED", "ENDED"]), reason }).strict(),
  z.object({ command: z.literal("ENROLL"), ...existing, grantId: id }).strict(),
  z.object({ command: z.literal("ASSIGN"), ...existing, accountantUserId: id, expectedAssignmentVersion: version, ...terms }).strict(),
  z.object({ command: z.literal("REMOVE_ASSIGNMENT"), ...existing, assignmentId: id, expectedAssignmentVersion: version, reason }).strict(),
  z.object({ command: z.literal("HANDOVER"), ...existing, assignmentId: id, expectedAssignmentVersion: version,
    accountantUserId: id, expectedNewAssignmentVersion: version, ...terms, reason }).strict(),
])
export const firmEngagementReadSchema = z.object({ engagementId: id }).strict()
export type FirmEngagementCommand = z.infer<typeof firmEngagementCommandSchema>
