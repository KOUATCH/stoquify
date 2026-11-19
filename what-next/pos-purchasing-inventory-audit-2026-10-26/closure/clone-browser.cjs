const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const root=process.cwd(),f=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8')),source=JSON.parse(fs.readFileSync(path.join(__dirname,'authenticated-browser-results.json'),'utf8'))[0].orderId;
if(f.base!=='http://127.0.0.1:3168'||new URL(f.url).pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong target');
const db=new PrismaClient({datasourceUrl:f.url});
async function main(){const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();page.setDefaultTimeout(45000);try{
 assert.equal((await context.request.post(f.base+'/api/auth/sign-in/email',{data:{email:f.actor.email,password:f.password},headers:{Origin:f.base}})).status(),200);
 const before=await db.purchaseOrder.count({where:{organizationId:f.actor.organizationId}});
 await page.goto(f.base+'/en/dashboard/purchase-orders/'+source,{waitUntil:'domcontentloaded',timeout:240000});
 let dropped=false;await page.route('**/*',async route=>{if(!dropped&&route.request().method()==='POST'&&route.request().headers()['next-action']&&route.request().postData()?.includes('requestId')){await route.fetch();dropped=true;await route.abort('failed')}else await route.continue()});
 await page.getByRole('button',{name:'Clone as a draft',exact:true}).first().click();await page.getByText('The clone result could not be confirmed',{exact:true}).waitFor();assert.ok(dropped);
 const key=await page.evaluate(({org,actor,id})=>sessionStorage.getItem(`purchase-clone:${org}:${actor}:${id}`),{org:f.actor.organizationId,actor:f.actor.userId,id:source});assert.ok(key);
 await page.screenshot({path:path.join(__dirname,'clone-unknown-en.png'),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.goto(f.base+'/fr/dashboard/purchase-orders/'+source,{waitUntil:'domcontentloaded',timeout:180000});
 await page.getByRole('button',{name:'Cloner en brouillon',exact:true}).first().click();
 await page.waitForURL(url=>url.pathname.includes('/purchase-orders/')&&!url.pathname.endsWith(source),{timeout:180000});
 assert.equal(await db.purchaseOrder.count({where:{organizationId:f.actor.organizationId}}),before+1);
 const retained=await db.purchaseOrderAuthoringDraft.findUniqueOrThrow({where:{id:key}});assert.equal(retained.status,'CREATED');assert.ok(page.url().includes(retained.resultOrderId));
 await page.screenshot({path:path.join(__dirname,'clone-recovered-fr.png'),fullPage:true});
 fs.writeFileSync(path.join(__dirname,'clone-browser-results.json'),JSON.stringify({status:'PASS',sourceOrderId:source,requestId:key,resultOrderId:retained.resultOrderId,ordersBefore:before,ordersAfter:before+1,lostReply:true,recoveredAfterLocaleNavigation:true,locales:['en','fr'],viewports:['1440x1000','390x844']},null,2));console.log('Authenticated clone/recovery PASS');
 }catch(e){fs.writeFileSync(path.join(__dirname,'clone-browser-failure.txt'),await page.locator('body').innerText());throw e}finally{await browser.close();await db.$disconnect()}}
main().catch(e=>{console.error(e.message);process.exitCode=1});
