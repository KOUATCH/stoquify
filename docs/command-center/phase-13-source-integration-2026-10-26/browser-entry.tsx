import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { useHrisFreshAuth } from '@/components/hris/useHrisFreshAuth'

function Fixture() {
  const locale = location.pathname.startsWith('/fr') ? 'fr' : 'en'
  const [scope, setScope] = useState('employee-a')
  const [draft, setDraft] = useState('Synthetic retained draft')
  const recovery = useHrisFreshAuth(locale, scope)
  Object.assign(window, { fixtureChangeScope: () => setScope('employee-b') })
  const t = (en: string, fr: string) => locale === 'fr' ? fr : en
  return <main className="dashboard-landing-theme dark min-h-screen p-6 text-[var(--dash-text)]">
    <h1 className="text-xl font-semibold">{t('Password recovery fixture', 'Vérification du mot de passe — simulation')}</h1>
    <p className="my-4">{t('Synthetic interface checks only. No account or business operation is connected.', 'Contrôles simulés de l’interface. Aucun compte ni opération métier n’est connecté.')}</p>
    <label className="grid max-w-lg gap-2">{t('Retained draft', 'Brouillon conservé')}
      <input className="dashboard-control min-h-11 rounded px-3" value={draft} onChange={e=>setDraft(e.target.value)}/>
    </label>
    <button className="dashboard-button-primary mt-4 min-h-11 px-4" onClick={()=>void recovery.run(async()=>{
      window.fixtureBusinessCalls++
      return { success:false, code:'FRESH_AUTH_REQUIRED' }
    })}>{t('Save draft', 'Enregistrer le brouillon')}</button>
    {recovery.dialog}
  </main>
}
Object.assign(window,{fixtureBusinessCalls:0,fixturePasswordCalls:0,fixturePasswordMode:'invalid'})
createRoot(document.getElementById('root')!).render(<Fixture/>);
