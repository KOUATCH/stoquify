import {HrisFreshAuthGate} from "@/components/hris/useHrisFreshAuth"
import {getDailyHrisQueueAction} from '@/actions/hris/daily-queue.actions'
import {getPayrollHandoffWorkspaceAction} from '@/actions/hris/payroll-handoff.actions'
import {HrisDailyQueueClient} from '@/components/hris/HrisDailyQueueClient'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
import {pickLocale,localizePath} from '@/i18n/routing'
export default async function DailyWorkPage({params}:{params:Promise<{locale:string}>}){const locale=pickLocale((await params).locale),result=await getDailyHrisQueueAction();if(!result.success&&result.code==="FRESH_AUTH_REQUIRED")return <HrisFreshAuthGate locale={locale}/>;if(!result.success)return <DashboardRouteState kind={result.code==='FRESH_AUTH_REQUIRED'?'stale_session':result.status===403?'permission_denied':'error'} locale={locale} message={result.error} primaryHref={localizePath('/dashboard',locale)}/>;const handoff=await getPayrollHandoffWorkspaceAction();return <>{handoff.success&&<div className="px-4 pt-4 md:px-6"><a className="underline" href={localizePath('/dashboard/people/handoff',locale)}>{locale==='fr'?'Préparer ou rapprocher une transmission de paie':'Prepare or reconcile a payroll handoff'}</a></div>}<HrisDailyQueueClient initial={result.data} locale={locale}/></>}
