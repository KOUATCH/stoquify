// Runs real lifecycle/posting services from explicitly synthetic calculated inputs.
// This is not calculation, statutory certification, bank release or live approval.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const runId=crypto.randomUUID(),receipt={at:new Date().toISOString(),syntheticInput:true,steps:[]};
// Capture the original failure in this isolated verifier before the service
// replaces it with its safe public message. Transactions still use the real DB.
const diagnosticDb=new Proxy(db,{get(target,key){if(key==='$transaction')return async(...args)=>{try{return await target.$transaction(...args)}catch(e){receipt.transactionFailure={code:e.code??null,message:f.safe(e)};throw e}};const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value}});
const files=['services/payroll/payroll-control.service.ts','services/accounting/posting.service.ts','services/accounting/source-link.service.ts','services/evidence/proof-trail.service.ts','prisma/schema.prisma','services/payroll/payment-evidence.service.ts','services/payroll/payment-reconciliation.service.ts','services/payroll/payment-settlement-balance.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));receipt.sourceBefore=hashes();
const {reviewPayrollRun,approvePayrollRun,emitPayrollPayslips,postPayrollRun}=require(path.join(root,'services/payroll/payroll-control.service.ts'));
const {ensureDefaultPayrollPostingRules}=require(path.join(root,'services/accounting/default-posting-rules.service.ts'));
const {DEFAULT_PAYROLL_POSTING_RULES}=require(path.join(root,'services/accounting/default-posting-rules.ts'));
const {getProofTrail}=require(path.join(root,'services/evidence/proof-trail.service.ts'));
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 // Isolated process only, after the database ownership guard. No app setting changes.
 process.env.PAYROLL_TRUST_SPINE_WRITES_ENABLED='true';
 const org=await db.organization.create({data:{name:helper.prefix+'Payroll posting '+runId,slug:'payroll-posting-'+runId,currency:'XAF'}}),scope={organizationId:org.id};
 const actors=[];for(const name of ['preparer','reviewer','approver','poster'])actors.push(await db.user.create({data:{...scope,name:'Owned '+name,email:name+'-'+runId+'@example.invalid'}}));
 const now=new Date(),start=new Date(now.getTime()-86400000),end=new Date(now.getTime()+86400000);
 const year=await db.fiscalYear.create({data:{...scope,name:'Owned posting year',startDate:start,endDate:end}});
 const accountingPeriod=await db.accountingPeriod.create({data:{...scope,fiscalYearId:year.id,periodNumber:1,name:'Owned posting period',startDate:start,endDate:end}});
 const period=await db.payrollPeriod.create({data:{...scope,accountingPeriodId:accountingPeriod.id,name:'Synthetic payroll input',periodStart:start,periodEnd:end,payDate:now,countryCode:'CM'}});
 await db.journal.create({data:{...scope,code:'PAY',nameEn:'Owned payroll journal',type:'PAYROLL',isDefault:true}});
 const mappings=[...new Set(DEFAULT_PAYROLL_POSTING_RULES.flatMap(rule=>rule.lines.map(line=>line.mappingKey)).filter(Boolean))];
 for(const [index,mappingKey]of mappings.entries())await db.chartOfAccount.create({data:{...scope,code:'OWNED-'+index,nameEn:mappingKey,mappingKey,type:mappingKey.includes('EXPENSE')?'EXPENSE':'LIABILITY',normalBalance:mappingKey.includes('EXPENSE')?'DEBIT':'CREDIT'}});
 await ensureDefaultPayrollPostingRules(org.id,actors[0].id,db);
 const employee=await db.payrollEmployee.create({data:{...scope,employeeNumber:'OWNED',displayName:'Owned synthetic employee',status:'ACTIVE',hireDate:start}});
 const contract=await db.payrollContract.create({data:{...scope,employeeId:employee.id,contractNumber:'OWNED',type:'OTHER',effectiveFrom:start,baseSalary:100000}});
 const amounts={grossAmount:'100000.00',taxableBaseAmount:'100000.00',socialBaseAmount:'100000.00',employeeDeductionAmount:'4200.00',employerChargeAmount:'12950.00',netPayableAmount:'95800.00'};
 const payroll=await db.payrollRun.create({data:{...scope,payrollPeriodId:period.id,runNumber:'OWNED',status:'CALCULATED',preparedById:actors[0].id,countryCode:'CM',countryPackVersion:'synthetic-not-certified',countryPackSchemaVersion:'synthetic',countryPackResolutionHash:'synthetic',countryPackCapabilityStatus:'EXPERT_REVIEW_REQUIRED',ruleSetHash:'synthetic',calculationHash:'synthetic',attendanceSnapshotHash:'synthetic',grossAmount:amounts.grossAmount,employeeDeductionAmount:amounts.employeeDeductionAmount,employerChargeAmount:amounts.employerChargeAmount,netPayableAmount:amounts.netPayableAmount,metadata:{verificationOnly:true}}});
 await db.payrollRunLine.create({data:{...scope,payrollRunId:payroll.id,employeeId:employee.id,contractId:contract.id,...amounts,calculationSnapshot:{...amounts,employeePensionContributionAmount:'4200.00',employerPensionContributionAmount:'4200.00',familyAllowanceContributionAmount:'7000.00',occupationalRiskContributionAmount:'1750.00',incomeTaxWithholdingAmount:'0.00',payrollRubriqueEmployeeDeductionAmount:'0.00',payrollRubriqueEmployerChargeAmount:'0.00',incomeTaxCalculationStatus:'BLOCKED_REQUIRES_EXPERT_REVIEW',incomeTaxApplied:false,currency:'XAF'},ruleProvenance:{verificationOnly:true}}});
 function input(actor,version,permission,command){return{...scope,payrollRunId:payroll.id,expectedVersion:version,actorId:actor.id,actorPermissions:[permission],lastAuthAt:now,now,idempotencyKey:runId+'-'+command};}
 const review=input(actors[1],1,'payroll.runs.review','review');
 await assert.rejects(reviewPayrollRun({...review,actorId:actors[0].id},db),/separation|independent|self/i);receipt.selfReviewDenied=true;
 for(const [name,operation,args]of [
  ['review',reviewPayrollRun,review],['approve',approvePayrollRun,input(actors[2],2,'payroll.runs.approve','approve')],['emit',emitPayrollPayslips,input(actors[2],3,'payroll.payslips.emit','emit')],['post',postPayrollRun,input(actors[3],4,'payroll.runs.post','post')],
 ]){receipt.stage=name;
 if(name==='emit'){
  const before={events:await db.businessEvent.count({where:scope}),transitions:await db.payrollRunTransition.count({where:scope}),payslips:await db.payrollPayslip.count({where:scope})};
  const failingDb=new Proxy(db,{get(target,key){if(key==='$transaction')return (work,options)=>target.$transaction(tx=>work(new Proxy(tx,{get(inner,property){if(property==='payrollPayslip')return new Proxy(inner.payrollPayslip,{get(model,method){if(method==='update')return async()=>{throw new Error('Owned injected seal failure')};return Reflect.get(model,method)}});return Reflect.get(inner,property)}})),options);return Reflect.get(target,key)}});
  await assert.rejects(operation(args,failingDb),/could not be completed safely/);
  assert.deepEqual({events:await db.businessEvent.count({where:scope}),transitions:await db.payrollRunTransition.count({where:scope}),payslips:await db.payrollPayslip.count({where:scope})},before);
  assert.equal((await db.payrollRun.findUniqueOrThrow({where:{id:payroll.id}})).status,'APPROVED');receipt.failedSealRolledBack=true;
 }
 const result=await operation(args,diagnosticDb);receipt.steps.push({name,status:result.payrollRun.status,eventId:result.businessEventId});}
 const payslip=await db.payrollPayslip.findFirstOrThrow({where:scope,include:{lines:true}});assert.equal(payslip.status,'EMITTED');assert.ok(payslip.lines.length>0);
 await assert.rejects(db.payrollPayslipLine.update({where:{id:payslip.lines[0].id},data:{amount:'1.00'}}),/immutable/i);
 await assert.rejects(db.payrollPayslipLine.create({data:{...scope,payslipId:payslip.id,code:'INVALID',label:'Forbidden late line',category:'EARNING',amount:'1.00',currency:'XAF'}}),/immutable/i);
 receipt.emittedLineMutationDenied=true;
 const posted=await db.payrollRun.findUniqueOrThrow({where:{id:payroll.id}}),proof=await getProofTrail({...scope,subjectType:'journal.entry',subjectId:posted.journalEntryId,actorId:actors[3].id},db);
 assert.equal(proof.evidenceGrade,'posted');assert.equal(proof.blockers.length,0);
 const lines=await db.journalEntryLine.findMany({where:{...scope,journalEntryId:posted.journalEntryId}});
 const {Prisma}=require('@prisma/client');const debit=lines.reduce((sum,line)=>sum.plus(line.debit),new Prisma.Decimal(0)),credit=lines.reduce((sum,line)=>sum.plus(line.credit),new Prisma.Decimal(0));assert.ok(debit.eq(credit)&&debit.gt(0));
 const before=await db.journalEntry.count({where:scope});const replay=await postPayrollRun(input(actors[3],4,'payroll.runs.post','post'),db);assert.equal(replay.idempotent,true);assert.equal(await db.journalEntry.count({where:scope}),before);
 const transitions=await db.payrollRunTransition.findMany({where:{...scope,payrollRunId:payroll.id},orderBy:{sequence:'asc'}});assert.equal(transitions.length,4);
 receipt.result={organizationId:org.id,payrollRunId:payroll.id,journalEntryId:posted.journalEntryId,ledgerPostingBatchId:posted.ledgerPostingBatchId,sourceLinkId:posted.accountingSourceLinkId,proofGrade:proof.evidenceGrade,debit:debit.toFixed(2),credit:credit.toFixed(2),transitionCount:transitions.length,idempotentReplay:true};
 await require('./payroll-release-proof-extension.cjs')({f,scope,actors,employee,payslip,payroll,now,runId,receipt,diagnosticDb}); receipt.passed=true;
}
main().catch(e=>{receipt.passed=false;receipt.error=f.safe(e);process.exitCode=1}).finally(async()=>{receipt.sourceAfter=hashes();receipt.sourceStable=JSON.stringify(receipt.sourceBefore)===JSON.stringify(receipt.sourceAfter);if(!receipt.sourceStable){receipt.passed=false;process.exitCode=1;}await db.$disconnect();const file='payroll-release-proof-'+runId+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(receipt,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:receipt.passed,stage:receipt.stage,error:receipt.error}));});
