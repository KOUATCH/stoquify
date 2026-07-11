import { checkPermission } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"

const companySettingsPath = `/${["dashboard", "settings", "company"].join("/")}`

export default async function OrganizationSettingsRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("COMPANY_READ")

  redirect(localizePath(companySettingsPath, locale))
}
