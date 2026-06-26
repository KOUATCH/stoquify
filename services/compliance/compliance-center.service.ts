import {
  ComplianceSubmissionStatus,
  FiscalDocumentStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"

import { resolveEInvoicingMetadata } from "./country-pack-hooks"

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

  const [documentCountsRaw, submissionCountsRaw, recentDocuments, queuedSubmissions, adapterConfigs] =
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
  }
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
