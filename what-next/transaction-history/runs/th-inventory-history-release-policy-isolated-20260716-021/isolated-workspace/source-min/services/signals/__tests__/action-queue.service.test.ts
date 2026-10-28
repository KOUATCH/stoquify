import {
  assignActionItem,
  buildActionQueue,
  filterAssignmentCandidates,
  resolveActionItem,
} from "../action-queue.service"
import { buildBusinessSignalsFromFacts } from "../business-signal-rules.service"

function sampleSignals() {
  return buildBusinessSignalsFromFacts(
    [
      {
        organizationId: "org-1",
        signalType: "open_payment_suspense",
        moduleSlug: "payment_reconciliation",
        sourceModule: "payments",
        subjectType: "payment.suspense",
        subjectId: "suspense-1",
        payload: { amount: 400_000 },
      },
      {
        organizationId: "org-1",
        signalType: "stockout_risk",
        moduleSlug: "inventory",
        sourceModule: "inventory",
        subjectType: "inventory.level",
        subjectId: "item-1",
        payload: { count: 4 },
      },
      {
        organizationId: "org-2",
        signalType: "close_blocker",
        moduleSlug: "close_assurance",
        sourceModule: "close",
        subjectType: "close.run",
        subjectId: "close-1",
        payload: { count: 1 },
      },
    ],
    { now: "2026-06-20T08:00:00.000Z" },
  )
}

describe("Kontava action queue service", () => {
  it("filters action paths by tenant and permission", () => {
    const queue = buildActionQueue({
      organizationId: "org-1",
      signals: sampleSignals(),
      actorPermissions: ["inventory.read"],
      now: "2026-06-20T08:30:00.000Z",
    })

    expect(queue.signals).toHaveLength(1)
    expect(queue.signals[0].signalType).toBe("stockout_risk")
    expect(queue.filteredOutCount).toBe(1)
    expect(JSON.stringify(queue)).not.toContain("org-2")
  })

  it("blocks cross-tenant assignment and permission-mismatched assignees", () => {
    const queue = buildActionQueue({
      organizationId: "org-1",
      signals: sampleSignals(),
      actorPermissions: ["payments.reconciliation.read", "inventory.read"],
      now: "2026-06-20T08:30:00.000Z",
    })
    const item = queue.actionItems.find((entry) => entry.signalType === "open_payment_suspense")

    expect(item).toBeDefined()
    expect(() =>
      assignActionItem({
        organizationId: "org-2",
        item: item!,
        actorId: "manager-1",
        assigneeId: "finance-1",
      }),
    ).toThrow("active organization")

    expect(() =>
      assignActionItem({
        organizationId: "org-1",
        item: item!,
        actorId: "manager-1",
        assigneeId: "stock-1",
        candidate: {
          organizationId: "org-1",
          userId: "stock-1",
          displayName: "Stock User",
          permissions: ["inventory.read"],
        },
      }),
    ).toThrow("permission required")
  })

  it("emits assignment and resolution audit events without mutating tenants", () => {
    const queue = buildActionQueue({
      organizationId: "org-1",
      signals: sampleSignals(),
      actorPermissions: ["payments.reconciliation.read", "inventory.read"],
      now: "2026-06-20T08:30:00.000Z",
    })
    const item = queue.actionItems[0]

    const assigned = assignActionItem({
      organizationId: "org-1",
      item,
      actorId: "manager-1",
      assigneeId: "finance-1",
      candidate: {
        organizationId: "org-1",
        userId: "finance-1",
        displayName: "Finance User",
        permissions: [item.requiredPermission],
      },
      now: "2026-06-20T09:00:00.000Z",
    })
    const resolved = resolveActionItem({
      organizationId: "org-1",
      item: assigned.item,
      actorId: "finance-1",
      resolutionNote: "Suspense reviewed.",
      now: "2026-06-20T10:00:00.000Z",
    })

    expect(assigned.event).toMatchObject({
      organizationId: "org-1",
      eventType: "assigned",
      actorId: "manager-1",
      metadata: { assigneeId: "finance-1" },
    })
    expect(resolved.item.status).toBe("resolved")
    expect(resolved.event).toMatchObject({
      organizationId: "org-1",
      eventType: "resolved",
      actorId: "finance-1",
    })
  })

  it("filters assignment candidates by tenant, active state, and required permission", () => {
    const candidates = filterAssignmentCandidates({
      organizationId: "org-1",
      requiredPermission: "payments.reconciliation.read",
      candidates: [
        { organizationId: "org-1", userId: "finance-1", displayName: "Finance", permissions: ["payments.reconciliation.read"] },
        { organizationId: "org-1", userId: "stock-1", displayName: "Stock", permissions: ["inventory.read"] },
        { organizationId: "org-2", userId: "other-1", displayName: "Other", permissions: ["payments.reconciliation.read"] },
        { organizationId: "org-1", userId: "inactive-1", displayName: "Inactive", permissions: ["payments.reconciliation.read"], active: false },
      ],
    })

    expect(candidates).toEqual([
      expect.objectContaining({ userId: "finance-1" }),
    ])
  })
})
