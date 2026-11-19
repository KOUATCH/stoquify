// Explicit simulated server responses. These prove rendered recovery behavior, not database effects.
import { useState } from 'react'
export const fixture = { organizationId: 'ui-org', actorId: 'ui-actor', orderId: 'ui-order', orderNumber: 'PO-UI-001', orderStatus: 'APPROVED', supplier: 'Synthetic supplier', currency: 'XAF', checkedAt: '2026-10-26T12:00:00.000Z', revision: 'a'.repeat(64), locationId: 'ui-location', location: 'Main warehouse', canReceive: true, canReviewAccounting: false, lines: [{ id: 'ui-line', itemId: 'ui-item', nameEn: 'Rice', nameFr: 'Riz', ordered: '3', received: '0', held: '0', available: '3', unitCost: '100.01', trackBatches: false, trackSerialNumbers: false, trackExpiry: false, active: true }], receipts: [], olderReceipts: false }
const pause = () => new Promise(resolve => setTimeout(resolve, 250))
export async function loadPurchaseReceiving() { await pause(); return { success: true, data: fixture } }
export async function reviewPurchaseReceiving(draft: any) { await pause(); return { success: true, data: { ...fixture, draft, quantity: '1', value: '100.01', disposition: 'RECEIVED', requiresFreshAuth: false, lines: [{ id: 'ui-line', nameEn: 'Rice', nameFr: 'Riz', quantity: '1', unitCost: '100.01', value: '100.01' }] } } }
export async function submitPurchaseReceiving(command: any) {
  const w = window as any; (w.submittedCommands ??= []).push(command); await pause();
  if (w.submittedCommands.length === 1) throw new Error('Synthetic lost response');
  return { success: true, data: { kind: 'receive', orderId: fixture.orderId, goodsReceiptId: 'ui-receipt', receiptNumber: 'GR-UI-001', requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, actorId: fixture.actorId, recordedAt: fixture.checkedAt, disposition: 'RECEIVED', quantity: '1', value: '100.01', currency: fixture.currency, stockStatus: 'recorded', accountingStatus: 'review_required', replayed: true } }
}
export async function stepUpWithPasswordAction() { return { success: false, code: 'FORBIDDEN' } }
export async function reviewReceiptLedgerRecovery() { return { success: false, code: 'FORBIDDEN' } }
export async function submitReceiptLedgerRecovery() { return { success: false, code: 'FORBIDDEN' } }
export function useFlushOfflinePOSQueue() {
  const [isPending, pending] = useState(false), [isError, error] = useState(false)
  return { isPending, isError, mutateAsync: async () => { pending(true); await pause(); pending(false); error(true); throw new Error('Synthetic unknown outcome') } }
}
