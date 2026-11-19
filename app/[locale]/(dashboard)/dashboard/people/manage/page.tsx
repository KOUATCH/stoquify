import { HrisPeopleAuthoringClient } from "@/components/hris/HrisPeopleAuthoringClient"
import { DashboardRouteState } from "@/components/dashboard/DashboardRouteState"
import { getPeopleAuthoringAction } from "@/actions/hris/people-authoring-read.actions"
import { pickLocale, localizePath } from "@/i18n/routing"
export default async function PeopleManagePage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{employeeId?:string}>}) {
  const locale=pickLocale((await params).locale),query=await searchParams
  const result=await getPeopleAuthoringAction({employeeId:query.employeeId})
  if(!result.success)return <DashboardRouteState kind="permission_denied" locale={locale} title={locale==="fr"?"Administration RH indisponible":"HR administration unavailable"} message={locale==="fr"?"Vérifiez vos droits de gestion RH et l’accès pilote auprès de votre administrateur.":"Ask your administrator to check HR management permissions and pilot access."} primaryHref={localizePath("/dashboard/people",locale)}/>
  return <HrisPeopleAuthoringClient initial={result.data} locale={locale}/>
}
