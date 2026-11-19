const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright'),{PrismaClient}=require('@prisma/client');
const f=JSON.parse(fs.readFileSync('.codex-tmp/remaining-pos-browser-private.json','utf8'));
if(f.base!=='http://127.0.0.1:3168'||new URL(f.url).hostname!=='localhost'||new URL(f.url).pathname!=='/stoquify_pos_audit_20261026_d30f')throw Error('Wrong local target');
async function main(){
 const browser=await chromium.launch({headless:true}),db=new PrismaClient({datasourceUrl:f.url}),results=[];
 try{
  const context=await browser.newContext();const login=await context.request.post(f.base+'/api/auth/sign-in/email',{data:{email:f.actor.email,password:f.password},headers:{Origin:f.base},timeout:120000});assert.equal(login.status(),200);
  const page=await context.newPage();page.setDefaultTimeout(60000);
  const before={commits:await db.pOSCommitResult.count({where:{organizationId:f.actor.organizationId}}),payments:await db.payment.count({where:{organizationId:f.actor.organizationId}})};
  for(const locale of ['en','fr'])for(const viewport of [{width:1440,height:1000},{width:390,height:844}]){
   await page.setViewportSize(viewport);await page.goto(f.base+'/'+locale+'/dashboard/pos',{waitUntil:'domcontentloaded',timeout:180000});
   const region=page.getByRole('region',{name:/Tracked test item.*SKU/});await region.waitFor();
   await region.focus();await page.keyboard.press('Shift+Tab');await page.keyboard.press('Tab');
   assert.equal(await region.evaluate(el=>document.activeElement===el),true);
   const dimensions=await region.evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,focusShadow:getComputedStyle(el).boxShadow}));
   assert.notEqual(dimensions.focusShadow,'none');
   await region.evaluate(el=>{el.scrollLeft=0});
   if(dimensions.scroll>dimensions.client){await page.keyboard.press('ArrowRight');await page.waitForFunction(()=>{const el=document.querySelector('[role="region"][tabindex="0"]');return el&&el.scrollLeft>0})}
   const afterArrow=await region.evaluate(el=>el.scrollLeft);
   await page.addScriptTag({path:require.resolve('axe-core/axe.min.js')});
   const axe=await page.evaluate(async()=>{const r=await window.axe.run(document.querySelector('main')??document.body,{runOnly:{type:'tag',values:['wcag2a','wcag2aa']}});return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),passes:r.passes.length}});
   const row={locale,viewport,keyboardReachable:true,dimensions,afterArrow,axe};results.push(row);
   fs.writeFileSync(path.join(__dirname,'pos-accessibility-results.json'),JSON.stringify({results},null,2));
   await page.screenshot({path:path.join(__dirname,`pos-accessibility-${locale}-${viewport.width}.png`),fullPage:true});
   assert.equal(axe.violations.length,0,JSON.stringify(axe.violations));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'Page must not horizontally overflow');
   console.log(locale+' '+viewport.width+': keyboard scroll/focus and axe passed');
  }
  const after={commits:await db.pOSCommitResult.count({where:{organizationId:f.actor.organizationId}}),payments:await db.payment.count({where:{organizationId:f.actor.organizationId}})};assert.deepEqual(after,before);
  fs.writeFileSync(path.join(__dirname,'pos-accessibility-results.json'),JSON.stringify({status:'PASS',results,before,after},null,2));
 }finally{await db.$disconnect();await browser.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
