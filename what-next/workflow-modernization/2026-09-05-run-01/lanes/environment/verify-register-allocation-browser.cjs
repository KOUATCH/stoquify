const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts'));
const {getPayrollRegister:getRead}=require(path.join(root,'services/payroll/payroll-register.service.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[];
const files=['services/payroll/payroll-register.service.ts','components/payroll/PayrollRegisterTieOut.tsx','actions/payroll/payroll-register.actions.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),syntheticAllocationFixtures:true,sourceBefore:hashes(),checks:[]};let browser,page;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const template=await db.payrollPaymentBatch.findFirstOrThrow({where:{batchNumber:'6d93a3a4-7fdf-4f0e-9427-52beb96eb479-concurrent'}}),scope={organizationId:template.organizationId};
 assert.ok((await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}})).name.startsWith(helper.prefix));
 const payslip=await db.payrollPayslip.findFirstOrThrow({where:{...scope,payrollRunId:template.payrollRunId}});
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 const permissions=['dashboard.read','finance.read','payroll.command.read','payroll.reports.read','payroll.payslips.read'];
 await db.role.create({data:{...scope,code:'register-'+stamp,nameEn:'Owned register reviewer',permissions,users:{connect:{id:actor.id}}}});
 const input={...scope,payrollRunId:template.payrollRunId,actorId:actor.id,actorPermissions:permissions};
 const before=await getRead(input,db),batchIds=[];
 for(const status of ['DRAFT','CANCELLED','FAILED']){
  const batch=await db.payrollPaymentBatch.create({data:{...scope,payrollRunId:template.payrollRunId,batchNumber:stamp+'-'+status,status,method:'BANK_TRANSFER',amount:'30.00',currency:'XAF',paymentDate:new Date(),requestedById:template.requestedById,metadata:{ownedSyntheticAllocationFixture:true},allocations:{create:{...scope,employeeId:payslip.employeeId,payslipId:payslip.id,amount:'30.00',currency:'XAF'}}}});batchIds.push(batch.id);
 }
 const read=await getRead(input,db);assert.equal(Number(read.summary.allocatedAmount),Number(before.summary.allocatedAmount)+30);assert.ok(!('paidAmount' in read.summary));assert.notEqual(read.summary.registerHash,before.summary.registerHash);assert.equal(read.paymentBatches.filter(b=>batchIds.includes(b.id)).length,3);
 await assert.rejects(getRead({...input,organizationId:'other-tenant'},db),/not found/);
 const redacted=await getRead({...input,actorPermissions:['payroll.reports.read']},db);assert.match(redacted.summary.allocatedAmount,/REDACTED/);
 result.persisted={cancelledAndFailedExcluded:true,draftIsAllocationNotSettlement:true,historyRetained:true,crossTenantDenied:true,amountRedacted:true,batchIds};
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password},timeout:60000})).status(),200);
  page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  result.stage=locale+' register';await page.goto(base+'/'+locale+'/dashboard/payroll/register?runId='+template.payrollRunId,{waitUntil:'domcontentloaded',timeout:180000});
  const label=locale==='fr'?'Montant affecté':'Allocated amount',review=locale==='fr'?'Consulter les preuves de règlement':'Review settlement evidence';
  const metric=page.getByText(label,{exact:true}).first().locator('..');await expect(metric).toContainText(read.summary.allocatedAmount+' XAF');
  const link=page.getByRole('link',{name:review,exact:true});await expect(link).toBeVisible();await expect(link).toHaveAttribute('href','/'+locale+'/dashboard/payroll/payments');
  await expect(link.locator('..')).toContainText(locale==='fr'?'ne prouve pas son règlement':'does not prove settlement');
  await link.focus();await expect(link).toBeFocused();await page.keyboard.press('Tab');assert.ok(!await link.evaluate(el=>el===document.activeElement));
  assert.ok(await link.locator('..').evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  const screenshot='register-allocation-'+stamp+'-'+locale+'.png';await page.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});
  assert.deepEqual(errors,[]);result.checks.push({locale,allocationLabel:true,settlementExplanation:true,localizedHandoff:true,keyboardFocus:true,noExplanationOverflow:true,noPageErrors:true,screenshot});await context.close();
 }
 result.passed=true;
}
main().catch(async e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;if(page&&!page.isClosed()){result.failureScreenshot='register-allocation-'+stamp+'-failed.png';await page.screenshot({path:path.join(__dirname,result.failureScreenshot)}).catch(()=>{});}}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);if(!result.sourceStable){result.passed=false;process.exitCode=1;}const file='register-allocation-browser-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,stage:result.stage,error:result.error}));await db.$disconnect();});
