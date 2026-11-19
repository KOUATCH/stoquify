import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisDocumentWorkspaceClient} from '@/components/hris/HrisDocumentWorkspaceClient'
const locale=location.pathname.startsWith('/fr/')?'fr':'en';document.documentElement.lang=locale
const employeeId=location.pathname.endsWith('/people/documents')?new URLSearchParams(location.search).get('employeeId')??undefined:undefined
createRoot(document.getElementById('root')!).render(<div className="dashboard-landing-theme dark min-h-screen"><div className="dashboard-landing-content mx-auto max-w-3xl"><HrisDocumentWorkspaceClient locale={locale} employeeId={employeeId}/></div></div>)
