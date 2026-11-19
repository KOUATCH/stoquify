import {HrisFreshAuthGate} from "@/components/hris/useHrisFreshAuth"
import {getOwnCorrectionWorkspaceAction} from "@/actions/hris/personal-correction.actions"
import {HrisPersonalCorrectionWorkspaceClient} from "@/components/hris/HrisPersonalCorrectionWorkspaceClient"
import {DashboardRouteState} from "@/components/dashboard/DashboardRouteState"
import {pickLocale,localizePath} from "@/i18n/routing"
export default async function OwnCorrectionsPage({params}:{params:Promise<{locale:string}>}){const locale=pickLocale((await params).locale),result=await getOwnCorrectionWorkspaceAction();if(!result.success&&result.code==="FRESH_AUTH_REQUIRED")return <HrisFreshAuthGate locale={locale}/>;if(!result.success)return <DashboardRouteState kind={result.code==="FRESH_AUTH_REQUIRED"?"stale_session":result.status===403?"permission_denied":"error"} locale={locale} message={result.error} primaryHref={localizePath("/dashboard/people/me",locale)}/>;return <HrisPersonalCorrectionWorkspaceClient initial={result.data} own locale={locale}/>}
