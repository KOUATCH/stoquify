import "server-only"
import { Prisma } from "@prisma/client"
import { ConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { openingSourceSchema, openingMappingsSchema } from "./opening-position.contract"
import { hashStablePayload } from "./master-data-csv"

export const openingJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject
export const openingDate = (date: string) => new Date(`${date}T00:00:00+01:00`)
export const openingMoney = (value: string) => new Prisma.Decimal(value).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)

/** Internal domain adapters derive every value from retained evidence. No caller-supplied balances. */
export async function approvedOpeningSourceInTx(tx: Prisma.TransactionClient, organizationId: string, executionId: string) {
  const execution = await tx.financialOpeningExecution.findFirst({ where: { id: executionId, organizationId }, include: { revision: true } })
  if (!execution) throw new NotFoundError("Opening approval is unavailable.")
  if (execution.status !== "APPROVED" || execution.revision.reviewDigest !== execution.manifestDigest) throw new ConflictError("Opening approval is not applicable.")
  const source = openingSourceSchema.parse(JSON.parse(execution.revision.sourceContent))
  const mappings = openingMappingsSchema.parse(execution.revision.mappings)
  const target = (group: keyof typeof mappings, value: string) => {
    const matches = mappings[group].filter(row => row.source === value)
    if (matches.length !== 1) throw new ConflictError("An opening mapping is ambiguous or missing.")
    return matches[0].targetId
  }
  return { execution, source, target, at: openingDate(source.cutoverDate) }
}

export async function retainOpeningOperationInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string; executionId: string; domain: string; sourceId: string; source: unknown; receipt: unknown;
}) {
  return tx.financialOpeningOperation.create({ data: {
    organizationId: input.organizationId, executionId: input.executionId, domain: input.domain, sourceId: input.sourceId,
    sourceHash: hashStablePayload(input.source), receipt: openingJson(input.receipt), receiptHash: hashStablePayload(input.receipt),
  } })
}
