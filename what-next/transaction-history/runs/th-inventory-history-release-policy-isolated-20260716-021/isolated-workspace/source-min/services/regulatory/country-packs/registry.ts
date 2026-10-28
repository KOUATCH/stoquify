import { cameroonCountryPack } from "./cameroon"
import type { CountryPack } from "./schemas"

export const COUNTRY_PACK_REGISTRY: Record<string, CountryPack[]> = {
  CM: [cameroonCountryPack],
}

export function getCountryPacks(countryCode: string) {
  return COUNTRY_PACK_REGISTRY[countryCode.toUpperCase()] ?? []
}

export function getCountryPack(countryCode: string, packVersion: string) {
  return getCountryPacks(countryCode).find((pack) => pack.header.packVersion === packVersion) ?? null
}
