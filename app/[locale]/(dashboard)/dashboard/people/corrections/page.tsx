import {HrisFreshAuthGate} from "@/components/hris/useHrisFreshAuth"
import {getCorrectionQueueAction} from "@/actions/hris/personal-correction.actions"
import {HrisPersonalCorrectionWorkspaceClient} from "@/components/hris/HrisPersonalCorrectionWorkspaceClient"
import {DashboardRouteState} from "@/components/dashboard/DashboardRouteState"
import {pickLocale,localizePath} from "@/i18n/routing"
export default async function CorrectionQueuePage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<{caseId?:string}>}){const locale=pickLocale((await params).locale),{caseId}=await searchParams,result=await getCorrectionQueueAction({caseId});if(!result.success&&result.code==="FRESH_AUTH_REQUIRED")return <HrisFreshAuthGate locale={locale}/>;if(!result.success)return <DashboardRouteState kind={result.code==="FRESH_AUTH_REQUIRED"?"stale_session":result.status===403?"permission_denied":"error"} locale={locale} message={result.error} primaryHref={localizePath("/dashboard/people",locale)}/>;return <HrisPersonalCorrectionWorkspaceClient initial={result.data} own={false} locale={locale} selectedCaseId={caseId}/>}
