const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright');
const f=JSON.parse(fs.readFileSync('.codex-tmp/close-browser-private.json','utf8'));
if(f.base!=='http://127.0.0.1:3169')throw Error('Wrong browser target');
(async()=>{const b=await chromium.launch({headless:true});try{const c=await b.newContext({viewport:{width:1440,height:1000}}),page=await c.newPage(),v=f.fixtures[0],actor=v.actors[0];
const response=await c.request.post(f.base+'/api/auth/sign-in/email',{data:{email:actor.email,password:f.password},headers:{Origin:f.base},timeout:240000});assert.equal(response.status(),200);
await page.goto(f.base+'/en/dashboard/accounting/close/'+v.periodId,{waitUntil:'domcontentloaded',timeout:240000});
await page.getByTestId('close-readiness-workspace').waitFor({timeout:120000}).catch(()=>{});
fs.writeFileSync(path.join(__dirname,'probe.txt'),await page.locator('body').innerText());await page.screenshot({path:path.join(__dirname,'probe.png'),fullPage:true});console.log((await page.locator('body').innerText()).slice(0,6500));
}finally{await b.close()}})().catch(e=>{console.error(e.message);process.exitCode=1});
