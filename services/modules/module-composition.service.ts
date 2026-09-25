import "server-only"

import { randomUUID } from "crypto"
import { Prisma } from "@prisma/client"
import { db } from "@/prisma/db"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { BusinessRuleError, ConflictError, ForbiddenError, IdempotencyConflictError, NotFoundError } from "@/services/_shared/action-errors"
import { getModuleCatalog } from "./module-catalog.service"
import { deriveLegacyEntitlements, evaluateModuleEntitlement } from "./module-entitlement.service"
import { isCommercialModuleSlug, type CommercialModuleSlug, type TenantModuleEntitlement } from "./module-control-contracts"
import type { CompositionHistoryEntry, CompositionIssue, CompositionSetup, ModuleCompositionApplyInput, ModuleCompositionApplyResult, ModuleCompositionData, ModuleCompositionDraftInput, ModuleCompositionPreview, ModuleCompositionReopenInput, ModuleCompositionSelectionInput, ModuleCompositionResumeInput, CompositionLifecycleStep } from "./module-composition-contracts"
import { lockModuleAdmissionPolicyInTx } from "./module-admission.service"
import { getModuleStopImpactInTx, getModuleStopOptions, type ModuleStopImpact } from "./module-stop-policy.service"
import { observeModulePreparationInTx, lifecycleEvidenceHash, normalizeCompositionSetupInputs, moduleSetupScopeHashInTx, readModuleSetupScopeInTx, PAYROLL_PREPARATION_PERMISSIONS, COMPLIANCE_PREPARATION_PERMISSIONS, type ModulePreparationObservation } from "./module-lifecycle-readiness.service"
import { appendModuleLifecycleEventInTx, readModuleLifecycleInTx } from "./module-lifecycle.service"
import type { CompositionHistoryPage } from "./module-composition-contracts"

export type ModuleCompositionActor = { organizationId: string; actorId: string; actorPermissions: readonly string[] }
type Client = Prisma.TransactionClient

// These destinations are existing, independently guarded routes. Permission lists
// mirror the route contracts; catalogue prefixes alone are not executable routes.
export const COMPOSITION_DESTINATIONS: Partial<Record<CommercialModuleSlug, { href: string; permissions: string[]; modules?: CommercialModuleSlug[] }>> = {
  dashboard: { href: "/dashboard", permissions: ["dashboard.read"] },
  inventory: { href: "/dashboard/inventory/items", permissions: ["inventory.items.read"] },
  sales: { href: "/dashboard/sales", permissions: ["sales.read"] },
  pos: { href: "/dashboard/pos", permissions: ["OPERATE_POS"] },
  cash_drawer: { href: "/dashboard/finance/cash-drawer", permissions: ["finance.cash-drawer.read", "finance.read"] },
  accounting: { href: "/dashboard/accounting", permissions: ["accounting.reports.read"] },
  close_assurance: { href: "/dashboard/accounting/close", permissions: ["accounting.close.read"] },
  compliance: { href: "/dashboard/compliance", permissions: ["compliance.documents.read"] },
  purchasing: { href: "/dashboard/purchase-orders", permissions: ["purchases.orders.read"] },
  payroll: { href: "/dashboard/payroll", permissions: ["payroll.command.read"] },
  finance: { href: "/dashboard/finance", permissions: ["finance.dashboard.read", "finance.read"] },
  payment_reconciliation: { href: "/dashboard/finance/reconciliation", permissions: ["payments.reconciliation.read"] },
  analytics: { href: "/dashboard/analytics", permissions: ["reports.read", "dashboard.read"] },
  reports: { href: "/dashboard/analytics/reports", permissions: ["reports.read"], modules: ["analytics"] },
  settings: { href: "/dashboard/settings", permissions: ["MANAGE_SYSTEM_SETTINGS"] },
}

function hash(value: unknown) { return lifecycleEvidenceHash(value) }
function slugs(values: readonly string[]) { return [...new Set(values.filter(isCommercialModuleSlug))].sort() }
function manifestHash() { return hash({ catalog: getModuleCatalog(), destinations: COMPOSITION_DESTINATIONS }) }
function grantsForHash(grants: TenantModuleEntitlement[]) {
  return [...grants].sort((a, b) => a.moduleSlug.localeCompare(b.moduleSlug)).map(({ moduleSlug, status, source, startsAt, endsAt, readOnly, trial, metadata }) => ({ moduleSlug, status, source, startsAt, endsAt, readOnly, trial, authorityRevision: metadata?.authorityRevision ?? 1 }))
}

export function resolveCompositionModules(selected: readonly string[], catalog = getModuleCatalog()) {
  const bySlug = new Map(catalog.map((item) => [item.slug, item]))
  const issues: CompositionIssue[] = []
  const resolved = new Set<CommercialModuleSlug>()
  const visiting = new Set<CommercialModuleSlug>()
  const requiredBy = new Map<CommercialModuleSlug, Set<string>>()
  const visit = (slug: CommercialModuleSlug) => {
    if (visiting.has(slug)) { issues.push({ code: "DEPENDENCY_CYCLE", moduleSlug: slug, blocking: true }); return }
    if (resolved.has(slug)) return
    visiting.add(slug)
    for (const dependency of bySlug.get(slug)?.dependencies ?? []) {
      if (dependency.dependencyType !== "required") continue
      if (!bySlug.has(dependency.dependsOnSlug)) { issues.push({ code: "DEPENDENCY_UNAVAILABLE", moduleSlug: dependency.dependsOnSlug, blocking: true }); continue }
      const required = requiredBy.get(dependency.dependsOnSlug) ?? new Set<string>()
      required.add(slug)
      requiredBy.set(dependency.dependsOnSlug, required)
      visit(dependency.dependsOnSlug)
    }
    visiting.delete(slug)
    resolved.add(slug)
  }
  for (const slug of selected) {
    if (!isCommercialModuleSlug(slug)) issues.push({ code: "UNKNOWN_MODULE", moduleSlug: slug, blocking: true })
    else visit(slug)
  }
  catalog.filter((item) => item.core).forEach((item) => visit(item.slug))
  return { resolved: slugs([...resolved]), requiredBy: [...requiredBy].map(([moduleSlug, required]) => ({ moduleSlug, requiredBy: [...required].sort() })), issues }
}

async function loadState(actor: ModuleCompositionActor, client: Client) {
  const organization = await client.organization.findFirst({ where: { id: actor.organizationId, isActive: true, deletedAt: null }, select: { id: true, name: true, requestedModules: true } })
  if (!organization) throw new NotFoundError("Active organization not found")
  const [configuration, persisted, latestOperation] = await Promise.all([
    client.tenantModuleConfiguration.findUnique({ where: { organizationId: actor.organizationId } }),
    client.tenantModuleGrant.findMany({ where: { organizationId: actor.organizationId }, orderBy: { moduleSlug: "asc" } }),
    client.tenantModuleLifecycleOperation.findFirst({ where: { organizationId: actor.organizationId }, orderBy: { desiredRevision: "desc" }, select: { setupInputs: true } }),
  ])
  if (!configuration) {
    const retainedCommands = await client.tenantModuleConfigurationCommand.count({ where: { organizationId: actor.organizationId } })
    if (persisted.length || retainedCommands) throw new ConflictError("Module authority has no configuration record. Reconcile the retained records before changing this workspace.")
  }
  if ((configuration?.newWorkStoppedModules ?? []).some(slug => !isCommercialModuleSlug(slug) || getModuleCatalog().find(entry => entry.slug === slug)?.core)) throw new ConflictError("The stored admission policy requires reconciliation before configuration changes.")
  const legacy = deriveLegacyEntitlements({ requestedModules: organization.requestedModules })
  const grants: TenantModuleEntitlement[] = configuration ? persisted.map((item) => ({
    moduleSlug: item.moduleSlug as CommercialModuleSlug,
    status: item.status as TenantModuleEntitlement["status"], source: item.source as TenantModuleEntitlement["source"],
    startsAt: item.startsAt?.toISOString() ?? null, endsAt: item.endsAt?.toISOString() ?? null,
    readOnly: item.readOnly, trial: item.trial, metadata: { authorityRevision: item.revision },
  })) : legacy.entitlements
  const now = new Date().toISOString()
  const allowed = (moduleSlug: CommercialModuleSlug) => evaluateModuleEntitlement({ organizationId: actor.organizationId, userId: actor.actorId, moduleSlug, explicitEntitlements: grants, surfaceType: "navigation", surface: "module-composition", accessIntent: "read", mode: "enforce", actorPermissions: actor.actorPermissions, now }).allowed
  const entitled = slugs(grants.filter((grant) => allowed(grant.moduleSlug)).map((grant) => grant.moduleSlug))
  const active = configuration ? slugs(configuration.activeModules) : entitled
  const selected = configuration ? slugs(configuration.selectedModules) : active.filter((slug) => !getModuleCatalog().find((entry) => entry.slug === slug)?.core)
  return { organization, configuration, grants, legacyUnknownValues: configuration?.legacyUnknownValues ?? legacy.unknownRequestedModules, now, allowed, entitled, active, selected, revision: configuration?.revision ?? 0, activeRevision: configuration?.activeRevision ?? configuration?.revision ?? 0, stopped: slugs(configuration?.newWorkStoppedModules ?? []), stoppedAt: (configuration?.newWorkStoppedAt ?? {}) as Record<string, string>, setupInputs: normalizeCompositionSetupInputs(latestOperation?.setupInputs) }
}
type State = Awaited<ReturnType<typeof loadState>>

function setupFor(slug: CommercialModuleSlug, requirements: readonly CompositionLifecycleStep[]): CompositionSetup {
  const needsAccounting = ["accounting", "finance", "close_assurance", "payment_reconciliation", "pos", "purchasing"].includes(slug)
  const waiting = requirements.find(item => (item.moduleSlug === slug || (needsAccounting && item.moduleSlug === "accounting")) && item.status !== "SUCCEEDED")
  if (waiting) return { status: "required", code: waiting.code === "ACCOUNTING_SETUP_REQUIRED" || waiting.code === "PROVIDER_SETUP_REQUIRED" ? waiting.code : "DOMAIN_SETUP_NOT_ASSESSED", href: waiting.href ?? undefined }
  return { status: "ready", code: "NO_EXTRA_WORKSPACE_SETUP" }
}

function historyEntry(command: { id: string; state: string; resultRevision: number | null; expectedRevision: number; selectedModules: string[]; previousModules: string[]; createdAt: Date; actorId: string; errorCode: string | null; reviewSnapshot?: unknown }): CompositionHistoryEntry {
  const snapshot = command.reviewSnapshot as { stopNewWorkModules?: string[]; setupInputs?: unknown; preview?: { stopNewWorkModules?: string[]; setupInputs?: unknown } } | null
  return { id: command.id, state: command.state as CompositionHistoryEntry["state"], revision: command.resultRevision ?? command.expectedRevision, selectedModules: slugs(command.selectedModules), stopNewWorkModules: slugs(snapshot?.stopNewWorkModules ?? snapshot?.preview?.stopNewWorkModules ?? []), setupInputs: normalizeCompositionSetupInputs(snapshot?.setupInputs ?? snapshot?.preview?.setupInputs), previousModules: slugs(command.previousModules), createdAt: command.createdAt.toISOString(), actorId: command.actorId, errorCode: command.errorCode }
}

async function buildData(actor: ModuleCompositionActor, state: State, client: Client): Promise<ModuleCompositionData> {
  const historyPage = await readCompositionHistoryPage(actor, client)
  const [lifecycle, requirements, payrollPeriods, complianceAdapters] = await Promise.all([
    readModuleLifecycleInTx(client, { organizationId: actor.organizationId, revision: state.revision, activeRevision: state.activeRevision, actorId: actor.actorId }),
    observeModulePreparationInTx(client, { ...actor, modules: getModuleCatalog().filter(item => COMPOSITION_DESTINATIONS[item.slug]).map(item => item.slug), stoppedModules: state.stopped, setupInputs: state.setupInputs }),
    hasAnyRbacPermission(actor.actorPermissions, PAYROLL_PREPARATION_PERMISSIONS) ? client.payrollPeriod.findMany({ where: { organizationId: actor.organizationId, status: { not: "CLOSED" } }, orderBy: { periodStart: "desc" }, take: 50, select: { id: true, name: true, periodStart: true, periodEnd: true, payDate: true, countryCode: true } }) : [],
    hasAnyRbacPermission(actor.actorPermissions, COMPLIANCE_PREPARATION_PERMISSIONS) ? client.complianceAdapterConfig.findMany({ where: { organizationId: actor.organizationId }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, countryCode: true, authorityChannel: true, environment: true, status: true } }) : [],
  ])
  const required = resolveCompositionModules(state.selected).requiredBy
  const catalog = getModuleCatalog().map((entry) => {
    const grant = state.grants.find((item) => item.moduleSlug === entry.slug)
    const destination = COMPOSITION_DESTINATIONS[entry.slug]
    const canOpen = Boolean(destination && state.allowed(entry.slug) && (destination.modules ?? []).every(state.allowed) && hasAnyRbacPermission(actor.actorPermissions, destination.permissions))
    return { slug: entry.slug, name: entry.name, description: entry.description, core: entry.core, status: entry.status, owner: entry.owner, dependencies: entry.dependencies,
      grantStatus: grant?.status ?? null, grantSource: grant?.source ?? null, eligible: state.allowed(entry.slug), available: Boolean(destination), selected: state.selected.includes(entry.slug),
      required: required.some((item) => item.moduleSlug === entry.slug) || entry.core, canOpen, href: canOpen ? destination!.href : null, setup: setupFor(entry.slug, requirements), requirements: requirements.filter(item => item.moduleSlug === entry.slug).map(publicRequirement) }
  })
  return {
    organizationId: actor.organizationId, organizationName: state.organization.name, revision: state.revision, activeRevision: state.activeRevision, newWorkStoppedModules: state.stopped, stopOptions: getModuleStopOptions(), lifecycle, source: state.configuration ? "durable" : "legacy", generatedAt: state.now,
    selectedModules: state.selected, activeModules: state.active, preservedModules: state.entitled.filter((slug) => !state.active.includes(slug)), catalog,
    workspace: catalog.filter((item) => state.active.includes(item.slug) && item.canOpen && item.href).map((item) => ({ moduleSlug: item.slug, title: item.name, href: item.href! })),
    retainedWorkspace: catalog.filter(item => state.stopped.includes(item.slug) && item.canOpen && item.href).map(item => ({ moduleSlug: item.slug, title: item.name, href: item.href! })),
    history: historyPage.entries.filter(item => item.state !== "DRAFT"), drafts: historyPage.entries.filter(item => item.state === "DRAFT"), historyNextCursor: historyPage.nextCursor,
    historyAccessKey: hash({ organizationId: actor.organizationId, actorId: actor.actorId, permissions: [...new Set(actor.actorPermissions)].sort() }),
    limitations: [{ code: "ACCESS_PRESERVED", blocking: false }],
    setupInputs: visibleSetupInputs(actor, state.setupInputs), availablePayrollPeriods: payrollPeriods.map(period => ({ ...period, periodStart: period.periodStart.toISOString(), periodEnd: period.periodEnd.toISOString(), payDate: period.payDate.toISOString() })), availableComplianceAdapters: complianceAdapters,
  }
}

function publicRequirement(item: ModulePreparationObservation): CompositionLifecycleStep { const { inputHash: _inputHash, evidence: _evidence, ...result } = item; return result }
function visibleSetupInputs(actor: ModuleCompositionActor, setupInputs: ReturnType<typeof normalizeCompositionSetupInputs>) {
  return { ...(setupInputs.payrollPeriodId && hasAnyRbacPermission(actor.actorPermissions, PAYROLL_PREPARATION_PERMISSIONS) ? { payrollPeriodId: setupInputs.payrollPeriodId } : {}), ...(setupInputs.complianceAdapterId && hasAnyRbacPermission(actor.actorPermissions, COMPLIANCE_PREPARATION_PERMISSIONS) ? { complianceAdapterId: setupInputs.complianceAdapterId } : {}) }
}
function canReviewSetupScope(actor: ModuleCompositionActor, setupInputs: ReturnType<typeof normalizeCompositionSetupInputs>) {
  return (!setupInputs.payrollPeriodId || hasAnyRbacPermission(actor.actorPermissions, PAYROLL_PREPARATION_PERMISSIONS)) &&
    (!setupInputs.complianceAdapterId || hasAnyRbacPermission(actor.actorPermissions, COMPLIANCE_PREPARATION_PERMISSIONS))
}
function assertSetupScopePermission(actor: ModuleCompositionActor, setupInputs: ReturnType<typeof normalizeCompositionSetupInputs>) {
  if (!canReviewSetupScope(actor, setupInputs)) throw new ForbiddenError("The selected setup scope requires current payroll or compliance preparation permission.")
}

async function buildPreview(actor: ModuleCompositionActor, input: ModuleCompositionSelectionInput, state: State, client: Client): Promise<ModuleCompositionPreview> {
  const resolution = resolveCompositionModules(input.selectedModules)
  const issues: CompositionIssue[] = [...resolution.issues]
  const stopImpact = await getModuleStopImpactInTx(client, { organizationId: actor.organizationId, stopNewWorkModules: input.stopNewWorkModules ?? state.stopped, previousStoppedModules: state.stopped })
  if (!stopImpact.canStop) issues.push({ code: "STOP_UNSUPPORTED", blocking: true })
  const preparationModules = resolveCompositionModules([...resolution.resolved, ...stopImpact.resumed]).resolved
  const setupInputs = normalizeCompositionSetupInputs(input.setupInputs ?? visibleSetupInputs(actor, state.setupInputs))
  assertSetupScopePermission(actor, setupInputs)
  const setupScope = await readModuleSetupScopeInTx(client, actor.organizationId, setupInputs)
  const requirements = await observeModulePreparationInTx(client, { ...actor, modules: preparationModules, stoppedModules: stopImpact.stopNewWorkModules, setupInputs })
  if (input.expectedRevision !== state.revision) issues.push({ code: "CONFIGURATION_STALE", blocking: true })
  for (const slug of preparationModules) {
    if (!state.allowed(slug)) issues.push({ code: "ELIGIBILITY_REQUIRED", moduleSlug: slug, blocking: true })
    const entry = getModuleCatalog().find((item) => item.slug === slug)!
    if (!COMPOSITION_DESTINATIONS[slug] && !entry.core && !state.active.includes(slug)) issues.push({ code: "CATALOG_UNAVAILABLE", moduleSlug: slug, blocking: true })
  }
  const selectedModules = slugs(input.selectedModules).filter((slug) => !getModuleCatalog().find((entry) => entry.slug === slug)?.core)
  const removedFromWorkspace = state.active.filter((slug) => !resolution.resolved.includes(slug))
  if (removedFromWorkspace.length) issues.push({ code: "ACCESS_PRESERVED", blocking: false })
  // Validity can change without a grant row changing (for example, an
  // unselected grant expires). Bind the effective consequences as well as the
  // source rows, so a replay never accepts a different preserved-access set.
  const previewHash = hash({ version: 2, organizationId: actor.organizationId, actorId: actor.actorId, permissions: [...actor.actorPermissions].sort(), manifestHash: manifestHash(), revision: state.revision, activeRevision: state.activeRevision, selectedModules, activeModules: state.active, resolvedModules: resolution.resolved, removedFromWorkspace, preservedAccess: state.entitled, requiredBy: resolution.requiredBy, grants: grantsForHash(state.grants), stoppedAt: state.stoppedAt, stopImpact, setupInputs, setupScope, requirements: requirements.map(item => ({ moduleSlug: item.moduleSlug, stepKey: item.stepKey, inputHash: item.inputHash })), issues })
  return { revision: state.revision, previewHash, selectedModules, resolvedModules: resolution.resolved, additions: resolution.resolved.filter((slug) => !state.active.includes(slug)), kept: resolution.resolved.filter((slug) => state.active.includes(slug)), removedFromWorkspace, preservedAccess: state.entitled, requiredBy: resolution.requiredBy, issues, canApply: !issues.some((issue) => issue.blocking), commercial: { status: "no_purchase", messageCode: "EXISTING_ACCESS_ONLY" }, generatedAt: state.now, stopNewWorkModules: stopImpact.stopNewWorkModules, stopImpact, setupInputs, setupScope: {
    payrollPeriod: hasAnyRbacPermission(actor.actorPermissions, PAYROLL_PREPARATION_PERMISSIONS) ? setupScope.payrollPeriod : null,
    complianceAdapter: hasAnyRbacPermission(actor.actorPermissions, COMPLIANCE_PREPARATION_PERMISSIONS) ? setupScope.complianceAdapter : null,
  }, requirements: requirements.map(publicRequirement) }
}

export async function getModuleCompositionData(actor: ModuleCompositionActor): Promise<ModuleCompositionData> {
  return buildData(actor, await loadState(actor, db), db)
}
async function readCompositionHistoryPage(actor: ModuleCompositionActor, client: Client, beforeId?: string): Promise<CompositionHistoryPage> {
  if (beforeId && !await client.tenantModuleConfigurationCommand.findFirst({ where: { organizationId: actor.organizationId, id: beforeId }, select: { id: true } })) {
    throw new NotFoundError("Configuration record not found")
  }
  // Immutable command IDs and creation times give stable pages even when a new
  // draft arrives. Never accept a foreign tenant cursor or client date boundary.
  const rows = await client.tenantModuleConfigurationCommand.findMany({
    where: { organizationId: actor.organizationId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 26,
    ...(beforeId ? { cursor: { id: beforeId }, skip: 1 } : {}),
  })
  const commands = rows.slice(0, 25)
  const operations = commands.length ? await client.tenantModuleLifecycleOperation.findMany({ where: { organizationId: actor.organizationId, commandId: { in: commands.map(item => item.id) } } }) : []
  return {
    entries: commands.map(item => {
      const entry = historyEntry(item)
      const operation = operations.find(row => row.commandId === item.id)
      return { ...entry, setupInputs: visibleSetupInputs(actor, entry.setupInputs), ...(operation ? { state: operation.state, revision: operation.desiredRevision, operationId: operation.id, errorCode: operation.errorCode } : {}) }
    }),
    nextCursor: rows.length > 25 ? commands[commands.length - 1].id : null,
  }
}
export async function getModuleCompositionHistory(actor: ModuleCompositionActor, input: { beforeId: string }): Promise<CompositionHistoryPage> {
  if (!hasAnyRbacPermission(actor.actorPermissions, ["MANAGE_SYSTEM_SETTINGS"])) throw new ForbiddenError("Module administration permission is required")
  if (!input.beforeId?.trim() || input.beforeId.length > 128) throw new BusinessRuleError("A configuration history cursor is required")
  if (!await db.organization.findFirst({ where: { id: actor.organizationId, isActive: true, deletedAt: null }, select: { id: true } })) throw new NotFoundError("Active organization not found")
  return readCompositionHistoryPage(actor, db, input.beforeId)
}
export async function previewModuleComposition(actor: ModuleCompositionActor, input: ModuleCompositionSelectionInput): Promise<ModuleCompositionPreview> {
  return buildPreview(actor, input, await loadState(actor, db), db)
}

async function initialize(actor: ModuleCompositionActor, state: State, tx: Client) {
  if (state.configuration) return
  await tx.tenantModuleConfiguration.create({ data: { organizationId: actor.organizationId, revision: 0, activeRevision: 0, newWorkStoppedModules: [], newWorkStoppedAt: {}, selectedModules: state.selected, activeModules: state.active, legacyUnknownValues: state.legacyUnknownValues, manifestHash: manifestHash() } })
  if (state.grants.length) await tx.tenantModuleGrant.createMany({ data: state.grants.map((grant) => ({ organizationId: actor.organizationId, moduleSlug: grant.moduleSlug, status: grant.status, source: grant.source, startsAt: grant.startsAt ? new Date(grant.startsAt) : null, endsAt: grant.endsAt ? new Date(grant.endsAt) : null, readOnly: grant.readOnly, trial: grant.trial, metadata: { migrationOrigin: "verified_existing_legacy_access", capturedAt: state.now, unknownRequestedValues: state.legacyUnknownValues } })) })
  await tx.auditLog.create({ data: { organizationId: actor.organizationId, userId: actor.actorId, entityType: "TenantModuleConfiguration", entityId: actor.organizationId, action: "MODULE_LEGACY_AUTHORITY_SNAPSHOTTED", changes: { grantCount: state.grants.length, preservedModules: state.grants.map((grant) => grant.moduleSlug), unknownRequestedValues: state.legacyUnknownValues } } })
}

function assertCurrentRevision(input: { expectedRevision: number }, state: State) {
  if (input.expectedRevision !== state.revision) throw new ConflictError("Workspace configuration changed. Review the current configuration before submitting again.")
}
function commandPayload(actor: ModuleCompositionActor, input: ModuleCompositionDraftInput, kind: string, previewHash?: string) {
  return hash({ kind, actorId: actor.actorId, selectedModules: slugs(input.selectedModules), stopNewWorkModules: input.stopNewWorkModules ? [...new Set(input.stopNewWorkModules)].sort() : null, setupInputs: input.setupInputs ? normalizeCompositionSetupInputs(input.setupInputs) : null, expectedRevision: input.expectedRevision, previewHash: previewHash ?? null })
}
async function existingCommand(tx: Client, actor: ModuleCompositionActor, key: string, payloadHash: string) {
  const command = await tx.tenantModuleConfigurationCommand.findUnique({ where: { organizationId_idempotencyKey: { organizationId: actor.organizationId, idempotencyKey: key } } })
  if (command && (command.payloadHash !== payloadHash || command.actorId !== actor.actorId)) throw new IdempotencyConflictError()
  return command
}
async function transaction<T>(operation: (tx: Client) => Promise<T>): Promise<T> {
  // A lost race can be replayed once to find an already committed command. CAS
  // still rejects a different configuration; this never repeats external effects.
  for (let attempt = 0; ; attempt += 1) {
    try { return await db.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 30000 }) }
    catch (error) {
      const code = error && typeof error === "object" && "code" in error ? error.code : null
      if (attempt === 0 && (code === "P2034" || code === "P2002")) continue
      if (code === "P2034") throw new ConflictError("Workspace changed concurrently. Refresh and review before retrying.")
      throw error
    }
  }
}

async function saveDraftInTx(actor: ModuleCompositionActor, input: ModuleCompositionDraftInput, tx: Client, kind = "draft") {
  await lockModuleAdmissionPolicyInTx(tx, actor.organizationId)
  if (input.selectedModules.some((slug) => !isCommercialModuleSlug(slug))) throw new BusinessRuleError("Unsupported module slug")
  const payloadHash = commandPayload(actor, input, kind)
  const state = await loadState(actor, tx)
  const existing = await existingCommand(tx, actor, input.idempotencyKey, payloadHash)
  if (existing) return historyEntry(existing)
  assertSetupScopePermission(actor, normalizeCompositionSetupInputs(input.setupInputs ?? visibleSetupInputs(actor, state.setupInputs)))
  assertCurrentRevision(input, state)
  await initialize(actor, state, tx)
  const command = await tx.tenantModuleConfigurationCommand.create({ data: { organizationId: actor.organizationId, idempotencyKey: input.idempotencyKey, payloadHash, expectedRevision: input.expectedRevision, state: "DRAFT", selectedModules: slugs(input.selectedModules), previousModules: state.selected, reviewSnapshot: { stopNewWorkModules: input.stopNewWorkModules ?? state.stopped, setupInputs: normalizeCompositionSetupInputs(input.setupInputs ?? visibleSetupInputs(actor, state.setupInputs)) }, actorId: actor.actorId } })
  return historyEntry(command)
}
export async function saveModuleCompositionDraft(actor: ModuleCompositionActor, input: ModuleCompositionDraftInput) {
  return transaction((tx) => saveDraftInTx(actor, input, tx))
}
export async function reopenModuleComposition(actor: ModuleCompositionActor, input: ModuleCompositionReopenInput) {
  return transaction(async (tx) => {
    const previous = await tx.tenantModuleConfigurationCommand.findFirst({ where: { id: input.commandId, organizationId: actor.organizationId } })
    if (!previous) throw new NotFoundError("Configuration record not found")
    return saveDraftInTx(actor, { selectedModules: previous.selectedModules, stopNewWorkModules: historyEntry(previous).stopNewWorkModules, setupInputs: historyEntry(previous).setupInputs, expectedRevision: input.expectedRevision, idempotencyKey: input.idempotencyKey }, tx, `reopen:${input.commandId}`)
  })
}

export async function applyModuleComposition(actor: ModuleCompositionActor, input: ModuleCompositionApplyInput): Promise<ModuleCompositionApplyResult> {
  const result = await transaction(async (tx) => {
    await lockModuleAdmissionPolicyInTx(tx, actor.organizationId)
    if (input.selectedModules.some((slug) => !isCommercialModuleSlug(slug))) throw new BusinessRuleError("Unsupported module slug")
    const payloadHash = commandPayload(actor, input, "apply", input.previewHash)
    const state = await loadState(actor, tx)
    const existing = await existingCommand(tx, actor, input.idempotencyKey, payloadHash)
    if (existing) return { command: existing, alreadyApplied: true }
    assertCurrentRevision(input, state)
    const preview = await buildPreview(actor, input, state, tx)
    if (input.previewHash !== preview.previewHash) throw new ConflictError("Configuration, access or setup evidence changed. Review a fresh impact preview.")
    await initialize(actor, state, tx)
    const issue = preview.issues.find((item) => item.blocking)
    const command = await tx.tenantModuleConfigurationCommand.create({ data: { organizationId: actor.organizationId, idempotencyKey: input.idempotencyKey, payloadHash, expectedRevision: input.expectedRevision, resultRevision: null, state: issue ? "FAILED" : "REQUESTED", selectedModules: preview.selectedModules, previousModules: state.selected, previewHash: preview.previewHash, reviewSnapshot: JSON.parse(JSON.stringify({ manifestHash: manifestHash(), preview, grantAuthority: grantsForHash(state.grants) })) as Prisma.InputJsonValue, errorCode: issue?.code ?? null, actorId: actor.actorId } })
    if (!issue) {
      const stopped = slugs([...state.stopped, ...preview.stopImpact.newlyStopped])
      const stoppedAt = { ...state.stoppedAt }
      for (const slug of preview.stopImpact.newlyStopped) stoppedAt[slug] = state.now
      const updated = await tx.tenantModuleConfiguration.updateMany({ where: { organizationId: actor.organizationId, revision: input.expectedRevision }, data: { selectedModules: preview.selectedModules, revision: { increment: 1 }, newWorkStoppedModules: stopped, newWorkStoppedAt: stoppedAt, manifestHash: manifestHash() } })
      if (updated.count !== 1) throw new ConflictError("Workspace changed concurrently. Review the current configuration.")
      const operation = await tx.tenantModuleLifecycleOperation.create({ data: {
        organizationId: actor.organizationId, commandId: command.id, desiredRevision: state.revision + 1, baseActiveRevision: state.activeRevision,
        desiredModules: preview.resolvedModules, stopNewWorkModules: preview.stopNewWorkModules,
        authorityHash: await authorityHash(actor, { ...state, stopped, stoppedAt, setupInputs: preview.setupInputs }, preview.resolvedModules, preview.stopImpact, tx), setupInputs: preview.setupInputs, actorId: actor.actorId,
      } })
      const requestEvidence = { previewHash: preview.previewHash, desiredRevision: state.revision + 1, previousActiveRevision: state.activeRevision, stoppedModules: stopped, stoppedAt, stopEvidenceHash: preview.stopImpact.evidenceHash }
      await tx.tenantModuleLifecycleEvent.create({ data: { organizationId: actor.organizationId, operationId: operation.id, sequence: 0, eventKey: "requested", eventType: "REQUEST_ACCEPTED", state: "REQUESTED", actorId: actor.actorId,
        evidence: requestEvidence,
        evidenceHash: lifecycleEvidenceHash(requestEvidence),
      } })
      for (const step of preview.requirements) await tx.tenantModuleLifecycleStep.create({ data: { organizationId: actor.organizationId, operationId: operation.id, moduleSlug: step.moduleSlug, stepKey: step.stepKey, inputHash: step.evidenceHash!, state: "PENDING", code: step.code, href: step.href } })
    }
    await tx.auditLog.create({ data: { organizationId: actor.organizationId, userId: actor.actorId, entityType: "TenantModuleConfiguration", entityId: actor.organizationId, action: issue ? "MODULE_CONFIGURATION_REJECTED" : "MODULE_CONFIGURATION_REQUESTED", changes: { commandId: command.id, previousActiveRevision: state.activeRevision, desiredRevision: issue ? state.revision : state.revision + 1, preservedAccess: preview.preservedAccess, newlyStopped: issue ? [] : preview.stopImpact.newlyStopped, errorCode: issue?.code ?? null } } })
    return { command, alreadyApplied: false }
  })
  const operation = await db.tenantModuleLifecycleOperation.findFirst({ where: { organizationId: actor.organizationId, commandId: result.command.id } })
  if (operation && !result.alreadyApplied) await prepareModuleLifecycle(actor, { operationId: operation.id, expectedRevision: operation.desiredRevision, idempotencyKey: `initial:${input.idempotencyKey}` })
  return compositionResult(actor, result.command.id, result.alreadyApplied)
}

async function authorityHash(actor: ModuleCompositionActor, state: State, desiredModules: readonly string[], stopImpact: ModuleStopImpact, tx: Client) {
  return hash({ version: 1, organizationId: actor.organizationId, actorId: actor.actorId, permissions: [...actor.actorPermissions].sort(),
    grants: grantsForHash(state.grants), effectiveAccess: state.entitled, manifest: manifestHash(), desiredModules,
    desiredStops: stopImpact.stopNewWorkModules, stopPolicyHash: stopImpact.policyHash, stopped: state.stopped, stoppedAt: state.stoppedAt, setupScopeHash: await moduleSetupScopeHashInTx(tx, actor.organizationId, state.setupInputs) })
}

async function compositionResult(actor: ModuleCompositionActor, commandId: string, alreadyApplied: boolean): Promise<ModuleCompositionApplyResult> {
  const [command, operation, data] = await Promise.all([
    db.tenantModuleConfigurationCommand.findFirst({ where: { id: commandId, organizationId: actor.organizationId } }),
    db.tenantModuleLifecycleOperation.findFirst({ where: { commandId, organizationId: actor.organizationId } }), getModuleCompositionData(actor),
  ])
  if (!command) throw new NotFoundError("Configuration record not found")
  const errorCode = operation?.errorCode ?? command.errorCode
  return { commandId, state: operation?.state ?? (command.state === "ACTIVE" ? "ACTIVE" : "FAILED"), revision: operation?.desiredRevision ?? command.resultRevision ?? command.expectedRevision,
    alreadyApplied, issue: errorCode ? { code: errorCode as CompositionIssue["code"], blocking: true } : null, data }
}

/** Claims one short read-only preparation attempt. The durable lease makes an
 * interrupted request resumable, and the evidence log records actual checks. */
async function prepareModuleLifecycle(actor: ModuleCompositionActor, input: ModuleCompositionResumeInput) {
  const leaseToken = randomUUID()
  const claimed = await transaction(async tx => {
    await lockModuleAdmissionPolicyInTx(tx, actor.organizationId)
    const state = await loadState(actor, tx)
    const operation = await tx.tenantModuleLifecycleOperation.findFirst({ where: { id: input.operationId, organizationId: actor.organizationId } })
    if (!operation) throw new NotFoundError("Preparation record not found")
    if (operation.actorId !== actor.actorId) throw new ConflictError("This request was reviewed by another actor. Submit a new review under your current authority.")
    if (["ACTIVE", "RETAINED"].includes(operation.state)) return null
    const priorAttempt = await tx.tenantModuleLifecycleEvent.findFirst({ where: { organizationId: actor.organizationId, operationId: operation.id, eventKey: `attempt:${input.idempotencyKey}` } })
    if (priorAttempt && operation.state !== "PREPARING") return null
    if (operation.state === "PREPARING" && operation.leaseUntil && operation.leaseUntil > new Date()) return null
    const stopImpact = await getModuleStopImpactInTx(tx, { organizationId: actor.organizationId, stopNewWorkModules: operation.stopNewWorkModules, previousStoppedModules: state.stopped })
    if (input.expectedRevision !== state.revision || operation.desiredRevision !== state.revision || operation.baseActiveRevision !== state.activeRevision || !canReviewSetupScope(actor, state.setupInputs) || operation.authorityHash !== await authorityHash(actor, state, operation.desiredModules, stopImpact, tx) || !stopImpact.canStop) {
      await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `stale:${input.idempotencyKey}:${operation.version}`, eventType: "REVIEW_REQUIRED", state: "FAILED", errorCode: "CONFIGURATION_STALE", leaseToken: null, leaseUntil: null, evidence: { currentRevision: state.revision, currentActiveRevision: state.activeRevision } })
      return null
    }
    const claimedOperation = await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: priorAttempt ? `lease-recovered:${input.idempotencyKey}:${operation.version}` : `attempt:${input.idempotencyKey}`, eventType: "PREPARATION_STARTED", state: "PREPARING", errorCode: null, leaseToken, leaseUntil: new Date(Date.now() + 60000), evidence: { requestKey: input.idempotencyKey, resumed: operation.version > 0 } })
    await tx.tenantModuleLifecycleStep.updateMany({ where: { organizationId: actor.organizationId, operationId: operation.id, state: { not: "SUCCEEDED" } }, data: { state: "RUNNING" } })
    return claimedOperation
  })
  if (!claimed) return
  try {
    await transaction(async tx => {
      await lockModuleAdmissionPolicyInTx(tx, actor.organizationId)
      const state = await loadState(actor, tx)
      let operation = await tx.tenantModuleLifecycleOperation.findFirst({ where: { id: input.operationId, organizationId: actor.organizationId } })
      if (!operation || operation.leaseToken !== leaseToken || operation.state !== "PREPARING") throw new ConflictError("Preparation lease changed. Refresh its current state.")
      const stopImpact = await getModuleStopImpactInTx(tx, { organizationId: actor.organizationId, stopNewWorkModules: operation.stopNewWorkModules, previousStoppedModules: state.stopped })
      if (operation.desiredRevision !== state.revision || operation.baseActiveRevision !== state.activeRevision || !canReviewSetupScope(actor, state.setupInputs) || operation.authorityHash !== await authorityHash(actor, state, operation.desiredModules, stopImpact, tx) || !stopImpact.canStop) {
        await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `stale-final:${leaseToken}`, eventType: "REVIEW_REQUIRED", state: "FAILED", errorCode: "CONFIGURATION_STALE", leaseToken: null, leaseUntil: null, evidence: { currentRevision: state.revision } })
        return
      }
      const modules = resolveCompositionModules([...operation.desiredModules, ...stopImpact.resumed]).resolved
      const observations = [...await observeModulePreparationInTx(tx, { ...actor, modules, stoppedModules: operation.stopNewWorkModules, setupInputs: normalizeCompositionSetupInputs(operation.setupInputs) })]
      for (const impact of stopImpact.impacts) observations.push({ moduleSlug: impact.moduleSlug, stepKey: "retained-obligations", status: impact.pendingCount ? "WAITING_INPUT" : "SUCCEEDED", code: impact.pendingCount ? "OBLIGATIONS_PENDING" : "SETUP_VERIFIED", href: COMPOSITION_DESTINATIONS[impact.moduleSlug]?.href ?? null, checkedAt: new Date().toISOString(), attempts: 0, inputHash: stopImpact.evidenceHash, evidenceHash: stopImpact.evidenceHash, evidence: { observations: impact.observations, pendingCount: impact.pendingCount, scope: "retained obligations and unfinished drafts" } })
      const previousSteps = await tx.tenantModuleLifecycleStep.findMany({ where: { organizationId: actor.organizationId, operationId: operation.id } })
      for (const observation of observations) {
        const previous = previousSteps.find(step => step.moduleSlug === observation.moduleSlug && step.stepKey === observation.stepKey)
        if (previous?.state === "SUCCEEDED" && previous.inputHash === observation.inputHash && observation.status === "SUCCEEDED") continue
        const data = { inputHash: observation.inputHash, state: observation.status, code: observation.code, href: observation.href, attempts: (previous?.attempts ?? 0) + 1, evidence: observation.evidence, evidenceHash: observation.evidenceHash, checkedAt: new Date(observation.checkedAt!) }
        if (previous) await tx.tenantModuleLifecycleStep.updateMany({ where: { id: previous.id, organizationId: actor.organizationId }, data })
        else await tx.tenantModuleLifecycleStep.create({ data: { organizationId: actor.organizationId, operationId: operation.id, moduleSlug: observation.moduleSlug, stepKey: observation.stepKey, ...data } })
        operation = await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `step:${leaseToken}:${observation.moduleSlug}:${observation.stepKey}`, eventType: "PREPARATION_OBSERVED", state: "PREPARING", evidence: { moduleSlug: observation.moduleSlug, stepKey: observation.stepKey, status: observation.status, code: observation.code, inputHash: observation.inputHash, observed: observation.evidence } })
      }
      const waiting = observations.some(step => step.status !== "SUCCEEDED")
      if (waiting || !stopImpact.canRetain) {
        await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `waiting:${leaseToken}`, eventType: "PREPARATION_WAITING", state: "REQUESTED", leaseToken: null, leaseUntil: null, evidence: { waitingSteps: observations.filter(step => step.status !== "SUCCEEDED").map(step => ({ moduleSlug: step.moduleSlug, stepKey: step.stepKey, code: step.code })), previousActiveRevision: state.activeRevision } })
        return
      }
      const stoppedAt = Object.fromEntries(Object.entries(state.stoppedAt).filter(([slug]) => operation!.stopNewWorkModules.includes(slug)))
      const changed = await tx.tenantModuleConfiguration.updateMany({ where: { organizationId: actor.organizationId, revision: operation.desiredRevision, activeRevision: operation.baseActiveRevision }, data: { activeModules: operation.desiredModules, activeRevision: operation.desiredRevision, newWorkStoppedModules: operation.stopNewWorkModules, newWorkStoppedAt: stoppedAt } })
      if (changed.count !== 1) throw new ConflictError("A newer request replaced this preparation. Review current configuration.")
      const completedState = operation.stopNewWorkModules.length ? "RETAINED" : "ACTIVE"
      await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `completed:${leaseToken}`, eventType: "CONFIGURATION_ACTIVATED", state: completedState, leaseToken: null, leaseUntil: null, completedAt: new Date(), evidence: { activeRevision: operation.desiredRevision, activeModules: operation.desiredModules, stoppedModules: operation.stopNewWorkModules, stoppedAt, stopEvidenceHash: stopImpact.evidenceHash } })
      await tx.auditLog.create({ data: { organizationId: actor.organizationId, userId: actor.actorId, entityType: "TenantModuleConfiguration", entityId: actor.organizationId, action: "MODULE_CONFIGURATION_ACTIVATED", changes: { operationId: operation.id, activeRevision: operation.desiredRevision, stoppedModules: operation.stopNewWorkModules, resumedModules: stopImpact.resumed } } })
    })
  } catch (error) {
    await transaction(async tx => {
      await lockModuleAdmissionPolicyInTx(tx, actor.organizationId)
      const operation = await tx.tenantModuleLifecycleOperation.findFirst({ where: { id: input.operationId, organizationId: actor.organizationId } })
      if (!operation || operation.leaseToken !== leaseToken) return
      await tx.tenantModuleLifecycleStep.updateMany({ where: { organizationId: actor.organizationId, operationId: operation.id, state: "RUNNING" }, data: { state: "FAILED", code: "PREPARATION_FAILED" } })
      await appendModuleLifecycleEventInTx(tx, operation, { actorId: actor.actorId, eventKey: `failed:${leaseToken}`, eventType: "PREPARATION_FAILED", state: "FAILED", leaseToken: null, leaseUntil: null, errorCode: error instanceof ConflictError ? "CONFIGURATION_STALE" : "PREPARATION_FAILED", evidence: { category: error instanceof ConflictError ? "CONFLICT" : "READINESS_UNAVAILABLE", previousActiveRevision: operation.baseActiveRevision } })
    })
  }
}

export async function resumeModuleComposition(actor: ModuleCompositionActor, input: ModuleCompositionResumeInput): Promise<ModuleCompositionApplyResult> {
  await prepareModuleLifecycle(actor, input)
  const operation = await db.tenantModuleLifecycleOperation.findFirst({ where: { id: input.operationId, organizationId: actor.organizationId } })
  if (!operation) throw new NotFoundError("Preparation record not found")
  return compositionResult(actor, operation.commandId, false)
}
