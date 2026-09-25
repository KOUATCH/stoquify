import "server-only"

import { createHash } from "crypto"
import { Prisma } from "@prisma/client"
import { collectAccountingSetupReadinessIssues } from "@/services/accounting/accounting-settings.service"
import { assertProviderAccountReconciliationReady } from "@/services/reconciliation/payment-reconciliation-evidence.service"
import { BusinessRuleError } from "@/services/_shared/action-errors"
import { hasAnyRbacPermission } from "@/lib/security/rbac-permissions"
import { getPayrollSetupReadiness } from "@/services/payroll/payroll-setup-readiness.service"
import { credentialReferenceSchema } from "@/services/compliance/country-adapter-pilot.schemas"
import { resolveEInvoicingMetadata } from "@/services/compliance/country-pack-hooks"
import { CAMEROON_DGI_SANDBOX_ADAPTER_CODE } from "@/services/regulatory/country-packs/cameroon.constants"
import type { CommercialModuleSlug } from "./module-control-contracts"
import type { CompositionLifecycleStep, CompositionRequirementCode, CompositionSetupInputs } from "./module-composition-contracts"

export type ModulePreparationObservation = CompositionLifecycleStep & { inputHash: string; evidence: Prisma.InputJsonObject }
function canonicalEvidence(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(canonicalEvidence)
  if (value && typeof value === "object") {
    if ("toJSON" in value && typeof value.toJSON === "function") return canonicalEvidence(value.toJSON())
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([key, item]) => [key, canonicalEvidence(item)]))
  }
  return value
}
/** JSONB preserves values, not object insertion order. Evidence must survive
 * storage/reload, including maps of admission timestamps and reviewed scopes. */
export function lifecycleEvidenceHash(value: unknown): string { return createHash("sha256").update(JSON.stringify(canonicalEvidence(value))).digest("hex") }
export const PAYROLL_PREPARATION_PERMISSIONS = ["payroll.runs.calculate", "payroll.runs.approve", "payroll.runs.post"]
export const COMPLIANCE_PREPARATION_PERMISSIONS = ["compliance.documents.read"]
export function normalizeCompositionSetupInputs(value: unknown): CompositionSetupInputs {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const candidate = value as Record<string, unknown>
  return { ...(typeof candidate.payrollPeriodId === "string" && candidate.payrollPeriodId ? { payrollPeriodId: candidate.payrollPeriodId } : {}), ...(typeof candidate.complianceAdapterId === "string" && candidate.complianceAdapterId ? { complianceAdapterId: candidate.complianceAdapterId } : {}) }
}

/** The declared scope is part of review authority; setup evidence inside that
 * scope may change. Changing dates/country/environment requires another review. */
export async function moduleSetupScopeHashInTx(tx: Prisma.TransactionClient, organizationId: string, setupInputs: CompositionSetupInputs) {
  const scope = await readModuleSetupScopeInTx(tx, organizationId, setupInputs)
  const adapter = scope.complianceAdapter
  return lifecycleEvidenceHash({ setupInputs, payrollPeriod: scope.payrollPeriod, complianceAdapter: adapter ? { id: adapter.id, countryCode: adapter.countryCode, authorityChannel: adapter.authorityChannel, environment: adapter.environment, adapterKey: adapter.adapterKey } : null })
}
export async function readModuleSetupScopeInTx(tx: Prisma.TransactionClient, organizationId: string, setupInputs: CompositionSetupInputs) {
  const [payroll, compliance] = await Promise.all([
    setupInputs.payrollPeriodId ? tx.payrollPeriod.findFirst({ where: { id: setupInputs.payrollPeriodId, organizationId }, select: { id: true, name: true, countryCode: true, periodStart: true, periodEnd: true, payDate: true } }) : null,
    setupInputs.complianceAdapterId ? tx.complianceAdapterConfig.findFirst({ where: { id: setupInputs.complianceAdapterId, organizationId }, select: { id: true, countryCode: true, authorityChannel: true, environment: true, adapterKey: true, status: true } }) : null,
  ])
  return { payrollPeriod: payroll ? { ...payroll, periodStart: payroll.periodStart.toISOString(), periodEnd: payroll.periodEnd.toISOString(), payDate: payroll.payDate.toISOString() } : null, complianceAdapter: compliance }
}

function observation(moduleSlug: CommercialModuleSlug, stepKey: string, ready: boolean, code: CompositionRequirementCode, href: string | null, evidence: Prisma.InputJsonObject, checkedAt: Date): ModulePreparationObservation {
  const inputHash = lifecycleEvidenceHash({ version: 1, moduleSlug, stepKey, ready, evidence })
  return { moduleSlug, stepKey, status: ready ? "SUCCEEDED" : "WAITING_INPUT", code: ready ? "SETUP_VERIFIED" : code, href, checkedAt: checkedAt.toISOString(), evidenceHash: inputHash, inputHash, evidence, attempts: 0 }
}

/** Read-only observations of existing domain-owned setup. A query failure is an
 * unavailable preparation attempt; it is never converted to zero successful rows.
 * These checks do not grant authority, lock accounting or contact a provider. */
export async function observeModulePreparationInTx(tx: Prisma.TransactionClient, input: { organizationId: string; modules: readonly CommercialModuleSlug[]; stoppedModules: readonly string[]; actorId?: string; actorPermissions?: readonly string[]; setupInputs?: CompositionSetupInputs }, now = new Date()): Promise<ModulePreparationObservation[]> {
  const selected = new Set(input.modules.filter(slug => !input.stoppedModules.includes(slug)))
  const observations: ModulePreparationObservation[] = []
  const organizationId = input.organizationId
  if (["accounting", "finance", "payment_reconciliation", "close_assurance", "pos", "purchasing"].some(slug => selected.has(slug as CommercialModuleSlug))) {
    const [settings, issues, accounts, journals, periods, rules, lines] = await Promise.all([
      tx.organizationAccountingSettings.findUnique({ where: { organizationId }, select: { accountingEnabled: true, setupStatus: true, updatedAt: true } }),
      collectAccountingSetupReadinessIssues(organizationId, tx, now),
      tx.chartOfAccount.findMany({ where: { organizationId }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
      tx.journal.findMany({ where: { organizationId }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
      tx.accountingPeriod.findMany({ where: { organizationId }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
      tx.postingRule.findMany({ where: { organizationId }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
      tx.postingRuleLine.findMany({ where: { organizationId }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } }),
    ])
    const ready = Boolean(settings?.accountingEnabled && settings.setupStatus === "READY" && issues.length === 0)
    // Persist only counts/hash and stable issue summaries, never chart balances.
    observations.push(observation("accounting", "accounting-foundation", ready, "ACCOUNTING_SETUP_REQUIRED", "/dashboard/accounting/settings", {
      settingsEnabled: settings?.accountingEnabled ?? false, settingsStatus: settings?.setupStatus ?? "MISSING",
      sourceHash: lifecycleEvidenceHash({ settings, accounts, journals, periods, rules, lines }), issueCount: issues.length,
      issues: issues.slice(0, 40), scope: "current accounting setup; domain operation checks still apply",
    }, now))
  }
  if (selected.has("payment_reconciliation")) {
    const providers = await tx.providerAccount.findMany({ where: { organizationId }, orderBy: { id: "asc" }, select: {
      id: true, status: true, updatedAt: true, settlementLedgerAccountId: true, suspenseLedgerAccountId: true,
      paymentRail: { select: { id: true, isActive: true } },
      settlementAccounts: { where: { approvalStatus: "APPROVED", effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }, select: { id: true, updatedAt: true }, orderBy: { id: "asc" } },
    } })
    const readyProviders: string[] = []
    for (const provider of providers) {
      try { assertProviderAccountReconciliationReady(provider) }
      catch (error) { if (error instanceof BusinessRuleError) continue; throw error }
      const accounts = await tx.chartOfAccount.count({ where: { organizationId, id: { in: [...new Set([provider.settlementLedgerAccountId!, provider.suspenseLedgerAccountId!])] }, isActive: true, deletedAt: null, children: { none: {} } } })
      if (accounts === new Set([provider.settlementLedgerAccountId, provider.suspenseLedgerAccountId]).size) readyProviders.push(provider.id)
    }
    observations.push(observation("payment_reconciliation", "provider-foundation", readyProviders.length > 0, "PROVIDER_SETUP_REQUIRED", "/dashboard/finance/reconciliation", {
      providerCount: providers.length, readyProviderCount: readyProviders.length, sourceHash: lifecycleEvidenceHash(providers),
      scope: "at least one currently approved provider account; each reconciliation rechecks its selected account",
    }, now))
  }
  if (selected.has("pos")) {
    const terminals = await tx.pOSStation.findMany({ where: { organizationId, isActive: true, location: { organizationId, isActive: true, deletedAt: null } }, select: { id: true, locationId: true, updatedAt: true, hasCashDrawer: true, cashDrawers: { select: { id: true } } }, orderBy: { id: "asc" } })
    const ready = terminals.some(terminal => !terminal.hasCashDrawer || terminal.cashDrawers.length > 0)
    observations.push(observation("pos", "terminal-foundation", ready, "POS_SETUP_REQUIRED", "/dashboard/settings/terminals", { activeTerminalCount: terminals.length, sourceHash: lifecycleEvidenceHash(terminals), scope: "configured terminal/location; shift, cashier, fiscal and offline enrollment checks remain operation-specific" }, now))
  }
  if (selected.has("payroll")) {
    const authorized = hasAnyRbacPermission(input.actorPermissions, PAYROLL_PREPARATION_PERMISSIONS)
    const period = authorized && input.setupInputs?.payrollPeriodId ? await tx.payrollPeriod.findFirst({ where: { id: input.setupInputs.payrollPeriodId, organizationId, status: { not: "CLOSED" } } }) : null
    const readiness = period ? await getPayrollSetupReadiness({ organizationId, actorId: input.actorId, actorPermissions: input.actorPermissions, countryCode: period.countryCode, periodStart: period.periodStart, periodEnd: period.periodEnd, payDate: period.payDate, maxRows: 1000 }, tx) : null
    const evidence = readiness ? { periodId: period!.id, periodRevision: period!.updatedAt.toISOString(), countryCode: period!.countryCode,
      sourceHash: lifecycleEvidenceHash({ period, input: readiness.input, checks: readiness.checks, blockers: readiness.blockers, warnings: readiness.warnings }),
      blockers: readiness.blockers.map(item => item.code), warningCodes: readiness.warnings.map(item => item.code),
      scope: "selected tenant payroll period; current dry-run accounting, country-pack and employee-source checks" } : { scope: "Select an existing tenant payroll period under payroll setup authority; its actual country and dates are required.", authorized }
    observations.push(observation("payroll", "payroll-scope", readiness?.status === "READY", "PAYROLL_SCOPE_REQUIRED", "/dashboard/payroll", evidence, now))
  }
  if (selected.has("compliance")) {
    const authorized = hasAnyRbacPermission(input.actorPermissions, COMPLIANCE_PREPARATION_PERMISSIONS)
    const adapter = authorized && input.setupInputs?.complianceAdapterId ? await tx.complianceAdapterConfig.findFirst({ where: { id: input.setupInputs.complianceAdapterId, organizationId } }) : null
    const supported = adapter?.environment === "SANDBOX" && adapter.adapterKey === CAMEROON_DGI_SANDBOX_ADAPTER_CODE && adapter.countryCode === "CM"
    let metadata: ReturnType<typeof resolveEInvoicingMetadata> | null = null
    if (supported) metadata = resolveEInvoicingMetadata({ countryCode: adapter.countryCode, date: now })
    const ready = Boolean(supported && adapter?.status === "ACTIVE" && credentialReferenceSchema.safeParse(adapter.credentialReference).success &&
      (!adapter.credentialExpiresAt || adapter.credentialExpiresAt > now) && adapter.officialSpecHash && adapter.officialSpecVersion && adapter.officialSpecPublishedAt && adapter.officialSpecReference &&
      ["EXPERT_APPROVED", "REGULATOR_CONFIRMED"].includes(adapter.reviewStatus) && adapter.reviewEvidenceHash && adapter.reviewedAt && adapter.reviewedById &&
      metadata?.packVersion === adapter.countryPackVersion && metadata.capabilityStatus === adapter.capabilityStatus)
    const result = observation("compliance", "compliance-scope", ready, adapter && !supported ? "COMPLIANCE_SCOPE_UNAVAILABLE" : "COMPLIANCE_SETUP_REQUIRED", "/dashboard/compliance", {
      authorized, environment: adapter?.environment ?? "UNSELECTED", countryCode: adapter?.countryCode ?? "UNSELECTED", sourceHash: lifecycleEvidenceHash({ adapter, metadata: metadata?.combinedResolutionHash }),
      scope: "Cameroon DGI sandbox only; production tax-authority submission remains unavailable and has no statutory certification effect",
    }, now)
    if (ready) result.code = "COMPLIANCE_SANDBOX_VERIFIED"
    observations.push(result)
  }
  return observations
}
