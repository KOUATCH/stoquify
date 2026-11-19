jest.mock("server-only",()=>({}))
jest.mock("@/services/_shared/protect",()=>({protect:jest.fn((_o,fn)=>async(input)=>fn(input,{orgId:"firm",userId:"staff",permissions:["accounting.close.evidence.request"]}))}))
jest.mock("@/services/accounting/close-evidence-acceptance-context",()=>({closeEvidenceWorkControl:jest.fn(async()=>({actorId:"staff",session:{id:"session",token:"trusted"}}))}))
jest.mock("@/services/accounting/delegated-evidence-desk.service",()=>({getDelegatedEvidenceDesk:jest.fn()}))
jest.mock("@/services/accounting/accountant-work-desk.service",()=>({assertAccountantWorkClient:jest.fn()}))
jest.mock("@/services/accounting/close-assurance.service",()=>({requestMissingCloseEvidence:jest.fn()}))
import {getDelegatedEvidenceDeskAction,requestDelegatedEvidenceAction} from "../delegated-evidence-desk.actions"
import {getDelegatedEvidenceDesk} from "@/services/accounting/delegated-evidence-desk.service"
import {requestMissingCloseEvidence} from "@/services/accounting/close-assurance.service"
beforeEach(()=>jest.clearAllMocks())
it("binds reads to trusted home actor and session",async()=>{
 await getDelegatedEvidenceDeskAction({clientOrganizationId:"client"})
 expect(getDelegatedEvidenceDesk).toHaveBeenCalledWith(expect.objectContaining({homeOrganizationId:"firm",actorId:"staff",session:{id:"session",token:"trusted"}}),{clientOrganizationId:"client"})
})
it("reuses the existing writer with a strict payload and exact caller retry key",async()=>{
 const input={clientOrganizationId:"client",findingId:"finding",requestedFromId:"recipient",requestText:"A scoped question",dueAt:"2099-01-01",correlationId:"exact-key"}
 await requestDelegatedEvidenceAction(input)
 expect(requestMissingCloseEvidence).toHaveBeenCalledWith("firm",expect.objectContaining({correlationId:"exact-key",clientOrganizationId:"client"}),expect.objectContaining({actorId:"staff",session:{id:"session",token:"trusted"}}))
 await expect(requestDelegatedEvidenceAction({...input,actorId:"forged"})).rejects.toThrow()
 expect(requestMissingCloseEvidence).toHaveBeenCalledTimes(1)
})
