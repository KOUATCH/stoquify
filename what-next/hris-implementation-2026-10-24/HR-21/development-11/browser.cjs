const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const read=fs.readFileSync;fs.readFileSync=function(file,...args){if(typeof file==='string'&&path.basename(file).startsWith('.env'))throw Error('Environment files disabled');return read.call(this,file,...args)};
const base=__dirname,url='postgresql://hris_test@127.0.0.1:55464/stoquify_local_hris_20261024?schema=public';
const probe=process.argv.includes('--preflight-probe'),missingContext=process.argv.includes('--missing-context-probe');
const resultPath=path.join(base,probe||missingContext?'preflight-results.json':'browser-results.json');if(fs.existsSync(resultPath))fs.copyFileSync(resultPath,path.join(base,'prior-'+Date.now()+'.json'));
fs.writeFileSync(resultPath,JSON.stringify({status:'IN_PROGRESS',startedAt:new Date().toISOString()}));
let context,org,users=[],db,files=[],sourceHashes={},runtimeHashes={};
const hr=['hris.documents.read','hris.documents.manage','hris.documents.retention','hris.people.read','hris.people.manage','payroll.contracts.read','payroll.contracts.manage','EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.export','hris.tasks.read','hris.tasks.work','hris.tasks.review'],self=['EMPLOYEE_SALARY_READ','hris.handoff.read','hris.handoff.receive','hris.self_service.read','hris.self_service.request'];
const steps=[],failures=[],pageErrors=[],captures={},at=d=>new Date(d+'T00:00:00Z');
const hash=f=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),hashes=()=>Object.fromEntries(files.map(f=>[f,hash(f)]));
const runtimeFiles=['next.config.mjs','middleware.ts','package.json','tsconfig.json','next-env.d.ts','postcss.config.js','postcss.config.mjs','tailwind.config.ts'];
const runtimeHash=()=>Object.fromEntries(runtimeFiles.filter(f=>fs.existsSync(path.join(base,'runtime-files',f))).map(f=>[f,hash(path.join(base,'runtime-files',f))]));
const pages={},resources={};let browser,employeePage,reviewerPage,owns=false,cleaned=false,employee,requestId,policyId;
function record(name){steps.push(name);fs.writeFileSync(path.join(base,'progress.json'),JSON.stringify({steps,at:new Date().toISOString()},null,2));console.log(name)}
async function hydrated(page,locator){const until=Date.now()+150000;while(Date.now()<until){if(await locator.evaluate(el=>[el,el.closest('form')].filter(Boolean).some(n=>Object.keys(n).some(k=>k.startsWith('__reactProps')&&(typeof n[k]?.onClick==='function'||typeof n[k]?.onSubmit==='function')))))return;await page.waitForTimeout(500)}throw Error('Live control did not hydrate')}
async function verify(page,password,fr=false){const input=page.getByLabel(fr?'Mot de passe':'Password',{exact:true});await input.waitFor();assert.equal(await input.evaluate(el=>el===document.activeElement),true);await input.fill(password);await page.getByRole('dialog').filter({has:input}).getByRole('button',{name:fr?'Vérifier le mot de passe':'Verify password',exact:true}).click();await input.waitFor({state:'hidden'})}
async function main(){
 try{
  context=JSON.parse(fs.readFileSync(path.join(base,missingContext?'intentionally-absent-context.json':'runtime-context.json')));
  if(process.env.HRIS_CORRECTNESS_DATABASE_URL!==url||context.url!=='http://127.0.0.1:35587'||!context.organizationId.startsWith('hr21recover-')||probe)throw Error('Owned environment required');
  org=context.organizationId;users=['employee','preparer','reviewer','applier'].map(x=>org+'-'+x);
  files=JSON.parse(fs.readFileSync(path.join(base,'sources.json')));sourceHashes=hashes();runtimeHashes=runtimeHash();
  for(const f of files.filter(f=>f.startsWith('app/')))assert.equal(hash(f),hash(path.join(base,'runtime-files',f)),'Stale copied route: '+f);
  for(const [f,h] of Object.entries(JSON.parse(fs.readFileSync(path.join(base,'runtime-provenance.json'))).configurationHashes)){assert.equal(hash(f),h,'Root configuration drift: '+f);if(!['tsconfig.json','next-env.d.ts'].includes(f))assert.equal(runtimeHashes[f],h,'Runtime configuration drift: '+f)}
  const {PrismaClient}=require('@prisma/client'),argon2=require('argon2'),{chromium}=require('playwright');
  db=new PrismaClient({datasources:{db:{url}},transactionOptions:{maxWait:15000,timeout:60000}});
  assert.equal(await db.organization.count({where:{id:org}}),0);await db.organization.create({data:{id:org,slug:org,name:'Synthetic DBakes hiring workflow',country:'CM',timezone:'Africa/Douala',requestedModules:['payroll']}});owns=true;
  const password=crypto.randomBytes(30).toString('hex'),encoded=await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  for(const [i,id]of users.entries()){await db.user.create({data:{id,organizationId:org,name:['Synthetic employee','Synthetic HR preparer','Synthetic independent reviewer','Synthetic destination applier'][i],email:id+'@example.invalid',emailVerified:true,isVerified:true}});await db.role.create({data:{organizationId:org,code:id,nameEn:'Synthetic '+i,permissions:i===0?self:hr,users:{connect:{id}}}});await db.account.create({data:{userId:id,accountId:id,providerId:'credential',password:encoded}})}
  employee=null;
  await require('./journey.cjs')({db,context,org,users,employee,password,record,hydrated,verify,base,pages,captures,pageErrors,resources});
  assert.equal(pageErrors.length,0);assert.deepEqual(hashes(),sourceHashes);assert.deepEqual(runtimeHash(),runtimeHashes);
 }catch(e){failures.push({name:e.name,message:e.message});for(const [name,p]of Object.entries(pages))if(p){fs.writeFileSync(path.join(base,name+'-failure.txt'),await p.locator('body').innerText().catch(()=>''));await p.screenshot({path:path.join(base,name+'-failure.png'),fullPage:true}).catch(()=>{})}}
 finally{
  try{await resources.browser?.close()}catch(e){failures.push({name:'browser-close',message:e.message})}
  try{if(owns){await db.$executeRaw`DELETE FROM hris_lifecycle_tasks WHERE "organizationId"=${org}`;await db.$executeRaw`DELETE FROM hris_employee_documents WHERE "organizationId"=${org}`;const where={organizationId:org};for(const model of ['payrollEmployeeRubriqueAssignment','payrollRubrique','payrollPaymentDestinationChangeRequest','payrollContract','payrollAttendanceSnapshot','hrisAttendanceAnomaly','hrisTimeRequest','hrisTimeEntry','hrisTimeImportBatch','hrisLeaveBalanceEntry','hrisWorkSchedule','hrisPublicHoliday','hrisWorkCalendar','hrisLeavePolicy','payrollPeriod','payrollEmployee'])await db[model].deleteMany({where});await db.organization.delete({where:{id:org}});await db.user.deleteMany({where:{id:{in:users}}});assert.equal(await db.organization.count({where:{id:org}}),0);for(const model of ['user','session','account'])assert.equal(await db[model].count({where:model==='user'?{id:{in:users}}:{userId:{in:users}}}),0)}cleaned=true}catch(e){failures.push({name:'cleanup',message:e.message})}
  try{await db?.$disconnect()}catch(e){failures.push({name:'disconnect',message:e.message})}
  const passed=failures.length===0&&cleaned&&steps.length===12;fs.writeFileSync(resultPath,JSON.stringify({status:passed?'PASS_SCOPED':'FAILED',steps,failures,pageErrors,sourceHashes,runtimeHashes,databaseClientCreated:!!db,cleanupComplete:cleaned,completedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({passed,steps:steps.length,failures,cleaned}));process.exitCode=passed?0:1
 }
}
main().then(()=>process.exit(process.exitCode??0));
