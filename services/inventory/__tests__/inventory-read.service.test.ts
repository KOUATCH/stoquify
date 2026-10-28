import {
  InventoryTransactionTimeProvenance,
  Prisma,
  TransactionType,
} from "@prisma/client"

import { createHistoryCursorCodec } from "@/services/history/transaction-history-cursor"
import { HistoryCursorError } from "@/services/history/transaction-history.types"

import {
  InventoryHistoryExportLimitError,
  type InventoryMovementHistoryOptions,
  readInventoryMovementHistory,
  streamInventoryMovementHistoryExport,
} from "../inventory-read.service"

jest.mock("@/prisma/db", () => ({ db: {} }))

const codec = createHistoryCursorCodec(
  "inventory-history-test-secret-with-at-least-32-characters",
)
const firstRequestTime = new Date("2026-07-15T10:00:00.000Z")

function decimal(value: string | number): Prisma.Decimal {
  return new Prisma.Decimal(value)
}

function movement(overrides: Record<string, unknown> = {}) {
  return {
    id: "movement-1",
    type: TransactionType.SALE,
    quantity: decimal("-2.000"),
    unitCost: decimal("100.00"),
    totalCost: decimal("200.00"),
    balanceAfter: decimal("8.000"),
    effectiveAt: new Date("2026-07-14T09:00:00.000Z"),
    recordedAt: new Date("2026-07-14T09:01:00.000Z"),
    timeProvenance: InventoryTransactionTimeProvenance.EXPLICIT_SOURCE_TIME,
    notes: null,
    referenceType: "SALES_ORDER",
    referenceId: "sale-1",
    referenceNumber: "SO-0001",
    batchNumber: null,
    serialNumbers: [],
    expiryDate: null,
    reversalOfTransactionId: null,
    reversedByTransaction: null,
    item: {
      id: "item-1",
      nameEn: "Coffee",
      nameFr: "Cafe",
      sku: "COF-1",
      unit: { symbol: "pcs" },
    },
    location: { id: "location-1", name: "Main store" },
    createdBy: { id: "user-1", firstName: "Awa", lastName: "Ndi" },
    ...overrides,
  }
}

function group(
  type: TransactionType,
  quantity: string,
  totalCost: string,
  count = 1,
) {
  return {
    type,
    _count: { _all: count },
    _sum: {
      quantity: decimal(quantity),
      totalCost: decimal(totalCost),
    },
  }
}

function createClient(input: {
  transactions?: unknown[][]
  groups?: unknown[]
  legacyTimestampCount?: number
  itemUnit?: string | null
} = {}) {
  const findMany = jest.fn()
  for (const result of input.transactions ?? [[]]) findMany.mockResolvedValueOnce(result)

  const mocks = {
    organization: {
      findUnique: jest.fn().mockResolvedValue({
        id: "org-1",
        timezone: "Africa/Douala",
        currency: "XAF",
        deletedAt: null,
      }),
    },
    item: {
      findFirst: jest.fn().mockResolvedValue({
        id: "item-1",
        unit: input.itemUnit === null ? null : { symbol: input.itemUnit ?? "pcs" },
      }),
    },
    inventoryTransaction: {
      findMany,
      groupBy: jest.fn().mockResolvedValue(input.groups ?? []),
      count: jest.fn().mockResolvedValue(input.legacyTimestampCount ?? 0),
    },
  }

  return {
    mocks,
    client: mocks as unknown as NonNullable<InventoryMovementHistoryOptions["client"]>,
  }
}

describe("inventory movement history read model", () => {
  it("uses a frozen cutoff and a strict tuple cursor across equal-time pages", async () => {
    const equalTimeRows = Array.from({ length: 26 }, (_, index) =>
      movement({
        id: `movement-${String(99 - index).padStart(3, "0")}`,
        effectiveAt: new Date("2026-07-14T09:00:00.000Z"),
        recordedAt: new Date("2026-07-14T09:01:00.000Z"),
      }),
    )
    const backdatedButLaterRecorded = movement({
      id: "movement-newly-recorded",
      effectiveAt: new Date("2026-07-13T09:00:00.000Z"),
      recordedAt: new Date("2026-07-15T10:30:00.000Z"),
    })
    const olderRow = movement({
      id: "movement-older",
      effectiveAt: new Date("2026-07-12T09:00:00.000Z"),
      recordedAt: new Date("2026-07-12T09:01:00.000Z"),
    })
    const { client, mocks } = createClient({
      transactions: [equalTimeRows, [olderRow]],
      groups: [group(TransactionType.SALE, "-52.000", "5200.00", 26)],
    })
    let requestTime = firstRequestTime
    const options = { client, cursorCodec: codec, now: () => requestTime }

    const first = await readInventoryMovementHistory(
      { organizationId: "org-1", filters: { pageSize: 25 } },
      options,
    )
    requestTime = new Date("2026-07-15T11:00:00.000Z")
    const second = await readInventoryMovementHistory(
      {
        organizationId: "org-1",
        filters: { pageSize: 25, cursor: first.pageInfo.nextCursor! },
      },
      options,
    )

    expect(first.rows).toHaveLength(25)
    expect(first.pageInfo.hasMore).toBe(true)
    expect(second.rows.map((row) => row.id)).toEqual([olderRow.id])
    expect(second.rows.map((row) => row.id)).not.toContain(backdatedButLaterRecorded.id)
    expect(second.snapshot.recordedThrough).toBe(first.snapshot.recordedThrough)
    expect(second.snapshot.generatedAt).toBe("2026-07-15T11:00:00.000Z")

    const firstQuery = mocks.inventoryTransaction.findMany.mock.calls[0][0]
    expect(firstQuery.orderBy).toEqual([
      { effectiveAt: "desc" },
      { recordedAt: "desc" },
      { id: "desc" },
    ])
    expect(firstQuery.take).toBe(26)

    const secondQuery = mocks.inventoryTransaction.findMany.mock.calls[1][0]
    expect(secondQuery.where.AND[0].recordedAt.lte).toEqual(firstRequestTime)
    expect(secondQuery.where.AND[1]).toEqual({
      OR: [
        { effectiveAt: { lt: new Date("2026-07-14T09:00:00.000Z") } },
        {
          effectiveAt: new Date("2026-07-14T09:00:00.000Z"),
          recordedAt: { lt: new Date("2026-07-14T09:01:00.000Z") },
        },
        {
          effectiveAt: new Date("2026-07-14T09:00:00.000Z"),
          recordedAt: new Date("2026-07-14T09:01:00.000Z"),
          id: { lt: "movement-075" },
        },
      ],
    })
  })

  it("allows a trusted worker to bootstrap page one at an earlier frozen cutoff", async () => {
    const frozenAt = new Date("2026-07-15T10:00:00.000Z")
    const generatedAt = new Date("2026-07-15T11:00:00.000Z")
    const { client, mocks } = createClient({ transactions: [[movement()]] })

    const result = await readInventoryMovementHistory(
      { organizationId: "org-1", filters: { pageSize: 25 } },
      { client, cursorCodec: codec, now: () => generatedAt, recordedThrough: frozenAt },
    )

    expect(result.snapshot).toMatchObject({
      recordedThrough: frozenAt.toISOString(),
      generatedAt: generatedAt.toISOString(),
    })
    expect(mocks.inventoryTransaction.findMany.mock.calls[0][0].where.recordedAt.lte).toEqual(
      frozenAt,
    )
    expect(mocks.inventoryTransaction.groupBy.mock.calls[0][0].where.recordedAt.lte).toEqual(
      frozenAt,
    )
  })

  it("rejects signed cursors from another tenant or normalized filter scope", async () => {
    const rows = Array.from({ length: 26 }, (_, index) =>
      movement({ id: `movement-${String(index).padStart(3, "0")}` }),
    )
    const { client, mocks } = createClient({ transactions: [rows] })
    const first = await readInventoryMovementHistory(
      { organizationId: "org-1", filters: { pageSize: 25 } },
      { client, cursorCodec: codec, now: () => firstRequestTime },
    )
    const originalPayload = codec.decode(first.pageInfo.nextCursor!)

    await expect(
      readInventoryMovementHistory(
        {
          organizationId: "org-1",
          filters: {
            pageSize: 25,
            cursor: codec.encode({ ...originalPayload, tenantId: "org-2" }),
          },
        },
        { client, cursorCodec: codec, now: () => firstRequestTime },
      ),
    ).rejects.toBeInstanceOf(HistoryCursorError)

    await expect(
      readInventoryMovementHistory(
        {
          organizationId: "org-1",
          filters: {
            locationId: "location-2",
            pageSize: 25,
            cursor: first.pageInfo.nextCursor!,
          },
        },
        { client, cursorCodec: codec, now: () => firstRequestTime },
      ),
    ).rejects.toThrow("does not match")
    expect(mocks.inventoryTransaction.findMany).toHaveBeenCalledTimes(1)
  })

  it("shares one tenant-timezone predicate across rows and exact summary", async () => {
    const sale = movement()
    const { client, mocks } = createClient({
      transactions: [[sale]],
      groups: [group(TransactionType.SALE, "-3.000", "300.00", 2)],
      itemUnit: "pcs",
    })

    const result = await readInventoryMovementHistory(
      {
        organizationId: "org-1",
        filters: {
          itemId: "item-1",
          type: TransactionType.SALE,
          dateFrom: "2026-07-01",
          dateTo: "2026-07-01",
          effectiveAsOf: "2026-07-10T12:00:00.000Z",
          pageSize: 50,
        },
      },
      { client, cursorCodec: codec, now: () => firstRequestTime },
    )

    const rowWhere = mocks.inventoryTransaction.findMany.mock.calls[0][0].where
    const summaryWhere = mocks.inventoryTransaction.groupBy.mock.calls[0][0].where
    expect(summaryWhere).toEqual(rowWhere)
    expect(rowWhere).toEqual({
      organizationId: "org-1",
      recordedAt: { lte: firstRequestTime },
      itemId: "item-1",
      type: TransactionType.SALE,
      effectiveAt: {
        gte: new Date("2026-06-30T23:00:00.000Z"),
        lt: new Date("2026-07-01T23:00:00.000Z"),
        lte: new Date("2026-07-10T12:00:00.000Z"),
      },
    })
    expect(result.appliedFilters.timezone).toBe("Africa/Douala")
    expect(result.rows[0]).toMatchObject({
      quantity: "-2.000",
      unitCost: "100.00",
      totalCost: "200.00",
      currency: "XAF",
      actor: { id: "user-1", name: "Awa Ndi" },
    })
    expect(result.summary).toEqual({
      transactionCount: 2,
      totalInbound: "0.000",
      totalOutbound: "3.000",
      totalTransfers: "0.000",
      totalAdjustments: "0.000",
      totalReservations: "0.000",
      netMovement: "-3.000",
      valueChange: "-300.00",
      currency: "XAF",
      unit: "pcs",
    })
    expect(result.completeness.state).toBe("complete")
  })

  it("withholds mixed-unit quantity totals and labels legacy time as partial", async () => {
    const legacyMovement = movement({
      timeProvenance:
        InventoryTransactionTimeProvenance.LEGACY_CREATED_AT_APPROXIMATION,
    })
    const { client } = createClient({
      transactions: [[legacyMovement]],
      groups: [group(TransactionType.SALE, "-2.000", "200.00")],
      legacyTimestampCount: 1,
    })

    const result = await readInventoryMovementHistory(
      { organizationId: "org-1" },
      { client, cursorCodec: codec, now: () => firstRequestTime },
    )

    expect(result.summary).toMatchObject({
      transactionCount: 1,
      totalInbound: null,
      totalOutbound: null,
      totalTransfers: null,
      totalAdjustments: null,
      totalReservations: null,
      netMovement: null,
      valueChange: "-200.00",
      unit: null,
    })
    expect(result.completeness).toEqual({
      state: "partial",
      sources: [
        {
          source: "inventory_transactions.timeProvenance",
          state: "partial",
          reason: "1 row(s) use legacy created-time approximation.",
        },
        {
          source: "inventory_transactions.quantity",
          state: "partial",
          reason:
            "Quantity totals are withheld because the result is not scoped to one known unit.",
        },
      ],
    })
  })

  it("rejects client enum drift before querying tenant data", async () => {
    const { client, mocks } = createClient()

    await expect(
      readInventoryMovementHistory(
        {
          organizationId: "org-1",
          filters: { type: "RETURN_FROM_CUSTOMER" as TransactionType },
        },
        { client, cursorCodec: codec, now: () => firstRequestTime },
      ),
    ).rejects.toBeInstanceOf(HistoryCursorError)
    expect(mocks.organization.findUnique).not.toHaveBeenCalled()
    expect(mocks.inventoryTransaction.findMany).not.toHaveBeenCalled()
  })

  it("streams keyset pages with one cutoff and blocks oversized synchronous exports", async () => {
    const firstPage = Array.from({ length: 101 }, (_, index) =>
      movement({
        id: `movement-${String(999 - index).padStart(3, "0")}`,
        effectiveAt: new Date("2026-07-14T09:00:00.000Z"),
        recordedAt: new Date("2026-07-14T09:01:00.000Z"),
      }),
    )
    const finalPage = [
      movement({
        id: "movement-final",
        effectiveAt: new Date("2026-07-13T09:00:00.000Z"),
      }),
    ]
    const { client, mocks } = createClient({ transactions: [firstPage, finalPage] })
    let now = firstRequestTime
    const generator = streamInventoryMovementHistoryExport(
      { organizationId: "org-1", filters: { itemId: "item-1" } },
      { client, cursorCodec: codec, now: () => now, maximumRows: 150 },
    )

    const first = await generator.next()
    now = new Date("2026-07-15T11:00:00.000Z")
    const second = await generator.next()
    const done = await generator.next()

    expect(first.value.rows).toHaveLength(100)
    expect(second.value.rows).toHaveLength(1)
    expect(done.done).toBe(true)
    expect(second.value.snapshot.recordedThrough).toBe(
      first.value.snapshot.recordedThrough,
    )
    expect(
      mocks.inventoryTransaction.findMany.mock.calls[1][0].where.AND[0].recordedAt.lte,
    ).toEqual(firstRequestTime)

    const oversized = createClient({ transactions: [firstPage] })
    const oversizedGenerator = streamInventoryMovementHistoryExport(
      { organizationId: "org-1", filters: { itemId: "item-1" } },
      {
        client: oversized.client,
        cursorCodec: codec,
        now: () => firstRequestTime,
        maximumRows: 100,
      },
    )
    await expect(oversizedGenerator.next()).rejects.toBeInstanceOf(
      InventoryHistoryExportLimitError,
    )
  })
})
