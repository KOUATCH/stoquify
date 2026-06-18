import { createHash } from "crypto"

import {
  ComplianceEvidenceSource,
  ComplianceEvidenceType,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import { BusinessRuleError } from "@/services/_shared/action-errors"

type DbClient = Prisma.TransactionClient | typeof db

type RecordComplianceEvidenceInput = {
  organizationId: string
  fiscalDocumentId?: string | null
  submissionId?: string | null
  evidenceType: ComplianceEvidenceType
  source: ComplianceEvidenceSource
  payload?: Prisma.InputJsonValue | null
  redactedPayload?: Prisma.InputJsonValue | null
  artifactHash?: string | null
  storageUri?: string | null
  authorityReference?: string | null
  legalRef?: string | null
  capturedById?: string | null
  metadata?: Prisma.InputJsonValue | null
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    )
  }
  return value
}

export function hashComplianceArtifact(value: unknown) {
  return `sha256:${createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`
}

function resolveEvidenceArtifactHash(input: RecordComplianceEvidenceInput) {
  return (
    input.artifactHash ||
    hashComplianceArtifact({
      evidenceType: input.evidenceType,
      payload: input.payload,
      redactedPayload: input.redactedPayload,
      storageUri: input.storageUri,
      authorityReference: input.authorityReference,
    })
  )
}

export async function recordComplianceEvidence(
  input: RecordComplianceEvidenceInput,
  client: DbClient = db,
) {
  if (!input.fiscalDocumentId && !input.submissionId) {
    throw new BusinessRuleError(
      "Compliance evidence must be linked to a fiscal document or submission.",
    )
  }

  const artifactHash = resolveEvidenceArtifactHash(input)

  return client.complianceEvidence.create({
    data: {
      organizationId: input.organizationId,
      fiscalDocumentId: input.fiscalDocumentId ?? null,
      submissionId: input.submissionId ?? null,
      evidenceType: input.evidenceType,
      source: input.source,
      artifactHash,
      payload: input.payload ?? undefined,
      redactedPayload: input.redactedPayload ?? undefined,
      storageUri: input.storageUri ?? null,
      authorityReference: input.authorityReference ?? null,
      legalRef: input.legalRef ?? null,
      capturedById: input.capturedById ?? null,
      metadata: input.metadata ?? undefined,
    },
  })
}

export async function recordComplianceEvidenceOnce(
  input: RecordComplianceEvidenceInput,
  client: DbClient = db,
) {
  if (!input.fiscalDocumentId && !input.submissionId) {
    throw new BusinessRuleError(
      "Compliance evidence must be linked to a fiscal document or submission.",
    )
  }

  const artifactHash = resolveEvidenceArtifactHash(input)
  const existing = await client.complianceEvidence.findFirst({
    where: {
      organizationId: input.organizationId,
      evidenceType: input.evidenceType,
      artifactHash,
    },
  })

  if (existing) return existing

  return recordComplianceEvidence({ ...input, artifactHash }, client)
}
