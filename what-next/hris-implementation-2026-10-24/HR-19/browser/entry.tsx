import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisPayrollHandoffClient} from '@/components/hris/HrisPayrollHandoffClient'
const locale=location.pathname.startsWith('/fr/')?'fr':'en',root=createRoot(document.getElementById('root')!);document.documentElement.lang=locale
fetch('/fixture/workspace',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'}).then(async r=>{if(!r.ok)throw Error('denied');return r.json()}).then(initial=>root.render(<div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-7xl"><HrisPayrollHandoffClient initial={initial} locale={locale}/></div></div>)).catch(()=>root.render(<p role="alert">{locale==='fr'?'Accès indisponible.':'Access unavailable.'}</p>))
