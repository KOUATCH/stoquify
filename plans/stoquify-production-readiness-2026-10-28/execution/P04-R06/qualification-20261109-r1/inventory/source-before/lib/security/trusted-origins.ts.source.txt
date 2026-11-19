const ALLOWED_ORIGIN_PROTOCOLS = new Set(["http:", "https:"])

export function normalizeTrustedOrigin(value: string | undefined): string | null {
  const candidate = value?.trim()
  if (!candidate) return null

  try {
    const url = new URL(candidate)
    if (!ALLOWED_ORIGIN_PROTOCOLS.has(url.protocol)) return null
    return url.origin
  } catch {
    return null
  }
}

export function buildTrustedOrigins(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map(normalizeTrustedOrigin)
        .filter((origin): origin is string => origin !== null)
    )
  )
}
