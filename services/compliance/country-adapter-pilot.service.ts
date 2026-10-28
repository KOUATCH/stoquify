import {
  ComplianceAdapterConfigStatus,
  ComplianceAdapterEnvironment,
  ComplianceAdapterReviewStatus,
  Prisma,
} from "@prisma/client"

import { db } from "@/prisma/db"
import {
  BusinessRuleError,
  ConflictError,
  NotFoundError,
} from "@/services/_shared/action-errors"
import {
  hashBusinessPayload,
  recordBusinessEventInTx,
} from "@/services/events/business-event.service"
import {
  CAMEROON_COUNTRY_CODE,
  CAMEROON_DGI_E_SERVICES_CHANNEL,
  CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
} from "@/services/regulatory/country-packs/cameroon.constants"

import { resolveEInvoicingMetadata } from "./country-pack-hooks"
import {
  configureCountryAdapterPilotSchema,
  disableCountryAdapterSchema,
  recordCountryAdapterReviewSchema,
  rotateCountryAdapterCredentialSchema,
  type ConfigureCountryAdapterPilotInput,
  type DisableCountryAdapterInput,
  type RecordCountryAdapterReviewInput,
  type RotateCountryAdapterCredentialInput,
} from "./country-adapter-pilot.schemas"

type DbClient = Prisma.TransactionClient | typeof db

type PilotConfigRecord = {
  id: string
  organizationId: string
  countryCode: string
  authorityChannel: string
  adapterKey: string
  environment: ComplianceAdapterEnvironment
  status: ComplianceAdapterConfigStatus
  countryPackVersion: string
  countryPackResolutionHash: string
  capabilityStatus: string
  credentialReference: string | null
  credentialExpiresAt: Date | null
  credentialRotatedAt: Date | null
  officialSpecTitle: string | null
  officialSpecVersion: string | null
  officialSpecPublishedAt: Date | null
  officialSpecEffectiveFrom: Date | null
  officialSpecReference: string | null
  officialSpecHash: string | null
  reviewStatus: ComplianceAdapterReviewStatus
  reviewedById: string | null
  reviewedAt: Date | null
  reviewerQualification: string | null
  reviewerConflictDeclared: boolean | null
  reviewEvidenceHash: string | null
  configHash: string | null
  createdById: string | null
  disabledAt: Date | null
}

export type CountryAdapterPilotDTO = {
  id: string
  organizationId: string
  countryCode: string
  authorityChannel: string
  adapterKey: string
  environment: string
  status: string
  countryPackVersion: string
  countryPackResolutionHash: string
  capabilityStatus: string
  credentialReferencePresent: boolean
  credentialExpiresAt: string | null
  credentialRotatedAt: string | null
  officialSpec: {
    recorded: boolean
    title: string | null
    version: string | null
    publishedAt: string | null
    effectiveFrom: string | null
    reference: string | null
    documentHash: string | null
  }
  review: {
    status: string
    reviewedById: string | null
    reviewedAt: string | null
    reviewerQualification: string | null
    conflictDeclared: boolean | null
    evidenceHash: string | null
  }
  configHash: string | null
  productionSubmissionAllowed: false
}

function hasTransaction(client: DbClient): client is typeof db {
  return "$transaction" in client
}

function iso(value: Date | null) {
  return value?.toISOString() ?? null
}

function toPilotDTO(config: PilotConfigRecord): CountryAdapterPilotDTO {
  return {
    id: config.id,
    organizationId: config.organizationId,
    countryCode: config.countryCode,
    authorityChannel: config.authorityChannel,
    adapterKey: config.adapterKey,
    environment: config.environment,
    status: config.status,
    countryPackVersion: config.countryPackVersion,
    countryPackResolutionHash: config.countryPackResolutionHash,
    capabilityStatus: config.capabilityStatus,
    credentialReferencePresent: Boolean(config.credentialReference),
    credentialExpiresAt: iso(config.credentialExpiresAt),
    credentialRotatedAt: iso(config.credentialRotatedAt),
    officialSpec: {
      recorded: Boolean(
        config.officialSpecVersion &&
          config.officialSpecPublishedAt &&
          config.officialSpecReference &&
          config.officialSpecHash,
      ),
      title: config.officialSpecTitle,
      version: config.officialSpecVersion,
      publishedAt: iso(config.officialSpecPublishedAt),
      effectiveFrom: iso(config.officialSpecEffectiveFrom),
      reference: config.officialSpecReference,
      documentHash: config.officialSpecHash,
    },
    review: {
      status: config.reviewStatus,
      reviewedById: config.reviewedById,
      reviewedAt: iso(config.reviewedAt),
      reviewerQualification: config.reviewerQualification,
      conflictDeclared: config.reviewerConflictDeclared,
      evidenceHash: config.reviewEvidenceHash,
    },
    configHash: config.configHash,
    productionSubmissionAllowed: false,
  }
}

function configFingerprint(input: {
  packVersion: string
  packResolutionHash: string
  capabilityStatus: string
  credentialReference?: string
  credentialExpiresAt?: Date
  officialSpec?: {
    title: string
    version: string
    publishedAt: Date
    effectiveFrom?: Date
    reference: string
    documentHash: string
  }
}) {
  return `sha256:${hashBusinessPayload({
    adapterKey: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
    environment: ComplianceAdapterEnvironment.SANDBOX,
    packVersion: input.packVersion,
    packResolutionHash: input.packResolutionHash,
    capabilityStatus: input.capabilityStatus,
    credentialReferencePresent: Boolean(input.credentialReference),
    credentialReferenceHash: input.credentialReference
      ? hashBusinessPayload(input.credentialReference)
      : null,
    credentialExpiresAt: input.credentialExpiresAt?.toISOString() ?? null,
    officialSpec: input.officialSpec
      ? {
          ...input.officialSpec,
          publishedAt: input.officialSpec.publishedAt.toISOString(),
          effectiveFrom: input.officialSpec.effectiveFrom?.toISOString() ?? null,
        }
      : null,
  })}`
}

export async function configureCountryAdapterPilot(
  input: ConfigureCountryAdapterPilotInput,
  client: DbClient = db,
): Promise<CountryAdapterPilotDTO> {
  const parsed = configureCountryAdapterPilotSchema.parse(input)
  const metadata = resolveEInvoicingMetadata({
    countryCode: CAMEROON_COUNTRY_CODE,
    date: new Date(),
  })
  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.complianceAdapterConfig.findFirst({
      where: {
        organizationId: parsed.organizationId,
        countryCode: CAMEROON_COUNTRY_CODE,
        authorityChannel: CAMEROON_DGI_E_SERVICES_CHANNEL,
        environment: ComplianceAdapterEnvironment.SANDBOX,
      },
    })
    const effectiveCredentialReference =
      parsed.credentialReference ?? existing?.credentialReference ?? undefined
    const effectiveCredentialExpiresAt =
      parsed.credentialReference !== undefined
        ? parsed.credentialExpiresAt
        : existing?.credentialExpiresAt ?? undefined
    const effectiveOfficialSpec =
      parsed.officialSpec ??
      (existing?.officialSpecTitle &&
      existing.officialSpecVersion &&
      existing.officialSpecPublishedAt &&
      existing.officialSpecReference &&
      existing.officialSpecHash
        ? {
            title: existing.officialSpecTitle,
            version: existing.officialSpecVersion,
            publishedAt: existing.officialSpecPublishedAt,
            effectiveFrom: existing.officialSpecEffectiveFrom ?? undefined,
            reference: existing.officialSpecReference,
            documentHash: existing.officialSpecHash,
          }
        : undefined)
    const configHash = configFingerprint({
      packVersion: metadata.packVersion,
      packResolutionHash: metadata.combinedResolutionHash,
      capabilityStatus: metadata.capabilityStatus,
      credentialReference: effectiveCredentialReference,
      credentialExpiresAt: effectiveCredentialExpiresAt,
      officialSpec: effectiveOfficialSpec,
    })

    const config = await tx.complianceAdapterConfig.upsert({
      where: {
        organizationId_countryCode_authorityChannel_environment: {
          organizationId: parsed.organizationId,
          countryCode: CAMEROON_COUNTRY_CODE,
          authorityChannel: CAMEROON_DGI_E_SERVICES_CHANNEL,
          environment: ComplianceAdapterEnvironment.SANDBOX,
        },
      },
      create: {
        organizationId: parsed.organizationId,
        countryCode: CAMEROON_COUNTRY_CODE,
        authorityChannel: CAMEROON_DGI_E_SERVICES_CHANNEL,
        adapterKey: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
        environment: ComplianceAdapterEnvironment.SANDBOX,
        status: effectiveCredentialReference
          ? ComplianceAdapterConfigStatus.ACTIVE
          : ComplianceAdapterConfigStatus.REQUIRES_CONFIGURATION,
        countryPackVersion: metadata.packVersion,
        countryPackResolutionHash: metadata.combinedResolutionHash,
        capabilityStatus: metadata.capabilityStatus,
        credentialReference: effectiveCredentialReference ?? null,
        credentialExpiresAt: effectiveCredentialExpiresAt ?? null,
        credentialRotatedAt: effectiveCredentialReference ? new Date() : null,
        credentialRotatedById: effectiveCredentialReference
          ? parsed.actorId
          : null,
        officialSpecTitle: effectiveOfficialSpec?.title ?? null,
        officialSpecVersion: effectiveOfficialSpec?.version ?? null,
        officialSpecPublishedAt: effectiveOfficialSpec?.publishedAt ?? null,
        officialSpecEffectiveFrom:
          effectiveOfficialSpec?.effectiveFrom ?? null,
        officialSpecReference: effectiveOfficialSpec?.reference ?? null,
        officialSpecHash: effectiveOfficialSpec?.documentHash ?? null,
        reviewStatus:
          ComplianceAdapterReviewStatus.REQUIRES_EXPERT_REVIEW,
        configHash,
        createdById: parsed.actorId,
        updatedById: parsed.actorId,
      },
      update: {
        adapterKey: CAMEROON_DGI_SANDBOX_ADAPTER_CODE,
        status: effectiveCredentialReference
          ? ComplianceAdapterConfigStatus.ACTIVE
          : ComplianceAdapterConfigStatus.REQUIRES_CONFIGURATION,
        countryPackVersion: metadata.packVersion,
        countryPackResolutionHash: metadata.combinedResolutionHash,
        capabilityStatus: metadata.capabilityStatus,
        credentialReference: effectiveCredentialReference ?? null,
        credentialExpiresAt: effectiveCredentialExpiresAt ?? null,
        officialSpecTitle: effectiveOfficialSpec?.title ?? null,
        officialSpecVersion: effectiveOfficialSpec?.version ?? null,
        officialSpecPublishedAt: effectiveOfficialSpec?.publishedAt ?? null,
        officialSpecEffectiveFrom:
          effectiveOfficialSpec?.effectiveFrom ?? null,
        officialSpecReference: effectiveOfficialSpec?.reference ?? null,
        officialSpecHash: effectiveOfficialSpec?.documentHash ?? null,
        configHash,
        updatedById: parsed.actorId,
        disabledAt: null,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.actorId,
        entityType: "ComplianceAdapterConfig",
        entityId: config.id,
        action: "COUNTRY_ADAPTER_PILOT_CONFIGURED",
        changes: {
          after: {
            adapterKey: config.adapterKey,
            environment: config.environment,
            status: config.status,
            countryPackVersion: config.countryPackVersion,
            capabilityStatus: config.capabilityStatus,
            credentialReferencePresent: Boolean(config.credentialReference),
            credentialExpiresAt: config.credentialExpiresAt,
            officialSpecVersion: config.officialSpecVersion,
            officialSpecHash: config.officialSpecHash,
            reviewStatus: config.reviewStatus,
            configHash,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "AUTHORITY_ADAPTER_CONFIGURED",
      eventSource: "INTERNAL",
      idempotencyKey: `authority-adapter:${config.id}:configured:${configHash}`,
      actorId: parsed.actorId,
      sourceType: "COMPLIANCE_ADAPTER_CONFIG",
      sourceId: config.id,
      documentHash: configHash,
      payload: {
        adapterConfigId: config.id,
        adapterKey: config.adapterKey,
        environment: config.environment,
        status: config.status,
        countryPackVersion: config.countryPackVersion,
        credentialReferencePresent: Boolean(config.credentialReference),
        officialSpecRecorded: Boolean(config.officialSpecVersion),
        reviewStatus: config.reviewStatus,
        productionSubmissionAllowed: false,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "authority.adapter.configured",
          payload: {
            adapterConfigId: config.id,
            status: config.status,
            reviewStatus: config.reviewStatus,
          },
        },
      ],
    })

    return toPilotDTO(config as PilotConfigRecord)
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function rotateCountryAdapterCredential(
  input: RotateCountryAdapterCredentialInput,
  client: DbClient = db,
): Promise<CountryAdapterPilotDTO> {
  const parsed = rotateCountryAdapterCredentialSchema.parse(input)

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.complianceAdapterConfig.findFirst({
      where: {
        id: parsed.adapterConfigId,
        organizationId: parsed.organizationId,
      },
    })
    if (!existing) throw new NotFoundError("Compliance adapter configuration not found.")
    if (existing.environment === ComplianceAdapterEnvironment.PRODUCTION) {
      throw new BusinessRuleError(
        "Production adapter credentials cannot be configured before the production adapter is registered.",
      )
    }

    const rotatedAt = new Date()
    const configHash = `sha256:${hashBusinessPayload({
      previousConfigHash: existing.configHash,
      credentialReferenceHash: hashBusinessPayload(parsed.credentialReference),
      credentialExpiresAt: parsed.credentialExpiresAt?.toISOString() ?? null,
      rotatedAt: rotatedAt.toISOString(),
    })}`
    const config = await tx.complianceAdapterConfig.update({
      where: { id: existing.id },
      data: {
        credentialReference: parsed.credentialReference,
        credentialExpiresAt: parsed.credentialExpiresAt ?? null,
        credentialRotatedAt: rotatedAt,
        credentialRotatedById: parsed.actorId,
        status: ComplianceAdapterConfigStatus.ACTIVE,
        disabledAt: null,
        configHash,
        updatedById: parsed.actorId,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.actorId,
        entityType: "ComplianceAdapterConfig",
        entityId: config.id,
        action: "AUTHORITY_CREDENTIAL_ROTATED",
        changes: {
          after: {
            credentialReferencePresent: true,
            credentialExpiresAt: config.credentialExpiresAt,
            credentialRotatedAt: config.credentialRotatedAt,
            reason: parsed.reason,
            configHash,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "AUTHORITY_CREDENTIAL_ROTATED",
      eventSource: "INTERNAL",
      idempotencyKey: `authority-adapter:${config.id}:credential-rotated:${configHash}`,
      actorId: parsed.actorId,
      sourceType: "COMPLIANCE_ADAPTER_CONFIG",
      sourceId: config.id,
      documentHash: configHash,
      payload: {
        adapterConfigId: config.id,
        credentialReferencePresent: true,
        credentialExpiresAt: config.credentialExpiresAt,
        credentialRotatedAt: config.credentialRotatedAt,
        reason: parsed.reason,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "authority.credential.rotated",
          payload: {
            adapterConfigId: config.id,
            credentialExpiresAt: config.credentialExpiresAt,
          },
        },
      ],
    })

    return toPilotDTO(config as PilotConfigRecord)
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function recordCountryAdapterReview(
  input: RecordCountryAdapterReviewInput,
  client: DbClient = db,
): Promise<CountryAdapterPilotDTO> {
  const parsed = recordCountryAdapterReviewSchema.parse(input)

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.complianceAdapterConfig.findFirst({
      where: {
        id: parsed.adapterConfigId,
        organizationId: parsed.organizationId,
      },
    })
    if (!existing) throw new NotFoundError("Compliance adapter configuration not found.")
    if (existing.createdById === parsed.actorId) {
      throw new ConflictError(
        "The adapter configurator cannot independently approve the same adapter review.",
      )
    }
    if (!existing.officialSpecHash || !existing.officialSpecVersion) {
      throw new BusinessRuleError(
        "Official specification version and evidence hash must be recorded before expert approval.",
      )
    }

    const reviewStatus =
      parsed.reviewStatus === "REGULATOR_CONFIRMED"
        ? ComplianceAdapterReviewStatus.REGULATOR_CONFIRMED
        : ComplianceAdapterReviewStatus.EXPERT_APPROVED
    const config = await tx.complianceAdapterConfig.update({
      where: { id: existing.id },
      data: {
        reviewStatus,
        reviewedById: parsed.actorId,
        reviewedAt: parsed.reviewedAt,
        reviewerQualification: parsed.reviewerQualification,
        reviewerConflictDeclared: parsed.reviewerConflictDeclared,
        reviewEvidenceHash: parsed.reviewEvidenceHash,
        approvedById: parsed.actorId,
        approvedAt: parsed.reviewedAt,
        updatedById: parsed.actorId,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.actorId,
        entityType: "ComplianceAdapterConfig",
        entityId: config.id,
        action: "COUNTRY_ADAPTER_REVIEW_RECORDED",
        changes: {
          after: {
            reviewStatus,
            reviewedAt: parsed.reviewedAt,
            reviewerQualification: parsed.reviewerQualification,
            reviewerConflictDeclared: true,
            reviewEvidenceHash: parsed.reviewEvidenceHash,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "AUTHORITY_ADAPTER_REVIEW_RECORDED",
      eventSource: "INTERNAL",
      idempotencyKey: `authority-adapter:${config.id}:review:${parsed.reviewEvidenceHash}`,
      actorId: parsed.actorId,
      sourceType: "COMPLIANCE_ADAPTER_CONFIG",
      sourceId: config.id,
      documentHash: parsed.reviewEvidenceHash,
      payload: {
        adapterConfigId: config.id,
        reviewStatus,
        reviewedAt: parsed.reviewedAt,
        reviewerQualification: parsed.reviewerQualification,
        reviewerConflictDeclared: true,
        reviewEvidenceHash: parsed.reviewEvidenceHash,
        productionSubmissionAllowed: false,
      },
      outboxMessages: [],
    })

    return toPilotDTO(config as PilotConfigRecord)
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}

export async function disableCountryAdapter(
  input: DisableCountryAdapterInput,
  client: DbClient = db,
): Promise<CountryAdapterPilotDTO> {
  const parsed = disableCountryAdapterSchema.parse(input)

  const run = async (tx: Prisma.TransactionClient) => {
    const existing = await tx.complianceAdapterConfig.findFirst({
      where: {
        id: parsed.adapterConfigId,
        organizationId: parsed.organizationId,
      },
    })
    if (!existing) throw new NotFoundError("Compliance adapter configuration not found.")
    if (existing.status === ComplianceAdapterConfigStatus.DISABLED) {
      return toPilotDTO(existing as PilotConfigRecord)
    }

    const disabledAt = new Date()
    const config = await tx.complianceAdapterConfig.update({
      where: { id: existing.id },
      data: {
        status: ComplianceAdapterConfigStatus.DISABLED,
        disabledAt,
        updatedById: parsed.actorId,
      },
    })

    await tx.auditLog.create({
      data: {
        organizationId: parsed.organizationId,
        userId: parsed.actorId,
        entityType: "ComplianceAdapterConfig",
        entityId: config.id,
        action: "AUTHORITY_ADAPTER_DISABLED",
        changes: {
          after: {
            status: ComplianceAdapterConfigStatus.DISABLED,
            disabledAt,
            reason: parsed.reason,
            posPostingAffected: false,
          },
        },
      },
    })

    await recordBusinessEventInTx(tx, {
      organizationId: parsed.organizationId,
      eventType: "AUTHORITY_ADAPTER_DISABLED",
      eventSource: "INTERNAL",
      idempotencyKey: `authority-adapter:${config.id}:disabled:${disabledAt.toISOString()}`,
      actorId: parsed.actorId,
      sourceType: "COMPLIANCE_ADAPTER_CONFIG",
      sourceId: config.id,
      payload: {
        adapterConfigId: config.id,
        status: ComplianceAdapterConfigStatus.DISABLED,
        reason: parsed.reason,
        posPostingAffected: false,
      },
      outboxMessages: [
        {
          channel: "NOTIFICATION",
          eventName: "authority.adapter.disabled",
          payload: {
            adapterConfigId: config.id,
            status: ComplianceAdapterConfigStatus.DISABLED,
          },
        },
      ],
    })

    return toPilotDTO(config as PilotConfigRecord)
  }

  if (hasTransaction(client)) return client.$transaction(run)
  return run(client)
}
