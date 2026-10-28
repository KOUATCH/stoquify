import "server-only"

import type { Prisma } from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError, NotFoundError } from "@/services/_shared/action-errors"
import type { CustomerCreateInput } from "@/services/customer/customer.schemas"
import { createCustomer } from "@/services/customer/customer.service"
import type { ItemCreateInput } from "@/services/item/item.schemas"
import { createItem } from "@/services/item/item.service"
import type { SupplierCreateInput } from "@/services/supplier/supplier.schemas"
import { createSupplier } from "@/services/supplier/supplier.service"
import {
  MASTER_DATA_IMPORT_MAX_BYTES,
  MASTER_DATA_IMPORT_SCHEMA_VERSION,
  MASTER_DATA_IMPORT_TARGETS,
  MASTER_DATA_TARGET_CONFIG,
  analyzeMasterDataCsv,
  buildTenantCsvTemplate,
  defaultFieldMap,
  hashCsvContent,
  hashStablePayload,
  normalizeBusinessKey,
  parseMasterDataDomainRow,
  validateFieldMap,
  type MasterDataFieldMap,
  type MasterDataImportTarget,
  type MasterDataAnalyzedRow,
  type MasterDataSafeIssue,
} from "./master-data-csv"

export const MASTER_DATA_ONBOARDING_CONTROL_BOUNDARY = {
  included: [
    "customer identity and contact master data",
    "supplier identity and contact master data",
    "item catalogue identity, description, and prices",
    "tenant-scoped staging, mappings, validation, approvals, controls, evidence, and readiness",
  ],
  domainWriteOwners: [
    "services/customer/customer.service.ts#createCustomer",
    "services/supplier/supplier.service.ts#createSupplier",
    "services/item/item.service.ts#createItem",
  ],
  excluded: [
    "customer or supplier current balances",
    "opening accounting balances",
    "inventory opening quantities or stock movements",
    "journal or ledger postings",
    "historical transaction or statutory-document migration",
    "updates, merges, hard deletes, destructive resets, or automatic rollback",
  ],
  compensation: "Any remediation is a separately authorized domain archive or correction; this slice never resets or hard-deletes business truth.",
} as const

export const MASTER_DATA_HIGH_RISK_ROW_THRESHOLD = 100
export const MASTER_DATA_IMPORT_RISK_REASONS = [
  "BULK_BATCH",
  "SUPPLIER_CREATION",
  "CUSTOMER_CREDIT_LIMIT",
  "ITEM_PRICING",
] as const

export type MasterDataImportRiskLevel = "STANDARD" | "HIGH"
export type MasterDataImportRiskReason = (typeof MASTER_DATA_IMPORT_RISK_REASONS)[number]
export type MasterDataImportStatus =
  | "UPLOADED"
  | "VALIDATED"
  | "BLOCKED"
  | "APPROVED"
  | "COMMITTING"
  | "COMMITTED"

export function classifyMasterDataImportRisk(input: {
  target: MasterDataImportTarget
  rows: readonly MasterDataAnalyzedRow[]
}): { level: MasterDataImportRiskLevel; reasons: MasterDataImportRiskReason[] } {
  const reasons = new Set<MasterDataImportRiskReason>()
  const validRows = input.rows.filter((row) => row.valid)

  if (input.rows.length >= MASTER_DATA_HIGH_RISK_ROW_THRESHOLD) reasons.add("BULK_BATCH")
  if (input.target === "SUPPLIER" && validRows.length > 0) reasons.add("SUPPLIER_CREATION")
  if (
    input.target === "CUSTOMER" &&
    validRows.some((row) => Number(row.normalizedData.creditLimit ?? 0) > 0)
  ) {
    reasons.add("CUSTOMER_CREDIT_LIMIT")
  }
  if (
    input.target === "ITEM" &&
    validRows.some((row) => row.normalizedData.costPrice != null || row.normalizedData.sellingPrice != null)
  ) {
    reasons.add("ITEM_PRICING")
  }

  return {
    level: reasons.size > 0 ? "HIGH" : "STANDARD",
    reasons: [...reasons],
  }
}

const BATCH_INCLUDE = {
  mapping: true,
  rows: { orderBy: { rowNumber: "asc" as const } },
  issues: { orderBy: [{ rowNumber: "asc" as const }, { createdAt: "asc" as const }] },
} as const

type ImportMappingRecord = {
  id: string
  organizationId: string
  target: string
  version: number
  schemaVersion: string
  fieldMap: Prisma.JsonValue
  requiredFields: string[]
  createdById: string
  createdAt: Date
}

type ImportRowRecord = {
  id: string
  organizationId: string
  batchId: string
  rowNumber: number
  sourceRowHash: string
  businessKey: string | null
  normalizedData: Prisma.JsonValue
  valid: boolean
  commitAttemptedAt: Date | null
  committedRecordId: string | null
  committedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

type ImportIssueRecord = {
  id: string
  organizationId: string
  batchId: string
  rowId: string | null
  rowNumber: number
  field: string | null
  severity: "ERROR" | "WARNING"
  code: string
  safeMessage: string
  createdAt: Date
}

type ImportBatchRecord = {
  id: string
  organizationId: string
  target: string
  status: MasterDataImportStatus
  sourceFilename: string
  sourceMimeType: string
  sourceByteSize: number
  contentHash: string
  mappingId: string
  mappingVersion: number
  schemaVersion: string
  sourceRecordCount: number
  validRecordCount: number
  errorRecordCount: number
  duplicateRecordCount: number
  riskLevel: MasterDataImportRiskLevel
  riskReasons: string[]
  sourceRequiredFieldTotals: Prisma.JsonValue
  preCommitRecordCount: number | null
  postCommitRecordCount: number | null
  destinationRequiredTotals: Prisma.JsonValue | null
  committedRecordCount: number
  uploadedById: string
  uploadedAt: Date
  validatedAt: Date | null
  approvedById: string | null
  approvedAt: Date | null
  approvalDigest: string | null
  commitStartedAt: Date | null
  committedAt: Date | null
  replayCount: number
  lastReplayedAt: Date | null
  evidenceManifest: Prisma.JsonValue | null
  evidenceHash: string | null
  lastSafeErrorCode: string | null
  retentionExpiresAt: Date
  createdAt: Date
  updatedAt: Date
  mapping: ImportMappingRecord
  rows: ImportRowRecord[]
  issues: ImportIssueRecord[]
}

type ReadinessMilestoneRecord = {
  id: string
  organizationId: string
  target: string
  state: string
  evidenceBatchId: string | null
  sourceRecordCount: number
  committedCount: number
  blockerCount: number
  waivedById: string | null
  waivedAt: Date | null
  waiverReason: string | null
  createdAt: Date
  updatedAt: Date
}

type ControlDelegate<T> = {
  findFirst(args: unknown): Promise<T | null>
  findUnique(args: unknown): Promise<T | null>
  findMany(args: unknown): Promise<T[]>
  create(args: unknown): Promise<T>
  update(args: unknown): Promise<T>
  updateMany(args: unknown): Promise<{ count: number }>
  upsert(args: unknown): Promise<T>
  count(args: unknown): Promise<number>
}

const controlDb = db as unknown as {
  onboardingImportMapping: ControlDelegate<ImportMappingRecord> & {
    aggregate(args: unknown): Promise<{ _max: { version: number | null } }>
  }
  onboardingImportBatch: ControlDelegate<ImportBatchRecord>
  onboardingImportRow: ControlDelegate<ImportRowRecord>
  onboardingReadinessMilestone: ControlDelegate<ReadinessMilestoneRecord>
}

export type MasterDataImportSummary = {
  batchId: string
  organizationId: string
  target: MasterDataImportTarget
  status: MasterDataImportStatus
  sourceFilename: string
  contentHash: string
  mappingVersion: number
  schemaVersion: string
  replayed: boolean
  replayCount: number
  risk: {
    level: MasterDataImportRiskLevel
    reasons: MasterDataImportRiskReason[]
    separateApproverRequired: boolean
  }
  controls: {
    sourceRecordCount: number
    validRecordCount: number
    errorRecordCount: number
    duplicateRecordCount: number
    requiredFieldTotals: Record<string, number>
    preCommitRecordCount: number | null
    postCommitRecordCount: number | null
    destinationRequiredTotals: Record<string, number> | null
    committedRecordCount: number
  }
  issues: MasterDataSafeIssue[]
  approval: {
    required: boolean
    digest: string
    approvedById: string | null
    approvedAt: string | null
    canCurrentActorApprove: boolean
  }
  evidenceHash: string | null
  committedRecordIds: string[]
}

export type MasterDataOnboardingDashboard = {
  organizationId: string
  overallState: "NOT_STARTED" | "IMPORTED" | "RECONCILED" | "BLOCKED" | "WAIVED"
  generatedAt: string
  milestones: Array<{
    target: MasterDataImportTarget
    state: "NOT_STARTED" | "IMPORTED" | "RECONCILED" | "BLOCKED" | "WAIVED"
    evidenceBatchId: string | null
    sourceRecordCount: number
    committedCount: number
    blockerCount: number
    waivedAt: string | null
    waiverReason: string | null
  }>
  recentBatches: MasterDataImportSummary[]
  adoption: {
    evidenceWindow: "RECENT_12_BATCHES"
    batchCount: number
    committedBatchCount: number
    blockedBatchCount: number
    highRiskBatchCount: number
    separatelyApprovedHighRiskBatchCount: number
    stagedRecordCount: number
    committedRecordCount: number
    rejectedRecordCount: number
    duplicateRecordCount: number
  }
  controlBoundary: typeof MASTER_DATA_ONBOARDING_CONTROL_BOUNDARY
}

function asRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function asNumberRecord(value: Prisma.JsonValue | null | undefined): Record<string, number> {
  return Object.fromEntries(
    Object.entries(asRecord(value)).map(([key, item]) => [key, typeof item === "number" ? item : Number(item) || 0]),
  )
}

function approvalPayload(batch: Pick<
  ImportBatchRecord,
  | "id"
  | "organizationId"
  | "target"
  | "contentHash"
  | "mappingId"
  | "mappingVersion"
  | "schemaVersion"
  | "sourceRecordCount"
  | "validRecordCount"
  | "errorRecordCount"
  | "duplicateRecordCount"
  | "riskLevel"
  | "riskReasons"
  | "sourceRequiredFieldTotals"
>) {
  return {
    batchId: batch.id,
    organizationId: batch.organizationId,
    target: batch.target,
    contentHash: batch.contentHash,
    mappingId: batch.mappingId,
    mappingVersion: batch.mappingVersion,
    schemaVersion: batch.schemaVersion,
    risk: {
      level: batch.riskLevel,
      reasons: batch.riskReasons,
    },
    controls: {
      sourceRecordCount: batch.sourceRecordCount,
      validRecordCount: batch.validRecordCount,
      errorRecordCount: batch.errorRecordCount,
      duplicateRecordCount: batch.duplicateRecordCount,
      requiredFieldTotals: asNumberRecord(batch.sourceRequiredFieldTotals),
    },
  }
}

export function buildMasterDataApprovalDigest(batch: Parameters<typeof approvalPayload>[0]) {
  return hashStablePayload(approvalPayload(batch))
}

function toSummary(
  batch: ImportBatchRecord,
  replayed = false,
  currentActorId?: string,
): MasterDataImportSummary {
  const digest = batch.approvalDigest ?? buildMasterDataApprovalDigest(batch)
  const separateApproverRequired = batch.riskLevel === "HIGH"
  return {
    batchId: batch.id,
    organizationId: batch.organizationId,
    target: batch.target as MasterDataImportTarget,
    status: batch.status as MasterDataImportStatus,
    sourceFilename: batch.sourceFilename,
    contentHash: batch.contentHash,
    mappingVersion: batch.mappingVersion,
    schemaVersion: batch.schemaVersion,
    replayed,
    replayCount: batch.replayCount,
    risk: {
      level: batch.riskLevel,
      reasons: batch.riskReasons.filter((reason): reason is MasterDataImportRiskReason =>
        MASTER_DATA_IMPORT_RISK_REASONS.includes(reason as MasterDataImportRiskReason),
      ),
      separateApproverRequired,
    },
    controls: {
      sourceRecordCount: batch.sourceRecordCount,
      validRecordCount: batch.validRecordCount,
      errorRecordCount: batch.errorRecordCount,
      duplicateRecordCount: batch.duplicateRecordCount,
      requiredFieldTotals: asNumberRecord(batch.sourceRequiredFieldTotals),
      preCommitRecordCount: batch.preCommitRecordCount,
      postCommitRecordCount: batch.postCommitRecordCount,
      destinationRequiredTotals: batch.destinationRequiredTotals
        ? asNumberRecord(batch.destinationRequiredTotals)
        : null,
      committedRecordCount: batch.committedRecordCount,
    },
    issues: batch.issues.map((issue) => ({
      rowNumber: issue.rowNumber,
      field: issue.field,
      severity: issue.severity,
      code: issue.code,
      safeMessage: issue.safeMessage,
    })),
    approval: {
      required: batch.status === "VALIDATED",
      digest,
      approvedById: batch.approvedById,
      approvedAt: batch.approvedAt?.toISOString() ?? null,
      canCurrentActorApprove:
        Boolean(currentActorId) &&
        batch.status === "VALIDATED" &&
        (!separateApproverRequired || batch.uploadedById !== currentActorId),
    },
    evidenceHash: batch.evidenceHash,
    committedRecordIds: batch.rows.flatMap((row) => row.committedRecordId ? [row.committedRecordId] : []),
  }
}

async function readBatch(organizationId: string, batchId: string) {
  const batch = await controlDb.onboardingImportBatch.findFirst({
    where: { id: batchId, organizationId },
    include: BATCH_INCLUDE,
  })
  if (!batch) throw new NotFoundError("Onboarding import batch not found")
  return batch
}

async function getOrCreateDefaultMapping(input: {
  organizationId: string
  target: MasterDataImportTarget
  actorId: string
}) {
  const existing = await controlDb.onboardingImportMapping.findFirst({
    where: { organizationId: input.organizationId, target: input.target },
    orderBy: { version: "desc" },
  })
  if (existing) return existing

  try {
    return await controlDb.onboardingImportMapping.create({
      data: {
        organizationId: input.organizationId,
        target: input.target,
        version: 1,
        schemaVersion: MASTER_DATA_IMPORT_SCHEMA_VERSION,
        fieldMap: defaultFieldMap(input.target),
        requiredFields: [...MASTER_DATA_TARGET_CONFIG[input.target].requiredFields],
        createdById: input.actorId,
      },
    })
  } catch {
    const raced = await controlDb.onboardingImportMapping.findFirst({
      where: { organizationId: input.organizationId, target: input.target },
      orderBy: { version: "desc" },
    })
    if (!raced) throw new BusinessRuleError("The default onboarding mapping could not be created")
    return raced
  }
}

export async function createMasterDataImportMapping(input: {
  organizationId: string
  target: MasterDataImportTarget
  actorId: string
  fieldMap: MasterDataFieldMap
}) {
  validateFieldMap(input.target, input.fieldMap)
  const latest = await controlDb.onboardingImportMapping.aggregate({
    where: { organizationId: input.organizationId, target: input.target },
    _max: { version: true },
  })
  return controlDb.onboardingImportMapping.create({
    data: {
      organizationId: input.organizationId,
      target: input.target,
      version: (latest._max.version ?? 0) + 1,
      schemaVersion: MASTER_DATA_IMPORT_SCHEMA_VERSION,
      fieldMap: input.fieldMap,
      requiredFields: [...MASTER_DATA_TARGET_CONFIG[input.target].requiredFields],
      createdById: input.actorId,
    },
  })
}

export function getTenantMasterDataCsvTemplate(organizationId: string, target: MasterDataImportTarget) {
  return buildTenantCsvTemplate(organizationId, target)
}

async function existingBusinessKeys(
  organizationId: string,
  target: MasterDataImportTarget,
  keys: readonly string[],
) {
  const uniqueKeys = [...new Set(keys.filter(Boolean))]
  if (uniqueKeys.length === 0) return new Set<string>()
  if (target === "CUSTOMER") {
    const rows = await db.customer.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: uniqueKeys.map((code) => ({ code: { equals: code, mode: "insensitive" } })),
      },
      select: { code: true },
    })
    return new Set(rows.flatMap((row) => row.code ? [normalizeBusinessKey(row.code)] : []))
  }
  if (target === "SUPPLIER") {
    const rows = await db.supplier.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: uniqueKeys.map((code) => ({ code: { equals: code, mode: "insensitive" } })),
      },
      select: { code: true },
    })
    return new Set(rows.flatMap((row) => row.code ? [normalizeBusinessKey(row.code)] : []))
  }
  const rows = await db.item.findMany({
    where: {
      organizationId,
      deletedAt: null,
      OR: uniqueKeys.map((sku) => ({ sku: { equals: sku, mode: "insensitive" } })),
    },
    select: { sku: true },
  })
  return new Set(rows.map((row) => normalizeBusinessKey(row.sku)))
}

function retentionDate(now: Date) {
  return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000)
}

async function upsertMilestone(input: {
  organizationId: string
  target: MasterDataImportTarget
  state: "IMPORTED" | "RECONCILED" | "BLOCKED" | "WAIVED"
  batchId: string
  sourceRecordCount: number
  committedCount: number
  blockerCount: number
}) {
  return controlDb.onboardingReadinessMilestone.upsert({
    where: { organizationId_target: { organizationId: input.organizationId, target: input.target } },
    create: {
      organizationId: input.organizationId,
      target: input.target,
      state: input.state,
      evidenceBatchId: input.batchId,
      sourceRecordCount: input.sourceRecordCount,
      committedCount: input.committedCount,
      blockerCount: input.blockerCount,
    },
    update: {
      state: input.state,
      evidenceBatchId: input.batchId,
      sourceRecordCount: input.sourceRecordCount,
      committedCount: input.committedCount,
      blockerCount: input.blockerCount,
      ...(input.state !== "WAIVED"
        ? { waivedById: null, waivedAt: null, waiverReason: null }
        : {}),
    },
  })
}

function readinessForBatch(batch: ImportBatchRecord) {
  if (batch.status === "COMMITTED") return "RECONCILED" as const
  if (batch.status === "BLOCKED" || batch.lastSafeErrorCode) return "BLOCKED" as const
  return "IMPORTED" as const
}

export function buildMasterDataEvidenceManifest(batch: ImportBatchRecord) {
  const readiness = readinessForBatch(batch)
  return {
    schema: "stoquify.master-data-onboarding.evidence.v1",
    generatedAt: new Date().toISOString(),
    organizationId: batch.organizationId,
    batch: {
      id: batch.id,
      target: batch.target,
      status: batch.status,
      sourceFilename: batch.sourceFilename,
      sourceMimeType: batch.sourceMimeType,
      sourceByteSize: batch.sourceByteSize,
      contentHash: batch.contentHash,
      uploadedById: batch.uploadedById,
      uploadedAt: batch.uploadedAt.toISOString(),
      retentionExpiresAt: batch.retentionExpiresAt.toISOString(),
      replayCount: batch.replayCount,
    },
    mapping: {
      id: batch.mappingId,
      version: batch.mappingVersion,
      schemaVersion: batch.schemaVersion,
      requiredFields: batch.mapping.requiredFields,
    },
    validation: {
      dryRunBusinessWrites: 0,
      sourceRecordCount: batch.sourceRecordCount,
      validRecordCount: batch.validRecordCount,
      errorRecordCount: batch.errorRecordCount,
      duplicateRecordCount: batch.duplicateRecordCount,
      requiredFieldTotals: asNumberRecord(batch.sourceRequiredFieldTotals),
      unresolvedIssues: batch.issues.map((issue) => ({
        rowNumber: issue.rowNumber,
        field: issue.field,
        severity: issue.severity,
        code: issue.code,
        safeMessage: issue.safeMessage,
      })),
    },
    approval: {
      digest: batch.approvalDigest ?? buildMasterDataApprovalDigest(batch),
      approvedById: batch.approvedById,
      approvedAt: batch.approvedAt?.toISOString() ?? null,
      riskLevel: batch.riskLevel,
      riskReasons: batch.riskReasons,
      separateApproverRequired: batch.riskLevel === "HIGH",
      makerCheckerSatisfied:
        batch.riskLevel !== "HIGH" ||
        Boolean(batch.approvedById && batch.approvedById !== batch.uploadedById),
    },
    controls: {
      preCommitRecordCount: batch.preCommitRecordCount,
      postCommitRecordCount: batch.postCommitRecordCount,
      sourceRequiredFieldTotals: asNumberRecord(batch.sourceRequiredFieldTotals),
      destinationRequiredTotals: batch.destinationRequiredTotals
        ? asNumberRecord(batch.destinationRequiredTotals)
        : null,
      committedRecordCount: batch.committedRecordCount,
    },
    result: {
      committedRecordIds: batch.rows.flatMap((row) => row.committedRecordId ? [row.committedRecordId] : []),
      readiness,
    },
    controlBoundary: MASTER_DATA_ONBOARDING_CONTROL_BOUNDARY,
  }
}

async function refreshEvidence(organizationId: string, batchId: string) {
  const batch = await readBatch(organizationId, batchId)
  const manifest = buildMasterDataEvidenceManifest(batch)
  const evidenceHash = hashStablePayload(manifest)
  await controlDb.onboardingImportBatch.update({
    where: { id: batch.id },
    data: { evidenceManifest: manifest as Prisma.InputJsonValue, evidenceHash },
  })
  return { manifest, evidenceHash }
}

export async function stageMasterDataImport(input: {
  organizationId: string
  actorId: string
  target: MasterDataImportTarget
  sourceFilename: string
  sourceMimeType?: string
  content: string
  mappingVersion?: number
  now?: Date
}): Promise<MasterDataImportSummary> {
  const now = input.now ?? new Date()
  const byteSize = Buffer.byteLength(input.content, "utf8")
  if (!input.sourceFilename.toLowerCase().endsWith(".csv")) {
    throw new BusinessRuleError("Only CSV files are accepted for master-data onboarding")
  }
  if (byteSize === 0 || byteSize > MASTER_DATA_IMPORT_MAX_BYTES || input.content.includes("\u0000")) {
    throw new BusinessRuleError("The CSV is empty, oversized, or contains unsupported binary content")
  }

  const mapping = input.mappingVersion
    ? await controlDb.onboardingImportMapping.findFirst({
        where: {
          organizationId: input.organizationId,
          target: input.target,
          version: input.mappingVersion,
        },
      })
    : await getOrCreateDefaultMapping(input)
  if (!mapping) throw new NotFoundError("Onboarding import mapping not found")

  const contentHash = hashCsvContent(input.content)
  const replay = await controlDb.onboardingImportBatch.findUnique({
    where: {
      organizationId_target_contentHash_mappingVersion: {
        organizationId: input.organizationId,
        target: input.target,
        contentHash,
        mappingVersion: mapping.version,
      },
    },
    include: BATCH_INCLUDE,
  })
  if (replay) {
    const updated = await controlDb.onboardingImportBatch.update({
      where: { id: replay.id },
      data: { replayCount: { increment: 1 }, lastReplayedAt: now },
      include: BATCH_INCLUDE,
    })
    await refreshEvidence(input.organizationId, updated.id)
    return toSummary(await readBatch(input.organizationId, updated.id), true, input.actorId)
  }

  const fieldMap = asRecord(mapping.fieldMap) as MasterDataFieldMap
  const preliminary = analyzeMasterDataCsv({ target: input.target, content: input.content, fieldMap })
  const existingKeys = await existingBusinessKeys(
    input.organizationId,
    input.target,
    preliminary.rows.flatMap((row) => row.businessKey ? [row.businessKey] : []),
  )
  const analysis = analyzeMasterDataCsv({
    target: input.target,
    content: input.content,
    fieldMap,
    existingBusinessKeys: existingKeys,
  })
  const risk = classifyMasterDataImportRisk({ target: input.target, rows: analysis.rows })
  const status = analysis.issues.some((issue) => issue.severity === "ERROR") ? "BLOCKED" : "VALIDATED"
  const batch = await controlDb.onboardingImportBatch.create({
    data: {
      organizationId: input.organizationId,
      target: input.target,
      status,
      sourceFilename: input.sourceFilename.slice(0, 255),
      sourceMimeType: input.sourceMimeType?.slice(0, 100) || "text/csv",
      sourceByteSize: byteSize,
      contentHash,
      mappingId: mapping.id,
      mappingVersion: mapping.version,
      schemaVersion: mapping.schemaVersion,
      sourceRecordCount: analysis.sourceRecordCount,
      validRecordCount: analysis.validRecordCount,
      errorRecordCount: analysis.errorRecordCount,
      duplicateRecordCount: analysis.duplicateRecordCount,
      riskLevel: risk.level,
      riskReasons: risk.reasons,
      sourceRequiredFieldTotals: analysis.sourceRequiredFieldTotals,
      uploadedById: input.actorId,
      uploadedAt: now,
      validatedAt: now,
      retentionExpiresAt: retentionDate(now),
      rows: {
        create: analysis.rows.map((row) => ({
          organizationId: input.organizationId,
          rowNumber: row.rowNumber,
          sourceRowHash: row.sourceRowHash,
          businessKey: row.businessKey,
          normalizedData: row.normalizedData as Prisma.InputJsonValue,
          valid: row.valid,
        })),
      },
      issues: {
        create: analysis.issues.map((issue) => ({
          organizationId: input.organizationId,
          rowNumber: issue.rowNumber,
          field: issue.field,
          severity: issue.severity,
          code: issue.code,
          safeMessage: issue.safeMessage,
        })),
      },
    },
    include: BATCH_INCLUDE,
  })
  const approvalDigest = buildMasterDataApprovalDigest(batch)
  await controlDb.onboardingImportBatch.update({ where: { id: batch.id }, data: { approvalDigest } })
  await upsertMilestone({
    organizationId: input.organizationId,
    target: input.target,
    state: status === "BLOCKED" ? "BLOCKED" : "IMPORTED",
    batchId: batch.id,
    sourceRecordCount: batch.sourceRecordCount,
    committedCount: 0,
    blockerCount: batch.errorRecordCount,
  })
  await refreshEvidence(input.organizationId, batch.id)
  return toSummary(await readBatch(input.organizationId, batch.id), false, input.actorId)
}

export async function approveMasterDataImport(input: {
  organizationId: string
  batchId: string
  expectedTarget: MasterDataImportTarget
  actorId: string
  expectedApprovalDigest: string
  now?: Date
}) {
  const batch = await readBatch(input.organizationId, input.batchId)
  if (batch.target !== input.expectedTarget) {
    throw new BusinessRuleError("The batch target does not match the approved command scope")
  }
  const digest = buildMasterDataApprovalDigest(batch)
  if (input.expectedApprovalDigest !== digest || batch.approvalDigest !== digest) {
    throw new BusinessRuleError("The dry-run evidence changed; review the current validation before approval")
  }
  if (batch.status === "APPROVED" || batch.status === "COMMITTING" || batch.status === "COMMITTED") {
    return toSummary(batch, true)
  }
  if (batch.status !== "VALIDATED" || batch.errorRecordCount > 0 || batch.validRecordCount !== batch.sourceRecordCount) {
    throw new BusinessRuleError("Only a fully valid dry run can be approved")
  }
  if (batch.riskLevel === "HIGH" && batch.uploadedById === input.actorId) {
    throw new BusinessRuleError("A high-risk onboarding batch requires approval by a different authorized user")
  }
  const updated = await controlDb.onboardingImportBatch.update({
    where: { id: batch.id },
    data: {
      status: "APPROVED",
      approvalDigest: digest,
      approvedById: input.actorId,
      approvedAt: input.now ?? new Date(),
      lastSafeErrorCode: null,
    },
    include: BATCH_INCLUDE,
  })
  await refreshEvidence(input.organizationId, batch.id)
  return toSummary(await readBatch(input.organizationId, updated.id), false, input.actorId)
}

async function countDomainRecords(organizationId: string, target: MasterDataImportTarget) {
  if (target === "CUSTOMER") return db.customer.count({ where: { organizationId, deletedAt: null } })
  if (target === "SUPPLIER") return db.supplier.count({ where: { organizationId, deletedAt: null } })
  return db.item.count({ where: { organizationId, deletedAt: null } })
}

type ExistingDomainRecord = { id: string; businessKey: string; requiredName: string }

async function findExistingDomainRecord(
  organizationId: string,
  target: MasterDataImportTarget,
  businessKey: string,
): Promise<ExistingDomainRecord | null> {
  if (target === "CUSTOMER") {
    const row = await db.customer.findFirst({
      where: { organizationId, deletedAt: null, code: { equals: businessKey, mode: "insensitive" } },
      select: { id: true, code: true, name: true },
    })
    return row?.code ? { id: row.id, businessKey: row.code, requiredName: row.name } : null
  }
  if (target === "SUPPLIER") {
    const row = await db.supplier.findFirst({
      where: { organizationId, deletedAt: null, code: { equals: businessKey, mode: "insensitive" } },
      select: { id: true, code: true, name: true },
    })
    return row?.code ? { id: row.id, businessKey: row.code, requiredName: row.name } : null
  }
  const row = await db.item.findFirst({
    where: { organizationId, deletedAt: null, sku: { equals: businessKey, mode: "insensitive" } },
    select: { id: true, sku: true, nameEn: true },
  })
  return row ? { id: row.id, businessKey: row.sku, requiredName: row.nameEn } : null
}

function attemptedRecordMatches(
  target: MasterDataImportTarget,
  record: ExistingDomainRecord,
  data: Record<string, unknown>,
) {
  const keyField = MASTER_DATA_TARGET_CONFIG[target].businessKey
  const nameField = target === "ITEM" ? "nameEn" : "name"
  return (
    normalizeBusinessKey(record.businessKey) === normalizeBusinessKey(String(data[keyField] ?? "")) &&
    record.requiredName.trim() === String(data[nameField] ?? "").trim()
  )
}

async function createThroughDomainOwner(input: {
  organizationId: string
  actorId: string
  target: MasterDataImportTarget
  data: Record<string, unknown>
}) {
  const validated = parseMasterDataDomainRow(input.target, input.data)
  if (!validated.success) throw new BusinessRuleError("A staged row no longer matches the domain schema")
  if (input.target === "CUSTOMER") {
    return createCustomer(input.organizationId, validated.data as CustomerCreateInput)
  }
  if (input.target === "SUPPLIER") {
    return createSupplier(input.organizationId, validated.data as SupplierCreateInput)
  }
  const itemData = validated.data as ItemCreateInput
  const safeItemData: ItemCreateInput = {
    nameEn: itemData.nameEn,
    nameFr: itemData.nameFr,
    descriptionEn: itemData.descriptionEn,
    descriptionFr: itemData.descriptionFr,
    sku: itemData.sku,
    costPrice: itemData.costPrice,
    sellingPrice: itemData.sellingPrice,
  }
  return createItem(input.organizationId, input.actorId, safeItemData)
}

async function destinationRequiredTotals(input: {
  organizationId: string
  target: MasterDataImportTarget
  recordIds: string[]
}) {
  const config = MASTER_DATA_TARGET_CONFIG[input.target]
  const totals = Object.fromEntries(config.requiredFields.map((field) => [field, 0]))
  if (input.target === "CUSTOMER") {
    const rows = await db.customer.findMany({
      where: { organizationId: input.organizationId, id: { in: input.recordIds }, deletedAt: null },
      select: { code: true, name: true },
    })
    for (const row of rows) {
      if (row.code?.trim()) totals.code += 1
      if (row.name.trim()) totals.name += 1
    }
    return totals
  }
  if (input.target === "SUPPLIER") {
    const rows = await db.supplier.findMany({
      where: { organizationId: input.organizationId, id: { in: input.recordIds }, deletedAt: null },
      select: { code: true, name: true },
    })
    for (const row of rows) {
      if (row.code?.trim()) totals.code += 1
      if (row.name.trim()) totals.name += 1
    }
    return totals
  }
  const rows = await db.item.findMany({
    where: { organizationId: input.organizationId, id: { in: input.recordIds }, deletedAt: null },
    select: { sku: true, nameEn: true },
  })
  for (const row of rows) {
    if (row.sku.trim()) totals.sku += 1
    if (row.nameEn.trim()) totals.nameEn += 1
  }
  return totals
}

async function markCommitBlocked(batch: ImportBatchRecord, code: string) {
  await controlDb.onboardingImportBatch.update({
    where: { id: batch.id },
    data: { status: "APPROVED", lastSafeErrorCode: code },
  })
  const committedCount = await controlDb.onboardingImportRow.count({
    where: { batchId: batch.id, organizationId: batch.organizationId, committedRecordId: { not: null } },
  })
  await upsertMilestone({
    organizationId: batch.organizationId,
    target: batch.target as MasterDataImportTarget,
    state: "BLOCKED",
    batchId: batch.id,
    sourceRecordCount: batch.sourceRecordCount,
    committedCount,
    blockerCount: 1,
  })
  await refreshEvidence(batch.organizationId, batch.id)
}

export async function commitMasterDataImport(input: {
  organizationId: string
  batchId: string
  expectedTarget: MasterDataImportTarget
  actorId: string
  expectedApprovalDigest: string
  now?: Date
}) {
  const now = input.now ?? new Date()
  let batch = await readBatch(input.organizationId, input.batchId)
  if (batch.target !== input.expectedTarget) {
    throw new BusinessRuleError("The batch target does not match the commit command scope")
  }
  const digest = buildMasterDataApprovalDigest(batch)
  if (input.expectedApprovalDigest !== digest || batch.approvalDigest !== digest || !batch.approvedAt) {
    throw new BusinessRuleError("Commit requires the current explicit approval")
  }
  if (batch.riskLevel === "HIGH" && batch.approvedById === batch.uploadedById) {
    throw new BusinessRuleError("A high-risk onboarding batch requires a separate approver before commit")
  }
  if (batch.status === "COMMITTED") return toSummary(batch, true, input.actorId)
  if (batch.status === "COMMITTING") {
    const stale = !batch.commitStartedAt || now.getTime() - batch.commitStartedAt.getTime() > 5 * 60 * 1_000
    if (!stale) return toSummary(batch, true, input.actorId)
    await controlDb.onboardingImportBatch.update({ where: { id: batch.id }, data: { status: "APPROVED" } })
    batch = await readBatch(input.organizationId, input.batchId)
  }
  if (batch.status !== "APPROVED") throw new BusinessRuleError("Only an approved import can be committed")

  const preCommitRecordCount = batch.preCommitRecordCount ?? await countDomainRecords(input.organizationId, batch.target as MasterDataImportTarget)
  const claim = await controlDb.onboardingImportBatch.updateMany({
    where: { id: batch.id, organizationId: input.organizationId, status: "APPROVED" },
    data: {
      status: "COMMITTING",
      commitStartedAt: now,
      preCommitRecordCount,
      lastSafeErrorCode: null,
    },
  })
  if (claim.count !== 1) return toSummary(await readBatch(input.organizationId, batch.id), true, input.actorId)

  batch = await readBatch(input.organizationId, input.batchId)
  for (const row of batch.rows.filter((candidate) => candidate.valid && !candidate.committedRecordId)) {
    const data = asRecord(row.normalizedData)
    if (!row.businessKey) {
      await markCommitBlocked(batch, "STAGED_KEY_MISSING")
      throw new BusinessRuleError("A staged row is missing its replay key")
    }
    await controlDb.onboardingImportRow.update({ where: { id: row.id }, data: { commitAttemptedAt: now } })
    try {
      const existing = await findExistingDomainRecord(input.organizationId, batch.target as MasterDataImportTarget, row.businessKey)
      let recordId: string
      if (existing) {
        if (!row.commitAttemptedAt || !attemptedRecordMatches(batch.target as MasterDataImportTarget, existing, data)) {
          throw new BusinessRuleError("A target key was claimed after approval")
        }
        recordId = existing.id
      } else {
        const created = await createThroughDomainOwner({
          organizationId: input.organizationId,
          actorId: input.actorId,
          target: batch.target as MasterDataImportTarget,
          data,
        })
        recordId = created.id
      }
      await controlDb.onboardingImportRow.update({
        where: { id: row.id },
        data: { committedRecordId: recordId, committedAt: now },
      })
    } catch {
      const existing = await findExistingDomainRecord(input.organizationId, batch.target as MasterDataImportTarget, row.businessKey)
      if (row.commitAttemptedAt && existing && attemptedRecordMatches(batch.target as MasterDataImportTarget, existing, data)) {
        await controlDb.onboardingImportRow.update({
          where: { id: row.id },
          data: { committedRecordId: existing.id, committedAt: now },
        })
        continue
      }
      await markCommitBlocked(batch, "DOMAIN_WRITE_RETRY_REQUIRED")
      throw new BusinessRuleError("The import paused safely; replay the approved batch after resolving the target conflict")
    }
  }

  batch = await readBatch(input.organizationId, input.batchId)
  const committedRecordIds = batch.rows.flatMap((row) => row.committedRecordId ? [row.committedRecordId] : [])
  const postCommitRecordCount = await countDomainRecords(input.organizationId, batch.target as MasterDataImportTarget)
  const requiredTotals = await destinationRequiredTotals({
    organizationId: input.organizationId,
    target: batch.target as MasterDataImportTarget,
    recordIds: committedRecordIds,
  })
  const recordCountReconciles = postCommitRecordCount === preCommitRecordCount + committedRecordIds.length
  const requiredTotalsReconcile = Object.values(requiredTotals).every((count) => count === committedRecordIds.length)
  const committed = recordCountReconciles && requiredTotalsReconcile && committedRecordIds.length === batch.sourceRecordCount
  await controlDb.onboardingImportBatch.update({
    where: { id: batch.id },
    data: {
      status: committed ? "COMMITTED" : "BLOCKED",
      postCommitRecordCount,
      destinationRequiredTotals: requiredTotals,
      committedRecordCount: committedRecordIds.length,
      committedAt: committed ? now : null,
      lastSafeErrorCode: committed ? null : "CONTROL_TOTAL_MISMATCH",
    },
  })
  await upsertMilestone({
    organizationId: input.organizationId,
    target: batch.target as MasterDataImportTarget,
    state: committed ? "RECONCILED" : "BLOCKED",
    batchId: batch.id,
    sourceRecordCount: batch.sourceRecordCount,
    committedCount: committedRecordIds.length,
    blockerCount: committed ? 0 : 1,
  })
  await refreshEvidence(input.organizationId, batch.id)
  return toSummary(await readBatch(input.organizationId, batch.id), false, input.actorId)
}

export async function getMasterDataImportEvidence(
  organizationId: string,
  batchId: string,
  expectedTarget: MasterDataImportTarget,
) {
  const batch = await readBatch(organizationId, batchId)
  if (batch.target !== expectedTarget) {
    throw new BusinessRuleError("The batch target does not match the evidence command scope")
  }
  const manifest = batch.evidenceManifest ?? buildMasterDataEvidenceManifest(batch)
  return { manifest, evidenceHash: batch.evidenceHash ?? hashStablePayload(manifest) }
}

export async function waiveMasterDataReadiness(input: {
  organizationId: string
  target: MasterDataImportTarget
  actorId: string
  reason: string
  now?: Date
}) {
  const reason = input.reason.trim()
  if (reason.length < 10 || reason.length > 500) {
    throw new BusinessRuleError("A waiver reason between 10 and 500 characters is required")
  }
  const now = input.now ?? new Date()
  return controlDb.onboardingReadinessMilestone.upsert({
    where: { organizationId_target: { organizationId: input.organizationId, target: input.target } },
    create: {
      organizationId: input.organizationId,
      target: input.target,
      state: "WAIVED",
      waivedById: input.actorId,
      waivedAt: now,
      waiverReason: reason,
    },
    update: {
      state: "WAIVED",
      waivedById: input.actorId,
      waivedAt: now,
      waiverReason: reason,
    },
  })
}

function overallReadiness(states: MasterDataOnboardingDashboard["milestones"][number]["state"][]) {
  if (states.includes("BLOCKED")) return "BLOCKED" as const
  if (states.every((state) => state === "RECONCILED" || state === "WAIVED")) {
    return states.every((state) => state === "WAIVED") ? "WAIVED" as const : "RECONCILED" as const
  }
  if (states.some((state) => state === "IMPORTED" || state === "RECONCILED" || state === "WAIVED")) {
    return "IMPORTED" as const
  }
  return "NOT_STARTED" as const
}

export async function getMasterDataOnboardingDashboard(
  organizationId: string,
  allowedTargets: readonly MasterDataImportTarget[] = MASTER_DATA_IMPORT_TARGETS,
  currentActorId?: string,
): Promise<MasterDataOnboardingDashboard> {
  const targets = MASTER_DATA_IMPORT_TARGETS.filter((target) => allowedTargets.includes(target))
  const [storedMilestones, recentBatches] = await Promise.all([
    controlDb.onboardingReadinessMilestone.findMany({
      where: { organizationId, target: { in: targets } },
    }),
    controlDb.onboardingImportBatch.findMany({
      where: { organizationId, target: { in: targets } },
      include: BATCH_INCLUDE,
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
  ])
  const byTarget = new Map(storedMilestones.map((milestone) => [milestone.target, milestone]))
  const milestones = targets.map((target) => {
    const milestone = byTarget.get(target)
    return {
      target,
      state: (milestone?.state ?? "NOT_STARTED") as MasterDataOnboardingDashboard["milestones"][number]["state"],
      evidenceBatchId: milestone?.evidenceBatchId ?? null,
      sourceRecordCount: milestone?.sourceRecordCount ?? 0,
      committedCount: milestone?.committedCount ?? 0,
      blockerCount: milestone?.blockerCount ?? 0,
      waivedAt: milestone?.waivedAt?.toISOString() ?? null,
      waiverReason: milestone?.waiverReason ?? null,
    }
  })
  const highRiskBatches = recentBatches.filter((batch) => batch.riskLevel === "HIGH")
  return {
    organizationId,
    overallState: overallReadiness(milestones.map((milestone) => milestone.state)),
    generatedAt: new Date().toISOString(),
    milestones,
    recentBatches: recentBatches.map((batch) => toSummary(batch, false, currentActorId)),
    adoption: {
      evidenceWindow: "RECENT_12_BATCHES",
      batchCount: recentBatches.length,
      committedBatchCount: recentBatches.filter((batch) => batch.status === "COMMITTED").length,
      blockedBatchCount: recentBatches.filter((batch) => batch.status === "BLOCKED").length,
      highRiskBatchCount: highRiskBatches.length,
      separatelyApprovedHighRiskBatchCount: highRiskBatches.filter(
        (batch) => Boolean(batch.approvedById && batch.approvedById !== batch.uploadedById),
      ).length,
      stagedRecordCount: recentBatches.reduce((total, batch) => total + batch.sourceRecordCount, 0),
      committedRecordCount: recentBatches.reduce((total, batch) => total + batch.committedRecordCount, 0),
      rejectedRecordCount: recentBatches.reduce((total, batch) => total + batch.errorRecordCount, 0),
      duplicateRecordCount: recentBatches.reduce((total, batch) => total + batch.duplicateRecordCount, 0),
    },
    controlBoundary: MASTER_DATA_ONBOARDING_CONTROL_BOUNDARY,
  }
}
