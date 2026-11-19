const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, '.codex-tmp/manager-phase3');
const output = __dirname;
// Fixture-only runner. Reads UI sources/tokens; writes only this report and its owned temporary bundle.
// No Next configuration, environment loader, server actions, database, seed, migration, or real account.
fs.mkdirSync(work, {recursive:true});
fs.writeFileSync(path.join(work, 'loader.cjs'), `const ts=require(${JSON.stringify(path.join(root,'node_modules/typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(path.join(work, 'link.tsx'), 'export default function Link(props){return <a {...props}/>}; export const useLinkStatus=()=>({pending:false});');
fs.writeFileSync(path.join(work, 'intl.ts'), 'export const useTranslations=()=>key=>key;');
fs.writeFileSync(path.join(work,'actions.ts'), 'export const runCommandAgentAction=async()=>{window.fixtureCommandCalls++;return {success:false,error:"Fixture only"}}; export const submitCommandAgentFeedbackAction=runCommandAgentAction; export const createCopilotProposalAction=runCommandAgentAction;export const decideCopilotProposalAction=runCommandAgentAction;export const getProofTrailAction=runCommandAgentAction;');
fs.writeFileSync(path.join(work,'navigation.ts'),'export const useRouter=()=>({push:href=>location.assign(href),refresh:()=>{if(window.fixtureRefreshMode==="fail")throw Error("fixture failure")}});export const usePathname=()=>location.pathname;');
fs.writeFileSync(path.join(work,'css-loader.cjs'), 'module.exports=()=>' + JSON.stringify('export default {root:"digest-fixture"}'));
fs.writeFileSync(path.join(work,"entry.tsx"),"\nimport {createRoot} from 'react-dom/client';\nimport {DailyHabitDigestDashboard} from '@/components/daily-habit/DailyHabitDigestDashboard';\nimport {OwnerWarRoomDashboard} from '@/components/owner-war-room/OwnerWarRoomDashboard';\nimport {ManagerActionCenterDashboard} from '@/components/manager-action-center/ManagerActionCenterDashboard';\nimport {ManagerLocationActionCenterDashboard} from '@/components/manager-action-center/ManagerLocationActionCenterDashboard';\nimport {digestData} from '@/components/daily-habit/__tests__/phase2-fixtures';\nimport {buildOwnerData} from '@/docs/command-center/phase-2-2026-10-24/owner-browser-fixture';\nimport {buildData} from '@/components/manager-action-center/__tests__/manager-fixtures';\nimport {buildLocationData} from '@/components/manager-action-center/__tests__/manager-location-fixtures';\nconst locale=location.pathname.startsWith('/fr')?'fr':'en';\nconst kind=location.pathname.split('/').at(-1);\nwindow.fixtureCommandCalls=0;window.fixtureRefreshMode='hold';\nlet data=kind==='daily-digest'?digestData():kind==='owner-war-room'?buildOwnerData():kind==='locations'?buildLocationData():buildData();\nconst root=createRoot(document.getElementById('root'));\nfunction render(){root.render(kind==='daily-digest'?<DailyHabitDigestDashboard data={data} locale={locale}/>:kind==='owner-war-room'?<OwnerWarRoomDashboard data={data} locale={locale} title=\"Owner\" subtitle=\"Fixture\"/>:kind==='locations'?<ManagerLocationActionCenterDashboard data={data} locale={locale} title=\"Manager\" subtitle=\"Fixture\"/>:<ManagerActionCenterDashboard data={data} locale={locale} title=\"Manager\" subtitle=\"Fixture\"/>)}\nwindow.fixtureCommit=()=>{data=structuredClone(data);render()};\nrender();\n");
async function build() {
  const bundled = require(path.join(root, 'node_modules/next/dist/compiled/webpack/webpack')); bundled.init();
  await new Promise((resolve,reject)=>bundled.webpack({
    mode:'development', devtool:false, context:root, entry:path.join(work,'entry.tsx'),
    output:{path:work,filename:'bundle.js'},
    resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/actions/agents/command-agent.actions$':path.join(work,'actions.ts'),'@/actions/ai/copilot-proposal.actions$':path.join(work,'actions.ts'),'@/actions/evidence/proof-trail.actions$':path.join(work,'actions.ts'),'next/navigation$':path.join(work,'navigation.ts'),'@':root,'next/link$':path.join(work,'link.tsx'),'next-intl$':path.join(work,'intl.ts')}},
    module:{rules:[{test:/\.module\.css$/,use:path.join(work,'css-loader.cjs')},{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(work,'loader.cjs')}]},
    optimization:{minimize:false}, performance:{hints:false},
  },(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
  const postcss = require(path.join(root, 'node_modules/postcss'));
  const tailwind = require(path.join(root, 'node_modules/tailwindcss'));
  const load = require(path.join(root,'node_modules/tailwindcss/loadConfig'));
  const config = load(path.join(root,'tailwind.config.ts'));
  config.content=[path.join(root,'components/daily-habit/**/*.{ts,tsx}'),path.join(root,'components/owner-war-room/**/*.tsx'),path.join(root,'components/agents/**/*.tsx'),path.join(root,'components/manager-action-center/**/*.{ts,tsx}'),path.join(root,'components/bi/**/*.{ts,tsx}'),path.join(root,'components/ui/**/*.{ts,tsx}'),path.join(root,'components/finance/finance-dashboard-theme.ts'),path.join(root,'components/evidence/*.tsx'),path.join(root,'components/dashboard/CommandCenterRecovery.tsx')];
  const scopedCss=fs.readFileSync(path.join(root,'components/daily-habit/DailyHabitDigestDashboard.module.css'),'utf8').replace(/\.root\s+:global\(([^)]+)\)/g,'.digest-fixture $1');
  const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";','');
  fs.writeFileSync(path.join(work,'style.css'),(await postcss([tailwind(config)]).process(css+'\n'+scopedCss,{from:path.join(root,'app/globals.css')})).css);
}

async function run(){
 if(!process.argv.includes('--skip-build'))await build();console.log('Phase 3 fixture bundle ready');
 const surfaces=['daily-digest','owner-war-room','manager-action-center','locations'];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/bundle.js'||pathname==='/style.css'){res.setHeader('Content-Type',pathname.endsWith('js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return}
  res.setHeader('Content-Type','text/html');
  if(!surfaces.includes(pathname.split('/').at(-1))){res.end('<h1>Fixture source handoff</h1>');return}
  res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const {chromium}=require(path.join(root,'node_modules/playwright'));
 let browser;const results=[],errors=[];
 try{
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const locale of ['en','fr'])for(const surface of surfaces){
   console.log('Checking',locale,surface);
   const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
   page.on('pageerror',error=>errors.push(error.message));
   await page.goto(base+'/'+locale+'/dashboard/'+surface);
   await page.getByRole('heading',{level:1}).waitFor();
   const command=locale==='en'?'Command':'Pilotage';
   await page.getByRole('button',{name:command,exact:true}).click();
   const context=page.url();
   const refresh=page.getByRole('button',{name:locale==='en'?'Refresh view':'Actualiser la vue',exact:true});
   await refresh.click();
   await page.getByText(locale==='en'?'Refreshing and checking access…':'Actualisation et vérification des accès…',{exact:true}).waitFor();
   assert.equal(await page.getByRole('heading',{level:1}).count(),0);
   assert.ok(await refresh.isDisabled());
   await page.evaluate(()=>window.fixtureCommit());
   await page.getByText(locale==='en'?'View reloaded. Check each source’s freshness; no action was resolved.':'Vue rechargée. Consultez la fraîcheur de chaque source ; aucune action n’a été résolue.',{exact:true}).waitFor();
   assert.equal(page.url(),context);
   assert.equal(await page.getByRole('button',{name:command,exact:true}).getAttribute('aria-pressed'),'true');
   for(const width of [375,768,1440]){
    await page.setViewportSize({width,height:1000});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),surface+' overflow '+locale+' '+width);
    if(width!==768)await page.screenshot({path:path.join(output,surface+'-'+locale+'-'+width+'.png'),fullPage:true});
   }
   const details=page.locator('section[aria-labelledby="manager-queue-title"] details');
   if(await details.count()){await details.first().locator('summary').focus();await page.keyboard.press('Enter')}
   const links=await page.locator('main a[href]').all();let source;
   for(const link of links){const pathname=new URL(await link.getAttribute('href'),base).pathname;if(await link.isVisible()&&!surfaces.some(s=>pathname.endsWith('/'+s))){source=link;break}}
   assert.ok(source,'source link available '+surface);
   const destination=await source.getAttribute('href');
   assert.ok(destination.startsWith('/'+locale+'/dashboard'),destination);
   const newPage=page.context().waitForEvent('page',{timeout:10000});await source.click({modifiers:['Control']});const popup=await newPage;await popup.waitForURL('**/'+locale+'/dashboard/**',{timeout:10000});assert.ok(popup.url().includes('/'+locale+'/dashboard'));await popup.close();
   await source.click();await page.getByRole('heading',{name:'Fixture source handoff'}).waitFor();
   await page.goBack();await page.getByRole('heading',{level:1}).waitFor();assert.equal(page.url(),context);
   assert.equal(await page.getByRole('button',{name:command,exact:true}).getAttribute('aria-pressed'),'true');
   await page.evaluate(()=>{window.fixtureRefreshMode='fail'});await refresh.click();
   await page.getByText(locale==='en'?'Refresh was not confirmed. Previous data is hidden. Retry or reload the page.':'Actualisation non confirmée. Les anciennes données sont masquées. Réessayez ou rechargez la page.',{exact:true}).waitFor();
   assert.equal(await page.getByRole('heading',{level:1}).count(),0);
   await page.evaluate(()=>{window.fixtureRefreshMode='hold'});await refresh.click();await page.evaluate(()=>window.fixtureCommit());await page.getByRole('heading',{level:1}).waitFor();
   assert.equal(await page.evaluate(()=>window.fixtureCommandCalls),0);
   results.push(locale+' '+surface+': pending/confirmed/failure/retry, private content cleared, mode retained, source handoff/Back and native new tab, 375/768/1440x1000 reflow, zero action calls');
   await page.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),environment:'Synthetic authorized DTOs; headless Edge; mocked router refresh commits and actions; no application server or database',results,pageErrors:errors},null,2));console.log(JSON.stringify(results,null,2));
 }catch(error){console.error(error);for(const context of browser?.contexts()??[])for(const page of context.pages()){console.log('Failure URL',page.url());console.log((await page.locator('body').innerText()).slice(0,3500));await page.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true})}throw error}
 finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
}
run().catch(error=>{console.error(error);process.exitCode=1});
