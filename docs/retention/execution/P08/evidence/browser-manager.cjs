// Real authenticated routes and current read models; fault injection only in the
// recorded disposable DB. No response mocks or application route additions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright'
const {chromium}=require('playwright'),expect=require('@playwright/test').expect.configure({timeout:180000}),{PrismaClient}=require('@prisma/client'),{Client}=require('pg')
const read=name=>JSON.parse(fs.readFileSync(path.join(__dirname,name),'utf8')),t=read('DATABASE_TARGET.json'),app=read('APPLICATION_TARGET.json'),f=read('MANAGER_FIXTURE.json')
assert.equal(t.host,'localhost');assert.match(t.database,/^stoquify_pos_audit_20261018_[a-f0-9]+$/);assert.equal(app.database,t.database);assert.equal(app.origin,'http://127.0.0.1:3189')
const url=`postgresql://retention_fixture@localhost:${t.port}/${t.database}?schema=public`,db=new PrismaClient({datasources:{db:{url}}}),sql=new Client({connectionString:url})
async function main(){
 const stamp=Date.now(),result={utc:new Date().toISOString(),fixture:f.organizationId,scope:f.scope,steps:[]},browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}})
 result.browser=browser.version();await context.tracing.start({screenshots:true,snapshots:true,sources:false});await context.route('**/*',r=>new URL(r.request().url()).origin===app.origin?r.continue():r.abort());let page,renamed=false,locked=false
 const screenshot=async name=>page.screenshot({path:path.join(__dirname,name+'.png'),fullPage:false})
 async function auth(ctx,actor){const response=await ctx.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:actor.email,password:'Retention-Synthetic-Only-2026!',rememberMe:true},headers:{Origin:app.origin},timeout:300000});assert.equal(response.status(),200)}
 try{
  await sql.connect();await auth(context,f.actors.manager);page=await context.newPage()
  for(const locale of ['en','fr']){
   const copy=require(path.join(process.cwd(),'messages',locale+'.json')).dailyDigestRecovery
   const route=app.origin+'/'+locale+'/dashboard/daily-digest?digest=manager-run-sheet&mode=command'
   await page.setViewportSize(locale==='fr'?{width:390,height:844}:{width:1440,height:1000})
   await sql.query('BEGIN');await sql.query('LOCK TABLE inventory_levels IN ACCESS EXCLUSIVE MODE');locked=true
   await page.goto(route,{waitUntil:'commit',timeout:600000})
   await expect(page.getByRole('heading',{name:copy.loadingTitle,exact:true})).toBeVisible();await screenshot('MANAGER_LOADING_'+locale)
   await sql.query('COMMIT');locked=false
   const row=page.getByRole('article',{name:locale==='fr'?'Risque de rupture de stock':'Stockout Risk',exact:true})
   await expect(row).toBeVisible();await expect(row).toContainText(locale==='fr'?'Prochaine étape':'Next step')
   await row.scrollIntoViewIfNeeded();const link=row.getByRole('link',{name:locale==='fr'?'Ouvrir: Risque de rupture de stock':'Open: Stockout Risk',exact:true})
   await expect(link).toHaveAttribute('href','/'+locale+'/dashboard/inventory/items')
   await link.focus();await expect(link).toBeFocused();await screenshot('MANAGER_SOURCE_'+locale)
   const geometry=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(geometry.scrollWidth<=geometry.width+1,'No horizontal document overflow');result.steps.push({locale,state:'pending and source-linked discrepancy',geometry})
   await page.keyboard.press('Enter');await expect(page).toHaveURL(new RegExp('/'+locale+'/dashboard/inventory/items'))
   await expect(page.getByText('P08-STOCKOUT',{exact:true}).first()).toBeVisible()
   const itemLink=page.locator(`a[href="/${locale}/dashboard/inventory/items/${f.itemId}"]`).first()
   await expect(itemLink).toBeVisible();result.steps.push({locale,sourceItemId:f.itemId,displayedItemName:await itemLink.innerText()})
   await screenshot('MANAGER_DESTINATION_'+locale)
   result.steps.push({locale,state:'Keyboard source navigation reaches actual scoped inventory item'})
   // No client success assumption: change the synthetic source, then reload.
   await db.inventoryLevel.updateMany({where:{itemId:f.itemId,locationId:f.locationId},data:{quantityOnHand:5,quantityAvailable:5,totalValue:20}})
   await page.goto(route,{waitUntil:'domcontentloaded',timeout:300000});await expect(page.getByText(locale==='fr'?'Aucune action visible pour ce digest.':'No visible action is due for this digest.',{exact:true})).toBeVisible();await screenshot('MANAGER_EMPTY_'+locale)
   await db.inventoryLevel.updateMany({where:{itemId:f.itemId,locationId:f.locationId},data:{quantityOnHand:0,quantityAvailable:0,totalValue:0}})
   await sql.query('ALTER TABLE inventory_levels RENAME TO p08_unavailable_inventory_levels');renamed=true
   await page.goto(route,{waitUntil:'domcontentloaded',timeout:300000});await expect(page.getByRole('heading',{name:copy.errorTitle,exact:true})).toBeVisible();await screenshot('MANAGER_ERROR_'+locale)
   await sql.query('ALTER TABLE p08_unavailable_inventory_levels RENAME TO inventory_levels');renamed=false
   const retry=page.getByRole('button',{name:copy.retry,exact:true});await retry.focus();await expect(retry).toBeFocused();await page.keyboard.press('Enter');await expect(row).toBeVisible();await row.scrollIntoViewIfNeeded();await screenshot('MANAGER_RECOVERED_'+locale)
   result.steps.push({locale,state:'Empty distinct from failed source; keyboard retry restores actual read'})
  }
  const denied=await browser.newContext({viewport:{width:390,height:844}});await auth(denied,f.actors.denied)
  for(const locale of ['en','fr']){const p=await denied.newPage();await p.goto(app.origin+'/'+locale+'/dashboard/daily-digest',{waitUntil:'domcontentloaded',timeout:300000});const copy=require(path.join(process.cwd(),'messages',locale+'.json')).dailyDigestAccess;await expect(p.getByRole('heading',{name:copy.FORBIDDEN.title,exact:true})).toBeVisible();assert.equal(await p.getByRole('article',{name:/Stockout|rupture/}).count(),0);await p.screenshot({path:path.join(__dirname,'MANAGER_DENIED_'+locale+'.png'),fullPage:false});await p.close();result.steps.push({locale,state:'Actual denied role receives no digest/source action'})}await denied.close()
  result.status='PASS'
 }catch(e){result.status='FAIL';result.failure=e.message;process.exitCode=1;if(page){fs.writeFileSync(path.join(__dirname,'manager-failure-'+stamp+'.txt'),await page.locator('body').innerText().catch(()=>''));await screenshot('MANAGER_FAILURE_'+stamp).catch(()=>{})}}
 finally{if(locked)await sql.query('ROLLBACK');if(renamed)await sql.query('ALTER TABLE p08_unavailable_inventory_levels RENAME TO inventory_levels');await db.inventoryLevel.updateMany({where:{itemId:f.itemId,locationId:f.locationId},data:{quantityOnHand:0,quantityAvailable:0,totalValue:0}});result.injectionRestored=true;fs.writeFileSync(path.join(__dirname,'manager-'+stamp+'.json'),JSON.stringify(result,null,2));await context.tracing.stop({path:path.join(__dirname,'manager-trace-'+stamp+'.zip')});await context.close();await browser.close();await db.$disconnect();await sql.end();console.log(JSON.stringify(result))}
}
main().catch(e=>{console.error(e.message);process.exitCode=1})
