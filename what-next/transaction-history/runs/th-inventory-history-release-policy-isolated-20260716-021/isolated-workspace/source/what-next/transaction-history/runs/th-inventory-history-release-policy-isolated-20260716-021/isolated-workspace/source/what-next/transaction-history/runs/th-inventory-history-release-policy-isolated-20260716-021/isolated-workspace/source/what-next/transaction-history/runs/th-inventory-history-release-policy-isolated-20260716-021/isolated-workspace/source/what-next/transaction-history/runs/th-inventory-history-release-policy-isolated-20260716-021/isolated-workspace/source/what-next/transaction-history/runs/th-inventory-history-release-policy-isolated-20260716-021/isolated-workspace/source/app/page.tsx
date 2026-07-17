import { LOCALE_COOKIE, pickLocale } from "@/i18n/routing"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export default async function HomePage() {
  const cookieStore = await cookies()
  const locale = pickLocale(cookieStore.get(LOCALE_COOKIE)?.value)

  redirect(`/${locale}`)
}
