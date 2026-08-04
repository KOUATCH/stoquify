import {
  getPublishedCountryPack,
  getPublishedCountryPacks,
  publishedCountryPackAdapter,
} from "./adapters/published-country-pack.adapter"
import type {
  RegulatoryCapabilityPort,
  RegulatoryDecision,
  RegulatoryProvenance,
  RegulatoryResolutionContext,
  RegulatoryResolutionResult,
} from "./ports/regulatory-capability.port"
import { resolveRegulatoryExecutionMode } from "./runtime/regulatory-runtime-class"
import { RegulatoryPackError } from "./country-packs/validation"
import { ApplicationError } from "@/services/_shared/action-errors"

const AUTHORITATIVE_CAPABILITIES = new Set([
  "SUPPORTED",
  "SUPPORTED_CERTIFIED",
])
const AUTHORITATIVE_VERIFICATION = new Set([
  "EXPERT_REVIEWED",
  "REGULATOR_CONFIRMED",
])

function provenanceOf<TValue>(
  result: RegulatoryResolutionResult<TValue>,
): RegulatoryProvenance {
  const { value: _value, ...provenance } = result
  return provenance
}

function isAuthoritative<TValue>(
  result: RegulatoryResolutionResult<TValue>,
) {
  return (
    AUTHORITATIVE_CAPABILITIES.has(result.capabilityStatus) &&
    AUTHORITATIVE_VERIFICATION.has(result.verificationStatus)
  )
}

export function resolveRegulatoryDecision<TValue = unknown>(
  parameterPath: string,
  context: RegulatoryResolutionContext,
  port: RegulatoryCapabilityPort = publishedCountryPackAdapter,
): RegulatoryDecision<TValue> {
  const mode = resolveRegulatoryExecutionMode(context.executionMode)

  try {
    const result = port.resolve<TValue>(parameterPath, {
      ...context,
      executionMode: mode,
    })

    if (mode === "PRODUCTION") {
      if (!isAuthoritative(result)) {
        return {
          kind: "PENDING_COUNTRY_PACK",
          mode,
          countryCode: context.countryCode.toUpperCase(),
          parameterPath,
          reason:
            "The selected country-pack value is not approved for authoritative production use.",
          retryable: true,
        }
      }

      return {
        kind: "AUTHORITATIVE",
        mode,
        value: result.value,
        provenance: provenanceOf(result),
      }
    }

    return {
      kind: "NON_AUTHORITATIVE",
      mode,
      value: result.value,
      provenance: provenanceOf(result),
      watermark: "NOT FOR STATUTORY USE",
    }
  } catch (error) {
    if (!(error instanceof RegulatoryPackError)) {
      throw new ApplicationError(
        "INTERNAL_ERROR",
        "Regulatory capability resolution failed unexpectedly.",
        500,
        false,
      )
    }

    return {
      kind: "PENDING_COUNTRY_PACK",
      mode,
      countryCode: context.countryCode.toUpperCase(),
      parameterPath,
      reason: error.message,
      retryable: true,
    }
  }
}

export function resolveRegulatoryParameter<TValue = unknown>(
  parameterPath: string,
  context: RegulatoryResolutionContext,
): RegulatoryResolutionResult<TValue> {
  const decision = resolveRegulatoryDecision<TValue>(parameterPath, context)

  if (decision.kind === "PENDING_COUNTRY_PACK") {
    throw new RegulatoryPackError("PACK_NOT_PUBLISHED", decision.reason)
  }

  return {
    ...decision.provenance,
    value: decision.value,
  }
}

export function getCountryPack(countryCode: string, packVersion: string) {
  return getPublishedCountryPack(countryCode, packVersion)
}

export function getCountryPacks(countryCode: string) {
  return getPublishedCountryPacks(countryCode)
}

export type {
  RegulatoryDecision,
  RegulatoryEntityProfile,
  RegulatoryExecutionMode,
  RegulatoryResolutionContext,
  RegulatoryResolutionResult,
} from "./ports/regulatory-capability.port"

