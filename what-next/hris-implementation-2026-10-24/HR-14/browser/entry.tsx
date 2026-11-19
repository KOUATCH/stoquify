import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisControlledReview} from '@/components/hris/HrisControlledReview'
import {HrisManagerSelfService} from '@/components/hris/HrisManagerSelfService'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
fetch('/boot'+location.pathname).then(r=>r.json()).then(({target,model})=>createRoot(document.getElementById('root')!).render(<main className="dashboard-landing-theme dark min-h-screen p-4"><div className="dashboard-landing-content mx-auto max-w-3xl space-y-4">{model?<HrisManagerSelfService model={model} locale={locale} approvalsHref={'/'+locale+'/dashboard/people/approvals'}/>:<><h1>{locale==='fr'?'Validation RH contrôlée':'Controlled HR review'}</h1><HrisControlledReview target={target} locale={locale} label={locale==='fr'?'Vérifier la demande':'Review request'}/></>}</div></main>))
