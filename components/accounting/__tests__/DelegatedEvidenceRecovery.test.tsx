/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { AccountantPortfolioWorkspace } from "../AccountantPortfolioWorkspace"
import { getAccountantPortfolioAction } from "@/actions/accounting/accountant-access.actions"
import { getAccountantWorkDeskAction } from "@/actions/accounting/accountant-work-desk.actions"
import { getDelegatedEvidenceDeskAction, requestDelegatedEvidenceAction } from "@/actions/accounting/delegated-evidence-desk.actions"

jest.mock("@/actions/accounting/accountant-access.actions",()=>({getAccountantPortfolioAction:jest.fn()}))
jest.mock("@/actions/accounting/accountant-work-desk.actions",()=>({getAccountantWorkDeskAction:jest.fn(),getAccountantWorkDetailAction:jest.fn(),acceptAccountantWorkItemAction:jest.fn()}))
jest.mock("@/actions/accounting/delegated-evidence-desk.actions",()=>({getDelegatedEvidenceDeskAction:jest.fn(),requestDelegatedEvidenceAction:jest.fn()}))
jest.mock("@/actions/security/step-up-auth.actions",()=>({stepUpWithPasswordAction:jest.fn()}))
jest.mock("../AccountantNotificationHistory",()=>({AccountantNotificationHistory:()=>null}))
jest.mock("../ObligationRegister",()=>({ObligationRegister:()=>null}))
jest.mock("../AccountantPortfolio",()=>({portfolioButton:"button",AccountantPortfolio:()=> <p>Authorized portfolio</p>}))
jest.mock("next/link",()=>({__esModule:true,default:({children,href,prefetch,...props}:any)=><a href={href} {...props}>{children}</a>}))
const portfolio=getAccountantPortfolioAction as jest.Mock, desk=getAccountantWorkDeskAction as jest.Mock
const read=getDelegatedEvidenceDeskAction as jest.Mock,send=requestDelegatedEvidenceAction as jest.Mock
const portfolioData={accountantUserId:"staff",clients:[],page:{loadedCount:0,search:"",pageSize:10}}
beforeEach(()=>{
 jest.resetAllMocks()
 Object.defineProperty(global.crypto,"randomUUID",{configurable:true,value:()=>"retained-command"})
 Object.defineProperty(document,"hidden",{configurable:true,value:false})
 Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"})
 portfolio.mockResolvedValue({success:true,data:portfolioData})
 desk.mockResolvedValue({success:true,data:{items:[],clientContinuations:[{clientOrganizationId:"client",clientName:"Synthetic client",requests:null,reviews:null}],incompleteClients:0,unavailableClients:0}})
 read.mockImplementation(async input=>({success:true,data:{actorId:"staff",clientOrganizationId:"client",period:input.periodId?{id:"period",name:"October"}:null,
  periods:[{id:"period",name:"October"}],writable:true,engagement:null,nextPeriod:null,findings:[{id:"finding",title:"Missing",caseKind:"SETTLEMENT_PROOF",closeRunId:"run"}],
  recipients:[{id:"owner",name:"Owner"}],tracking:[],supervision:[],cursors:{findings:null,recipients:null,tracking:null,supervision:null},partial:false}}))
 send.mockRejectedValueOnce(Error("committed response lost")).mockResolvedValueOnce({success:true,data:{id:"request"}})
})
afterEach(()=>{
 Object.defineProperty(document,"hidden",{configurable:true,value:false})
 Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"})
})
async function uncertain(){
 render(<AccountantPortfolioWorkspace/>)
 fireEvent.click(await screen.findByRole("button",{name:"Request and track evidence: Synthetic client"}))
 await screen.findByRole("option",{name:"October"})
 fireEvent.change(screen.getByLabelText("Client accounting period"),{target:{value:"period"}})
 await screen.findByLabelText("Scoped evidence question")
 fireEvent.change(screen.getByLabelText("Existing finding"),{target:{value:"finding"}})
 fireEvent.change(screen.getByLabelText("Client response owner"),{target:{value:"owner"}})
 fireEvent.change(screen.getByLabelText("Response due"),{target:{value:"2027-01-01T12:00"}})
 fireEvent.change(screen.getByLabelText("Scoped evidence question"),{target:{value:"Private settlement evidence request"}})
 fireEvent.click(screen.getByRole("button",{name:"Send evidence request"}))
 await screen.findByText(/outcome is uncertain/)
}
it.each(["visibility","refresh","bfcache"])("retains the exact request through parent %s reauthorization and remount",async kind=>{
 await uncertain()
 if(kind==="refresh")fireEvent.click(screen.getByRole("button",{name:"Refresh access and evidence"}))
 else{
  Object.defineProperty(document,"hidden",{configurable:true,value:true})
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"hidden"})
  fireEvent(kind==="visibility"?document:window,new Event(kind==="visibility"?"visibilitychange":"pagehide"))
  expect(screen.queryByDisplayValue("Private settlement evidence request")).not.toBeInTheDocument()
  Object.defineProperty(document,"hidden",{configurable:true,value:false})
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"})
  const event=new Event(kind==="visibility"?"visibilitychange":"pageshow")
  if(kind==="bfcache")Object.defineProperty(event,"persisted",{value:true})
  fireEvent(kind==="visibility"?document:window,event)
 }
 fireEvent.click(await screen.findByRole("button",{name:"Retry the same request"}))
 await screen.findByText(/Request recorded/)
 expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0])
})
it.each(["denied","different actor"])("discards retained authority when the parent returns %s",async kind=>{
 await uncertain()
 portfolio.mockResolvedValueOnce(kind==="denied"?{success:false,code:"FORBIDDEN"}:{success:true,data:{...portfolioData,accountantUserId:"other"}})
 fireEvent.click(screen.getByRole("button",{name:"Refresh access and evidence"}))
 await waitFor(()=>expect(portfolio).toHaveBeenCalledTimes(2))
 expect(screen.queryByRole("button",{name:"Retry the same request"})).not.toBeInTheDocument()
 expect(send).toHaveBeenCalledTimes(1)
})
