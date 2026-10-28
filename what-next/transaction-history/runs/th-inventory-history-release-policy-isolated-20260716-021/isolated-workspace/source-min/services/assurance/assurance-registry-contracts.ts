import { createHash } from "crypto"

import { BusinessRuleError } from "@/services/_shared/action-errors"

export const WORKFLOW_ASSURANCE_RESULT_STATUSES = [
  "passed",
  "warning",
  "failed",
  "blocked",
  "skipped",
  "error",
] as const

export const WORKFLOW_ASSURANCE_EXECUTION_MODES = [
  "synchronous_guard",
  "after_commit_validator",
  "scheduled_scan",
  "pre_close_gate",
  "snapshot_bi_guard",
] as const

export const WORKFLOW_ASSURANCE_RUN_TYPES = [
  "manual",
  "scheduled",
  "after_commit",
  "pre_close",
  "snapshot_guard",
] as const

export const WORKFLOW_ASSURANCE_RUN_STATUSES = [
  "running",
  "completed",
  "completed_with_warnings",
  "failed",
] as const

export const WORKFLOW_ASSURANCE_SEVERITIES = [
  "info",
  "warning",
  "high",
  "blocking",
  "compliance_critical",
] as const

export const WORKFLOW_ASSURANCE_WORKFLOWS = [
  "cash_command",
  "receivables",
  "payables",
  "inventory",
  "sales_margin",
  "payment_reconciliation",
  "ledger",
  "business_event",
  "purchasing_ap",
  "payroll",
  "compliance",
  "close_assurance",
  "pos",
  "offline_pos",
  "snapshot_bi",
  "cross_module",
] as const

export type WorkflowAssuranceResultStatus = (typeof WORKFLOW_ASSURANCE_RESULT_STATUSES)[number]
export type WorkflowAssuranceExecutionMode = (typeof WORKFLOW_ASSURANCE_EXECUTION_MODES)[number]
export type WorkflowAssuranceRunType = (typeof WORKFLOW_ASSURANCE_RUN_TYPES)[number]
export type WorkflowAssuranceRunStatus = (typeof WORKFLOW_ASSURANCE_RUN_STATUSES)[number]
export type WorkflowAssuranceSeverity = (typeof WORKFLOW_ASSURANCE_SEVERITIES)[number]
export type WorkflowAssuranceWorkflow = (typeof WORKFLOW_ASSURANCE_WORKFLOWS)[number]

export type WorkflowAssuranceEvidenceLink = {
  sourceTable: string
  sourceType?: string
  sourceId?: string
  sourceHash?: string
  label: string
  route?: string
  metadata?: Record<string, unknown>
}

export type WorkflowAssuranceCounts = {
  scanned: number
  passed: number
  warning: number
  failed: number
  blocked: number
  skipped: number
  error: number
}

export type WorkflowAssuranceCheckDefinitionContract = {
  checkKey: string
  version: number
  workflow: WorkflowAssuranceWorkflow
  moduleSlug: string
  invariantName: string
  executionMode: WorkflowAssuranceExecutionMode
  defaultSeverity: WorkflowAssuranceSeverity
  requiredPermission: string
  ownerRole: string
  enabled: boolean
  enforceMode: boolean
  sourceTables: string[]
  actionRoute: string
  metadata: Record<string, unknown>
}

export type WorkflowAssuranceCheckResultInput = {
  organizationId: string
  checkKey: string
  status: WorkflowAssuranceResultStatus
  severity?: WorkflowAssuranceSeverity
  sourceType?: string
  sourceId?: string
  sourceHash?: string
  evidenceLinks?: WorkflowAssuranceEvidenceLink[]
  recommendedAction?: string
  message?: string
  counts?: Partial<WorkflowAssuranceCounts>
  metadata?: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
}

export type WorkflowAssuranceCheckResult = Required<
  Pick<WorkflowAssuranceCheckResultInput, "organizationId" | "checkKey" | "status" | "severity">
> & {
  sourceType?: string
  sourceId?: string
  sourceHash: string
  fingerprint: string
  evidenceLinks: WorkflowAssuranceEvidenceLink[]
  recommendedAction?: string
  message: string
  counts: WorkflowAssuranceCounts
  metadata: Record<string, unknown>
  errorCode?: string
  errorMessage?: string
}

export type WorkflowAssuranceRunInput = {
  organizationId: string
  actorId?: string
  actorPermissions?: string[]
  checkKey?: string
  runType?: WorkflowAssuranceRunType
  periodId?: string
  locationId?: string
  sourceType?: string
  sourceId?: string
}

export type WorkflowAssuranceCheckRunSummary = {
  id: string
  checkKey: string
  version: number
  workflow: WorkflowAssuranceWorkflow
  moduleSlug: string
  invariantName: string
  executionMode: WorkflowAssuranceExecutionMode
  runType: WorkflowAssuranceRunType
  runStatus: WorkflowAssuranceRunStatus
  resultStatus: WorkflowAssuranceResultStatus
  severity: WorkflowAssuranceSeverity
  sourceHash: string
  fingerprint: string
  counts: WorkflowAssuranceCounts
  recommendedAction?: string
  message: string
  evidenceLinks: WorkflowAssuranceEvidenceLink[]
  actionRoute: string
  incidentId?: string
  observeMode: boolean
  startedAt: string
  completedAt: string
  durationMs: number
}

export type WorkflowAssuranceRegistryRunOutput = {
  organizationId: string
  runType: WorkflowAssuranceRunType
  generatedAt: string
  summary: {
    total: number
    passed: number
    warning: number
    failed: number
    blocked: number
    skipped: number
    error: number
    observeMode: boolean
  }
  runs: WorkflowAssuranceCheckRunSummary[]
}

export const INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS: WorkflowAssuranceCheckDefinitionContract[] = [
  {
    checkKey: "ledger.posted_source_link.required",
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Posted journal entries created from source workflows keep source-link evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["journal_entries", "accounting_source_links", "ledger_posting_batches"],
    actionRoute: "/dashboard/accounting/journals",
    metadata: {
      assuranceDomain: "ohada_ledger_assurance",
      observeModeReason: "First rollout records violations without blocking postings.",
    },
  },
  {
    checkKey: "business_event.applied_or_visible",
    version: 1,
    workflow: "business_event",
    moduleSlug: "business-events",
    invariantName: "Business events should be applied, failed visibly, or still inside the processing SLA.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "controls.audit.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["business_events"],
    actionRoute: "/dashboard/manager-action-center",
    metadata: {
      assuranceDomain: "business_event_gateway",
      staleAfterMinutes: 15,
    },
  },
  {
    checkKey: "business_event.outbox.stuck_sla",
    version: 1,
    workflow: "business_event",
    moduleSlug: "business-events",
    invariantName: "Outbox messages should not stay pending or locked beyond their retry SLA.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "controls.audit.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["business_event_outbox"],
    actionRoute: "/dashboard/manager-action-center",
    metadata: {
      assuranceDomain: "business_event_gateway",
      staleAfterMinutes: 15,
    },
  },
  {
    checkKey: "ledger.posted_batch_journal.required",
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Posted ledger posting batches must have posted journal entries.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["ledger_posting_batches", "journal_entries"],
    actionRoute: "/dashboard/accounting/journals",
    metadata: {
      assuranceDomain: "ohada_ledger_assurance",
      observeModeReason: "First rollout records violations before enabling hard posting gates.",
    },
  },
  {
    checkKey: "ledger.journal_entry.balanced",
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Posted and reversed journal entries must balance debits and credits.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["journal_entries", "journal_entry_lines"],
    actionRoute: "/dashboard/accounting/reports/trial-balance",
    metadata: {
      assuranceDomain: "ohada_ledger_assurance",
      balanceTolerance: "0.00",
    },
  },
  {
    checkKey: "compliance.final_document_hash.required",
    version: 1,
    workflow: "compliance",
    moduleSlug: "compliance",
    invariantName: "Submitted, certified, and reversed fiscal documents must retain hash evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "compliance_critical",
    requiredPermission: "compliance.documents.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["fiscal_documents", "compliance_evidence"],
    actionRoute: "/dashboard/compliance",
    metadata: {
      assuranceDomain: "ohada_fiscal_document_assurance",
      finalStatuses: ["SUBMITTED", "CERTIFIED", "REVERSED"],
    },
  },
  {
    checkKey: "ledger.closed_period.posting_blocked",
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Locked or closed accounting periods must not receive later postings.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.audit.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["accounting_periods", "journal_entries", "ledger_posting_batches"],
    actionRoute: "/dashboard/accounting/control-center",
    metadata: {
      assuranceDomain: "ohada_period_control",
      lockedStatuses: ["LOCKED", "CLOSED"],
    },
  },
  {
    checkKey: "ledger.failed_posting_batch.visible",
    version: 1,
    workflow: "ledger",
    moduleSlug: "accounting",
    invariantName: "Failed ledger posting batches must have manager-visible assurance incidents.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "controls.audit.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["ledger_posting_batches", "workflow_assurance_incidents"],
    actionRoute: "/dashboard/manager-action-center",
    metadata: {
      assuranceDomain: "ledger_failure_visibility",
      visibleIncidentStatuses: ["OPEN", "ACKNOWLEDGED", "ASSIGNED", "IN_PROGRESS", "REOPENED"],
    },
  },
  {
    checkKey: "pos.completed_sale_payment.required",
    version: 1,
    workflow: "pos",
    moduleSlug: "pos",
    invariantName: "Completed POS sales must retain paid or partial payment evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "branch_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["sales_orders", "payments"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "pos_sale_truth",
      finalSalesStatuses: ["COMPLETED", "DELIVERED"],
    },
  },
  {
    checkKey: "pos.completed_sale_receipt.required",
    version: 1,
    workflow: "pos",
    moduleSlug: "pos",
    invariantName: "Completed POS sales must retain visible fiscal receipt proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "branch_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["sales_orders", "fiscal_documents"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "pos_sale_truth",
      finalSalesStatuses: ["COMPLETED", "DELIVERED"],
      receiptStatuses: ["QUEUED", "SUBMITTED", "CERTIFIED"],
      maxScan: 500,
    },
  },
  {
    checkKey: "pos.completed_sale_stock_movement.required",
    version: 1,
    workflow: "pos",
    moduleSlug: "pos",
    invariantName: "Completed POS sales with inventory-tracked items must retain stock movement proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "inventory_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["sales_orders", "sales_order_lines", "items", "inventory_transactions"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "pos_sale_truth",
      finalSalesStatuses: ["COMPLETED", "DELIVERED"],
      stockReferenceType: "SALES_ORDER",
      stockMovementType: "SALE",
      maxScan: 500,
    },
  },
  {
    checkKey: "pos.completed_sale_ledger_source_link.required",
    version: 1,
    workflow: "pos",
    moduleSlug: "pos",
    invariantName: "Completed POS sales must retain posted ledger batch and source-link proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "pos.transactions.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["sales_orders", "ledger_posting_batches", "journal_entries", "accounting_source_links"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "pos_sale_truth",
      finalSalesStatuses: ["COMPLETED", "DELIVERED"],
      sourceType: "POS_SALE",
      postingPurpose: "SALE_COMPLETION",
      maxScan: 500,
    },
  },
  {
    checkKey: "pos.network_tender_idempotency_hash.required",
    version: 1,
    workflow: "pos",
    moduleSlug: "pos",
    invariantName: "Network POS tenders must retain idempotency keys and payment transaction payload hashes.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["sales_orders", "payments", "payment_transactions"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "pos_sale_truth",
      finalSalesStatuses: ["COMPLETED", "DELIVERED"],
      networkPaymentMethods: ["CARD", "MOBILE_MONEY", "BANK_TRANSFER", "CHEQUE", "MIXED"],
    },
  },
  {
    checkKey: "offline_pos.replay_sla.visible",
    version: 1,
    workflow: "offline_pos",
    moduleSlug: "pos",
    invariantName: "Offline POS events must replay or become visibly conflicted within SLA.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["pos_offline_events", "pos_offline_sync_conflicts"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "offline_pos_replay",
      staleAfterMinutes: 30,
    },
  },
  {
    checkKey: "offline_pos.accepted_event_business_event.required",
    version: 1,
    workflow: "offline_pos",
    moduleSlug: "pos",
    invariantName: "Accepted offline POS events must retain a captured business-event proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["pos_offline_events", "business_events"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "offline_pos_replay",
      acceptedStatuses: ["PENDING_REPLAY", "RECORDED"],
    },
  },
  {
    checkKey: "offline_pos.sequence_hash_conflict.visible",
    version: 1,
    workflow: "offline_pos",
    moduleSlug: "pos",
    invariantName: "Sequence, hash-chain, signature, and idempotency conflicts must stay manager-visible.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "pos.transactions.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["pos_offline_sync_conflicts"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "offline_pos_replay",
      conflictTypes: [
        "IDEMPOTENCY_PAYLOAD_MISMATCH",
        "SEQUENCE_GAP",
        "SEQUENCE_DUPLICATE_MISMATCH",
        "HASH_CHAIN_FORK",
        "SIGNATURE_INVALID",
      ],
      visibleStatuses: ["OPEN", "ACKNOWLEDGED"],
    },
  },
  {
    checkKey: "offline_pos.quarantined_event_conflict.required",
    version: 1,
    workflow: "offline_pos",
    moduleSlug: "pos",
    invariantName: "Blocked or quarantined offline events must retain blocker and conflict evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "pos.transactions.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["pos_offline_events", "pos_offline_sync_conflicts"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "offline_pos_replay",
      blockedStatuses: ["BLOCKED", "QUARANTINED", "CONFLICT"],
    },
  },
  {
    checkKey: "offline_pos.replayed_event_proof.required",
    version: 1,
    workflow: "offline_pos",
    moduleSlug: "pos",
    invariantName: "Replayed offline POS events must retain sale posting, document hash, and replay business proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "pos.transactions.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["pos_offline_events", "business_events", "ledger_posting_batches"],
    actionRoute: "/dashboard/pos",
    metadata: {
      assuranceDomain: "offline_pos_replay",
      replayedStatuses: ["REPLAYED", "DUPLICATE_REPLAY"],
    },
  },
  {
    checkKey: "payment_reconciliation.exception_sla.visible",
    version: 1,
    workflow: "payment_reconciliation",
    moduleSlug: "finance",
    invariantName: "High and critical payment exceptions past SLA must stay manager-visible.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payments.reconciliation.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["payment_exceptions", "reconciliation_runs"],
    actionRoute: "/dashboard/finance/reconciliation",
    metadata: {
      assuranceDomain: "payment_reconciliation_truth",
      openStatuses: ["OPEN", "ASSIGNED", "ACKNOWLEDGED", "ESCALATED", "RESOLUTION_PROPOSED", "REOPENED"],
    },
  },
  {
    checkKey: "payment_reconciliation.suspense_owner.required",
    version: 1,
    workflow: "payment_reconciliation",
    moduleSlug: "finance",
    invariantName: "Aged suspense items must have an owner and action path.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payments.reconciliation.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["suspense_items"],
    actionRoute: "/dashboard/finance/reconciliation",
    metadata: {
      assuranceDomain: "payment_suspense_control",
      staleAfterMinutes: 60,
    },
  },
  {
    checkKey: "payment_reconciliation.unmatched_provider_event.visible",
    version: 1,
    workflow: "payment_reconciliation",
    moduleSlug: "finance",
    invariantName: "Stale provider events must be matched, excepted, or visible to finance managers.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payments.reconciliation.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["provider_events", "match_records", "payment_exceptions"],
    actionRoute: "/dashboard/finance/reconciliation",
    metadata: {
      assuranceDomain: "payment_provider_event_truth",
      staleAfterMinutes: 30,
      eventStatuses: ["RECEIVED", "VERIFIED", "PROCESSED"],
    },
  },
  {
    checkKey: "payment_reconciliation.unsigned_run_sla.visible",
    version: 1,
    workflow: "payment_reconciliation",
    moduleSlug: "finance",
    invariantName: "Reconciliation runs ready for signoff must be signed inside SLA or stay manager-visible.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payments.reconciliation.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["reconciliation_runs"],
    actionRoute: "/dashboard/finance/reconciliation",
    metadata: {
      assuranceDomain: "payment_reconciliation_signoff_truth",
      staleAfterMinutes: 120,
    },
  },
  {
    checkKey: "payment_reconciliation.certificate_source_hash.current",
    version: 1,
    workflow: "payment_reconciliation",
    moduleSlug: "finance",
    invariantName: "Signed reconciliation certificates must retain current source-hash proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payments.reconciliation.read",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["reconciliation_runs"],
    actionRoute: "/dashboard/finance/reconciliation",
    metadata: {
      assuranceDomain: "payment_reconciliation_certificate_truth",
    },
  },
  {
    checkKey: "purchasing_ap.po_approval_receipt_trace.required",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Controlled purchase orders must retain approval and receipt trace evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "purchases.orders.read",
    ownerRole: "operations_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["purchase_orders", "goods_receipts"],
    actionRoute: "/dashboard/purchase-orders",
    metadata: {
      assuranceDomain: "purchasing_ap_document_chain",
      controlledPurchaseOrderStatuses: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED"],
      receiptRequiredStatuses: ["PARTIALLY_RECEIVED", "RECEIVED", "COMPLETED"],
    },
  },
  {
    checkKey: "purchasing_ap.goods_receipt_stock_movement.required",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Received goods must retain stock movement proof before inventory value is trusted.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "purchases.orders.read",
    ownerRole: "inventory_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["goods_receipts", "goods_receipt_lines", "inventory_transactions"],
    actionRoute: "/dashboard/purchases",
    metadata: {
      assuranceDomain: "purchasing_ap_stock_truth",
      postedGoodsReceiptStatuses: ["RECEIVED", "COMPLETED"],
      maxScan: 500,
    },
  },
  {
    checkKey: "purchasing_ap.supplier_invoice_three_way_match.required",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Supplier invoices tied to purchase orders must retain accepted 3-way match evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "purchasing.ap.match.review",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["supplier_invoices", "supplier_invoice_lines", "three_way_matches", "goods_receipt_lines"],
    actionRoute: "/dashboard/purchases/payables",
    metadata: {
      assuranceDomain: "purchasing_ap_three_way_match",
      acceptedMatchStatuses: ["MATCHED", "APPROVED_EXCEPTION"],
    },
  },
  {
    checkKey: "purchasing_ap.supplier_invoice_posting_proof.required",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Posted supplier invoices must retain AP ledger, business-event, document, and evidence proof.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "purchasing.ap.invoice.view",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["supplier_invoices", "business_events", "ledger_posting_batches"],
    actionRoute: "/dashboard/finance/payables",
    metadata: {
      assuranceDomain: "purchasing_ap_ledger_truth",
      postedSupplierInvoiceStatuses: ["POSTED", "PAYMENT_PENDING", "PAID", "DISPUTED"],
    },
  },
  {
    checkKey: "purchasing_ap.released_payment_evidence.required",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Released supplier payments must have invoice allocation, approved bank destination, and evidence hashes.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "purchasing.ap.payment.release",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["supplier_payments", "supplier_payment_allocations", "supplier_bank_accounts"],
    actionRoute: "/dashboard/finance/payables",
    metadata: {
      assuranceDomain: "supplier_payment_release_control",
      controlledStatuses: ["RELEASED", "POSTED"],
    },
  },
  {
    checkKey: "purchasing_ap.supplier_bank_pending_release.blocked",
    version: 1,
    workflow: "purchasing_ap",
    moduleSlug: "purchasing",
    invariantName: "Supplier payments must not be released while supplier bank changes are pending.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "purchasing.supplier.bank.approve",
    ownerRole: "finance_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["supplier_payments", "supplier_bank_change_requests"],
    actionRoute: "/dashboard/purchases/suppliers",
    metadata: {
      assuranceDomain: "supplier_bank_risk_control",
      pendingBankChangeStatus: "PENDING",
    },
  },
  {
    checkKey: "inventory.completed_adjustment_evidence.required",
    version: 1,
    workflow: "inventory",
    moduleSlug: "inventory",
    invariantName: "Completed stock adjustments and write-offs must retain approval, evidence, posting, and projection movement.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "inventory.adjust.approve",
    ownerRole: "inventory_manager",
    enabled: true,
    enforceMode: false,
    sourceTables: ["stock_adjustments", "stock_adjustment_lines", "inventory_transactions"],
    actionRoute: "/dashboard/inventory/movements",
    metadata: {
      assuranceDomain: "inventory_adjustment_control",
      finalStatuses: ["APPROVED", "COMPLETED"],
    },
  },
  {
    checkKey: "payroll.released_payment_evidence.required",
    version: 1,
    workflow: "payroll",
    moduleSlug: "payroll",
    invariantName: "Released payroll payments require approved or posted runs, payslip allocations, hashes, and payment evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "blocking",
    requiredPermission: "payroll.payments.release",
    ownerRole: "payroll_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["payroll_payment_batches", "payroll_payment_allocations", "payroll_runs", "payroll_payslips"],
    actionRoute: "/dashboard/payroll",
    metadata: {
      assuranceDomain: "payroll_payment_release_control",
      releasedStatuses: ["RELEASED", "PARTIALLY_SETTLED", "SETTLED"],
      evidenceLevel: "aggregate_redacted",
    },
  },
  {
    checkKey: "payroll.payment_reconciliation_exception.visible",
    version: 1,
    workflow: "payroll",
    moduleSlug: "payroll",
    invariantName: "Payroll payment reconciliation exceptions must be visible, owner-routed, and linked to safe aggregate evidence.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payroll.payments.reconcile",
    ownerRole: "payroll_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["payroll_payment_batches", "payment_exceptions"],
    actionRoute: "/dashboard/payroll",
    metadata: {
      assuranceDomain: "payroll_payment_reconciliation_operations",
      exceptionSignals: ["FAILED", "paymentExceptionId", "reconciliationStatus"],
      evidenceLevel: "aggregate_redacted",
    },
  },
  {
    checkKey: "payroll.provider_inbox_worker_sla.visible",
    version: 1,
    workflow: "payroll",
    moduleSlug: "payroll",
    invariantName: "Payroll provider inbox evidence must be leased, retried, completed, or dead-lettered visibly within SLA.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payroll.payments.reconcile",
    ownerRole: "payroll_lead",
    enabled: true,
    enforceMode: false,
    sourceTables: ["payment_reconciliation_inbox_items", "provider_accounts", "provider_events", "statement_files"],
    actionRoute: "/dashboard/payroll/payments",
    metadata: {
      assuranceDomain: "payroll_provider_inbox_worker_operations",
      staleAfterMinutes: 30,
      leaseMarker: "PROCESSING + nextAttemptAt",
      leaseOwnershipMarker: "leasedBy + leaseToken",
      evidenceLevel: "aggregate_redacted",
    },
  },
  {
    checkKey: "payroll.declaration_lifecycle_exception.visible",
    version: 1,
    workflow: "payroll",
    moduleSlug: "payroll",
    invariantName: "Payroll declaration failures, overdue liabilities, and manual authority fallback states must be visible before close.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "payroll.declarations.manage",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["payroll_declarations", "payroll_declaration_evidence"],
    actionRoute: "/dashboard/payroll",
    metadata: {
      assuranceDomain: "payroll_declaration_operations",
      manualAuthorityEvidenceOnly: true,
      blockedAutomationState: "REQUIRES_EXPERT_REVIEW",
      evidenceLevel: "aggregate_redacted",
    },
  },
  {
    checkKey: "payroll.close_evidence.stale.visible",
    version: 1,
    workflow: "payroll",
    moduleSlug: "payroll",
    invariantName: "Certified close packs must not hide unresolved high or critical payroll close findings.",
    executionMode: "pre_close_gate",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.close.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["close_pack_exports", "close_runs", "close_assurance_findings"],
    actionRoute: "/dashboard/accounting/close",
    metadata: {
      assuranceDomain: "payroll_close_evidence_operations",
      findingDomain: "PAYROLL",
      evidenceLevel: "aggregate_redacted",
    },
  },
  {
    checkKey: "compliance.submission_sla.visible",
    version: 1,
    workflow: "compliance",
    moduleSlug: "compliance",
    invariantName: "Compliance submissions must certify, retry, fail visibly, or remain within SLA.",
    executionMode: "scheduled_scan",
    defaultSeverity: "high",
    requiredPermission: "compliance.documents.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["compliance_submissions", "fiscal_documents", "compliance_evidence"],
    actionRoute: "/dashboard/compliance",
    metadata: {
      assuranceDomain: "fiscal_submission_visibility",
      staleAfterMinutes: 30,
    },
  },
  {
    checkKey: "close.certified_pack_evidence.current",
    version: 1,
    workflow: "close_assurance",
    moduleSlug: "accounting",
    invariantName: "Certified close packs must not coexist with unresolved high or critical close findings.",
    executionMode: "pre_close_gate",
    defaultSeverity: "blocking",
    requiredPermission: "accounting.close.read",
    ownerRole: "accountant",
    enabled: true,
    enforceMode: false,
    sourceTables: ["close_runs", "close_pack_exports", "close_assurance_findings", "close_evidence_items"],
    actionRoute: "/dashboard/accounting/close",
    metadata: {
      assuranceDomain: "close_pack_certification_control",
      openFindingStatuses: ["OPEN", "ASSIGNED", "IN_REVIEW", "REOPENED"],
    },
  },
]

export function assertCheckDefinitionComplete(definition: WorkflowAssuranceCheckDefinitionContract) {
  const missing: string[] = []
  if (!definition.checkKey) missing.push("checkKey")
  if (!definition.version) missing.push("version")
  if (!definition.workflow) missing.push("workflow")
  if (!definition.moduleSlug) missing.push("moduleSlug")
  if (!definition.invariantName) missing.push("invariantName")
  if (!definition.executionMode) missing.push("executionMode")
  if (!definition.defaultSeverity) missing.push("defaultSeverity")
  if (!definition.requiredPermission) missing.push("requiredPermission")
  if (!definition.ownerRole) missing.push("ownerRole")
  if (!definition.sourceTables.length) missing.push("sourceTables")
  if (!definition.actionRoute) missing.push("actionRoute")

  if (missing.length) {
    throw new BusinessRuleError(`Workflow assurance check definition is incomplete: ${missing.join(", ")}`)
  }

  if (definition.enforceMode) {
    throw new BusinessRuleError(`Workflow assurance check ${definition.checkKey} cannot start in enforce mode`)
  }
}

export function createAssuranceSourceHash(value: unknown): string {
  return createHash("sha256").update(stableJsonStringify(value)).digest("hex")
}

export function stableJsonStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value))
}

export function normalizeAssuranceResult(input: WorkflowAssuranceCheckResultInput): WorkflowAssuranceCheckResult {
  const counts = normalizeCounts(input.counts, input.status)
  const evidenceLinks = input.evidenceLinks ?? []
  const message = input.message ?? defaultMessageForStatus(input.status)
  const sourceHash =
    input.sourceHash ??
    createAssuranceSourceHash({
      checkKey: input.checkKey,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      evidenceLinks,
      counts,
      metadata: input.metadata ?? {},
    })
  const fingerprint = createAssuranceSourceHash({
    checkKey: input.checkKey,
    status: input.status,
    severity: input.severity ?? defaultSeverityForStatus(input.status),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceHash,
    recommendedAction: input.recommendedAction,
  })

  return {
    organizationId: input.organizationId,
    checkKey: input.checkKey,
    status: input.status,
    severity: input.severity ?? defaultSeverityForStatus(input.status),
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceHash,
    fingerprint,
    evidenceLinks,
    recommendedAction: input.recommendedAction,
    message,
    counts,
    metadata: input.metadata ?? {},
    errorCode: input.errorCode,
    errorMessage: input.errorMessage,
  }
}

function normalizeCounts(
  counts: Partial<WorkflowAssuranceCounts> | undefined,
  status: WorkflowAssuranceResultStatus,
): WorkflowAssuranceCounts {
  const base: WorkflowAssuranceCounts = {
    scanned: counts?.scanned ?? 1,
    passed: counts?.passed ?? 0,
    warning: counts?.warning ?? 0,
    failed: counts?.failed ?? 0,
    blocked: counts?.blocked ?? 0,
    skipped: counts?.skipped ?? 0,
    error: counts?.error ?? 0,
  }

  if (!counts) {
    base[status] = status === "passed" ? base.scanned : 1
  }

  return base
}

function defaultSeverityForStatus(status: WorkflowAssuranceResultStatus): WorkflowAssuranceSeverity {
  if (status === "passed" || status === "skipped") return "info"
  if (status === "warning") return "warning"
  if (status === "failed") return "high"
  return "blocking"
}

function defaultMessageForStatus(status: WorkflowAssuranceResultStatus): string {
  if (status === "passed") return "The assurance invariant passed."
  if (status === "warning") return "The assurance invariant needs management attention."
  if (status === "failed") return "The assurance invariant detected a control failure."
  if (status === "blocked") return "The assurance invariant could not complete because a prerequisite is missing."
  if (status === "skipped") return "The assurance invariant was skipped."
  return "The assurance invariant errored before producing a trusted result."
}

function normalizeJson(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  if (Array.isArray(value)) return value.map(normalizeJson)
  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        const normalized = normalizeJson((value as Record<string, unknown>)[key])
        if (normalized !== undefined) acc[key] = normalized
        return acc
      }, {})
  }
  return value
}
