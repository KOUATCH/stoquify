jest.mock("server-only", () => ({}))

jest.mock("@/prisma/db", () => ({
  db: {},
}))

import { composeAssuranceControlTowerData } from "../assurance-control-tower.service"

const generatedAt = "2026-06-21T10:00:00.000Z"

describe("assurance control tower service", () => {
  it("filters incidents by route permission and summarizes visible queues", () => {
    const data = composeAssuranceControlTowerData({
      organizationId: "org-1",
      generatedAt,
      actorPermissions: ["inventory.read"],
      incidentRows: [
        incidentRow({
          id: "ledger-incident",
          workflow: "INVENTORY",
          moduleSlug: "inventory",
          severity: "BLOCKING",
          definition: definition({
            workflow: "INVENTORY",
            moduleSlug: "inventory",
            requiredPermission: "inventory.read",
            ownerRole: "inventory_manager",
          }),
        }),
        incidentRow({
          id: "payment-incident",
          workflow: "PAYMENT_RECONCILIATION",
          severity: "HIGH",
          definition: definition({ requiredPermission: "payments.reconciliation.read", ownerRole: "finance_manager" }),
        }),
      ] as never,
      recentRuns: [],
      suppressed: 1,
      waived: 2,
      engineHealth: {
        state: "healthy",
        recentRunCount: 0,
        staleRunningCount: 0,
        failedRunCount: 0,
        pendingAlertCount: 0,
        failedAlertCount: 0,
        lastRunAt: null,
      },
    })

    expect(data.summary).toMatchObject({
      open: 1,
      blocking: 1,
      hiddenByPermission: 1,
      suppressed: 1,
      waived: 2,
    })
    expect(data.incidents).toHaveLength(1)
    expect(data.incidents[0]).toMatchObject({
      id: "ledger-incident",
      detailRoute: "/dashboard/assurance/control-tower/incidents/ledger-incident",
      requiredPermission: "inventory.read",
      moduleSlugNormalized: "inventory",
    })
    expect(data.severityBuckets).toEqual([
      expect.objectContaining({ key: "blocking", count: 1, tone: "danger" }),
    ])
  })

  it("surfaces engine health as blocked when stale runs or alert failures exist", () => {
    const data = composeAssuranceControlTowerData({
      organizationId: "org-1",
      generatedAt,
      actorPermissions: ["controls.audit.read"],
      incidentRows: [],
      recentRuns: [],
      suppressed: 0,
      waived: 0,
      engineHealth: {
        state: "blocked",
        recentRunCount: 2,
        staleRunningCount: 1,
        failedRunCount: 1,
        pendingAlertCount: 3,
        failedAlertCount: 1,
        lastRunAt: generatedAt,
      },
    })

    expect(data.engineHealth).toMatchObject({
      state: "blocked",
      staleRunningCount: 1,
      failedAlertCount: 1,
    })
  })
})

function definition(overrides: Record<string, unknown> = {}) {
  const now = new Date(generatedAt)
  return {
    id: "definition-1",
    checkKey: "ledger.posted_source_link.required",
    version: 1,
    workflow: "LEDGER",
    moduleSlug: "accounting",
    invariantName: "Posted source-backed journal entries keep evidence.",
    executionMode: "SCHEDULED_SCAN",
    defaultSeverity: "BLOCKING",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["journal_entries"],
    actionRoute: "/dashboard/accounting/journals",
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function incidentRow(overrides: Record<string, unknown> = {}) {
  const now = new Date(generatedAt)
  const def = (overrides.definition as Record<string, unknown> | undefined) ?? definition()
  return {
    id: "incident-1",
    organizationId: "org-1",
    definitionId: def.id,
    definition: def,
    checkRunId: "run-1",
    checkKey: def.checkKey,
    definitionVersion: 1,
    workflow: def.workflow,
    moduleSlug: def.moduleSlug,
    sourceType: "journal_entries",
    sourceId: "aggregate",
    sourceHash: "source-hash",
    fingerprint: "fingerprint-1",
    title: "Posted source evidence missing",
    detail: "Posted source-backed journal entries are missing accounting source links.",
    severity: "BLOCKING",
    status: "OPEN",
    evidenceGrade: "blocked",
    sourceLinks: [
      {
        sourceTable: "journal_entries",
        sourceId: "aggregate",
        label: "Posted source-backed journal entries",
        route: "/dashboard/accounting/journals",
      },
    ],
    assignedRole: "accountant",
    ownerId: null,
    dueAt: null,
    actionRoute: "/dashboard/accounting/journals",
    firstDetectedAt: now,
    lastDetectedAt: now,
    resolvedAt: null,
    resolvedById: null,
    reopenedAt: null,
    suppressedAt: null,
    suppressedById: null,
    closedAt: null,
    occurrenceCount: 1,
    resolutionNote: null,
    suppressionReason: null,
    metadata: {},
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}
