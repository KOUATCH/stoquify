import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisPersonalCorrectionWorkspaceClient} from '@/components/hris/HrisPersonalCorrectionWorkspaceClient'
import {HrisEmployeeSelfService} from '@/components/hris/HrisEmployeeSelfService'
import {HrisDocumentWorkspaceClient} from '@/components/hris/HrisDocumentWorkspaceClient'
const locale=location.pathname.startsWith('/fr/')?'fr':'en',root=createRoot(document.getElementById('root')!);document.documentElement.lang=locale
const render=(node:React.ReactNode)=>root.render(<div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-4xl">{node}</div></div>)
if(location.pathname.endsWith('/documents'))render(<HrisDocumentWorkspaceClient locale={locale}/>);
else fetch('/fixture/boot?path='+encodeURIComponent(location.pathname)).then(async r=>{if(!r.ok)throw Error('denied');return r.json()}).then(({initial,model,own})=>render(model?<HrisEmployeeSelfService model={model} locale={locale} payslipsHref={`/${locale}/dashboard/payroll/payslips`}/>:<HrisPersonalCorrectionWorkspaceClient initial={initial} own={own} locale={locale}/>)).catch(()=>render(<p role="alert">{locale==='fr'?'Accès indisponible. Contactez les RH pour vérifier votre compte.':'Access unavailable. Contact HR to check your account.'}</p>))
