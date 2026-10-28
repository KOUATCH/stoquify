import { createHash } from "node:crypto"

import type { SensitiveActionAuditClient } from "@/services/controls/sensitive-action.service"
import {
  streamInventoryMovementHistoryExport,
  type InventoryMovementHistoryResult,
  type InventoryMovementHistoryRow,
} from "@/services/inventory/inventory-read.service"

import {
  exportInventoryMovementHistory,
  INVENTORY_HISTORY_EXPORT_HARD_LIMIT,
} from "../inventory-history-export.service"

jest.mock("@/services/inventory/inventory-read.service", () => ({
  streamInventoryMovementHistoryExport: jest.fn(),
}))

const mockedStream = jest.mocked(streamInventoryMovementHistoryExport)

function row(id: string): InventoryMovementHistoryRow {
  return {
    id,
    type: "PURCHASE_RECEIPT",
    quantity: "2.0000",
    unitCost: "5.00",
    totalCost: "10.00",
    currency: "XAF",
    effectiveAt: "2026-07-14T09:00:00.000Z",
    recordedAt: "2026-07-14T09:00:01.000Z",
    timeProvenance: "explicit",
    item: { id: "item-1", name: "Rice", sku: "RICE-1", unit: "kg" },
    location: { id: "location-1", name: "Main warehouse" },
    actor: { id: "user-1", name: "Warehouse manager" },
    reference: { type: "PurchaseReceipt", id: "receipt-1", number: "GRN-1" },
    correction: { reversalOfTransactionId: null, reversedByTransactionId: null },
    notes: null,
    batchNumber: null,
    serialNumbers: [],
    expiryDate: null,
  }
}

function page(
  rows: InventoryMovementHistoryRow[],
  overrides: Partial<InventoryMovementHistoryResult> = {},
): InventoryMovementHistoryResult {
  return {
    rows,
    pageInfo: { nextCursor: null, hasMore: false },
    appliedFilters: {
      itemId: null,
      locationId: null,
      type: null,
      dateFrom: "2026-07-01",
      dateTo: "2026-07-14",
      effectiveAsOf: null,
      timezone: "Africa/Douala",
      pageSize: 100,
    },
    summary: {
      transactionCount: 2,
      totalInbound: "4.0000",
      totalOutbound: "0.0000",
      totalTransfers: "0.0000",
      totalAdjustments: "0.0000",
      totalReservations: "0.0000",
      netMovement: "4.0000",
      valueChange: "20.00",
      currency: "XAF",
      unit: "kg",
    },
    snapshot: {
      recordedThrough: "2026-07-15T09:00:00.000Z",
      generatedAt: "2026-07-15T09:00:00.000Z",
      timezone: "Africa/Douala",
    },
    completeness: {
      state: "complete",
      sources: [{ source: "inventory_transactions", state: "complete" }],
    },
    ...overrides,
  }
}

async function* pages(values: InventoryMovementHistoryResult[]) {
  for (const value of values) yield value
}

function auditClient() {
  const create = jest.fn().mockImplementation(async ({ data }) => ({
    id: `audit-${create.mock.calls.length}`,
    ...data,
  }))

  return {
    create,
    client: { auditLog: { create } } as unknown as SensitiveActionAuditClient,
  }
}

describe("inventory history export service", () => {
  beforeEach(() => {
    mockedStream.mockReset()
  })

  it("creates a tenant-bound, hashed manifest and immutable audit evidence", async () => {
    const audit = auditClient()
    mockedStream.mockImplementation(() =>
      pages([
        page([row("tx-1")], { pageInfo: { nextCursor: "signed-cursor", hasMore: true } }),
        page([row("tx-2")]),
      ]),
    )

    const result = await exportInventoryMovementHistory(
      {
        organizationId: "org-1",
        actorId: "controller-1",
        actorPermissions: ["reports.export", "inventory.levels.read"],
        lastAuthAt: "2026-07-15T08:59:00.000Z",
        now: "2026-07-15T09:00:00.000Z",
        filters: { dateFrom: "2026-07-01", dateTo: "2026-07-14" },
      },
      {
        auditClient: audit.client,
        exportIdFactory: () => "export-1",
      },
    )

    const expectedHash = `sha256:${createHash("sha256").update(result.content).digest("hex")}`
    const content = JSON.parse(result.content)

    expect(result.manifest).toMatchObject({
      exportId: "export-1",
      organizationId: "org-1",
      actorId: "controller-1",
      rowCount: 2,
      contentHash: expectedHash,
      watermarkId: "stoquify:inventory-history:org-1:export-1",
      completeness: { state: "complete" },
    })
    expect(content).toMatchObject({
      organizationId: "org-1",
      rowCount: 2,
      rows: [{ id: "tx-1" }, { id: "tx-2" }],
    })
    expect(result.manifest.requestFiltersHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(result.manifest.appliedFiltersHash).toMatch(/^sha256:[a-f0-9]{64}$/)
    expect(audit.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({ action: "INVENTORY_HISTORY_EXPORT_CONTROL" }),
      }),
    )
    expect(audit.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "INVENTORY_HISTORY_EXPORT_MANIFEST",
          changes: expect.objectContaining({ contentHash: expectedHash, rowCount: 2 }),
        }),
      }),
    )
  })

  it("audits and blocks an exporter who cannot read inventory history", async () => {
    const audit = auditClient()

    await expect(
      exportInventoryMovementHistory(
        {
          organizationId: "org-1",
          actorId: "reporter-1",
          actorPermissions: ["reports.export"],
          lastAuthAt: "2026-07-15T08:59:00.000Z",
          now: "2026-07-15T09:00:00.000Z",
        },
        { auditClient: audit.client, exportIdFactory: () => "export-denied" },
      ),
    ).rejects.toMatchObject({ code: "FORBIDDEN" })

    expect(mockedStream).not.toHaveBeenCalled()
    expect(audit.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "INVENTORY_HISTORY_EXPORT_CONTROL_DENIED",
          changes: expect.objectContaining({
            reasonCode: "MISSING_INVENTORY_HISTORY_READ_PERMISSION",
          }),
        }),
      }),
    )
  })

  it("rejects cursor-based and oversized direct exports before reading data", async () => {
    const audit = auditClient()

    await expect(
      exportInventoryMovementHistory(
        {
          organizationId: "org-1",
          actorId: "controller-1",
          actorPermissions: ["reports.export", "inventory.levels.read"],
          filters: { cursor: "untrusted-resume-cursor" },
        },
        { auditClient: audit.client },
      ),
    ).rejects.toThrow("fresh snapshot")

    await expect(
      exportInventoryMovementHistory(
        {
          organizationId: "org-1",
          actorId: "controller-1",
          actorPermissions: ["reports.export", "inventory.levels.read"],
          maximumRows: INVENTORY_HISTORY_EXPORT_HARD_LIMIT + 1,
        },
        { auditClient: audit.client },
      ),
    ).rejects.toThrow("between 1 and")

    expect(audit.create).not.toHaveBeenCalled()
    expect(mockedStream).not.toHaveBeenCalled()
  })

  it("stops without a manifest when page snapshot continuity is lost", async () => {
    const audit = auditClient()
    mockedStream.mockImplementation(() =>
      pages([
        page([row("tx-1")]),
        page([row("tx-2")], {
          snapshot: {
            recordedThrough: "2026-07-15T09:01:00.000Z",
            generatedAt: "2026-07-15T09:01:00.000Z",
            timezone: "Africa/Douala",
          },
        }),
      ]),
    )

    await expect(
      exportInventoryMovementHistory(
        {
          organizationId: "org-1",
          actorId: "controller-1",
          actorPermissions: ["reports.export", "inventory.levels.read"],
          lastAuthAt: "2026-07-15T08:59:00.000Z",
          now: "2026-07-15T09:00:00.000Z",
        },
        { auditClient: audit.client },
      ),
    ).rejects.toThrow("snapshot continuity")

    expect(audit.create).toHaveBeenCalledTimes(1)
    expect(audit.create).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ action: "INVENTORY_HISTORY_EXPORT_MANIFEST" }),
      }),
    )
  })
})
