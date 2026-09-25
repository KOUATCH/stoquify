jest.mock("@/prisma/db", () => ({ db: {
  organization: { findFirst: jest.fn() }, tenantModuleConfiguration: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  tenantModuleGrant: { findMany: jest.fn(), createMany: jest.fn() }, tenantModuleConfigurationCommand: { count: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() },
  organizationAccountingSettings: { findUnique: jest.fn() }, providerAccount: { count: jest.fn() }, auditLog: { create: jest.fn() }, $transaction: jest.fn(),
  tenantModuleLifecycleOperation: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  tenantModuleLifecycleStep: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  tenantModuleLifecycleEvent: { findFirst: jest.fn(), create: jest.fn() },
  payrollPeriod: { findFirst: jest.fn(), findMany: jest.fn() }, complianceAdapterConfig: { findFirst: jest.fn(), findMany: jest.fn() },
} }))
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }))
jest.mock("../module-admission.service", () => ({ lockModuleAdmissionPolicyInTx: jest.fn().mockResolvedValue(undefined) }))
jest.mock("../module-stop-policy.service", () => ({ getModuleStopImpactInTx: jest.fn(), getModuleStopOptions: jest.fn().mockReturnValue([]) }))
jest.mock("../module-lifecycle-readiness.service", () => ({
  ...jest.requireActual("../module-lifecycle-readiness.service"), observeModulePreparationInTx: jest.fn(),
}))

import { db } from "@/prisma/db"
import { applyModuleComposition, getModuleCompositionData, getModuleCompositionHistory, previewModuleComposition, reopenModuleComposition, resolveCompositionModules, saveModuleCompositionDraft, resumeModuleComposition } from "../module-composition.service"
import { getModuleCatalog } from "../module-catalog.service"
import { getModuleStopImpactInTx } from "../module-stop-policy.service"
import { observeModulePreparationInTx } from "../module-lifecycle-readiness.service"

const mock = db as unknown as Record<string, Record<string, jest.Mock>>
const actor = { organizationId: "org-a", actorId: "user-a", actorPermissions: ["MANAGE_SYSTEM_SETTINGS", "dashboard.read", "sales.read", "inventory.items.read", "accounting.reports.read", "finance.read", "payments.reconciliation.read", "reports.read", "OPERATE_POS"] }
type TestRow = Record<string, any>
let organizations: TestRow[]
let configuration: TestRow | null
let grants: TestRow[]
let commands: TestRow[]
let operations: TestRow[]
let steps: TestRow[]
let events: TestRow[]
let transactionFailures: unknown[]
let emulateJsonbOrdering: boolean
let nextId: number
let failCas: boolean
function queryMatch(row: TestRow, where: TestRow) { return Object.entries(where).every(([key, value]) => value && typeof value === "object" && "not" in value ? row[key] !== value.not : value && typeof value === "object" && "in" in value ? value.in.includes(row[key]) : row[key] === value) }

beforeEach(() => {
  jest.clearAllMocks()
  organizations = [{ id: "org-a", name: "Retail fixture", requestedModules: [], isActive: true, deletedAt: null }]
  configuration = null
  grants = []
  commands = []
  operations = []; steps = []; events = []
  transactionFailures = []
  emulateJsonbOrdering = false
  ;(observeModulePreparationInTx as jest.Mock).mockReset().mockResolvedValue([])
  ;(getModuleStopImpactInTx as jest.Mock).mockImplementation(async (_tx, input) => ({ stopNewWorkModules: [...input.stopNewWorkModules].sort(), newlyStopped: input.stopNewWorkModules.filter((slug: string) => !input.previousStoppedModules.includes(slug)), resumed: input.previousStoppedModules.filter((slug: string) => !input.stopNewWorkModules.includes(slug)), canStop: true, canRetain: true, policyHash: "verified-test-policy", evidenceHash: "test-obligations", impacts: [] }))
  nextId = 0
  failCas = false
  mock.organization.findFirst.mockImplementation(({ where }) => organizations.find((row) => queryMatch(row, where)) ?? null)
  mock.tenantModuleConfiguration.findUnique.mockImplementation(({ where }) => configuration?.organizationId === where.organizationId ? configuration : null)
  mock.tenantModuleConfiguration.create.mockImplementation(({ data }) => { configuration = { ...data, createdAt: new Date(), updatedAt: new Date() }; return configuration })
  mock.tenantModuleConfiguration.updateMany.mockImplementation(({ where, data }) => {
    if (failCas || !configuration || !queryMatch(configuration, where)) return { count: 0 }
    configuration = { ...configuration, ...data, revision: typeof data.revision === "object" ? configuration.revision + data.revision.increment : data.revision ?? configuration.revision }
    if (emulateJsonbOrdering && configuration.newWorkStoppedAt) configuration.newWorkStoppedAt = Object.fromEntries(Object.entries(configuration.newWorkStoppedAt).sort(([left], [right]) => left.length - right.length || left.localeCompare(right)))
    return { count: 1 }
  })
  mock.tenantModuleGrant.findMany.mockImplementation(({ where }) => grants.filter((row) => queryMatch(row, where)))
  mock.tenantModuleGrant.createMany.mockImplementation(({ data }) => { grants.push(...data.map((row: TestRow) => ({ ...row, revision: 1 }))); return { count: data.length } })
  mock.tenantModuleConfigurationCommand.findUnique.mockImplementation(({ where }) => commands.find((row) => queryMatch(row, where.organizationId_idempotencyKey)) ?? null)
  mock.tenantModuleConfigurationCommand.count.mockImplementation(({ where }) => commands.filter((row) => queryMatch(row, where)).length)
  mock.tenantModuleConfigurationCommand.findFirst.mockImplementation(({ where }) => commands.find((row) => queryMatch(row, where)) ?? null)
  mock.tenantModuleConfigurationCommand.findMany.mockImplementation(({ where, take, cursor, skip = 0 }) => {
    const sorted = commands.filter(row => queryMatch(row, where)).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime() || b.id.localeCompare(a.id))
    const start = cursor ? sorted.findIndex(row => row.id === cursor.id) + skip : 0
    return sorted.slice(start, start + take)
  })
  mock.tenantModuleConfigurationCommand.create.mockImplementation(({ data }) => {
    const row = { id: `command-${++nextId}`, createdAt: new Date(), updatedAt: new Date(), resultRevision: null, previewHash: null, errorCode: null, ...data }
    commands.push(row)
    return row
  })
  mock.organizationAccountingSettings.findUnique.mockResolvedValue({ accountingEnabled: true, setupStatus: "READY", updatedAt: new Date("2026-09-05T08:00:00Z") })
  mock.providerAccount.count.mockResolvedValue(0)
  mock.payrollPeriod.findFirst.mockResolvedValue(null); mock.payrollPeriod.findMany.mockResolvedValue([])
  mock.complianceAdapterConfig.findFirst.mockResolvedValue(null); mock.complianceAdapterConfig.findMany.mockResolvedValue([])
  mock.tenantModuleLifecycleOperation.create.mockImplementation(({ data }) => { const row = { id: `operation-${++nextId}`, state: "REQUESTED", version: 0, leaseToken: null, leaseUntil: null, errorCode: null, createdAt: new Date(), updatedAt: new Date(), ...data }; operations.push(row); return row })
  mock.tenantModuleLifecycleOperation.findFirst.mockImplementation(({ where, include }) => { const row = operations.slice().reverse().find(item => queryMatch(item, where)); return row ? { ...row, ...(include?.steps ? { steps: steps.filter(item => item.operationId === row.id) } : {}) } : null })
  mock.tenantModuleLifecycleOperation.findMany.mockImplementation(({ where }) => operations.filter(row => queryMatch(row, where)))
  mock.tenantModuleLifecycleOperation.updateMany.mockImplementation(({ where, data }) => { const matching = operations.filter(row => queryMatch(row, where)); operations = operations.map(row => matching.includes(row) ? { ...row, ...data, updatedAt: new Date() } : row); return { count: matching.length } })
  mock.tenantModuleLifecycleStep.create.mockImplementation(({ data }) => { const row = { id: `step-${++nextId}`, attempts: 0, ...data }; steps.push(row); return row })
  mock.tenantModuleLifecycleStep.findMany.mockImplementation(({ where }) => steps.filter(row => queryMatch(row, where)))
  mock.tenantModuleLifecycleStep.updateMany.mockImplementation(({ where, data }) => { const matching = steps.filter(row => queryMatch(row, where)); steps = steps.map(row => matching.includes(row) ? { ...row, ...data } : row); return { count: matching.length } })
  mock.tenantModuleLifecycleEvent.findFirst.mockImplementation(({ where }) => events.find(row => queryMatch(row, where)) ?? null)
  mock.tenantModuleLifecycleEvent.create.mockImplementation(({ data }) => { if (events.some(row => row.operationId === data.operationId && (row.sequence === data.sequence || row.eventKey === data.eventKey))) throw new Error("Duplicate immutable event"); const row = { id: `event-${++nextId}`, ...data }; events.push(row); return row })
  ;(db.$transaction as jest.Mock).mockImplementation(async (operation: (tx: typeof db) => Promise<unknown>) => {
    const beforeConfiguration = configuration ? { ...configuration } : null
    const beforeGrants = [...grants]
    const beforeCommands = [...commands]
    const beforeOperations = [...operations]; const beforeSteps = [...steps]; const beforeEvents = [...events]
    try { return await operation(db) }
    catch (error) { transactionFailures.push(error); configuration = beforeConfiguration; grants = beforeGrants; commands = beforeCommands; operations = beforeOperations; steps = beforeSteps; events = beforeEvents; throw error }
  })
})

async function previewAndApply(selectedModules: string[], idempotencyKey = "apply-0001", expectedRevision = configuration?.revision ?? 0) {
  const preview = await previewModuleComposition(actor, { selectedModules, expectedRevision })
  const input = { selectedModules, expectedRevision, previewHash: preview.previewHash, idempotencyKey }
  return { result: await applyModuleComposition(actor, input), input, preview }
}

it("pages beyond one hundred records with stable ties, current lifecycle state and private-scope redaction", async () => {
  await saveModuleCompositionDraft(actor, { selectedModules: ["sales"], expectedRevision: 0, idempotencyKey: "history-seed" })
  const base = commands[0]
  commands = Array.from({ length: 105 }, (_, index) => ({ ...base, id: `history-${String(index).padStart(3, "0")}`, state: index === 0 ? "ACTIVE" : "DRAFT", createdAt: new Date("2026-09-05T08:00:00Z"), reviewSnapshot: { setupInputs: { payrollPeriodId: "private-period", complianceAdapterId: "private-adapter" } } }))
  operations = [{ id: "old-operation", organizationId: actor.organizationId, commandId: "history-000", desiredRevision: 9, state: "RETAINED", errorCode: null, actorId: actor.actorId, createdAt: new Date("2026-09-05T08:00:00Z"), updatedAt: new Date("2026-09-05T08:00:00Z") }]
  const first = await getModuleCompositionData(actor)
  const entries = [...first.history, ...first.drafts]
  expect(entries).toHaveLength(25)
  let cursor = first.historyNextCursor
  commands.push({ ...base, id: "newer-concurrent", createdAt: new Date("2026-09-06T08:00:00Z") })
  while (cursor) {
    const page = await getModuleCompositionHistory(actor, { beforeId: cursor })
    expect(page.entries.length).toBeLessThanOrEqual(25)
    entries.push(...page.entries)
    cursor = page.nextCursor
  }
  expect(entries).toHaveLength(105)
  expect(new Set(entries.map(item => item.id)).size).toBe(105)
  expect(entries.some(item => item.id === "newer-concurrent")).toBe(false)
  expect(entries.at(-1)).toMatchObject({ id: "history-000", state: "RETAINED", revision: 9, operationId: "old-operation", setupInputs: {} })
  expect(mock.tenantModuleLifecycleOperation.findMany).toHaveBeenLastCalledWith({ where: { organizationId: actor.organizationId, commandId: { in: expect.arrayContaining(["history-000"]) } } })
})

it("rejects foreign, missing and unauthorized history cursors before returning records", async () => {
  await expect(getModuleCompositionHistory({ ...actor, actorPermissions: ["dashboard.read"] }, { beforeId: "cursor" })).rejects.toMatchObject({ code: "FORBIDDEN" })
  commands.push({ id: "foreign-command", organizationId: "org-b" })
  await expect(getModuleCompositionHistory(actor, { beforeId: "foreign-command" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  await expect(getModuleCompositionHistory(actor, { beforeId: "missing" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  await expect(getModuleCompositionHistory({ ...actor, organizationId: "missing" }, { beforeId: "cursor" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  expect(mock.tenantModuleConfigurationCommand.findMany).not.toHaveBeenCalled()
})

it("preserves history read failures instead of returning an empty successful page", async () => {
  commands.push({ id: "cursor", organizationId: actor.organizationId })
  mock.tenantModuleConfigurationCommand.findMany.mockRejectedValueOnce(new Error("history storage unavailable"))
  await expect(getModuleCompositionHistory(actor, { beforeId: "cursor" })).rejects.toThrow("history storage unavailable")
})

describe("module composition ownership and preview", () => {
  it("binds the history access key to the current actor, organization and normalized permissions", async () => {
    const baseline = (await getModuleCompositionData(actor)).historyAccessKey
    expect(baseline).toMatch(/^[a-f0-9]{64}$/)
    expect((await getModuleCompositionData({ ...actor, actorPermissions: [...actor.actorPermissions].reverse().concat(actor.actorPermissions[0]) })).historyAccessKey).toBe(baseline)
    expect((await getModuleCompositionData({ ...actor, actorId: "user-other" })).historyAccessKey).not.toBe(baseline)
    expect((await getModuleCompositionData({ ...actor, actorPermissions: [...actor.actorPermissions, "payroll.runs.calculate"] })).historyAccessKey).not.toBe(baseline)
    organizations.push({ ...organizations[0], id: "org-b" })
    expect((await getModuleCompositionData({ ...actor, organizationId: "org-b" })).historyAccessKey).not.toBe(baseline)
  })
  it("reads legacy without mutation and exposes real source and operational setup gaps", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([{ ...preparationStep("WAITING_INPUT", "provider-missing", "payment_reconciliation"), code: "PROVIDER_SETUP_REQUIRED" }])
    const data = await getModuleCompositionData(actor)
    expect(data.source).toBe("legacy")
    expect(data.activeModules).toHaveLength(19)
    expect(data.catalog.find((row) => row.slug === "payment_reconciliation")?.setup.code).toBe("PROVIDER_SETUP_REQUIRED")
    expect(mock.tenantModuleConfiguration.create).not.toHaveBeenCalled()
    expect(mock.auditLog.create).not.toHaveBeenCalled()
  })
  it("resolves reconciliation dependencies and preserves every legacy right", async () => {
    const { preview, result } = await previewAndApply(["payment_reconciliation"])
    expect(preview.resolvedModules).toEqual(expect.arrayContaining(["finance", "accounting", "payment_reconciliation"]))
    expect(preview.requiredBy).toContainEqual({ moduleSlug: "accounting", requiredBy: ["payment_reconciliation"] })
    expect(result.state).toBe("ACTIVE")
    expect(result.data.activeModules).toHaveLength(6)
    expect(grants).toHaveLength(19)
    expect(result.data.preservedModules).toHaveLength(13)
    expect(organizations[0].requestedModules).toEqual([])
    expect(result.data.activeRevision).toBe(1)
    expect(commands[0].state).toBe("REQUESTED")
    expect(result.data.lifecycle?.state).toBe("ACTIVE")
  })
  it("supports a retailer journey with stock, sales, POS and cash accountability", async () => {
    const { result } = await previewAndApply(["inventory", "sales", "pos", "cash_drawer"])
    expect(result.state).toBe("ACTIVE")
    expect(result.data.workspace.map((link) => link.moduleSlug)).toEqual(expect.arrayContaining(["inventory", "sales", "pos", "cash_drawer"]))
  })
  it("supports a service workspace without inventory or POS while retaining previous access", async () => {
    const { result } = await previewAndApply(["sales", "finance", "accounting", "reports"])
    expect(result.data.activeModules).not.toEqual(expect.arrayContaining(["inventory", "pos"]))
    expect(result.data.workspace.some((link) => link.moduleSlug === "inventory")).toBe(false)
    expect(grants.some((grant) => grant.moduleSlug === "inventory")).toBe(true)
  })
  it("does not turn a selected ungranted module into commercial authority", async () => {
    organizations[0].requestedModules = ["Inventory"]
    const { result } = await previewAndApply(["payment_reconciliation"])
    expect(result.state).toBe("FAILED")
    expect(result.issue?.code).toBe("ELIGIBILITY_REQUIRED")
    expect(result.data.activeModules).toEqual(expect.arrayContaining(["inventory"]))
    expect(result.data.activeModules).not.toContain("payment_reconciliation")
    expect(grants.map((grant) => grant.moduleSlug)).toHaveLength(4)
    expect(commands[0].state).toBe("FAILED")
  })
  it("retains unknown registration values alongside the authority snapshot", async () => {
    organizations[0].requestedModules = ["Inventory", "bespoke-legacy"]
    await previewAndApply(["inventory"])
    expect(configuration?.legacyUnknownValues).toEqual(["bespoke-legacy"])
    expect(organizations[0].requestedModules).toEqual(["Inventory", "bespoke-legacy"])
  })
  it("does not treat a managed tenant's empty grants as legacy full-suite access", async () => {
    configuration = { organizationId: "org-a", revision: 1, selectedModules: [], activeModules: [], legacyUnknownValues: [], manifestHash: "x" }
    const preview = await previewModuleComposition(actor, { selectedModules: ["sales"], expectedRevision: 1 })
    expect(preview.canApply).toBe(false)
    expect(preview.preservedAccess).toEqual([])
    expect((await getModuleCompositionData(actor)).workspace).toEqual([])
  })
  it("rejects orphan command history with zero grants instead of restoring legacy access", async () => {
    commands.push({ id: "retained-history", organizationId: "org-a", state: "ACTIVE" })
    expect(configuration).toBeNull()
    expect(grants).toEqual([])
    await expect(getModuleCompositionData(actor)).rejects.toMatchObject({ code: "CONFLICT" })
    await expect(saveModuleCompositionDraft(actor, { selectedModules: ["sales"], expectedRevision: 0, idempotencyKey: "orphan-draft" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(mock.tenantModuleConfiguration.create).not.toHaveBeenCalled()
    expect(mock.tenantModuleGrant.createMany).not.toHaveBeenCalled()
  })
  it("filters each workspace destination by actual route permission", async () => {
    const data = await getModuleCompositionData({ ...actor, actorPermissions: ["dashboard.read", "MANAGE_SYSTEM_SETTINGS"] })
    expect(data.workspace.some((link) => link.moduleSlug === "accounting")).toBe(false)
    expect(data.workspace.some((link) => link.moduleSlug === "payroll")).toBe(false)
    expect(data.workspace.some((link) => link.moduleSlug === "payment_reconciliation")).toBe(false)
    expect(data.workspace.find((link) => link.moduleSlug === "settings")?.href).toBe("/dashboard/settings")
  })
  it("does not publish nonexistent catalogue routes", async () => {
    const data = await getModuleCompositionData(actor)
    expect(data.workspace.some((link) => ["presence", "content", "commercial_agents"].includes(link.moduleSlug))).toBe(false)
    expect(data.catalog.find((item) => item.slug === "presence")?.available).toBe(false)
  })
  it("exposes setup needs separately from workspace activation", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const preview = await previewModuleComposition(actor, { selectedModules: ["payment_reconciliation"], expectedRevision: 0 })
    expect(preview.requirements).toContainEqual(expect.objectContaining({ code: "ACCOUNTING_SETUP_REQUIRED", status: "WAITING_INPUT" }))
    expect(preview.issues.some(issue => issue.code === "ACCOUNTING_SETUP_REQUIRED")).toBe(false)
    expect(preview.commercial).toEqual({ status: "no_purchase", messageCode: "EXISTING_ACCESS_ONLY" })
  })
  it("returns dependency graph errors instead of silently accepting a cycle", () => {
    const original = getModuleCatalog()
    const cyclic = original.map((item) => item.slug === "finance" ? { ...item, dependencies: [{ moduleSlug: "finance" as const, dependsOnSlug: "payment_reconciliation" as const, dependencyType: "required" as const, reason: "cycle fixture" }] } : item)
    expect(resolveCompositionModules(["payment_reconciliation"], cyclic).issues).toContainEqual(expect.objectContaining({ code: "DEPENDENCY_CYCLE" }))
  })
  it("rejects unknown module IDs rather than normalizing them into grants", async () => {
    const preview = await previewModuleComposition(actor, { selectedModules: ["ledger_core"], expectedRevision: 0 })
    expect(preview.issues).toContainEqual({ code: "UNKNOWN_MODULE", moduleSlug: "ledger_core", blocking: true })
    expect(preview.canApply).toBe(false)
  })
})

describe("durable configuration commands", () => {
  it("binds exact selection, grants, manifest and actor authority to review", async () => {
    const preview = await previewModuleComposition(actor, { selectedModules: ["sales"], expectedRevision: 0 })
    await expect(applyModuleComposition(actor, { selectedModules: ["inventory"], expectedRevision: 0, previewHash: preview.previewHash, idempotencyKey: "tampered-001" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(configuration).toBeNull()
  })
  it("rejects authority or setup changes after review", async () => {
    const preview = await previewModuleComposition(actor, { selectedModules: ["payment_reconciliation"], expectedRevision: 0 })
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("SUCCEEDED", "new-provider-source", "payment_reconciliation")])
    await expect(applyModuleComposition(actor, { selectedModules: ["payment_reconciliation"], expectedRevision: 0, previewHash: preview.previewHash, idempotencyKey: "stale-provider" })).rejects.toMatchObject({ code: "CONFLICT" })
  })
  it("invalidates review when the durable authority revision changes", async () => {
    await previewAndApply(["sales"])
    const input = { selectedModules: ["sales", "finance"], expectedRevision: 1 }
    const preview = await previewModuleComposition(actor, input)
    grants.find((grant) => grant.moduleSlug === "finance")!.revision += 1
    await expect(applyModuleComposition(actor, { ...input, previewHash: preview.previewHash, idempotencyKey: "changed-authority" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(configuration?.revision).toBe(1)
  })
  it("invalidates review when an unselected preserved grant expires without a row update", async () => {
    jest.useFakeTimers()
    try {
      jest.setSystemTime(new Date("2026-09-05T10:00:00Z"))
      await previewAndApply(["sales"])
      const grant = grants.find((item) => item.moduleSlug === "inventory")!
      grant.endsAt = new Date("2026-09-05T10:01:00Z")
      const input = { selectedModules: ["sales"], expectedRevision: 1 }
      const preview = await previewModuleComposition(actor, input)
      expect(preview.preservedAccess).toContain("inventory")
      const unchangedGrant = { ...grant }
      jest.setSystemTime(new Date("2026-09-05T10:02:00Z"))
      const refreshed = await previewModuleComposition(actor, input)
      expect(refreshed.preservedAccess).not.toContain("inventory")
      expect(grant).toEqual(unchangedGrant)
      expect(refreshed.previewHash).not.toBe(preview.previewHash)
      await expect(applyModuleComposition(actor, { ...input, previewHash: preview.previewHash, idempotencyKey: "expired-preserved" })).rejects.toMatchObject({ code: "CONFLICT" })
      expect(configuration?.revision).toBe(1)
    } finally {
      jest.useRealTimers()
    }
  })
  it("retains the exact reviewed impact and authority with its immutable command", async () => {
    const { preview } = await previewAndApply(["sales"])
    expect(commands[0].reviewSnapshot.preview.previewHash).toBe(preview.previewHash)
    expect(commands[0].reviewSnapshot.grantAuthority).toHaveLength(19)
    expect(commands[0].reviewSnapshot.manifestHash).toMatch(/^[a-f0-9]{64}$/)
  })
  it("does not confuse a read-only grant with permission to perform writes", async () => {
    await previewAndApply(["sales"])
    const grant = grants.find((item) => item.moduleSlug === "sales")!
    grant.status = "read_only"
    grant.readOnly = true
    const data = await getModuleCompositionData(actor)
    expect(data.catalog.find((item) => item.slug === "sales")?.grantStatus).toBe("read_only")
    expect(data.workspace.some((link) => link.moduleSlug === "sales")).toBe(true)
    expect(grant.status).toBe("read_only")
  })
  it("rejects stale revision and preserves the winning command", async () => {
    const preview = await previewModuleComposition(actor, { selectedModules: ["sales"], expectedRevision: 0 })
    await previewAndApply(["inventory"])
    await expect(applyModuleComposition(actor, { selectedModules: ["sales"], expectedRevision: 0, previewHash: preview.previewHash, idempotencyKey: "stale-revision" })).rejects.toMatchObject({ code: "CONFLICT" })
    expect(configuration?.selectedModules).toEqual(["inventory"])
  })
  it("rolls back the first authority snapshot and command when CAS loses", async () => {
    failCas = true
    await expect(previewAndApply(["sales"])).rejects.toMatchObject({ code: "CONFLICT" })
    expect(configuration).toBeNull()
    expect(grants).toEqual([])
    expect(commands).toEqual([])
  })
  it("replays an identical completed command without effects", async () => {
    const { input } = await previewAndApply(["sales"])
    const repeated = await applyModuleComposition(actor, input)
    expect(repeated.alreadyApplied).toBe(true)
    expect(repeated.revision).toBe(1)
    expect(configuration?.revision).toBe(1)
    expect(commands).toHaveLength(1)
    expect(mock.tenantModuleGrant.createMany).toHaveBeenCalledTimes(1)
  })
  it("rejects reusing a command key for a different payload or actor", async () => {
    const { input } = await previewAndApply(["sales"])
    await expect(applyModuleComposition(actor, { ...input, selectedModules: ["inventory"] })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
    await expect(applyModuleComposition({ ...actor, actorId: "other-user" }, input)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" })
  })
  it("saves a draft without changing the active workspace and reopens history as a new record", async () => {
    const draft = await saveModuleCompositionDraft(actor, { selectedModules: ["sales"], expectedRevision: 0, idempotencyKey: "draft-key-0001" })
    expect(draft.state).toBe("DRAFT")
    expect(configuration?.activeModules).toHaveLength(19)
    const { result } = await previewAndApply(["sales"])
    const restored = await reopenModuleComposition(actor, { commandId: result.commandId, expectedRevision: 1, idempotencyKey: "restore-key-001" })
    expect(restored.id).not.toBe(result.commandId)
    expect(restored.selectedModules).toEqual(["sales"])
    expect(configuration?.revision).toBe(1)
    expect(commands.find((row) => row.id === result.commandId)?.state).toBe("REQUESTED")
  })
  it("allows a new reviewed attempt after failed eligibility without repeating the failed request", async () => {
    organizations[0].requestedModules = ["Inventory"]
    const { result } = await previewAndApply(["sales"], "failed-attempt")
    expect(result.state).toBe("FAILED")
    const corrected = await previewAndApply(["inventory"], "corrected-attempt")
    expect(corrected.result.state).toBe("ACTIVE")
    expect(commands.map((row) => row.state)).toEqual(["FAILED", "REQUESTED"])
  })
  it("rejects nonexistent, inactive and cross-tenant organizations before any persistence", async () => {
    await expect(getModuleCompositionData({ ...actor, organizationId: "org-other" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    organizations[0].isActive = false
    await expect(previewAndApply(["sales"])).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(commands).toEqual([])
  })
  it("will not reopen another tenant's command by ID", async () => {
    commands.push({ id: "foreign", organizationId: "org-other", selectedModules: ["sales"] })
    await expect(reopenModuleComposition(actor, { commandId: "foreign", expectedRevision: 0, idempotencyKey: "foreign-attempt" })).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
  it("treats database failure as unavailable instead of an empty successful configuration", async () => {
    mock.tenantModuleGrant.findMany.mockRejectedValue(new Error("test database unavailable"))
    await expect(getModuleCompositionData(actor)).rejects.toThrow("test database unavailable")
  })
})

function preparationStep(status: "SUCCEEDED" | "WAITING_INPUT", inputHash = status, moduleSlug = "accounting") {
  return { moduleSlug, stepKey: `${moduleSlug}-foundation`, status, code: status === "SUCCEEDED" ? "SETUP_VERIFIED" : "ACCOUNTING_SETUP_REQUIRED", href: "/dashboard/accounting/settings", checkedAt: new Date().toISOString(), evidenceHash: inputHash, inputHash, evidence: { sourceHash: inputHash }, attempts: 0 }
}

describe("durable operational preparation", () => {
  it("preserves review authority across PostgreSQL JSONB timestamp-map key ordering", async () => {
    emulateJsonbOrdering = true
    const selection = { selectedModules: ["sales"], stopNewWorkModules: ["inventory", "payroll", "purchasing"], expectedRevision: 0 }
    const preview = await previewModuleComposition(actor, selection)
    const result = await applyModuleComposition(actor, { ...selection, previewHash: preview.previewHash, idempotencyKey: "jsonb-three-stops" })
    expect(Object.keys(configuration?.newWorkStoppedAt)).toEqual(["payroll", "inventory", "purchasing"])
    expect(result.state).toBe("RETAINED")
    expect(result.issue).toBeNull()
    expect(transactionFailures).toEqual([])
  })
  it("keeps the last active workspace until observed setup is ready, then resumes the same request", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const { result } = await previewAndApply(["payment_reconciliation"])
    expect(result.state).toBe("REQUESTED")
    expect(result.data.revision).toBe(1)
    expect(result.data.activeRevision).toBe(0)
    expect(result.data.activeModules).toHaveLength(19)
    expect(result.data.lifecycle?.steps[0].status).toBe("WAITING_INPUT")
    expect(commands[0].state).toBe("REQUESTED")
    const originalCommand = { ...commands[0] }
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("SUCCEEDED")])
    const resumed = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "resume-ready-1" })
    expect(resumed.commandId).toBe(result.commandId)
    expect(resumed.state).toBe("ACTIVE")
    expect(resumed.data.activeRevision).toBe(1)
    expect(resumed.data.activeModules).toHaveLength(6)
    expect(commands[0]).toEqual(originalCommand)
    expect(grants).toHaveLength(19)
  })
  it("does not repeat completed evidence effects when only another step needs preparation", async () => {
    const ready = preparationStep("SUCCEEDED", "accounting-version-1")
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([ready, preparationStep("WAITING_INPUT", "provider-missing", "payment_reconciliation")])
    const { result } = await previewAndApply(["payment_reconciliation"])
    expect(steps.find(row => row.moduleSlug === "accounting")?.attempts).toBe(1)
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([ready, preparationStep("SUCCEEDED", "provider-ready", "payment_reconciliation")])
    await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "resume-provider-1" })
    expect(steps.find(row => row.moduleSlug === "accounting")?.attempts).toBe(1)
    expect(events.filter(row => row.eventType === "PREPARATION_OBSERVED" && row.evidence.moduleSlug === "accounting")).toHaveLength(1)
    expect(steps.find(row => row.moduleSlug === "payment_reconciliation")?.attempts).toBe(2)
  })
  it("requires a fresh review when grant authority changes during preparation", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const { result } = await previewAndApply(["finance"])
    grants.find(row => row.moduleSlug === "inventory")!.revision += 1
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("SUCCEEDED")])
    const resumed = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "resume-changed-grants" })
    expect(resumed.state).toBe("FAILED")
    expect(resumed.issue?.code).toBe("CONFIGURATION_STALE")
    expect(resumed.data.activeRevision).toBe(0)
    expect(resumed.data.lifecycle?.canResume).toBe(false)
  })
  it("persists explicit admission stops while obligations drain and never infers them from deselection", async () => {
    let pendingCount = 1
    ;(getModuleStopImpactInTx as jest.Mock).mockImplementation(async (_tx, input) => ({ stopNewWorkModules: input.stopNewWorkModules, newlyStopped: input.stopNewWorkModules.filter((slug: string) => !input.previousStoppedModules.includes(slug)), resumed: input.previousStoppedModules.filter((slug: string) => !input.stopNewWorkModules.includes(slug)), canStop: true, canRetain: !pendingCount, policyHash: "same-policy", evidenceHash: `count-${pendingCount}`, impacts: input.stopNewWorkModules.map((moduleSlug: string) => ({ moduleSlug, supported: true, newWork: ["inventory_adjustments"], continuation: ["existing_inventory_work"], dependentModules: [], observations: [{ code: "open", kind: "obligation", count: pendingCount }], pendingCount })) }))
    const selection = { selectedModules: ["sales"], stopNewWorkModules: ["inventory"], expectedRevision: 0 }
    const preview = await previewModuleComposition(actor, selection)
    const result = await applyModuleComposition(actor, { ...selection, previewHash: preview.previewHash, idempotencyKey: "explicit-stop-1" })
    expect(result.state).toBe("REQUESTED")
    expect(configuration?.newWorkStoppedModules).toEqual(["inventory"])
    const stoppedAt = configuration?.newWorkStoppedAt.inventory
    expect(stoppedAt).toMatch(/^\d{4}-/)
    expect(result.data.activeRevision).toBe(0)
    expect(grants).toHaveLength(19)
    expect((await previewModuleComposition(actor, { selectedModules: ["sales"], expectedRevision: 1 })).stopNewWorkModules).toEqual(["inventory"])
    pendingCount = 0
    const resumed = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "drained-stop-1" })
    expect(transactionFailures).toEqual([])
    expect(resumed.state).toBe("RETAINED")
    expect(configuration?.newWorkStoppedAt.inventory).toBe(stoppedAt)
    expect(resumed.data.retainedWorkspace.some(link => link.moduleSlug === "inventory")).toBe(true)
  })
  it("keeps stopped admission until a newly reviewed reactivation completes setup", async () => {
    const selection = { selectedModules: ["sales"], stopNewWorkModules: ["inventory"], expectedRevision: 0 }
    const preview = await previewModuleComposition(actor, selection)
    await applyModuleComposition(actor, { ...selection, previewHash: preview.previewHash, idempotencyKey: "stop-for-reenable" })
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const reopen = { selectedModules: ["inventory"], stopNewWorkModules: [], expectedRevision: 1 }
    const review = await previewModuleComposition(actor, reopen)
    const result = await applyModuleComposition(actor, { ...reopen, previewHash: review.previewHash, idempotencyKey: "review-reactivation" })
    expect(configuration?.newWorkStoppedModules).toEqual(["inventory"])
    expect(configuration?.activeRevision).toBe(1)
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("SUCCEEDED")])
    const resumed = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 2, idempotencyKey: "resume-reactivation" })
    expect(resumed.state).toBe("ACTIVE")
    expect(configuration?.newWorkStoppedModules).toEqual([])
    expect(configuration?.newWorkStoppedAt).toEqual({})
  })
  it("records a failed preparation query without advancing active state and permits a safe retry", async () => {
    const waiting = preparationStep("WAITING_INPUT")
    const read = observeModulePreparationInTx as jest.Mock
    read.mockResolvedValue([waiting])
    const { result } = await previewAndApply(["finance"])
    read.mockRejectedValueOnce(new Error("test source connection failure")).mockResolvedValue([waiting])
    const failed = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "failed-observation" })
    expect(failed.state).toBe("FAILED")
    expect(failed.issue?.code).toBe("PREPARATION_FAILED")
    expect(configuration?.activeRevision).toBe(0)
    expect(events.at(-1)?.evidence).not.toHaveProperty("message")
    read.mockResolvedValue([preparationStep("SUCCEEDED")])
    const retry = await resumeModuleComposition(actor, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "retry-observation" })
    expect(retry.state).toBe("ACTIVE")
  })
  it("replays a completed resume key without duplicating immutable events", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const { result } = await previewAndApply(["finance"])
    const input = { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "repeat-waiting-key" }
    await resumeModuleComposition(actor, input)
    const count = events.length
    await resumeModuleComposition(actor, input)
    expect(events).toHaveLength(count)
    expect(configuration?.activeRevision).toBe(0)
  })
  it("prevents a superseded operation from replacing a newer active configuration", async () => {
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const original = await previewAndApply(["finance"])
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([])
    await previewAndApply(["inventory"], "newer-request")
    const resumed = await resumeModuleComposition(actor, { operationId: original.result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "old-request-resume" })
    expect(resumed.state).toBe("FAILED")
    expect(configuration?.activeRevision).toBe(2)
    expect(configuration?.selectedModules).toEqual(["inventory"])
  })
  it("binds payroll dates and country to review while preserving setup selection in reopened drafts", async () => {
    const periodActor = { ...actor, actorPermissions: [...actor.actorPermissions, "payroll.runs.calculate"] }
    const period = { id: "period-1", name: "Actual period", periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30"), payDate: new Date("2026-09-30"), countryCode: "CM" }
    mock.payrollPeriod.findFirst.mockResolvedValue(period)
    const input = { selectedModules: ["sales"], expectedRevision: 0, setupInputs: { payrollPeriodId: period.id } }
    const preview = await previewModuleComposition(periodActor, input)
    const result = await applyModuleComposition(periodActor, { ...input, previewHash: preview.previewHash, idempotencyKey: "period-bound-apply" })
    const draft = await reopenModuleComposition(periodActor, { commandId: result.commandId, expectedRevision: 1, idempotencyKey: "period-bound-draft" })
    expect(draft.setupInputs).toEqual(input.setupInputs)
    const next = { ...input, expectedRevision: 1 }
    const before = await previewModuleComposition(periodActor, next)
    mock.payrollPeriod.findFirst.mockResolvedValue({ ...period, payDate: new Date("2026-10-01") })
    await expect(applyModuleComposition(periodActor, { ...next, previewHash: before.previewHash, idempotencyKey: "period-moved-apply" })).rejects.toMatchObject({ code: "CONFLICT" })
  })
  it("rejects unauthorized payroll and compliance scope IDs before querying their metadata", async () => {
    const moduleAdmin = { ...actor, actorPermissions: ["MANAGE_SYSTEM_SETTINGS", "dashboard.read"] }
    for (const setupInputs of [{ payrollPeriodId: "sensitive-period" }, { complianceAdapterId: "sensitive-adapter" }]) {
      await expect(previewModuleComposition(moduleAdmin, { selectedModules: ["sales"], expectedRevision: 0, setupInputs })).rejects.toMatchObject({ code: "FORBIDDEN" })
      await expect(saveModuleCompositionDraft(moduleAdmin, { selectedModules: ["sales"], expectedRevision: 0, setupInputs, idempotencyKey: "unauthorized-scope" })).rejects.toMatchObject({ code: "FORBIDDEN" })
    }
    expect(mock.payrollPeriod.findFirst).not.toHaveBeenCalled()
    expect(mock.complianceAdapterConfig.findFirst).not.toHaveBeenCalled()
    expect(commands).toEqual([])
  })
  it("keeps module administration readable after scope permission is lost and requires a new review to resume", async () => {
    const authorized = { ...actor, actorPermissions: [...actor.actorPermissions, "payroll.runs.calculate"] }
    mock.payrollPeriod.findFirst.mockResolvedValue({ id: "period-1", name: "Private period", countryCode: "CM", periodStart: new Date("2026-09-01"), periodEnd: new Date("2026-09-30"), payDate: new Date("2026-09-30") })
    ;(observeModulePreparationInTx as jest.Mock).mockResolvedValue([preparationStep("WAITING_INPUT")])
    const selection = { selectedModules: ["payroll"], expectedRevision: 0, setupInputs: { payrollPeriodId: "period-1" } }
    const preview = await previewModuleComposition(authorized, selection)
    const result = await applyModuleComposition(authorized, { ...selection, previewHash: preview.previewHash, idempotencyKey: "scoped-pending" })
    const moduleAdmin = { ...actor, actorPermissions: ["MANAGE_SYSTEM_SETTINGS", "dashboard.read"] }
    mock.payrollPeriod.findFirst.mockClear()
    const data = await getModuleCompositionData(moduleAdmin)
    expect(data.setupInputs).toEqual({})
    expect(data.availablePayrollPeriods).toEqual([])
    expect(data.history[0].setupInputs).toEqual({})
    const resumed = await resumeModuleComposition(moduleAdmin, { operationId: result.data.lifecycle!.id, expectedRevision: 1, idempotencyKey: "lost-payroll-permission" })
    expect(resumed.issue?.code).toBe("CONFIGURATION_STALE")
    expect(mock.payrollPeriod.findFirst).not.toHaveBeenCalled()
    expect(resumed.data.activeRevision).toBe(0)
  })
  it("rejects a cross-tenant preparation identifier before changes", async () => {
    await expect(resumeModuleComposition(actor, { operationId: "foreign-operation", expectedRevision: 0, idempotencyKey: "foreign-resume" })).rejects.toMatchObject({ code: "NOT_FOUND" })
    expect(events).toEqual([])
  })
})
