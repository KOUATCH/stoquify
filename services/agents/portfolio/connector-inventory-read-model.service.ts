import { createHash } from "node:crypto"

import {
  type Prisma,
} from "@prisma/client"
import {
  PaymentReconciliationInboxStatus,
  ProviderAccountStatus,
  ProviderEventStatus,
  ReconciliationRunStatus,
  StatementFileStatus,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { evaluateConnectorHealth, type ConnectorHealthResult } from "./connector-health.service"
import { type EvidenceGrade } from "@/services/evidence/evidence-contracts"
import { assertPortfolioAccess, type PortfolioRelianceIntent } from "./evidence-trust.contracts"

const DEFAULT_FRESHNESS_SLA_MINUTES = 72 * 60
const DEFAULT_LIMIT = 100

type DbClient = typeof db | Prisma.TransactionClient

type ProviderInventoryEventRow = {
  id: string
  providerAccountId: string
  status: ProviderEventStatus
  receivedAt: Date
  processedAt: Date | null
  signatureValid: boolean
}

type ProviderInventoryStatementRow = {
  id: string
  providerAccountId: string
  status: StatementFileStatus
  fileHash: string
  importedAt: Date
}

type ProviderInventoryReconciliationRunRow = {
  id: string
  providerAccountId: string
  status: ReconciliationRunStatus
  updatedAt: Date
  metadata: Prisma.JsonValue
}

type ProviderInventoryInboxItemRow = {
  id: string
  providerAccountId: string | null
  status: PaymentReconciliationInboxStatus
}

export type ConnectorInventoryInput = {
  trustedOrganizationId: string
  organizationId: string
  actorAuthorized: boolean
  correlationId: string
  asOf?: string
  defaultFreshnessSlaMinutes?: number
  limit?: number
  intent?: PortfolioRelianceIntent
}

type ConnectorEvidenceRow = {
  connectorId: string
  providerCode: string
  displayName: string
  status: ProviderAccountStatus
  providerKind: string
  connectorState: ConnectorHealthResult["state"]
  reasons: string[]
  evidenceGrade: EvidenceGrade
  evidenceAvailable: boolean
  evidenceRelianceDecision: ConnectorHealthResult["reliance"]
  findings: ConnectorHealthResult["findings"]
  risk: ConnectorHealthResult["risk"]
  credential: ConnectorHealthResult["credential"]
  drift: ConnectorHealthResult["drift"]
  mayReplayDeadLettersAutomatically: false
  ageMinutes: number | null
  freshnessSlaMinutes: number
  observedAt: string
  lastSuccessfulSyncAt: string | null
  latestEventAt: string | null
  gapCount: number
  duplicateCount: number
  deadLetterCount: number
  staleStatementCount: number
  openReconciliationRun: boolean
  lastReconciliationRunStatus: string | null
}

export type ConnectorInventoryReadModel = {
  organizationId: string
  asOf: string
  summary: {
    totalConnectors: number
    activeConnectors: number
    healthy: number
    degraded: number
    blocked: number
    connectorsWithGaps: number
    connectorsWithDeadLetters: number
    staleStatements: number
    openReconciliationRuns: number
    credentialWarnings: number
    worseningDrift: number
    highRiskConnectors: number
    criticalRiskConnectors: number
  }
  connectors: ConnectorEvidenceRow[]
  redaction: {
    policy: string
    rawPayloadsIncluded: false
    credentialSecretsIncluded: false
  }
  sourceScope: {
    limit: number
    freshnessSlaMinutes: number
  }
}

export async function getConnectorInventoryReadModel(
  input: ConnectorInventoryInput,
  client: DbClient = db,
): Promise<ConnectorInventoryReadModel> {
  const parsed = normalizeInput(input)
  assertPortfolioAccess({
    trustedOrganizationId: parsed.trustedOrganizationId,
    evidenceOrganizationId: parsed.organizationId,
    actorAuthorized: parsed.actorAuthorized,
    correlationId: parsed.correlationId,
  })

  const providerAccounts = await client.providerAccount.findMany({
    where: { organizationId: parsed.organizationId, archivedAt: null },
    orderBy: { providerCode: "asc" },
    take: parsed.limit,
    select: {
      id: true,
      providerCode: true,
      displayName: true,
      status: true,
      countryCode: true,
      currencyCode: true,
      statementSource: true,
      metadata: true,
      updatedAt: true,
      paymentRail: { select: { code: true } },
    },
  })

  if (providerAccounts.length === 0) {
    return {
      organizationId: parsed.organizationId,
      asOf: parsed.asOf.toISOString(),
      summary: {
        totalConnectors: 0,
        activeConnectors: 0,
        healthy: 0,
        degraded: 0,
        blocked: 0,
        connectorsWithGaps: 0,
        connectorsWithDeadLetters: 0,
        staleStatements: 0,
        openReconciliationRuns: 0,
        credentialWarnings: 0,
        worseningDrift: 0,
        highRiskConnectors: 0,
        criticalRiskConnectors: 0,
      },
      connectors: [],
      redaction: {
        policy: "portfolio.connector-inventory-redacted",
        rawPayloadsIncluded: false,
        credentialSecretsIncluded: false,
      },
      sourceScope: {
        limit: parsed.limit,
        freshnessSlaMinutes: parsed.defaultFreshnessSlaMinutes,
      },
    }
  }

  const connectorIds = providerAccounts.map((account) => account.id)
  const events = (await client.providerEvent.findMany({
    where: { organizationId: parsed.organizationId, providerAccountId: { in: connectorIds } },
    orderBy: { receivedAt: "desc" },
    select: {
      id: true,
      providerAccountId: true,
      status: true,
      receivedAt: true,
      processedAt: true,
      signatureValid: true,
    } as const,
  })) as ProviderInventoryEventRow[]
  const statementFiles = (await client.statementFile.findMany({
    where: { organizationId: parsed.organizationId, providerAccountId: { in: connectorIds }, archivedAt: null },
    orderBy: { importedAt: "desc" },
    select: {
      id: true,
      providerAccountId: true,
      status: true,
      fileHash: true,
      importedAt: true,
    } as const,
  })) as ProviderInventoryStatementRow[]
  const reconciliationRuns = (await client.reconciliationRun.findMany({
    where: { organizationId: parsed.organizationId, providerAccountId: { in: connectorIds }, voidedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      providerAccountId: true,
      status: true,
      updatedAt: true,
      metadata: true,
    } as const,
  })) as ProviderInventoryReconciliationRunRow[]
  const inboxItems = (await client.paymentReconciliationInboxItem.findMany({
    where: { organizationId: parsed.organizationId, providerAccountId: { in: connectorIds } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      providerAccountId: true,
      status: true,
    } as const,
  })) as ProviderInventoryInboxItemRow[]

  const eventsByConnector = groupByProviderField(events)
  const statementsByConnector = groupByProviderField(statementFiles)
  const runsByConnector = groupByProviderField(reconciliationRuns)
  const inboxByConnector = groupByProviderField(inboxItems)

  const connectorRows: ConnectorEvidenceRow[] = providerAccounts.map((account) => {
    const accountEvents = eventsByConnector.get(account.id) ?? []
    const accountStatements = statementsByConnector.get(account.id) ?? []
    const accountRuns = runsByConnector.get(account.id) ?? []
    const accountInbox = inboxByConnector.get(account.id) ?? []

    const latestEvent = accountEvents[0] ?? null
    const latestStatement = accountStatements[0] ?? null
    const latestRun = accountRuns[0] ?? null

    const latestSync = latestSuccessfulSync(accountEvents)
    const gaps = countGaps(accountEvents)
    const duplicateCount = countDuplicates(accountEvents)
    const deadLetterCount = accountInbox.filter((item) => item.status === PaymentReconciliationInboxStatus.DEAD_LETTER).length
    const staleStatements = countStaleStatements(accountStatements, parsed.asOf)

    const openRunStatuses = new Set<ReconciliationRunStatus>([
      ReconciliationRunStatus.RUNNING,
      ReconciliationRunStatus.NEEDS_REVIEW,
      ReconciliationRunStatus.BLOCKED,
      ReconciliationRunStatus.FAILED,
    ])
    const openRun = Boolean(latestRun && openRunStatuses.has(latestRun.status))

    const latestSignatureValid =
      latestEvent?.signatureValid === false ? false : latestEvent?.signatureValid ?? null
    const freshnessSlaMinutes = readConnectorFreshnessSlaMinutes(account.metadata) ?? parsed.defaultFreshnessSlaMinutes
    const healthBaseline = readConnectorHealthBaseline(account.metadata)
    const credentialWarningWindowDays = readCredentialWarningWindowDays(account.metadata) ?? 14
    const observedAt = latestEvent?.receivedAt ?? account.updatedAt
    const evidenceGrade = account.status === ProviderAccountStatus.ACTIVE ? "operational" : "blocked"
    const sourceHash = `sha256:${createHash("sha256")
      .update(
        JSON.stringify({
          connectorId: account.id,
          latestEventId: latestEvent ? latestEvent.id : null,
          latestStatementId: latestStatement ? latestStatement.id : null,
          latestRunId: latestRun ? latestRun.id : null,
          asOf: parsed.asOf.toISOString(),
        }),
      )
      .digest("hex")}`

    const health = evaluateConnectorHealth(
      {
        trustedOrganizationId: parsed.trustedOrganizationId,
        organizationId: parsed.organizationId,
        actorAuthorized: parsed.actorAuthorized,
        correlationId: `${parsed.correlationId}:${account.id}`,
        connectorId: account.id,
        connectorKind: account.paymentRail.code,
        sourceReference: account.id,
        sourceHash,
        observedAt: observedAt.toISOString(),
        evaluatedAt: parsed.asOf.toISOString(),
        lastSuccessfulSyncAt: latestSync?.toISOString() ?? null,
        freshnessSlaMinutes,
        credentialExpiresAt: readCredentialExpiresAt(account.metadata),
        previousCredentialExpiresAt: healthBaseline.credentialExpiresAt,
        signatureValid: latestSignatureValid,
        schemaDriftDetected: readSchemaDriftDetected(account.metadata),
        gapCount: gaps,
        duplicateCount,
        deadLetterCount,
        previousGapCount: healthBaseline.gapCount,
        previousDeadLetterCount: healthBaseline.deadLetterCount,
        credentialWarningWindowDays,
        evidenceGrade,
      },
      parsed.intent,
    )

    return {
      connectorId: account.id,
      providerCode: account.providerCode,
      displayName: account.displayName,
      status: account.status,
      providerKind: account.paymentRail.code,
      connectorState: health.state,
      reasons: health.reasons,
      evidenceGrade: health.evidence.evidenceGrade,
      evidenceAvailable: health.evidence.available,
      evidenceRelianceDecision: health.reliance,
      findings: health.findings,
      risk: health.risk,
      credential: health.credential,
      drift: health.drift,
      mayReplayDeadLettersAutomatically: health.mayReplayDeadLettersAutomatically,
      ageMinutes: health.ageMinutes,
      freshnessSlaMinutes,
      observedAt: observedAt.toISOString(),
      lastSuccessfulSyncAt: latestSync?.toISOString() ?? null,
      latestEventAt: latestEvent?.receivedAt.toISOString() ?? null,
      gapCount: gaps,
      duplicateCount,
      deadLetterCount,
      staleStatementCount: staleStatements,
      openReconciliationRun: openRun,
      lastReconciliationRunStatus: latestRun ? latestRun.status : null,
    }
  })

  return {
    organizationId: parsed.organizationId,
    asOf: parsed.asOf.toISOString(),
    summary: summarizeConnectorInventory(connectorRows),
    connectors: connectorRows,
    redaction: {
      policy: "portfolio.connector-inventory-redacted",
      rawPayloadsIncluded: false,
      credentialSecretsIncluded: false,
    },
    sourceScope: {
      limit: parsed.limit,
      freshnessSlaMinutes: parsed.defaultFreshnessSlaMinutes,
    },
  }
}

function normalizeInput(input: ConnectorInventoryInput) {
  if (!input.trustedOrganizationId || !input.organizationId || !input.correlationId) {
    throw new Error("Connector inventory requires trustedOrganizationId, organizationId and correlationId.")
  }
  const parsedAsOf = new Date(input.asOf ?? new Date())
  if (Number.isNaN(parsedAsOf.getTime())) {
    throw new Error("Connector inventory asOf must be a valid timestamp.")
  }
  const defaultFreshnessSlaMinutes = input.defaultFreshnessSlaMinutes ?? DEFAULT_FRESHNESS_SLA_MINUTES
  if (!Number.isInteger(defaultFreshnessSlaMinutes) || defaultFreshnessSlaMinutes <= 0) {
    throw new Error("Connector inventory freshness SLA must be a positive integer.")
  }
  const limit = input.limit ?? DEFAULT_LIMIT
  if (!Number.isInteger(limit) || limit <= 0 || limit > 1000) {
    throw new Error("Connector inventory limit must be an integer between 1 and 1000.")
  }

  return {
    trustedOrganizationId: input.trustedOrganizationId,
    organizationId: input.organizationId,
    actorAuthorized: input.actorAuthorized,
    correlationId: input.correlationId,
    asOf: parsedAsOf,
    defaultFreshnessSlaMinutes,
    limit,
    intent: input.intent ?? "read",
  }
}

function latestSuccessfulSync(events: Array<{ status: ProviderEventStatus; processedAt: Date | null; receivedAt: Date }>) {
  return events.find((event) =>
    event.status === ProviderEventStatus.PROCESSED || event.status === ProviderEventStatus.VERIFIED,
  )?.receivedAt
}

function countGaps(events: Array<{ status: ProviderEventStatus; processedAt: Date | null }>) {
  return events.filter((event) => event.status === ProviderEventStatus.RECEIVED && event.processedAt === null).length
}

function countDuplicates(events: Array<{ status: ProviderEventStatus }>) {
  return events.filter(
    (event) => event.status === ProviderEventStatus.TAMPERED || event.status === ProviderEventStatus.REPLAYED,
  ).length
}

function countStaleStatements(
  statementFiles: Array<{ status: StatementFileStatus; importedAt: Date }>,
  asOf: Date,
) {
  const staleBefore = new Date(asOf)
  staleBefore.setHours(staleBefore.getHours() - 72)
  return statementFiles.filter((file) => file.status === StatementFileStatus.REJECTED || file.importedAt < staleBefore).length
}

function summarizeConnectorInventory(connectors: ConnectorEvidenceRow[]) {
  const activeConnectors = connectors.filter((connector) => connector.status === ProviderAccountStatus.ACTIVE).length
  return {
    totalConnectors: connectors.length,
    activeConnectors,
    healthy: connectors.filter((connector) => connector.connectorState === "HEALTHY").length,
    degraded: connectors.filter((connector) => connector.connectorState === "DEGRADED").length,
    blocked: connectors.filter((connector) => connector.connectorState === "BLOCKED").length,
    connectorsWithGaps: connectors.filter((connector) => connector.gapCount > 0).length,
    connectorsWithDeadLetters: connectors.filter((connector) => connector.deadLetterCount > 0).length,
    staleStatements: connectors.reduce((total, connector) => total + connector.staleStatementCount, 0),
    openReconciliationRuns: connectors.filter((connector) => connector.openReconciliationRun).length,
    credentialWarnings: connectors.filter((connector) => connector.credential.warning).length,
    worseningDrift: connectors.filter((connector) => connector.drift.worsening).length,
    highRiskConnectors: connectors.filter((connector) => connector.risk.level === "HIGH").length,
    criticalRiskConnectors: connectors.filter((connector) => connector.risk.level === "CRITICAL").length,
  }
}

function groupByProviderField<T extends { providerAccountId: string | null }>(rows: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>()
  for (const row of rows) {
    const connectorId = row.providerAccountId
    if (!connectorId) continue
    const bucket = grouped.get(connectorId)
    if (bucket) {
      bucket.push(row)
    } else {
      grouped.set(connectorId, [row])
    }
  }
  return grouped
}

function readConnectorFreshnessSlaMinutes(metadata: Prisma.JsonValue | null): number | null {
  const record = metadataRecord(metadata)
  const value = record?.connectorFreshnessSlaMinutes
  if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) return null
  return value
}

function readCredentialExpiresAt(metadata: Prisma.JsonValue | null): string | null {
  const record = metadataRecord(metadata)
  const value = record?.credentialExpiresAt
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function readCredentialWarningWindowDays(metadata: Prisma.JsonValue | null): number | null {
  const record = metadataRecord(metadata)
  const value = record?.credentialWarningWindowDays
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 180) return null
  return value
}

function readSchemaDriftDetected(metadata: Prisma.JsonValue | null): boolean {
  const record = metadataRecord(metadata)
  return record?.schemaDriftDetected === true
}

function readConnectorHealthBaseline(metadata: Prisma.JsonValue | null) {
  const record = metadataRecord(metadata)
  const baseline = record?.connectorHealthBaseline
  if (!baseline || typeof baseline !== "object" || Array.isArray(baseline)) {
    return { gapCount: null, deadLetterCount: null, credentialExpiresAt: null }
  }
  const baselineRecord = baseline as Record<string, unknown>
  return {
    gapCount: readOptionalNonNegativeInteger(baselineRecord.gapCount),
    deadLetterCount: readOptionalNonNegativeInteger(baselineRecord.deadLetterCount),
    credentialExpiresAt: readOptionalDateString(baselineRecord.credentialExpiresAt),
  }
}

function readOptionalNonNegativeInteger(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) return null
  return value
}

function readOptionalDateString(value: unknown): string | null {
  if (typeof value !== "string") return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

function metadataRecord(metadata: Prisma.JsonValue | null): Record<string, unknown> | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null
  return metadata as Record<string, unknown>
}
