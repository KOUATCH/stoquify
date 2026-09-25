import { z } from "zod"

export const reconciliationCertificateExportSchema = z.object({
  runId: z.string().trim().min(1).max(200),
  expectedCertificateHash: z.string().regex(/^[a-f0-9]{64}$/),
  idempotencyKey: z.string().uuid(),
  fileType: z.literal("json").optional(),
  correlationId: z.string().trim().min(1).max(200).optional(),
}).strict()

export type ReconciliationCertificateExportCommand = z.infer<typeof reconciliationCertificateExportSchema>

export const retainedCertificateExportSchema = z.object({
  kind: z.literal("RECONCILIATION_CERTIFICATE_EXPORT_V2"),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  result: z.object({
    runId: z.string().min(1), fileName: z.string().min(1), mimeType: z.literal("application/json"), content: z.string(),
    certificateHash: z.string().regex(/^[a-f0-9]{64}$/), sha256: z.string().regex(/^[a-f0-9]{64}$/),
    watermarkId: z.string().min(1), rowCount: z.number().int().nonnegative(), inboxItemId: z.string().uuid(), correlationId: z.string().min(1),
    replayed: z.literal(false),
  }).strict(),
}).strict()
