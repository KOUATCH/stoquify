const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, '.codex-tmp/manager-phase5');
const output = __dirname;
// Fixture-only runner. Reads UI sources/tokens; writes only this report and its owned temporary bundle.
// No Next configuration, environment loader, server actions, database, seed, migration, or real account.
fs.mkdirSync(work, {recursive:true});
fs.writeFileSync(path.join(work, 'loader.cjs'), `const ts=require(${JSON.stringify(path.join(root,'node_modules/typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(path.join(work, 'link.tsx'), 'export default function Link(props){return <a {...props}/>}; export const useLinkStatus=()=>({pending:false});');
fs.writeFileSync(path.join(work, 'intl.ts'), 'export const useTranslations=()=>key=>key;');
fs.writeFileSync(path.join(work,'actions.ts'), `const forbidden=async()=>{throw Error('Unexpected business command')};export const assignWorkflowAssuranceIncidentAction=async payload=>{window.fixtureCalls.push(payload);if(window.fixtureMode==='pending')return new Promise(resolve=>window.fixtureFinish=resolve);if(window.fixtureMode==='uncertain')throw Error('PRIVATE_INTERNAL_ERROR');if(window.fixtureMode==='conflict')return {success:false,status:409,error:'PRIVATE_INTERNAL_ERROR'};return {success:true,status:200,data:{id:'fixture-incident'}}};export const acknowledgeWorkflowAssuranceIncidentAction=forbidden;export const approveWorkflowAssuranceWaiverAction=forbidden;export const reopenWorkflowAssuranceIncidentAction=forbidden;export const requestWorkflowAssuranceWaiverAction=forbidden;export const resolveWorkflowAssuranceIncidentAction=forbidden;export const suppressWorkflowAssuranceIncidentAction=forbidden;export const resolvePosCashShortageIncidentAction=forbidden;`);
fs.writeFileSync(path.join(work,'notifications.ts'), `export const useNotifications=()=>({success:(title,message)=>window.fixtureMessages.push(message),error:()=>{throw Error('Unexpected notification')}});`);
fs.writeFileSync(path.join(work,'navigation.ts'),'export const useRouter=()=>({refresh:()=>{window.fixtureRefreshes++}});');
fs.writeFileSync(path.join(work,'css-loader.cjs'), 'module.exports=()=>' + JSON.stringify('export default {root:"digest-fixture"}'));
fs.writeFileSync(path.join(work,'entry.tsx'),fs.readFileSync(path.join(output,'browser-entry.tsx'),'utf8'));
async function build() {
  const bundled = require(path.join(root, 'node_modules/next/dist/compiled/webpack/webpack')); bundled.init();
  await new Promise((resolve,reject)=>bundled.webpack({
    mode:'development', devtool:false, context:root, entry:path.join(work,'entry.tsx'),
    output:{path:work,filename:'bundle.js'},
    resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/actions/assurance/workflow-assurance-incident.actions$':path.join(work,'actions.ts'),'@/actions/assurance/pos-cash-shortage-resolution.actions$':path.join(work,'actions.ts'),'@/components/notifications/NotificationProvider$':path.join(work,'notifications.ts'),'next/navigation$':path.join(work,'navigation.ts'),'@':root}},
    module:{rules:[{test:/\.module\.css$/,use:path.join(work,'css-loader.cjs')},{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(work,'loader.cjs')}]},
    optimization:{minimize:false}, performance:{hints:false},
  },(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
  const postcss = require(path.join(root, 'node_modules/postcss'));
  const tailwind = require(path.join(root, 'node_modules/tailwindcss'));
  const load = require(path.join(root,'node_modules/tailwindcss/loadConfig'));
  const config = load(path.join(root,'tailwind.config.ts'));
  config.content=[path.join(root,'components/assurance/**/*.tsx'),path.join(root,'components/ui/**/*.tsx'),path.join(root,'components/finance/finance-dashboard-theme.ts')];
  const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";','');
  fs.writeFileSync(path.join(work,'style.css'),(await postcss([tailwind(config)]).process(css,{from:path.join(root,'app/globals.css')})).css);
}

async function run() {
 if(!process.argv.includes('--skip-build'))await build();
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/bundle.js'||pathname==='/style.css'){res.setHeader('Content-Type',pathname.endsWith('js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><head><title>Assignment fixture</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const {chromium}=require(path.join(root,'node_modules/playwright'));
 const results=[],errors=[],audits=[];let browser;
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const locale of ['en','fr']){
   const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
   const open=()=>page.getByRole('button',{name:locale==='en'?'Assign':'Assigner',exact:true});
   const owner=()=>page.getByLabel(locale==='en'?'Owner user ID':'ID utilisateur responsable');
   const submit=()=>page.getByRole('button',{name:locale==='en'?'Apply action':'Appliquer',exact:true});
   await page.goto(base+'/'+locale+'/dashboard/assurance/incidents/fixture-incident');
   await open().focus();await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor();
   for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');}
   await owner().fill('fixture-owner');
   await page.addScriptTag({path:require.resolve('axe-core')});
   const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)}});audits.push({locale,...audit});
   for(let i=0;i<8;i++){await page.keyboard.press('Tab');assert.ok(await page.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),'Focus trap');}
   await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});assert.ok(await open().evaluate(el=>el===document.activeElement),'Focus returns to Assign');
   await open().click();await owner().fill('fixture-owner');await submit().click();await page.getByRole('alert').waitFor();assert.ok(await owner().isDisabled());
   assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_INTERNAL_ERROR'));
   for(const width of [375,1440]){await page.setViewportSize({width,height:1000});await page.screenshot({path:path.join(output,'assignment-'+locale+'-'+width+'.png'),fullPage:true});}
   await page.evaluate(()=>window.fixtureMode='success');await submit().click();await page.getByRole('dialog').waitFor({state:'hidden'});
   const replay=await page.evaluate(()=>({calls:window.fixtureCalls,messages:window.fixtureMessages}));assert.equal(replay.calls.length,2);assert.deepEqual(replay.calls[0],replay.calls[1]);assert.match(replay.messages[0],locale==='en'?/business work remains/:/travail métier reste/);
   await page.reload();await page.evaluate(()=>window.fixtureMode='conflict');await open().click();await owner().fill('fixture-owner');await submit().click();await page.getByRole('alert').waitFor();assert.ok(await submit().isDisabled());
   await page.getByRole('button',{name:locale==='en'?'Refresh source':'Actualiser la source',exact:true}).click();await open().waitFor();await open().click();assert.ok(await owner().isEnabled());
   await page.evaluate(()=>window.fixtureMode='pending');await owner().fill('fixture-owner');await submit().click();await page.evaluate(()=>window.fixtureRevoke());await page.getByRole('dialog').waitFor({state:'hidden'});await page.evaluate(()=>window.fixtureFinish({success:true,status:200,data:{id:'fixture-incident'}}));assert.equal(await page.evaluate(()=>window.fixtureMessages.length),0);assert.ok(await open().isDisabled());
   results.push({locale,widths:[375,768,1440],keyboardTrapAndReturn:true,uncertainReplay:true,conflictRecovery:true,revokedFormCleared:true,lateResponseIgnored:true});await page.close();
  }
  assert.deepEqual(errors,[]);assert.equal(audits.reduce((n,a)=>n+a.violations.length,0),0,JSON.stringify(audits));
  console.log('Passed',results.length,'assignment journeys; automated accessibility scans:',audits.length);
 }finally{
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),environment:'Real component and Radix dialog, synthetic DTO/actions, headless Edge; no database',results,pageErrors:errors,accessibility:audits},null,2));
  await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));
 }
}
run().catch(e=>{console.error(e);process.exitCode=1});
