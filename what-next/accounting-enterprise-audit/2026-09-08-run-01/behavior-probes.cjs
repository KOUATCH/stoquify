// Synthetic, audit-only probes execute current service code with in-memory DB doubles.
// Passing probes confirm observed behavior; they do not certify that behavior as correct.
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const assert=require('node:assert/strict');
const ts=require('typescript');
const {Prisma}=require('@prisma/client');
const D=x=>new Prisma.Decimal(x);
const errors={BusinessRuleError:class extends Error{},NotFoundError:class extends Error{},ForbiddenError:class extends Error{}};
const controls={evaluateSensitiveAction:()=>({allowed:true}),auditSensitiveActionDecision:async()=>{},assertSensitiveActionAllowed:()=>{}};
function load(file,mocks={}) {
 const absolute=path.resolve(file),m=new Module(absolute,module);m.filename=absolute;m.paths=Module._nodeModulePaths(process.cwd());
 m.require=function(name){if(name in mocks)return mocks[name];if(name==='@/services/_shared/action-errors')return errors;if(name==='@/services/controls/sensitive-action.service')return controls;if(name==='@/prisma/db')throw Error('Unmocked database access blocked');return require(name)};
 m._compile(ts.transpileModule(fs.readFileSync(absolute,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText,absolute);return m.exports;
}
const results=[];
const period={id:'period',organizationId:'org',fiscalYearId:'fy',name:'June',startDate:new Date('2026-06-01T00:00:00Z'),endDate:new Date('2026-06-30T23:59:59.999Z'),status:'OPEN'};
const account=(id,type='ASSET',normalBalance='DEBIT')=>({id,code:id,nameEn:id,nameFr:null,type,normalBalance,organizationId:'org',isActive:true,allowManualPost:true,currency:null,_count:{children:0},mappingKey:null,syscohadaClass:null});
const invariants=load('services/accounting/invariants.ts');
async function probe(id,fn){try{const value=await fn();results.push({id,status:'REPRODUCED',...value});}catch(e){results.push({id,status:'PROBE_FAILED',error:e.stack});}}
async function main(){
 await probe('FX_BASE_AMOUNT',async()=>{
  let saved;const tx={journal:{findFirst:async()=>({id:'journal',allowManualEntries:true})},chartOfAccount:{findMany:async()=>[account('cash'),account('capital','EQUITY','CREDIT')]},journalEntry:{count:async()=>0,create:async({data})=>(saved=data,{id:'draft',...data}),update:async()=>({id:'draft',entryNumber:'MJ-1'})},ledgerAuditEvent:{create:async()=>{}}};
  const service=load('services/accounting/journals.service.ts',{'@/prisma/db':{db:{$transaction:fn=>fn(tx)}},'@/services/modules/module-admission.service':{assertModuleNewWorkInTx:async()=>{}},'./invariants':invariants,'./periods.service':{getOpenPeriodForDate:async()=>period}});
  await service.createManualJournalEntry('org',{journalId:'journal',entryDate:new Date('2026-06-15'),lines:[{accountId:'cash',debit:'100',currency:'EUR',exchangeRate:'655.957',locationId:'foreign-location',customerId:'foreign-customer'},{accountId:'capital',credit:'100',currency:'EUR',exchangeRate:'655.957'}]},'maker');
  const line=saved.lines.create[0];assert.equal(line.baseDebit.toString(),'100');
  return {input:{currency:'EUR',amount:'100',syntheticRate:'655.957'},observed:{baseDebit:String(line.baseDebit),exchangeRate:String(line.exchangeRate),locationId:line.locationId,customerId:line.customerId},expectedConvertedBase:'65595.70',note:'Supplied dimensions are also copied without entity lookup in the invoked service.'};
 });
 await probe('REPORT_CURRENCY_MIX',async()=>{
  const queries=[];const accounts=[account('cash'),account('capital','EQUITY','CREDIT')];const rows=[{accountId:'cash',_sum:{debit:D(200),credit:D(0)}},{accountId:'capital',_sum:{debit:D(0),credit:D(200)}}];
  const db={accountingPeriod:{findFirst:async()=>period,findMany:async()=>[period]},chartOfAccount:{findMany:async()=>accounts},journalEntryLine:{groupBy:async q=>(queries.push(q),rows)},organizationAccountingSettings:{findUnique:async()=>({baseCurrency:'XAF'})},organization:{findUnique:async()=>({currency:'XAF'})}};
  const service=load('services/accounting/financial-statements.service.ts',{'@/prisma/db':{db}});const report=await service.getFinancialStatements({organizationId:'org',periodId:'period'});
  assert.deepEqual(queries[0].by,['accountId']);assert.deepEqual(queries[0]._sum,{debit:true,credit:true});
  return {syntheticInput:'100 EUR at rate 655.957 plus 100 XAF on the same account',observed:{currency:report.currency,balanceSheet:report.balanceSheet.totals,groupBy:queries[0].by,sum:queries[0]._sum},expectedBaseAssets:'65695.70'};
 });
 await probe('PARTIAL_FISCAL_YEAR',async()=>{
  let generated;const fiscal={id:'fy',name:'Partial'};const tx={fiscalYear:{create:async()=>fiscal,findUniqueOrThrow:async()=>({...fiscal,periods:generated})},accountingPeriod:{createMany:async({data})=>{generated=data}},ledgerAuditEvent:{create:async()=>{}}};
  const service=load('services/accounting/periods.service.ts',{'@/prisma/db':{db:{$transaction:fn=>fn(tx)}},'./invariants':invariants});
  await service.createFiscalYearWithPeriods('org',{name:'Partial',startDate:new Date('2026-06-15T00:00:00Z'),endDate:new Date('2026-08-31T00:00:00Z')},'maker');
  assert.equal(generated[0].startDate.toISOString(),'2026-06-01T00:00:00.000Z');return {requestedStart:'2026-06-15',firstPeriodStart:generated[0].startDate.toISOString(),periodCount:generated.length};
 });
 await probe('SOURCE_OWNED_REVERSAL',async()=>{
  let created,updated;const original={id:'pos-journal',organizationId:'org',journalId:'sales-journal',periodId:'period',entryDate:new Date('2026-06-15'),entryNumber:'POS-1',currency:'XAF',status:'POSTED',sourceType:'POS_SALE',sourceId:'completed-sale',createdById:'cashier',postedById:'cashier',reversedByEntries:[],lines:[{accountId:'cash',debit:D(100),credit:D(0),currency:'XAF'},{accountId:'sales',debit:D(0),credit:D(100),currency:'XAF'}]};
  const tx={journalEntry:{findFirst:async()=>original,count:async()=>0,create:async({data})=>(created=data,{id:'reversal',...data}),update:async({data})=>(updated=data,{...original,...data})},ledgerPostingBatch:{findFirst:async()=>null,create:async({data})=>({id:'batch',...data}),update:async({data})=>({id:'batch',...data})},ledgerAuditEvent:{create:async()=>{}}};
  const service=load('services/accounting/posting.service.ts',{'@/prisma/db':{db:{$transaction:fn=>fn(tx)}},'./invariants':invariants,'./periods.service':{getOpenPeriodForDate:async()=>period},'./source-link.service':{createAccountingSourceLink:async()=>({id:'source-link'})},'./journal-close-invalidation.service':{recordPostedJournalCloseInvalidationInTx:async()=>{},recordReversedJournalCloseInvalidationsInTx:async()=>{}}});
  await service.reverseJournalEntry('org','pos-journal','controller','Synthetic source correction',new Date('2026-06-16'),{actorPermissions:['accounting.journal.reverse']});
  assert.equal(updated.status,'REVERSED');assert.equal(created.sourceType,'MANUAL');return {inputSourceType:original.sourceType,originalNewStatus:updated.status,reversalSourceType:created.sourceType,reversalOfEntryId:created.reversalOfEntryId,note:'Only journal/batch/audit doubles were provided; no sale, tender, inventory or source-owned reversal command was invoked. Authorization was mocked as allowed.'};
 });
 await probe('GL_OPENING_BALANCE',async()=>{
  const queries=[];const db={journalEntryLine:{findMany:async q=>(queries.push(q),[{id:'line',journalEntryId:'entry',debit:D(25),credit:D(0),description:null,journalEntry:{entryNumber:'J1',entryDate:new Date('2026-06-15'),journal:{code:'GEN'},period:{name:'June'}},account:{code:'cash',nameEn:'Cash'}}])}};
  const service=load('services/accounting/reports.service.ts',{'@/prisma/db':{db}});const rows=await service.getGeneralLedger({organizationId:'org',accountId:'cash',startDate:new Date('2026-06-01')});assert.equal(rows[0].runningBalance,'25.00');return {scenario:'Opening balance 100 before selected start date; selected movement debit 25',observedRunningBalance:rows[0].runningBalance,queryCount:queries.length,expectedAccountBalance:'125.00',note:'Current result is period movement, but field is named runningBalance; no opening-balance query is made.'};
 });
 await probe('LOCKED_SETTINGS_MUTATION',async()=>{
  const existing={organizationId:'org',setupStatus:'LOCKED',accountingEnabled:true,baseCurrency:'XAF',inventoryValuationPolicy:'WEIGHTED_AVERAGE'};let saved;
  const tx={organizationAccountingSettings:{update:async({data})=>(saved={...existing,...data})},ledgerAuditEvent:{create:async()=>{}}};
  const service=load('services/accounting/accounting-settings.service.ts',{'@/prisma/db':{db:{organizationAccountingSettings:{findUnique:async()=>existing},$transaction:fn=>fn(tx)}}});
  await service.updateAccountingSettings('org',{baseCurrency:'EUR',inventoryValuationPolicy:'ARBITRARY_POLICY',roundingScale:6},'admin');
  assert.equal(saved.baseCurrency,'EUR');assert.equal(saved.setupStatus,'LOCKED');return {before:existing,after:saved,note:'No ledger activity lookup, setup-lock rejection or close invalidation is performed by this service.'};
 });
 await probe('CLOSE_WITHOUT_ASSURANCE_READ',async()=>{
  const count=async()=>0;let assuranceReads=0;let saved;
  const tx={accountingPeriod:{findFirst:async()=>period,update:async({data})=>(saved={...period,...data})},journalEntry:{count},ledgerPostingBatch:{count},paymentException:{count},suspenseItem:{count},reconciliationRun:{count},journalEntryLine:{findMany:async()=>[]},ledgerAuditEvent:{create:async()=>{}},closeRun:{findFirst:async()=>{assuranceReads++;return {status:'BLOCKED',findings:[{severity:'HIGH',code:'INVENTORY_MISMATCH'}]}}}};
  const service=load('services/accounting/periods.service.ts',{'@/prisma/db':{db:{$transaction:fn=>fn(tx)}},'./invariants':invariants});
  await service.closeAccountingPeriod('org','period','controller',{actorPermissions:['accounting.period.close']});
  assert.equal(saved.status,'CLOSED');assert.equal(assuranceReads,0);return {observedPeriodStatus:saved.status,assuranceReads,syntheticAssuranceState:'BLOCKED / INVENTORY_MISMATCH',note:'Authorization was mocked as allowed. Demonstrates separate close preflight, not a bypass of the certified-export gate.'};
 });
 fs.writeFileSync(path.join(__dirname,'evidence/behavior-probes.json'),JSON.stringify({generatedAt:new Date().toISOString(),scope:'Current service functions with synthetic in-memory database doubles; no deployed database access',results},null,2)+'\n');
 console.log(JSON.stringify(results,null,2));if(results.some(x=>x.status==='PROBE_FAILED'))process.exitCode=1;
}
module.exports={load,D,account,period};
if(require.main===module) main().catch(e=>{console.error(e);process.exitCode=1});
