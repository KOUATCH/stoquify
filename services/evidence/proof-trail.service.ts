import {
  BusinessEventStatus,
  CloseChecklistStatus,
  CloseFindingStatus,
  CloseRunStatus,
  JournalEntryStatus,
  LedgerPostingBatchStatus,
  PaymentExceptionStatus,
  Prisma,
  ReconciliationRunStatus,
  SuspenseStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { NotFoundError } from "@/services/_shared/action-errors"

import { createProofTrailBlocker } from "./evidence-blockers.service"
import type {
  EvidenceGrade,
  ProofTrailBlocker,
  ProofTrailEdge,
  ProofTrailInput,
  ProofTrailNextAction,
  ProofTrailNode,
  ProofTrailRedaction,
  ProofTrailResult,
} from "./evidence-contracts"
import {
  computeCloseRunEvidenceGrade,
  computeJournalEntryEvidenceGrade,
  computeReconciliationRunEvidenceGrade,
} from "./evidence-grade.service"
import { applyProofTrailRedactions, createProofTrailRedaction } from "./evidence-redaction.service"

type DbClient = typeof db | Prisma.TransactionClient

const OPEN_PAYMENT_EXCEPTION_STATUSES: readonly PaymentExceptionStatus[] = [
  PaymentExceptionStatus.OPEN,
  PaymentExceptionStatus.ASSIGNED,
  PaymentExceptionStatus.ACKNOWLEDGED,
  PaymentExceptionStatus.ESCALATED,
  PaymentExceptionStatus.RESOLUTION_PROPOSED,
  PaymentExceptionStatus.REOPENED,
]

const OPEN_SUSPENSE_STATUSES: readonly SuspenseStatus[] = [
  SuspenseStatus.OPEN,
  SuspenseStatus.ASSIGNED,
  SuspenseStatus.IN_REVIEW,
  SuspenseStatus.POSTED_TO_SUSPENSE,
  SuspenseStatus.RESOLUTION_PROPOSED,
  SuspenseStatus.REOPENED,
]

const OPEN_CLOSE_FINDING_STATUSES: readonly CloseFindingStatus[] = [
  CloseFindingStatus.OPEN,
  CloseFindingStatus.ASSIGNED,
  CloseFindingStatus.IN_REVIEW,
  CloseFindingStatus.REOPENED,
]

function node(input: ProofTrailNode): ProofTrailNode {
  return input
}

function edge(input: ProofTrailEdge): ProofTrailEdge {
  return input
}

function nextAction(input: ProofTrailNextAction): ProofTrailNextAction {
  return input
}

function freshnessFor(blockers: ProofTrailBlocker[], availableNodes: ProofTrailNode[]) {
  if (blockers.some((blocker) => blocker.severity === "critical" || blocker.severity === "high")) {
    return "blocked" as const
  }
  if (availableNodes.some((entry) => !entry.available)) return "partial" as const
  return "fresh" as const
}

function sourceModules(nodes: ProofTrailNode[]) {
  return Array.from(new Set(nodes.map((entry) => entry.moduleSlug))).sort()
}

function money(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) return "0.00"
  return new Prisma.Decimal(value).toDecimalPlaces(2).toFixed(2)
}

function failedEventBlockers(events: Array<{ id: string; status: BusinessEventStatus; failureMessage: string | null }>) {
  return events
    .filter((event) => event.status === BusinessEventStatus.FAILED || event.status === BusinessEventStatus.REJECTED)
    .map((event) =>
      createProofTrailBlocker({
        id: `business-event-${event.id}`,
        severity: "high",
        gate: "events.business-event",
        title: "Business event failed",
        detail: event.failureMessage || `Business event ${event.id} did not apply successfully.`,
        sourceTables: ["business_events"],
        nextAction: "Review the failed business event before trusting this record.",
      }),
    )
}

async function auditSensitiveAccess(
  client: DbClient,
  result: ProofTrailResult,
  actorId?: string | null,
) {
  if (!actorId || !result.audit.sensitiveAccess) return result

  await client.auditLog.create({
    data: {
      entityType: "EvidenceProofTrail",
      entityId: `${result.subjectType}:${result.subjectId}`,
      action: "EVIDENCE_PROOF_TRAIL_VIEWED",
      userId: actorId,
      organizationId: result.organizationId,
      changes: {
        evidenceGrade: result.evidenceGrade,
        subjectType: result.subjectType,
        sourceModules: result.sourceModules,
        redactionCount: result.redactions.length,
      },
    },
  })

  return {
    ...result,
    audit: {
      ...result.audit,
      accessLogged: true,
    },
  }
}

async function buildJournalEntryProofTrail(input: ProofTrailInput, client: DbClient) {
  const entry = await client.journalEntry.findFirst({
    where: { id: input.subjectId, organizationId: input.organizationId },
    include: {
      journal: { select: { id: true, code: true, nameEn: true, nameFr: true } },
      period: { select: { id: true, name: true, status: true } },
      postingBatch: {
        select: {
          id: true,
          sourceType: true,
          sourceId: true,
          postingPurpose: true,
          status: true,
          errorMessage: true,
          postedAt: true,
        },
      },
      sourceLinks: {
        include: {
          postingBatch: {
            select: {
              id: true,
              status: true,
              sourceType: true,
              sourceId: true,
              postingPurpose: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      auditEvents: {
        select: {
          id: true,
          action: true,
          resourceType: true,
          resourceId: true,
          message: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!entry) throw new NotFoundError("Journal entry proof subject not found")

  const events = entry.sourceType && entry.sourceId
    ? await client.businessEvent.findMany({
        where: {
          organizationId: input.organizationId,
          sourceType: entry.sourceType,
          sourceId: entry.sourceId,
        },
        select: { id: true, status: true, eventType: true, failureMessage: true },
        orderBy: { recordedAt: "desc" },
        take: 10,
      })
    : []

  const blockers: ProofTrailBlocker[] = [...failedEventBlockers(events)]

  if (entry.status === JournalEntryStatus.VOIDED) {
    blockers.push(
      createProofTrailBlocker({
        id: "journal-entry-voided",
        severity: "critical",
        gate: "accounting.journal.status",
        title: "Journal entry is voided",
        detail: "Voided journal entries cannot be used as trusted accounting proof.",
        sourceTables: ["journal_entries"],
      }),
    )
  }

  if (
    (entry.status === JournalEntryStatus.POSTED || entry.status === JournalEntryStatus.REVERSED) &&
    entry.sourceLinks.length === 0
  ) {
    blockers.push(
      createProofTrailBlocker({
        id: "journal-entry-source-link-missing",
        severity: "high",
        gate: "accounting.source-link",
        title: "Accounting source link is missing",
        detail: "Posted journal entries need source-link evidence before they can support cross-module proof.",
        sourceTables: ["accounting_source_links", "journal_entries"],
        nextAction: "Attach or backfill the accounting source link for this journal entry.",
      }),
    )
  }

  if (entry.postingBatch?.status === LedgerPostingBatchStatus.FAILED) {
    blockers.push(
      createProofTrailBlocker({
        id: "journal-entry-posting-batch-failed",
        severity: "critical",
        gate: "accounting.posting-batch",
        title: "Posting batch failed",
        detail: entry.postingBatch.errorMessage || "The linked ledger posting batch failed.",
        sourceTables: ["ledger_posting_batches"],
      }),
    )
  }

  const decision = computeJournalEntryEvidenceGrade({
    status: entry.status,
    postingBatchStatus: entry.postingBatch?.status,
    sourceLinkCount: entry.sourceLinks.length,
    blockers,
  })

  const subjectNodeId = "journal-entry"
  const nodes: ProofTrailNode[] = [
    node({
      id: subjectNodeId,
      nodeType: "journal.entry",
      nodeId: entry.id,
      label: `Journal entry ${entry.entryNumber}`,
      moduleSlug: "accounting",
      evidenceGrade: decision.grade,
      sourceTable: "journal_entries",
      available: true,
      redacted: false,
      metadata: {
        status: entry.status,
        journal: entry.journal.code,
        period: entry.period.name,
        entryDate: entry.entryDate.toISOString(),
      },
    }),
  ]
  const edges: ProofTrailEdge[] = []

  if (entry.postingBatch) {
    nodes.push(
      node({
        id: "posting-batch",
        nodeType: "ledger.posting.batch",
        nodeId: entry.postingBatch.id,
        label: `Posting batch ${entry.postingBatch.postingPurpose}`,
        moduleSlug: "accounting",
        evidenceGrade: entry.postingBatch.status === LedgerPostingBatchStatus.POSTED ? "posted" : "raw",
        sourceTable: "ledger_posting_batches",
        available: entry.postingBatch.status !== LedgerPostingBatchStatus.FAILED,
        redacted: false,
        metadata: {
          status: entry.postingBatch.status,
          sourceType: entry.postingBatch.sourceType,
          postedAt: entry.postingBatch.postedAt?.toISOString() ?? null,
        },
      }),
    )
    edges.push(edge({
      fromNodeId: "posting-batch",
      toNodeId: subjectNodeId,
      edgeType: "posts_to",
      label: "Posts journal entry",
      evidenceGrade: entry.postingBatch.status === LedgerPostingBatchStatus.POSTED ? "posted" : "raw",
    }))
  }

  entry.sourceLinks.forEach((link, index) => {
    const linkNodeId = `source-link-${index + 1}`
    nodes.push(
      node({
        id: linkNodeId,
        nodeType: "accounting.source_link",
        nodeId: link.id,
        label: link.sourceNumber || `${link.sourceType}/${link.sourceId}`,
        moduleSlug: "accounting",
        evidenceGrade: link.postingBatch.status === LedgerPostingBatchStatus.POSTED ? "posted" : "operational",
        sourceTable: "accounting_source_links",
        available: true,
        redacted: false,
        metadata: {
          sourceType: link.sourceType,
          sourceDate: link.sourceDate?.toISOString() ?? null,
        },
      }),
    )
    edges.push(edge({
      fromNodeId: linkNodeId,
      toNodeId: subjectNodeId,
      edgeType: "source",
      label: "Explains source",
      evidenceGrade: link.postingBatch.status === LedgerPostingBatchStatus.POSTED ? "posted" : "operational",
    }))
  })

  events.forEach((event, index) => {
    const eventNodeId = `business-event-${index + 1}`
    const eventGrade: EvidenceGrade =
      event.status === BusinessEventStatus.FAILED || event.status === BusinessEventStatus.REJECTED
        ? "blocked"
        : "operational"
    nodes.push(node({
      id: eventNodeId,
      nodeType: "business.event",
      nodeId: event.id,
      label: event.eventType,
      moduleSlug: "controls",
      evidenceGrade: eventGrade,
      sourceTable: "business_events",
      available: eventGrade !== "blocked",
      redacted: false,
      metadata: { status: event.status },
    }))
    edges.push(edge({
      fromNodeId: eventNodeId,
      toNodeId: subjectNodeId,
      edgeType: eventGrade === "blocked" ? "blocks" : "source",
      label: eventGrade === "blocked" ? "Blocks trust" : "Supports operational event",
      evidenceGrade: eventGrade,
    }))
  })

  entry.auditEvents.forEach((auditEvent, index) => {
    const auditNodeId = `ledger-audit-${index + 1}`
    nodes.push(node({
      id: auditNodeId,
      nodeType: "ledger.audit_event",
      nodeId: auditEvent.id,
      label: auditEvent.message || auditEvent.action,
      moduleSlug: "controls",
      evidenceGrade: "operational",
      sourceTable: "ledger_audit_events",
      available: true,
      redacted: false,
      metadata: {
        action: auditEvent.action,
        resourceType: auditEvent.resourceType,
        resourceId: auditEvent.resourceId,
        createdAt: auditEvent.createdAt.toISOString(),
      },
    }))
    edges.push(edge({
      fromNodeId: auditNodeId,
      toNodeId: subjectNodeId,
      edgeType: "audits",
      label: "Records control event",
      evidenceGrade: "operational",
    }))
  })

  return finalizeProofTrail({
    input,
    moduleSlug: "accounting",
    decision,
    nodes,
    edges,
    blockers,
    redactions: [],
    nextActions: blockers.length
      ? [nextAction({
          id: "review-journal-entry-proof",
          label: "Review journal entry proof blockers",
          href: `/dashboard/accounting/journals`,
          requiredPermission: "accounting.journal.read",
        })]
      : [],
  }, client)
}

async function buildReconciliationRunProofTrail(input: ProofTrailInput, client: DbClient) {
  const run = await client.reconciliationRun.findFirst({
    where: { id: input.subjectId, organizationId: input.organizationId },
    include: {
      providerAccount: { select: { id: true, displayName: true, providerCode: true, status: true } },
      paymentRail: { select: { id: true, code: true, name: true } },
      matchRecords: {
        select: { id: true, status: true, confidence: true, amountMatched: true, currencyCode: true, ledgerPostingBatchId: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      suspenseItems: {
        select: { id: true, status: true, severity: true, amount: true, currencyCode: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      paymentExceptions: {
        select: { id: true, status: true, severity: true, type: true, resolutionNotes: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  })

  if (!run) throw new NotFoundError("Reconciliation proof subject not found")

  const blockers: ProofTrailBlocker[] = []
  const openExceptions = run.paymentExceptions.filter((entry) => OPEN_PAYMENT_EXCEPTION_STATUSES.includes(entry.status))
  const openSuspense = run.suspenseItems.filter((entry) => OPEN_SUSPENSE_STATUSES.includes(entry.status))

  if (run.status === ReconciliationRunStatus.FAILED || run.status === ReconciliationRunStatus.VOIDED) {
    blockers.push(createProofTrailBlocker({
      id: "reconciliation-run-failed-or-voided",
      severity: "critical",
      gate: "payments.reconciliation.status",
      title: "Reconciliation run is failed or voided",
      detail: `Run status is ${run.status}.`,
      sourceTables: ["reconciliation_runs"],
    }))
  }

  if (openExceptions.length > 0) {
    blockers.push(createProofTrailBlocker({
      id: "reconciliation-open-exceptions",
      severity: openExceptions.some((entry) => entry.severity === "CRITICAL" || entry.severity === "HIGH") ? "high" : "medium",
      gate: "payments.reconciliation.exceptions",
      title: "Open payment exceptions remain",
      detail: `${openExceptions.length} payment exception remains open or in review.`,
      sourceTables: ["payment_exceptions"],
      nextAction: "Resolve payment exceptions before relying on this reconciliation.",
    }))
  }

  if (openSuspense.length > 0) {
    blockers.push(createProofTrailBlocker({
      id: "reconciliation-open-suspense",
      severity: openSuspense.some((entry) => entry.severity === "CRITICAL" || entry.severity === "HIGH") ? "high" : "medium",
      gate: "payments.reconciliation.suspense",
      title: "Open suspense remains",
      detail: `${openSuspense.length} suspense item remains open or unresolved.`,
      sourceTables: ["suspense_items"],
      nextAction: "Resolve or post suspense before sign-off.",
    }))
  }

  if (run.status === ReconciliationRunStatus.SIGNED && !run.signedAt) {
    blockers.push(createProofTrailBlocker({
      id: "reconciliation-signed-at-missing",
      severity: "medium",
      gate: "payments.reconciliation.signoff",
      title: "Signed reconciliation timestamp is missing",
      detail: "The run is signed but does not carry signed-at evidence.",
      sourceTables: ["reconciliation_runs"],
    }))
  }

  const decision = computeReconciliationRunEvidenceGrade({
    status: run.status,
    certificateHash: run.certificateHash,
    blockers,
  })

  const subjectNodeId = "reconciliation-run"
  const redactions: ProofTrailRedaction[] = [
    createProofTrailRedaction({
      id: "provider-account-internal-id",
      field: "nodes.provider-account",
      reason: "Provider account internals are masked in the proof trail by default.",
    }),
  ]
  const nodes: ProofTrailNode[] = [
    node({
      id: subjectNodeId,
      nodeType: "reconciliation.run",
      nodeId: run.id,
      label: `Reconciliation ${run.businessDate.toISOString().slice(0, 10)}`,
      moduleSlug: "reconciliation",
      evidenceGrade: decision.grade,
      sourceTable: "reconciliation_runs",
      available: true,
      redacted: false,
      metadata: {
        status: run.status,
        matchCount: run.matchCount,
        exceptionCount: run.exceptionCount,
        suspenseAmount: money(run.suspenseAmount),
        signedAt: run.signedAt?.toISOString() ?? null,
        certificateAvailable: Boolean(run.certificateHash),
      },
    }),
    node({
      id: "provider-account",
      nodeType: "payment.provider_account",
      nodeId: run.providerAccount.id,
      label: `${run.providerAccount.providerCode} account`,
      moduleSlug: "payments",
      evidenceGrade: "operational",
      sourceTable: "provider_accounts",
      available: true,
      redacted: true,
      metadata: { status: run.providerAccount.status },
    }),
  ]
  const edges: ProofTrailEdge[] = [
    edge({
      fromNodeId: "provider-account",
      toNodeId: subjectNodeId,
      edgeType: "source",
      label: "Provides settlement evidence",
      evidenceGrade: "operational",
    }),
  ]

  run.matchRecords.forEach((matchRecord, index) => {
    const matchNodeId = `match-${index + 1}`
    const grade: EvidenceGrade =
      matchRecord.status === "APPROVED" || matchRecord.status === "AUTO_MATCHED" ? "reconciled" : "operational"
    nodes.push(node({
      id: matchNodeId,
      nodeType: "reconciliation.match",
      nodeId: matchRecord.id,
      label: `Match ${matchRecord.status}`,
      moduleSlug: "reconciliation",
      evidenceGrade: grade,
      sourceTable: "match_records",
      available: matchRecord.status !== "REJECTED" && matchRecord.status !== "VOIDED",
      redacted: false,
      metadata: {
        confidence: matchRecord.confidence.toString(),
        amountMatched: money(matchRecord.amountMatched),
        currencyCode: matchRecord.currencyCode,
        ledgerPostingBatchId: matchRecord.ledgerPostingBatchId,
      },
    }))
    edges.push(edge({
      fromNodeId: matchNodeId,
      toNodeId: subjectNodeId,
      edgeType: "matches",
      label: "Supports reconciliation result",
      evidenceGrade: grade,
    }))
  })

  run.suspenseItems.forEach((suspenseItem, index) => {
    const suspenseNodeId = `suspense-${index + 1}`
    const blocked = OPEN_SUSPENSE_STATUSES.includes(suspenseItem.status)
    nodes.push(node({
      id: suspenseNodeId,
      nodeType: "reconciliation.suspense",
      nodeId: suspenseItem.id,
      label: blocked ? "Open suspense item" : `Suspense ${suspenseItem.status}`,
      moduleSlug: "reconciliation",
      evidenceGrade: blocked ? "blocked" : "reconciled",
      sourceTable: "suspense_items",
      available: !blocked,
      redacted: false,
      metadata: {
        status: suspenseItem.status,
        severity: suspenseItem.severity,
        amount: money(suspenseItem.amount),
        currencyCode: suspenseItem.currencyCode,
      },
    }))
    edges.push(edge({
      fromNodeId: suspenseNodeId,
      toNodeId: subjectNodeId,
      edgeType: blocked ? "blocks" : "matches",
      label: blocked ? "Blocks reconciliation trust" : "Resolved suspense",
      evidenceGrade: blocked ? "blocked" : "reconciled",
    }))
  })

  run.paymentExceptions.forEach((paymentException, index) => {
    const exceptionNodeId = `exception-${index + 1}`
    const blocked = OPEN_PAYMENT_EXCEPTION_STATUSES.includes(paymentException.status)
    nodes.push(node({
      id: exceptionNodeId,
      nodeType: "payment.exception",
      nodeId: paymentException.id,
      label: blocked ? "Open payment exception" : `Payment exception ${paymentException.status}`,
      moduleSlug: "payments",
      evidenceGrade: blocked ? "blocked" : "reconciled",
      sourceTable: "payment_exceptions",
      available: !blocked,
      redacted: false,
      metadata: {
        status: paymentException.status,
        severity: paymentException.severity,
        type: paymentException.type,
      },
    }))
    edges.push(edge({
      fromNodeId: exceptionNodeId,
      toNodeId: subjectNodeId,
      edgeType: blocked ? "blocks" : "matches",
      label: blocked ? "Blocks reconciliation trust" : "Resolved exception",
      evidenceGrade: blocked ? "blocked" : "reconciled",
    }))
  })

  return finalizeProofTrail({
    input,
    moduleSlug: "reconciliation",
    decision,
    nodes,
    edges,
    blockers,
    redactions,
    nextActions: blockers.length
      ? [nextAction({
          id: "review-reconciliation-workbench",
          label: "Review reconciliation exceptions and suspense",
          href: "/dashboard/finance/reconciliation",
          requiredPermission: "payments.reconciliation.read",
        })]
      : [],
  }, client)
}

async function buildCloseRunProofTrail(input: ProofTrailInput, client: DbClient) {
  const closeRun = await client.closeRun.findFirst({
    where: { id: input.subjectId, organizationId: input.organizationId },
    include: {
      period: { select: { id: true, name: true, status: true, startDate: true, endDate: true } },
      checklistItems: {
        select: { id: true, key: true, domain: true, status: true, severity: true, label: true, evidenceCount: true, blockerReason: true },
        orderBy: { createdAt: "asc" },
        take: 20,
      },
      findings: {
        select: { id: true, status: true, severity: true, title: true, domain: true, detail: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      evidenceItems: {
        select: {
          id: true,
          evidenceType: true,
          sourceTable: true,
          sourceType: true,
          sourceId: true,
          sourceLabel: true,
          provenance: true,
          available: true,
          unavailableReason: true,
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      packExports: {
        select: { id: true, fileType: true, watermarkId: true, isCertified: true, exportedAt: true },
        orderBy: { exportedAt: "desc" },
        take: 10,
      },
    },
  })

  if (!closeRun) throw new NotFoundError("Close proof subject not found")

  const blockers: ProofTrailBlocker[] = []
  const openFindings = closeRun.findings.filter((finding) => OPEN_CLOSE_FINDING_STATUSES.includes(finding.status))
  const failedChecklistItems = closeRun.checklistItems.filter((item) => item.status === CloseChecklistStatus.FAILED)
  const unavailableEvidenceItems = closeRun.evidenceItems.filter((item) => !item.available)
  const certifiedPackExportCount = closeRun.packExports.filter((entry) => entry.isCertified).length

  if (closeRun.status === CloseRunStatus.BLOCKED || closeRun.status === CloseRunStatus.VOIDED) {
    blockers.push(createProofTrailBlocker({
      id: "close-run-blocked-or-voided",
      severity: "critical",
      gate: "accounting.close.status",
      title: "Close run is blocked or voided",
      detail: `Close run status is ${closeRun.status}.`,
      sourceTables: ["close_runs"],
    }))
  }

  if (openFindings.length > 0) {
    blockers.push(createProofTrailBlocker({
      id: "close-open-findings",
      severity: openFindings.some((finding) => finding.severity === "CRITICAL" || finding.severity === "HIGH") ? "high" : "medium",
      gate: "accounting.close.findings",
      title: "Close findings remain open",
      detail: `${openFindings.length} close assurance finding remains unresolved.`,
      sourceTables: ["close_assurance_findings"],
      nextAction: "Resolve or waive open close findings before certification.",
    }))
  }

  if (failedChecklistItems.length > 0) {
    blockers.push(createProofTrailBlocker({
      id: "close-checklist-failed",
      severity: failedChecklistItems.some((item) => item.severity === "CRITICAL" || item.severity === "HIGH") ? "high" : "medium",
      gate: "accounting.close.checklist",
      title: "Close checklist has failed controls",
      detail: `${failedChecklistItems.length} checklist item failed.`,
      sourceTables: ["close_checklist_items"],
    }))
  }

  if (unavailableEvidenceItems.length > 0) {
    blockers.push(createProofTrailBlocker({
      id: "close-evidence-unavailable",
      severity: "high",
      gate: "accounting.close.evidence",
      title: "Close evidence is unavailable",
      detail: `${unavailableEvidenceItems.length} close evidence item is unavailable.`,
      sourceTables: ["close_evidence_items"],
      nextAction: "Regenerate or attach the missing close evidence.",
    }))
  }

  const decision = computeCloseRunEvidenceGrade({
    status: closeRun.status,
    certifiedPackExportCount,
    blockers,
  })

  const subjectNodeId = "close-run"
  const redactions: ProofTrailRedaction[] = closeRun.packExports.length
    ? [
        createProofTrailRedaction({
          id: "close-pack-watermark",
          field: "nodes.close-pack-export-1",
          reason: "Close-pack watermark/export internals are hidden unless export permission and fresh auth pass.",
        }),
      ]
    : []
  const nodes: ProofTrailNode[] = [
    node({
      id: subjectNodeId,
      nodeType: "close.run",
      nodeId: closeRun.id,
      label: `Close run ${closeRun.period.name}`,
      moduleSlug: "close",
      evidenceGrade: decision.grade,
      sourceTable: "close_runs",
      available: true,
      redacted: false,
      metadata: {
        status: closeRun.status,
        readinessScore: closeRun.readinessScore,
        criticalBlockerCount: closeRun.criticalBlockerCount,
        highBlockerCount: closeRun.highBlockerCount,
      },
    }),
  ]
  const edges: ProofTrailEdge[] = []

  closeRun.checklistItems.forEach((item, index) => {
    const itemNodeId = `close-checklist-${index + 1}`
    const grade: EvidenceGrade = item.status === CloseChecklistStatus.FAILED ? "blocked" : "operational"
    nodes.push(node({
      id: itemNodeId,
      nodeType: "close.checklist_item",
      nodeId: item.id,
      label: item.label,
      moduleSlug: "close",
      evidenceGrade: grade,
      sourceTable: "close_checklist_items",
      available: item.status !== CloseChecklistStatus.UNAVAILABLE,
      redacted: false,
      metadata: {
        key: item.key,
        domain: item.domain,
        status: item.status,
        severity: item.severity,
        evidenceCount: item.evidenceCount,
      },
    }))
    edges.push(edge({
      fromNodeId: itemNodeId,
      toNodeId: subjectNodeId,
      edgeType: grade === "blocked" ? "blocks" : "depends_on",
      label: grade === "blocked" ? "Blocks close trust" : "Supports close readiness",
      evidenceGrade: grade,
    }))
  })

  closeRun.findings.forEach((finding, index) => {
    const findingNodeId = `close-finding-${index + 1}`
    const isOpen = OPEN_CLOSE_FINDING_STATUSES.includes(finding.status)
    nodes.push(node({
      id: findingNodeId,
      nodeType: "close.finding",
      nodeId: finding.id,
      label: finding.title,
      moduleSlug: "close",
      evidenceGrade: isOpen ? "blocked" : "operational",
      sourceTable: "close_assurance_findings",
      available: !isOpen,
      redacted: false,
      metadata: {
        status: finding.status,
        severity: finding.severity,
        domain: finding.domain,
      },
    }))
    edges.push(edge({
      fromNodeId: findingNodeId,
      toNodeId: subjectNodeId,
      edgeType: isOpen ? "blocks" : "audits",
      label: isOpen ? "Blocks close trust" : "Finding resolved or waived",
      evidenceGrade: isOpen ? "blocked" : "operational",
    }))
  })

  closeRun.evidenceItems.forEach((evidenceItem, index) => {
    const evidenceNodeId = `close-evidence-${index + 1}`
    const grade: EvidenceGrade = evidenceItem.available ? "posted" : "blocked"
    nodes.push(node({
      id: evidenceNodeId,
      nodeType: "close.evidence_item",
      nodeId: evidenceItem.id,
      label: evidenceItem.sourceLabel,
      moduleSlug: "close",
      evidenceGrade: grade,
      sourceTable: "close_evidence_items",
      available: evidenceItem.available,
      redacted: false,
      metadata: {
        evidenceType: evidenceItem.evidenceType,
        sourceTable: evidenceItem.sourceTable,
        sourceType: evidenceItem.sourceType,
        provenance: evidenceItem.provenance,
      },
    }))
    edges.push(edge({
      fromNodeId: evidenceNodeId,
      toNodeId: subjectNodeId,
      edgeType: evidenceItem.available ? "source" : "blocks",
      label: evidenceItem.available ? "Supports close evidence" : evidenceItem.unavailableReason || "Evidence unavailable",
      evidenceGrade: grade,
    }))
  })

  closeRun.packExports.forEach((packExport, index) => {
    const exportNodeId = `close-pack-export-${index + 1}`
    nodes.push(node({
      id: exportNodeId,
      nodeType: "close.pack_export",
      nodeId: packExport.id,
      label: packExport.isCertified ? "Certified close pack export" : "Draft close pack export",
      moduleSlug: "close",
      evidenceGrade: packExport.isCertified ? "certified" : "operational",
      sourceTable: "close_pack_exports",
      available: true,
      redacted: index === 0,
      metadata: {
        fileType: packExport.fileType,
        exportedAt: packExport.exportedAt.toISOString(),
      },
    }))
    edges.push(edge({
      fromNodeId: exportNodeId,
      toNodeId: subjectNodeId,
      edgeType: packExport.isCertified ? "certifies" : "source",
      label: packExport.isCertified ? "Certifies close evidence" : "Exports close pack",
      evidenceGrade: packExport.isCertified ? "certified" : "operational",
    }))
  })

  return finalizeProofTrail({
    input,
    moduleSlug: "close",
    decision,
    nodes,
    edges,
    blockers,
    redactions,
    nextActions: blockers.length
      ? [nextAction({
          id: "review-close-assurance",
          label: "Review close assurance blockers",
          href: `/dashboard/accounting/close/${closeRun.periodId}`,
          requiredPermission: "accounting.close.read",
        })]
      : [],
  }, client)
}

async function finalizeProofTrail(
  params: {
    input: ProofTrailInput
    moduleSlug: ProofTrailResult["moduleSlug"]
    decision: { grade: EvidenceGrade; reason: string }
    nodes: ProofTrailNode[]
    edges: ProofTrailEdge[]
    blockers: ProofTrailBlocker[]
    redactions: ProofTrailRedaction[]
    nextActions: ProofTrailNextAction[]
  },
  client: DbClient,
) {
  const result = applyProofTrailRedactions({
    organizationId: params.input.organizationId,
    subjectType: params.input.subjectType,
    subjectId: params.input.subjectId,
    moduleSlug: params.moduleSlug,
    evidenceGrade: params.decision.grade,
    reason: params.decision.reason,
    freshness: freshnessFor(params.blockers, params.nodes),
    generatedAt: new Date().toISOString(),
    sourceModules: sourceModules(params.nodes),
    nodes: params.nodes,
    edges: params.edges,
    blockers: params.blockers,
    redactions: params.redactions,
    nextActions: params.nextActions,
    audit: {
      accessLogged: false,
      sensitiveAccess:
        params.input.subjectType !== "journal.entry" ||
        params.decision.grade === "certified" ||
        params.redactions.length > 0,
    },
  })

  return auditSensitiveAccess(client, result, params.input.actorId)
}

export async function getProofTrail(input: ProofTrailInput, client: DbClient = db): Promise<ProofTrailResult> {
  switch (input.subjectType) {
    case "journal.entry":
      return buildJournalEntryProofTrail(input, client)
    case "reconciliation.run":
      return buildReconciliationRunProofTrail(input, client)
    case "close.run":
      return buildCloseRunProofTrail(input, client)
  }
}
