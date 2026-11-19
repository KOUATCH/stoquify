import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisLeaveManagementClient} from '@/components/hris/HrisLeaveManagementClient'
import {HrisOperationalTimeRequestPanel} from '@/components/hris/HrisOperationalTimeRequestPanel'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
const root=createRoot(document.getElementById('root')!)
async function load(target='A'){
 const result=await(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:location.pathname.endsWith('/me')?'SELF':'BOOT',input:{target}})})).json()
 if(!result.success){root.render(<DashboardRouteState kind="permission_denied" locale={locale} primaryHref={`/${locale}/dashboard`}/>);return}
 if(location.pathname.endsWith('/me'))root.render(<main className="dashboard-landing-theme dark min-h-screen p-4"><div className="dashboard-landing-content mx-auto max-w-5xl"><h1>{locale==='en'?'My leave':'Mes congés'}</h1><HrisOperationalTimeRequestPanel {...result.data} enabled locale={locale}/></div></main>)
 else root.render(<HrisLeaveManagementClient initial={result.data} locale={locale}/>)
}
;(window as any).changeEmployee=load
load()
