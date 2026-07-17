import { BusinessRuleError } from "@/services/_shared/action-errors"
import { computeResolutionHash } from "@/services/regulatory/country-packs/hash"
import {
  resolveRegulatoryParameter,
  type RegulatoryEntityProfile,
  type RegulatoryResolutionResult,
} from "@/services/regulatory/country-packs/resolve"

const E_INVOICING_PARAMETER_PATHS = {
  capability: "compliance.eInvoicing.capability",
  requiredFields: "compliance.eInvoicing.requiredFields",
  certificationPolicy: "compliance.eInvoicing.certificationPolicy",
  authorityChannels: "compliance.eInvoicing.authorityChannels",
  manualPortalFallback: "compliance.eInvoicing.manualPortalFallback",
  artifactExpectations: "compliance.eInvoicing.artifactExpectations",
} as const

export type EInvoicingMetadataContext = {
  countryCode: string
  date: Date | string
  pinnedPackVersion?: string | null
  entityProfile?: RegulatoryEntityProfile | null
  entityProfileId?: string | null
}

export type EInvoicingMetadataBundle = {
  countryCode: string
  packVersion: string
  schemaVersion: string
  capabilityStatus: string
  combinedResolutionHash: string
  capability: RegulatoryResolutionResult<Record<string, unknown>>
  requiredFields: RegulatoryResolutionResult<Record<string, unknown>>
  certificationPolicy: RegulatoryResolutionResult<Record<string, unknown>>
  authorityChannels: RegulatoryResolutionResult<unknown[]>
  manualPortalFallback: RegulatoryResolutionResult<Record<string, unknown>>
  artifactExpectations: RegulatoryResolutionResult<Record<string, unknown>>
}

function toIsoDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10)
}

function assertSamePack(
  expectedPackVersion: string,
  result: RegulatoryResolutionResult,
) {
  if (result.packVersion !== expectedPackVersion) {
    throw new BusinessRuleError(
      `E-invoicing metadata resolved across multiple country-pack versions: ${expectedPackVersion} and ${result.packVersion}.`,
    )
  }
}

function resolveMetadataParameter<TValue>(
  parameterPath: string,
  context: EInvoicingMetadataContext,
  purpose: string,
) {
  return resolveRegulatoryParameter<TValue>(parameterPath, {
    countryCode: context.countryCode,
    date: context.date,
    purpose,
    pinnedPackVersion: context.pinnedPackVersion ?? undefined,
    entityProfile: context.entityProfile,
    entityProfileId: context.entityProfileId ?? context.entityProfile?.id,
  })
}

export function resolveEInvoicingMetadata(
  context: EInvoicingMetadataContext,
): EInvoicingMetadataBundle {
  const capability = resolveMetadataParameter<Record<string, unknown>>(
    E_INVOICING_PARAMETER_PATHS.capability,
    context,
    "COMPLIANCE_CENTER_READINESS",
  )

  const requiredFields = resolveMetadataParameter<Record<string, unknown>>(
    E_INVOICING_PARAMETER_PATHS.requiredFields,
    context,
    "COMPLIANCE_CENTER_REQUIRED_FIELDS",
  )
  const certificationPolicy = resolveMetadataParameter<Record<string, unknown>>(
    E_INVOICING_PARAMETER_PATHS.certificationPolicy,
    context,
    "COMPLIANCE_CENTER_CERTIFICATION_GATE",
  )
  const authorityChannels = resolveMetadataParameter<unknown[]>(
    E_INVOICING_PARAMETER_PATHS.authorityChannels,
    context,
    "COMPLIANCE_CENTER_AUTHORITY_CHANNELS",
  )
  const manualPortalFallback = resolveMetadataParameter<Record<string, unknown>>(
    E_INVOICING_PARAMETER_PATHS.manualPortalFallback,
    context,
    "COMPLIANCE_CENTER_MANUAL_FALLBACK",
  )
  const artifactExpectations = resolveMetadataParameter<Record<string, unknown>>(
    E_INVOICING_PARAMETER_PATHS.artifactExpectations,
    context,
    "COMPLIANCE_CENTER_ARTIFACTS",
  )

  const packVersion = capability.packVersion
  ;[
    requiredFields,
    certificationPolicy,
    authorityChannels,
    manualPortalFallback,
    artifactExpectations,
  ].forEach((result) => assertSamePack(packVersion, result))

  return {
    countryCode: capability.countryCode,
    packVersion,
    schemaVersion: capability.schemaVersion,
    capabilityStatus: capability.capabilityStatus,
    combinedResolutionHash: computeResolutionHash({
      countryCode: capability.countryCode,
      requestedDate: toIsoDate(context.date),
      packVersion,
      parameterHashes: {
        capability: capability.resolutionHash,
        requiredFields: requiredFields.resolutionHash,
        certificationPolicy: certificationPolicy.resolutionHash,
        authorityChannels: authorityChannels.resolutionHash,
        manualPortalFallback: manualPortalFallback.resolutionHash,
        artifactExpectations: artifactExpectations.resolutionHash,
      },
    }),
    capability,
    requiredFields,
    certificationPolicy,
    authorityChannels,
    manualPortalFallback,
    artifactExpectations,
  }
}

export function assertEInvoicingMetadataIsLedgerFirst(
  metadata: EInvoicingMetadataBundle,
) {
  if (metadata.capability.value.requiresPostedLedgerSource !== true) {
    throw new BusinessRuleError(
      "E-invoicing country-pack metadata must require a posted ledger source before fiscal document creation.",
    )
  }

  if (
    metadata.certificationPolicy.value.authorityCallInsideSaleTransactionAllowed !==
    false
  ) {
    throw new BusinessRuleError(
      "E-invoicing country-pack metadata cannot allow authority calls inside the sale transaction.",
    )
  }
}

export { E_INVOICING_PARAMETER_PATHS }
