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
  if (!returned || typeof returned !== "object" || isBetterAuthApiError(returned)) return false
  const payload = returned as { token?: unknown; user?: { id?: unknown } | null }
  return (
    typeof payload.token === "string" && payload.token.length > 0 &&
    typeof payload.user?.id === "string" && payload.user.id.length > 0
  )
}

export function credentialSignInFailed(
  context: BetterAuthAfterHookContext,
) {
  const returned = context.context?.returned
  if (!isBetterAuthApiError(returned)) return false
  const error = returned as { statusCode?: unknown; body?: { code?: unknown } | null }
  return error.statusCode === 401 && error.body?.code === "INVALID_EMAIL_OR_PASSWORD"
}
