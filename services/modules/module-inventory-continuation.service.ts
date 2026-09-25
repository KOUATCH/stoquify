import "server-only"

import { Prisma } from "@prisma/client"
import type { ParsedCreateStockAdjustmentInput } from "@/services/inventory/inventory-event.schemas"
import { ConflictError } from "@/services/_shared/action-errors"
import { getModuleAdmissionInTx, ModuleNewWorkStoppedError } from "./module-admission.service"

/** An adjustment generated from a previously admitted frozen count completes
 * that recorded work. The caller's source ID is only a lookup key: every line,
 * quantity, frozen cost and count-sheet hash must match tenant-owned evidence.
 * Normal count/adjustment approval and posting controls still run separately. */
export async function assertStockAdjustmentAdmissionInTx(tx: Prisma.TransactionClient, input: ParsedCreateStockAdjustmentInput) {
  const operation = { organizationId: input.organizationId, moduleSlug: "inventory" as const, operation: "inventory.adjustment.create" }
  const admission = await getModuleAdmissionInTx(tx, operation)
  if (admission.allowed) return
  const deny = () => new ModuleNewWorkStoppedError(operation, admission.blockedBy)
  if (!input.sourceCountSessionId || input.type !== "PHYSICAL_COUNT") throw deny()
  const cutoffs = admission.blockedBy.map(slug => admission.stoppedAt[slug])
  if (cutoffs.some(value => !value)) throw deny()
  const cutoff = Math.min(...cutoffs.map(value => Date.parse(value!)))
  const locked = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id" FROM "stock_count_sessions" WHERE "id" = ${input.sourceCountSessionId}
      AND "organizationId" = ${input.organizationId} FOR UPDATE`)
  if (locked.length !== 1) throw deny()
  const count = await tx.stockCountSession.findFirst({ where: { id: input.sourceCountSessionId, organizationId: input.organizationId }, include: { lines: true } })
  if (!count || count.createdAt.getTime() >= cutoff || !["SUBMITTED", "APPROVED"].includes(count.status) ||
    count.locationId !== input.locationId || !count.snapshotHash || !count.countSheetHash ||
    count.countSheetHash !== input.documentHash || count.countSheetHash !== input.evidenceHash) throw deny()
  if (count.postedAdjustmentId || await tx.stockAdjustment.findFirst({
    where: { organizationId: input.organizationId, sourceCountSessionId: count.id }, select: { id: true },
  })) throw new ConflictError("This count already has adjustment evidence. Reconcile its existing result instead of creating another adjustment.")
  const expected = count.lines.filter(line => line.varianceQuantity !== null && !line.varianceQuantity.eq(0))
  if (expected.length !== input.lines.length || new Set(input.lines.map(line => line.stockCountLineId)).size !== expected.length) throw deny()
  const same = (left: Prisma.Decimal | null, right: unknown, precision: number) =>
    left !== null && right !== undefined && right !== null && new Prisma.Decimal(String(right)).toDecimalPlaces(precision).eq(left.toDecimalPlaces(precision))
  for (const line of input.lines) {
    const frozen = expected.find(candidate => candidate.id === line.stockCountLineId)
    if (!frozen || frozen.itemId !== line.itemId || !same(frozen.systemQuantity, line.systemQuantity, 3) ||
      !same(frozen.countedQuantity, line.actualQuantity, 3) || !same(frozen.varianceQuantity, line.adjustedQuantity, 3) ||
      !same(frozen.unitCost, line.unitCost, 2) || line.evidenceHash !== (frozen.evidenceHash ?? count.countSheetHash)) throw deny()
  }
}
