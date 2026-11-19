jest.mock("server-only", () => ({}))
jest.mock("@/prisma/db",()=>({db:{$transaction:jest.fn(),user:{findFirstOrThrow:jest.fn(),findMany:jest.fn()},accountingPeriod:{findMany:jest.fn(),findFirst:jest.fn()},closeAssuranceFinding:{findMany:jest.fn()},accountantAccessGrant:{findFirst:jest.fn()},firmEngagementGrantLink:{findUnique:jest.fn()}}}))
jest.mock("../accountant-work-desk.service",()=>({assertAccountantWorkClient:jest.fn()}))
jest.mock("../accountant-access.service",()=>({resolveAccountantClientAccess:jest.fn()}))
jest.mock("../close-evidence-request-tracking",()=>({readCloseEvidenceRequestTrackingInTx:jest.fn()}))
jest.mock("@/services/modules/module-entitlement.service",()=>({observeModuleAccess:jest.fn()}))
import {db} from "@/prisma/db"
import {getDelegatedEvidenceDesk,delegatedEvidenceCase} from "../delegated-evidence-desk.service"
import {assertAccountantWorkClient} from "../accountant-work-desk.service"
import {resolveAccountantClientAccess} from "../accountant-access.service"
import {readCloseEvidenceRequestTrackingInTx} from "../close-evidence-request-tracking"
import {observeModuleAccess} from "@/services/modules/module-entitlement.service"
const actor={homeOrganizationId:"firm",actorId:"staff",actorPermissions:[],session:{id:"session",token:"token"}}
beforeEach(()=>{
 jest.resetAllMocks()
 ;(observeModuleAccess as jest.Mock).mockResolvedValue({allowed:true})
 ;(db.$transaction as jest.Mock).mockImplementation(f=>f(db))
 ;(db.user.findFirstOrThrow as jest.Mock).mockResolvedValue({roles:[]})
 ;(db.user.findMany as jest.Mock).mockResolvedValue([])
 ;(db.accountingPeriod.findMany as jest.Mock).mockResolvedValue([{id:"period",name:"October"}])
 ;(db.accountingPeriod.findFirst as jest.Mock).mockResolvedValue({id:"period",name:"October"})
 ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValue([])
 ;(readCloseEvidenceRequestTrackingInTx as jest.Mock).mockResolvedValue({items:[],nextCursor:null,evidenceIssue:false})
})
it("binds all queries to the authorized client and exposes no session proof",async()=>{
 const r=await getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period"})
 expect(assertAccountantWorkClient).toHaveBeenCalledTimes(2)
 expect(resolveAccountantClientAccess).toHaveBeenCalledWith(expect.objectContaining({accountantUserId:"staff",clientOrganizationId:"client",permission:"accounting.close.evidence.request"}))
 expect(db.closeAssuranceFinding.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:"client",periodId:"period"})}))
 expect(JSON.stringify(r)).not.toContain("token")
})
it("denies injected authority, absent session, foreign period and supervision without assignment permission",async()=>{
 await expect(getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",actorId:"other"})).rejects.toThrow()
 await expect(getDelegatedEvidenceDesk({...actor,session:undefined},{clientOrganizationId:"client"})).rejects.toThrow()
 ;(db.accountingPeriod.findFirst as jest.Mock).mockResolvedValue(null)
 await expect(getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"foreign"})).rejects.toThrow()
 await expect(getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period",page:{kind:"supervision",cursor:"x"}})).rejects.toThrow()
})
it("does not return read data when authority is lost during the projection",async()=>{
 ;(assertAccountantWorkClient as jest.Mock).mockResolvedValueOnce(undefined).mockRejectedValueOnce(Error("revoked"))
 await expect(getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period"})).rejects.toThrow("revoked")
})
it("continues historical findings without losing the 101st case",async()=>{
 const rows=Array.from({length:101},(_,i)=>({id:`finding-${String(i).padStart(3,"0")}`,title:"Missing",closeRunId:"old-run",createdAt:new Date(2026,0,1),checklistItem:null}))
 ;(db.closeAssuranceFinding.findMany as jest.Mock).mockResolvedValueOnce(rows).mockResolvedValueOnce([rows[100]])
 const first=await getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period"})
 expect(first.findings).toHaveLength(100);expect(first.partial).toBe(true)
 const next=await getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period",page:{kind:"findings",cursor:first.cursors.findings!}})
 expect(next.findings[0].id).toBe(rows[100].id)
 await expect(getDelegatedEvidenceDesk(actor,{clientOrganizationId:"other",periodId:"period",page:{kind:"findings",cursor:first.cursors.findings!}})).rejects.toThrow()
})
it("maps settlement proof only to the existing typed payment collector",()=>{
 expect(delegatedEvidenceCase({key:"payment-reconciliation",domain:"PAYMENT_RECONCILIATION",sourceService:"services/reconciliation/payment-close-evidence.service.ts"})).toBe("SETTLEMENT_PROOF")
 expect(delegatedEvidenceCase({key:"payment-reconciliation",domain:"PAYMENT_RECONCILIATION",sourceService:"invented"})).toBe("MISSING_CLOSE_EVIDENCE")
})
it("keeps readable evidence available while either module forbids new requests",async()=>{
 ;(observeModuleAccess as jest.Mock).mockResolvedValueOnce({allowed:true}).mockResolvedValueOnce({allowed:false})
 expect((await getDelegatedEvidenceDesk(actor,{clientOrganizationId:"client",periodId:"period"})).writable).toBe(false)
})
