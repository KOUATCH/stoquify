import {
  AdjustmentStatus,
  AdjustmentType,
  Prisma,
} from "@prisma/client"
import { z } from "zod"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  NotFoundError,
} from "@/services/_shared/action-errors"

const DEFAULT_SOURCE_LINE_LIMIT = 5_000
const MAX_SOURCE_LINE_LIMIT = 20_000
const MAX_PERIOD_MILLISECONDS = 366 * 24 * 60 * 60 * 1_000

const LOSS_ADJUSTMENT_TYPES: readonly AdjustmentType[] = [
  AdjustmentType.CYCLE_COUNT,
  AdjustmentType.PHYSICAL_COUNT,
  AdjustmentType.DAMAGED,
  AdjustmentType.EXPIRED,
  AdjustmentType.THEFT,
  AdjustmentType.WRITE_OFF,
]

const inventoryLossLocationIdsSchema = z
  .array(z.string().trim().min(1))
  .min(1)
  .max(100)
  .transform((locationIds) =>
    Array.from(new Set(locationIds)).sort(),
  )

export const inventoryLossReadFiltersSchema = z
  .object({
    from: z.coerce.date(),
    to: z.coerce.date(),
    locationId: z.string().trim().min(1).optional(),
    locationIds: inventoryLossLocationIdsSchema.optional(),
    itemId: z.string().trim().min(1).optional(),
    approverId: z.string().trim().min(1).optional(),
    detailLimit: z.coerce.number().int().min(0).max(250).default(100),
    groupLimit: z.coerce.number().int().min(1).max(50).default(10),
  })
  .superRefine((input, context) => {
    const duration = input.to.getTime() - input.from.getTime()
    if (input.locationId && input.locationIds) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["locationIds"],
        message:
          "locationId and locationIds cannot be used together.",
      })
    }

    if (duration <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "to must be later than from.",
      })
    } else if (duration > MAX_PERIOD_MILLISECONDS) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["to"],
        message: "Inventory loss periods cannot exceed 366 days.",
      })
    }
  })

export const inventoryLossReadInputSchema = z.intersection(
  z.object({
    organizationId: z.string().trim().min(1),
  }),
  inventoryLossReadFiltersSchema,
)

export type InventoryLossReadInput = z.input<
  typeof inventoryLossReadInputSchema
>

type InventoryLossReadClient = Pick<
  Prisma.TransactionClient,
  "organization" | "stockAdjustmentLine"
>

export type InventoryLossReadOptions = {
  client?: InventoryLossReadClient
  now?: () => Date
  maximumSourceLines?: number
}

export type InventoryLossCategory =
  | "COUNT_VARIANCE"
  | "DAMAGED"
  | "EXPIRED"
  | "RECORDED_THEFT"
  | "WRITE_OFF"

export type InventoryLossRecord = {
  id: string
  adjustment: {
    id: string
    number: string
    type: AdjustmentType
    category: InventoryLossCategory
    reason: string
    occurredAt: string
    sourceCountSessionId: string | null
  }
  product: {
    id: string
    sku: string
    name: string
    unit: string | null
  }
  location: {
    id: string
    name: string
  }
  approvingActor: {
    id: string
    name: string | null
  } | null
  quantityLost: string
  unitCost: string | null
  lossValue: string
  currency: string
  evidence: {
    present: boolean
    lineEvidenceHash: string | null
    adjustmentEvidenceHash: string | null
    documentHash: string | null
  }
}

export type InventoryLossValueGroup = {
  key: string
  label: string
  lineCount: number
  adjustmentCount: number
  lossValue: string
  currency: string
}

export type InventoryLossProductGroup = InventoryLossValueGroup & {
  sku: string
  unit: string | null
  quantityLost: string
}

const inventoryLossLineSelect = {
  id: true,
  adjustedQuantity: true,
  unitCost: true,
  totalCost: true,
  evidenceHash: true,
  item: {
    select: {
      id: true,
      sku: true,
      nameEn: true,
      nameFr: true,
      unit: { select: { symbol: true } },
    },
  },
  adjustment: {
    select: {
      id: true,
      adjustmentNumber: true,
      type: true,
      reason: true,
      status: true,
      adjustmentDate: true,
      evidenceHash: true,
      documentHash: true,
      sourceCountSessionId: true,
      location: { select: { id: true, name: true } },
      approvedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
} satisfies Prisma.StockAdjustmentLineSelect

type InventoryLossSourceLine = Prisma.StockAdjustmentLineGetPayload<{
  select: typeof inventoryLossLineSelect
}>

type MutableValueGroup = {
  key: string
  label: string
  lineCount: number
  adjustmentIds: Set<string>
  lossValue: Prisma.Decimal
}

type MutableProductGroup = MutableValueGroup & {
  sku: string
  unit: string | null
  quantityLost: Prisma.Decimal
}

function isLossAdjustmentType(type: AdjustmentType) {
  return LOSS_ADJUSTMENT_TYPES.includes(type)
}

function lossCategory(type: AdjustmentType): InventoryLossCategory {
  if (
    type === AdjustmentType.CYCLE_COUNT ||
    type === AdjustmentType.PHYSICAL_COUNT
  ) {
    return "COUNT_VARIANCE"
  }
  if (type === AdjustmentType.DAMAGED) return "DAMAGED"
  if (type === AdjustmentType.EXPIRED) return "EXPIRED"
  if (type === AdjustmentType.THEFT) return "RECORDED_THEFT"
  return "WRITE_OFF"
}

function itemName(item: InventoryLossSourceLine["item"]) {
  return item.nameEn || item.nameFr || item.sku
}

function actorName(
  actor: InventoryLossSourceLine["adjustment"]["approvedBy"],
) {
  if (!actor) return null
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ")
  return name || null
}

function lossValue(line: InventoryLossSourceLine) {
  if (line.totalCost !== null) return line.totalCost.abs().toDecimalPlaces(2)
  if (line.unitCost !== null) {
    return line.adjustedQuantity
      .abs()
      .times(line.unitCost)
      .toDecimalPlaces(2)
  }
  return new Prisma.Decimal(0)
}

function coverage(covered: number, total: number) {
  return {
    covered,
    total,
    percent:
      total === 0 ? 100 : Math.round((covered / total) * 10_000) / 100,
  }
}

function monthFormatter(timezone: string) {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
    })
  } catch {
    throw new BusinessRuleError(
      "Organization timezone is invalid for inventory loss reporting.",
    )
  }
}

function monthKey(
  formatter: Intl.DateTimeFormat,
  occurredAt: Date,
) {
  const parts = Object.fromEntries(
    formatter
      .formatToParts(occurredAt)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  )
  return `${parts.year}-${parts.month}`
}

function addValueGroup(
  groups: Map<string, MutableValueGroup>,
  input: {
    key: string
    label: string
    adjustmentId: string
    value: Prisma.Decimal
  },
) {
  const existing = groups.get(input.key)
  if (existing) {
    existing.lineCount += 1
    existing.adjustmentIds.add(input.adjustmentId)
    existing.lossValue = existing.lossValue.plus(input.value)
    return
  }

  groups.set(input.key, {
    key: input.key,
    label: input.label,
    lineCount: 1,
    adjustmentIds: new Set([input.adjustmentId]),
    lossValue: input.value,
  })
}

function valueGroups(
  groups: Map<string, MutableValueGroup>,
  currency: string,
  limit?: number,
): InventoryLossValueGroup[] {
  const sorted = [...groups.values()].sort((left, right) => {
    const byValue = right.lossValue.comparedTo(left.lossValue)
    return byValue !== 0 ? byValue : left.label.localeCompare(right.label)
  })
  const selected = limit === undefined ? sorted : sorted.slice(0, limit)

  return selected.map((group) => ({
    key: group.key,
    label: group.label,
    lineCount: group.lineCount,
    adjustmentCount: group.adjustmentIds.size,
    lossValue: group.lossValue.toDecimalPlaces(2).toFixed(2),
    currency,
  }))
}

function productGroups(
  groups: Map<string, MutableProductGroup>,
  currency: string,
  limit: number,
): InventoryLossProductGroup[] {
  return [...groups.values()]
    .sort((left, right) => {
      const byValue = right.lossValue.comparedTo(left.lossValue)
      return byValue !== 0 ? byValue : left.label.localeCompare(right.label)
    })
    .slice(0, limit)
    .map((group) => ({
      key: group.key,
      label: group.label,
      sku: group.sku,
      unit: group.unit,
      lineCount: group.lineCount,
      adjustmentCount: group.adjustmentIds.size,
      quantityLost: group.quantityLost.toDecimalPlaces(3).toFixed(3),
      lossValue: group.lossValue.toDecimalPlaces(2).toFixed(2),
      currency,
    }))
}

function sourceLineLimit(options: InventoryLossReadOptions) {
  const limit = options.maximumSourceLines ?? DEFAULT_SOURCE_LINE_LIMIT
  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > MAX_SOURCE_LINE_LIMIT
  ) {
    throw new BusinessRuleError(
      `Inventory loss source limit must be between 1 and ${MAX_SOURCE_LINE_LIMIT}.`,
    )
  }
  return limit
}

export async function readInventoryLossSummary(
  rawInput: InventoryLossReadInput,
  options: InventoryLossReadOptions = {},
) {
  const input = inventoryLossReadInputSchema.parse(rawInput)
  const maximumSourceLines = sourceLineLimit(options)
  const generatedAt = (options.now ?? (() => new Date()))()

  if (Number.isNaN(generatedAt.getTime())) {
    throw new BusinessRuleError(
      "Inventory loss response time is invalid.",
    )
  }

  const client = options.client ?? db
  const organization = await client.organization.findUnique({
    where: { id: input.organizationId },
    select: {
      id: true,
      currency: true,
      timezone: true,
      deletedAt: true,
    },
  })

  if (!organization || organization.deletedAt) {
    throw new NotFoundError("Organization inventory loss scope was not found.")
  }

  const formatter = monthFormatter(organization.timezone)
  const adjustmentWhere: Prisma.StockAdjustmentWhereInput = {
    organizationId: organization.id,
    deletedAt: null,
    status: AdjustmentStatus.COMPLETED,
    type: { in: [...LOSS_ADJUSTMENT_TYPES] },
    adjustmentDate: {
      gte: input.from,
      lt: input.to,
    },
    ...(input.locationId
      ? { locationId: input.locationId }
      : input.locationIds
        ? { locationId: { in: input.locationIds } }
        : {}),
    ...(input.approverId ? { approvedById: input.approverId } : {}),
  }

  const queriedLines = await client.stockAdjustmentLine.findMany({
    where: {
      adjustedQuantity: { lt: 0 },
      ...(input.itemId ? { itemId: input.itemId } : {}),
      adjustment: { is: adjustmentWhere },
    },
    select: inventoryLossLineSelect,
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: maximumSourceLines + 1,
  })

  const truncated = queriedLines.length > maximumSourceLines
  const sourceLines = queriedLines
    .slice(0, maximumSourceLines)
    .filter(
      (line) =>
        line.adjustedQuantity.lt(0) &&
        line.adjustment.status === AdjustmentStatus.COMPLETED &&
        isLossAdjustmentType(line.adjustment.type),
    )

  const records: InventoryLossRecord[] = sourceLines
    .map((line) => {
      const value = lossValue(line)
      const approvingActor = line.adjustment.approvedBy
      return {
        id: line.id,
        adjustment: {
          id: line.adjustment.id,
          number: line.adjustment.adjustmentNumber,
          type: line.adjustment.type,
          category: lossCategory(line.adjustment.type),
          reason: line.adjustment.reason,
          occurredAt: line.adjustment.adjustmentDate.toISOString(),
          sourceCountSessionId:
            line.adjustment.sourceCountSessionId ?? null,
        },
        product: {
          id: line.item.id,
          sku: line.item.sku,
          name: itemName(line.item),
          unit: line.item.unit?.symbol ?? null,
        },
        location: line.adjustment.location,
        approvingActor: approvingActor
          ? {
              id: approvingActor.id,
              name: actorName(approvingActor),
            }
          : null,
        quantityLost: line.adjustedQuantity
          .abs()
          .toDecimalPlaces(3)
          .toFixed(3),
        unitCost:
          line.unitCost?.toDecimalPlaces(2).toFixed(2) ?? null,
        lossValue: value.toFixed(2),
        currency: organization.currency,
        evidence: {
          present: Boolean(
            line.evidenceHash ||
              line.adjustment.evidenceHash ||
              line.adjustment.documentHash,
          ),
          lineEvidenceHash: line.evidenceHash ?? null,
          adjustmentEvidenceHash:
            line.adjustment.evidenceHash ?? null,
          documentHash: line.adjustment.documentHash ?? null,
        },
      }
    })
    .sort((left, right) => {
      const byDate =
        new Date(right.adjustment.occurredAt).getTime() -
        new Date(left.adjustment.occurredAt).getTime()
      return byDate !== 0 ? byDate : right.id.localeCompare(left.id)
    })

  const products = new Map<string, MutableProductGroup>()
  const locations = new Map<string, MutableValueGroup>()
  const actors = new Map<string, MutableValueGroup>()
  const categories = new Map<string, MutableValueGroup>()
  const periods = new Map<string, MutableValueGroup>()
  const adjustmentIds = new Set<string>()
  let totalLossValue = new Prisma.Decimal(0)
  let evidenceLineCount = 0
  const valuationLineCount = sourceLines.filter(
    (line) => line.totalCost !== null || line.unitCost !== null,
  ).length
  let attributedLineCount = 0

  records.forEach((record) => {
    const value = new Prisma.Decimal(record.lossValue)
    const quantity = new Prisma.Decimal(record.quantityLost)
    const product = products.get(record.product.id)

    adjustmentIds.add(record.adjustment.id)
    totalLossValue = totalLossValue.plus(value)
    if (record.evidence.present) evidenceLineCount += 1
    if (record.approvingActor) attributedLineCount += 1

    if (product) {
      product.lineCount += 1
      product.adjustmentIds.add(record.adjustment.id)
      product.lossValue = product.lossValue.plus(value)
      product.quantityLost = product.quantityLost.plus(quantity)
    } else {
      products.set(record.product.id, {
        key: record.product.id,
        label: record.product.name,
        sku: record.product.sku,
        unit: record.product.unit,
        lineCount: 1,
        adjustmentIds: new Set([record.adjustment.id]),
        lossValue: value,
        quantityLost: quantity,
      })
    }

    addValueGroup(locations, {
      key: record.location.id,
      label: record.location.name,
      adjustmentId: record.adjustment.id,
      value,
    })
    addValueGroup(actors, {
      key: record.approvingActor?.id ?? "unattributed",
      label: record.approvingActor?.name ?? "Unattributed approval",
      adjustmentId: record.adjustment.id,
      value,
    })
    addValueGroup(categories, {
      key: record.adjustment.category,
      label: record.adjustment.category,
      adjustmentId: record.adjustment.id,
      value,
    })
    const period = monthKey(
      formatter,
      new Date(record.adjustment.occurredAt),
    )
    addValueGroup(periods, {
      key: period,
      label: period,
      adjustmentId: record.adjustment.id,
      value,
    })
  })

  const sourceCoverage = {
    source: "stock_adjustment_lines",
    state: truncated ? ("partial" as const) : ("complete" as const),
    ...(truncated
      ? {
          reason: `Source line limit ${maximumSourceLines} was reached; totals are partial.`,
        }
      : {}),
  }
  const evidenceCoverage = coverage(
    evidenceLineCount,
    records.length,
  )
  const valuationCoverage = coverage(
    valuationLineCount,
    records.length,
  )
  const attributionCoverage = coverage(
    attributedLineCount,
    records.length,
  )
  const completenessSources = [
    sourceCoverage,
    {
      source: "adjustment_evidence",
      state:
        evidenceLineCount === records.length
          ? ("complete" as const)
          : ("partial" as const),
      ...(evidenceLineCount === records.length
        ? {}
        : {
            reason: `${records.length - evidenceLineCount} loss line(s) lack an evidence or document hash.`,
          }),
    },
    {
      source: "inventory_valuation",
      state:
        valuationLineCount === records.length
          ? ("complete" as const)
          : ("partial" as const),
      ...(valuationLineCount === records.length
        ? {}
        : {
            reason: `${records.length - valuationLineCount} loss line(s) lack recorded valuation evidence.`,
          }),
    },
    {
      source: "approval_attribution",
      state:
        attributedLineCount === records.length
          ? ("complete" as const)
          : ("partial" as const),
      ...(attributedLineCount === records.length
        ? {}
        : {
            reason: `${records.length - attributedLineCount} loss line(s) lack an approving actor.`,
          }),
    },
  ]

  return {
    period: {
      from: input.from.toISOString(),
      to: input.to.toISOString(),
      boundary: "HALF_OPEN" as const,
      timezone: organization.timezone,
    },
    filters: {
      locationId: input.locationId ?? null,
      locationIds: input.locationIds ?? null,
      itemId: input.itemId ?? null,
      approverId: input.approverId ?? null,
    },
    summary: {
      lossLineCount: records.length,
      adjustmentCount: adjustmentIds.size,
      totalLossValue: totalLossValue
        .toDecimalPlaces(2)
        .toFixed(2),
      currency: organization.currency,
      complete: !truncated,
    },
    groups: {
      byProduct: productGroups(
        products,
        organization.currency,
        input.groupLimit,
      ),
      byLocation: valueGroups(
        locations,
        organization.currency,
        input.groupLimit,
      ),
      byApprovingActor: valueGroups(
        actors,
        organization.currency,
        input.groupLimit,
      ),
      byCategory: valueGroups(
        categories,
        organization.currency,
      ),
      byPeriod: valueGroups(periods, organization.currency).sort(
        (left, right) => left.key.localeCompare(right.key),
      ),
    },
    records: records.slice(0, input.detailLimit),
    coverage: {
      evidence: evidenceCoverage,
      valuation: valuationCoverage,
      approvingActor: attributionCoverage,
    },
    attribution: {
      dimension: "APPROVER" as const,
      meaning:
        "The actor approved the recorded adjustment; this is not evidence that the actor caused the loss.",
    },
    snapshot: {
      generatedAt: generatedAt.toISOString(),
      sourceLineLimit: maximumSourceLines,
      sourceLineCount: records.length,
      truncated,
    },
    completeness: {
      state: completenessSources.some(
        (source) => source.state === "partial",
      )
        ? ("partial" as const)
        : ("complete" as const),
      sources: completenessSources,
    },
  }
}
