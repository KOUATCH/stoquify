import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { NextIntlClientProvider } from 'next-intl'
import en from '@/messages/en.json'
import fr from '@/messages/fr.json'
import { PurchaseReceivingWorkbench } from '@/components/purchase-orders/PurchaseReceivingWorkbench'
import { LocalOfflineRecovery } from '@/components/pos/offline/LocalOfflineRecovery'
import { InventoryMovementHistoryTable } from '@/components/inventory/movements/InventoryMovementHistoryTable'
import { enqueueOfflineLocalEvent, inspectOfflineLocalQueues } from '@/lib/pos/offline-local-queue'
const params = new URLSearchParams(location.search), locale = params.get('lang') === 'fr' ? 'fr' : 'en', flow = params.get('flow') ?? 'receiving'
document.documentElement.lang = locale
const now = '2026-10-26T12:00:00.000Z'
const row = { id: 'ui-movement', type: 'SALE', quantity: '-3.000', totalCost: '300.02', currency: 'XAF', effectiveAt: now, recordedAt: now, item: { name: locale === 'fr' ? 'Riz' : 'Rice', sku: 'RICE', unit: 'kg' }, location: { name: 'Main warehouse' }, reference: { number: 'SALE-UI-001' } }
function App() {
  const [open, setOpen] = useState(false), [filters, setFilters] = useState<any>({ pageSize: 50 }), [selected, select] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const history: any = { filters, rows: filters.search === 'missing' ? [] : [row], result: { rows: [row], summary: { transactionCount: 1 }, snapshot: { recordedThrough: now, timezone: 'Africa/Douala' }, completeness: { state: 'complete', sources: [] } }, isLoading: loading, isFetching: false, selectedRowId: selected, canExport: true, isExporting: false, hasMore: false, canPreviousPage: false, canFirstPage: false, updateFilters: (patch: any) => setFilters((old: any) => ({ ...old, ...patch })), resetFilters: () => setFilters({ pageSize: 50 }), nextPage() {}, previousPage() {}, firstPage() {}, exportHistory() {}, refetch: async () => { setLoading(true); await new Promise(r => setTimeout(r, 500)); setLoading(false) } }
  return <NextIntlClientProvider locale={locale} messages={locale === 'fr' ? fr : en} timeZone="Africa/Douala"><main className="dashboard-landing-theme dark min-h-screen bg-[var(--dash-bg)] p-4 text-[var(--dash-text)]"><h1 className="mb-4 text-xl">{locale === 'fr' ? 'Vérification des parcours' : 'Workflow verification'}</h1>
    {flow === 'receiving' ? <><button id="open-receiving" className="dashboard-button-primary mb-4 rounded-lg p-3" onClick={() => setOpen(true)}>{locale === 'fr' ? 'Ouvrir la réception' : 'Open receiving'}</button><PurchaseReceivingWorkbench orderId="ui-order" organizationId="ui-org" actorId="ui-actor" open={open} onOpenChange={setOpen} onChanged={() => { (window as any).changedCount = ((window as any).changedCount ?? 0) + 1 }} /></> : flow === 'inventory' ? <><InventoryMovementHistoryTable history={history} locale={locale} timezone="Africa/Douala" onSelectRow={select}/><p role="status">{selected ?? ''}</p></> : <LocalOfflineRecovery organizationId="ui-org" userId="ui-actor" locationId="ui-location" terminalId="ui-terminal" sessionId="ui-session" canRead canSend locale={locale} />}
  </main></NextIntlClientProvider>
}
async function start() {
  if (flow === 'offline') await enqueueOfflineLocalEvent({ organizationKey: 'ui-org', deviceId: 'ui-device', terminalId: 'ui-terminal', locationId: 'ui-location', sessionId: 'ui-session' }, { eventType: 'OFFLINE_SALE_CAPTURED', payload: { synthetic: true }, idempotencyKey: 'ui-retained-original' })
  ;(window as any).inspectQueues = () => inspectOfflineLocalQueues({ organizationKey: 'ui-org', locationId: 'ui-location', terminalId: 'ui-terminal' })
  createRoot(document.getElementById('root')!).render(<App />)
}
void start()
