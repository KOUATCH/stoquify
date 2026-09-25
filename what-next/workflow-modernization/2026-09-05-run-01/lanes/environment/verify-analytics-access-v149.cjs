const f=require('./statement-recipient-fixtures.cjs'),{db,fs,path,crypto,assert}=f,{fixture,snapshot}=require('./verify-tender-access-v131.cjs');
const pos=require(path.join(f.root,'services/pos/pos.service.ts')),{hashPassword}=require(path.join(f.root,'lib/password.ts')),{chromium,expect:baseExpect}=require('@playwright/test'),expect=baseExpect.configure({timeout:60000});
const base='http://127.0.0.1:3110',stamp=crypto.randomUUID(),secrets=[],files=['app/[locale]/(dashboard)/dashboard/analytics/analytics-route-access.tsx','messages/en.json','messages/fr.json'];
const hash=()=>Object.fromEntries(files.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root,file))).digest('hex')]));
const result={at:new Date().toISOString(),sourceBefore:hash(),browser:[]};let browser;
async function main(){
 await f.helper.withClient(f.target,f.helper.assertOwned);browser=await chromium.launch({headless:true});
 for(const locale of ['en','fr']){
  const x=await fixture('analytics-access-'+locale),{organizationId,userId}=x.ctx,password='Owned-'+crypto.randomUUID()+'!';secrets.push(password);
  const hashed=await hashPassword(password),user=await db.user.update({where:{id:userId},data:{password:hashed,isActive:true,isVerified:true,emailVerified:true}});
  const role=await db.role.create({data:{organizationId,code:'administrator',nameEn:'Owned analytics reader',permissions:['dashboard.read','reports.read'],users:{connect:{id:userId}}}});
  await db.account.create({data:{userId,accountId:userId,providerId:'credential',password:hashed}});await db.organization.update({where:{id:organizationId},data:{currency:'EUR',timezone:'UTC'}});await pos.commitPOSSale(x.commit);
  const before=await snapshot(x),context=await browser.newContext({viewport:{width:1440,height:1100},reducedMotion:'reduce'}),sample={locale,deniedRoutes:[],screenshots:[],pageErrors:[]};result.browser.push(sample);let page;
  try{
   await context.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
   assert.equal((await context.request.post(base+'/api/auth/sign-in/email',{data:{email:user.email,password},headers:{Origin:base},timeout:180000})).status(),200);
   page=await context.newPage();page.setDefaultNavigationTimeout(180000);page.on('pageerror',e=>sample.pageErrors.push({message:f.safe(e,secrets),stack:f.safe(e.stack||e,secrets),url:page.url()}));
   await page.goto(base+'/'+locale+'/dashboard/analytics');await expect(page.getByTestId('pulse-stock-coverage')).toBeVisible();
   await db.organization.update({where:{id:organizationId},data:{timezone:'INVALID/OWNED_TIMEZONE'}});await page.reload();
   await expect(page.getByRole('heading',{name:locale==='fr'?'Impossible de charger les analyses':'Analytics could not load',exact:true})).toBeVisible();
   await db.role.update({where:{id:role.id},data:{permissions:[]}});await db.organization.update({where:{id:organizationId},data:{timezone:'UTC'}});
   const retry=page.getByRole('button',{name:locale==='fr'?'Réessayer':'Retry',exact:true});await retry.focus();await expect(retry).toBeFocused();await page.keyboard.press('Enter');
   const title=locale==='fr'?'L’accès aux analyses n’est pas autorisé':'Analytics access is not authorized';await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();sample.retryRevalidatedPermissions=true;
   for(const route of ['analytics','analytics/reports','analytics/referrals']){
    await page.goto(base+'/'+locale+'/dashboard/'+route);await expect(page.getByRole('heading',{name:title,exact:true})).toBeVisible();await expect(page.getByTestId('pulse-stock-coverage')).toHaveCount(0);
    const recovery=page.getByRole('link',{name:locale==='fr'?'Retour au tableau de bord':'Back to dashboard',exact:true}).last();await expect(recovery).toHaveAttribute('href','/'+locale+'/dashboard');await recovery.focus();await expect(recovery).toBeFocused();
    for(const width of [1440,320]){await page.setViewportSize({width,height:1100});await expect(recovery).toBeVisible();const file='analytics-access-v149-'+locale+'-'+route.replaceAll('/','-')+'-'+width+'-'+stamp+'.png';await page.screenshot({path:path.join(__dirname,file),animations:'disabled'});sample.screenshots.push(file)}
    sample.deniedRoutes.push(route);
   }
   await db.role.update({where:{id:role.id},data:{permissions:['dashboard.read','reports.read']}});await page.goto(base+'/'+locale+'/dashboard/analytics');await expect(page.getByTestId('pulse-stock-coverage')).toBeVisible();
   const revenue=page.getByText(locale==='fr'?"Chiffre d'affaires":'Revenue',{exact:true}).first().locator('..');await expect(revenue.locator('p').last()).toHaveText(new Intl.NumberFormat(locale==='fr'?'fr-CM':'en',{style:'currency',currency:'EUR'}).format(100));sample.restoredAuthorizedRead=true;
   assert.equal(await snapshot(x),before);sample.selectedFinancialRecordsUnchanged=true;
  }catch(e){sample.error=f.safe(e,secrets);if(page)sample.headings=await page.getByRole('heading').allTextContents();throw e}finally{await db.organization.update({where:{id:organizationId},data:{timezone:'UTC'}});await context.close()}
 }
 result.passed=true;
}
main().catch(e=>{result.error=f.safe(e,secrets);process.exitCode=1}).finally(async()=>{result.sourceAfter=hash();result.sourceStable=JSON.stringify(result.sourceAfter)===JSON.stringify(result.sourceBefore);const file=path.join(__dirname,'analytics-access-v149-'+stamp+'.json');console.log(JSON.stringify({file,...result}));try{fs.writeFileSync(file,JSON.stringify(result,null,2),{flag:'wx'})}finally{await browser?.close();await db.$disconnect()}});
