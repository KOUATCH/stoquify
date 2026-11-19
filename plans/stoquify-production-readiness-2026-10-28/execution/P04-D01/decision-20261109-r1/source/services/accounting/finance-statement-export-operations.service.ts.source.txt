import "server-only"

import { z } from "zod"

import { db } from "@/prisma/db"
import { FINANCE_STATEMENT_EXPORT_JOB_EVENT } from "@/services/accounting/finance-statement-export.service"

const runtimeConfigurationSchema = z.object({
  rendererId: z.string().trim().min(1).max(120).optional(),
  artifactProvider: z.string().trim().min(1).max(100).optional(),
  artifactProviderApprovalReference: z.string().trim().min(3).max(240).regex(/^[a-z][a-z0-9+.-]*:\/\/[a-z0-9][a-z0-9._~:/-]*$/i).optional(),
  downloadGrantPolicy: z.string().trim().min(1).max(120).optional(),
  retentionPolicy: z.string().trim().min(1).max(120).optional(),
}).strict()

const exportMetadataSchema = z.object({
  state: z.string().optional(),
  artifact: z.object({
    expiresAt: z.string().datetime(),
  }).passthrough().optional(),
}).passthrough()

export type FinanceStatementExportRuntimeConfiguration = z.input<typeof runtimeConfigurationSchema>

export type FinanceStatementExportRuntimeReadiness = {
  ready: boolean
  renderer: { configured: boolean; id: string | null }
  artifactStore: { configured: boolean; provider: string | null; approvalReference: string | null }
  downloadGrant: { configured: boolean; policy: string | null }
  retention: { configured: boolean; policy: string | null }
  missing: string[]
}

export type FinanceStatementExportOperationsSnapshot = {
  organizationId: string
  asOf: string
  readiness: FinanceStatementExportRuntimeReadiness
  queue: {
    pendingCount: number
    lockedCount: number
    failedCount: number
    completedCount: number
    expiredArtifactCount: number
    oldestPendingAt: string | null
  }
}

function optionalEnvironmentValue(value: string | undefined) {
  const normalized = value?.trim()
  return normalized || undefined
}

export function readFinanceStatementExportRuntimeConfiguration(): FinanceStatementExportRuntimeConfiguration {
  return {
    rendererId: optionalEnvironmentValue(process.env.STOQUIFY_FINANCE_EXPORT_RENDERER_ID),
    artifactProvider: optionalEnvironmentValue(process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_PROVIDER),
    artifactProviderApprovalReference: optionalEnvironmentValue(process.env.STOQUIFY_FINANCE_EXPORT_ARTIFACT_APPROVAL_REFERENCE),
    downloadGrantPolicy: optionalEnvironmentValue(process.env.STOQUIFY_FINANCE_EXPORT_DOWNLOAD_GRANT_POLICY),
    retentionPolicy: optionalEnvironmentValue(process.env.STOQUIFY_FINANCE_EXPORT_RETENTION_POLICY),
  }
}

export type FinanceStatementExportRetentionCandidate = {
  organizationId: string
  jobId: string
  provider: string
  key: string
  contentHash: string
  byteLength: number
  expiresAt: string
}

function asDate(value: Date | string | number | undefined, fallback: Date) {
  const date = value === undefined ? new Date(fallback) : value instanceof Date ? new Date(value) : new Date(value)
  if (Number.isNaN(date.getTime())) throw new Error("Finance statement export operations time is invalid.")
  return date
}

export function resolveFinanceStatementExportRuntimeReadiness(
  input: FinanceStatementExportRuntimeConfiguration = {},
): FinanceStatementExportRuntimeReadiness {
  const configuration = runtimeConfigurationSchema.parse(input)
  const missing: string[] = []
  const renderer = { configured: Boolean(configuration.rendererId), id: configuration.rendererId ?? null }
  const artifactStore = {
    configured: Boolean(configuration.artifactProvider && configuration.artifactProviderApprovalReference),
    provider: configuration.artifactProvider ?? null,
    approvalReference: configuration.artifactProviderApprovalReference ?? null,
  }
  const downloadGrant = { configured: Boolean(configuration.downloadGrantPolicy), policy: configuration.downloadGrantPolicy ?? null }
  const retention = { configured: Boolean(configuration.retentionPolicy), policy: configuration.retentionPolicy ?? null }

  if (!renderer.configured) missing.push("renderer")
  if (!artifactStore.configured) missing.push("artifactStore")
  if (!downloadGrant.configured) missing.push("downloadGrant")
  if (!retention.configured) missing.push("retention")

  return {
    ready: missing.length === 0,
    renderer,
    artifactStore,
    downloadGrant,
    retention,
    missing,
  }
}

export async function getFinanceStatementExportOperationsSnapshot(input: {
  organizationId: string
  configuration?: FinanceStatementExportRuntimeConfiguration
  now?: Date | string | number
  client?: typeof db
}): Promise<FinanceStatementExportOperationsSnapshot> {
  const now = asDate(input.now, new Date())
  const client = input.client ?? db
  const records = await client.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: "REPORT_EXPORT",
      eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
    },
    select: { status: true, createdAt: true, metadata: true },
    orderBy: { createdAt: "asc" },
  })

  let pendingCount = 0
  let lockedCount = 0
  let failedCount = 0
  let completedCount = 0
  let expiredArtifactCount = 0
  let oldestPendingAt: string | null = null

  for (const record of records) {
    if (record.status === "PENDING") {
      pendingCount += 1
      if (!oldestPendingAt) oldestPendingAt = new Date(record.createdAt).toISOString()
    }
    if (record.status === "LOCKED") lockedCount += 1
    if (["FAILED", "DEAD_LETTER", "CANCELLED"].includes(record.status)) failedCount += 1

    const metadata = exportMetadataSchema.safeParse(record.metadata)
    if (metadata.success && metadata.data.state === "completed") completedCount += 1
    if (
      metadata.success &&
      metadata.data.artifact &&
      new Date(metadata.data.artifact.expiresAt).getTime() <= now.getTime()
    ) {
      expiredArtifactCount += 1
    }
  }

  return {
    organizationId: input.organizationId,
    asOf: now.toISOString(),
    readiness: resolveFinanceStatementExportRuntimeReadiness(
      input.configuration ?? readFinanceStatementExportRuntimeConfiguration(),
    ),
    queue: {
      pendingCount,
      lockedCount,
      failedCount,
      completedCount,
      expiredArtifactCount,
      oldestPendingAt,
    },
  }
}

export async function listFinanceStatementExportRetentionCandidates(input: {
  organizationId: string
  now?: Date | string | number
  limit?: number
  client?: typeof db
}): Promise<FinanceStatementExportRetentionCandidate[]> {
  const now = asDate(input.now, new Date())
  const client = input.client ?? db
  const limit = z.number().int().min(1).max(500).parse(input.limit ?? 100)
  const records = await client.businessEventOutbox.findMany({
    where: {
      organizationId: input.organizationId,
      channel: "REPORT_EXPORT",
      eventName: FINANCE_STATEMENT_EXPORT_JOB_EVENT,
      status: "SENT",
    },
    select: { id: true, metadata: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  })

  const candidates: FinanceStatementExportRetentionCandidate[] = []
  for (const record of records) {
    const metadata = exportMetadataSchema.safeParse(record.metadata)
    if (!metadata.success || metadata.data.state !== "completed" || !metadata.data.artifact) continue
    const artifact = z.object({
      provider: z.string().min(1),
      key: z.string().min(1),
      byteLength: z.number().int().positive(),
      contentHash: z.string().regex(/^sha256:[a-f0-9]{64}$/),
      expiresAt: z.string().datetime(),
    }).safeParse(metadata.data.artifact)
    if (!artifact.success || new Date(artifact.data.expiresAt).getTime() > now.getTime()) continue
    candidates.push({
      organizationId: input.organizationId,
      jobId: record.id,
      provider: artifact.data.provider,
      key: artifact.data.key,
      contentHash: artifact.data.contentHash,
      byteLength: artifact.data.byteLength,
      expiresAt: artifact.data.expiresAt,
    })
  }
  return candidates
}
