import { computeResolutionHash } from "./hash"
import { getCountryPacks } from "./registry"
import type { CapabilityStatus, CountryPack } from "./schemas"
import {
  getParameterEnvelopeArray,
  RegulatoryPackError,
  selectEffectiveEnvelope,
} from "./validation"

export type RegulatoryEntityProfile = {
  id?: string
  countryCode?: string
  legalForm?: string | null
  taxRegime?: string | null
  payrollRiskGroup?: "A" | "B" | "C" | null
}

export type RegulatoryResolutionContext = {
  countryCode: string
  date: Date | string
  purpose?: string
  entityProfileId?: string
  entityProfile?: RegulatoryEntityProfile | null
  pinnedPackVersion?: string
  allowUnpublished?: boolean
}

export type RegulatoryResolutionResult<TValue = unknown> = {
  countryCode: string
  parameterPath: string
  value: TValue
  packVersion: string
  schemaVersion: string
  legalRef: string
  effectiveFrom: string
  effectiveTo: string | null
  verifiedOn: string
  verifiedBy: string
  verificationStatus: string
  layer: "country"
  capabilityStatus: CapabilityStatus
  resolutionHash: string
}

function toIsoDate(value: Date | string) {
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  const parsed = new Date(`${value}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10)
}

function isDateInPackWindow(pack: CountryPack, date: string) {
  return pack.header.effectiveFrom <= date && (!pack.header.effectiveTo || date <= pack.header.effectiveTo)
}

function resolveCapabilityStatus(pack: CountryPack, parameterPath: string): CapabilityStatus {
  const matchingKey = Object.keys(pack.header.capabilityMatrix)
    .sort((left, right) => right.length - left.length)
    .find((key) => parameterPath === key || parameterPath.startsWith(`${key}.`))

  return matchingKey ? pack.header.capabilityMatrix[matchingKey] : "REQUIRES_CONFIGURATION"
}

function selectCountryPack(context: RegulatoryResolutionContext, date: string) {
  const countryCode = context.countryCode.toUpperCase()
  const packs = getCountryPacks(countryCode)

  if (!packs.length) {
    throw new RegulatoryPackError("PACK_NOT_PUBLISHED", `No regulatory country pack is registered for ${countryCode}.`)
  }

  if (context.pinnedPackVersion) {
    const pinned = packs.find((pack) => pack.header.packVersion === context.pinnedPackVersion)
    if (!pinned) {
      throw new RegulatoryPackError(
        "PACK_NOT_PUBLISHED",
        `Regulatory pack ${context.pinnedPackVersion} is not registered for ${countryCode}.`,
      )
    }

    if (pinned.header.status !== "PUBLISHED" && !context.allowUnpublished) {
      throw new RegulatoryPackError("PACK_NOT_PUBLISHED", `Regulatory pack ${pinned.header.packVersion} is not published.`)
    }

    return pinned
  }

  const available = packs
    .filter((pack) => (context.allowUnpublished || pack.header.status === "PUBLISHED") && isDateInPackWindow(pack, date))
    .sort((left, right) => right.header.effectiveFrom.localeCompare(left.header.effectiveFrom))

  const selected = available[0]
  if (!selected) {
    throw new RegulatoryPackError(
      "EFFECTIVE_WINDOW_MISSING",
      `No published regulatory pack covers ${countryCode} on ${date}.`,
    )
  }

  return selected
}

export function resolveRegulatoryParameter<TValue = unknown>(
  parameterPath: string,
  context: RegulatoryResolutionContext,
): RegulatoryResolutionResult<TValue> {
  const countryCode = context.countryCode.toUpperCase()
  const entityCountryCode = context.entityProfile?.countryCode?.toUpperCase()

  if (entityCountryCode && entityCountryCode !== countryCode) {
    throw new RegulatoryPackError(
      "ENTITY_PROFILE_INVALID",
      "Entity regulatory profile country does not match the requested country pack.",
    )
  }

  const date = toIsoDate(context.date)
  const pack = selectCountryPack({ ...context, countryCode }, date)
  const capabilityStatus = resolveCapabilityStatus(pack, parameterPath)

  if (
    capabilityStatus === "NOT_SUPPORTED" ||
    capabilityStatus === "NOT_YET_SUPPORTED" ||
    capabilityStatus === "OUT_OF_SCOPE"
  ) {
    throw new RegulatoryPackError(
      "CAPABILITY_NOT_SUPPORTED",
      `Regulatory parameter "${parameterPath}" is not supported by pack ${pack.header.packVersion}.`,
    )
  }

  const envelopes = getParameterEnvelopeArray(pack, parameterPath)
  if (!envelopes) {
    throw new RegulatoryPackError(
      "PARAMETER_NOT_FOUND",
      `Regulatory parameter "${parameterPath}" is not defined by pack ${pack.header.packVersion}.`,
    )
  }

  const selected = selectEffectiveEnvelope<TValue>(envelopes as never, date)
  if (!selected) {
    throw new RegulatoryPackError(
      "EFFECTIVE_WINDOW_MISSING",
      `Regulatory parameter "${parameterPath}" is not effective on ${date}.`,
    )
  }

  if (!selected.legalRef) {
    throw new RegulatoryPackError(
      "LEGAL_CITATION_MISSING",
      `Regulatory parameter "${parameterPath}" has no legal citation.`,
    )
  }

  const resultWithoutHash = {
    countryCode,
    parameterPath,
    value: selected.value,
    packVersion: pack.header.packVersion,
    schemaVersion: pack.header.schemaVersion,
    legalRef: selected.legalRef,
    effectiveFrom: selected.effectiveFrom,
    effectiveTo: selected.effectiveTo ?? null,
    verifiedOn: selected.verifiedOn,
    verifiedBy: selected.verifiedBy,
    verificationStatus: selected.verificationStatus,
    layer: "country" as const,
    capabilityStatus,
  }

  return {
    ...resultWithoutHash,
    resolutionHash: computeResolutionHash({
      ...resultWithoutHash,
      purpose: context.purpose,
      entityProfileId: context.entityProfileId ?? context.entityProfile?.id,
      requestedDate: date,
    }),
  }
}

export function resolveCameroonStandardVatRateBps(date: Date | string) {
  return resolveRegulatoryParameter<number>("taxes.vat.standardRateBps", {
    countryCode: "CM",
    date,
    purpose: "POS_SALE_TAX",
  })
}

export function resolveCameroonMobileMoneyLegality(date: Date | string) {
  return resolveRegulatoryParameter("payments.providerLegality.mobileMoney", {
    countryCode: "CM",
    date,
    purpose: "PAYMENT_PROVIDER_LEGALITY",
  })
}
