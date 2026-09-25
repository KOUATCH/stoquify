import { buildBusinessSignalsFromFacts } from "../business-signal-rules.service"
import { assignActionItem, buildActionQueue, filterAssignmentCandidates } from "../action-queue.service"
import { createActionLinkFromActionItem, createActionLinkFromSignal, createSignalInsight } from "@/services/bi/bi-evidence-adapter.service"

const now = "2026-09-19T08:00:00Z"
const signals = buildBusinessSignalsFromFacts([{
  organizationId: "org", signalType: "payroll_exposure", moduleSlug: "payroll",
  sourceModule: "payroll", subjectType: "payroll.employee_balance", subjectId: "balance",
  requiredPermission: "payments.reconciliation.read", actionPath: "/dashboard/payroll/payments", payload: {},
}], { now })
const permissions = ["payments.reconciliation.read", "payroll.command.read"]

it("preserves the separate finance authority for aggregate profitability destinations", () => {
  const aggregateSignals = buildBusinessSignalsFromFacts([{ organizationId: "org", signalType: "payroll_exposure", moduleSlug: "payroll", sourceModule: "payroll", subjectType: "payroll.branch_allocation", subjectId: "branch", requiredPermission: "finance.reports.read", actionPath: "/dashboard/finance/profitability", payload: {} }], { now })
  const queue = buildActionQueue({ organizationId: "org", signals: aggregateSignals, actorPermissions: ["finance.reports.read"], now })
  expect(queue.actionItems).toHaveLength(1)
  expect(queue.actionItems[0]).not.toHaveProperty("additionalRequiredPermissions")
})

it.each([[], [permissions[0]], [permissions[1]], ["payroll.payments.reconcile", "payroll.runs.review"]].map(actorPermissions => ({ actorPermissions })))("withholds payroll payment actions without every destination read grant: $actorPermissions", ({ actorPermissions }) => {
  expect(buildActionQueue({ organizationId: "org", signals, actorPermissions, now }).actionItems).toEqual([])
})

it("preserves all read requirements and rejects assignees who cannot read the underlying evidence", () => {
  const [item] = buildActionQueue({ organizationId: "org", signals, actorPermissions: permissions, now }).actionItems
  expect(item).toMatchObject({ requiredPermission: permissions[0], additionalRequiredPermissions: [permissions[1]] })
  expect(createActionLinkFromActionItem({ item, moduleSlug: "payroll" })).toMatchObject({ requiredPermission: permissions[0], additionalRequiredPermissions: [permissions[1]] })
  expect(createActionLinkFromSignal(signals[0])).toMatchObject({ requiredPermission: permissions[0], additionalRequiredPermissions: [permissions[1]] })
  expect(createSignalInsight({ signal: signals[0] }).drillThrough).toMatchObject({ requiredPermission: permissions[0], additionalRequiredPermissions: [permissions[1]] })
  const candidates = permissions.map((permission, index) => ({ organizationId: "org", userId: `partial-${index}`, displayName: "Partial reader", permissions: [permission] }))
  const full = { organizationId: "org", userId: "full", displayName: "Full reader", permissions }
  expect(filterAssignmentCandidates({ organizationId: "org", requiredPermission: item.requiredPermission, additionalRequiredPermissions: item.additionalRequiredPermissions, candidates: [...candidates, full] })).toEqual([full])
  for (const candidate of candidates) {
    expect(() => assignActionItem({ organizationId: "org", item, actorId: "owner", assigneeId: candidate.userId, candidate, now })).toThrow("permission required")
  }
  expect(assignActionItem({ organizationId: "org", item, actorId: "owner", assigneeId: full.userId, candidate: full, now }).item.assigneeId).toBe(full.userId)
})
