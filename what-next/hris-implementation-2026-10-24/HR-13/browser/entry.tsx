import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisRosterWorkspaceClient} from '@/components/hris/HrisRosterWorkspaceClient'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
const root=createRoot(document.getElementById('root')!)
fetch('/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'BOOT',input:{locale,own:location.pathname.includes('/me/')}})}).then(r=>r.json()).then(result=>root.render(result.success?<HrisRosterWorkspaceClient initial={result.data} locale={locale}/>:<DashboardRouteState kind="permission_denied" locale={locale} primaryHref={`/${locale}/dashboard`}/>))
