/** @jest-environment jsdom */
import "@testing-library/jest-dom"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ObligationRegister } from "../ObligationRegister"
import { getObligationRegisterAction, saveObligationAction, reviewObligationAction } from "@/actions/accounting/obligation-register.actions"
import { stepUpWithPasswordAction } from "@/actions/security/step-up-auth.actions"
import { obligationSource } from "@/services/compliance/obligation-register-source"
jest.mock("@/actions/accounting/obligation-register.actions",()=>({getObligationRegisterAction:jest.fn(),saveObligationAction:jest.fn(),reviewObligationAction:jest.fn()}))
jest.mock("@/actions/security/step-up-auth.actions",()=>({stepUpWithPasswordAction:jest.fn()}))
const read=jest.mocked(getObligationRegisterAction),save=jest.mocked(saveObligationAction),review=jest.mocked(reviewObligationAction)
const at=new Date("2026-10-20T12:00:00Z")
const data=()=>({observedAt:at.toISOString(),clientOrganizationId:"client",actorId:"reviewer",countryCode:"CM",sources:["CLOSE_EVIDENCE_COLLECTION","CM_VAT_MONTHLY","CM_CNPS_EVIDENCE"].map(c=>obligationSource(c as never,"CM",at)),periods:[{id:"p",name:"September"}],items:[],evidence:[],payrollIncluded:false,limit:100})
beforeEach(()=>{jest.resetAllMocks();read.mockResolvedValue({success:true,data:data()} as never);Object.defineProperty(crypto,"randomUUID",{configurable:true,value:jest.fn(()=>"synthetic-command-key")});Object.defineProperty(document,"visibilityState",{configurable:true,value:"visible"})})
async function load(){fireEvent.click(screen.getByRole("button",{name:"Load / refresh register"}));await screen.findByText("No obligations recorded. Create an operational reminder below.")}
it("uses an explicit authorized load, labelled fields and unknown statutory coverage",async()=>{
  render(<ObligationRegister clientOrganizationId="client"/>);expect(read).not.toHaveBeenCalled();await load()
  expect(read).toHaveBeenCalledWith({clientOrganizationId:"client",includePayroll:false})
  expect(screen.getByLabelText("Applicability")).toHaveValue("UNKNOWN")
  expect(screen.getAllByText(/Source refresh overdue/).length).toBeGreaterThan(0)
  expect(screen.getByText(/No statutory obligation is verified/)).toBeInTheDocument()
})
it("clears private state on denial and cannot restore a response from the previous client",async()=>{
  let resolve:(value:unknown)=>void=()=>{}
  read.mockReturnValueOnce(new Promise(r=>{resolve=r}) as never)
  const view=render(<ObligationRegister clientOrganizationId="client"/>);fireEvent.click(screen.getByRole("button",{name:"Load / refresh register"}))
  view.rerender(<ObligationRegister clientOrganizationId="different"/>);resolve({success:true,data:data()})
  await waitFor(()=>expect(screen.queryByLabelText("Applicability")).not.toBeInTheDocument())
  read.mockResolvedValueOnce({success:false,code:"FORBIDDEN",error:"Denied"} as never)
  fireEvent.click(screen.getByRole("button",{name:"Load / refresh register"}));await screen.findByText(/Access unavailable/)
})
it("hides private fields and in-flight data when the tab becomes hidden",async()=>{
  render(<ObligationRegister/>);await load();fireEvent.change(screen.getByLabelText(/Reason \/ review/),{target:{value:"Private operational reason"}})
  Object.defineProperty(document,"visibilityState",{configurable:true,value:"hidden"});fireEvent(document,new Event("visibilitychange"))
  expect(screen.queryByDisplayValue("Private operational reason")).not.toBeInTheDocument();expect(screen.queryByLabelText("Applicability")).not.toBeInTheDocument()
})
it("retries an uncertain save with the exact retained identity and payload",async()=>{
  save.mockRejectedValueOnce(new Error("lost response")).mockResolvedValueOnce({success:true,data:{instanceId:"i",version:1,replayed:true}} as never)
  render(<ObligationRegister/>);await load();fireEvent.change(screen.getByLabelText(/Reason \/ review/),{target:{value:"Operational source review needed"}})
  fireEvent.click(screen.getByRole("button",{name:"Save new revision"}));await screen.findByText("Outcome uncertain. Retry the retained command.")
  fireEvent.click(screen.getByRole("button",{name:"Retry exact command"}));await screen.findByText("Revision recorded; current register reloaded.")
  expect(save.mock.calls[1][0]).toEqual(save.mock.calls[0][0])
})
it("requires explicit retry after password assurance and reviews retained terms",async()=>{
  const initial=data() as any; initial.items=[{instanceId:"i",version:1,code:"CLOSE_EVIDENCE_COLLECTION",periodId:"p",ownerId:"maker",applicability:"APPLICABLE",dueAt:null,status:"OPEN",deadlineState:"UNSCHEDULED",sourceChanged:false,evidenceChanged:false,source:initial.sources[0],retainedSourceVersion:"v1",decision:"PREPARED",evidenceId:"pack",evidenceClass:"CLOSE_PACK",liveFilingAccepted:false,payrollRedacted:false,history:[{version:1,actorId:"maker",at:at.toISOString(),reason:"Original preparation reason",decision:"PREPARED",sourceVersion:"v1",dueAt:null,applicability:"APPLICABLE"}]}]
  read.mockResolvedValue({success:true,data:initial} as never);review.mockResolvedValueOnce({success:false,code:"FRESH_AUTH_REQUIRED",error:"Fresh required"} as never)
  jest.mocked(stepUpWithPasswordAction).mockResolvedValue({success:true,data:{}} as never)
  render(<ObligationRegister/>);fireEvent.click(screen.getByRole("button",{name:"Load / refresh register"}));await screen.findByRole("button",{name:"Open / edit"})
  fireEvent.click(screen.getByRole("button",{name:"Open / edit"}));fireEvent.change(screen.getByLabelText(/Reason \/ review/),{target:{value:"Independent evidence conclusion"}})
  fireEvent.click(screen.getByRole("button",{name:"Review retained evidence"}));await screen.findByLabelText("Confirm password")
  fireEvent.change(screen.getByLabelText("Confirm password"),{target:{value:"synthetic"}});fireEvent.click(screen.getByRole("button",{name:"Confirm identity"}))
  await screen.findByText("Identity confirmed. Retry the retained command explicitly.");expect(review).toHaveBeenCalledTimes(1)
  expect(review.mock.calls[0][0]).toMatchObject({evidenceId:"pack",expectedVersion:1,applicability:"APPLICABLE"})
})
it("renders French operational-target and restricted-evidence guidance",async()=>{
  render(<ObligationRegister locale="fr"/>);fireEvent.click(screen.getByRole("button",{name:"Charger / actualiser le registre"}));await screen.findByLabelText("Applicabilité")
  expect(screen.getByLabelText(/Date cible opérationnelle/)).toBeInTheDocument();expect(screen.getByText(/Aucune obligation légale/)).toBeInTheDocument()
})
