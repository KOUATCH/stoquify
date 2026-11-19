import "server-only"

import { createHash } from "node:crypto"
import { Prisma } from "@prisma/client"
import { ForbiddenError } from "@/services/_shared/action-errors"
import { resolveTenantWideOperatingAuthority } from "@/services/operating-access/operating-access-scope-contracts"

// Explicit aggregate identities emitted by assurance-registry.service.ts. Unknown
// employee/record sources need their own binding adapter, even for administrators.
const aggregateSources = new Set([
  JSON.stringify(["journal_entries", "posted_source_backed_entries"]),
  JSON.stringify(["ledger_posting_batches", "posted_batches_missing_journal"]),
  JSON.stringify(["journal_entries", "unbalanced_posted_entries"]),
  JSON.stringify(["fiscal_documents", "final_documents_missing_hash"]),
  JSON.stringify(["accounting_periods", "closed_period_late_postings"]),
  JSON.stringify(["ledger_posting_batches", "failed_posting_batches"]),
  JSON.stringify(["sales_orders", "completed_pos_sales_missing_payment"]),
  JSON.stringify(["sales_orders", "completed_pos_sales_missing_receipt"]),
  JSON.stringify(["inventory_transactions", "completed_pos_sales_missing_stock_movement"]),
  JSON.stringify(["ledger_posting_batches", "completed_pos_sales_missing_ledger_source_link"]),
  JSON.stringify(["payments", "network_tenders_missing_idempotency_hash"]),
  JSON.stringify(["pos_offline_events", "offline_replay_sla"]),
  JSON.stringify(["pos_offline_events", "accepted_events_missing_business_event"]),
  JSON.stringify(["pos_offline_sync_conflicts", "sequence_hash_conflict_visibility"]),
  JSON.stringify(["pos_offline_events", "blocked_events_missing_conflict_evidence"]),
  JSON.stringify(["pos_offline_events", "replayed_events_missing_replay_proof"]),
  JSON.stringify(["payment_exceptions", "overdue_serious_exceptions"]),
  JSON.stringify(["suspense_items", "aged_suspense_missing_owner"]),
  JSON.stringify(["provider_events", "stale_unmatched_provider_events"]),
  JSON.stringify(["reconciliation_runs", "unsigned_ready_runs"]),
  JSON.stringify(["reconciliation_runs", "signed_runs_stale_certificate_hash"]),
  JSON.stringify(["purchase_orders", "po_approval_receipt_trace"]),
  JSON.stringify(["goods_receipts", "received_goods_missing_stock_movement"]),
  JSON.stringify(["supplier_invoices", "supplier_invoices_missing_three_way_match"]),
  JSON.stringify(["supplier_invoices", "posted_supplier_invoices_missing_ap_proof"]),
  JSON.stringify(["supplier_payments", "released_payments_missing_evidence"]),
  JSON.stringify(["supplier_payments", "released_payments_pending_bank_change"]),
  JSON.stringify(["stock_adjustments", "completed_adjustments_missing_evidence"]),
  JSON.stringify(["payroll_payment_batches", "released_payroll_payments_missing_evidence"]),
  JSON.stringify(["payroll_payment_batches", "payroll_payment_reconciliation_exceptions"]),
  JSON.stringify(["payment_reconciliation_inbox_items", "provider_inbox_worker_sla"]),
  JSON.stringify(["payroll_declarations", "payroll_declaration_lifecycle_exceptions"]),
  JSON.stringify(["close_pack_exports", "payroll_stale_close_evidence"]),
  JSON.stringify(["compliance_submissions", "submission_sla_aggregate"]),
  JSON.stringify(["close_pack_exports", "certified_packs_with_open_findings"]),
  JSON.stringify(["business_events", "event_status_aggregate"]),
  JSON.stringify(["business_event_outbox", "outbox_sla_aggregate"]),
])

type Party = { id: string; permissions: readonly string[]; roleCodes: readonly string[] }

/** Assignment scope only. Call after current accounts, roles and incident are
 * locked. Never infer a location from incident metadata, labels or routes. */
export async function assertAssuranceAssignmentScopeInTx(tx: Prisma.TransactionClient, input: {
  organizationId: string
  incident: { checkKey: string; sourceType: string; sourceId: string; workflow: string; moduleSlug: string }
  actor: Party
  owner: Party
}) {
  const wide = (party: Party) => Boolean(resolveTenantWideOperatingAuthority({
    isSuperUser: party.permissions.includes("*"), roleCodes: party.roleCodes,
  }))
  const denied = () => new ForbiddenError("Current source location authority is required for the actor and assignee.")
  if (input.incident.sourceType === "POSSession") {
    if (input.incident.checkKey !== "pos.closed_shift_cash_shortage.review" || input.incident.workflow !== "POS" || input.incident.moduleSlug !== "pos") throw denied()
    const sources = await tx.$queryRaw<Array<{ locationId: string }>>(Prisma.sql`
      SELECT session."locationId" FROM "pos_sessions" session
      INNER JOIN "pos_terminals" terminal ON terminal."id" = session."terminalId"
        AND terminal."organizationId" = session."organizationId" AND terminal."locationId" = session."locationId"
      WHERE session."id" = ${input.incident.sourceId}
      AND session."organizationId" = ${input.organizationId} FOR SHARE OF session, terminal`)
    if (sources.length !== 1) throw denied()
    const locations = await tx.$queryRaw<Array<{ id: string; managerId: string | null }>>(Prisma.sql`
      SELECT "id", "managerId" FROM "locations" WHERE "id" = ${sources[0].locationId}
      AND "organizationId" = ${input.organizationId} AND "isActive" = true AND "deletedAt" IS NULL FOR SHARE`)
    const location = locations[0]
    if (locations.length !== 1 || [input.actor, input.owner].some(party => !wide(party) && location.managerId !== party.id)) throw denied()
    return {kind: "LOCATION" as const, fingerprint: createHash("sha256").update(JSON.stringify([
      "assurance-assignment-scope-v1", input.organizationId, "POSSession", input.incident.sourceId, location.id,
    ])).digest("hex")}
  }
  // Known aggregate sources have no proven location binding and require
  // tenant-wide authority. Unknown sources are denied until an adapter exists.
  // Other payroll/financial permissions remain independently required.
  if (!aggregateSources.has(JSON.stringify([input.incident.sourceType, input.incident.sourceId])) || !wide(input.actor) || !wide(input.owner)) throw denied()
  return {kind: "TENANT" as const, fingerprint: createHash("sha256").update(JSON.stringify([
    "assurance-assignment-scope-v1", input.organizationId, "TENANT", input.incident.sourceType, input.incident.sourceId,
  ])).digest("hex")}
}
