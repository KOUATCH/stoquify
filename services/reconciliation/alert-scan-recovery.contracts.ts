import { z } from "zod"
export const alertRecoveryLookup = z.object({ scanId: z.string().uuid() }).strict()
export const alertRecoveryCommand = alertRecoveryLookup.extend({ expectedRevision: z.string().regex(/^[a-f0-9]{64}$/), commandId: z.string().uuid() }).strict()
export const alertRecoveryStatusInput = alertRecoveryLookup.extend({ command: alertRecoveryCommand.optional() }).strict().refine(value => !value.command || value.command.scanId === value.scanId)
export const alertRecoveryReceipt = z.object({ commandId: z.string().uuid(), scanId: z.string().uuid(), fromVersion: z.number().int().nonnegative(), toVersion: z.number().int().positive(),
  state: z.enum(["RUNNING", "COMPLETE"]), phase: z.enum(["SUSPENSE", "READY_RUNS", "REVIEW", "COMPLETE"]), examined: z.number().int().nonnegative(), created: z.number().int().nonnegative(), recordedAt: z.string().datetime() }).strict()
export type AlertRecoveryCommand = z.infer<typeof alertRecoveryCommand>
export type AlertRecoveryReceipt = z.infer<typeof alertRecoveryReceipt>
export type AlertRecoveryView = {
  scanId: string; revision: string | null; eligible: boolean; reason: "READY" | "COMPLETE" | "DISABLED" | "ESCALATE";
  progress: { state: "REQUESTED" | "RUNNING" | "FAILED" | "COMPLETE"; phase: "SUSPENSE" | "READY_RUNS" | "REVIEW" | "COMPLETE"; version: number; examined: number; created: number; updatedAt: string } | null;
  receipt: AlertRecoveryReceipt | null;
}
