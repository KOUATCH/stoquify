import "server-only"

import { createHash } from "node:crypto"

import {
  AccountingPeriodStatus,
  AccountingPostingPurpose,
  AccountingSourceType,
  AdjustmentStatus,
  CloseFindingDomain,
  CloseFindingSeverity,
  CloseFindingStatus,
  CloseRunStatus,
  ComplianceSubmissionStatus,
  ExceptionSeverity,
  FiscalDocumentType,
  FiscalDocumentStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  PaymentMethod,
  PaymentStatus,
  PayrollDeclarationStatus,
  PayrollPaymentBatchStatus,
  PayrollRunStatus,
  POSOfflineEventStatus,
  POSOfflineSyncConflictSeverity,
  POSOfflineSyncConflictStatus,
  POSOfflineSyncConflictType,
  Prisma,
  ProviderEventStatus,
  GoodsReceiptStatus,
  PurchaseOrderStatus,
  ReconciliationRunStatus,
  SalesOrderStatus,
  SupplierBankAccountStatus,
  SupplierBankChangeStatus,
  SupplierInvoiceStatus,
  SupplierPaymentStatus,
  SuspenseStatus,
  ThreeWayMatchStatus,
  TransactionReferenceType,
  TransactionType,
  WorkflowAssuranceIncidentStatus,
  type WorkflowAssuranceCheckDefinition,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { hasRbacPermission } from "@/lib/security/rbac-permissions"

import { upsertWorkflowAssuranceIncidentFromResult } from "./assurance-incident.service"
import {
  INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS,
  assertCheckDefinitionComplete,
  createAssuranceSourceHash,
  normalizeAssuranceResult,
  type WorkflowAssuranceCheckDefinitionContract,
  type WorkflowAssuranceCheckResult,
  type WorkflowAssuranceCheckRunSummary,
  type WorkflowAssuranceCounts,
  type WorkflowAssuranceExecutionMode,
  type WorkflowAssuranceRegistryRunOutput,
  type WorkflowAssuranceResultStatus,
  type WorkflowAssuranceRunInput,
  type WorkflowAssuranceRunStatus,
  type WorkflowAssuranceRunType,
  type WorkflowAssuranceSeverity,
  type WorkflowAssuranceWorkflow,
} from "./assurance-registry-contracts"

const WORKFLOW_TO_PRISMA = {
  cash_command: "CASH_COMMAND",
  receivables: "RECEIVABLES",
  payables: "PAYABLES",
  inventory: "INVENTORY",
  sales_margin: "SALES_MARGIN",
  payment_reconciliation: "PAYMENT_RECONCILIATION",
  ledger: "LEDGER",
  business_event: "BUSINESS_EVENT",
  purchasing_ap: "PURCHASING_AP",
  payroll: "PAYROLL",
  compliance: "COMPLIANCE",
  close_assurance: "CLOSE_ASSURANCE",
  pos: "POS",
  offline_pos: "OFFLINE_POS",
  snapshot_bi: "SNAPSHOT_BI",
  cross_module: "CROSS_MODULE",
} as const satisfies Record<WorkflowAssuranceWorkflow, string>

const EXECUTION_MODE_TO_PRISMA = {
  synchronous_guard: "SYNCHRONOUS_GUARD",
  after_commit_validator: "AFTER_COMMIT_VALIDATOR",
  scheduled_scan: "SCHEDULED_SCAN",
  pre_close_gate: "PRE_CLOSE_GATE",
  snapshot_bi_guard: "SNAPSHOT_BI_GUARD",
} as const satisfies Record<WorkflowAssuranceExecutionMode, string>

const RESULT_STATUS_TO_PRISMA = {
  passed: "PASSED",
  warning: "WARNING",
  failed: "FAILED",
  blocked: "BLOCKED",
  skipped: "SKIPPED",
  error: "ERROR",
} as const satisfies Record<WorkflowAssuranceResultStatus, string>

const RUN_TYPE_TO_PRISMA = {
  manual: "MANUAL",
  scheduled: "SCHEDULED",
  after_commit: "AFTER_COMMIT",
  pre_close: "PRE_CLOSE",
  snapshot_guard: "SNAPSHOT_GUARD",
} as const satisfies Record<WorkflowAssuranceRunType, string>

const RUN_STATUS_TO_PRISMA = {
  running: "RUNNING",
  completed: "COMPLETED",
  completed_with_warnings: "COMPLETED_WITH_WARNINGS",
  failed: "FAILED",
} as const satisfies Record<WorkflowAssuranceRunStatus, string>

const SEVERITY_TO_PRISMA = {
  info: "INFO",
  warning: "WARNING",
  high: "HIGH",
  blocking: "BLOCKING",
  compliance_critical: "COMPLIANCE_CRITICAL",
} as const satisfies Record<WorkflowAssuranceSeverity, string>

const PRISMA_TO_WORKFLOW = invertMap(WORKFLOW_TO_PRISMA)
const PRISMA_TO_EXECUTION_MODE = invertMap(EXECUTION_MODE_TO_PRISMA)
const PRISMA_TO_RUN_TYPE = invertMap(RUN_TYPE_TO_PRISMA)
const PRISMA_TO_RUN_STATUS = invertMap(RUN_STATUS_TO_PRISMA)
const PRISMA_TO_RESULT_STATUS = invertMap(RESULT_STATUS_TO_PRISMA)
const PRISMA_TO_SEVERITY = invertMap(SEVERITY_TO_PRISMA)

type WorkflowAssuranceRunner = (
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) => Promise<WorkflowAssuranceCheckResult>

const CHECK_RUNNERS: Record<string, WorkflowAssuranceRunner> = {
  "ledger.posted_source_link.required": runPostedSourceLinkCheck,
  "business_event.applied_or_visible": runBusinessEventVisibilityCheck,
  "business_event.outbox.stuck_sla": runOutboxStuckSlaCheck,
  "ledger.posted_batch_journal.required": runPostedBatchJournalCheck,
  "ledger.journal_entry.balanced": runJournalBalanceCheck,
  "compliance.final_document_hash.required": runFinalDocumentHashCheck,
  "ledger.closed_period.posting_blocked": runClosedPeriodPostingCheck,
  "ledger.failed_posting_batch.visible": runFailedPostingBatchVisibilityCheck,
  "pos.completed_sale_payment.required": runCompletedPosSalePaymentCheck,
  "pos.completed_sale_receipt.required": runCompletedPosSaleReceiptCheck,
  "pos.completed_sale_stock_movement.required": runCompletedPosSaleStockMovementCheck,
  "pos.completed_sale_ledger_source_link.required": runCompletedPosSaleLedgerSourceLinkCheck,
  "pos.network_tender_idempotency_hash.required": runNetworkTenderIdempotencyHashCheck,
  "offline_pos.replay_sla.visible": runOfflinePosReplaySlaCheck,
  "offline_pos.accepted_event_business_event.required": runOfflineAcceptedEventBusinessEventCheck,
  "offline_pos.sequence_hash_conflict.visible": runOfflineSequenceHashConflictVisibilityCheck,
  "offline_pos.quarantined_event_conflict.required": runOfflineQuarantinedEventConflictCheck,
  "offline_pos.replayed_event_proof.required": runOfflineReplayedEventProofCheck,
  "payment_reconciliation.exception_sla.visible": runPaymentExceptionSlaCheck,
  "payment_reconciliation.suspense_owner.required": runSuspenseOwnerCheck,
  "payment_reconciliation.unmatched_provider_event.visible": runUnmatchedProviderEventVisibilityCheck,
  "payment_reconciliation.unsigned_run_sla.visible": runUnsignedReconciliationRunSlaCheck,
  "payment_reconciliation.certificate_source_hash.current": runReconciliationCertificateHashCheck,
  "purchasing_ap.po_approval_receipt_trace.required": runPurchaseOrderApprovalReceiptTraceCheck,
  "purchasing_ap.goods_receipt_stock_movement.required": runGoodsReceiptStockMovementCheck,
  "purchasing_ap.supplier_invoice_three_way_match.required": runSupplierInvoiceThreeWayMatchCheck,
  "purchasing_ap.supplier_invoice_posting_proof.required": runSupplierInvoicePostingProofCheck,
  "purchasing_ap.released_payment_evidence.required": runReleasedSupplierPaymentEvidenceCheck,
  "purchasing_ap.supplier_bank_pending_release.blocked": runSupplierBankPendingReleaseCheck,
  "inventory.completed_adjustment_evidence.required": runCompletedAdjustmentEvidenceCheck,
  "payroll.released_payment_evidence.required": runReleasedPayrollPaymentEvidenceCheck,
  "payroll.payment_reconciliation_exception.visible": runPayrollPaymentReconciliationExceptionCheck,
  "payroll.declaration_lifecycle_exception.visible": runPayrollDeclarationLifecycleExceptionCheck,
  "payroll.close_evidence.stale.visible": runPayrollCloseEvidenceStaleCheck,
  "compliance.submission_sla.visible": runComplianceSubmissionSlaCheck,
  "close.certified_pack_evidence.current": runCertifiedClosePackEvidenceCheck,
}

const FINAL_DOCUMENT_STATUSES: FiscalDocumentStatus[] = [
  FiscalDocumentStatus.SUBMITTED,
  FiscalDocumentStatus.CERTIFIED,
  FiscalDocumentStatus.REVERSED,
]
const LOCKED_PERIOD_STATUSES: AccountingPeriodStatus[] = [AccountingPeriodStatus.LOCKED, AccountingPeriodStatus.CLOSED]
const VISIBLE_INCIDENT_STATUSES: WorkflowAssuranceIncidentStatus[] = [
  WorkflowAssuranceIncidentStatus.OPEN,
  WorkflowAssuranceIncidentStatus.ACKNOWLEDGED,
  WorkflowAssuranceIncidentStatus.ASSIGNED,
  WorkflowAssuranceIncidentStatus.IN_PROGRESS,
  WorkflowAssuranceIncidentStatus.REOPENED,
]
const FINAL_POS_SALE_STATUSES: SalesOrderStatus[] = [SalesOrderStatus.COMPLETED, SalesOrderStatus.DELIVERED]
const PAID_OR_PARTIAL_PAYMENT_STATUSES: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.PARTIAL]
const VISIBLE_POS_RECEIPT_STATUSES: FiscalDocumentStatus[] = [
  FiscalDocumentStatus.QUEUED,
  FiscalDocumentStatus.SUBMITTED,
  FiscalDocumentStatus.CERTIFIED,
]
const NETWORK_TENDER_METHODS: PaymentMethod[] = [
  PaymentMethod.CARD,
  PaymentMethod.MOBILE_MONEY,
  PaymentMethod.BANK_TRANSFER,
  PaymentMethod.CHEQUE,
  PaymentMethod.MIXED,
]
const STALE_OFFLINE_EVENT_STATUSES: POSOfflineEventStatus[] = [
  POSOfflineEventStatus.PENDING_REPLAY,
  POSOfflineEventStatus.RECORDED,
]
const ACCEPTED_OFFLINE_EVENT_STATUSES: POSOfflineEventStatus[] = [
  POSOfflineEventStatus.PENDING_REPLAY,
  POSOfflineEventStatus.RECORDED,
]
const BLOCKED_OFFLINE_EVENT_STATUSES: POSOfflineEventStatus[] = [
  POSOfflineEventStatus.BLOCKED,
  POSOfflineEventStatus.QUARANTINED,
  POSOfflineEventStatus.CONFLICT,
]
const REPLAYED_OFFLINE_EVENT_STATUSES: POSOfflineEventStatus[] = [
  POSOfflineEventStatus.REPLAYED,
  POSOfflineEventStatus.DUPLICATE_REPLAY,
]
const ACTIVE_OFFLINE_CONFLICT_STATUSES: POSOfflineSyncConflictStatus[] = [
  POSOfflineSyncConflictStatus.OPEN,
  POSOfflineSyncConflictStatus.ACKNOWLEDGED,
]
const SERIOUS_OFFLINE_CONFLICT_SEVERITIES: POSOfflineSyncConflictSeverity[] = [
  POSOfflineSyncConflictSeverity.HIGH,
  POSOfflineSyncConflictSeverity.CRITICAL,
]
const SEQUENCE_HASH_CONFLICT_TYPES: POSOfflineSyncConflictType[] = [
  POSOfflineSyncConflictType.IDEMPOTENCY_PAYLOAD_MISMATCH,
  POSOfflineSyncConflictType.SEQUENCE_GAP,
  POSOfflineSyncConflictType.SEQUENCE_DUPLICATE_MISMATCH,
  POSOfflineSyncConflictType.HASH_CHAIN_FORK,
  POSOfflineSyncConflictType.SIGNATURE_INVALID,
]
const ACTIVE_PAYMENT_EXCEPTION_STATUSES: PaymentExceptionStatus[] = [
  PaymentExceptionStatus.OPEN,
  PaymentExceptionStatus.ASSIGNED,
  PaymentExceptionStatus.ACKNOWLEDGED,
  PaymentExceptionStatus.ESCALATED,
  PaymentExceptionStatus.RESOLUTION_PROPOSED,
  PaymentExceptionStatus.REOPENED,
]
const SERIOUS_EXCEPTION_SEVERITIES: ExceptionSeverity[] = [ExceptionSeverity.HIGH, ExceptionSeverity.CRITICAL]
const ACTIVE_SUSPENSE_STATUSES: SuspenseStatus[] = [
  SuspenseStatus.OPEN,
  SuspenseStatus.ASSIGNED,
  SuspenseStatus.IN_REVIEW,
  SuspenseStatus.POSTED_TO_SUSPENSE,
  SuspenseStatus.REOPENED,
]
const UNMATCHED_PROVIDER_EVENT_STATUSES: ProviderEventStatus[] = [
  ProviderEventStatus.RECEIVED,
  ProviderEventStatus.VERIFIED,
  ProviderEventStatus.PROCESSED,
]
const CONTROLLED_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
  PurchaseOrderStatus.COMPLETED,
]
const RECEIPT_REQUIRED_PURCHASE_ORDER_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
  PurchaseOrderStatus.RECEIVED,
  PurchaseOrderStatus.COMPLETED,
]
const POSTED_GOODS_RECEIPT_STATUSES: GoodsReceiptStatus[] = [
  GoodsReceiptStatus.RECEIVED,
  GoodsReceiptStatus.COMPLETED,
]
const POSTED_SUPPLIER_INVOICE_STATUSES: SupplierInvoiceStatus[] = [
  SupplierInvoiceStatus.POSTED,
  SupplierInvoiceStatus.PAYMENT_PENDING,
  SupplierInvoiceStatus.PAID,
  SupplierInvoiceStatus.DISPUTED,
]
const THREE_WAY_READY_SUPPLIER_INVOICE_STATUSES: SupplierInvoiceStatus[] = [
  SupplierInvoiceStatus.MATCHED,
  SupplierInvoiceStatus.POSTED,
  SupplierInvoiceStatus.PAYMENT_PENDING,
  SupplierInvoiceStatus.PAID,
  SupplierInvoiceStatus.DISPUTED,
]
const ACCEPTED_THREE_WAY_MATCH_STATUSES: ThreeWayMatchStatus[] = [
  ThreeWayMatchStatus.MATCHED,
  ThreeWayMatchStatus.APPROVED_EXCEPTION,
]
const RELEASED_SUPPLIER_PAYMENT_STATUSES: SupplierPaymentStatus[] = [
  SupplierPaymentStatus.RELEASED,
  SupplierPaymentStatus.POSTED,
]
const COMPLETED_ADJUSTMENT_STATUSES: AdjustmentStatus[] = [AdjustmentStatus.APPROVED, AdjustmentStatus.COMPLETED]
const RELEASED_PAYROLL_PAYMENT_STATUSES: PayrollPaymentBatchStatus[] = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
]
const PAYROLL_RUN_PAYMENT_READY_STATUSES: PayrollRunStatus[] = [
  PayrollRunStatus.APPROVED,
  PayrollRunStatus.EMITTED,
  PayrollRunStatus.PAID,
  PayrollRunStatus.POSTED,
  PayrollRunStatus.ARCHIVED,
]
const PAYROLL_PAYMENT_RECONCILIATION_MONITORED_STATUSES: PayrollPaymentBatchStatus[] = [
  PayrollPaymentBatchStatus.RELEASED,
  PayrollPaymentBatchStatus.PARTIALLY_SETTLED,
  PayrollPaymentBatchStatus.SETTLED,
  PayrollPaymentBatchStatus.FAILED,
]
const PAYROLL_DECLARATION_MONITORED_STATUSES: PayrollDeclarationStatus[] = [
  PayrollDeclarationStatus.PREPARED,
  PayrollDeclarationStatus.SUBMITTED,
  PayrollDeclarationStatus.REJECTED,
  PayrollDeclarationStatus.PAYMENT_DUE,
]
const PAYROLL_DECLARATION_CLOSED_STATUSES: PayrollDeclarationStatus[] = [
  PayrollDeclarationStatus.PAID,
  PayrollDeclarationStatus.RECONCILED,
  PayrollDeclarationStatus.ARCHIVED,
]
const OPEN_COMPLIANCE_SUBMISSION_STATUSES: ComplianceSubmissionStatus[] = [
  ComplianceSubmissionStatus.PENDING,
  ComplianceSubmissionStatus.LEASED,
  ComplianceSubmissionStatus.SUBMITTED,
  ComplianceSubmissionStatus.RETRY_SCHEDULED,
]
const VISIBLE_COMPLIANCE_FAILURE_STATUSES: ComplianceSubmissionStatus[] = [
  ComplianceSubmissionStatus.FAILED,
  ComplianceSubmissionStatus.DEAD_LETTER,
]
const ACTIVE_CLOSE_FINDING_STATUSES: CloseFindingStatus[] = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
]
const SERIOUS_CLOSE_FINDING_SEVERITIES: CloseFindingSeverity[] = [
  CloseFindingSeverity.HIGH,
  CloseFindingSeverity.CRITICAL,
]

export async function ensureWorkflowAssuranceCheckDefinitions() {
  const saved: WorkflowAssuranceCheckDefinitionContract[] = []

  for (const definition of INITIAL_WORKFLOW_ASSURANCE_CHECK_DEFINITIONS) {
    assertCheckDefinitionComplete(definition)
    const writeData = toPrismaDefinitionWrite(definition)
    const record = await db.workflowAssuranceCheckDefinition.upsert({
      where: {
        checkKey_version: {
          checkKey: definition.checkKey,
          version: definition.version,
        },
      },
      create: writeData,
      update: writeData,
    })
    saved.push(toDefinitionContract(record))
  }

  return saved
}

export async function runWorkflowAssuranceRegistry(
  input: WorkflowAssuranceRunInput,
): Promise<WorkflowAssuranceRegistryRunOutput> {
  await ensureWorkflowAssuranceCheckDefinitions()

  const records = await db.workflowAssuranceCheckDefinition.findMany({
    where: {
      enabled: true,
      ...(input.checkKey ? { checkKey: input.checkKey } : {}),
    },
    orderBy: [{ moduleSlug: "asc" }, { checkKey: "asc" }],
  })

  const runs: WorkflowAssuranceCheckRunSummary[] = []
  const runType = input.runType ?? "manual"

  for (const record of records) {
    const definition = toDefinitionContract(record)
    const startedAt = new Date()
    const result = await executeDefinition(definition, input)
    const runStatus = runStatusForResult(result.status)
    const completedAt = new Date()
    const durationMs = Math.max(0, completedAt.getTime() - startedAt.getTime())
    const created = await db.workflowAssuranceCheckRun.create({
      data: {
        organizationId: input.organizationId,
        definitionId: record.id,
        checkKey: definition.checkKey,
        definitionVersion: definition.version,
        runType: RUN_TYPE_TO_PRISMA[runType],
        runStatus: RUN_STATUS_TO_PRISMA[runStatus],
        resultStatus: RESULT_STATUS_TO_PRISMA[result.status],
        severity: SEVERITY_TO_PRISMA[result.severity],
        actorId: input.actorId,
        sourceType: result.sourceType ?? input.sourceType,
        sourceId: result.sourceId ?? input.sourceId,
        sourceHash: result.sourceHash,
        fingerprint: result.fingerprint,
        periodId: input.periodId,
        locationId: input.locationId,
        scannedCount: result.counts.scanned,
        passedCount: result.counts.passed,
        warningCount: result.counts.warning,
        failedCount: result.counts.failed,
        blockedCount: result.counts.blocked,
        skippedCount: result.counts.skipped,
        errorCount: result.counts.error,
        startedAt,
        completedAt,
        durationMs,
        resultSummary: {
          message: result.message,
          recommendedAction: result.recommendedAction,
          evidenceLinks: result.evidenceLinks,
          metadata: result.metadata,
        } as Prisma.InputJsonValue,
        errorCode: result.errorCode,
        errorMessage: result.errorMessage,
        metadata: {
          observeMode: !definition.enforceMode,
          workflow: definition.workflow,
          executionMode: definition.executionMode,
          moduleSlug: definition.moduleSlug,
          requiredPermission: definition.requiredPermission,
          actorPermissionCount: input.actorPermissions?.length ?? null,
        } as Prisma.InputJsonValue,
      },
    })

    const incident = await upsertWorkflowAssuranceIncidentFromResult({
      organizationId: input.organizationId,
      definitionId: record.id,
      checkRunId: created.id,
      definition,
      result,
      actorId: input.actorId,
    })

    runs.push({
      id: created.id,
      checkKey: definition.checkKey,
      version: definition.version,
      workflow: definition.workflow,
      moduleSlug: definition.moduleSlug,
      invariantName: definition.invariantName,
      executionMode: definition.executionMode,
      runType,
      runStatus,
      resultStatus: result.status,
      severity: result.severity,
      sourceHash: result.sourceHash,
      fingerprint: result.fingerprint,
      counts: result.counts,
      recommendedAction: result.recommendedAction,
      message: result.message,
      evidenceLinks: result.evidenceLinks,
      actionRoute: definition.actionRoute,
      incidentId: incident?.id,
      observeMode: !definition.enforceMode,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      durationMs,
    })
  }

  return {
    organizationId: input.organizationId,
    runType,
    generatedAt: new Date().toISOString(),
    summary: summarizeRuns(runs),
    runs,
  }
}

async function executeDefinition(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  if (!canRunDefinition(definition, input.actorPermissions)) {
    return normalizeAssuranceResult({
      organizationId: input.organizationId,
      checkKey: definition.checkKey,
      status: "skipped",
      severity: "info",
      sourceType: "permission",
      sourceId: definition.requiredPermission,
      message: "Actor is not allowed to inspect this assurance check.",
      recommendedAction: `Grant ${definition.requiredPermission} or run this check from a privileged assurance role.`,
      counts: { scanned: 0, skipped: 1 },
      metadata: {
        requiredPermission: definition.requiredPermission,
        permissionBounded: true,
      },
    })
  }

  const runner = CHECK_RUNNERS[definition.checkKey]
  if (!runner) {
    return normalizeAssuranceResult({
      organizationId: input.organizationId,
      checkKey: definition.checkKey,
      status: "skipped",
      severity: "info",
      sourceType: "registry",
      sourceId: definition.checkKey,
      message: "No server-side runner is registered for this assurance check yet.",
      recommendedAction: "Register a server-only runner before using this check as a gate.",
      counts: { scanned: 0, skipped: 1 },
      metadata: {
        missingRunner: true,
      },
    })
  }

  try {
    return await runner(definition, input)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown assurance runner error"
    return normalizeAssuranceResult({
      organizationId: input.organizationId,
      checkKey: definition.checkKey,
      status: "error",
      severity: "blocking",
      sourceType: "assurance_runner",
      sourceId: definition.checkKey,
      message: "The assurance runner failed before it could produce a trusted result.",
      recommendedAction: "Review the assurance runner error and rerun the check after repair.",
      counts: { scanned: 0, error: 1 },
      errorCode: "ASSURANCE_RUNNER_ERROR",
      errorMessage: message,
      metadata: {
        errorName: error instanceof Error ? error.name : "UnknownError",
      },
    })
  }
}

async function runPostedSourceLinkCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const sourceBackedWhere = {
    organizationId: input.organizationId,
    status: "POSTED" as const,
    sourceType: { not: null },
    sourceId: { not: null },
  }
  const [sourceBackedPostedCount, missingSourceLinkCount] = await Promise.all([
    db.journalEntry.count({ where: sourceBackedWhere }),
    db.journalEntry.count({
      where: {
        ...sourceBackedWhere,
        sourceLinks: {
          none: {},
        },
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = missingSourceLinkCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    sourceBackedPostedCount,
    missingSourceLinkCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingSourceLinkCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "journal_entries",
    sourceId: "posted_source_backed_entries",
    sourceHash,
    message:
      missingSourceLinkCount > 0
        ? "Posted source-backed journal entries are missing accounting source links."
        : "Posted source-backed journal entries keep accounting source-link evidence.",
    recommendedAction:
      missingSourceLinkCount > 0
        ? "Open accounting journals and repair missing source-link evidence before close."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "journal_entries",
        sourceType: "posted_source_backed_entries",
        sourceId: "aggregate",
        sourceHash,
        label: "Posted source-backed journal entries",
        route: definition.actionRoute,
        metadata: {
          sourceBackedPostedCount,
          missingSourceLinkCount,
        },
      },
    ],
    counts: {
      scanned: sourceBackedPostedCount,
      passed: sourceBackedPostedCount - missingSourceLinkCount,
      failed: missingSourceLinkCount,
    },
    metadata: {
      sourceBackedPostedCount,
      missingSourceLinkCount,
    },
  })
}

async function runPostedBatchJournalCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const postedBatchWhere = {
    organizationId: input.organizationId,
    status: "POSTED" as const,
    ...(input.periodId ? { periodId: input.periodId } : {}),
  }
  const [postedBatchCount, missingPostedJournalCount] = await Promise.all([
    db.ledgerPostingBatch.count({ where: postedBatchWhere }),
    db.ledgerPostingBatch.count({
      where: {
        ...postedBatchWhere,
        journalEntries: {
          none: {
            status: "POSTED",
          },
        },
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = missingPostedJournalCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    postedBatchCount,
    missingPostedJournalCount,
    periodId: input.periodId ?? null,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingPostedJournalCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "ledger_posting_batches",
    sourceId: "posted_batches_missing_journal",
    sourceHash,
    message:
      missingPostedJournalCount > 0
        ? "Posted ledger posting batches are missing posted journal entries."
        : "Posted ledger posting batches have posted journal evidence.",
    recommendedAction:
      missingPostedJournalCount > 0
        ? "Open accounting journals and repair or reverse posted batches that lack posted journal entries."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "ledger_posting_batches",
        sourceType: "posted_batches_missing_journal",
        sourceId: "aggregate",
        sourceHash,
        label: "Posted ledger posting batches",
        route: definition.actionRoute,
        metadata: {
          postedBatchCount,
          missingPostedJournalCount,
          periodId: input.periodId ?? null,
        },
      },
    ],
    counts: {
      scanned: postedBatchCount,
      passed: Math.max(postedBatchCount - missingPostedJournalCount, 0),
      failed: missingPostedJournalCount,
    },
    metadata: {
      postedBatchCount,
      missingPostedJournalCount,
      periodId: input.periodId ?? null,
    },
  })
}

async function runJournalBalanceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const journalEntries = await db.journalEntry.findMany({
    where: {
      organizationId: input.organizationId,
      status: { in: ["POSTED", "REVERSED"] },
      ...(input.periodId ? { periodId: input.periodId } : {}),
    },
    select: {
      id: true,
      entryNumber: true,
      currency: true,
      lines: {
        select: {
          debit: true,
          credit: true,
        },
      },
    },
  })
  const unbalancedEntries = journalEntries
    .map((entry) => {
      const debit = sumDecimalValues(entry.lines.map((line) => line.debit))
      const credit = sumDecimalValues(entry.lines.map((line) => line.credit))
      return {
        id: entry.id,
        entryNumber: entry.entryNumber,
        currency: entry.currency,
        debit: debit.toFixed(2),
        credit: credit.toFixed(2),
        isBalanced: debit.equals(credit),
      }
    })
    .filter((entry) => !entry.isBalanced)
  const status: WorkflowAssuranceResultStatus = unbalancedEntries.length > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    postedOrReversedEntryCount: journalEntries.length,
    unbalancedEntryCount: unbalancedEntries.length,
    unbalancedEntryIds: unbalancedEntries.map((entry) => entry.id),
    periodId: input.periodId ?? null,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: unbalancedEntries.length > 0 ? definition.defaultSeverity : "info",
    sourceType: "journal_entries",
    sourceId: "unbalanced_posted_entries",
    sourceHash,
    message:
      unbalancedEntries.length > 0
        ? "Posted or reversed journal entries are not balanced."
        : "Posted and reversed journal entries balance debits and credits.",
    recommendedAction:
      unbalancedEntries.length > 0
        ? "Open the trial balance and repair or reverse unbalanced posted entries before close."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "journal_entries",
        sourceType: "unbalanced_posted_entries",
        sourceId: "aggregate",
        sourceHash,
        label: "Posted and reversed journal balance",
        route: definition.actionRoute,
        metadata: {
          postedOrReversedEntryCount: journalEntries.length,
          unbalancedEntries: unbalancedEntries.slice(0, 10),
          periodId: input.periodId ?? null,
        },
      },
    ],
    counts: {
      scanned: journalEntries.length,
      passed: Math.max(journalEntries.length - unbalancedEntries.length, 0),
      failed: unbalancedEntries.length,
    },
    metadata: {
      postedOrReversedEntryCount: journalEntries.length,
      unbalancedEntryCount: unbalancedEntries.length,
      sampleUnbalancedEntries: unbalancedEntries.slice(0, 10),
      periodId: input.periodId ?? null,
    },
  })
}

async function runFinalDocumentHashCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const [finalDocumentCount, certifiedDocumentCount, missingHashDocuments] = await Promise.all([
    db.fiscalDocument.count({
      where: {
        organizationId: input.organizationId,
        status: { in: FINAL_DOCUMENT_STATUSES },
      },
    }),
    db.fiscalDocument.count({
      where: {
        organizationId: input.organizationId,
        status: "CERTIFIED",
      },
    }),
    db.fiscalDocument.findMany({
      where: {
        organizationId: input.organizationId,
        OR: [
          {
            status: { in: FINAL_DOCUMENT_STATUSES },
            OR: [
              { canonicalPayloadHash: "" },
              { sourcePayloadHash: null },
              { sourcePayloadHash: "" },
              { idempotencyKey: "" },
            ],
          },
          {
            status: "CERTIFIED",
            OR: [{ certificationArtifactHash: null }, { certificationArtifactHash: "" }],
          },
        ],
      },
      select: {
        id: true,
        status: true,
        sourceType: true,
        sourceId: true,
      },
      take: 25,
    }),
  ])
  const missingHashCount = missingHashDocuments.length
  const status: WorkflowAssuranceResultStatus = missingHashCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    finalDocumentCount,
    certifiedDocumentCount,
    missingHashCount,
    sampleDocumentIds: missingHashDocuments.map((document) => document.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingHashCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "fiscal_documents",
    sourceId: "final_documents_missing_hash",
    sourceHash,
    message:
      missingHashCount > 0
        ? "Final fiscal documents are missing canonical, source, or certification hash evidence."
        : "Final fiscal documents retain required hash evidence.",
    recommendedAction:
      missingHashCount > 0
        ? "Open compliance documents, regenerate missing evidence, or mark the affected fiscal documents for accountant review."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "fiscal_documents",
        sourceType: "final_documents_missing_hash",
        sourceId: "aggregate",
        sourceHash,
        label: "Final fiscal document hash evidence",
        route: definition.actionRoute,
        metadata: {
          finalDocumentCount,
          certifiedDocumentCount,
          missingHashCount,
          sampleDocuments: missingHashDocuments,
        },
      },
    ],
    counts: {
      scanned: finalDocumentCount,
      passed: Math.max(finalDocumentCount - missingHashCount, 0),
      failed: missingHashCount,
    },
    metadata: {
      finalDocumentCount,
      certifiedDocumentCount,
      missingHashCount,
      sampleDocuments: missingHashDocuments,
    },
  })
}

async function runClosedPeriodPostingCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const lockedPeriods = await db.accountingPeriod.findMany({
    where: {
      organizationId: input.organizationId,
      status: { in: LOCKED_PERIOD_STATUSES },
      ...(input.periodId ? { id: input.periodId } : {}),
    },
    select: {
      id: true,
      name: true,
      status: true,
      lockedAt: true,
      closedAt: true,
    },
  })
  const periodFindings = []

  for (const period of lockedPeriods) {
    const lockedAt = period.closedAt ?? period.lockedAt
    if (!lockedAt) continue
    const [lateJournalEntryCount, latePostingBatchCount] = await Promise.all([
      db.journalEntry.count({
        where: {
          organizationId: input.organizationId,
          periodId: period.id,
          status: "POSTED",
          postedAt: { gt: lockedAt },
        },
      }),
      db.ledgerPostingBatch.count({
        where: {
          organizationId: input.organizationId,
          periodId: period.id,
          status: "POSTED",
          postedAt: { gt: lockedAt },
        },
      }),
    ])
    const mutationCount = lateJournalEntryCount + latePostingBatchCount
    if (mutationCount > 0) {
      periodFindings.push({
        periodId: period.id,
        periodName: period.name,
        periodStatus: period.status,
        lockedAt: lockedAt.toISOString(),
        lateJournalEntryCount,
        latePostingBatchCount,
      })
    }
  }

  const latePostingCount = periodFindings.reduce(
    (total, finding) => total + finding.lateJournalEntryCount + finding.latePostingBatchCount,
    0,
  )
  const status: WorkflowAssuranceResultStatus = latePostingCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    lockedPeriodCount: lockedPeriods.length,
    latePostingCount,
    periodFindings,
    periodId: input.periodId ?? null,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: latePostingCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "accounting_periods",
    sourceId: "closed_period_late_postings",
    sourceHash,
    message:
      latePostingCount > 0
        ? "Locked or closed accounting periods received posted ledger activity after lock or close."
        : "Locked and closed periods have no later posted ledger activity.",
    recommendedAction:
      latePostingCount > 0
        ? "Open the accounting control center, review period locks, and reverse or explain the late postings."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "accounting_periods",
        sourceType: "closed_period_late_postings",
        sourceId: input.periodId ?? "aggregate",
        sourceHash,
        label: "Locked and closed accounting periods",
        route: definition.actionRoute,
        metadata: {
          lockedPeriodCount: lockedPeriods.length,
          latePostingCount,
          periodFindings,
        },
      },
    ],
    counts: {
      scanned: lockedPeriods.length,
      passed: Math.max(lockedPeriods.length - periodFindings.length, 0),
      failed: periodFindings.length,
      blocked: latePostingCount,
    },
    metadata: {
      lockedPeriodCount: lockedPeriods.length,
      latePostingCount,
      periodFindings,
      periodId: input.periodId ?? null,
    },
  })
}

async function runFailedPostingBatchVisibilityCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const failedBatchWhere = {
    organizationId: input.organizationId,
    status: "FAILED" as const,
    ...(input.periodId ? { periodId: input.periodId } : {}),
  }
  const [failedBatchCount, sampleFailedBatches] = await Promise.all([
    db.ledgerPostingBatch.count({ where: failedBatchWhere }),
    db.ledgerPostingBatch.findMany({
      where: failedBatchWhere,
      select: {
        id: true,
        sourceType: true,
        sourceId: true,
        errorMessage: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 25,
    }),
  ])
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    failedBatchCount,
    sampleFailedBatchIds: sampleFailedBatches.map((batch) => batch.id),
    periodId: input.periodId ?? null,
  })
  const visibleIncident =
    failedBatchCount === 0
      ? null
      : await db.workflowAssuranceIncident.findFirst({
          where: {
            organizationId: input.organizationId,
            checkKey: definition.checkKey,
            sourceType: "ledger_posting_batches",
            sourceId: "failed_posting_batches",
            sourceHash,
            status: { in: VISIBLE_INCIDENT_STATUSES },
          },
          select: {
            id: true,
            status: true,
            lastDetectedAt: true,
          },
        })
  const missingVisibleIncidentCount = failedBatchCount > 0 && !visibleIncident ? failedBatchCount : 0
  const status: WorkflowAssuranceResultStatus = missingVisibleIncidentCount > 0 ? "failed" : "passed"

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingVisibleIncidentCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "ledger_posting_batches",
    sourceId: "failed_posting_batches",
    sourceHash,
    message:
      missingVisibleIncidentCount > 0
        ? "Failed ledger posting batches are not yet visible as manager assurance incidents."
        : failedBatchCount > 0
          ? "Failed ledger posting batches are visible to managers through assurance incidents."
          : "No failed ledger posting batches were found.",
    recommendedAction:
      missingVisibleIncidentCount > 0
        ? "Open Manager Action Center; this check will create the visible incident for failed posting batches."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "ledger_posting_batches",
        sourceType: "failed_posting_batches",
        sourceId: "aggregate",
        sourceHash,
        label: "Failed ledger posting batches",
        route: definition.actionRoute,
        metadata: {
          failedBatchCount,
          missingVisibleIncidentCount,
          visibleIncidentId: visibleIncident?.id ?? null,
          sampleFailedBatches,
          periodId: input.periodId ?? null,
        },
      },
    ],
    counts: {
      scanned: failedBatchCount,
      passed: failedBatchCount - missingVisibleIncidentCount,
      failed: missingVisibleIncidentCount,
    },
    metadata: {
      failedBatchCount,
      missingVisibleIncidentCount,
      visibleIncidentId: visibleIncident?.id ?? null,
      visibleIncidentStatus: visibleIncident?.status ?? null,
      sampleFailedBatches,
      periodId: input.periodId ?? null,
    },
  })
}

async function runCompletedPosSalePaymentCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalPosSaleWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: FINAL_POS_SALE_STATUSES },
    OR: [{ terminalId: { not: null } }, { sessionId: { not: null } }],
  }
  const [finalPosSaleCount, missingPaymentEvidenceCount] = await Promise.all([
    db.salesOrder.count({ where: finalPosSaleWhere }),
    db.salesOrder.count({
      where: {
        ...finalPosSaleWhere,
        OR: [
          { paymentStatus: { notIn: PAID_OR_PARTIAL_PAYMENT_STATUSES } },
          {
            payments: {
              none: {
                deletedAt: null,
                status: { in: PAID_OR_PARTIAL_PAYMENT_STATUSES },
              },
            },
          },
        ],
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = missingPaymentEvidenceCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    finalPosSaleCount,
    missingPaymentEvidenceCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingPaymentEvidenceCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "sales_orders",
    sourceId: "completed_pos_sales_missing_payment",
    sourceHash,
    message:
      missingPaymentEvidenceCount > 0
        ? "Completed POS sales are missing paid or partial payment evidence."
        : "Completed POS sales retain payment evidence.",
    recommendedAction:
      missingPaymentEvidenceCount > 0
        ? "Open POS and reconcile completed sales that do not have paid or partial payment evidence."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "sales_orders",
        sourceType: "completed_pos_sales_missing_payment",
        sourceId: "aggregate",
        sourceHash,
        label: "Completed POS sales payment evidence",
        route: definition.actionRoute,
        metadata: {
          finalPosSaleCount,
          missingPaymentEvidenceCount,
        },
      },
    ],
    counts: {
      scanned: finalPosSaleCount,
      passed: Math.max(finalPosSaleCount - missingPaymentEvidenceCount, 0),
      failed: missingPaymentEvidenceCount,
    },
    metadata: {
      finalPosSaleCount,
      missingPaymentEvidenceCount,
    },
  })
}

async function runCompletedPosSaleReceiptCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalSales = await loadFinalPosSalesForTruth(definition, input)
  const receiptDocuments =
    finalSales.length === 0
      ? []
      : await db.fiscalDocument.findMany({
          where: {
            organizationId: input.organizationId,
            sourceType: AccountingSourceType.POS_SALE,
            sourceId: { in: finalSales.map((sale) => sale.id) },
            documentType: FiscalDocumentType.POS_RECEIPT,
            status: { in: VISIBLE_POS_RECEIPT_STATUSES },
          },
          select: {
            id: true,
            sourceId: true,
            status: true,
            canonicalPayloadHash: true,
            legalNumber: true,
            certifiedAt: true,
          },
        })
  const saleIdsWithReceipt = new Set(receiptDocuments.map((document) => document.sourceId))
  const missingReceiptSales = finalSales
    .filter((sale) => !saleIdsWithReceipt.has(sale.id))
    .map((sale) => ({
      id: sale.id,
      orderNumber: sale.orderNumber,
      paymentStatus: sale.paymentStatus,
    }))
  const status: WorkflowAssuranceResultStatus = missingReceiptSales.length > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    scannedSaleIds: finalSales.map((sale) => sale.id),
    missingReceiptSaleIds: missingReceiptSales.map((sale) => sale.id),
    receiptDocumentIds: receiptDocuments.map((document) => document.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingReceiptSales.length > 0 ? definition.defaultSeverity : "info",
    sourceType: "sales_orders",
    sourceId: "completed_pos_sales_missing_receipt",
    sourceHash,
    message:
      missingReceiptSales.length > 0
        ? "Completed POS sales are missing visible fiscal receipt proof."
        : "Completed POS sales retain fiscal receipt proof.",
    recommendedAction:
      missingReceiptSales.length > 0
        ? "Open POS receipts or fiscal proof, regenerate queued receipt evidence, and keep legal delivery blocked until proof exists."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "fiscal_documents",
        sourceType: "completed_pos_sales_missing_receipt",
        sourceId: "aggregate",
        sourceHash,
        label: "Completed POS sales receipt proof",
        route: definition.actionRoute,
        metadata: {
          scannedSaleCount: finalSales.length,
          receiptDocumentCount: receiptDocuments.length,
          missingReceiptSaleCount: missingReceiptSales.length,
          sampleMissingReceiptSales: missingReceiptSales.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: finalSales.length,
      passed: Math.max(finalSales.length - missingReceiptSales.length, 0),
      failed: missingReceiptSales.length,
    },
    metadata: {
      scannedSaleCount: finalSales.length,
      receiptDocumentCount: receiptDocuments.length,
      missingReceiptSaleCount: missingReceiptSales.length,
      sampleMissingReceiptSales: missingReceiptSales.slice(0, 10),
    },
  })
}

async function runCompletedPosSaleStockMovementCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalSales = await loadFinalPosSalesForTruth(definition, input)
  const inventoryTrackedSales = finalSales.filter((sale) =>
    sale.lines.some((line) => line.item.trackInventory),
  )
  const missingStockMovementSales = []

  for (const sale of inventoryTrackedSales) {
    const movementCount = await db.inventoryTransaction.count({
      where: {
        organizationId: input.organizationId,
        referenceType: TransactionReferenceType.SALES_ORDER,
        referenceId: sale.id,
        type: TransactionType.SALE,
      },
    })

    if (movementCount === 0) {
      missingStockMovementSales.push({
        id: sale.id,
        orderNumber: sale.orderNumber,
        trackedLineCount: sale.lines.filter((line) => line.item.trackInventory).length,
      })
    }
  }

  const status: WorkflowAssuranceResultStatus = missingStockMovementSales.length > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    scannedSaleIds: inventoryTrackedSales.map((sale) => sale.id),
    missingStockMovementSaleIds: missingStockMovementSales.map((sale) => sale.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingStockMovementSales.length > 0 ? definition.defaultSeverity : "info",
    sourceType: "inventory_transactions",
    sourceId: "completed_pos_sales_missing_stock_movement",
    sourceHash,
    message:
      missingStockMovementSales.length > 0
        ? "Completed POS sales with inventory-tracked items are missing stock movement proof."
        : "Completed POS sales with inventory-tracked items retain stock movement proof.",
    recommendedAction:
      missingStockMovementSales.length > 0
        ? "Open POS and inventory movement proof, repair the sale stock event, and keep inventory BI marked untrusted until resolved."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "inventory_transactions",
        sourceType: "completed_pos_sales_missing_stock_movement",
        sourceId: "aggregate",
        sourceHash,
        label: "Completed POS sales stock movement proof",
        route: definition.actionRoute,
        metadata: {
          scannedSaleCount: finalSales.length,
          inventoryTrackedSaleCount: inventoryTrackedSales.length,
          missingStockMovementSaleCount: missingStockMovementSales.length,
          sampleMissingStockMovementSales: missingStockMovementSales.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: inventoryTrackedSales.length,
      passed: Math.max(inventoryTrackedSales.length - missingStockMovementSales.length, 0),
      failed: missingStockMovementSales.length,
    },
    metadata: {
      scannedSaleCount: finalSales.length,
      inventoryTrackedSaleCount: inventoryTrackedSales.length,
      missingStockMovementSaleCount: missingStockMovementSales.length,
      sampleMissingStockMovementSales: missingStockMovementSales.slice(0, 10),
    },
  })
}

async function runCompletedPosSaleLedgerSourceLinkCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalSales = await loadFinalPosSalesForTruth(definition, input)
  const missingLedgerProofSales = []

  for (const sale of finalSales) {
    const postedSourceLinkedBatchCount = await db.ledgerPostingBatch.count({
      where: {
        organizationId: input.organizationId,
        sourceType: AccountingSourceType.POS_SALE,
        sourceId: sale.id,
        postingPurpose: AccountingPostingPurpose.SALE_COMPLETION,
        status: LedgerPostingBatchStatus.POSTED,
        journalEntries: {
          some: {
            status: JournalEntryStatus.POSTED,
          },
        },
        sourceLinks: {
          some: {
            sourceType: AccountingSourceType.POS_SALE,
            sourceId: sale.id,
          },
        },
      },
    })

    if (postedSourceLinkedBatchCount === 0) {
      missingLedgerProofSales.push({
        id: sale.id,
        orderNumber: sale.orderNumber,
        paymentStatus: sale.paymentStatus,
      })
    }
  }

  const status: WorkflowAssuranceResultStatus = missingLedgerProofSales.length > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    scannedSaleIds: finalSales.map((sale) => sale.id),
    missingLedgerProofSaleIds: missingLedgerProofSales.map((sale) => sale.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingLedgerProofSales.length > 0 ? definition.defaultSeverity : "info",
    sourceType: "ledger_posting_batches",
    sourceId: "completed_pos_sales_missing_ledger_source_link",
    sourceHash,
    message:
      missingLedgerProofSales.length > 0
        ? "Completed POS sales are missing posted ledger batch, posted journal, or accounting source-link proof."
        : "Completed POS sales retain posted ledger and source-link proof.",
    recommendedAction:
      missingLedgerProofSales.length > 0
        ? "Open POS and accounting proof, rerun posting where safe, or route the failed posting to the Control Tower."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "ledger_posting_batches",
        sourceType: "completed_pos_sales_missing_ledger_source_link",
        sourceId: "aggregate",
        sourceHash,
        label: "Completed POS sales ledger source proof",
        route: definition.actionRoute,
        metadata: {
          scannedSaleCount: finalSales.length,
          missingLedgerProofSaleCount: missingLedgerProofSales.length,
          sampleMissingLedgerProofSales: missingLedgerProofSales.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: finalSales.length,
      passed: Math.max(finalSales.length - missingLedgerProofSales.length, 0),
      failed: missingLedgerProofSales.length,
    },
    metadata: {
      scannedSaleCount: finalSales.length,
      missingLedgerProofSaleCount: missingLedgerProofSales.length,
      sampleMissingLedgerProofSales: missingLedgerProofSales.slice(0, 10),
    },
  })
}

async function runNetworkTenderIdempotencyHashCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalPosSaleWhere = createFinalPosSaleWhere(input)
  const networkTenderWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: PAID_OR_PARTIAL_PAYMENT_STATUSES },
    method: { in: NETWORK_TENDER_METHODS },
    salesOrder: {
      is: finalPosSaleWhere,
    },
  }
  const missingIdempotencyOrHashWhere = {
    ...networkTenderWhere,
    OR: [
      { idempotencyKey: null },
      { idempotencyKey: "" },
      { reconciliationTransaction: { is: null } },
      { reconciliationTransaction: { is: { payloadHash: null } } },
      { reconciliationTransaction: { is: { payloadHash: "" } } },
    ],
  }
  const [networkTenderCount, missingIdempotencyOrHashCount] = await Promise.all([
    db.payment.count({ where: networkTenderWhere }),
    db.payment.count({ where: missingIdempotencyOrHashWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingIdempotencyOrHashCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    networkTenderCount,
    missingIdempotencyOrHashCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingIdempotencyOrHashCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "payments",
    sourceId: "network_tenders_missing_idempotency_hash",
    sourceHash,
    message:
      missingIdempotencyOrHashCount > 0
        ? "Network POS tenders are missing idempotency keys or payment transaction payload hashes."
        : "Network POS tenders retain idempotency keys and payment transaction payload hashes.",
    recommendedAction:
      missingIdempotencyOrHashCount > 0
        ? "Open POS payment proof and reconciliation links before trusting network tender replay or provider matching."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "payments",
        sourceType: "network_tenders_missing_idempotency_hash",
        sourceId: "aggregate",
        sourceHash,
        label: "Network POS tender idempotency and hash proof",
        route: definition.actionRoute,
        metadata: {
          networkTenderCount,
          missingIdempotencyOrHashCount,
        },
      },
    ],
    counts: {
      scanned: networkTenderCount,
      passed: Math.max(networkTenderCount - missingIdempotencyOrHashCount, 0),
      warning: missingIdempotencyOrHashCount,
    },
    metadata: {
      networkTenderCount,
      missingIdempotencyOrHashCount,
    },
  })
}

function createFinalPosSaleWhere(input: WorkflowAssuranceRunInput): Prisma.SalesOrderWhereInput {
  return {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: FINAL_POS_SALE_STATUSES },
    OR: [{ terminalId: { not: null } }, { sessionId: { not: null } }],
  }
}

function loadFinalPosSalesForTruth(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  return db.salesOrder.findMany({
    where: createFinalPosSaleWhere(input),
    select: {
      id: true,
      orderNumber: true,
      paymentStatus: true,
      lines: {
        select: {
          id: true,
          itemId: true,
          item: {
            select: {
              trackInventory: true,
            },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
    take: Number(definition.metadata.maxScan ?? 500),
  })
}

async function runOfflinePosReplaySlaCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 30)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const [offlineEventCount, staleReplayCount, openConflictCount] = await Promise.all([
    db.pOSOfflineEvent.count({ where: { organizationId: input.organizationId } }),
    db.pOSOfflineEvent.count({
      where: {
        organizationId: input.organizationId,
        status: { in: STALE_OFFLINE_EVENT_STATUSES },
        receivedAtServer: { lt: cutoff },
      },
    }),
    db.pOSOfflineSyncConflict.count({
      where: {
        organizationId: input.organizationId,
        status: { in: ACTIVE_OFFLINE_CONFLICT_STATUSES },
        severity: { in: SERIOUS_OFFLINE_CONFLICT_SEVERITIES },
      },
    }),
  ])
  const problemCount = staleReplayCount + openConflictCount
  const status: WorkflowAssuranceResultStatus = problemCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    offlineEventCount,
    staleReplayCount,
    openConflictCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: problemCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "pos_offline_events",
    sourceId: "offline_replay_sla",
    sourceHash,
    message:
      problemCount > 0
        ? "Offline POS replay has stale events or unresolved serious conflicts."
        : "Offline POS replay is within SLA or visibly resolved.",
    recommendedAction:
      problemCount > 0
        ? "Open POS offline controls, replay stale events, or resolve serious offline conflicts."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "pos_offline_events",
        sourceType: "offline_replay_sla",
        sourceId: "aggregate",
        sourceHash,
        label: "Offline POS replay SLA",
        route: definition.actionRoute,
        metadata: {
          offlineEventCount,
          staleReplayCount,
          openConflictCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: offlineEventCount,
      passed: Math.max(offlineEventCount - problemCount, 0),
      warning: problemCount,
    },
    metadata: {
      offlineEventCount,
      staleReplayCount,
      openConflictCount,
      staleAfterMinutes,
    },
  })
}

async function runOfflineAcceptedEventBusinessEventCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const acceptedWhere = {
    organizationId: input.organizationId,
    status: { in: ACCEPTED_OFFLINE_EVENT_STATUSES },
  }
  const missingBusinessEventWhere = {
    ...acceptedWhere,
    OR: [
      { businessEventId: null },
      { blockerCode: null },
      { blockerCode: "" },
    ],
  }
  const [acceptedEventCount, missingBusinessEventCount] = await Promise.all([
    db.pOSOfflineEvent.count({ where: acceptedWhere }),
    db.pOSOfflineEvent.count({ where: missingBusinessEventWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingBusinessEventCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    acceptedEventCount,
    missingBusinessEventCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingBusinessEventCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "pos_offline_events",
    sourceId: "accepted_events_missing_business_event",
    sourceHash,
    message:
      missingBusinessEventCount > 0
        ? "Accepted offline POS events are missing captured business-event or pending-replay blocker proof."
        : "Accepted offline POS events retain captured business-event and pending-replay proof.",
    recommendedAction:
      missingBusinessEventCount > 0
        ? "Open POS offline controls and rebuild or quarantine accepted events before replay."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "pos_offline_events",
        sourceType: "accepted_events_missing_business_event",
        sourceId: "aggregate",
        sourceHash,
        label: "Accepted offline event business proof",
        route: definition.actionRoute,
        metadata: {
          acceptedEventCount,
          missingBusinessEventCount,
        },
      },
    ],
    counts: {
      scanned: acceptedEventCount,
      passed: Math.max(acceptedEventCount - missingBusinessEventCount, 0),
      failed: missingBusinessEventCount,
    },
    metadata: {
      acceptedEventCount,
      missingBusinessEventCount,
    },
  })
}

async function runOfflineSequenceHashConflictVisibilityCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const sequenceHashConflictWhere = {
    organizationId: input.organizationId,
    conflictType: { in: SEQUENCE_HASH_CONFLICT_TYPES },
  }
  const visibleSequenceHashConflictWhere = {
    ...sequenceHashConflictWhere,
    status: { in: ACTIVE_OFFLINE_CONFLICT_STATUSES },
  }
  const [sequenceHashConflictCount, visibleSequenceHashConflictCount] = await Promise.all([
    db.pOSOfflineSyncConflict.count({ where: sequenceHashConflictWhere }),
    db.pOSOfflineSyncConflict.count({ where: visibleSequenceHashConflictWhere }),
  ])
  const historicalSequenceHashConflictCount = Math.max(sequenceHashConflictCount - visibleSequenceHashConflictCount, 0)
  const status: WorkflowAssuranceResultStatus = visibleSequenceHashConflictCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    sequenceHashConflictCount,
    visibleSequenceHashConflictCount,
    historicalSequenceHashConflictCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: visibleSequenceHashConflictCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "pos_offline_sync_conflicts",
    sourceId: "sequence_hash_conflict_visibility",
    sourceHash,
    message:
      visibleSequenceHashConflictCount > 0
        ? "Offline sequence, hash-chain, signature, or idempotency conflicts require manager review."
        : "Offline sequence, hash-chain, signature, and idempotency conflicts are manager-visible or absent.",
    recommendedAction:
      visibleSequenceHashConflictCount > 0
        ? "Open POS offline conflict review and resolve sequence, hash-chain, signature, or idempotency evidence before replay certification."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "pos_offline_sync_conflicts",
        sourceType: "sequence_hash_conflict_visibility",
        sourceId: "aggregate",
        sourceHash,
        label: "Offline sequence and hash-chain conflict visibility",
        route: definition.actionRoute,
        metadata: {
          sequenceHashConflictCount,
          visibleSequenceHashConflictCount,
          historicalSequenceHashConflictCount,
          conflictTypes: SEQUENCE_HASH_CONFLICT_TYPES,
        },
      },
    ],
    counts: {
      scanned: sequenceHashConflictCount,
      passed: historicalSequenceHashConflictCount,
      warning: visibleSequenceHashConflictCount,
    },
    metadata: {
      sequenceHashConflictCount,
      visibleSequenceHashConflictCount,
      historicalSequenceHashConflictCount,
      conflictTypes: SEQUENCE_HASH_CONFLICT_TYPES,
    },
  })
}

async function runOfflineQuarantinedEventConflictCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const blockedEventWhere = {
    organizationId: input.organizationId,
    status: { in: BLOCKED_OFFLINE_EVENT_STATUSES },
  }
  const missingConflictEvidenceWhere = {
    ...blockedEventWhere,
    OR: [
      { blockerCode: null },
      { blockerCode: "" },
      { blockerMessage: null },
      { blockerMessage: "" },
      { conflicts: { none: {} } },
    ],
  }
  const [blockedEventCount, missingConflictEvidenceCount] = await Promise.all([
    db.pOSOfflineEvent.count({ where: blockedEventWhere }),
    db.pOSOfflineEvent.count({ where: missingConflictEvidenceWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingConflictEvidenceCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    blockedEventCount,
    missingConflictEvidenceCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingConflictEvidenceCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "pos_offline_events",
    sourceId: "blocked_events_missing_conflict_evidence",
    sourceHash,
    message:
      missingConflictEvidenceCount > 0
        ? "Blocked or quarantined offline POS events are missing blocker or conflict evidence."
        : "Blocked and quarantined offline POS events retain blocker and conflict evidence.",
    recommendedAction:
      missingConflictEvidenceCount > 0
        ? "Open POS offline conflict review and attach blocker/conflict proof before any replay or waiver."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "pos_offline_events",
        sourceType: "blocked_events_missing_conflict_evidence",
        sourceId: "aggregate",
        sourceHash,
        label: "Blocked offline event conflict proof",
        route: definition.actionRoute,
        metadata: {
          blockedEventCount,
          missingConflictEvidenceCount,
        },
      },
    ],
    counts: {
      scanned: blockedEventCount,
      passed: Math.max(blockedEventCount - missingConflictEvidenceCount, 0),
      failed: missingConflictEvidenceCount,
    },
    metadata: {
      blockedEventCount,
      missingConflictEvidenceCount,
    },
  })
}

async function runOfflineReplayedEventProofCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const replayedEventWhere = {
    organizationId: input.organizationId,
    status: { in: REPLAYED_OFFLINE_EVENT_STATUSES },
  }
  const missingReplayProofWhere = {
    ...replayedEventWhere,
    OR: [
      { businessEventId: null },
      { postingBatchId: null },
      { postingBatchId: "" },
      { documentHash: null },
      { documentHash: "" },
    ],
  }
  const [replayedEventCount, missingReplayProofCount] = await Promise.all([
    db.pOSOfflineEvent.count({ where: replayedEventWhere }),
    db.pOSOfflineEvent.count({ where: missingReplayProofWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingReplayProofCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    replayedEventCount,
    missingReplayProofCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingReplayProofCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "pos_offline_events",
    sourceId: "replayed_events_missing_replay_proof",
    sourceHash,
    message:
      missingReplayProofCount > 0
        ? "Replayed offline POS events are missing business-event, posting batch, or receipt document-hash proof."
        : "Replayed offline POS events retain business-event, posting batch, and receipt document-hash proof.",
    recommendedAction:
      missingReplayProofCount > 0
        ? "Open POS offline controls and repair replay evidence before trusting branch cash, stock, or ledger BI."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "pos_offline_events",
        sourceType: "replayed_events_missing_replay_proof",
        sourceId: "aggregate",
        sourceHash,
        label: "Replayed offline event proof",
        route: definition.actionRoute,
        metadata: {
          replayedEventCount,
          missingReplayProofCount,
        },
      },
    ],
    counts: {
      scanned: replayedEventCount,
      passed: Math.max(replayedEventCount - missingReplayProofCount, 0),
      failed: missingReplayProofCount,
    },
    metadata: {
      replayedEventCount,
      missingReplayProofCount,
    },
  })
}

async function runPaymentExceptionSlaCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 60)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const activeSeriousWhere = {
    organizationId: input.organizationId,
    status: { in: ACTIVE_PAYMENT_EXCEPTION_STATUSES },
    severity: { in: SERIOUS_EXCEPTION_SEVERITIES },
  }
  const [activeSeriousExceptionCount, overdueSeriousExceptionCount] = await Promise.all([
    db.paymentException.count({ where: activeSeriousWhere }),
    db.paymentException.count({
      where: {
        ...activeSeriousWhere,
        OR: [{ slaDeadline: { lt: new Date() } }, { slaDeadline: null, createdAt: { lt: cutoff } }],
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = overdueSeriousExceptionCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    activeSeriousExceptionCount,
    overdueSeriousExceptionCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: overdueSeriousExceptionCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "payment_exceptions",
    sourceId: "overdue_serious_exceptions",
    sourceHash,
    message:
      overdueSeriousExceptionCount > 0
        ? "High or critical payment exceptions are past SLA and need manager action."
        : "High and critical payment exceptions are inside SLA or resolved.",
    recommendedAction:
      overdueSeriousExceptionCount > 0
        ? "Open payment reconciliation and assign, resolve, or escalate overdue exceptions."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "payment_exceptions",
        sourceType: "overdue_serious_exceptions",
        sourceId: "aggregate",
        sourceHash,
        label: "Payment exception SLA",
        route: definition.actionRoute,
        metadata: {
          activeSeriousExceptionCount,
          overdueSeriousExceptionCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: activeSeriousExceptionCount,
      passed: Math.max(activeSeriousExceptionCount - overdueSeriousExceptionCount, 0),
      warning: overdueSeriousExceptionCount,
    },
    metadata: {
      activeSeriousExceptionCount,
      overdueSeriousExceptionCount,
      staleAfterMinutes,
    },
  })
}

async function runSuspenseOwnerCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 60)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const agedSuspenseWhere = {
    organizationId: input.organizationId,
    status: { in: ACTIVE_SUSPENSE_STATUSES },
    OR: [{ slaDeadline: { lt: new Date() } }, { slaDeadline: null, createdAt: { lt: cutoff } }],
  }
  const [agedSuspenseCount, missingOwnerCount] = await Promise.all([
    db.suspenseItem.count({ where: agedSuspenseWhere }),
    db.suspenseItem.count({
      where: {
        ...agedSuspenseWhere,
        ownerId: null,
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = missingOwnerCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    agedSuspenseCount,
    missingOwnerCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingOwnerCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "suspense_items",
    sourceId: "aged_suspense_missing_owner",
    sourceHash,
    message:
      missingOwnerCount > 0
        ? "Aged suspense items are missing an owner."
        : "Aged suspense items have manager ownership.",
    recommendedAction:
      missingOwnerCount > 0
        ? "Open payment reconciliation and assign owners to aged suspense items."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "suspense_items",
        sourceType: "aged_suspense_missing_owner",
        sourceId: "aggregate",
        sourceHash,
        label: "Aged suspense owner queue",
        route: definition.actionRoute,
        metadata: {
          agedSuspenseCount,
          missingOwnerCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: agedSuspenseCount,
      passed: Math.max(agedSuspenseCount - missingOwnerCount, 0),
      warning: missingOwnerCount,
    },
    metadata: {
      agedSuspenseCount,
      missingOwnerCount,
      staleAfterMinutes,
    },
  })
}

async function runUnmatchedProviderEventVisibilityCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 30)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const providerEventWhere = {
    organizationId: input.organizationId,
    archivedAt: null,
    status: { in: UNMATCHED_PROVIDER_EVENT_STATUSES },
  }
  const staleUnmatchedWhere = {
    ...providerEventWhere,
    receivedAt: { lt: cutoff },
    matchRecords: { none: {} },
    paymentExceptions: { none: {} },
  }
  const [providerEventCount, staleUnmatchedProviderEventCount] = await Promise.all([
    db.providerEvent.count({ where: providerEventWhere }),
    db.providerEvent.count({ where: staleUnmatchedWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = staleUnmatchedProviderEventCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    providerEventCount,
    staleUnmatchedProviderEventCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: staleUnmatchedProviderEventCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "provider_events",
    sourceId: "stale_unmatched_provider_events",
    sourceHash,
    message:
      staleUnmatchedProviderEventCount > 0
        ? "Provider events have aged without match, suspense, exception, or signoff visibility."
        : "Provider events are matched, excepted, or still inside the reconciliation SLA.",
    recommendedAction:
      staleUnmatchedProviderEventCount > 0
        ? "Open payment reconciliation and match, suspend, or create an exception for stale provider events."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "provider_events",
        sourceType: "stale_unmatched_provider_events",
        sourceId: "aggregate",
        sourceHash,
        label: "Unmatched provider event queue",
        route: definition.actionRoute,
        metadata: {
          providerEventCount,
          staleUnmatchedProviderEventCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: providerEventCount,
      passed: Math.max(providerEventCount - staleUnmatchedProviderEventCount, 0),
      warning: staleUnmatchedProviderEventCount,
    },
    metadata: {
      providerEventCount,
      staleUnmatchedProviderEventCount,
      staleAfterMinutes,
      statuses: UNMATCHED_PROVIDER_EVENT_STATUSES,
    },
  })
}

async function runUnsignedReconciliationRunSlaCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 120)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const readyRunWhere = {
    organizationId: input.organizationId,
    status: ReconciliationRunStatus.READY_FOR_SIGNOFF,
  }
  const overdueUnsignedRunWhere = {
    ...readyRunWhere,
    updatedAt: { lt: cutoff },
    OR: [{ signedAt: null }, { signedById: null }, { certificateHash: null }],
  }
  const [readyForSignoffRunCount, overdueUnsignedRunCount] = await Promise.all([
    db.reconciliationRun.count({ where: readyRunWhere }),
    db.reconciliationRun.count({ where: overdueUnsignedRunWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = overdueUnsignedRunCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    readyForSignoffRunCount,
    overdueUnsignedRunCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: overdueUnsignedRunCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "reconciliation_runs",
    sourceId: "unsigned_ready_runs",
    sourceHash,
    message:
      overdueUnsignedRunCount > 0
        ? "Reconciliation runs are ready for signoff but have aged without signature or certificate proof."
        : "Ready reconciliation runs are signed inside the configured SLA.",
    recommendedAction:
      overdueUnsignedRunCount > 0
        ? "Open payment reconciliation and sign, block, or send the ready runs back to review."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "reconciliation_runs",
        sourceType: "unsigned_ready_runs",
        sourceId: "aggregate",
        sourceHash,
        label: "Unsigned reconciliation runs",
        route: definition.actionRoute,
        metadata: {
          readyForSignoffRunCount,
          overdueUnsignedRunCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: readyForSignoffRunCount,
      passed: Math.max(readyForSignoffRunCount - overdueUnsignedRunCount, 0),
      warning: overdueUnsignedRunCount,
    },
    metadata: {
      readyForSignoffRunCount,
      overdueUnsignedRunCount,
      staleAfterMinutes,
    },
  })
}

async function runReconciliationCertificateHashCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const signedRuns = await db.reconciliationRun.findMany({
    where: {
      organizationId: input.organizationId,
      status: ReconciliationRunStatus.SIGNED,
    },
    select: {
      id: true,
      certificateHash: true,
      certificatePayload: true,
    },
  })
  const missingCertificateProofCount = signedRuns.filter((run) => !run.certificateHash || !run.certificatePayload).length
  const driftedRunIds = signedRuns
    .filter((run) => run.certificateHash && run.certificatePayload)
    .filter((run) => reconciliationCertificateHash(run.certificatePayload) !== run.certificateHash)
    .map((run) => run.id)
  const driftedCertificateCount = driftedRunIds.length
  const staleCertificateCount = missingCertificateProofCount + driftedCertificateCount
  const status: WorkflowAssuranceResultStatus = staleCertificateCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    signedRunCount: signedRuns.length,
    missingCertificateProofCount,
    driftedCertificateCount,
    driftedRunIds,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: staleCertificateCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "reconciliation_runs",
    sourceId: "signed_runs_stale_certificate_hash",
    sourceHash,
    message:
      staleCertificateCount > 0
        ? "Signed reconciliation certificates are missing proof or no longer match their persisted source payload."
        : "Signed reconciliation certificates retain current source-hash proof.",
    recommendedAction:
      staleCertificateCount > 0
        ? "Open payment reconciliation and review stale certificate proof before relying on signed cash evidence."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "reconciliation_runs",
        sourceType: "signed_runs_stale_certificate_hash",
        sourceId: "aggregate",
        sourceHash,
        label: "Signed reconciliation certificate hashes",
        route: definition.actionRoute,
        metadata: {
          signedRunCount: signedRuns.length,
          missingCertificateProofCount,
          driftedCertificateCount,
          driftedRunIds: driftedRunIds.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: signedRuns.length,
      passed: Math.max(signedRuns.length - staleCertificateCount, 0),
      failed: staleCertificateCount,
    },
    metadata: {
      signedRunCount: signedRuns.length,
      missingCertificateProofCount,
      driftedCertificateCount,
      driftedRunIds: driftedRunIds.slice(0, 10),
    },
  })
}

async function runPurchaseOrderApprovalReceiptTraceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const controlledWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: CONTROLLED_PURCHASE_ORDER_STATUSES },
  }
  const receiptRequiredWhere = {
    ...controlledWhere,
    status: { in: RECEIPT_REQUIRED_PURCHASE_ORDER_STATUSES },
  }
  const missingApprovalWhere = {
    ...controlledWhere,
    OR: [{ approvedAt: null }, { approvedById: null }],
  }
  const missingReceiptWhere = {
    ...receiptRequiredWhere,
    goodsReceipts: {
      none: {
        deletedAt: null,
        status: { in: POSTED_GOODS_RECEIPT_STATUSES },
      },
    },
  }

  const [controlledOrderCount, receiptRequiredOrderCount, missingApprovalCount, missingReceiptCount] =
    await Promise.all([
      db.purchaseOrder.count({ where: controlledWhere }),
      db.purchaseOrder.count({ where: receiptRequiredWhere }),
      db.purchaseOrder.count({ where: missingApprovalWhere }),
      db.purchaseOrder.count({ where: missingReceiptWhere }),
    ])
  const brokenTraceCount = missingApprovalCount + missingReceiptCount
  const status: WorkflowAssuranceResultStatus = brokenTraceCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    controlledOrderCount,
    receiptRequiredOrderCount,
    missingApprovalCount,
    missingReceiptCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: brokenTraceCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "purchase_orders",
    sourceId: "po_approval_receipt_trace",
    sourceHash,
    message:
      brokenTraceCount > 0
        ? "Controlled purchase orders are missing approval or posted receipt evidence."
        : "Controlled purchase orders retain approval and receipt trace evidence.",
    recommendedAction:
      brokenTraceCount > 0
        ? "Open purchasing, review approved and received purchase orders, attach missing approval or receipt proof, and keep the check in observe mode until the AP chain is clean."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "purchase_orders",
        sourceType: "po_approval_receipt_trace",
        sourceId: "aggregate",
        sourceHash,
        label: "Purchase order approval and receipt trace",
        route: definition.actionRoute,
        metadata: {
          controlledOrderCount,
          receiptRequiredOrderCount,
          missingApprovalCount,
          missingReceiptCount,
        },
      },
    ],
    counts: {
      scanned: controlledOrderCount,
      passed: Math.max(controlledOrderCount - brokenTraceCount, 0),
      warning: brokenTraceCount,
    },
    metadata: {
      controlledOrderCount,
      receiptRequiredOrderCount,
      missingApprovalCount,
      missingReceiptCount,
    },
  })
}

async function runGoodsReceiptStockMovementCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const receipts = await db.goodsReceipt.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      status: { in: POSTED_GOODS_RECEIPT_STATUSES },
      lines: { some: {} },
    },
    select: {
      id: true,
      receiptNumber: true,
      status: true,
      purchaseOrderId: true,
    },
    orderBy: { receiptDate: "desc" },
    take: Number(definition.metadata.maxScan ?? 500),
  })
  const brokenReceipts = []

  for (const receipt of receipts) {
    const stockMovementCount = await db.inventoryTransaction.count({
      where: {
        organizationId: input.organizationId,
        referenceType: TransactionReferenceType.GOODS_RECEIPT,
        referenceId: receipt.id,
      },
    })

    if (stockMovementCount === 0) {
      brokenReceipts.push({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        status: receipt.status,
        purchaseOrderId: receipt.purchaseOrderId,
      })
    }
  }

  const missingStockMovementCount = brokenReceipts.length
  const status: WorkflowAssuranceResultStatus = missingStockMovementCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    receiptCount: receipts.length,
    missingStockMovementCount,
    brokenReceiptIds: brokenReceipts.map((receipt) => receipt.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingStockMovementCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "goods_receipts",
    sourceId: "received_goods_missing_stock_movement",
    sourceHash,
    message:
      missingStockMovementCount > 0
        ? "Received goods are missing stock movement proof."
        : "Received goods retain stock movement proof.",
    recommendedAction:
      missingStockMovementCount > 0
        ? "Open purchases, review the affected goods receipts, and repair the stock posting evidence before trusting inventory value."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "goods_receipts",
        sourceType: "received_goods_missing_stock_movement",
        sourceId: "aggregate",
        sourceHash,
        label: "Goods receipt stock movement proof",
        route: definition.actionRoute,
        metadata: {
          receiptCount: receipts.length,
          missingStockMovementCount,
          sampleReceipts: brokenReceipts.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: receipts.length,
      passed: Math.max(receipts.length - missingStockMovementCount, 0),
      failed: missingStockMovementCount,
    },
    metadata: {
      receiptCount: receipts.length,
      missingStockMovementCount,
      sampleReceipts: brokenReceipts.slice(0, 10),
    },
  })
}

async function runSupplierInvoiceThreeWayMatchCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const invoiceWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    purchaseOrderId: { not: null },
    status: { in: THREE_WAY_READY_SUPPLIER_INVOICE_STATUSES },
  }
  const brokenMatchWhere = {
    ...invoiceWhere,
    OR: [
      { threeWayMatches: { none: { status: { in: ACCEPTED_THREE_WAY_MATCH_STATUSES } } } },
      {
        lines: {
          some: {
            OR: [
              { purchaseOrderLineId: null },
              { goodsReceiptLineId: null },
              { matchStatus: { notIn: ACCEPTED_THREE_WAY_MATCH_STATUSES } },
            ],
          },
        },
      },
    ],
  }
  const [invoiceCount, brokenMatchCount] = await Promise.all([
    db.supplierInvoice.count({ where: invoiceWhere }),
    db.supplierInvoice.count({ where: brokenMatchWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = brokenMatchCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    invoiceCount,
    brokenMatchCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: brokenMatchCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "supplier_invoices",
    sourceId: "supplier_invoices_missing_three_way_match",
    sourceHash,
    message:
      brokenMatchCount > 0
        ? "Supplier invoices tied to purchase orders are missing accepted 3-way match evidence."
        : "Supplier invoices tied to purchase orders retain accepted 3-way match evidence.",
    recommendedAction:
      brokenMatchCount > 0
        ? "Open payables, review the PO, receipt, and supplier invoice links, then resolve match exceptions before relying on AP balances."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "supplier_invoices",
        sourceType: "supplier_invoices_missing_three_way_match",
        sourceId: "aggregate",
        sourceHash,
        label: "Supplier invoice 3-way match proof",
        route: definition.actionRoute,
        metadata: {
          invoiceCount,
          brokenMatchCount,
        },
      },
    ],
    counts: {
      scanned: invoiceCount,
      passed: Math.max(invoiceCount - brokenMatchCount, 0),
      warning: brokenMatchCount,
    },
    metadata: {
      invoiceCount,
      brokenMatchCount,
    },
  })
}

async function runSupplierInvoicePostingProofCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const postedInvoiceWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: POSTED_SUPPLIER_INVOICE_STATUSES },
  }
  const missingPostingProofWhere = {
    ...postedInvoiceWhere,
    OR: [
      { postedAt: null },
      { postedBusinessEventId: null },
      { postedBusinessEventId: "" },
      { ledgerPostingBatchId: null },
      { ledgerPostingBatchId: "" },
      { documentHash: null },
      { documentHash: "" },
      { evidenceHash: null },
      { evidenceHash: "" },
    ],
  }
  const [postedInvoiceCount, missingPostingProofCount] = await Promise.all([
    db.supplierInvoice.count({ where: postedInvoiceWhere }),
    db.supplierInvoice.count({ where: missingPostingProofWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingPostingProofCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    postedInvoiceCount,
    missingPostingProofCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingPostingProofCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "supplier_invoices",
    sourceId: "posted_supplier_invoices_missing_ap_proof",
    sourceHash,
    message:
      missingPostingProofCount > 0
        ? "Posted supplier invoices are missing business-event, ledger, document, or evidence proof."
        : "Posted supplier invoices retain AP posting proof.",
    recommendedAction:
      missingPostingProofCount > 0
        ? "Open payables, review posted supplier invoices, and repair missing AP posting evidence before close assurance or supplier payment release."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "supplier_invoices",
        sourceType: "posted_supplier_invoices_missing_ap_proof",
        sourceId: "aggregate",
        sourceHash,
        label: "Supplier invoice AP posting proof",
        route: definition.actionRoute,
        metadata: {
          postedInvoiceCount,
          missingPostingProofCount,
        },
      },
    ],
    counts: {
      scanned: postedInvoiceCount,
      passed: Math.max(postedInvoiceCount - missingPostingProofCount, 0),
      failed: missingPostingProofCount,
    },
    metadata: {
      postedInvoiceCount,
      missingPostingProofCount,
    },
  })
}

async function runReleasedSupplierPaymentEvidenceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const releasedWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: RELEASED_SUPPLIER_PAYMENT_STATUSES },
  }
  const missingEvidenceWhere = {
    ...releasedWhere,
    OR: [
      { allocations: { none: {} } },
      { bankAccountId: null },
      { bankAccount: { is: { status: { not: SupplierBankAccountStatus.APPROVED } } } },
      { documentHash: null },
      { documentHash: "" },
      { evidenceHash: null },
      { evidenceHash: "" },
      {
        AND: [{ status: SupplierPaymentStatus.POSTED }, { ledgerPostingBatchId: null }],
      },
    ],
  }
  const [releasedPaymentCount, missingEvidenceCount] = await Promise.all([
    db.supplierPayment.count({ where: releasedWhere }),
    db.supplierPayment.count({ where: missingEvidenceWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingEvidenceCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    releasedPaymentCount,
    missingEvidenceCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingEvidenceCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "supplier_payments",
    sourceId: "released_payments_missing_evidence",
    sourceHash,
    message:
      missingEvidenceCount > 0
        ? "Released supplier payments are missing allocation, approved bank, hash, or posting evidence."
        : "Released supplier payments retain required release evidence.",
    recommendedAction:
      missingEvidenceCount > 0
        ? "Open payables, repair supplier payment evidence, and hold further release until destination and invoice proof are complete."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "supplier_payments",
        sourceType: "released_payments_missing_evidence",
        sourceId: "aggregate",
        sourceHash,
        label: "Released supplier payment evidence",
        route: definition.actionRoute,
        metadata: {
          releasedPaymentCount,
          missingEvidenceCount,
        },
      },
    ],
    counts: {
      scanned: releasedPaymentCount,
      passed: Math.max(releasedPaymentCount - missingEvidenceCount, 0),
      failed: missingEvidenceCount,
    },
    metadata: {
      releasedPaymentCount,
      missingEvidenceCount,
    },
  })
}

async function runSupplierBankPendingReleaseCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const releasedPaymentWhere = {
    organizationId: input.organizationId,
    deletedAt: null,
    status: { in: RELEASED_SUPPLIER_PAYMENT_STATUSES },
  }
  const pendingBankChangeReleaseWhere = {
    ...releasedPaymentWhere,
    supplier: {
      is: {
        bankChanges: {
          some: {
            status: SupplierBankChangeStatus.PENDING,
          },
        },
      },
    },
  }
  const [releasedPaymentCount, releasedWithPendingBankChangeCount] = await Promise.all([
    db.supplierPayment.count({ where: releasedPaymentWhere }),
    db.supplierPayment.count({ where: pendingBankChangeReleaseWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = releasedWithPendingBankChangeCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    releasedPaymentCount,
    releasedWithPendingBankChangeCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: releasedWithPendingBankChangeCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "supplier_payments",
    sourceId: "released_payments_pending_bank_change",
    sourceHash,
    message:
      releasedWithPendingBankChangeCount > 0
        ? "Supplier payments were released while supplier bank change requests were still pending."
        : "Released supplier payments are not tied to pending supplier bank changes.",
    recommendedAction:
      releasedWithPendingBankChangeCount > 0
        ? "Open supplier bank controls, approve or reject pending bank changes, and review released payments."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "supplier_bank_change_requests",
        sourceType: "released_payments_pending_bank_change",
        sourceId: "aggregate",
        sourceHash,
        label: "Supplier bank pending release control",
        route: definition.actionRoute,
        metadata: {
          releasedPaymentCount,
          releasedWithPendingBankChangeCount,
        },
      },
    ],
    counts: {
      scanned: releasedPaymentCount,
      passed: Math.max(releasedPaymentCount - releasedWithPendingBankChangeCount, 0),
      failed: releasedWithPendingBankChangeCount,
    },
    metadata: {
      releasedPaymentCount,
      releasedWithPendingBankChangeCount,
    },
  })
}

async function runCompletedAdjustmentEvidenceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const finalAdjustments = await db.stockAdjustment.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      status: { in: COMPLETED_ADJUSTMENT_STATUSES },
    },
    select: {
      id: true,
      adjustmentNumber: true,
      status: true,
      approvedAt: true,
      approvedById: true,
      evidenceHash: true,
      documentHash: true,
      postedBusinessEventId: true,
      ledgerPostingBatchId: true,
    },
    orderBy: { updatedAt: "desc" },
    take: Number(definition.metadata.maxScan ?? 500),
  })
  const brokenAdjustments = []

  for (const adjustment of finalAdjustments) {
    const projectionMovementCount = await db.inventoryTransaction.count({
      where: {
        organizationId: input.organizationId,
        referenceType: TransactionReferenceType.STOCK_ADJUSTMENT,
        referenceId: adjustment.id,
      },
    })
    const missingReasons = [
      !adjustment.approvedAt || !adjustment.approvedById ? "approval" : null,
      !adjustment.evidenceHash ? "evidence_hash" : null,
      !adjustment.documentHash ? "document_hash" : null,
      !adjustment.postedBusinessEventId ? "business_event" : null,
      !adjustment.ledgerPostingBatchId ? "ledger_posting_batch" : null,
      projectionMovementCount === 0 ? "inventory_projection" : null,
    ].filter(Boolean)

    if (missingReasons.length > 0) {
      brokenAdjustments.push({
        id: adjustment.id,
        adjustmentNumber: adjustment.adjustmentNumber,
        status: adjustment.status,
        missingReasons,
      })
    }
  }

  const status: WorkflowAssuranceResultStatus = brokenAdjustments.length > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    scannedAdjustmentCount: finalAdjustments.length,
    brokenAdjustmentIds: brokenAdjustments.map((adjustment) => adjustment.id),
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: brokenAdjustments.length > 0 ? definition.defaultSeverity : "info",
    sourceType: "stock_adjustments",
    sourceId: "completed_adjustments_missing_evidence",
    sourceHash,
    message:
      brokenAdjustments.length > 0
        ? "Completed or approved stock adjustments are missing approval, evidence, posting, or projection movement."
        : "Completed stock adjustments retain approval, evidence, posting, and projection movement.",
    recommendedAction:
      brokenAdjustments.length > 0
        ? "Open inventory movements and repair adjustment evidence before trusting inventory profitability."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "stock_adjustments",
        sourceType: "completed_adjustments_missing_evidence",
        sourceId: "aggregate",
        sourceHash,
        label: "Completed stock adjustment evidence",
        route: definition.actionRoute,
        metadata: {
          scannedAdjustmentCount: finalAdjustments.length,
          brokenAdjustmentCount: brokenAdjustments.length,
          sampleBrokenAdjustments: brokenAdjustments.slice(0, 10),
        },
      },
    ],
    counts: {
      scanned: finalAdjustments.length,
      passed: Math.max(finalAdjustments.length - brokenAdjustments.length, 0),
      warning: brokenAdjustments.length,
    },
    metadata: {
      scannedAdjustmentCount: finalAdjustments.length,
      brokenAdjustmentCount: brokenAdjustments.length,
      sampleBrokenAdjustments: brokenAdjustments.slice(0, 10),
    },
  })
}

async function runReleasedPayrollPaymentEvidenceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const releasedBatchWhere = {
    organizationId: input.organizationId,
    status: { in: RELEASED_PAYROLL_PAYMENT_STATUSES },
  }
  const missingEvidenceWhere = {
    ...releasedBatchWhere,
    OR: [
      { allocations: { none: {} } },
      { bankFileHash: null },
      { bankFileHash: "" },
      { documentHash: null },
      { documentHash: "" },
      { evidenceHash: null },
      { evidenceHash: "" },
      { paymentTransactionId: null },
      {
        payrollRun: {
          is: {
            status: { notIn: PAYROLL_RUN_PAYMENT_READY_STATUSES },
          },
        },
      },
    ],
  }
  const [releasedBatchCount, missingEvidenceCount] = await Promise.all([
    db.payrollPaymentBatch.count({ where: releasedBatchWhere }),
    db.payrollPaymentBatch.count({ where: missingEvidenceWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = missingEvidenceCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    releasedBatchCount,
    missingEvidenceCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: missingEvidenceCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "payroll_payment_batches",
    sourceId: "released_payroll_payments_missing_evidence",
    sourceHash,
    message:
      missingEvidenceCount > 0
        ? "Released payroll payment batches are missing run, payslip, payment, or hash evidence."
        : "Released payroll payment batches retain required evidence.",
    recommendedAction:
      missingEvidenceCount > 0
        ? "Open payroll controls and repair release evidence without exposing person-level payroll details."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "payroll_payment_batches",
        sourceType: "released_payroll_payments_missing_evidence",
        sourceId: "aggregate",
        sourceHash,
        label: "Released payroll payment evidence",
        route: definition.actionRoute,
        metadata: {
          releasedBatchCount,
          missingEvidenceCount,
        },
      },
    ],
    counts: {
      scanned: releasedBatchCount,
      passed: Math.max(releasedBatchCount - missingEvidenceCount, 0),
      failed: missingEvidenceCount,
    },
    metadata: {
      releasedBatchCount,
      missingEvidenceCount,
      redactionPolicy: "kontava-payroll-person-redaction-policy",
    },
  })
}

async function runPayrollPaymentReconciliationExceptionCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const monitoredBatchWhere = {
    organizationId: input.organizationId,
    status: { in: PAYROLL_PAYMENT_RECONCILIATION_MONITORED_STATUSES },
  }
  const exceptionBatchWhere = {
    ...monitoredBatchWhere,
    OR: [
      { status: PayrollPaymentBatchStatus.FAILED },
      { paymentExceptionId: { not: null } },
      { reconciliationStatus: { in: ["FAILED", "EXCEPTION", "UNMATCHED", "REQUIRES_REVIEW"] } },
    ],
  }
  const [monitoredBatchCount, exceptionBatchCount] = await Promise.all([
    db.payrollPaymentBatch.count({ where: monitoredBatchWhere }),
    db.payrollPaymentBatch.count({ where: exceptionBatchWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = exceptionBatchCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    monitoredBatchCount,
    exceptionBatchCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: exceptionBatchCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "payroll_payment_batches",
    sourceId: "payroll_payment_reconciliation_exceptions",
    sourceHash,
    message:
      exceptionBatchCount > 0
        ? "Payroll payment batches have failed, exception, or unreconciled operational states."
        : "Payroll payment batches have no visible reconciliation exception states.",
    recommendedAction:
      exceptionBatchCount > 0
        ? "Open payroll controls, reconcile the aggregate payment exceptions, and keep destination/payment evidence redacted."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "payroll_payment_batches",
        sourceType: "payroll_payment_reconciliation_exceptions",
        sourceId: "aggregate",
        sourceHash,
        label: "Payroll payment reconciliation exceptions",
        route: definition.actionRoute,
        metadata: {
          monitoredBatchCount,
          exceptionBatchCount,
        },
      },
    ],
    counts: {
      scanned: monitoredBatchCount,
      passed: Math.max(monitoredBatchCount - exceptionBatchCount, 0),
      warning: exceptionBatchCount,
    },
    metadata: {
      monitoredBatchCount,
      exceptionBatchCount,
      redactionPolicy: "kontava-payroll-person-redaction-policy",
    },
  })
}

async function runPayrollDeclarationLifecycleExceptionCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const now = new Date()
  const monitoredDeclarationWhere = {
    organizationId: input.organizationId,
    status: { in: PAYROLL_DECLARATION_MONITORED_STATUSES },
  }
  const exceptionDeclarationWhere = {
    organizationId: input.organizationId,
    OR: [
      { status: PayrollDeclarationStatus.REJECTED },
      {
        dueDate: { lt: now },
        status: { notIn: PAYROLL_DECLARATION_CLOSED_STATUSES },
      },
    ],
  }
  const [monitoredDeclarationCount, exceptionDeclarationCount] = await Promise.all([
    db.payrollDeclaration.count({ where: monitoredDeclarationWhere }),
    db.payrollDeclaration.count({ where: exceptionDeclarationWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = exceptionDeclarationCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    monitoredDeclarationCount,
    exceptionDeclarationCount,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: exceptionDeclarationCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "payroll_declarations",
    sourceId: "payroll_declaration_lifecycle_exceptions",
    sourceHash,
    message:
      exceptionDeclarationCount > 0
        ? "Payroll declarations are rejected, overdue, or waiting for manual authority evidence."
        : "Payroll declarations have no rejected or overdue operational states.",
    recommendedAction:
      exceptionDeclarationCount > 0
        ? "Open payroll controls, attach authority evidence, and do not automate statutory submission without reviewed mappings."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "payroll_declarations",
        sourceType: "payroll_declaration_lifecycle_exceptions",
        sourceId: "aggregate",
        sourceHash,
        label: "Payroll declaration lifecycle exceptions",
        route: definition.actionRoute,
        metadata: {
          monitoredDeclarationCount,
          exceptionDeclarationCount,
        },
      },
    ],
    counts: {
      scanned: monitoredDeclarationCount,
      passed: Math.max(monitoredDeclarationCount - exceptionDeclarationCount, 0),
      warning: exceptionDeclarationCount,
    },
    metadata: {
      monitoredDeclarationCount,
      exceptionDeclarationCount,
      manualAuthorityEvidenceOnly: true,
      redactionPolicy: "kontava-payroll-person-redaction-policy",
    },
  })
}

async function runPayrollCloseEvidenceStaleCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const certifiedPackWhere = {
    organizationId: input.organizationId,
    isCertified: true,
    ...(input.periodId ? { periodId: input.periodId } : {}),
  }
  const stalePayrollPackWhere = {
    ...certifiedPackWhere,
    closeRun: {
      is: {
        status: { in: [CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED] },
        findings: {
          some: {
            domain: CloseFindingDomain.PAYROLL,
            status: { in: ACTIVE_CLOSE_FINDING_STATUSES },
            severity: { in: SERIOUS_CLOSE_FINDING_SEVERITIES },
          },
        },
      },
    },
  }
  const [certifiedPackCount, stalePayrollPackCount] = await Promise.all([
    db.closePackExport.count({ where: certifiedPackWhere }),
    db.closePackExport.count({ where: stalePayrollPackWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = stalePayrollPackCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    certifiedPackCount,
    stalePayrollPackCount,
    periodId: input.periodId ?? null,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: stalePayrollPackCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "close_pack_exports",
    sourceId: "payroll_stale_close_evidence",
    sourceHash,
    message:
      stalePayrollPackCount > 0
        ? "Certified close packs coexist with unresolved high or critical payroll findings."
        : "Certified close packs have no unresolved high or critical payroll findings.",
    recommendedAction:
      stalePayrollPackCount > 0
        ? "Open the close center, resolve payroll findings, and recertify the close pack before relying on payroll close evidence."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "close_pack_exports",
        sourceType: "payroll_stale_close_evidence",
        sourceId: input.periodId ?? "aggregate",
        sourceHash,
        label: "Payroll close evidence freshness",
        route: definition.actionRoute,
        metadata: {
          certifiedPackCount,
          stalePayrollPackCount,
          periodId: input.periodId ?? null,
        },
      },
    ],
    counts: {
      scanned: certifiedPackCount,
      passed: Math.max(certifiedPackCount - stalePayrollPackCount, 0),
      failed: stalePayrollPackCount,
    },
    metadata: {
      certifiedPackCount,
      stalePayrollPackCount,
      periodId: input.periodId ?? null,
      redactionPolicy: "kontava-payroll-person-redaction-policy",
    },
  })
}
async function runComplianceSubmissionSlaCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 30)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const [activeSubmissionCount, staleActiveSubmissionCount, visibleFailureCount] = await Promise.all([
    db.complianceSubmission.count({
      where: {
        organizationId: input.organizationId,
        status: { in: OPEN_COMPLIANCE_SUBMISSION_STATUSES },
      },
    }),
    db.complianceSubmission.count({
      where: {
        organizationId: input.organizationId,
        OR: [
          {
            status: { in: [ComplianceSubmissionStatus.PENDING, ComplianceSubmissionStatus.RETRY_SCHEDULED] },
            nextAttemptAt: { lt: cutoff },
          },
          {
            status: ComplianceSubmissionStatus.LEASED,
            leasedUntil: { lt: new Date() },
          },
          {
            status: ComplianceSubmissionStatus.SUBMITTED,
            submittedAt: { lt: cutoff },
          },
        ],
      },
    }),
    db.complianceSubmission.count({
      where: {
        organizationId: input.organizationId,
        status: { in: VISIBLE_COMPLIANCE_FAILURE_STATUSES },
      },
    }),
  ])
  const problemCount = staleActiveSubmissionCount + visibleFailureCount
  const status: WorkflowAssuranceResultStatus = problemCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    activeSubmissionCount,
    staleActiveSubmissionCount,
    visibleFailureCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: problemCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "compliance_submissions",
    sourceId: "submission_sla_aggregate",
    sourceHash,
    message:
      problemCount > 0
        ? "Compliance submissions are stale, failed, or dead-lettered and need attention."
        : "Compliance submissions are certified, retrying inside SLA, or visibly resolved.",
    recommendedAction:
      problemCount > 0
        ? "Open compliance center and retry, certify, or explain stale fiscal submissions."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "compliance_submissions",
        sourceType: "submission_sla_aggregate",
        sourceId: "aggregate",
        sourceHash,
        label: "Compliance submission SLA",
        route: definition.actionRoute,
        metadata: {
          activeSubmissionCount,
          staleActiveSubmissionCount,
          visibleFailureCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: activeSubmissionCount + visibleFailureCount,
      passed: Math.max(activeSubmissionCount - staleActiveSubmissionCount, 0),
      warning: problemCount,
    },
    metadata: {
      activeSubmissionCount,
      staleActiveSubmissionCount,
      visibleFailureCount,
      staleAfterMinutes,
    },
  })
}

async function runCertifiedClosePackEvidenceCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const certifiedPackWhere = {
    organizationId: input.organizationId,
    isCertified: true,
    ...(input.periodId ? { periodId: input.periodId } : {}),
  }
  const staleCertifiedPackWhere = {
    ...certifiedPackWhere,
    closeRun: {
      is: {
        status: { in: [CloseRunStatus.CERTIFIED, CloseRunStatus.EXPORTED] },
        findings: {
          some: {
            status: { in: ACTIVE_CLOSE_FINDING_STATUSES },
            severity: { in: SERIOUS_CLOSE_FINDING_SEVERITIES },
          },
        },
      },
    },
  }
  const [certifiedPackCount, staleCertifiedPackCount] = await Promise.all([
    db.closePackExport.count({ where: certifiedPackWhere }),
    db.closePackExport.count({ where: staleCertifiedPackWhere }),
  ])
  const status: WorkflowAssuranceResultStatus = staleCertifiedPackCount > 0 ? "failed" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    certifiedPackCount,
    staleCertifiedPackCount,
    periodId: input.periodId ?? null,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: staleCertifiedPackCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "close_pack_exports",
    sourceId: "certified_packs_with_open_findings",
    sourceHash,
    message:
      staleCertifiedPackCount > 0
        ? "Certified close packs coexist with unresolved high or critical close findings."
        : "Certified close packs do not have unresolved high or critical findings.",
    recommendedAction:
      staleCertifiedPackCount > 0
        ? "Open close center, reopen or downgrade the certified pack, and resolve the close findings."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "close_pack_exports",
        sourceType: "certified_packs_with_open_findings",
        sourceId: input.periodId ?? "aggregate",
        sourceHash,
        label: "Certified close pack evidence freshness",
        route: definition.actionRoute,
        metadata: {
          certifiedPackCount,
          staleCertifiedPackCount,
          periodId: input.periodId ?? null,
        },
      },
    ],
    counts: {
      scanned: certifiedPackCount,
      passed: Math.max(certifiedPackCount - staleCertifiedPackCount, 0),
      failed: staleCertifiedPackCount,
    },
    metadata: {
      certifiedPackCount,
      staleCertifiedPackCount,
      periodId: input.periodId ?? null,
    },
  })
}

async function runBusinessEventVisibilityCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 15)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const [totalEventCount, staleRecordedCount, failedVisibleCount] = await Promise.all([
    db.businessEvent.count({ where: { organizationId: input.organizationId } }),
    db.businessEvent.count({
      where: {
        organizationId: input.organizationId,
        status: "RECORDED",
        recordedAt: { lt: cutoff },
      },
    }),
    db.businessEvent.count({
      where: {
        organizationId: input.organizationId,
        status: "FAILED",
      },
    }),
  ])
  const status: WorkflowAssuranceResultStatus = staleRecordedCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    totalEventCount,
    staleRecordedCount,
    failedVisibleCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: staleRecordedCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "business_events",
    sourceId: "event_status_aggregate",
    sourceHash,
    message:
      staleRecordedCount > 0
        ? "Some business events remain recorded beyond the processing SLA."
        : "Business events are applied, failed visibly, or still within the processing SLA.",
    recommendedAction:
      staleRecordedCount > 0
        ? "Inspect the business-event processor and replay or explain stale recorded events."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "business_events",
        sourceType: "event_status_aggregate",
        sourceId: "aggregate",
        sourceHash,
        label: "Business event status aggregate",
        route: definition.actionRoute,
        metadata: {
          totalEventCount,
          staleRecordedCount,
          failedVisibleCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: totalEventCount,
      passed: Math.max(totalEventCount - staleRecordedCount, 0),
      warning: staleRecordedCount,
    },
    metadata: {
      totalEventCount,
      staleRecordedCount,
      failedVisibleCount,
      staleAfterMinutes,
    },
  })
}

async function runOutboxStuckSlaCheck(
  definition: WorkflowAssuranceCheckDefinitionContract,
  input: WorkflowAssuranceRunInput,
) {
  const staleAfterMinutes = Number(definition.metadata.staleAfterMinutes ?? 15)
  const cutoff = new Date(Date.now() - staleAfterMinutes * 60 * 1000)
  const [totalOutboxCount, stuckCount, deadLetterCount] = await Promise.all([
    db.businessEventOutbox.count({ where: { organizationId: input.organizationId } }),
    db.businessEventOutbox.count({
      where: {
        organizationId: input.organizationId,
        status: { in: ["PENDING", "LOCKED"] },
        availableAt: { lt: cutoff },
      },
    }),
    db.businessEventOutbox.count({
      where: {
        organizationId: input.organizationId,
        status: "DEAD_LETTER",
      },
    }),
  ])
  const problemCount = stuckCount + deadLetterCount
  const status: WorkflowAssuranceResultStatus = problemCount > 0 ? "warning" : "passed"
  const sourceHash = createAssuranceSourceHash({
    checkKey: definition.checkKey,
    totalOutboxCount,
    stuckCount,
    deadLetterCount,
    staleAfterMinutes,
  })

  return normalizeAssuranceResult({
    organizationId: input.organizationId,
    checkKey: definition.checkKey,
    status,
    severity: problemCount > 0 ? definition.defaultSeverity : "info",
    sourceType: "business_event_outbox",
    sourceId: "outbox_sla_aggregate",
    sourceHash,
    message:
      problemCount > 0
        ? "Outbox messages are stuck, locked past SLA, or dead-lettered."
        : "Outbox messages are inside their retry SLA.",
    recommendedAction:
      problemCount > 0
        ? "Review the outbox worker, unlock stale leases, and reconcile dead-letter messages."
        : undefined,
    evidenceLinks: [
      {
        sourceTable: "business_event_outbox",
        sourceType: "outbox_sla_aggregate",
        sourceId: "aggregate",
        sourceHash,
        label: "Business event outbox SLA aggregate",
        route: definition.actionRoute,
        metadata: {
          totalOutboxCount,
          stuckCount,
          deadLetterCount,
          staleAfterMinutes,
        },
      },
    ],
    counts: {
      scanned: totalOutboxCount,
      passed: Math.max(totalOutboxCount - problemCount, 0),
      warning: problemCount,
    },
    metadata: {
      totalOutboxCount,
      stuckCount,
      deadLetterCount,
      staleAfterMinutes,
    },
  })
}

function canRunDefinition(
  definition: WorkflowAssuranceCheckDefinitionContract,
  actorPermissions: string[] | undefined,
) {
  if (!actorPermissions?.length) return true
  return hasRbacPermission(actorPermissions, definition.requiredPermission)
}

function runStatusForResult(status: WorkflowAssuranceResultStatus): WorkflowAssuranceRunStatus {
  if (status === "error") return "failed"
  if (status === "passed" || status === "skipped") return "completed"
  return "completed_with_warnings"
}

function summarizeRuns(runs: WorkflowAssuranceCheckRunSummary[]) {
  const summary = {
    total: runs.length,
    passed: 0,
    warning: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    error: 0,
    observeMode: runs.every((run) => run.observeMode),
  }

  for (const run of runs) {
    summary[run.resultStatus] += 1
  }

  return summary
}

function sumDecimalValues(values: Prisma.Decimal.Value[]): Prisma.Decimal {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(new Prisma.Decimal(value)), new Prisma.Decimal(0))
}

function reconciliationCertificateHash(value: unknown) {
  return createHash("sha256").update(stableCertificateStringify(value)).digest("hex")
}

function stableCertificateStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(stableCertificateStringify).join(",")}]`

  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableCertificateStringify((value as Record<string, unknown>)[key])}`)
    .join(",")}}`
}

function toPrismaDefinitionWrite(definition: WorkflowAssuranceCheckDefinitionContract) {
  return {
    checkKey: definition.checkKey,
    version: definition.version,
    workflow: WORKFLOW_TO_PRISMA[definition.workflow],
    moduleSlug: definition.moduleSlug,
    invariantName: definition.invariantName,
    executionMode: EXECUTION_MODE_TO_PRISMA[definition.executionMode],
    defaultSeverity: SEVERITY_TO_PRISMA[definition.defaultSeverity],
    requiredPermission: definition.requiredPermission,
    ownerRole: definition.ownerRole,
    enabled: definition.enabled,
    enforceMode: definition.enforceMode,
    sourceTables: definition.sourceTables as Prisma.InputJsonValue,
    actionRoute: definition.actionRoute,
    metadata: definition.metadata as Prisma.InputJsonValue,
  }
}

function toDefinitionContract(record: WorkflowAssuranceCheckDefinition): WorkflowAssuranceCheckDefinitionContract {
  return {
    checkKey: record.checkKey,
    version: record.version,
    workflow: PRISMA_TO_WORKFLOW[record.workflow],
    moduleSlug: record.moduleSlug,
    invariantName: record.invariantName,
    executionMode: PRISMA_TO_EXECUTION_MODE[record.executionMode],
    defaultSeverity: PRISMA_TO_SEVERITY[record.defaultSeverity],
    requiredPermission: record.requiredPermission,
    ownerRole: record.ownerRole,
    enabled: record.enabled,
    enforceMode: record.enforceMode,
    sourceTables: Array.isArray(record.sourceTables) ? (record.sourceTables as string[]) : [],
    actionRoute: record.actionRoute,
    metadata:
      record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? (record.metadata as Record<string, unknown>)
        : {},
  }
}

function invertMap<T extends Record<string, string>>(value: T) {
  return Object.fromEntries(Object.entries(value).map(([key, mapped]) => [mapped, key])) as {
    [Value in T[keyof T]]: Extract<keyof T, string>
  }
}
