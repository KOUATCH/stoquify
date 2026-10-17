import "server-only"

import { createHash } from "node:crypto"
import type { CloseChecklistItem, CloseEvidenceItem, Prisma } from "@prisma/client"

export type CloseEvidenceCollectionChecklist = Pick<CloseChecklistItem,
  "id" | "organizationId" | "periodId" | "closeRunId" | "key" | "domain" |
  "sourceService" | "status" | "detail" | "evidenceCount" | "blockerReason"
>

export type CloseEvidenceCollectionRow = Pick<CloseEvidenceItem,
  "id" | "organizationId" | "periodId" | "closeRunId" | "checklistItemId" |
  "findingId" | "evidenceType" | "sourceTable" | "sourceType" | "sourceId" |
  "sourceLabel" | "sourceHash" | "available" | "provenance" |
  "unavailableReason" | "metadata" | "correlationId"
> & { sourceDate: Date | string | null }

export type CloseEvidenceCollectionReceipt = Prisma.JsonObject & {
  version: 1
  collectionSucceeded: true
  hash: string
  evidence: Array<{ id: string; hash: string }>
}

// These are the collectors actually called by buildAssessment. Period-state is
// descriptive setup state, not a completed collector and cannot replace proof.
const supportedCollectors: Record<string, { domain: string; sourceService: string }> = {
  "period-close-preflight": { domain: "LEDGER", sourceService: "services/accounting/periods.service.ts" },
  "ledger-reconciliation": { domain: "LEDGER", sourceService: "services/accounting/reconciliations.service.ts" },
  "payment-reconciliation": { domain: "PAYMENT_RECONCILIATION", sourceService: "services/reconciliation/payment-reconciliation-dashboard.service.ts" },
  "suspense-exceptions": { domain: "SUSPENSE", sourceService: "services/reconciliation/payment-suspense-workflow.service.ts" },
  "data-trust-provenance": { domain: "DATA_TRUST", sourceService: "services/accounting/data-trust.service.ts" },
  "inventory-valuation": { domain: "INVENTORY_VALUATION", sourceService: "services/inventory/inventory-valuation.service.ts" },
  "payroll-finance-forecast-proof": { domain: "PAYROLL", sourceService: "services/snapshots/tenant-operating-snapshot.service.ts" },
  "tax-payroll-ap-readiness": { domain: "TAX", sourceService: "services/accounting/data-trust.service.ts" },
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value)
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    const object = value as Record<string, unknown>
    return `{${Object.keys(object).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(object[key])}`).join(",")}}`
  }
  throw new Error("Close evidence collection contains non-JSON data.")
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex")
}

function nonBlank(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0
}

function assertScope(checklist: CloseEvidenceCollectionChecklist, rows: readonly CloseEvidenceCollectionRow[]) {
  if (![checklist.id, checklist.organizationId, checklist.periodId, checklist.closeRunId, checklist.key,
    checklist.domain, checklist.sourceService].every(nonBlank) ||
    !Number.isInteger(checklist.evidenceCount) || checklist.evidenceCount < 0) {
    throw new Error("Close evidence collection scope is incomplete.")
  }
  const ids = new Set<string>()
  for (const row of rows) {
    if (!nonBlank(row.id) || ids.has(row.id) || row.organizationId !== checklist.organizationId ||
      row.periodId !== checklist.periodId || row.closeRunId !== checklist.closeRunId ||
      row.checklistItemId !== checklist.id) {
      throw new Error("Close evidence collection contains duplicate or foreign evidence.")
    }
    ids.add(row.id)
  }
}

function evidenceSnapshot(row: CloseEvidenceCollectionRow) {
  const sourceDate = row.sourceDate === null ? null : new Date(row.sourceDate).toISOString()
  return {
    id: row.id, organizationId: row.organizationId, periodId: row.periodId,
    closeRunId: row.closeRunId, checklistItemId: row.checklistItemId, findingId: row.findingId,
    evidenceType: row.evidenceType, sourceTable: row.sourceTable, sourceType: row.sourceType,
    sourceId: row.sourceId, sourceLabel: row.sourceLabel, sourceDate, sourceHash: row.sourceHash,
    available: row.available, provenance: row.provenance, unavailableReason: row.unavailableReason,
    metadata: row.metadata, correlationId: row.correlationId,
  }
}

/**
 * Records a successful collection, including an honest empty result. The caller
 * supplies the real collector outcome and all persisted rows in its completion
 * transaction. This digest is snapshot integrity, never a domain sourceHash,
 * proof of collection completeness outside that transaction, or certification.
 */
export function buildCloseEvidenceCollectionReceipt(
  checklist: CloseEvidenceCollectionChecklist,
  persistedEvidenceRows: readonly CloseEvidenceCollectionRow[],
  collectionSucceeded: boolean,
): CloseEvidenceCollectionReceipt {
  if (collectionSucceeded !== true) throw new Error("An unsuccessful Close collector cannot issue a collection receipt.")
  assertScope(checklist, persistedEvidenceRows)
  const evidence = persistedEvidenceRows.map(row => ({ id: row.id, hash: digest(evidenceSnapshot(row)) }))
    .sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0)
  // Do not include checklist metadata: it contains this receipt after storage.
  // Assignment and createdAt/updatedAt timestamps are also outside the snapshot.
  const scope = {
    id: checklist.id, organizationId: checklist.organizationId, periodId: checklist.periodId,
    closeRunId: checklist.closeRunId, key: checklist.key, domain: checklist.domain,
    sourceService: checklist.sourceService, status: checklist.status, detail: checklist.detail,
    evidenceCount: checklist.evidenceCount, blockerReason: checklist.blockerReason,
  }
  return { version: 1, collectionSucceeded: true, hash: digest({ version: 1, collectionSucceeded: true, checklist: scope, evidence }), evidence }
}

/** Caller must load the complete checklist row set; a filtered subset is unsafe. */
export function verifyCloseEvidenceCollectionReceipt(
  checklist: CloseEvidenceCollectionChecklist,
  persistedEvidenceRows: readonly CloseEvidenceCollectionRow[],
  receipt: unknown,
): receipt is CloseEvidenceCollectionReceipt {
  try {
    if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)) return false
    const stored = receipt as Record<string, unknown>
    if (stored.version !== 1 || stored.collectionSucceeded !== true || typeof stored.hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(stored.hash) || !Array.isArray(stored.evidence)) return false
    const expected = buildCloseEvidenceCollectionReceipt(checklist, persistedEvidenceRows, true)
    return stored.hash === expected.hash && canonicalJson(stored.evidence) === canonicalJson(expected.evidence)
  } catch {
    return false
  }
}

/**
 * Eligibility means the missing observation can be replaced. FAILED controls
 * remain failed; neither this predicate nor a valid receipt authorizes Close.
 * The caller separately verifies receipt, current run, ownership and freshness.
 */
export function isCloseEvidenceCollectionEligible(
  checklist: CloseEvidenceCollectionChecklist,
  persistedEvidenceRows: readonly CloseEvidenceCollectionRow[],
): boolean {
  try {
    assertScope(checklist, persistedEvidenceRows)
    const collector = Object.hasOwn(supportedCollectors, checklist.key) ? supportedCollectors[checklist.key] : null
    // Historical dashboard receipts remain verifiable; new assessments use the
    // read-only period collector. The source path is still bound by the receipt hash.
    const supportedSource = !!collector && (checklist.sourceService === collector.sourceService ||
      checklist.key === "payment-reconciliation" && checklist.sourceService === "services/reconciliation/payment-close-evidence.service.ts")
    return !!collector && checklist.domain === collector.domain && supportedSource &&
      ["PASSED", "WARNING", "FAILED"].includes(checklist.status) &&
      persistedEvidenceRows.every(row => row.available === true && row.provenance !== "UNAVAILABLE" && row.unavailableReason === null)
  } catch {
    return false
  }
}
