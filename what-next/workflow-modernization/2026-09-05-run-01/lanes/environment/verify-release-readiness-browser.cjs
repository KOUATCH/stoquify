const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts'));
const {getPayrollRunWorkbenchData:getRead,requestPayrollPaymentBatch:request}=require(path.join(root,'services/payroll/payroll-control.service.ts'));
const {assertApprovedPaymentDestinationEvidence}=require(path.join(root,'services/payroll/payment-evidence.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['components/payroll/PayrollRunWorkbench.tsx','services/payroll/payroll-control.service.ts','services/payroll/certified-input-proof.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'payroll-release-proof-22041471-22ee-4ac5-8167-2517618c43e9.json'))),run=await db.payrollRun.findUniqueOrThrow({where:{id:fixture.result.payrollRunId}}),scope={organizationId:run.organizationId};
 assert.ok((await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}})).name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['dashboard.read','finance.read','payroll.command.read','payroll.runs.read','payroll.reports.read','payroll.payslips.read','payroll.payments.request','payroll.declarations.prepare'];
 await db.role.create({data:{...scope,code:'readiness-'+stamp,nameEn:'Owned readiness reviewer',permissions,users:{connect:{id:actor.id}}}});
 const modules=['dashboard','finance','accounting','payroll'];await db.tenantModuleConfiguration.upsert({where:{organizationId:scope.organizationId},create:{...scope,selectedModules:modules,activeModules:modules,manifestHash:'owned-synthetic'},update:{}});
 for(const moduleSlug of modules)await db.tenantModuleGrant.upsert({where:{organizationId_moduleSlug:{...scope,moduleSlug}},create:{...scope,moduleSlug,status:'active',source:'requested_modules'},update:{}});
 const read=await getRead({...scope,actorId:actor.id,actorPermissions:permissions},db),row=read.runs.find(r=>r.id===run.id);assert.ok(row);assert.ok(row.blockers.some(b=>b.id==='PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING'));for(const id of ['request-payments','prepare-declarations']){const action=row.nextActions.find(a=>a.id===id);assert.ok(action&&!action.allowed&&action.blockedBy.includes('PAYROLL_RUN_CERTIFIED_INPUT_PROOF_MISSING'));}
 const payslip=await db.payrollPayslip.findFirstOrThrow({where:{...scope,payrollRunId:run.id}});await assertApprovedPaymentDestinationEvidence(db,{...scope,employeeId:payslip.employeeId});
 const before={batches:await db.payrollPaymentBatch.count({where:scope}),transactions:await db.paymentTransaction.count({where:scope})};const now=new Date();await assert.rejects(request({...scope,payrollRunId:run.id,requestedById:actor.id,actorPermissions:permissions,lastAuthAt:now,now,paymentDate:now,method:'BANK_TRANSFER',bankFileHash:'synthetic-bank-file',allocations:[{payslipId:payslip.id,employeeId:payslip.employeeId,amount:payslip.netPayableAmount.toString()}],idempotencyKey:stamp},db),/certified HRIS input readiness/);assert.deepEqual({batches:await db.payrollPaymentBatch.count({where:scope}),transactions:await db.paymentTransaction.count({where:scope})},before);result.server={missingProofActionsBlocked:true,destinationStillValid:true,writeGateDeniedWithoutPaymentEffects:true};
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/'+locale+'/dashboard/payroll/runs',{waitUntil:'domcontentloaded',timeout:180000});
  const title=locale==='fr'?'Preuves des données de paie certifiées manquantes':'Certified payroll input proof is missing';
  const blocker=page.locator('p').filter({hasText:new RegExp('^'+title+'$')}).locator('../..');await expect(blocker).toBeVisible();await expect(blocker).toContainText(locale==='fr'?'n’insérez pas manuellement':'do not edit a posted run');
  await expect(page.getByRole('button',{name:'Open payment request drawer',exact:true})).toBeDisabled();await expect(page.getByRole('button',{name:'Open declaration drawer',exact:true})).toBeDisabled();
  const screenshot='release-readiness-'+stamp+'-'+locale+'.png';await blocker.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});assert.ok(await blocker.evaluate(el=>el.scrollWidth<=el.clientWidth+1));assert.deepEqual(errors,[]);
  result.checks.push({locale,localizedExplanation:true,paymentActionDisabled:true,declarationActionDisabled:true,noBlockerOverflow:true,noPageErrors:true,screenshot});await context.close();
 }
 result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed())await page.screenshot({path:path.join(__dirname,'release-readiness-'+stamp+'-failed.png')}).catch(()=>{});}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='release-readiness-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();});
