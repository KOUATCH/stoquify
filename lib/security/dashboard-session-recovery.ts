import type { Locale } from "@/types/bilingual"

export const DASHBOARD_REQUEST_PATH_HEADER = "x-stoquify-dashboard-path"

// Middleware supplies this path from the request URL, never from client headers.
// Revalidate at the consumer so recovery cannot become an external redirect.
export function dashboardLoginRecoveryHref(value: string | null, locale: Locale): string {
  const login = `/${locale}/login`
  if (!value || !value.startsWith("/") || /[\\\r\n]/.test(value)) return login
  const origin = "https://dashboard.invalid"
  try {
    const url = new URL(value, origin)
    const root = `/${locale}/dashboard`
    if (url.origin !== origin || (url.pathname !== root && !url.pathname.startsWith(`${root}/`))) return login
    url.searchParams.delete("_rsc")
    return `${login}?callbackUrl=${encodeURIComponent(url.pathname + url.search)}`
  } catch {
    return login
  }
}
