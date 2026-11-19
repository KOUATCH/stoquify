const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const root=process.cwd(),fixture=JSON.parse(fs.readFileSync(path.join(root,'.codex-tmp/workflow-closure-private.json'),'utf8'));
if(fixture.base!=='http://127.0.0.1:3168'||new URL(fixture.url).pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong fixture');
async function main(){const browser=await chromium.launch({headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();try{
 const response=await context.request.post(fixture.base+'/api/auth/sign-in/email',{data:{email:fixture.actor.email,password:fixture.password},headers:{Origin:fixture.base},timeout:180000});console.log('Real sign-in HTTP '+response.status());assert.equal(response.status(),200);
 await context.storageState({path:path.join(root,'.codex-tmp/workflow-closure-session.json')});
 await page.goto(fixture.base+'/en/dashboard/purchase-orders/new',{waitUntil:'domcontentloaded',timeout:240000});await page.waitForTimeout(2000);
 fs.writeFileSync(path.join(__dirname,'initial-page.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(__dirname,'initial-authenticated-page.png'),fullPage:true});console.log((await page.locator('body').innerText()).slice(0,6000));
}finally{await browser.close()}}
main().catch(error=>{console.error(error.message);process.exitCode=1});
