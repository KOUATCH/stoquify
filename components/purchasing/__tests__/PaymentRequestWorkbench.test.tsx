import { fireEvent, render, screen, within, waitFor } from "@testing-library/react"
import { PaymentRequestWorkbench, paymentWorkspaceStorageKey } from "../PaymentRequestWorkbench"
import * as actions from "@/actions/purchasing/payment-request.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import en from "@/messages/payment-request/en.json"
import fr from "@/messages/payment-request/fr.json"
let mockLocale:"en"|"fr"="en"
const mockT=(key:string,values?:Record<string,string>)=>{let value=key.split('.').reduce<unknown>((current,part)=>(current as Record<string,unknown>)[part],mockLocale==='fr'?fr:en) as string;for(const[k,v]of Object.entries(values??{}))value=value.replace(`{${k}}`,v);return value}
jest.mock("next-intl",()=>({useTranslations:()=>mockT,useLocale:()=>mockLocale}))
jest.mock("@/actions/purchasing/payment-request.actions",()=>({loadSupplierPaymentSources:jest.fn(),loadSupplierPaymentRequests:jest.fn(),loadSupplierPaymentRequestHistory:jest.fn(),reviewSupplierPaymentRequest:jest.fn(),submitSupplierPaymentRequest:jest.fn(),reviewSupplierPaymentApproval:jest.fn(),confirmSupplierPaymentApproval:jest.fn()}))
jest.mock("@/actions/security/step-up-auth.actions",()=>({stepUpWithPasswordAction:jest.fn()}))
jest.mock("lucide-react",()=>({X:()=>null,AlertTriangle:()=>null,FileClock:()=>null,ShieldCheck:()=>null}))
const scope={organizationId:"org",actorId:"actor"},draft={supplierId:"supplier",bankAccountId:"bank",method:"BANK_TRANSFER" as const,paymentDate:"2026-08-12",documentReference:"https://example.invalid/payment",documentSha256:"a".repeat(64),notes:"Reviewed instruction",allocations:[{supplierInvoiceId:"invoice",amount:"10.25"}]}
const preview={...scope,draft,revision:"b".repeat(64),total:"10.25",currency:"XAF",supplierName:"Owned supplier",bankLabel:"Bank ****0000",checkedAt:"2026-09-08T12:00:00Z",fresh:true,invoices:[{id:"invoice",number:"INV-1",available:"100.25",amount:"10.25"}]}
const key=paymentWorkspaceStorageKey("org","actor","request")
const show=(mode:"request"|"approve"="request")=>render(<PaymentRequestWorkbench {...scope} mode={mode}/>),review=async()=>{fireEvent.click(await screen.findByRole("button",{name:mockT("review")}));return within(await screen.findByRole("dialog"))}
beforeEach(()=>{
  jest.clearAllMocks();for(const fn of Object.values(actions))if(jest.isMockFunction(fn))fn.mockReset();(stepUpWithPasswordAction as jest.Mock).mockReset();sessionStorage.clear();mockLocale="en";Object.defineProperty(crypto,"randomUUID",{configurable:true,value:()=>"payment-request-1"})
  sessionStorage.setItem(key+":draft",JSON.stringify(draft))
  ;(actions.loadSupplierPaymentSources as jest.Mock).mockResolvedValue({success:true,data:{...scope,checkedAt:preview.checkedAt,suppliers:[{id:"supplier",name:"Owned supplier"}],supplier:{id:"supplier",name:"Owned supplier"},supplierNext:null,bankNext:null,invoiceNext:null,pendingBankChange:false,banks:[{id:"bank",label:"Bank ****0000"}],invoices:[{id:"invoice",number:"INV-1",currency:"XAF",available:"100.25"}]}})
  ;(actions.loadSupplierPaymentRequests as jest.Mock).mockResolvedValue({success:true,data:{...scope,checkedAt:preview.checkedAt,rows:[],next:null}})
  ;(actions.loadSupplierPaymentRequestHistory as jest.Mock).mockResolvedValue({success:true,data:{...scope,paymentRequestId:"payment",number:"PAY-1",status:"DRAFT",requestedAt:preview.checkedAt,approvedAt:null,requestEventId:"request-event",approvalEventId:null,checkedAt:preview.checkedAt,archived:false}})
  ;(actions.reviewSupplierPaymentRequest as jest.Mock).mockResolvedValue({success:true,data:preview})
  ;(actions.submitSupplierPaymentRequest as jest.Mock).mockResolvedValue({success:true,data:{...scope,paymentRequestId:"payment",status:"DRAFT",replayed:false,requestReference:"payment-request-1",reviewedRevision:preview.revision}})
  ;(stepUpWithPasswordAction as jest.Mock).mockResolvedValue({success:true})
})
test.each(["en","fr"] as const)("submits reviewed terms in %s and distinguishes awaiting approval from settlement",async locale=>{
  mockLocale=locale;show();await waitFor(()=>expect(screen.getByRole("button",{name:mockT("review")})).toBeEnabled());const dialog=await review();expect(dialog.getAllByText('10.25 XAF',{exact:true})).toHaveLength(2);fireEvent.click(dialog.getByRole("button",{name:mockT("confirmRequest")}));await waitFor(()=>expect(dialog.getByRole("status")).toHaveTextContent(mockT("statuses.DRAFT")));expect(dialog.getByText(mockT("notSettlement"))).toBeVisible();expect(actions.submitSupplierPaymentRequest).toHaveBeenCalledWith({draft,expectedRevision:preview.revision,idempotencyKey:"payment-request-1"});expect(sessionStorage.getItem(key)).toBeNull()
})
test("retains an uncertain request and retries the exact command after remount and fresh password verification",async()=>{
  ;(actions.submitSupplierPaymentRequest as jest.Mock).mockRejectedValueOnce(new Error("lost response"));const view=show();await waitFor(()=>expect(screen.getByRole("button",{name:en.review})).toBeEnabled());const dialog=await review();fireEvent.click(dialog.getByRole("button",{name:en.confirmRequest}));expect(await screen.findByRole("alert")).toHaveTextContent(en.unknown);const saved=JSON.parse(sessionStorage.getItem(key)!);view.unmount();show();const restored=within(await screen.findByRole("dialog"));fireEvent.change(restored.getByLabelText(en.password),{target:{value:"not-retained"}});fireEvent.click(restored.getByRole("button",{name:en.retry}));await waitFor(()=>expect(restored.getByRole("status")).toHaveTextContent(en.statuses.DRAFT));expect(actions.submitSupplierPaymentRequest).toHaveBeenLastCalledWith(saved);expect(sessionStorage.getItem(key)).toBeNull();expect(JSON.stringify(sessionStorage)).not.toContain("not-retained")
})
test("stale rejection retains the draft and requires a new review",async()=>{
  ;(actions.submitSupplierPaymentRequest as jest.Mock).mockResolvedValue({success:false,code:"CONFLICT"});show();await waitFor(()=>expect(screen.getByRole("button",{name:en.review})).toBeEnabled());const dialog=await review();fireEvent.click(dialog.getByRole("button",{name:en.confirmRequest}));expect(await screen.findByRole("alert")).toHaveTextContent(en.stale);expect(screen.getByLabelText(en.notes)).toHaveValue(draft.notes);expect(sessionStorage.getItem(key)).toBeNull();expect(screen.queryByRole("dialog")).toBeNull()
})
test("a failed source read has no successful empty-state message",async()=>{
  ;(actions.loadSupplierPaymentSources as jest.Mock).mockRejectedValue(new Error("database unavailable"));show();expect(await screen.findByRole("alert")).toHaveTextContent(en.loadFailed);expect(screen.queryByText(en.noInvoices)).toBeNull();expect(screen.getByRole("button",{name:en.review})).toBeDisabled()
})
test("mismatched success scope is not a confirmation",async()=>{
  ;(actions.submitSupplierPaymentRequest as jest.Mock).mockResolvedValue({success:true,data:{...scope,organizationId:"other",requestReference:"payment-request-1",reviewedRevision:preview.revision,paymentRequestId:"payment",status:"APPROVED"}});show();await waitFor(()=>expect(screen.getByRole("button",{name:en.review})).toBeEnabled());const dialog=await review();fireEvent.click(dialog.getByRole("button",{name:en.confirmRequest}));expect(await screen.findByRole("alert")).toHaveTextContent(en.unknown);expect(sessionStorage.getItem(key)).not.toBeNull();expect(screen.queryByText(en.statuses.APPROVED)).toBeNull()
})
test("self-approval is explained and unavailable",async()=>{
  ;(actions.loadSupplierPaymentRequests as jest.Mock).mockResolvedValue({success:true,data:{...scope,checkedAt:preview.checkedAt,next:null,rows:[{id:"payment",number:"PAY-1",status:"DRAFT",amount:"10.25",currency:"XAF",supplierName:"Owned supplier",independentApproverRequired:true}]}});show("approve");expect(await screen.findByText(en.independent)).toBeVisible();expect(screen.getByRole("button",{name:en.reviewRequest})).toBeDisabled();expect(actions.reviewSupplierPaymentApproval).not.toHaveBeenCalled()
})
test("revoked access clears private draft and preview",async()=>{
  ;(actions.reviewSupplierPaymentRequest as jest.Mock).mockResolvedValue({success:false,code:"FORBIDDEN"});show();await waitFor(()=>expect(screen.getByRole("button",{name:en.review})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:en.review}));expect(await screen.findByRole("alert")).toHaveTextContent(en.denied);expect(screen.getByLabelText(en.notes)).toHaveValue("");expect(sessionStorage.getItem(key+":draft")).toBeNull();expect(screen.queryByRole("dialog")).toBeNull()
})
