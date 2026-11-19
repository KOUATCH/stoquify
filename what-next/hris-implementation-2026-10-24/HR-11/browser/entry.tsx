import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisEmployeeImport} from '@/components/hris/HrisEmployeeImport'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
const root=createRoot(document.getElementById('root')!)
async function execute(command:any,input:any){return(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command,input})})).json()}
execute('TEMPLATE',{}).then(result=>{if(!result.success)throw Error('Unavailable');root.render(<HrisEmployeeImport organizationId={result.data.organizationId} locale={locale} execute={execute}/>)}).catch(()=>root.render(<DashboardRouteState kind="permission_denied" locale={locale} primaryHref={`/${locale}/dashboard`}/>))
