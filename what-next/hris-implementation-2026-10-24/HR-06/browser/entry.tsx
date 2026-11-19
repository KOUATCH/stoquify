import React from 'react'
import {createRoot} from 'react-dom/client'
import {HrisEmployeeDirectoryTable} from '@/components/hris/HrisEmployeeDirectoryTable'
import {DashboardRouteState} from '@/components/dashboard/DashboardRouteState'
import PeopleError from '@/app/[locale]/(dashboard)/dashboard/people/error'
import {peopleDirectoryQuerySchema} from '@/services/hris/people-directory-query'
const locale = location.pathname.startsWith('/fr/') ? 'fr' : 'en'
document.documentElement.lang = locale
const root = createRoot(document.getElementById('root')!)
root.render(<DashboardRouteState kind="loading" locale={locale} primaryHref={`/${locale}/dashboard`} />)
fetch('/api'+location.search).then(async response => {
  if (response.status === 403) {root.render(<DashboardRouteState kind="permission_denied" locale={locale} primaryHref={`/${locale}/dashboard`} />);return}
  if (!response.ok) throw new Error('Unavailable')
  const directory = await response.json()
  root.render(<HrisEmployeeDirectoryTable employees={directory.employees} pagination={directory.pagination} locale={locale} query={peopleDirectoryQuerySchema.parse(Object.fromEntries(new URLSearchParams(location.search)))} />)
}).catch(()=>root.render(<PeopleError error={new Error('Unavailable')} reset={()=>location.reload()} />))
