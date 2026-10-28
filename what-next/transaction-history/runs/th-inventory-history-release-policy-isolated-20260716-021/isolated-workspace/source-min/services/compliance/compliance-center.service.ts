import {
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { getCloseReadinessSnapshot } from "@/services/snapshots/close-readiness-snapshot.service"
import { getInventoryCashSnapshot } from "@/services/snapshots/inventory-cash-snapshot.service"
import { getPaymentTruthSnapshot } from "@/services/snapshots/payment-truth-snapshot.service"
import type {
  SnapshotBlocker,
  SnapshotRedaction,
  SnapshotResult,
  SnapshotSourceModule,
  TenantOperatingMetrics,
} from "@/services/snapshots/snapshot-contracts"
import { getTenantOperatingSnapshotFromRelated } from "@/services/snapshots/tenant-operating-snapshot.service"

import { resolveEInvoicingMetadata } from "./country-pack-hooks"

type CompliancePayrollForecastReadiness = {
  state: "READY" | "BLOCKED"
  status: TenantOperatingMetrics["payrollFinanceForecast"]["status"]
  authoritative: boolean
  reasonCode: string
  message: string
  upcomingStatutoryLiabilityAmount: number
  totalUpcomingAmount: number
  declarationCount: number
  nextDeclarationDueDate: string | null
  blockerCodes: string[]
  blockers: SnapshotBlocker[]
  redactions: SnapshotRedaction[]
  sourceHash: string | null
  sourceModules: SnapshotSourceModule[]
  generatedAt: string
  action: {
    href: string
    requiredPermission: string
    label: string
  }
}

export type ComplianceCenterKernelSnapshot = {
  asOf: string
  organizationId: string
  filters: {
    countryCode?: string
    limit: number
  }
  documentCounts: Record<FiscalDocumentStatus, number>
  submissionCounts: Record<ComplianceSubmissionStatus, number>
  recentDocuments: Array<{
    id: string
    documentType: string
    status: string
    sourceType: string
    sourceId: string
    issueDate: string
    countryCode: string
    countryPackVersion: string
    countryPackResolutionHash: string
    totalAmount: number
    currency: string
    authorityChannel: string | null
    authorityReference: string | null
    lineCount: number
    submissionCount: number
  }>
  queuedSubmissions: Array<{
    id: string
    fiscalDocumentId: string
    status: string
    operation: string
    authorityChannel: string
    environment: string
    attempts: number
    nextAttemptAt: string
    lastError: string | null
    payloadHash: string
  }>
  adapterConfigs: Array<{
    id: string
    countryCode: string
    authorityChannel: string
    adapterKey: string
    environment: string
    status: string
    countryPackVersion: string
    capabilityStatus: string
    credentialReferencePresent: boolean
  }>
  payrollForecastReadiness: CompliancePayrollForecastReadiness
}

function zeroDocumentCounts() {
  return Object.values(FiscalDocumentStatus).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<FiscalDocumentStatus, number>,
  )
}

function zeroSubmissionCounts() {
  return Object.values(ComplianceSubmissionStatus).reduce(
    (acc, status) => ({ ...acc, [status]: 0 }),
    {} as Record<ComplianceSubmissionStatus, number>,
  )
}

function decimalNumber(value: { toNumber: () => number } | number | null | undefined) {
  if (value === null || value === undefined) return 0
  return typeof value === "number" ? value : value.toNumber()
}

export async function getComplianceCenterKernelSnapshot(input: {
  organizationId: string
  countryCode?: string
  limit?: number
}): Promise<ComplianceCenterKernelSnapshot> {
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 100)
  const countryFilter = input.countryCode
    ? { countryCode: input.countryCode.toUpperCase() }
    : {}

  const [
    documentCountsRaw,
    submissionCountsRaw,
    recentDocuments,
    queuedSubmissions,
    adapterConfigs,
    payrollForecastReadiness,
  ] =
    await Promise.all([
      Promise.all(
        Object.values(FiscalDocumentStatus).map(async (status) => ({
          status,
          count: await db.fiscalDocument.count({
            where: {
              organizationId: input.organizationId,
              status,
              ...countryFilter,
            },
          }),
        })),
      ),
      Promise.all(
        Object.values(ComplianceSubmissionStatus).map(async (status) => ({
          status,
          count: await db.complianceSubmission.count({
            where: {
              organizationId: input.organizationId,
              status,
            },
          }),
        })),
      ),
      db.fiscalDocument.findMany({
        where: {
          organizationId: input.organizationId,
          ...countryFilter,
        },
        orderBy: { issueDate: "desc" },
        take: limit,
        select: {
          id: true,
          documentType: true,
          status: true,
          sourceType: true,
          sourceId: true,
          issueDate: true,
          countryCode: true,
          countryPackVersion: true,
          countryPackResolutionHash: true,
          totalAmount: true,
          currency: true,
          authorityChannel: true,
          authorityReference: true,
          _count: {
            select: {
              lines: true,
              submissions: true,
            },
          },
        },
      }),
      db.complianceSubmission.findMany({
        where: {
          organizationId: input.organizationId,
          status: {
            in: [
              ComplianceSubmissionStatus.PENDING,
              ComplianceSubmissionStatus.LEASED,
              ComplianceSubmissionStatus.RETRY_SCHEDULED,
              ComplianceSubmissionStatus.REJECTED,
              ComplianceSubmissionStatus.FAILED,
              ComplianceSubmissionStatus.DEAD_LETTER,
            ],
          },
        },
        orderBy: [{ nextAttemptAt: "asc" }, { createdAt: "asc" }],
        take: limit,
        select: {
          id: true,
          fiscalDocumentId: true,
          status: true,
          operation: true,
          authorityChannel: true,
          environment: true,
          attempts: true,
          nextAttemptAt: true,
          errorMessage: true,
          rejectionReason: true,
          payloadHash: true,
        },
      }),
      db.complianceAdapterConfig.findMany({
        where: {
          organizationId: input.organizationId,
          ...countryFilter,
        },
        orderBy: [{ countryCode: "asc" }, { authorityChannel: "asc" }],
        take: limit,
        select: {
          id: true,
          countryCode: true,
          authorityChannel: true,
          adapterKey: true,
          environment: true,
          status: true,
          countryPackVersion: true,
          capabilityStatus: true,
          credentialReference: true,
        },
      }),
      getCompliancePayrollForecastReadiness({ organizationId: input.organizationId }),
    ])

  const documentCounts = zeroDocumentCounts()
  documentCountsRaw.forEach(({ status, count }) => {
    documentCounts[status] = count
  })

  const submissionCounts = zeroSubmissionCounts()
  submissionCountsRaw.forEach(({ status, count }) => {
    submissionCounts[status] = count
  })

  return {
    asOf: new Date().toISOString(),
    organizationId: input.organizationId,
    filters: {
      countryCode: input.countryCode?.toUpperCase(),
      limit,
    },
    documentCounts,
    submissionCounts,
    recentDocuments: recentDocuments.map((document) => ({
      id: document.id,
      documentType: document.documentType,
      status: document.status,
      sourceType: document.sourceType,
      sourceId: document.sourceId,
      issueDate: document.issueDate.toISOString(),
      countryCode: document.countryCode,
      countryPackVersion: document.countryPackVersion,
      countryPackResolutionHash: document.countryPackResolutionHash,
      totalAmount: decimalNumber(document.totalAmount),
      currency: document.currency,
      authorityChannel: document.authorityChannel,
      authorityReference: document.authorityReference,
      lineCount: document._count.lines,
      submissionCount: document._count.submissions,
    })),
    queuedSubmissions: queuedSubmissions.map((submission) => ({
      id: submission.id,
      fiscalDocumentId: submission.fiscalDocumentId,
      status: submission.status,
      operation: submission.operation,
      authorityChannel: submission.authorityChannel,
      environment: submission.environment,
      attempts: submission.attempts,
      nextAttemptAt: submission.nextAttemptAt.toISOString(),
      lastError: submission.rejectionReason ?? submission.errorMessage,
      payloadHash: submission.payloadHash,
    })),
    adapterConfigs: adapterConfigs.map((adapter) => ({
      id: adapter.id,
      countryCode: adapter.countryCode,
      authorityChannel: adapter.authorityChannel,
      adapterKey: adapter.adapterKey,
      environment: adapter.environment,
      status: adapter.status,
      countryPackVersion: adapter.countryPackVersion,
      capabilityStatus: adapter.capabilityStatus,
      credentialReferencePresent: Boolean(adapter.credentialReference),
    })),
    payrollForecastReadiness,
  }
}

async function getCompliancePayrollForecastReadiness(input: {
  organizationId: string
}): Promise<CompliancePayrollForecastReadiness> {
  const scope = { organizationId: input.organizationId }
  const [paymentTruth, inventoryCash, closeReadiness] = await Promise.all([
    getPaymentTruthSnapshot(scope),
    getInventoryCashSnapshot(scope),
    getCloseReadinessSnapshot(scope),
  ])
  const tenantOperating = await getTenantOperatingSnapshotFromRelated(scope, {
    paymentTruth,
    inventoryCash,
    closeReadiness,
  })

  return mapPayrollForecastReadiness(tenantOperating)
}

function mapPayrollForecastReadiness(
  snapshot: SnapshotResult<TenantOperatingMetrics>,
): CompliancePayrollForecastReadiness {
  const forecast = snapshot.metrics.payrollFinanceForecast
  const blocked = !forecast.authoritative || forecast.blockerCodes.length > 0
  const action = payrollForecastActionFor(forecast.blockerCodes)

  return {
    state: blocked ? "BLOCKED" : "READY",
    status: forecast.status,
    authoritative: forecast.authoritative,
    reasonCode: forecast.reasonCode,
    message: forecast.message,
    upcomingStatutoryLiabilityAmount: forecast.upcomingStatutoryLiabilityAmount,
    totalUpcomingAmount: forecast.totalUpcomingAmount,
    declarationCount: forecast.declarationCount,
    nextDeclarationDueDate: forecast.nextDeclarationDueDate,
    blockerCodes: forecast.blockerCodes,
    blockers: snapshot.blockers.filter((blocker) => blocker.gate === "payroll_finance_forecast"),
    redactions: uniqueById([
      ...snapshot.redactions,
      {
        id: "compliance-payroll-forecast-person-level-redacted",
        field: "payroll.personLevelAmounts",
        reason: "Compliance Center exposes aggregate payroll declaration readiness only; person-level payroll values stay inside payroll.",
        policy: "KONTAVA_SENSITIVE_PAYROLL_EVIDENCE",
      },
    ]),
    sourceHash: snapshot.sourceHash,
    sourceModules: snapshot.sourceModules,
    generatedAt: snapshot.generatedAt,
    action,
  }
}

function payrollForecastActionFor(blockerCodes: readonly string[]) {
  if (blockerCodes.some((code) => code.includes("DECLARATION"))) {
    return {
      href: "/dashboard/payroll/declarations",
      requiredPermission: "payroll.declarations.manage",
      label: "Open payroll declarations",
    }
  }

  if (blockerCodes.some((code) => code.includes("PAYMENT") || code.includes("PROVIDER"))) {
    return {
      href: "/dashboard/payroll/payments",
      requiredPermission: "payroll.payments.reconcile",
      label: "Open payroll payments",
    }
  }

  return {
    href: "/dashboard/payroll/register",
    requiredPermission: "payroll.runs.review",
    label: "Open payroll register",
  }
}

function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>()
  return items.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  })
}

export function getEInvoicingMetadataReadiness(input: {
  countryCode: string
  date?: Date | string
  pinnedPackVersion?: string | null
}) {
  return resolveEInvoicingMetadata({
    countryCode: input.countryCode,
    date: input.date ?? new Date(),
    pinnedPackVersion: input.pinnedPackVersion,
  })
}
