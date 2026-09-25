import "server-only"

import { Prisma } from "@prisma/client"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hasValidManualProposalReplacement } from "@/services/reconciliation/manual-match-lineage.sql"

type Observation = { code: string; count: number; kind: "draft" | "obligation" }

/** A partial match or an unsigned/voided run cannot discharge a payment. A
 * single full-amount signed match is sufficient evidence for this read model;
 * partial allocations remain visible rather than being summed ambiguously.
 * Every source SELECT below uses alias s and exposes these same scoped fields. */
function fullSignedMatch(sourceColumn: "paymentTransactionId" | "providerEventId" | "statementLineId") {
  const column = Prisma.raw(`m."${sourceColumn}"`)
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "match_records" m
    JOIN "reconciliation_runs" r ON r."id" = m."reconciliationRunId"
      AND r."organizationId" = s."organizationId"
    WHERE ${column} = s."id" AND m."organizationId" = s."organizationId"
      AND m."providerAccountId" = s."providerAccountId"
      AND r."providerAccountId" = s."providerAccountId"
      AND m."status" IN ('AUTO_MATCHED', 'APPROVED')
      AND m."amountMatched" = s."amount" AND m."currencyCode" = s."currencyCode"
      AND r."status" = 'SIGNED' AND r."voidedAt" IS NULL
      AND r."signedAt" IS NOT NULL AND length(trim(r."signedById")) > 0
      AND length(trim(r."certificateHash")) > 0
      AND NOT EXISTS (
        SELECT 1 FROM "match_records" correction
        WHERE correction."organizationId" = s."organizationId" AND correction."correctionOfId" = m."id"
          AND correction."status" IN ('APPROVED', 'CORRECTED', 'VOIDED')
      )
  )`
}

/** Bounded aggregate observations, not a unique-obligation total or permission
 * to stop reconciliation. Categories deliberately overlap. No failed query is
 * translated into zero, and no payment/evidence payload leaves this service. */
export async function getModuleReconciliationObligations(
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<Observation[]> {
  if (!organizationId.trim()) throw new BusinessRuleError("Organization context is required")
  const observations: Array<{ code: string; kind: Observation["kind"]; query: Prisma.Sql }> = [
    { code: "reconciliation_drafts", kind: "draft", query: Prisma.sql`
      FROM "reconciliation_runs" s WHERE s."organizationId" = ${organizationId}
        AND s."voidedAt" IS NULL AND s."status" = 'DRAFT'` },
    { code: "reconciliation_open", kind: "obligation", query: Prisma.sql`
      FROM "reconciliation_runs" s WHERE s."organizationId" = ${organizationId}
        AND s."voidedAt" IS NULL AND s."status" NOT IN ('DRAFT', 'SIGNED', 'VOIDED')` },
    { code: "suspense_open", kind: "obligation", query: Prisma.sql`
      FROM "suspense_items" s WHERE s."organizationId" = ${organizationId}
        AND s."status" NOT IN ('RESOLVED', 'WRITTEN_OFF')` },
    { code: "reconciliation_payments_pending", kind: "obligation", query: Prisma.sql`
      FROM "payment_transactions" s WHERE s."organizationId" = ${organizationId}
        AND s."state" IN ('PENDING', 'PROCESSING', 'UNKNOWN', 'DISPUTED', 'SUSPENSE', 'FAILED')` },
    { code: "reconciliation_payments_unreconciled", kind: "obligation", query: Prisma.sql`
      FROM "payment_transactions" s WHERE s."organizationId" = ${organizationId}
        AND s."state" IN ('CONFIRMED', 'SETTLED')
        AND (s."providerAccountId" IS NULL OR s."occurredAt" IS NULL OR NOT ${fullSignedMatch("paymentTransactionId")})` },
    { code: "reconciliation_legacy_payments_unlinked", kind: "obligation", query: Prisma.sql`
      FROM "payments" s WHERE s."organizationId" = ${organizationId} AND s."deletedAt" IS NULL
        AND s."method" IN ('CARD', 'MOBILE_MONEY', 'BANK_TRANSFER') AND s."status" NOT IN ('CANCELLED', 'REFUNDED')
        AND NOT EXISTS (SELECT 1 FROM "payment_transactions" linked
          WHERE linked."organizationId" = s."organizationId" AND linked."legacyPaymentId" = s."id"
            AND linked."state" NOT IN ('CANCELLED', 'REFUNDED') AND linked."amount" = s."amount")` },
    { code: "reconciliation_provider_events_pending", kind: "obligation", query: Prisma.sql`
      FROM "provider_events" s WHERE s."organizationId" = ${organizationId}
        AND (s."status" IN ('RECEIVED', 'FAILED') OR (s."status" IN ('REJECTED', 'TAMPERED', 'REPLAYED')
          AND (NOT EXISTS (SELECT 1 FROM "payment_exceptions" e
                 WHERE e."organizationId" = s."organizationId" AND e."providerEventId" = s."id")
            OR EXISTS (SELECT 1 FROM "payment_exceptions" e
                 WHERE e."organizationId" = s."organizationId" AND e."providerEventId" = s."id"
                   AND e."status" NOT IN ('RESOLVED', 'DISMISSED')))))` },
    { code: "reconciliation_provider_events_unreconciled", kind: "obligation", query: Prisma.sql`
      FROM "provider_events" s WHERE s."organizationId" = ${organizationId}
        AND s."status" IN ('VERIFIED', 'PROCESSED')
        AND (s."signatureValid" = false OR NOT ${fullSignedMatch("providerEventId")})` },
    { code: "reconciliation_statement_lines_open", kind: "obligation", query: Prisma.sql`
      FROM "statement_lines" s WHERE s."organizationId" = ${organizationId}
        AND (s."status" = 'DISPUTED' OR (s."status" IN ('UNMATCHED', 'MATCHED')
          AND NOT ${fullSignedMatch("statementLineId")}))` },
    { code: "reconciliation_statement_imports_open", kind: "obligation", query: Prisma.sql`
      FROM "statement_files" f WHERE f."organizationId" = ${organizationId}
        AND (f."status" = 'PROCESSING' OR (f."status" = 'IMPORTED' AND (
          NOT EXISTS (SELECT 1 FROM "statement_lines" s WHERE s."organizationId" = f."organizationId" AND s."statementFileId" = f."id")
          OR EXISTS (SELECT 1 FROM "statement_lines" s WHERE s."organizationId" = f."organizationId" AND s."statementFileId" = f."id"
            AND (s."status" = 'DISPUTED' OR (s."status" IN ('UNMATCHED', 'MATCHED') AND NOT ${fullSignedMatch("statementLineId")})))
        )))` },
    { code: "reconciliation_matches_pending", kind: "obligation", query: Prisma.sql`
      FROM "match_records" s WHERE s."organizationId" = ${organizationId}
        AND s."status" IN ('CANDIDATE', 'PROPOSED', 'NEEDS_REVIEW')
        AND NOT ${hasValidManualProposalReplacement("s")}
        AND NOT EXISTS (SELECT 1 FROM "match_records" approval
          WHERE approval."organizationId" = s."organizationId" AND approval."correctionOfId" = s."id"
            AND approval."status" = 'APPROVED' AND approval."providerAccountId" IS NOT DISTINCT FROM s."providerAccountId"
            AND approval."paymentTransactionId" IS NOT DISTINCT FROM s."paymentTransactionId"
            AND approval."providerEventId" IS NOT DISTINCT FROM s."providerEventId"
            AND approval."statementLineId" IS NOT DISTINCT FROM s."statementLineId"
            AND approval."amountMatched" = s."amountMatched" AND approval."currencyCode" = s."currencyCode")` },
    { code: "reconciliation_exceptions_open", kind: "obligation", query: Prisma.sql`
      FROM "payment_exceptions" s WHERE s."organizationId" = ${organizationId}
        AND s."status" NOT IN ('RESOLVED', 'DISMISSED')` },
    { code: "reconciliation_inbox_pending", kind: "obligation", query: Prisma.sql`
      FROM "payment_reconciliation_inbox_items" s WHERE s."organizationId" = ${organizationId}
        AND s."status" IN ('RECEIVED', 'PROCESSING', 'FAILED', 'DEAD_LETTER')` },
  ]
  const rows = await tx.$queryRaw<Array<{ code: string; count: bigint }>>(Prisma.join(
    observations.map(item => Prisma.sql`SELECT ${item.code}::text AS "code", count(*)::bigint AS "count" ${item.query}`),
    " UNION ALL ",
  ))
  if (rows.length !== observations.length || new Set(rows.map(row => row.code)).size !== observations.length) {
    throw new Error("Reconciliation obligation observations are incomplete")
  }
  return observations.map(item => {
    const row = rows.find(result => result.code === item.code)
    const count = row ? Number(row.count) : Number.NaN
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Reconciliation obligation count is invalid")
    return { code: item.code, kind: item.kind, count }
  })
}
