import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisPeopleAuthoring} from '@/components/hris/HrisPeopleAuthoring'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
const root=createRoot(document.getElementById('root')!)
async function reload(employeeId?:string){const response=await fetch('/api'+(employeeId?'?employeeId='+encodeURIComponent(employeeId):''));if(!response.ok)throw Error('Unavailable');return response.json()}
reload().then(data=>root.render(<HrisPeopleAuthoring initial={data} locale={locale} reload={reload} execute={async command=>(await fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(command)})).json()}/>)).catch(()=>root.render(<DashboardRouteState kind="permission_denied" locale={locale} primaryHref={`/${locale}/dashboard`}/>))
