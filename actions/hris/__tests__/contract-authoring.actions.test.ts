const context={orgId:"tenant",userId:"actor",permissions:["hris.people.manage"],freshAuth:{claims:{userId:"actor",tenantId:"tenant"}}}
const options:any[]=[]
jest.mock("@/services/_shared/protect",()=>({protect:(config:any,handler:any)=>{options.push(config);return(input:any)=>handler(input,context)}}))
jest.mock("@/services/hris/setup-reviewer.service",()=>({assertSetupPilot:jest.fn()}))
jest.mock("@/services/hris/contract.service",()=>({requestHrisContractActivation:jest.fn().mockResolvedValue({})}))
jest.mock("@/services/hris/document-evidence.service",()=>({requestHrisContractDocumentEvidence:jest.fn().mockResolvedValue({})}))
const {requestHrisContractActivationAction,requestHrisContractDocumentAction} = require("../contract-authoring.actions")
import {requestHrisContractActivation} from "@/services/hris/contract.service"
import {requestHrisContractDocumentEvidence} from "@/services/hris/document-evidence.service"
import {assertSetupPilot} from "@/services/hris/setup-reviewer.service"
beforeEach(()=>{jest.clearAllMocks();context.freshAuth.claims={userId:"actor",tenantId:"tenant"}})
test.each([[requestHrisContractActivationAction,requestHrisContractActivation],[requestHrisContractDocumentAction,requestHrisContractDocumentEvidence]])("request derives identities and preserves existing permission",async(action,owner)=>{
  await action({organizationId:"foreign",actorId:"forged",actorPermissions:["*"],employeeId:"employee"})
  expect(owner).toHaveBeenCalledWith(expect.objectContaining({organizationId:"tenant",actorId:"actor",actorPermissions:["hris.people.manage"]}))
  expect(assertSetupPilot).toHaveBeenCalledWith("tenant")
})
test("both requests require fresh authorization and enforced module writes",()=>{expect(options).toHaveLength(2);for(const option of options)expect(option).toMatchObject({permission:"hris.people.manage",freshAuth:true,tenantGuard:"handler-derived",module:{accessIntent:"write",mode:"enforce"}})})
test.each(["userId","tenantId"])("changed fresh %s rejects before owner",async field=>{
  context.freshAuth.claims[field as "userId"]="foreign"
  await expect(requestHrisContractActivationAction({})).rejects.toThrow("session changed")
  await expect(requestHrisContractDocumentAction({})).rejects.toThrow("session changed")
  expect(requestHrisContractActivation).not.toHaveBeenCalled();expect(requestHrisContractDocumentEvidence).not.toHaveBeenCalled()
})
