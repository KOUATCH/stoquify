// Synthetic proof records for engineering integrity tests; no statutory admission.
import { Prisma } from "@prisma/client";
import { hashBusinessPayload } from "@/services/events/business-event.service";
import { HISTORY_AMOUNT_KEYS, type HistoryRun, type HistoryLine } from "@/services/payroll/payroll-history-proof";
export const proofHash = (value: unknown) => `sha256:${hashBusinessPayload(value)}`;
const stored = ["grossAmount", "taxableBaseAmount", "socialBaseAmount", "employeeDeductionAmount", "employerChargeAmount", "netPayableAmount"];
const values = () => Object.fromEntries([...HISTORY_AMOUNT_KEYS,"statutoryPayableAmount"].map(key=>[key,["grossAmount","taxableBaseAmount","socialBaseAmount","netPayableAmount"].includes(key)?"1000.00":"0.00"]));
function line(org:string,runId:string,employeeId:string):HistoryLine {
 const amounts=values(),snapshot={...amounts,componentMapping:{statutoryPayableAmount:amounts.statutoryPayableAmount},classification:"SYNTHETIC_INTEGRITY_TEST"};
 return {id:runId+"-line",organizationId:org,payrollRunId:runId,employeeId,currency:"XAF",calculationSnapshot:snapshot,documentHash:proofHash(snapshot),
  ...Object.fromEntries(stored.map(key=>[key,new Prisma.Decimal(amounts[key])]))};
}
export function historyFixture(org="history-org",prefix="history"){ 
 const employeeId=prefix+"-employee";
 const prior:HistoryRun={id:prefix+"-prior",organizationId:org,payrollPeriodId:prefix+"-period-prior",runType:"ORDINARY",status:"PAID",currency:"XAF",documentHash:proofHash({kind:"synthetic-prior-run"}),metadata:{},payrollPeriod:{payDate:new Date("2026-05-31T00:00:00Z")},lines:[]};
 prior.lines=[line(org,prior.id,employeeId)];
 const current:HistoryRun={id:prefix+"-current",organizationId:org,payrollPeriodId:prefix+"-period-current",runType:"ORDINARY",status:"REVIEWED",currency:"XAF",documentHash:proofHash({kind:"synthetic-current-run"}),metadata:{},payrollPeriod:{payDate:new Date("2026-06-30T00:00:00Z")},lines:[]};
 current.lines=[line(org,current.id,employeeId)];bindHistoryProof(current,[prior]);return{current,prior};
}
export function bindHistoryProof(current:HistoryRun,prior:HistoryRun[]){
 const policyData={kind:"AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_POLICY",version:1,basis:"DEFAULT_CALENDAR_YEAR",yearStartMonth:1,yearStartDay:1,periodStart:"2026-01-01T00:00:00.000Z",periodEnd:current.payrollPeriod.payDate.toISOString(),source:"default_accounting_policy"};
 const policy={...policyData,ytdPolicyHash:proofHash(policyData)},hashes:string[]=[];
 for(const row of current.lines){
  const snapshot=row.calculationSnapshot as Record<string,any>,amounts=values();
  const sources=prior.flatMap(run=>run.lines.filter(line=>line.employeeId===row.employeeId).map(line=>({run,line}))).sort((a,b)=>a.run.payrollPeriod.payDate.toISOString().localeCompare(b.run.payrollPeriod.payDate.toISOString())||a.run.id.localeCompare(b.run.id)||a.line.id.localeCompare(b.line.id));
  const evidence=sources.map(({run,line})=>({runId:run.id,lineId:line.id,employeeId:line.employeeId,currency:line.currency,payDate:run.payrollPeriod.payDate.toISOString(),runStatus:run.status,runDocumentHash:run.documentHash,lineDocumentHash:line.documentHash,calculationSnapshotHash:proofHash(line.calculationSnapshot),recordedLineAmounts:Object.fromEntries(HISTORY_AMOUNT_KEYS.map(key=>[key,stored.includes(key)?new Prisma.Decimal(line[key]!).toString():null]))}));
  const priorAmounts=Object.fromEntries(Object.keys(amounts).map(key=>[key,sources.reduce((sum,{line})=>sum.plus((line.calculationSnapshot as any)[key]),new Prisma.Decimal(0)).toFixed(2)]));
  const payload={kind:"AQSTOQFLOW_PAYROLL_YEAR_TO_DATE_ACCUMULATOR_PROOF",version:2,accumulatorBasis:"POSTED_PAID_PRIOR_LINES_PLUS_CURRENT_EFFECTIVE_LINE",employeeId:row.employeeId,currency:row.currency,currentPeriodId:current.payrollPeriodId,currentPayDate:current.payrollPeriod.payDate.toISOString(),correctionRun:false,yearToDatePolicyHash:policy.ytdPolicyHash,policy,priorLineCount:sources.length,priorRunIds:[...new Set(sources.map(x=>x.run.id))].sort(),priorRunDocumentHashes:[...new Set(sources.map(x=>x.run.documentHash))].sort(),priorRunLineDocumentHashes:sources.map(x=>x.line.documentHash).sort(),missingPriorCalculationSnapshotCount:0,missingPriorLineDocumentHashCount:0,priorLineEvidence:evidence,observedHistoryHash:proofHash(evidence),priorAmounts,currentAmounts:amounts,yearToDateAmounts:Object.fromEntries(Object.keys(amounts).map(key=>[key,new Prisma.Decimal(priorAmounts[key]).plus(amounts[key]).toFixed(2)]))};
  const digest=proofHash(payload);snapshot.yearToDateProof={...payload,ytdAccumulatorHash:digest};snapshot.yearToDateAccumulatorHash=digest;snapshot.yearToDatePolicy=policy;snapshot.yearToDatePolicyHash=policy.ytdPolicyHash;row.documentHash=proofHash(snapshot);hashes.push(digest);
 }
 current.metadata={yearToDateProofVersion:2,yearToDatePolicy:policy,yearToDatePolicyHash:policy.ytdPolicyHash,yearToDateAccumulatorHashes:hashes.sort()};
}
