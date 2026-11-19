import {getDailyHrisSourceAction} from '@/actions/hris/daily-queue.actions'
import {HrisApprovalInboxView} from '@/components/hris/HrisApprovalInbox'
import {HrisOperationalTimeApprovalPanel} from '@/components/hris/HrisOperationalTimeApprovalPanel'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
import {pickLocale,localizePath} from '@/i18n/routing'
export default async function DailyReviewPage({params,searchParams}:{params:Promise<{locale:string}>;searchParams:Promise<Record<string,string>>}){const locale=pickLocale((await params).locale),r=await getDailyHrisSourceAction(await searchParams);if(!r.success)return <DashboardRouteState kind="permission_denied" locale={locale} primaryHref={localizePath('/dashboard/people/work',locale)}/>;return <main className="p-4"><a href={localizePath('/dashboard/people/work',locale)}>{locale==='fr'?'Retour au travail RH':'Back to daily HR work'}</a>{r.data.kind==='TIME'?<HrisOperationalTimeApprovalPanel locale={locale} requests={r.data.requests}/>:<HrisApprovalInboxView locale={locale} inbox={r.data.inbox}/>}</main>}
