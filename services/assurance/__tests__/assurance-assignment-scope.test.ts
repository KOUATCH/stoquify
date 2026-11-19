jest.mock("server-only",()=>({}))
import {Prisma} from "@prisma/client"
import {assertAssuranceAssignmentScopeInTx} from "../assurance-assignment-scope"
const admin={id:"actor",roleCodes:["admin"],permissions:[]}
const manager={id:"owner",roleCodes:["branch_manager"],permissions:[]}
const pos={checkKey:"pos.closed_shift_cash_shortage.review",sourceType:"POSSession",sourceId:"session",workflow:"POS",moduleSlug:"pos"}
const aggregate={checkKey:"payment_reconciliation.suspense_owner.required",sourceType:"suspense_items",sourceId:"aged_suspense_missing_owner",workflow:"PAYMENT_RECONCILIATION",moduleSlug:"finance"}
function fixture(){
 const raw=jest.fn(async(sql:Prisma.Sql)=>sql.strings.join('?').includes('FROM "pos_sessions"')?[{locationId:"branch"}]:[{id:"branch",managerId:"owner"}])
 const tx={$queryRaw:raw} as unknown as Prisma.TransactionClient
 return {raw,run:(overrides={})=>assertAssuranceAssignmentScopeInTx(tx,{organizationId:"org",incident:pos,actor:admin,owner:manager,...overrides})}
}
it("uses actual session/terminal binding and current manager, not metadata",async()=>{
 const f=fixture();await expect(f.run()).resolves.toMatchObject({kind:"LOCATION",fingerprint:expect.any(String)})
 const sql=f.raw.mock.calls[0][0];expect(sql.strings.join('?')).toContain('terminal."locationId" = session."locationId"');expect(sql.values).toEqual(["session","org"])
})
it("accepts a manager assigning to themself in their own location",async()=>{await expect(fixture().run({actor:manager})).resolves.toMatchObject({kind:"LOCATION"})})
it.each(["actor","owner"])("refuses wrong-location %s",async party=>{await expect(fixture().run({[party]:{...manager,id:"outsider"}})).rejects.toThrow(/location authority/)})
it.each([0,1])("refuses missing source or unavailable location at read %i",async n=>{
 const f=fixture();if(n===0)f.raw.mockResolvedValueOnce([]);else f.raw.mockResolvedValueOnce([{locationId:"branch"}]).mockResolvedValueOnce([])
 await expect(f.run()).rejects.toThrow(/location authority/)
})
it("does not accept POSSession from an unrelated producer",async()=>{await expect(fixture().run({incident:{...pos,checkKey:"other"}})).rejects.toThrow(/location authority/)})
it("allows known aggregate coordination only to tenant-wide parties",async()=>{
 await expect(fixture().run({incident:aggregate,owner:admin})).resolves.toMatchObject({kind:"TENANT"})
 await expect(fixture().run({incident:aggregate})).rejects.toThrow(/location authority/)
})
it.each(["PayrollEmployee","unknown"])("refuses unsupported %s scope even for admin",async sourceType=>{
 await expect(fixture().run({incident:{...aggregate,sourceType},owner:admin})).rejects.toThrow(/location authority/)
})
