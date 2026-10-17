// Failure injection is restricted to the explicitly owned synthetic P07 database.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
process.env.PLAYWRIGHT_BROWSERS_PATH='C:/Users/J COMPUTER/AppData/Local/ms-playwright';
const {chromium}=require('playwright'),{Client}=require('pg'),expect=require('@playwright/test').expect.configure({timeout:90000});
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n),'utf8'));
const target=read('DATABASE_TARGET.json'),app=read('APPLICATION_TARGET.json'),f=read('BROWSER_FIXTURE.json');
assert.equal(target.host,'localhost');assert.equal(target.user,'retention_fixture');assert.match(target.database,/^stoquify_retention_p07_20261017_[a-f0-9]+$/);assert.equal(app.database,target.database);assert.equal(app.origin,'http://127.0.0.1:3188');
const client=new Client({host:'127.0.0.1',port:target.port,user:target.user,database:target.database});
const root=path.resolve(__dirname,'../../../../..'),result={at:new Date().toISOString(),steps:[],database:target.database};
let browser,page,renamed=false,locked=false;
async function main(){
 for(const name of ['LOADING_en.png','LOADING_fr.png','ERROR_en.png','ERROR_fr.png']){const file=path.join(__dirname,name);if(fs.existsSync(file))fs.renameSync(file,path.join(__dirname,Date.now()+'-'+name));}
 await client.connect();browser=await chromium.launch({headless:true});const context=await browser.newContext({viewport:{width:390,height:844}});
 await context.route('**/*',route=>new URL(route.request().url()).origin===app.origin?route.continue():route.abort());
 const auth=await context.request.post(app.origin+'/api/auth/sign-in/email',{data:{email:f.actors.maker.email,password:'Retention-Synthetic-Only-2026!',rememberMe:true},headers:{Origin:app.origin},timeout:180000});assert.equal(auth.status(),200);page=await context.newPage();page.setDefaultTimeout(90000);
 for(const locale of ['en','fr']){
   const copy=JSON.parse(fs.readFileSync(path.join(root,`messages/${locale}.json`),'utf8')).masterDataOnboarding;
   await client.query('BEGIN');await client.query('LOCK TABLE public.onboarding_readiness_milestones IN ACCESS EXCLUSIVE MODE');locked=true;
   const navigation=page.goto(app.origin+`/${locale}/dashboard/settings/data-onboarding`,{waitUntil:'domcontentloaded',timeout:180000});
   try {await expect(page.getByText(copy.states.loading.title,{exact:true})).toBeVisible();await page.screenshot({path:path.join(__dirname,`LOADING_${locale}.png`)});result.steps.push(locale+' actual loading boundary under a held disposable read');}
   finally {await client.query('COMMIT');locked=false;}
   await navigation;await expect(page.getByRole('heading',{name:locale==='en'?'Opening positions: review still required':'Positions d’ouverture : revue encore requise'})).toBeVisible();
   await client.query('ALTER TABLE public.onboarding_readiness_milestones RENAME TO p07_injected_unavailable_milestones');renamed=true;
   await page.reload({waitUntil:'domcontentloaded',timeout:180000});await expect(page.getByRole('heading',{name:copy.states.error.title})).toBeVisible();
   await expect(page.getByText(locale==='en'?'Imported masters only':'Données de base importées uniquement',{exact:true})).toHaveCount(0);
   await page.screenshot({path:path.join(__dirname,`ERROR_${locale}.png`)});
   await client.query('ALTER TABLE public.p07_injected_unavailable_milestones RENAME TO onboarding_readiness_milestones');renamed=false;
   await page.waitForLoadState('networkidle',{timeout:180000});
   const retry=page.getByRole('button',{name:copy.states.error.retry,exact:true});await retry.focus();await page.keyboard.press('Enter');
   await expect(page.getByRole('heading',{name:locale==='en'?'Opening positions: review still required':'Positions d’ouverture : revue encore requise'})).toBeVisible();
   result.steps.push(locale+' failed evidence removes readiness; keyboard retry restores actual read');console.log(result.steps.slice(-2));
 }
 result.status='PASS';
}
main().catch(error=>{result.status='FAIL';result.error=error.stack;process.exitCode=1;console.error(error.message)}).finally(async()=>{
 try{if(locked)await client.query('ROLLBACK');if(renamed)await client.query('ALTER TABLE public.p07_injected_unavailable_milestones RENAME TO onboarding_readiness_milestones');result.injectionRestored=true;}catch(error){result.cleanupError=error.message;process.exitCode=1;}
 fs.writeFileSync(path.join(__dirname,'browser-states-'+Date.now()+'.json'),JSON.stringify(result,null,2));if(browser)await browser.close();await client.end();
});
