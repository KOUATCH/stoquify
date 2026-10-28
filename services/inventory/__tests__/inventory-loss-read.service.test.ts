import {
  AdjustmentStatus,
  AdjustmentType,
  Prisma,
} from "@prisma/client"

import {
  type InventoryLossReadOptions,
  readInventoryLossSummary,
} from "../inventory-loss-read.service"

jest.mock("@/prisma/db", () => ({ db: {} }))

const generatedAt = new Date("2026-03-02T09:00:00.000Z")

function decimal(value: string | number) {
  return new Prisma.Decimal(value)
}

function lossLine(overrides: Record<string, unknown> = {}) {
  return {
    id: "line-1",
    adjustedQuantity: decimal("-2.000"),
    unitCost: decimal("100.00"),
    totalCost: decimal("200.00"),
    evidenceHash: "sha256:line",
    item: {
      id: "item-1",
      sku: "COF-1",
      nameEn: "Coffee",
      nameFr: "Cafe",
      unit: { symbol: "bag" },
    },
    adjustment: {
      id: "adjustment-1",
      adjustmentNumber: "ADJ-001",
      type: AdjustmentType.DAMAGED,
      reason: "Water damage",
      status: AdjustmentStatus.COMPLETED,
      adjustmentDate: new Date("2026-01-15T09:00:00.000Z"),
      evidenceHash: "sha256:adjustment",
      documentHash: "sha256:document",
      sourceCountSessionId: null,
      location: { id: "location-1", name: "Main store" },
      approvedBy: {
        id: "user-1",
        firstName: "Awa",
        lastName: "Ndi",
      },
    },
    ...overrides,
  }
}

function createClient(input: {
  organization?: Record<string, unknown> | null
  lines?: unknown[]
} = {}) {
  const mocks = {
    organization: {
      findUnique: jest.fn().mockResolvedValue(
        input.organization === null
          ? null
          : {
              id: "org-1",
              currency: "XAF",
              timezone: "Africa/Douala",
              deletedAt: null,
              ...input.organization,
            },
      ),
    },
    stockAdjustmentLine: {
      findMany: jest.fn().mockResolvedValue(input.lines ?? []),
    },
  }

  return {
    mocks,
    client:
      mocks as unknown as NonNullable<
        InventoryLossReadOptions["client"]
      >,
  }
}

const period = {
  organizationId: "org-1",
  from: "2026-01-01T00:00:00.000Z",
  to: "2026-03-01T00:00:00.000Z",
}

describe("inventory loss analytics read model", () => {
  it("groups completed negative loss evidence by product, location, approver, category, and local month", async () => {
    const damaged = lossLine()
    const countVariance = lossLine({
      id: "line-2",
      adjustedQuantity: decimal("-1.000"),
      totalCost: decimal("100.00"),
      evidenceHash: "sha256:count-line",
      adjustment: {
        ...damaged.adjustment,
        id: "adjustment-2",
        adjustmentNumber: "ADJ-002",
        type: AdjustmentType.PHYSICAL_COUNT,
        reason: "Physical count variance CNT-001",
        sourceCountSessionId: "count-1",
        approvedBy: {
          id: "user-2",
          firstName: "Binta",
          lastName: "Kam",
        },
      },
    })
    const expired = lossLine({
      id: "line-3",
      adjustedQuantity: decimal("-3.000"),
      unitCost: decimal("50.00"),
      totalCost: null,
      item: {
        id: "item-2",
        sku: "MILK-1",
        nameEn: "Milk",
        nameFr: "Lait",
        unit: { symbol: "carton" },
      },
      adjustment: {
        ...damaged.adjustment,
        id: "adjustment-3",
        adjustmentNumber: "ADJ-003",
        type: AdjustmentType.EXPIRED,
        reason: "Expired batch",
        adjustmentDate: new Date("2026-01-31T23:30:00.000Z"),
        location: { id: "location-2", name: "Branch store" },
      },
    })
    const { client, mocks } = createClient({
      lines: [damaged, countVariance, expired],
    })

    const result = await readInventoryLossSummary(
      {
        ...period,
        locationId: "location-1",
        itemId: "item-1",
        approverId: "user-1",
      },
      { client, now: () => generatedAt },
    )

    expect(result.summary).toEqual({
      lossLineCount: 3,
      adjustmentCount: 3,
      totalLossValue: "450.00",
      currency: "XAF",
      complete: true,
    })
    expect(result.groups.byProduct).toEqual([
      expect.objectContaining({
        key: "item-1",
        quantityLost: "3.000",
        lossValue: "300.00",
      }),
      expect.objectContaining({
        key: "item-2",
        quantityLost: "3.000",
        lossValue: "150.00",
      }),
    ])
    expect(result.groups.byLocation).toEqual([
      expect.objectContaining({
        key: "location-1",
        lossValue: "300.00",
      }),
      expect.objectContaining({
        key: "location-2",
        lossValue: "150.00",
      }),
    ])
    expect(result.groups.byApprovingActor).toEqual([
      expect.objectContaining({
        key: "user-1",
        lossValue: "350.00",
      }),
      expect.objectContaining({
        key: "user-2",
        lossValue: "100.00",
      }),
    ])
    expect(result.groups.byCategory).toEqual([
      expect.objectContaining({
        key: "DAMAGED",
        lossValue: "200.00",
      }),
      expect.objectContaining({
        key: "EXPIRED",
        lossValue: "150.00",
      }),
      expect.objectContaining({
        key: "COUNT_VARIANCE",
        lossValue: "100.00",
      }),
    ])
    expect(result.groups.byPeriod).toEqual([
      expect.objectContaining({
        key: "2026-01",
        lossValue: "300.00",
      }),
      expect.objectContaining({
        key: "2026-02",
        lossValue: "150.00",
      }),
    ])
    expect(result.coverage).toEqual({
      evidence: { covered: 3, total: 3, percent: 100 },
      valuation: { covered: 3, total: 3, percent: 100 },
      approvingActor: { covered: 3, total: 3, percent: 100 },
    })
    expect(result.attribution.meaning).toContain(
      "not evidence that the actor caused the loss",
    )
    expect(result.completeness.state).toBe("complete")
    expect(JSON.parse(JSON.stringify(result))).toEqual(result)

    expect(mocks.stockAdjustmentLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          adjustedQuantity: { lt: 0 },
          itemId: "item-1",
          adjustment: {
            is: expect.objectContaining({
              organizationId: "org-1",
              deletedAt: null,
              status: AdjustmentStatus.COMPLETED,
              adjustmentDate: {
                gte: new Date(period.from),
                lt: new Date(period.to),
              },
              locationId: "location-1",
              approvedById: "user-1",
            }),
          },
        },
        take: 5_001,
      }),
    )
  })

  it("defensively excludes positive lines and generic corrections from loss claims", async () => {
    const positiveWriteOff = lossLine({
      id: "positive",
      adjustedQuantity: decimal("2.000"),
    })
    const genericCorrection = lossLine({
      id: "correction",
      adjustedQuantity: decimal("-2.000"),
      adjustment: {
        ...lossLine().adjustment,
        id: "adjustment-correction",
        type: AdjustmentType.CORRECTION,
      },
    })
    const recordedTheft = lossLine({
      id: "recorded-theft",
      adjustment: {
        ...lossLine().adjustment,
        id: "adjustment-theft",
        type: AdjustmentType.THEFT,
      },
    })
    const { client } = createClient({
      lines: [positiveWriteOff, genericCorrection, recordedTheft],
    })

    const result = await readInventoryLossSummary(period, {
      client,
      now: () => generatedAt,
    })

    expect(result.summary.lossLineCount).toBe(1)
    expect(result.records[0].adjustment.category).toBe(
      "RECORDED_THEFT",
    )
    expect(result.groups.byCategory[0].key).toBe("RECORDED_THEFT")
  })

  it("marks missing evidence, valuation, and approving actor as partial without inventing values", async () => {
    const incomplete = lossLine({
      unitCost: null,
      totalCost: null,
      evidenceHash: null,
      adjustment: {
        ...lossLine().adjustment,
        evidenceHash: null,
        documentHash: null,
        approvedBy: null,
      },
    })
    const { client } = createClient({ lines: [incomplete] })

    const result = await readInventoryLossSummary(period, {
      client,
      now: () => generatedAt,
    })

    expect(result.records[0]).toMatchObject({
      approvingActor: null,
      unitCost: null,
      lossValue: "0.00",
      evidence: { present: false },
    })
    expect(result.groups.byApprovingActor[0]).toMatchObject({
      key: "unattributed",
      label: "Unattributed approval",
    })
    expect(result.coverage).toEqual({
      evidence: { covered: 0, total: 1, percent: 0 },
      valuation: { covered: 0, total: 1, percent: 0 },
      approvingActor: { covered: 0, total: 1, percent: 0 },
    })
    expect(result.completeness.state).toBe("partial")
    expect(
      result.completeness.sources.filter(
        (source) => source.state === "partial",
      ),
    ).toHaveLength(3)
  })

  it("bounds source and detail rows and reports partial totals when the source cap is reached", async () => {
    const lines = [
      lossLine({ id: "line-1" }),
      lossLine({
        id: "line-2",
        adjustment: {
          ...lossLine().adjustment,
          id: "adjustment-2",
        },
      }),
      lossLine({
        id: "line-3",
        adjustment: {
          ...lossLine().adjustment,
          id: "adjustment-3",
        },
      }),
    ]
    const { client, mocks } = createClient({ lines })

    const result = await readInventoryLossSummary(
      { ...period, detailLimit: 1 },
      {
        client,
        now: () => generatedAt,
        maximumSourceLines: 2,
      },
    )

    expect(mocks.stockAdjustmentLine.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    )
    expect(result.summary).toMatchObject({
      lossLineCount: 2,
      totalLossValue: "400.00",
      complete: false,
    })
    expect(result.records).toHaveLength(1)
    expect(result.snapshot).toMatchObject({
      sourceLineLimit: 2,
      sourceLineCount: 2,
      truncated: true,
    })
    expect(result.completeness.state).toBe("partial")
    expect(result.completeness.sources[0]).toMatchObject({
      source: "stock_adjustment_lines",
      state: "partial",
    })
  })

  it.each([
    {
      name: "empty period",
      input: {
        ...period,
        to: period.from,
      },
    },
    {
      name: "reversed period",
      input: {
        ...period,
        from: period.to,
        to: period.from,
      },
    },
    {
      name: "period over 366 days",
      input: {
        ...period,
        from: "2025-01-01T00:00:00.000Z",
        to: "2026-03-01T00:00:00.000Z",
      },
    },
  ])("rejects $name before reading tenant data", async ({ input }) => {
    const { client, mocks } = createClient()

    await expect(
      readInventoryLossSummary(input, { client }),
    ).rejects.toThrow()

    expect(mocks.organization.findUnique).not.toHaveBeenCalled()
    expect(mocks.stockAdjustmentLine.findMany).not.toHaveBeenCalled()
  })

  it("normalizes trusted multi-location scope and rejects mixed location authority", async () => {
    const allowed = createClient()

    const result = await readInventoryLossSummary(
      {
        ...period,
        locationIds: ["location-b", "location-a", "location-b"],
      },
      {
        client: allowed.client,
        now: () => generatedAt,
      },
    )

    expect(result.filters).toMatchObject({
      locationId: null,
      locationIds: ["location-a", "location-b"],
    })
    expect(
      allowed.mocks.stockAdjustmentLine.findMany,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          adjustment: {
            is: expect.objectContaining({
              locationId: {
                in: ["location-a", "location-b"],
              },
            }),
          },
        }),
      }),
    )

    const conflicted = createClient()
    await expect(
      readInventoryLossSummary(
        {
          ...period,
          locationId: "location-a",
          locationIds: ["location-a"],
        },
        { client: conflicted.client },
      ),
    ).rejects.toThrow(
      "locationId and locationIds cannot be used together",
    )
    expect(
      conflicted.mocks.organization.findUnique,
    ).not.toHaveBeenCalled()
  })

  it("rejects a missing or deleted organization before reading loss lines", async () => {
    const missing = createClient({ organization: null })
    const deleted = createClient({
      organization: { deletedAt: new Date() },
    })

    await expect(
      readInventoryLossSummary(period, { client: missing.client }),
    ).rejects.toThrow(
      "Organization inventory loss scope was not found",
    )
    await expect(
      readInventoryLossSummary(period, { client: deleted.client }),
    ).rejects.toThrow(
      "Organization inventory loss scope was not found",
    )

    expect(
      missing.mocks.stockAdjustmentLine.findMany,
    ).not.toHaveBeenCalled()
    expect(
      deleted.mocks.stockAdjustmentLine.findMany,
    ).not.toHaveBeenCalled()
  })

  it("rejects invalid source limits and organization timezones", async () => {
    const valid = createClient()
    const invalidTimezone = createClient({
      organization: { timezone: "Not/A_Timezone" },
    })

    await expect(
      readInventoryLossSummary(period, {
        client: valid.client,
        maximumSourceLines: 0,
      }),
    ).rejects.toThrow("source limit must be between")

    await expect(
      readInventoryLossSummary(period, {
        client: invalidTimezone.client,
      }),
    ).rejects.toThrow(
      "Organization timezone is invalid for inventory loss reporting",
    )

    expect(
      invalidTimezone.mocks.stockAdjustmentLine.findMany,
    ).not.toHaveBeenCalled()
  })
})
