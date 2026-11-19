import { HrisWorkspaceSetupClient } from "@/components/hris/HrisWorkspaceSetupClient"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { getWorkspaceSetupAction } from "@/actions/hris/workspace-setup.actions"
import { localizePath, pickLocale } from "@/i18n/routing"

export default async function SetupPage({params}: {params: Promise<{locale: string}>}) {
  const locale = pickLocale((await params).locale), result = await getWorkspaceSetupAction()
  if (!result.success) return <DashboardRouteState kind="permission_denied" locale={locale} title={locale === "fr" ? "Configuration RH indisponible" : "HR setup unavailable"} message={locale === "fr" ? "Vérifiez votre compte, les droits RH et l’accès pilote auprès de votre administrateur." : "Ask your administrator to check your account, HR permissions and pilot access."} primaryHref={localizePath("/dashboard/people", locale)} />
  return <HrisWorkspaceSetupClient initial={result.data} locale={locale} />
}
