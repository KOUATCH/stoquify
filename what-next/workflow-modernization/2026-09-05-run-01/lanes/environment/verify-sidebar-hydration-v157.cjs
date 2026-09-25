const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f;
const {hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const stamp=crypto.randomUUID(),base='http://127.0.0.1:3110',secrets=[],files=['components/dashboard/Sidebar.tsx','components/NotificationMenu.tsx','components/global/kit-logo.tsx','components/ui/sheet.tsx'];
const hashes=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hashes(),browser:[],scope:'Owned localhost fixture; credential login and read-only dashboard navigation. No notification mutations.'};let browser;
function safeFull(value){let text=String(value);for(const secret of [f.target.toString(),f.helper.metadata().authSecret,...secrets])if(secret)text=text.split(secret).join('[redacted]');return text.slice(0,30000)}
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);
 const org=await db.organization.create({data:{name:f.helper.prefix+'Sidebar hydration '+stamp,slug:'sidebar-hydration-'+stamp,currency:'XAF',timezone:'UTC'}});
 const password='Owned-'+crypto.randomUUID()+'!',hashed=await hashPassword(password);secrets.push(password);
 const actor=await db.user.create({data:{organizationId:org.id,email:'sidebar-'+stamp+'@example.invalid',password:hashed,isActive:true,isVerified:true,emailVerified:true}});
 await db.account.create({data:{userId:actor.id,accountId:actor.id,providerId:'credential',password:hashed}});
 await db.role.create({data:{organizationId:org.id,code:'administrator',nameEn:'Owned sidebar reader',permissions:['dashboard.read'],users:{connect:{id:actor.id}}}});
 browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',timezoneId:'America/New_York'});
  await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{headers:{Origin:base},data:{email:actor.email,password}})).status(),200);
  const page=await context.newPage(),row={locale,consoleErrors:[],pageErrors:[]};result.browser.push(row);
  page.on('pageerror',error=>row.pageErrors.push(safeFull(error.message)));
  page.on('console',message=>{if(message.type()==='error')row.consoleErrors.push(safeFull(message.text()))});
  await page.goto(base+`/${locale}/dashboard/daily-digest`,{timeout:120000});await expect(page.getByRole('heading',{name:locale==='en'?'Daily Habit Digest':'Digest quotidien',exact:true})).toBeVisible();
  await page.getByRole('button',{name:locale==='en'?'Command':'Pilotage',exact:true}).click();
  row.screenshot=`sidebar-hydration-v157-${stamp}-${locale}.png`;await page.screenshot({path:path.join(__dirname,row.screenshot),animations:'disabled'});
  row.hydrationErrors=row.consoleErrors.filter(x=>/hydrat/i.test(x));
  await context.close();
 }
 result.passed=result.browser.every(x=>x.pageErrors.length===0&&x.hydrationErrors.length===0);
}
main().catch(error=>{result.passed=false;result.error=f.safe(error,secrets);process.exitCode=1}).finally(async()=>{if(browser)await browser.close();result.sourceAfter=hashes();result.sourceStable=JSON.stringify(result.sourceBefore)===JSON.stringify(result.sourceAfter);const output=path.join(__dirname,'sidebar-hydration-v157-'+stamp+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify({output,...result}));await db.$disconnect()});
