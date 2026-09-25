import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import { InvoicePreparationWorkbench, invoicePreparationStorageKey } from "../InvoicePreparationWorkbench"
import { loadInvoicePreparation, submitInvoicePreparation } from "@/actions/purchasing/invoice-preparation.actions"
import en from "@/messages/en.json"
import fr from "@/messages/fr.json"
let mockLocale: "en" | "fr" = "en"
const mockT = (key: string) => key.split('.').reduce((v: any,k)=>v[k],(mockLocale==='en'?en:fr).invoicePreparation)
jest.mock("next-intl",()=>({useLocale:()=>mockLocale,useTranslations:()=>mockT}))
jest.mock("lucide-react",()=>({X:()=>null,AlertTriangle:()=>null,CheckCircle2:()=>null,Clock:()=>null}))
jest.mock("@/actions/purchasing/invoice-preparation.actions",()=>({loadInvoicePreparation:jest.fn(),reviewInvoicePreparation:jest.fn(),submitInvoicePreparation:jest.fn()}))
const draft={supplierId:'supplier',invoiceNumber:'INV-1',invoiceDate:'2026-08-10',currency:'XAF',documentReference:'https://example.invalid/retained',documentSha256:'a'.repeat(64),lines:[{goodsReceiptLineId:'receipt',description:'Goods',quantity:'1',unitCost:'2700.00',taxRate:'0'}]}
const command={draft,expectedRevision:'b'.repeat(64),idempotencyKey:'request-preparation-1'}
const outcome={organizationId:'org',actorId:'actor',invoiceId:'invoice',invoiceNumber:'INV-1',recordedAt:'2026-08-10T10:00:00Z',requestReference:command.idempotencyKey,reviewedRevision:command.expectedRevision,preparationStatus:'DISPUTED',total:'2700.00',currency:'XAF',documentReference:draft.documentReference,documentSha256:draft.documentSha256,replayed:true,sourceEventId:'event',currentPreparationState:'SUPERSEDED',observedInvoiceStatus:'POSTED',observedTotal:'2500.00',observedAt:'2026-09-08T10:00:00Z',archived:false}
const key=invoicePreparationStorageKey('org','actor')
function show(){return render(<InvoicePreparationWorkbench organizationId="org" actorId="actor" />)}
beforeEach(()=>{jest.clearAllMocks();sessionStorage.clear();mockLocale='en';sessionStorage.setItem(key,JSON.stringify(command));(submitInvoicePreparation as jest.Mock).mockResolvedValue({success:true,data:outcome});(loadInvoicePreparation as jest.Mock).mockResolvedValue({success:false,code:'NOT_FOUND'})})
test.each(['en','fr'] as const)('recovery distinguishes original values from current posted observation in %s',async locale=>{
  mockLocale=locale;show();const dialog=await screen.findByRole('dialog');expect(loadInvoicePreparation).not.toHaveBeenCalled()
  fireEvent.click(within(dialog).getByRole('button',{name:mockT('retry')}))
  await waitFor(()=>expect(within(dialog).getByText(mockT('preparationStates.SUPERSEDED'))).toBeVisible())
  expect(dialog).toHaveTextContent(mockT('observationHelp')); expect(dialog).not.toHaveTextContent(mockT('reviewHelp'))
  expect(dialog).toHaveTextContent('2700.00');expect(dialog).toHaveTextContent('2500.00');expect(dialog).toHaveTextContent(mockT('invoiceStates.POSTED'));expect(dialog).not.toHaveTextContent(mockT('disputed'));expect(submitInvoicePreparation).toHaveBeenCalledWith(command)
})
test('invalid current proof is shown as unverified while archived evidence stays historical',async()=>{
  ;(submitInvoicePreparation as jest.Mock).mockResolvedValue({success:true,data:{...outcome,currentPreparationState:'UNVERIFIED',archived:true}})
  show();const dialog=await screen.findByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:mockT('retry')}))
  expect(await within(dialog).findByText(mockT('preparationStates.UNVERIFIED'))).toBeVisible();expect(dialog).toHaveTextContent(mockT('archivedObservation'))
})
test('mismatched request is not accepted as recovered preparation',async()=>{
  ;(submitInvoicePreparation as jest.Mock).mockResolvedValue({success:true,data:{...outcome,requestReference:'wrong'}})
  show();const dialog=await screen.findByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:mockT('retry')}))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(mockT('unknown'));expect(sessionStorage.getItem(key)).not.toBeNull();expect(within(dialog).queryByText(mockT('preparationStates.SUPERSEDED'))).toBeNull()
})
test('missing current observation does not present old protocol response as current truth',async()=>{
  ;(submitInvoicePreparation as jest.Mock).mockResolvedValue({success:true,data:{...outcome,currentPreparationState:undefined}})
  show();const dialog=await screen.findByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:mockT('retry')}))
  expect(await within(dialog).findByRole('alert')).toHaveTextContent(mockT('unknown'));expect(sessionStorage.getItem(key)).not.toBeNull()
})
test('denied recovery clears the exact request and private state',async()=>{
  ;(submitInvoicePreparation as jest.Mock).mockResolvedValue({success:false,code:'FORBIDDEN'})
  show();fireEvent.click(within(await screen.findByRole('dialog')).getByRole('button',{name:mockT('retry')}))
  expect(await screen.findByRole('alert')).toHaveTextContent(mockT('denied'));expect(sessionStorage.getItem(key)).toBeNull();expect(screen.queryByRole('dialog')).toBeNull()
})
