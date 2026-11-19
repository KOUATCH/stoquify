import { cookies } from "next/headers"

/** Public chrome only. A cookie is a lookup hint, never proof of authentication. */
export async function getPublicSession() {
  const jar = await cookies()
  if (!jar.get("__Secure-better-auth.session_token")?.value && !jar.get("better-auth.session_token")?.value) return null

  // Anonymous discovery must not initialize the auth/database/permission graph.
  // Requests carrying a session still use the existing server-owned validation.
  const { getSession } = await import("@/lib/auth-server")
  return getSession()
}
