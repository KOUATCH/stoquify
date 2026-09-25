import { z } from "zod"

export const memberHistoryInput = z.object({ beforeId: z.string().min(1).max(200).optional(), throughId: z.string().min(1).max(200).optional() }).strict().refine(value => !value.beforeId || !!value.throughId)
export const memberHistoryExportInput = z.object({ page: memberHistoryInput, expectedHash: z.string().regex(/^[a-f0-9]{64}$/), locale: z.enum(["en", "fr"]) }).strict()
export type MemberHistoryInput = z.infer<typeof memberHistoryInput>
export type MemberHistoryExportInput = z.infer<typeof memberHistoryExportInput>
