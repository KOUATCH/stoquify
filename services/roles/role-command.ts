import { z } from "zod"

export const roleDetailsInput = z.object({
  name: z.string().trim().min(1).max(120),
  nameFr: z.string().trim().max(120).optional(),
  description: z.string().trim().max(1000).optional(),
  permissions: z.array(z.string().min(1).max(160)).max(1000),
  organizationId: z.string().trim().max(160).optional(),
}).strict()

export const roleCommandInput = z.object({
  requestId: z.string().uuid(),
  expectedUpdatedAt: z.string().datetime({ offset: true }).optional(),
}).strict()

export type RoleCommand = z.infer<typeof roleCommandInput>
