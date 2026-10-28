type BetterAuthAfterHookContext = {
  context?: {
    returned?: unknown
  }
}

function isBetterAuthApiError(value: unknown) {
  if (!value || typeof value !== "object") return false
  const candidate = value as {
    name?: unknown
    constructor?: { name?: unknown }
  }
  return (
    candidate.name === "APIError" ||
    candidate.constructor?.name === "APIError"
  )
}

export function credentialSignInSucceeded(
  context: BetterAuthAfterHookContext,
) {
  const returned = context.context?.returned
  return (
    returned !== null &&
    returned !== undefined &&
    !isBetterAuthApiError(returned)
  )
}
