import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { InvoiceCorrectionWorkbench, invoiceCorrectionStorageKey } from "../InvoiceCorrectionWorkbench"
import { loadInvoiceCorrection, loadInvoiceCorrectionDetail, loadInvoiceCorrectionHistory, reviewInvoiceCorrection, submitInvoiceCorrection } from "@/actions/purchasing/invoice-correction.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
const mockT = (namespace: string, key: string) => key.split('.').reduce((value: any, part) => value[part], (mockLocale === 'en' ? en : fr)[namespace as keyof typeof en])
jest.mock("next-intl", () => ({ useLocale: () => mockLocale, useTranslations: (namespace: string) => (key: string) => mockT(namespace,key) }))
jest.mock("lucide-react", () => ({ X: () => null }))
jest.mock("@/actions/purchasing/invoice-correction.actions", () => ({ loadInvoiceCorrection: jest.fn(), loadInvoiceCorrectionDetail: jest.fn(), loadInvoiceCorrectionHistory: jest.fn(), reviewInvoiceCorrection: jest.fn(), submitInvoiceCorrection: jest.fn() }))
jest.mock("@/actions/security/step-up-auth.actions", () => ({ stepUpWithPasswordAction: jest.fn() }))
const t = (key: string) => mockT('invoiceCorrection', key), p = (key: string) => mockT('invoicePreparation',key)
const preparation = { supplierId: 'supplier', invoiceNumber: 'INV-1', currency: 'XAF', invoiceDate: '2026-08-10', dueDate: '', notes: '', documentReference: 'https://example.invalid/document', documentSha256: 'a'.repeat(64), lines: [{ goodsReceiptLineId: 'receipt', description: 'Received goods', quantity: '1', unitCost: '2500.00', taxRate: '0' }] }
const detail = { organizationId: 'org', actorId: 'actor', invoiceId: 'invoice', supplierName: 'Supplier', previousEvidenceVerified: true, activeException: false, preparation, checkedAt: '2026-09-08T10:00:00Z', receipts: [{ id: 'receipt', receiptNumber: 'GR-1', orderNumber: 'PO-1', description: 'Goods', descriptionFr: 'Marchandises', available: '10', unitCost: '2500.00' }], receiptNext: null }
const draft = { invoiceId: 'invoice', reason: 'Correct document description', preparation: { ...preparation, dueDate: undefined, notes: undefined } }
const preview = { ...detail, draft, revision: 'b'.repeat(64), requiresFreshAuth: false, previousTotal: '2500.00', total: '2500.00', currency: 'XAF', invoiceNumber: 'INV-1', before: { ...preparation, documentSha256: 'sha256:'+'a'.repeat(64) }, expiredRequests: [], requiresNewException: false, countrySetupRequired: false }
const command = { draft, expectedRevision: preview.revision, idempotencyKey: 'correction-request-1' }
const result = { organizationId: 'org', actorId: 'actor', invoiceId: 'invoice', invoiceNumber: 'INV-1', requestReference: command.idempotencyKey, reviewedRevision: command.expectedRevision, sourceEventId: 'event', total: '2500.00', currency: 'XAF', isCurrentPreparation: true, observedInvoiceStatus: 'MATCHED', recordedAt: detail.checkedAt }
function show() { return render(<InvoiceCorrectionWorkbench organizationId="org" actorId="actor" />) }
async function fill() { fireEvent.click(await screen.findByRole('radio')); await screen.findByDisplayValue(preparation.documentReference); fireEvent.change(screen.getByLabelText(t('reason')), { target: { value: draft.reason } }) }
async function review() { await fill(); fireEvent.click(screen.getByRole('button', { name: t('review') })); await screen.findByRole('dialog') }
beforeEach(() => {
  jest.clearAllMocks(); sessionStorage.clear(); mockLocale = 'en'
  Object.defineProperty(crypto,'randomUUID',{ configurable:true, value:() => command.idempotencyKey })
  ;(loadInvoiceCorrection as jest.Mock).mockResolvedValue({ success:true, data:{organizationId:'org',actorId:'actor',invoices:[{id:'invoice',invoiceNumber:'INV-1',total:'2500.00',currency:'XAF',canCorrect:true}],next:null} })
  ;(loadInvoiceCorrectionDetail as jest.Mock).mockResolvedValue({success:true,data:detail})
  ;(loadInvoiceCorrectionHistory as jest.Mock).mockResolvedValue({success:true,data:{organizationId:'org',actorId:'actor',invoiceId:'invoice',records:[],next:null}})
  ;(reviewInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:preview})
  ;(submitInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:result})
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({success:true})
})
test.each(['en','fr'] as const)('prefills current source and records reviewed correction in %s', async locale => {
  mockLocale = locale; show(); await review()
  expect(screen.getByLabelText(p('date'))).toHaveValue('2026-08-10')
  expect(screen.getByRole('dialog')).toHaveTextContent(t('before')); expect(screen.getByRole('dialog')).toHaveTextContent(t('after'))
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:t('confirm')}))
  await waitFor(() => expect(submitInvoiceCorrection).toHaveBeenCalledWith(command))
  expect(await screen.findAllByText(t('current'))).not.toHaveLength(0)
})
test('partial draft survives refresh without being replaced by source prefill', async () => {
  const view = show(); await fill(); fireEvent.change(screen.getByLabelText(t('reason')),{target:{value:'Partial'}})
  await waitFor(() => expect(sessionStorage.getItem(invoiceCorrectionStorageKey('org','actor')+':draft')).toContain('Partial'))
  view.unmount(); show(); expect(await screen.findByLabelText(t('reason'))).toHaveValue('Partial')
  await screen.findByDisplayValue(preparation.documentReference)
  await waitFor(() => expect(screen.getByRole('button',{name:t('review')})).toBeEnabled())
  fireEvent.click(screen.getByRole('button',{name:t('review')})); expect(await screen.findByRole('alert')).toHaveTextContent(t('invalid')); expect(reviewInvoiceCorrection).not.toHaveBeenCalled()
})
test('exact pending recovery does not require an editable invoice after downstream approval', async () => {
  sessionStorage.setItem(invoiceCorrectionStorageKey('org','actor'),JSON.stringify(command))
  ;(submitInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:{...result,isCurrentPreparation:false,observedInvoiceStatus:'POSTED'}})
  show(); const dialog = await screen.findByRole('dialog')
  expect(loadInvoiceCorrectionDetail).not.toHaveBeenCalled()
  fireEvent.change(within(dialog).getByLabelText(t('password')),{target:{value:'owned-password'}})
  fireEvent.click(within(dialog).getByRole('button',{name:t('retry')}))
  expect(await screen.findAllByText(t('historical'))).not.toHaveLength(0)
  expect(submitInvoiceCorrection).toHaveBeenCalledWith(command); expect(JSON.stringify(sessionStorage)).not.toContain('owned-password')
})
test('stale preview preserves draft and requires another review',async()=>{
  ;(submitInvoiceCorrection as jest.Mock).mockResolvedValue({success:false,code:'CONFLICT'})
  show(); await review(); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:t('confirm')}))
  expect(await screen.findByRole('alert')).toHaveTextContent(t('stale')); expect(screen.getByLabelText(t('reason'))).toHaveValue(draft.reason); expect(sessionStorage.getItem(invoiceCorrectionStorageKey('org','actor'))).toBeNull()
})
test('mismatched result stays uncertain and retains the exact request',async()=>{
  ;(submitInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:{...result,requestReference:'wrong'}})
  show(); await review(); fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:t('confirm')}))
  expect(await screen.findByRole('alert')).toHaveTextContent(t('unknown')); expect(sessionStorage.getItem(invoiceCorrectionStorageKey('org','actor'))).not.toBeNull(); expect(screen.queryByText(t('current'))).toBeNull()
})
test('active exception explains why review is unavailable',async()=>{
  ;(loadInvoiceCorrectionDetail as jest.Mock).mockResolvedValue({success:true,data:{...detail,activeException:true}})
  show(); await fill(); expect(screen.getByRole('alert')).toHaveTextContent(t('activeException')); expect(screen.getByRole('button',{name:t('review')})).toBeDisabled()
})
test('posted maker invoices retain history selection across reload without an editable form',async()=>{
  ;(loadInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:{organizationId:'org',actorId:'actor',invoices:[{id:'invoice',invoiceNumber:'INV-1',total:'2500.00',currency:'XAF',canCorrect:false}],next:null}})
  const view=show(); fireEvent.click(await screen.findByRole('radio'))
  await screen.findByText(t('historyEmpty')); expect(screen.getByRole('radio')).toBeChecked(); expect(loadInvoiceCorrectionDetail).not.toHaveBeenCalled()
  await waitFor(()=>expect(sessionStorage.getItem(invoiceCorrectionStorageKey('org','actor')+':selected')).toBe('invoice'))
  view.unmount(); show(); await screen.findByText(t('historyEmpty')); expect(screen.queryByLabelText(t('reason'))).toBeNull(); expect(loadInvoiceCorrectionDetail).not.toHaveBeenCalled()
})
test('source query failure is not an empty success',async()=>{
  ;(loadInvoiceCorrection as jest.Mock).mockRejectedValue(new Error('query failed'))
  show(); expect(await screen.findByRole('alert')).toHaveTextContent(t('loadFailed')); expect(screen.queryByText(t('empty'))).toBeNull()
})
test('denial invalidates an in-flight private source response',async()=>{
  let resolveDetail!: (value: unknown)=>void
  ;(loadInvoiceCorrectionDetail as jest.Mock).mockReturnValue(new Promise(resolve=>{resolveDetail=resolve}))
  ;(loadInvoiceCorrectionHistory as jest.Mock).mockResolvedValue({success:false,code:'FORBIDDEN'})
  show(); fireEvent.click(await screen.findByRole('radio')); await screen.findByText(t('denied'))
  resolveDetail({success:true,data:detail}); await waitFor(()=>expect(screen.queryByLabelText(t('reason'))).toBeNull())
  expect(sessionStorage.getItem(invoiceCorrectionStorageKey('org','actor')+':draft')).toBeNull()
})
test('password failure never submits financial source change',async()=>{
  ;(reviewInvoiceCorrection as jest.Mock).mockResolvedValue({success:true,data:{...preview,requiresFreshAuth:true}})
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({success:false})
  show(); await review(); const dialog=screen.getByRole('dialog'); fireEvent.change(within(dialog).getByLabelText(t('password')),{target:{value:'wrong-password'}}); fireEvent.click(within(dialog).getByRole('button',{name:t('confirm')}))
  expect(await screen.findByRole('alert')).toHaveTextContent(t('passwordFailed')); expect(submitInvoiceCorrection).not.toHaveBeenCalled(); expect(JSON.stringify(sessionStorage)).not.toContain('wrong-password')
})
