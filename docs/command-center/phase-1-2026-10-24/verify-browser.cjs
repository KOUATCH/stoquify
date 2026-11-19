const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, '.codex-tmp/manager-phase1');
const output = __dirname;
// Fixture-only runner. Reads UI sources/tokens; writes only this report and its owned temporary bundle.
// No Next configuration, environment loader, server actions, database, seed, migration, or real account.
fs.mkdirSync(work, {recursive:true});
fs.writeFileSync(path.join(work, 'loader.cjs'), `const ts=require(${JSON.stringify(path.join(root,'node_modules/typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(path.join(work, 'link.tsx'), 'export default function Link(props){return <a {...props}/>}; export const useLinkStatus=()=>({pending:false});');
fs.writeFileSync(path.join(work, 'intl.ts'), 'export const useTranslations=()=>key=>key;');
fs.writeFileSync(path.join(work, 'entry.tsx'), `
import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {ManagerActionCenterDashboard} from '@/components/manager-action-center/ManagerActionCenterDashboard';
import {ManagerLocationActionCenterDashboard} from '@/components/manager-action-center/ManagerLocationActionCenterDashboard';
import {buildData} from '@/components/manager-action-center/__tests__/manager-fixtures';
import {buildLocationData} from '@/components/manager-action-center/__tests__/manager-location-fixtures';
const p=new URL(location.href).searchParams;
const locale=location.pathname.startsWith('/fr')?'fr':'en';
const count=Number(p.get('count')??25);
const data=buildData();
data.actionItems=Array.from({length:count},(_,i)=>({...data.actionItems[0],id:'action-'+i,title:(locale==='fr'?'Vérifier les preuves de rapprochement pour le point de vente numéro ':'Review reconciliation evidence for location ')+i,assignedRole:i%2?'manager':'finance',origin:i%2?'ASSURANCE':'SIGNAL'}));
data.runSheetGroups[0].actions=data.actionItems;
data.runSheetGroups[0].count=count;
data.commandBrief.summary='Fixture: '+count+' loaded actions';
data.summary.total=count;
if(p.get('sourceState')==='failed')data.clientMissingProofSource={state:'UNAVAILABLE',queue:null,reason:'SOURCE_READ_FAILED'};
if(p.get('sourceState')==='denied')data.clientMissingProofSource={state:'HIDDEN',queue:null,reason:'RBAC_REQUIRED'};
if(p.get('sourceState')==='capped')data.clientMissingProofSource={state:'AVAILABLE',reason:null,queue:{requests:Array.from({length:100},()=>({})),controls:{maxItems:100},summary:{truncated:true},blockers:[],nextCursor:'fixture'}};
const branch=buildLocationData();
function App(){const[revoked,setRevoked]=useState(false);return <><button id="fixture-revoke" onClick={()=>setRevoked(true)}>Fixture: revoke loaded access</button>{p.get('variant')==='branch'?<ManagerLocationActionCenterDashboard data={revoked?{...branch,bundles:[branch.bundles[1]],scope:{kind:'LOCATIONS',locationIds:['location-coastal']}}:branch} locale={locale} title="Manager Action Center" subtitle="Location responsibility fixture"/>:<ManagerActionCenterDashboard data={revoked?{...data,actionItems:[],runSheetGroups:[],generatedAt:'2026-10-24T10:00:00Z'}:data} locale={locale} title={locale==='fr'?'Centre d’actions manager':'Manager Action Center'} subtitle="Authorized tenant fixture"/>}</>}
createRoot(document.getElementById('root')).render(<App/>);
`);
async function build() {
  const bundled = require(path.join(root, 'node_modules/next/dist/compiled/webpack/webpack')); bundled.init();
  await new Promise((resolve,reject)=>bundled.webpack({
    mode:'development', devtool:false, context:root, entry:path.join(work,'entry.tsx'),
    output:{path:work,filename:'bundle.js'},
    resolve:{extensions:['.tsx','.ts','.js'],alias:{'@':root,'next/link$':path.join(work,'link.tsx'),'next-intl$':path.join(work,'intl.ts')}},
    module:{rules:[{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(work,'loader.cjs')}]},
    optimization:{minimize:false}, performance:{hints:false},
  },(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
  const postcss = require(path.join(root, 'node_modules/postcss'));
  const tailwind = require(path.join(root, 'node_modules/tailwindcss'));
  const load = require(path.join(root,'node_modules/tailwindcss/loadConfig'));
  const config = load(path.join(root,'tailwind.config.ts'));
  config.content=[path.join(root,'components/manager-action-center/**/*.{ts,tsx}'),path.join(root,'components/bi/**/*.{ts,tsx}'),path.join(root,'components/ui/**/*.{ts,tsx}'),path.join(root,'components/finance/finance-dashboard-theme.ts'),path.join(root,'components/evidence/*.tsx')];
  const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";','');
  fs.writeFileSync(path.join(work,'style.css'),(await postcss([tailwind(config)]).process(css,{from:path.join(root,'app/globals.css')})).css);
}
async function run(){
  if(!process.argv.includes('--skip-build')) await build(); console.log('Fixture bundle ready');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/bundle.js'||pathname==='/style.css'){res.setHeader('Content-Type',pathname.endsWith('js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return;}
    res.setHeader('Content-Type','text/html');
    if(!pathname.endsWith('/manager-action-center')){res.end('<h1>Fixture source handoff</h1>');return;}
    res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const {chromium}=require(path.join(root,'node_modules/playwright'));
  let browser;
  const results=[]; const errors=[];
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const locale of ['en','fr']){
      const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/'+locale+'/dashboard/manager-action-center');
      await page.getByRole('region',{name:locale==='en'?'Brief':'Synthèse',exact:true}).waitFor();
      await page.getByRole('button',{name:locale==='en'?'View complete queue':'Voir toute la file'}).click();
      const next=page.getByRole('button',{name:locale==='en'?'Next page':'Page suivante'});
      const names=[];
      for(let i=0;i<3;i++){names.push(...await page.locator('#manager-queue-title ~ div details > summary').allTextContents());if(i<2)await next.click();}
      assert.equal(new Set(names).size,25);
      await page.reload(); await page.getByText('Page 3 / 3',{exact:true}).waitFor();
      await page.goBack(); await page.getByText('Page 2 / 3',{exact:true}).waitFor();
      console.log('Restored filters',locale,await page.getByRole('combobox').count()); await page.getByRole('combobox').first().selectOption('SIGNAL');
      await page.getByText('Page 1 / 2',{exact:true}).waitFor();
      const details=page.locator('#manager-queue-title ~ div details').first();
      await details.locator('summary').focus(); await page.keyboard.press('Enter');
      assert.equal(await details.getAttribute('open'),'');
      const link=details.getByRole('link').first();
      assert.match(await link.getAttribute('href'),new RegExp('^/'+locale+'/'));
      const popupPromise=page.context().waitForEvent('page', {timeout:10000}); await link.click({modifiers:['Control']}); const popup=await popupPromise; await popup.close();
      await link.click(); await page.getByRole('heading',{name:'Fixture source handoff'}).waitFor();
      await page.goBack(); await page.getByText('Page 1 / 2',{exact:true}).waitFor();
      await page.screenshot({path:path.join(output,'manager-command-'+locale+'.png'),fullPage:true});
      await page.setViewportSize({width:390,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'mobile overflow '+locale);
      await page.screenshot({path:path.join(output,'manager-mobile-'+locale+'.png'),fullPage:true});
      await page.locator('#fixture-revoke').click();
      await page.getByText(locale==='en'?'No permitted actions are available in this scope.':'Aucune action autorisée n’est disponible dans ce périmètre.').waitFor();
      assert.equal(await page.locator('#manager-queue-title ~ div details').count(),0);
      results.push(locale+': 25 unique actions, refresh/back, filters, keyboard details, modifier-click, locale handoff/return, narrow reflow, revoked payload');
      await page.close();
    }
    const page=await browser.newPage({viewport:{width:1440,height:1000}});
    page.on('pageerror',e=>errors.push(e.message));
    for(const count of [0,1,10]){await page.goto(base+'/en/dashboard/manager-action-center?mode=command&count='+count);await page.getByText(count+' authorized actions loaded · '+count+' matching filters · '+count+' shown').waitFor();}
    for(const sourceState of ['failed','denied','capped']){await page.goto(base+'/en/dashboard/manager-action-center?sourceState='+sourceState);await page.getByRole('complementary',{name:'Source coverage'}).waitFor();assert.match(await page.getByRole('complementary',{name:'Source coverage'}).innerText(),sourceState==='failed'?/could not be loaded/:sourceState==='denied'?/restricted/:/Partial coverage/);}
    await page.goto(base+'/en/dashboard/manager-action-center?variant=branch&mode=command&location=forbidden');
    await page.getByText('1 authorized actions loaded · 1 matching filters · 1 shown').waitFor();
    assert.ok(!page.url().includes('forbidden'));
    assert.match(await page.getByRole('link',{name:'Open daily close: Central Store'}).getAttribute('href'),/locationId=location-central/);
    await page.getByRole('tab',{name:/Coastal Outlet/}).click();
    await page.getByText('No permitted actions are available in this scope.').waitFor();
    await page.reload(); await page.getByRole('tab',{name:/Coastal Outlet/}).waitFor();
    assert.equal(await page.getByRole('tab',{name:/Coastal Outlet/}).getAttribute('aria-selected'),'true');
    await page.goBack(); await page.getByText('1 authorized actions loaded · 1 matching filters · 1 shown').waitFor();
    await page.locator('#fixture-revoke').click();
    await page.getByText('No permitted actions are available in this scope.').waitFor();
    assert.equal(await page.getByRole('tab',{name:/Central Store/}).count(),0);
    results.push('0/1/10 counts, failed/denied/capped sources, permitted branch selection/refresh/back/revocation, daily-close href');
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),environment:'Synthetic fixtures; Edge headless; mocked Next Link and translation hook; real UI components and Tailwind tokens; no application services or DB',viewports:['1440x1000','390x844'],results,pageErrors:errors},null,2));
    console.log(JSON.stringify(results,null,2));
  }catch(error){console.error('Browser assertion failed',error);for(const context of browser?.contexts()??[]){for(const page of context.pages()){console.log('Failure URL',page.url());console.log((await page.locator('body').innerText()).slice(0,3500));await page.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true});}}throw error;}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});
