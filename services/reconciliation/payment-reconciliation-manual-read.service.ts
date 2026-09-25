import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasValidManualProposalReplacement } from "./manual-match-lineage.sql"

type ProposalRow = {
  id: string; providerAccountId: string | null; providerAccountName: string | null
  paymentTransactionId: string | null; providerEventId: string | null; statementLineId: string | null
  amountMatched: Prisma.Decimal | null; currencyCode: string; matchedById: string | null; createdAt: Date
  evidenceRevision: string | null
  evidenceSummary: Prisma.JsonValue | null
}

/** Filter decisions before limiting the page, so old approved proposals cannot
 * crowd out pending review. Historical proposal/decision rows remain intact. */
export async function getPendingManualMatchProposals(organizationId: string) {
  const rows = await db.$queryRaw<ProposalRow[]>(Prisma.sql`
    SELECT proposal."id", proposal."providerAccountId", provider."displayName" AS "providerAccountName",
      proposal."paymentTransactionId", proposal."providerEventId", proposal."statementLineId",
      proposal."amountMatched", proposal."currencyCode", proposal."matchedById", proposal."createdAt",
      proposal."metadata"->>'evidenceRevision' AS "evidenceRevision",
      proposal."metadata"->'evidenceSummary' AS "evidenceSummary"
    FROM "match_records" proposal
    LEFT JOIN "provider_accounts" provider ON provider."id" = proposal."providerAccountId"
      AND provider."organizationId" = proposal."organizationId"
    WHERE proposal."organizationId" = ${organizationId} AND proposal."status" = 'PROPOSED' AND proposal."rule" = 'MANUAL'
      AND NOT ${hasValidManualProposalReplacement("proposal")}
      AND NOT EXISTS (
        SELECT 1 FROM "match_records" decision WHERE decision."organizationId" = proposal."organizationId"
          AND decision."correctionOfId" = proposal."id"
          AND decision."status" IN ('APPROVED', 'REJECTED', 'CORRECTED')
          AND decision."providerAccountId" = proposal."providerAccountId"
          AND decision."paymentTransactionId" = proposal."paymentTransactionId"
          AND decision."providerEventId" IS NOT DISTINCT FROM proposal."providerEventId"
          AND decision."statementLineId" IS NOT DISTINCT FROM proposal."statementLineId"
          AND decision."amountMatched" = proposal."amountMatched" AND decision."currencyCode" = proposal."currencyCode"
      )
    ORDER BY proposal."createdAt" DESC, proposal."id" DESC LIMIT 12`)
  return rows.map(row => {
    const summary = row.evidenceSummary
    const evidenceSummary = summary && typeof summary === "object" && !Array.isArray(summary)
      && typeof summary.internalAmount === "string" && /^\d+\.\d{2}$/.test(summary.internalAmount)
      && typeof summary.externalAmount === "string" && /^\d+\.\d{2}$/.test(summary.externalAmount)
      && typeof summary.direction === "string" && ["INBOUND", "OUTBOUND", "INTERNAL"].includes(summary.direction)
      && typeof summary.externalSource === "string" && ["PROVIDER_EVENT", "STATEMENT_LINE"].includes(summary.externalSource)
      ? { internalAmount: summary.internalAmount, externalAmount: summary.externalAmount, direction: summary.direction, externalSource: summary.externalSource } : null
    return { ...row, evidenceSummary, amountMatched: row.amountMatched?.toFixed(2) ?? null, createdAt: row.createdAt.toISOString(), evidenceRevision: row.evidenceRevision && /^sha256:[a-f0-9]{64}$/.test(row.evidenceRevision) ? row.evidenceRevision : null }
  })
}
