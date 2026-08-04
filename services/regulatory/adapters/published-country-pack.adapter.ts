import { getCountryPack, getCountryPacks } from "../country-packs/registry"
import { resolveRegulatoryParameter as resolvePublishedParameter } from "../country-packs/resolve"
import type {
  RegulatoryCapabilityPort,
  RegulatoryResolutionContext,
  RegulatoryResolutionResult,
} from "../ports/regulatory-capability.port"

export const publishedCountryPackAdapter: RegulatoryCapabilityPort = {
  resolve<TValue>(
    parameterPath: string,
    context: RegulatoryResolutionContext,
  ): RegulatoryResolutionResult<TValue> {
    return resolvePublishedParameter<TValue>(parameterPath, context)
  },
}

export function getPublishedCountryPack(
  countryCode: string,
  packVersion: string,
) {
  return getCountryPack(countryCode, packVersion)
}

export function getPublishedCountryPacks(countryCode: string) {
  return getCountryPacks(countryCode)
}
