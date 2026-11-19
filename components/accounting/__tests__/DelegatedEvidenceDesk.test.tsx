/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import {DelegatedEvidenceDesk} from "../DelegatedEvidenceDesk"
import {getDelegatedEvidenceDeskAction,requestDelegatedEvidenceAction} from "@/actions/accounting/delegated-evidence-desk.actions"
jest.mock("@/actions/accounting/delegated-evidence-desk.actions",()=>({getDelegatedEvidenceDeskAction:jest.fn(),requestDelegatedEvidenceAction:jest.fn()}))
jest.mock("next/link",()=>({__esModule:true,default:({children,...p}:any)=><a {...p}>{children}</a>}))
const read=getDelegatedEvidenceDeskAction as jest.Mock, send=requestDelegatedEvidenceAction as jest.Mock
const data={actorId:"staff",clientOrganizationId:"client",period:null,writable:true,periods:[{id:"period",name:"October"}],nextPeriod:null,engagement:null,
 findings:[{id:"finding",title:"Missing statement",closeRunId:"run",caseKind:"SETTLEMENT_PROOF"}],recipients:[{id:"owner",name:"Client owner"}],
 tracking:[],supervision:[],cursors:{findings:null,recipients:null,tracking:null,supervision:null},partial:false}
beforeEach(()=>{jest.resetAllMocks();Object.defineProperty(global.crypto,"randomUUID",{configurable:true,value:()=> "stable-key"});read.mockImplementation(async(input)=>({success:true,data:{...data,period:input.periodId?{id:"period",name:"October"}:null}}))})
it.each(["en","fr"] as const)("renders %s authorized choices and focuses the workspace after selection",async locale=>{
 render(<DelegatedEvidenceDesk clientId="client" clientName="Client" locale={locale} onDenied={()=>{}}/>)
 await screen.findByRole("option",{name:"October"})
 fireEvent.change(screen.getByLabelText(locale==="fr"?"Période comptable du client":"Client accounting period"),{target:{value:"period"}})
 expect(await screen.findByText(locale==="fr"?"Question précise sur les justificatifs":"Scoped evidence question")).toBeVisible()
 await waitFor(()=>expect(screen.getByRole("heading",{level:4})).toHaveFocus())
})
it("preserves the exact payload and draft after an uncertain submission",async()=>{
 send.mockRejectedValueOnce(Error("lost response")).mockResolvedValueOnce({success:true,data:{id:"request"}})
 render(<DelegatedEvidenceDesk clientId="client" clientName="Client" locale="en" onDenied={()=>{}}/>)
 await screen.findByRole("option",{name:"October"});fireEvent.change(screen.getByLabelText("Client accounting period"),{target:{value:"period"}})
 await screen.findByLabelText("Scoped evidence question")
 fireEvent.change(screen.getByLabelText("Existing finding"),{target:{value:"finding"}})
 fireEvent.change(screen.getByLabelText("Client response owner"),{target:{value:"owner"}})
 fireEvent.change(screen.getByLabelText("Response due"),{target:{value:"2027-01-01T12:00"}})
 fireEvent.change(screen.getByLabelText("Scoped evidence question"),{target:{value:"Please provide settlement source evidence"}})
 fireEvent.click(screen.getByRole("button",{name:"Send evidence request"}))
 await screen.findByText(/outcome is uncertain/)
 expect(screen.getByLabelText("Scoped evidence question")).toHaveValue("Please provide settlement source evidence")
 fireEvent.click(screen.getByRole("button",{name:"Retry the same request"}))
 await screen.findByText(/Request recorded/)
 expect(send.mock.calls[0][0]).toEqual(send.mock.calls[1][0])
})
it("preserves unsent text during failed refresh and clears private content on denial",async()=>{
 const denied=jest.fn()
 render(<DelegatedEvidenceDesk clientId="client" clientName="Client" locale="en" onDenied={denied}/>)
 await screen.findByRole("option",{name:"October"});fireEvent.change(screen.getByLabelText("Client accounting period"),{target:{value:"period"}})
 await screen.findByLabelText("Scoped evidence question");fireEvent.change(screen.getByLabelText("Scoped evidence question"),{target:{value:"Private draft question"}})
 read.mockRejectedValueOnce(Error("offline"))
 fireEvent.click(screen.getByRole("button",{name:"Refresh evidence choices"}));await screen.findByRole("alert")
 fireEvent.click(screen.getByRole("button",{name:"Refresh evidence choices"}))
 expect(await screen.findByLabelText("Scoped evidence question")).toHaveValue("Private draft question")
 read.mockResolvedValueOnce({success:false,code:"FORBIDDEN"})
 fireEvent.click(screen.getByRole("button",{name:"Refresh evidence choices"}));await waitFor(()=>expect(denied).toHaveBeenCalled())
 expect(screen.queryByDisplayValue("Private draft question")).not.toBeInTheDocument()
})
it("keeps tracking readable but prevents submission when module access is read-only",async()=>{
 read.mockResolvedValue({success:true,data:{...data,writable:false,period:{id:"period",name:"October"}}})
 render(<DelegatedEvidenceDesk clientId="client" clientName="Client" locale="en" onDenied={()=>{}}/>)
 expect(await screen.findByRole("button",{name:"Send evidence request"})).toBeDisabled()
 expect(screen.getByText(/Current module access does not allow new requests/)).toBeVisible()
 expect(send).not.toHaveBeenCalled()
})

async function compose() {
 render(<DelegatedEvidenceDesk clientId="client" clientName="Client" locale="en" onDenied={denied}/>)
 await screen.findByRole("option",{name:"October"})
 fireEvent.change(screen.getByLabelText("Client accounting period"),{target:{value:"period"}})
 await screen.findByLabelText("Scoped evidence question")
 fireEvent.change(screen.getByLabelText("Existing finding"),{target:{value:"finding"}})
 fireEvent.change(screen.getByLabelText("Client response owner"),{target:{value:"owner"}})
 fireEvent.change(screen.getByLabelText("Response due"),{target:{value:"2027-01-01T12:00"}})
 fireEvent.change(screen.getByLabelText("Scoped evidence question"),{target:{value:"Please provide settlement source evidence"}})
}
const denied=jest.fn()
afterEach(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:false})})
it.each(["visibilitychange","pageshow"])("reauthorizes after %s without losing an uncertain request",async event=>{
 send.mockRejectedValueOnce(Error("committed response lost")).mockResolvedValueOnce({success:true,data:{id:"request"}})
 await compose()
 fireEvent.click(screen.getByRole("button",{name:"Send evidence request"}))
 await screen.findByText(/outcome is uncertain/)
 if(event==="visibilitychange"){
  Object.defineProperty(document,"hidden",{configurable:true,value:true})
  fireEvent(document,new Event(event))
  expect(screen.queryByDisplayValue("Please provide settlement source evidence")).not.toBeInTheDocument()
  Object.defineProperty(document,"hidden",{configurable:true,value:false})
  fireEvent(document,new Event(event))
 }else fireEvent(window,new Event(event))
 await waitFor(()=>expect(read).toHaveBeenCalledTimes(3))
 fireEvent.click(await screen.findByRole("button",{name:"Retry the same request"}))
 await screen.findByText(/Request recorded/)
 expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0])
 expect(denied).not.toHaveBeenCalled()
})
it("keeps the in-flight request recoverable if the workspace becomes hidden",async()=>{
 let reject!:(e:Error)=>void
 send.mockImplementationOnce(()=>new Promise((_,j)=>{reject=j})).mockResolvedValueOnce({success:true,data:{id:"request"}})
 await compose()
 fireEvent.click(screen.getByRole("button",{name:"Send evidence request"}))
 Object.defineProperty(document,"hidden",{configurable:true,value:true})
 fireEvent(document,new Event("visibilitychange"))
 await act(async()=>{reject(Error("lost response"))})
 Object.defineProperty(document,"hidden",{configurable:true,value:false})
 fireEvent(document,new Event("visibilitychange"))
 fireEvent.click(await screen.findByRole("button",{name:"Retry the same request"}))
 await screen.findByText(/Request recorded/)
 expect(send.mock.calls[1][0]).toEqual(send.mock.calls[0][0])
})
it("applies a read-only module decision returned by pagination",async()=>{
 read.mockImplementation(async input=>({success:true,data:{...data,period:input.periodId?{id:"period",name:"October"}:null,
  writable:!input.page,cursors:{...data.cursors,findings:input.page?null:"next"}}}))
 await compose()
 fireEvent.click(screen.getByRole("button",{name:"Load more findings"}))
 await screen.findByText(/Current module access does not allow new requests/)
 expect(screen.getByRole("button",{name:"Send evidence request"})).toBeDisabled()
})
