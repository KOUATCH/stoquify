const helper=require('./registration-local.cjs'),originalTarget=helper.targetUrl;
helper.targetUrl=()=>{const target=originalTarget();target.searchParams.set('connection_limit','2');return target;};
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const Module=require('node:module'),ts=require('typescript'),run=path.resolve(__dirname,'../..');
const binding=JSON.parse(fs.readFileSync(path.join(run,'evidence/payroll-forecast-extraction-binding.json')));
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const oldSource=fs.readFileSync(path.join(run,binding.baseline),'utf8');assert.equal(sha(oldSource),binding.beforeSha256);
const sourceFiles=[binding.file,binding.destination,'services/snapshots/snapshot-utils.ts','services/snapshots/snapshot-contracts.ts','services/payroll/certified-input-proof.ts'];
const hashes=()=>Object.fromEntries(sourceFiles.map(file=>[file,sha(fs.readFileSync(path.join(f.root,file)))]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[],purpose:'Read-only equivalence of retained algorithm, existing tenant integration and independently callable payroll calculation'};
let reads=[],expectedOrg=null;
const traced=db.$extends({query:{$allModels:{$allOperations:async({model,operation,args,query})=>{
 assert.ok(['findMany','findFirst','findUnique','count','aggregate','groupBy','findFirstOrThrow','findUniqueOrThrow'].includes(operation),'No mutation permitted');
 if(expectedOrg){assert.equal(args.where?.organizationId,expectedOrg,'Independent forecast scope missing');reads.push({model,operation});}
 return query(args);
}}}});
const dbModule=require(path.join(f.root,'prisma/db.ts'));dbModule.db=traced;
const current=require(path.join(f.root,binding.file));
const payroll=require(path.join(f.root,binding.destination));
const {getPaymentTruthSnapshot}=require(path.join(f.root,'services/snapshots/payment-truth-snapshot.service.ts'));
const {normalizeSnapshotScope}=require(path.join(f.root,'services/snapshots/snapshot-utils.ts'));
const baselineFilename=path.join(f.root,'services/snapshots/retained-payroll-extraction-baseline.ts');
const baselineModule=new Module(baselineFilename,module);baselineModule.filename=baselineFilename;baselineModule.paths=Module._nodeModulePaths(path.dirname(baselineFilename));
baselineModule._compile(ts.transpileModule(oldSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,baselineFilename);
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const populated=await db.organization.findFirst({where:{name:{startsWith:helper.prefix},slug:{startsWith:'forecast-currency-'}},orderBy:{createdAt:'desc'}});
 const empty=await db.organization.findUnique({where:{slug:'cash-private-own-82358d34-39e8-4ecb-9ec8-a08989cfe03b'}});
 assert.ok(populated&&empty&&empty.name.startsWith(helper.prefix));
 for(const [kind,org] of [['incomplete-posting-proof',populated],['successful-empty-source',empty]]){
  const period=await db.payrollPeriod.findFirst({where:{organizationId:org.id},orderBy:{createdAt:'desc'}});
  const scope=normalizeSnapshotScope({organizationId:org.id,now:period?.payDate??new Date()});
  const baseline=await baselineModule.exports.getTenantOperatingSnapshot(scope);
  const integrated=await current.getTenantOperatingSnapshot(scope);assert.deepEqual(integrated,baseline,'Tenant aggregate drift');
  const paymentTruth=await getPaymentTruthSnapshot(scope);reads=[];expectedOrg=org.id;
  const independent=await payroll.getPayrollFinanceForecast({scope,paymentTruth,currency:org.currency});expectedOrg=null;
  assert.deepEqual(independent.metrics,integrated.metrics.payrollFinanceForecast);
  assert.ok(reads.every(row=>['PayrollPeriod','PayrollRun','AccountingSourceLink'].includes(row.model)));
  assert.ok(reads.length>=2&&reads.length<=3);
  if(kind==='incomplete-posting-proof'){assert.equal(independent.metrics.authoritative,false);assert.equal(independent.metrics.totalUpcomingAmount,null);assert.ok(independent.metrics.blockerCodes.includes('PAYROLL_FORECAST_LEDGER_PROOF_MISSING'));}
  else {assert.equal(independent.metrics.authoritative,true);assert.equal(independent.metrics.totalUpcomingAmount,0);}
  expectedOrg=org.id;const unavailableProvider=await payroll.getPayrollFinanceForecast({scope,paymentTruth:null,currency:org.currency});expectedOrg=null;
  if(kind==='incomplete-posting-proof'){assert.equal(unavailableProvider.metrics.totalUpcomingAmount,null);assert.ok(unavailableProvider.metrics.blockerCodes.includes('PAYROLL_FORECAST_PROVIDER_PROOF_MISSING'));}
  else assert.equal(unavailableProvider.metrics.totalUpcomingAmount,0);
  result.checks.push({unavailableProviderVerified:true,kind,aggregateEquivalent:true,independentMetricsEquivalent:true,reads:[...reads],total:independent.metrics.totalUpcomingAmount,blockerCodes:independent.metrics.blockerCodes});
 }
 result.readOnlyGuardEnforced=true;result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);assert.ok(result.sourceStable);result.passed=true;
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,[]);process.exitCode=1;}).finally(async()=>{await db.$disconnect();const file=path.join(__dirname,'payroll-source-null-'+crypto.randomUUID()+'.json');fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error,checks:result.checks}));});
