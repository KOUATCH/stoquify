jest.mock("@/prisma/db",()=>({db:{}}));
import { validatePayrollHistoryProof, assertPayrollHistoryCurrent } from "../payroll-history-proof";
import { historyFixture, proofHash, bindHistoryProof } from "@/tests/fixtures/payroll-history-proof";

test("unchanged v2 history passes; adapter uses the existing posted/paid strictly-prior selection",async()=>{
 const {current,prior}=historyFixture();expect(validatePayrollHistoryProof(current,[prior])).toEqual({legacyOnly:false,proofCount:1});
 const tx={payrollRun:{findFirst:jest.fn().mockResolvedValue(current),findMany:jest.fn().mockResolvedValue([prior])}};
 await expect(assertPayrollHistoryCurrent(tx as never,current.organizationId,current.id)).resolves.toMatchObject({proofCount:1});
 expect(tx.payrollRun.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({organizationId:current.organizationId,status:{in:["POSTED","PAID"]},payrollPeriod:{payDate:{gte:new Date("2026-01-01"),lt:current.payrollPeriod.payDate}}})}));
});
test.each(["missing","new","status","document","snapshot"])("denies %s observed history",kind=>{
 const {current,prior}=historyFixture();let history=[prior];
 if(kind==="missing")history=[];
 if(kind==="new"){const extra=historyFixture(current.organizationId,"extra").prior;extra.lines[0].employeeId=current.lines[0].employeeId;history.push(extra);}
 if(kind==="status")prior.status="POSTED";
 if(kind==="document")prior.documentHash=proofHash({changed:true});
 if(kind==="snapshot"){(prior.lines[0].calculationSnapshot as any).sourceRevision=2;prior.lines[0].documentHash=proofHash(prior.lines[0].calculationSnapshot);}
 expect(()=>validatePayrollHistoryProof(current,history)).toThrow("Payroll history changed");
});
test.each(["tenant","employee","currency","partial","duplicate","line-hash"])("rejects %s source integrity",kind=>{
 const {current,prior}=historyFixture();
 if(kind==="tenant")prior.lines[0].organizationId="foreign";
 if(kind==="employee")prior.lines[0].employeeId="foreign";
 if(kind==="currency")prior.lines[0].currency="EUR";
 if(kind==="partial"){delete (prior.lines[0].calculationSnapshot as any).incomeTaxWithholdingAmount;prior.lines[0].documentHash=proofHash(prior.lines[0].calculationSnapshot);}
 if(kind==="duplicate")prior.lines.push(prior.lines[0]);
 if(kind==="line-hash")prior.lines[0].documentHash=proofHash({unrelated:true});
 expect(()=>validatePayrollHistoryProof(current,[prior])).toThrow("Payroll history evidence");
});
test.each(["mixed","removed","policy","accumulator","summary","amount","run-binding"])("rejects %s current proof",kind=>{
 const {current,prior}=historyFixture();const snapshot=current.lines[0].calculationSnapshot as any,proof=snapshot.yearToDateProof;
 if(kind==="mixed")proof.version=1;
 if(kind==="removed")delete snapshot.yearToDateProof;
 if(kind==="policy")(current.metadata as any).yearToDatePolicy.periodStart="2025-01-01T00:00:00Z";
 if(kind==="accumulator")proof.ytdAccumulatorHash=proofHash({unrelated:true});
 if(kind==="summary")proof.priorLineCount=5;
 if(kind==="amount")proof.priorAmounts.taxableBaseAmount="100000.00";
 if(kind==="run-binding")(current.metadata as any).yearToDateAccumulatorHashes=[];
 if(kind==="summary"||kind==="amount"){const {ytdAccumulatorHash,...rest}=proof;proof.ytdAccumulatorHash=proofHash(rest);snapshot.yearToDateAccumulatorHash=proof.ytdAccumulatorHash;(current.metadata as any).yearToDateAccumulatorHashes=[proof.ytdAccumulatorHash];}
 current.lines[0].documentHash=proofHash(snapshot);
 expect(()=>validatePayrollHistoryProof(current,[prior])).toThrow("Payroll history evidence");
});
test("explicit empty observation passes without asserting statutory completeness",()=>{const {current}=historyFixture();bindHistoryProof(current,[]);expect(validatePayrollHistoryProof(current,[]).proofCount).toBe(1);});
test.each(["current-blocked", "current-applied", "prior-blocked", "nonzero", "missing-status"])("handles %s null tax evidence without granting production admission", kind=>{
 const {current,prior}=historyFixture(), line=kind==="prior-blocked"?prior.lines[0]:current.lines[0], snapshot=line.calculationSnapshot as any;
 Object.assign(snapshot,{incomeTaxWithholdingAmount:null,incomeTaxApplied:kind==="current-applied",incomeTaxCalculationStatus:"BLOCKED_REQUIRES_EXPERT_REVIEW"});
 Object.assign(snapshot.componentMapping,{incomeTaxWithholdingAmount:"0.00",incomeTaxApplied:false,incomeTaxWithholdingEnabled:false,reviewStatus:"BLOCKED_REQUIRES_EXPERT_REVIEW"});
 if(kind==="nonzero")snapshot.componentMapping.incomeTaxWithholdingAmount="10.00";
 if(kind==="missing-status")delete snapshot.incomeTaxCalculationStatus;
 line.documentHash=proofHash(snapshot);
 if(kind==="current-blocked")expect(validatePayrollHistoryProof(current,[prior]).proofCount).toBe(1);
 else expect(()=>validatePayrollHistoryProof(current,[prior])).toThrow("Payroll history evidence");
});
test("legacy-only evidence retains previous gates and avoids new history reads",async()=>{
 const {current}=historyFixture();current.metadata={};(current.lines[0].calculationSnapshot as any).yearToDateProof={version:1};
 expect(validatePayrollHistoryProof(current,[])).toEqual({legacyOnly:true,proofCount:0});
 const tx={payrollRun:{findFirst:jest.fn().mockResolvedValue(current),findMany:jest.fn()}};await assertPayrollHistoryCurrent(tx as never,current.organizationId,current.id);expect(tx.payrollRun.findMany).not.toHaveBeenCalled();
});
