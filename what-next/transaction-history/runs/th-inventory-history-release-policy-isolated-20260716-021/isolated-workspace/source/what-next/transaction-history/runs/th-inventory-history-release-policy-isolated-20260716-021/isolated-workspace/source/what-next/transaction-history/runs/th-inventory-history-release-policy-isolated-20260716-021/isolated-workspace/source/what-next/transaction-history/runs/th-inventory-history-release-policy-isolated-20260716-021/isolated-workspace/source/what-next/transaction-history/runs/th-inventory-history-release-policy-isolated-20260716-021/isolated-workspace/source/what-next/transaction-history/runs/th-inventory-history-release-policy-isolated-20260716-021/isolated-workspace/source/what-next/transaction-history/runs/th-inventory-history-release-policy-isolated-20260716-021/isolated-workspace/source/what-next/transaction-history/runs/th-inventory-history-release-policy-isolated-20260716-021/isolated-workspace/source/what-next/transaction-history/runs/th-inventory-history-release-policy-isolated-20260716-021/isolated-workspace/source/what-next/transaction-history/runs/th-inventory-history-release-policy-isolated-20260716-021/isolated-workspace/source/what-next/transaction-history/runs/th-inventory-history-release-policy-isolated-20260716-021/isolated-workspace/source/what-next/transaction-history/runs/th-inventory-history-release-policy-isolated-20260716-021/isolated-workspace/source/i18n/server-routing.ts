import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { LOCALE_COOKIE, localizePath, pickLocale } from "./routing"

export async function getRequestLocale() {
  const cookieStore = await cookies()
  return pickLocale(cookieStore.get(LOCALE_COOKIE)?.value)
}

export async function localizedRedirect(path: string): Promise<never> {
  const locale = await getRequestLocale()
  redirect(localizePath(path, locale))
}
