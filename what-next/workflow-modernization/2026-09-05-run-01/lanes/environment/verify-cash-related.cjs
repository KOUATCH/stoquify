// Reuse an owned synthetic fixture; no financial writes or authentication changes.
const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const snapshotRoot=path.join(f.root,'services/snapshots');
const payment=require(path.join(snapshotRoot,'payment-truth-snapshot.service.ts'));
const inventory=require(path.join(snapshotRoot,'inventory-cash-snapshot.service.ts'));
const close=require(path.join(snapshotRoot,'close-readiness-snapshot.service.ts'));
const tenant=require(path.join(snapshotRoot,'tenant-operating-snapshot.service.ts'));
const service=require(path.join(f.root,'services/cash-command/cash-command.service.ts'));
const files=['services/cash-command/cash-command.service.ts','services/cash-command/cash-command-visibility.service.ts','services/cash-command/__tests__/cash-command.service.test.ts','services/snapshots/tenant-operating-snapshot.service.ts','services/snapshots/payment-truth-snapshot.service.ts','services/snapshots/inventory-cash-snapshot.service.ts','services/snapshots/close-readiness-snapshot.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),purpose:'Real database read equivalence and related-service invocation counts. Historical orchestration reconstructed through original tenant snapshot entry; no latency certification.',checks:[]};
let counts={},seen={};
for(const [name,module,key] of [['payment',payment,'getPaymentTruthSnapshot'],['inventory',inventory,'getInventoryCashSnapshot'],['close',close,'getCloseReadinessSnapshot']]){
 const original=module[key];module[key]=async(...args)=>{counts[name]=(counts[name]||0)+1;const value=await original(...args);seen[name]=value;return value;};
}
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const org=await db.organization.findUnique({where:{slug:'proof-module-proof-module-8f759c2c-13c9-4d56-94ea-92a60f5743ff'}});
 assert.ok(org&&org.name.startsWith(helper.prefix));
 const role=await db.role.findFirst({where:{organizationId:org.id,code:'admin'},include:{users:{select:{id:true}}}});assert.equal(role.users.length,1);
 const input={organizationId:org.id,actorId:role.users[0].id,actorPermissions:role.permissions,actorRoleCodes:['admin'],now:new Date().toISOString()};
 const effects=async()=>JSON.stringify({balances:await db.payrollEmployeeBalanceCase.findMany({where:{organizationId:org.id},orderBy:{id:'asc'}}),transactions:await db.paymentTransaction.findMany({where:{organizationId:org.id},orderBy:{id:'asc'}}),journals:await db.journalEntry.count({where:{organizationId:org.id}}),payments:await db.payment.count({where:{organizationId:org.id}})});
 const before=await effects(),fromRelated=tenant.getTenantOperatingSnapshotFromRelated;
 let baselineAggregate,currentAggregate;
 tenant.getTenantOperatingSnapshotFromRelated=async scope=>baselineAggregate=await tenant.getTenantOperatingSnapshot(scope);
 const started=performance.now(),baseline=await service.getCashCommandData(input);result.baseline={counts:{...counts},elapsedMs:performance.now()-started};
 assert.deepEqual(counts,{payment:2,inventory:2,close:2});
 counts={};seen={};
 tenant.getTenantOperatingSnapshotFromRelated=async(scope,related)=>{
  assert.equal(related.paymentTruth,seen.payment);assert.equal(related.inventoryCash,seen.inventory);assert.equal(related.closeReadiness,seen.close);
  return currentAggregate=await fromRelated(scope,related);
 };
 const next=performance.now(),current=await service.getCashCommandData(input);result.current={counts:{...counts},elapsedMs:performance.now()-next};
 assert.deepEqual(counts,{payment:1,inventory:1,close:1});
 assert.deepEqual(currentAggregate,baselineAggregate);
 assert.deepEqual(current.summary,baseline.summary);
 assert.deepEqual(current.proofSubjects,baseline.proofSubjects);
 const cardValues=data=>data.cards.map(({id,value,state,unit})=>({id,value,state,unit}));assert.deepEqual(cardValues(current),cardValues(baseline));
 result.checks.push('same actual aggregate including provenance and blockers','same disclosed summary, proof subjects and card values/states','related service invocations reduced from six to three','aggregate receives identical source objects used by cards');
 result.noBusinessMutation=before===await effects();assert.ok(result.noBusinessMutation);
 result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,[]);process.exitCode=1;}).finally(async()=>{await db.$disconnect();const file=path.join(__dirname,'cash-related-'+crypto.randomUUID()+'.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,checks:result.checks,baseline:result.baseline,current:result.current}));});
