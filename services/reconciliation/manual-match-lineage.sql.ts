import { Prisma } from "@prisma/client"

/** A replacement retires one review request, never its financial obligation.
 * Only the append-only shape emitted by proposeManualMatch is recognized. The
 * new proposal remains pending until its own independent decision is recorded. */
export function hasValidManualProposalReplacement(alias: "s" | "proposal") {
  const original = Prisma.raw(alias)
  return Prisma.sql`EXISTS (
    SELECT 1 FROM "match_records" marker
    JOIN "match_records" replacement ON replacement."id" = marker."metadata"->>'replacementProposalId'
      AND replacement."organizationId" = ${original}."organizationId"
    WHERE ${original}."status" = 'PROPOSED' AND ${original}."rule" = 'MANUAL'
      AND marker."organizationId" = ${original}."organizationId" AND marker."correctionOfId" = ${original}."id"
      AND marker."providerAccountId" = ${original}."providerAccountId"
      AND marker."matchedById" = ${original}."matchedById" AND marker."currencyCode" = ${original}."currencyCode"
      AND marker."status" = 'VOIDED' AND marker."rule" = 'MANUAL'
      AND marker."correctionReason" = 'REPLACED_BY_CURRENT_EVIDENCE_PROPOSAL'
      AND marker."paymentTransactionId" IS NULL AND marker."providerEventId" IS NULL
      AND marker."statementLineId" IS NULL AND marker."amountMatched" IS NULL
      AND replacement."id" <> ${original}."id" AND replacement."status" = 'PROPOSED' AND replacement."rule" = 'MANUAL'
      AND replacement."providerAccountId" = ${original}."providerAccountId"
      AND replacement."matchedById" = ${original}."matchedById"
      AND replacement."paymentTransactionId" = ${original}."paymentTransactionId"
      AND replacement."providerEventId" IS NOT DISTINCT FROM ${original}."providerEventId"
      AND replacement."statementLineId" IS NOT DISTINCT FROM ${original}."statementLineId"
      AND replacement."currencyCode" = ${original}."currencyCode" AND replacement."amountMatched" > 0
      AND replacement."metadata"->>'supersedesProposalId' = ${original}."id"
      AND replacement."metadata"->>'evidenceRevision' ~ '^sha256:[a-f0-9]{64}$'
      AND replacement."createdAt" >= ${original}."createdAt"
  )`
}
