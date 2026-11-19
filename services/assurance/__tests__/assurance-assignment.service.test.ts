jest.mock("server-only", () => ({}))
jest.mock("@/lib/logger", () => ({logger: {error: jest.fn()}}))
jest.mock("@/prisma/db", () => ({db: {}}))
import type { Prisma } from "@prisma/client"
import { assignAssuranceIncidentInTx } from "../assurance-assignment.service"
import { assuranceAssignmentRevision } from "../assurance-assignment-revision"

const expiry = new Date("2099-01-01T00:00:00Z")
function record() {
  return {id: "incident-1", organizationId: "org-1", status: "OPEN", ownerId: null, assignedRole: "finance",
    dueAt: new Date("2026-10-30T00:00:00Z"), updatedAt: new Date("2026-10-24T12:00:00Z"), sourceHash: "source-1",
    workflow: "PAYMENT_RECONCILIATION", moduleSlug: "finance", occurrenceCount: 1, fingerprint: "fingerprint-1", checkKey: "payment_reconciliation.unsigned_run_sla.visible", sourceType: "reconciliation_runs", sourceId: "unsigned_ready_runs",
    definition: {moduleSlug: "finance", actionRoute: "/dashboard/finance/reconciliation", requiredPermission: "payments.reconciliation.read", ownerRole: "finance"}}
}
function fixture() {
  let current = record()
  const events: any[] = []
  const users = ["actor", "owner"].map(id => ({id, organizationId: "org-1", isActive: true, isVerified: true, emailVerified: false, isLocked: false, lockedUntil: null}))
  const roles = [{id: "role", code: "admin", organizationId: "org-1", permissions: ["controls.manage", "controls.audit.read", "payments.reconciliation.read"]}]
  const memberships = users.map(u => ({userId: u.id, roleId: "role"}))
  const sessions = [{id: "session", userId: "actor", expiresAt: expiry}]
  let organizations = [{id: "org-1", requestedModules: [] as string[]}]
  const moduleState: {configuration: any; grants: any[]} = {configuration: null, grants: []}
  const tx = {
    $queryRaw: jest.fn(async (sql: Prisma.Sql) => {
      const text = sql.strings.join("?")
      if (text.includes('FROM "organizations"')) return organizations
      if (text.includes('FROM "users"')) return users
      if (text.includes('FROM "roles"')) return roles
      if (text.includes('FROM "_UserRoles"')) return memberships
      if (text.includes('FROM "sessions"')) return sessions
      if (text.includes('FROM "workflow_assurance_incidents"')) return [{id: current.id}]
      return [{id: "definition"}]
    }),
    workflowAssuranceIncident: {
      findFirst: jest.fn(async () => current),
      update: jest.fn(async ({data}: any) => current = {...current, ...data, updatedAt: new Date(current.updatedAt.getTime() + 1)}),
    },
    workflowAssuranceIncidentEvent: {
      findFirst: jest.fn(async ({where}: any) => events.find(e => e.metadata.assignmentRequestId === where.metadata.equals) ?? null),
      create: jest.fn(async ({data}: any) => {events.push(data); return data}),
    },
    tenantModuleConfiguration: {findUnique: jest.fn(async () => moduleState.configuration)},
    tenantModuleGrant: {findMany: jest.fn(async () => moduleState.grants)},
    tenantModuleConfigurationCommand: {count: jest.fn(async () => 0)},
    auditLog: {create: jest.fn(async () => ({}))},
  }
  const input = {organizationId: "org-1", incidentId: "incident-1", actorId: "actor", ownerId: "owner",
    session: {id: "session", token: "synthetic-token"}, expectedRevision: assuranceAssignmentRevision(current as never), requestId: "11111111-1111-4111-8111-111111111111"}
  return {tx, input, users, roles, memberships, sessions, events, moduleState, get current(){return current}, disableOrganization(){organizations=[]},
    assign: (overrides = {}) => assignAssuranceIncidentInTx(tx as unknown as Prisma.TransactionClient, {...input, ...overrides})}
}

it("records source-bound assignment, prior/resulting state and audit together without completing business work", async () => {
  const f = fixture(); const result = await f.assign()
  expect(result).toMatchObject({ownerId: "owner", status: "ASSIGNED", assignedRole: "finance", dueAt: record().dueAt, sourceHash: "source-1"})
  expect(f.events[0]).toMatchObject({actorId: "actor", fromStatus: "OPEN", toStatus: "ASSIGNED", metadata: {
    sourceHash: "source-1", sourceFingerprint: "fingerprint-1", occurrenceCount: 1, expectedRevision: f.input.expectedRevision,
    before: {ownerId: null, status: "OPEN"}, after: {ownerId: "owner", status: "ASSIGNED"},
  }})
  expect(f.tx.auditLog.create).toHaveBeenCalledTimes(1)
  expect(f.tx.workflowAssuranceIncident.update.mock.calls[0][0].data).not.toHaveProperty("resolvedAt")
})

it("replays the identical committed request without another transition, event or audit", async () => {
  const f = fixture(); await f.assign(); await f.assign()
  expect(f.tx.workflowAssuranceIncident.update).toHaveBeenCalledTimes(1)
  expect(f.events).toHaveLength(1); expect(f.tx.auditLog.create).toHaveBeenCalledTimes(1)
})

it("rejects a changed payload with the same request key", async () => {
  const f = fixture(); await f.assign()
  await expect(f.assign({dueAt: null})).rejects.toThrow(/request or source changed/)
  expect(f.events).toHaveLength(1)
})

it("rejects the stale second writer and a replay after source revision changes", async () => {
  const f = fixture(); await f.assign()
  await expect(f.assign({requestId: "22222222-2222-4222-8222-222222222222"})).rejects.toThrow(/incident changed/)
  f.current.sourceHash = "new-source"
  await expect(f.assign()).rejects.toThrow(/request or source changed/)
  expect(f.events).toHaveLength(1)
})

it.each(["inactive", "locked", "unverified", "foreign", "permission", "membership", "session", "organization", "actor"])("refuses %s authority without writes", async kind => {
  const f = fixture()
  if (kind === "inactive") f.users[1].isActive = false
  if (kind === "locked") f.users[1].isLocked = true
  if (kind === "unverified") f.users[1].isVerified = false
  if (kind === "foreign") f.users[1].organizationId = "foreign"
  if (kind === "permission") f.roles[0].permissions = ["controls.audit.read", "controls.manage"]
  if (kind === "membership") f.memberships.splice(1)
  if (kind === "session") f.sessions.splice(0)
  if (kind === "organization") f.disableOrganization()
  if (kind === "actor") f.roles[0].permissions = ["controls.audit.read", "payments.reconciliation.read"]
  await expect(f.assign()).rejects.toThrow()
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
  expect(f.events).toHaveLength(0)
})

it("revalidates authority on replay", async () => {
  const f = fixture(); await f.assign(); f.users[0].isActive = false
  await expect(f.assign()).rejects.toThrow(/authority/)
  expect(f.events).toHaveLength(1)
})

it("preserves in-progress status and supports an explicit null deadline separately from omission", async () => {
  const f = fixture(); f.current.status = "IN_PROGRESS"
  const result = await f.assign({expectedRevision: assuranceAssignmentRevision(f.current as never), dueAt: null})
  expect(result).toMatchObject({status: "IN_PROGRESS", dueAt: null})
})

it.each(["RESOLVED", "CLOSED", "WAIVED", "SUPPRESSED"])("does not reopen a %s incident through assignment", async status => {
  const f = fixture(); f.current.status = status
  await expect(f.assign({expectedRevision: assuranceAssignmentRevision(f.current as never)})).rejects.toThrow(/reopened/)
  expect(f.events).toHaveLength(0)
})

it("binds revision to tenant, source, occurrence, assignee and update evidence", () => {
  const source = record(); const before = assuranceAssignmentRevision(source as never)
  for (const change of [{organizationId: "other"}, {sourceHash: "other"}, {occurrenceCount: 2}, {ownerId: "other"}, {updatedAt: new Date("2026-10-25T12:00:00Z")}]) {
    expect(assuranceAssignmentRevision({...source, ...change} as never)).not.toBe(before)
  }
})

it("propagates a failed event write to the transaction caller rather than reporting success", async () => {
  const f = fixture(); f.tx.workflowAssuranceIncidentEvent.create.mockRejectedValueOnce(new Error("synthetic failure"))
  await expect(f.assign()).rejects.toThrow("synthetic failure")
  expect(f.tx.auditLog.create).not.toHaveBeenCalled()
  // This mock verifies error propagation only; PostgreSQL rollback remains a separate gate.
})

it("rejects an expired session before mutation", async () => {
  const f = fixture(); f.sessions[0].expiresAt = new Date(0)
  await expect(f.assign()).rejects.toThrow(/authority/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it("fails closed when the tenant-scoped incident read is unavailable", async () => {
  const f = fixture(); f.tx.workflowAssuranceIncident.findFirst.mockResolvedValueOnce(null as never)
  await expect(f.assign()).rejects.toThrow(/not found/)
  expect(f.tx.workflowAssuranceIncident.findFirst).toHaveBeenCalledWith({where: {id: "incident-1", organizationId: "org-1"}, include: {definition: true}})
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

// Real module evaluator and catalog, mocked persisted records; no database access.
function managedGrants(f: ReturnType<typeof fixture>) {
  f.moduleState.configuration = {organizationId: "org-1"}
  f.moduleState.grants = ["finance", "accounting", "payment_reconciliation"].map(moduleSlug => ({
    moduleSlug, status: "active", source: "manual_override", startsAt: null, endsAt: null, readOnly: false, trial: false,
  }))
}

it.each(["suspended", "expired", "read_only", "unavailable"])("refuses %s source-module assignments before mutation", async status => {
  const f=fixture(); managedGrants(f); f.moduleState.grants[2].status=status
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
  expect(f.events).toHaveLength(0)
})

it("does not let broad finance or wildcard RBAC bypass a missing narrower source module", async () => {
  const f=fixture(); managedGrants(f); f.moduleState.grants.pop(); f.roles[0].permissions.push("*")
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it("denies a missing required source-module dependency", async () => {
  const f=fixture(); managedGrants(f); f.moduleState.grants.splice(1,1)
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it("rechecks managed module revocation before replay", async () => {
  const f=fixture(); managedGrants(f); await f.assign(); f.moduleState.grants=[]
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.events).toHaveLength(1)
})

it("does not restore legacy access when a grant read fails", async () => {
  const f=fixture(); f.tx.tenantModuleGrant.findMany.mockRejectedValueOnce(new Error("synthetic grant failure"))
  await expect(f.assign()).rejects.toThrow("synthetic grant failure")
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it("rechecks a grant expiry immediately before assignment", async () => {
  const f=fixture(); managedGrants(f)
  let reads=0
  f.tx.tenantModuleGrant.findMany.mockImplementation(async () => {
    reads++
    // finance and reconciliation are checked before replay; expire on write recheck.
    return f.moduleState.grants.map(grant => reads > 2 && grant.moduleSlug === "payment_reconciliation" ? {...grant, endsAt: new Date(0)} : grant)
  })
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it.each(["unknown", "mismatch"])("fails closed on %s source module identity", async kind => {
  const f=fixture(); f.current.definition.moduleSlug=kind === "unknown" ? "unknown-module" : "inventory"
  if(kind === "unknown") f.current.moduleSlug="unknown-module"
  await expect(f.assign()).rejects.toThrow(/module access/)
  expect(f.tx.workflowAssuranceIncident.update).not.toHaveBeenCalled()
})

it("retains the explicit business-events to dashboard compatibility mapping", async () => {
  const f=fixture(); f.current.moduleSlug="business-events"; f.current.definition.moduleSlug="business-events"; f.current.definition.actionRoute="/dashboard/assurance/control-tower"
  await expect(f.assign()).resolves.toMatchObject({status:"ASSIGNED"})
})

it("does not disclose a replay result when the session expires during retained-event lookup", async () => {
  const f=fixture(); await f.assign()
  f.tx.workflowAssuranceIncidentEvent.findFirst.mockImplementationOnce(async () => {
    f.sessions[0].expiresAt=new Date(0)
    return f.events[0]
  })
  await expect(f.assign()).rejects.toThrow(/authority/)
  expect(f.events).toHaveLength(1)
  expect(f.tx.workflowAssuranceIncident.update).toHaveBeenCalledTimes(1)
})
