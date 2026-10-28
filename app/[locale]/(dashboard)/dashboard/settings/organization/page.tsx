import { checkPermission } from "@/config/useAuth"
import { localizePath, pickLocale } from "@/i18n/routing"
import { redirect } from "next/navigation"
import { routeByKey, withSettingsSurfaceAccess } from "../settings-route-access"

const companySettingsPath = `/${["dashboard", "settings", "company"].join("/")}`

async function OrganizationSettingsRedirectPageImpl({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale: rawLocale } = await params
  const locale = pickLocale(rawLocale)
  await checkPermission("COMPANY_READ")

  return redirect(localizePath(companySettingsPath, locale))
}



export default async function SettingsRoutePage(props: any = {}) {
  const surface = routeByKey("settings-organization")

  if (!surface) {
    throw new Error("Missing settings route surface definition: settings-organization")
  }

  return withSettingsSurfaceAccess({
    params: (props as { params?: Promise<{ locale: string }> }).params ?? Promise.resolve({ locale: "en" }),
    surface,
    onAllowed: async () => OrganizationSettingsRedirectPageImpl(props),
  })
}
