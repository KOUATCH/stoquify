import {
  buildCanonicalTableExportIntent,
  canonicalTablePreferenceKey,
  canonicalTableQueryFingerprint,
  createCanonicalTableQuery,
  createCanonicalTableSelection,
  finalizeCanonicalTableExportRequest,
  formatCanonicalResultRange,
  formatCanonicalSelection,
  hydratePermissionSafeSavedView,
  loadCanonicalTablePreferences,
  parseCanonicalTableQuery,
  reconcileCanonicalTableSelection,
  resolveCanonicalTableState,
  saveCanonicalTablePreferences,
  toCanonicalTableServerQuery,
} from "../table-system-contract"
import {
  inventoryItemsTableContract,
  paymentReconciliationTableContract,
  purchaseOrdersTableContract,
} from "../pilot-table-contracts"

function memoryStorage() {
  const values = new Map<string, string>()
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  }
}

describe("canonical table contract", () => {
  it("sanitizes URL query input against the table allow-list", () => {
    const query = parseCanonicalTableQuery(
      inventoryItemsTableContract,
      "q=bolt&f.stock=low-stock&f.stock=not-a-real-state&f.secret=leak&sort=name:desc&sort=secret:asc&page=-2&pageSize=9999",
    )

    expect(query).toEqual({
      search: "bolt",
      filters: { stock: ["low-stock"] },
      sort: [{ id: "name", desc: true }],
      pageIndex: 0,
      pageSize: 10,
    })
  })

  it("produces a stable fingerprint independent of filter key order", () => {
    const left = createCanonicalTableQuery(purchaseOrdersTableContract, {
      filters: { status: ["DRAFT"], orderDateFrom: ["2026-08-01"] },
    })
    const right = createCanonicalTableQuery(purchaseOrdersTableContract, {
      filters: { orderDateFrom: ["2026-08-01"], status: ["DRAFT"] },
    })

    expect(canonicalTableQueryFingerprint(left)).toBe(canonicalTableQueryFingerprint(right))
  })

  it("projects sanitized URL state into the declared server pagination model", () => {
    const serverQuery = toCanonicalTableServerQuery(inventoryItemsTableContract, {
      search: "bolt",
      filters: { stock: ["low-stock"], secret: ["leak"] },
      sort: [{ id: "name", desc: false }, { id: "secret", desc: false }],
      pageIndex: 2,
      pageSize: 20,
    })

    expect(serverQuery.filters).toEqual({ stock: ["low-stock"] })
    expect(serverQuery.orderBy).toEqual([{ id: "name", desc: false }])
    expect(serverQuery.pagination).toEqual({ kind: "offset", offset: 40, limit: 20 })
  })

  it("versions and sanitizes persisted visibility, order, and density", () => {
    const storage = memoryStorage()
    const saved = saveCanonicalTablePreferences(
      inventoryItemsTableContract,
      {
        schemaVersion: 1,
        contractVersion: inventoryItemsTableContract.version,
        density: "compact",
        columnVisibility: { select: false, name: true, secret: true },
        columnOrder: ["secret", "name", "select"],
        updatedAt: "2026-08-28T10:00:00.000Z",
      },
      storage,
    )

    expect(canonicalTablePreferenceKey(inventoryItemsTableContract)).toContain("inventory.items")
    expect(saved.density).toBe("compact")
    expect(saved.columnVisibility.select).toBe(true)
    expect(saved.columnVisibility).not.toHaveProperty("secret")
    expect(saved.columnOrder).not.toContain("secret")
    expect(loadCanonicalTablePreferences(inventoryItemsTableContract, storage)).toEqual(saved)
  })

  it("rejects cross-tenant and under-permission saved views", () => {
    const candidate = {
      schemaVersion: 1,
      id: "view-1",
      tableId: inventoryItemsTableContract.id,
      ownerUserId: "user-1",
      organizationId: "org-1",
      name: "Low stock",
      visibility: "organization",
      requiredPermissions: ["inventory.items.read"],
      query: { search: "", filters: { stock: ["low-stock"] }, sort: [], pageSize: 10 },
      columns: { visible: ["name", "secret"], order: ["secret", "name"] },
      createdAt: "2026-08-28T10:00:00.000Z",
      updatedAt: "2026-08-28T10:00:00.000Z",
    }

    expect(
      hydratePermissionSafeSavedView(inventoryItemsTableContract, candidate, {
        organizationId: "org-2",
        userId: "user-1",
        permissions: new Set(["inventory.items.read"]),
      }),
    ).toBeNull()
    expect(
      hydratePermissionSafeSavedView(inventoryItemsTableContract, candidate, {
        organizationId: "org-1",
        userId: "user-1",
        permissions: new Set(),
      }),
    ).toBeNull()

    const hydrated = hydratePermissionSafeSavedView(inventoryItemsTableContract, candidate, {
      organizationId: "org-1",
      userId: "user-1",
      permissions: new Set(["inventory.items.read"]),
    })
    expect(hydrated?.columns.visible).toEqual(["name"])
    expect(hydrated?.columns.order).toEqual(["name"])
  })

  it("makes selection scope explicit and invalidates it when the query changes", () => {
    const query = createCanonicalTableQuery(purchaseOrdersTableContract, { search: "PO-42" })
    const selection = createCanonicalTableSelection("all-matching", query, ["excluded-1"], {
      kind: "estimated",
      total: 240,
    })

    expect(formatCanonicalSelection(selection, "en")).toBe("240 estimated matching rows selected")
    expect(reconcileCanonicalTableSelection(selection, query)).toBe(selection)
    expect(
      reconcileCanonicalTableSelection(
        selection,
        createCanonicalTableQuery(purchaseOrdersTableContract, { search: "PO-43" }),
      ),
    ).toBeNull()
  })

  it("uses truthful ranges and robust states", () => {
    expect(formatCanonicalResultRange(1, 25, { kind: "unknown" }, "en")).toBe("1-25 rows")
    expect(formatCanonicalResultRange(1, 25, { kind: "estimated", total: 400 }, "en")).toBe(
      "1-25 / estimated 400 rows",
    )
    expect(
      resolveCanonicalTableState({ rowCount: 0, hasActiveQuery: true, entitled: true }),
    ).toBe("no-results")
    expect(
      resolveCanonicalTableState({ rowCount: 100, hasActiveQuery: false, forbidden: true }),
    ).toBe("forbidden")
  })

  it("requires server authorization evidence to finalize an export", () => {
    const query = createCanonicalTableQuery(paymentReconciliationTableContract, {
      filters: { period: ["mtd"], locationId: ["location-1"] },
    })
    const intent = buildCanonicalTableExportIntent({
      contract: paymentReconciliationTableContract,
      organizationId: "org-1",
      query,
      selection: createCanonicalTableSelection("explicit", query, ["run-1"], { kind: "known", total: 1 }),
      columns: ["rail", "status", "actions", "unknown"],
      locale: "fr",
      timeZone: "Europe/Paris",
      format: "json",
      clientRequestId: "request-1",
      requestedAt: "2026-08-28T10:00:00.000Z",
    })

    expect(intent.columns).toEqual(["rail", "status"])
    expect(intent.organizationId).toBe("org-1")
    const request = finalizeCanonicalTableExportRequest(intent, {
      requesterUserId: "user-1",
      authorizationDecisionId: "decision-1",
      idempotencyKey: "export-1",
      serverAcceptedAt: "2026-08-28T10:00:01.000Z",
    })
    expect(request.requesterUserId).toBe("user-1")
    expect(request.authorizationDecisionId).toBe("decision-1")
  })
})
