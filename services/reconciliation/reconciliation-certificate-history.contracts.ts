import { z } from "zod"
import type { ReconciliationCertificateExportCommand } from "./reconciliation-certificate-export.contracts"

const cursor = z.object({ createdAt: z.string().datetime(), id: z.string().min(1).max(200), filter: z.string().max(500) }).strict().nullable().optional()
export const certificateHistorySchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("runs"), search: z.string().trim().max(100).default(""), cursor }).strict(),
  z.object({ kind: z.literal("exports"), runId: z.string().trim().min(1).max(200), cursor }).strict(),
])
export type CertificateHistoryQuery = z.input<typeof certificateHistorySchema>
export type CertificateHistoryRun = { id: string; status: string; certificateHash: string | null; signedAt: string | null; businessDate: string; providerName: string; currencyCode: string }
export type CertificateHistoryReceipt = { id: string; createdAt: string; state: "verified" | "legacy" | "requires_review"; certificateHash: string | null; sha256: string | null; recoveryRequest: ReconciliationCertificateExportCommand | null }
export type CertificateHistoryPage = {
  scope: { organizationId: string; actorId: string }; asOf: string
  nextCursor: NonNullable<z.infer<typeof cursor>> | null
} & ({ kind: "runs"; runs: CertificateHistoryRun[] } | { kind: "exports"; run: CertificateHistoryRun; receipts: CertificateHistoryReceipt[] })
