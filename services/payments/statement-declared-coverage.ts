import { STATEMENT_ENVELOPE_VERSION } from "./adapters/statement-pilot-format"

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}

/** Only the importer's immutable, raw-file-hash-bound declaration establishes
 * statement coverage. Observed transaction edges never imply a covered period. */
export function hasDeclaredStatementCoverage(
  file: { organizationId: string; providerAccountId: string; fileHash: string; periodStart: Date; periodEnd: Date; metadata: unknown },
  account: { organizationId: string; id: string; providerCode: string; currencyCode: string },
): boolean {
  const metadata = record(file.metadata), declared = record(metadata.declaredCoverage)
  if (metadata.coverageKind !== "DECLARED" || !Number.isSafeInteger(metadata.lineCount) || Number(metadata.lineCount) < 1 ||
      !/^(?:sha256:)?[a-f0-9]{64}$/.test(file.fileHash) || !Number.isFinite(+file.periodStart) || !Number.isFinite(+file.periodEnd) || file.periodStart > file.periodEnd ||
      file.organizationId !== account.organizationId || file.providerAccountId !== account.id ||
      declared.formatVersion !== STATEMENT_ENVELOPE_VERSION || declared.providerCode !== account.providerCode ||
      declared.providerAccountId !== account.id || declared.currencyCode !== account.currencyCode || declared.sourceFileHash !== file.fileHash ||
      declared.periodStart !== file.periodStart.toISOString() || declared.periodEnd !== file.periodEnd.toISOString() ||
      typeof metadata.observedPeriodStart !== "string" || typeof metadata.observedPeriodEnd !== "string") return false
  const first = new Date(metadata.observedPeriodStart), last = new Date(metadata.observedPeriodEnd)
  return Number.isFinite(+first) && Number.isFinite(+last) && first <= last && first >= file.periodStart && last <= file.periodEnd
}
