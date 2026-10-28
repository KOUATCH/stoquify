import { createHash } from "crypto"

import type { CountryPack } from "./schemas"

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

function hashPayload(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonicalize(value))).digest("hex")
}

export function computeCountryPackHash(pack: CountryPack) {
  return `sha256:${hashPayload({
    ...pack,
    header: {
      ...pack.header,
      hash: "sha256:pending",
    },
  })}`
}

export function sealCountryPack<TPack extends CountryPack>(pack: TPack): TPack {
  const sealed = {
    ...pack,
    header: {
      ...pack.header,
      hash: "sha256:pending",
    },
  } as TPack

  return {
    ...sealed,
    header: {
      ...sealed.header,
      hash: computeCountryPackHash(sealed),
    },
  } as TPack
}

export function computeResolutionHash(payload: unknown) {
  return `sha256:${hashPayload(payload)}`
}
