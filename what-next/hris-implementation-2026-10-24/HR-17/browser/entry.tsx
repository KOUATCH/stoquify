import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisLifecycleTasksClient} from '@/components/hris/HrisLifecycleTasksClient'
const locale=location.pathname.startsWith('/fr/')?'fr':'en',root=createRoot(document.getElementById('root')!);document.documentElement.lang=locale
fetch('/fixture/boot').then(async r=>{if(!r.ok)throw Error('denied');return r.json()}).then(initial=>root.render(<div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-4xl"><HrisLifecycleTasksClient initial={initial} locale={locale}/></div></div>)).catch(()=>root.render(<p role="alert">{locale==='fr'?'Accès indisponible. Contactez les RH.':'Access unavailable. Contact HR.'}</p>))
