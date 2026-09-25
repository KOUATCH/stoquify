import "server-only"

import { createHash } from "crypto"
import type { Prisma } from "@prisma/client"
import { getModuleCatalog, getModuleCatalogEntry } from "./module-catalog.service"
import { isCommercialModuleSlug, type CommercialModuleSlug } from "./module-control-contracts"
import { moduleNewWorkBlockers } from "./module-admission.service"
import { getModuleReconciliationObligations } from "./module-reconciliation-obligations.service"
import { getModuleOperationalDependencies } from "./module-operational-dependencies"

type Client = Prisma.TransactionClient
export type ModuleStopObservation = { code: string; count: number; kind: "draft" | "obligation" }
export type ModuleStopImpactItem = {
  moduleSlug: CommercialModuleSlug; supported: boolean; newWork: string[]; continuation: string[]
  unsupportedReason?: "OFFLINE_CONTINUATION_UNAVAILABLE" | "STOP_UNSUPPORTED"
  dependentModules: CommercialModuleSlug[]; observations: ModuleStopObservation[]; pendingCount: number
}
export type ModuleStopImpact = {
  stopNewWorkModules: CommercialModuleSlug[]; newlyStopped: CommercialModuleSlug[]; resumed: CommercialModuleSlug[]
  canStop: boolean; canRetain: boolean; policyHash: string; evidenceHash: string; impacts: ModuleStopImpactItem[]
}

// Only owner boundaries with verified admission and continuation are enabled.
// Direct reconciliation stopping needs a retained scope for late provider
// evidence. Accounting stops only new manual journals; required ledger controls
// continue. Sales/POS also need the
// separately reviewed offline continuation and ingestion serialization.
const policies: Partial<Record<CommercialModuleSlug, { supported: boolean; newWork: string[]; continuation: string[] }>> = {
  inventory: { supported: true, newWork: ["inventory_adjustments", "inventory_transfers", "inventory_counts"], continuation: ["existing_inventory_work", "mandatory_stock_effects"] },
  sales: { supported: false, newWork: ["sales_orders"], continuation: ["existing_sales_work", "refunds_and_settlement"] },
  pos: { supported: false, newWork: ["pos_sales", "pos_shifts"], continuation: ["close_shifts", "refunds_and_settlement", "accepted_offline_replay"] },
  purchasing: { supported: true, newWork: ["purchase_orders"], continuation: ["existing_purchase_work", "supplier_settlement"] },
  payroll: { supported: true, newWork: ["payroll_periods", "payroll_runs"], continuation: ["existing_payroll_work", "payroll_payment_and_declaration"] },
  accounting: { supported: true, newWork: ["manual_journals"], continuation: ["existing_accounting_work", "mandatory_ledger_effects"] },
  payment_reconciliation: { supported: false, newWork: ["reconciliation_runs"], continuation: ["existing_reconciliation_work", "provider_evidence"] },
}

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
export function getModuleStopOptions() {
  return getModuleCatalog().map(entry => ({ moduleSlug: entry.slug, supported: policies[entry.slug]?.supported ?? false,
    unsupportedReason: policies[entry.slug]?.supported ? undefined : ["pos", "sales"].includes(entry.slug) ? "OFFLINE_CONTINUATION_UNAVAILABLE" as const : "STOP_UNSUPPORTED" as const,
    newWork: policies[entry.slug]?.newWork ?? [], continuation: policies[entry.slug]?.continuation ?? [] }))
}

async function observationsFor(tx: Client, organizationId: string, moduleSlug: CommercialModuleSlug): Promise<ModuleStopObservation[]> {
  const observe = async (code: string, kind: ModuleStopObservation["kind"], count: Promise<number>): Promise<ModuleStopObservation> => ({ code, kind, count: await count })
  switch (moduleSlug) {
    case "payment_reconciliation": return getModuleReconciliationObligations(tx, organizationId)
    case "inventory": return Promise.all([
      observe("inventory_adjustment_drafts", "draft", tx.stockAdjustment.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("inventory_adjustments_open", "obligation", tx.stockAdjustment.count({ where: { organizationId, deletedAt: null, status: { in: ["SUBMITTED", "APPROVED"] } } })),
      observe("inventory_transfer_drafts", "draft", tx.stockTransfer.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("inventory_transfers_open", "obligation", tx.stockTransfer.count({ where: { organizationId, deletedAt: null, status: { in: ["SUBMITTED", "APPROVED", "IN_TRANSIT", "PARTIALLY_RECEIVED"] } } })),
      observe("inventory_counts_open", "obligation", tx.stockCountSession.count({ where: { organizationId, status: { notIn: ["POSTED", "CANCELLED"] } } })),
    ])
    case "sales": return Promise.all([
      observe("sales_drafts", "draft", tx.salesOrder.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("sales_open", "obligation", tx.salesOrder.count({ where: { organizationId, deletedAt: null, status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED"] } } })),
      observe("sales_unsettled", "obligation", tx.salesOrder.count({ where: { organizationId, deletedAt: null, status: { notIn: ["DRAFT", "CANCELLED", "RETURNED"] }, paymentStatus: { in: ["PENDING", "PARTIAL"] } } })),
    ])
    case "pos": return Promise.all([
      observe("pos_shifts_open", "obligation", tx.pOSSession.count({ where: { organizationId, status: { in: ["ACTIVE", "SUSPENDED"] } } })),
      observe("pos_sales_drafts", "draft", tx.salesOrder.count({ where: { organizationId, deletedAt: null, channel: "POS", status: "DRAFT" } })),
      // Every nonterminal accepted envelope needs its existing replay/exception
      // workflow. A failed replay is not silently counted as completed work.
      observe("pos_offline_open", "obligation", tx.pOSOfflineEvent.count({ where: { organizationId, eventType: "OFFLINE_SALE_CAPTURED", status: { notIn: ["REPLAYED", "DUPLICATE_REPLAY", "REJECTED"] } } })),
    ])
    case "purchasing": return Promise.all([
      observe("purchase_drafts", "draft", tx.purchaseOrder.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("purchases_open", "obligation", tx.purchaseOrder.count({ where: { organizationId, deletedAt: null, status: { notIn: ["DRAFT", "COMPLETED", "CANCELLED"] } } })),
      observe("supplier_invoice_drafts", "draft", tx.supplierInvoice.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("supplier_invoices_open", "obligation", tx.supplierInvoice.count({ where: { organizationId, deletedAt: null, status: { notIn: ["DRAFT", "PAID", "CANCELLED"] } } })),
    ])
    case "payroll": return Promise.all([
      observe("payroll_periods_open", "obligation", tx.payrollPeriod.count({ where: { organizationId, status: { not: "CLOSED" } } })),
      observe("payroll_runs_draft", "draft", tx.payrollRun.count({ where: { organizationId, deletedAt: null, status: "DRAFT" } })),
      observe("payroll_runs_open", "obligation", tx.payrollRun.count({ where: { organizationId, deletedAt: null, status: { notIn: ["DRAFT", "ARCHIVED", "CANCELLED"] } } })),
      observe("payroll_payments_open", "obligation", tx.payrollPaymentBatch.count({ where: { organizationId, status: { notIn: ["SETTLED", "CANCELLED"] } } })),
      observe("payroll_declarations_open", "obligation", tx.payrollDeclaration.count({ where: { organizationId, status: { notIn: ["RECONCILED", "ARCHIVED"] } } })),
    ])
    case "accounting": return Promise.all([
      observe("manual_journals_draft", "draft", tx.journalEntry.count({ where: { organizationId, status: "DRAFT", OR: [{ sourceType: "MANUAL" }, { sourceType: null }] } })),
    ])
    default: return []
  }
}

export async function getModuleStopImpactInTx(tx: Client, input: {
  organizationId: string; stopNewWorkModules: readonly string[]; previousStoppedModules: readonly string[]
}): Promise<ModuleStopImpact> {
  const stopNewWorkModules = [...new Set(input.stopNewWorkModules.filter(isCommercialModuleSlug).filter(slug => !getModuleCatalogEntry(slug)?.core))].sort()
  const invalid = input.stopNewWorkModules.some(slug => !isCommercialModuleSlug(slug) || getModuleCatalogEntry(slug)?.core)
  const impacts = await Promise.all(stopNewWorkModules.map(async moduleSlug => {
    const policy = policies[moduleSlug]
    const observations = policy ? await observationsFor(tx, input.organizationId, moduleSlug) : []
    return { moduleSlug, supported: policy?.supported ?? false,
      unsupportedReason: policy?.supported ? undefined : ["pos", "sales"].includes(moduleSlug) ? "OFFLINE_CONTINUATION_UNAVAILABLE" as const : "STOP_UNSUPPORTED" as const,
      newWork: policy?.newWork ?? [], continuation: policy?.continuation ?? [],
      dependentModules: getModuleCatalog().filter(entry => entry.slug !== moduleSlug && moduleNewWorkBlockers(entry.slug, [moduleSlug]).length > 0).map(entry => entry.slug),
      observations, pendingCount: observations.reduce((sum, observation) => sum + observation.count, 0) }
  }))
  const policyHash = digest({ version: 2, policies, operationalDependencies: getModuleOperationalDependencies(), dependencies: getModuleCatalog().map(entry => ({ slug: entry.slug, dependencies: entry.dependencies })) })
  const canStop = !invalid && impacts.every(item => item.supported)
  return { stopNewWorkModules, newlyStopped: stopNewWorkModules.filter(slug => !input.previousStoppedModules.includes(slug)),
    resumed: input.previousStoppedModules.filter(isCommercialModuleSlug).filter(slug => !stopNewWorkModules.includes(slug)),
    canStop, canRetain: canStop && impacts.every(item => item.pendingCount === 0), policyHash,
    evidenceHash: digest({ stopNewWorkModules, policyHash, impacts }), impacts }
}
