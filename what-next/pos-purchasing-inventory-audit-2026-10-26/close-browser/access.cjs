const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const f=JSON.parse(fs.readFileSync('.codex-tmp/close-browser-private.json','utf8')),u=new URL(f.url);
if(f.base!=='http://127.0.0.1:3169'||u.hostname!=='localhost'||u.pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong local target');
const db=new PrismaClient({datasourceUrl:f.url}),results=[];
const save=()=>fs.writeFileSync(path.join(__dirname,'access-results.json'),JSON.stringify(results,null,2));
async function ready(page,locale){await page.getByTestId('close-readiness-workspace').waitFor();await page.waitForFunction(()=>document.querySelector('[data-testid="close-readiness-workspace"]')?.getAttribute('data-client-ready')==='true');const draft=page.getByRole('button',{name:locale==='fr'?'Exporter JSON brouillon':'Export draft JSON',exact:true});for(let i=0;i<90;i++){if(await draft.isEnabled())return;await new Promise(r=>setTimeout(r,1000))}throw Error('Authenticated client controls did not become ready')}
function refresh(page,locale){return page.locator('section').filter({has:page.getByRole('combobox',{name:locale==='fr'?'Periode':'Period',exact:true})}).getByRole('button',{name:locale==='fr'?'Actualiser':'Refresh',exact:true})}
(async()=>{const browser=await chromium.launch({headless:true});try{for(const v of f.fixtures){const actor=v.actors.find(a=>a.kind==='reviewer'),context=await browser.newContext({viewport:{width:v.locale==='fr'?390:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(90000);let responses=[];
page.on('response',async r=>{if(r.request().headers()['next-action']){try{const body=await r.text();if(/FORBIDDEN|AUTH_REQUIRED|UNAUTHORIZED|SESSION_EXPIRED/.test(body))responses.push({forbidden:body.includes('FORBIDDEN'),authRequired:body.includes('AUTH_REQUIRED'),unauthorized:body.includes('UNAUTHORIZED'),expired:body.includes('SESSION_EXPIRED')})}catch{}}});
try{const login=await context.request.post(f.base+'/api/auth/sign-in/email',{data:{email:actor.email,password:f.password},headers:{Origin:f.base},timeout:240000});assert.equal(login.status(),200);
const url=f.base+'/'+v.locale+'/dashboard/accounting/close/'+v.periodId;await page.goto(url,{waitUntil:'domcontentloaded',timeout:240000});await ready(page,v.locale);
const before={exports:await db.closePackExport.count({where:{organizationId:v.organizationId}}),runs:await db.closeRun.count({where:{organizationId:v.organizationId}})};
// Write permissions imply read access; revoke the entire close capability family.
await db.role.update({where:{id:actor.roleId},data:{permissions:actor.permissions.filter(p=>!p.startsWith('accounting.close.'))}});
await refresh(page,v.locale).click();
for(let i=0;i<60&&!responses.length;i++)await new Promise(r=>setTimeout(r,1000));if(!responses.length){fs.writeFileSync(path.join(__dirname,v.locale+'-missing-denial.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(__dirname,v.locale+'-missing-denial.png'),fullPage:true})}assert(responses.length,'Expected real protected read denial');
// Allow the declined refresh to settle; private assessment must leave the DOM.
await page.waitForTimeout(2000);const retained=await page.getByTestId('close-readiness-workspace').count();
await page.screenshot({path:path.join(__dirname,v.locale+'-read-revoked.png'),fullPage:true});fs.writeFileSync(path.join(__dirname,v.locale+'-read-revoked.txt'),await page.locator('body').innerText());
results.push({locale:v.locale,scenario:'READ_PERMISSION_REVOCATION',status:retained?'FAIL':'PASS',retainedPrivateWorkspace:!!retained,serverDenials:responses});save();
await db.role.update({where:{id:actor.roleId},data:{permissions:actor.permissions}});await page.reload({waitUntil:'domcontentloaded'});await ready(page,v.locale);
const foreign=f.fixtures.find(x=>x.organizationId!==v.organizationId);await page.goto(f.base+'/'+v.locale+'/dashboard/accounting/close/'+foreign.periodId,{waitUntil:'domcontentloaded',timeout:240000});
await page.waitForTimeout(3000);assert.equal(await page.getByTestId('close-readiness-workspace').count(),0);assert.equal((await page.locator('body').innerText()).includes('Synthetic '+foreign.locale+' close browser'),false);results.push({locale:v.locale,scenario:'CROSS_TENANT_PERIOD',status:'PASS'});save();
await page.goto(url,{waitUntil:'domcontentloaded'});await ready(page,v.locale);responses=[];
await db.session.deleteMany({where:{userId:actor.id}});await refresh(page,v.locale).click();
for(let i=0;i<60&&!responses.length&&!page.url().includes('/login');i++)await new Promise(r=>setTimeout(r,1000));await page.waitForTimeout(2000);
const stale=await page.getByTestId('close-readiness-workspace').count();await page.screenshot({path:path.join(__dirname,v.locale+'-session-revoked.png'),fullPage:true});results.push({locale:v.locale,scenario:'SESSION_REVOCATION',status:stale?'FAIL':'PASS',retainedPrivateWorkspace:!!stale,redirectedToLogin:page.url().includes('/login'),serverDenials:responses});
assert.deepEqual({exports:await db.closePackExport.count({where:{organizationId:v.organizationId}}),runs:await db.closeRun.count({where:{organizationId:v.organizationId}})},before);save();console.log(v.locale+' access checks recorded');
}finally{await db.role.update({where:{id:actor.roleId},data:{permissions:actor.permissions}});await context.close()}}
}finally{await browser.close()}})().catch(e=>{results.push({scenario:'HARNESS_FAILURE',status:'FAIL',error:e.message});save();console.error(e.message);process.exitCode=1}).finally(()=>db.$disconnect());
