import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisDailyQueueClient} from '@/components/hris/HrisDailyQueueClient'
import {HrisApprovalInboxView} from '@/components/hris/HrisApprovalInbox'
import {HrisOperationalTimeApprovalPanel} from '@/components/hris/HrisOperationalTimeApprovalPanel'
const locale=location.pathname.startsWith('/fr/')?'fr':'en',root=createRoot(document.getElementById('root')!);document.documentElement.lang=locale
fetch(location.pathname.endsWith('/review')?'/fixture/source'+location.search:'/fixture/boot').then(async r=>{if(!r.ok)throw Error('denied');return r.json()}).then(initial=>root.render(<div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-7xl">{initial.kind==='TIME'?<HrisOperationalTimeApprovalPanel requests={initial.requests} locale={locale}/>:initial.kind==='REVIEW'?<HrisApprovalInboxView inbox={initial.inbox} locale={locale}/>:<HrisDailyQueueClient initial={initial} locale={locale}/>}</div></div>)).catch(()=>root.render(<p role="alert">{locale==='fr'?'Accès indisponible.':'Access unavailable.'}</p>))
