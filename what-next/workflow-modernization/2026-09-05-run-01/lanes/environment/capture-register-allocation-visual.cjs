// Additional visual evidence: the earlier keyboard check scrolled its viewport past the changed copy.
const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert,helper,root}=f;
const {hashPassword}=require(path.join(root,'lib/password.ts'));
const {chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['components/payroll/PayrollRegisterTieOut.tsx','services/payroll/payroll-register.service.ts'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),checks:[]};let browser;
async function main(){
 await helper.withClient(f.target,helper.assertOwned);
 const run=await db.payrollRun.findUniqueOrThrow({where:{id:'cmunzycj40027mafwwrj2756t'}}),scope={organizationId:run.organizationId};
 assert.ok((await db.organization.findUniqueOrThrow({where:{id:scope.organizationId}})).name.startsWith(helper.prefix));
 const password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);const hashed=await hashPassword(password);
 const actor=await db.user.create({data:{...scope,email:stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 await db.role.create({data:{...scope,code:'register-visual-'+stamp,nameEn:'Owned register reviewer',permissions:['dashboard.read','finance.read','payroll.command.read','payroll.reports.read','payroll.payslips.read'],users:{connect:{id:actor.id}}}});
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:locale==='fr'?320:1440,height:1000},reducedMotion:'reduce'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password}})).status(),200);
  const page=await context.newPage();await page.goto(base+'/'+locale+'/dashboard/payroll/register?runId='+run.id,{waitUntil:'domcontentloaded',timeout:180000});
  const link=page.getByRole('link',{name:locale==='fr'?'Consulter les preuves de règlement':'Review settlement evidence',exact:true}),section=link.locator('..');await expect(section).toBeVisible();
  await link.focus();await expect(link).toBeFocused();
  const screenshot='register-allocation-copy-'+stamp+'-'+locale+'.png';await section.screenshot({path:path.join(__dirname,screenshot),animations:'disabled'});
  assert.ok(await section.evaluate(el=>el.scrollWidth<=el.clientWidth+1));result.checks.push({locale,width:locale==='fr'?320:1440,focusedLocalizedLink:true,noExplanationOverflow:true,screenshot});await context.close();
 }
 result.passed=true;
}
main().catch(e=>{result.passed=false;result.error=f.safe(e,secrets);process.exitCode=1;}).finally(async()=>{await browser?.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);result.passed=!!result.passed&&result.sourceStable;const file='register-allocation-visual-'+stamp+'.json';fs.writeFileSync(path.join(__dirname,file),JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:result.passed,error:result.error}));await db.$disconnect();});
