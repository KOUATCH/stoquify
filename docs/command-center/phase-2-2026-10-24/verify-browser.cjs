const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, '.codex-tmp/manager-phase2');
const output = __dirname;
// Fixture-only runner. Reads UI sources/tokens; writes only this report and its owned temporary bundle.
// No Next configuration, environment loader, server actions, database, seed, migration, or real account.
fs.mkdirSync(work, {recursive:true});
fs.writeFileSync(path.join(work, 'loader.cjs'), `const ts=require(${JSON.stringify(path.join(root,'node_modules/typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(path.join(work, 'link.tsx'), 'export default function Link(props){return <a {...props}/>}; export const useLinkStatus=()=>({pending:false});');
fs.writeFileSync(path.join(work, 'intl.ts'), 'export const useTranslations=()=>key=>key;');
fs.writeFileSync(path.join(work,'actions.ts'), 'export const runCommandAgentAction=async()=>{window.fixtureCommandCalls++;return {success:false,error:"Fixture only"}}; export const submitCommandAgentFeedbackAction=runCommandAgentAction; export const createCopilotProposalAction=runCommandAgentAction;export const decideCopilotProposalAction=runCommandAgentAction;export const getProofTrailAction=runCommandAgentAction;');
fs.writeFileSync(path.join(work,'navigation.ts'),'export const useRouter=()=>({push:href=>location.assign(href)});export const usePathname=()=>location.pathname;');
fs.writeFileSync(path.join(work,'css-loader.cjs'), 'module.exports=()=>' + JSON.stringify('export default {root:"digest-fixture"}'));
fs.writeFileSync(path.join(work,"entry.tsx"),"\nimport {createRoot} from 'react-dom/client';\nimport {DailyHabitDigestDashboard} from '@/components/daily-habit/DailyHabitDigestDashboard';\nimport {OwnerWarRoomDashboard} from '@/components/owner-war-room/OwnerWarRoomDashboard';\nimport {digestData, observation} from '@/components/daily-habit/__tests__/phase2-fixtures';\nimport {buildOwnerData} from '@/docs/command-center/phase-2-2026-10-24/owner-browser-fixture';\nwindow.fixtureCommandCalls=0;\nconst locale=location.pathname.startsWith('/fr')?'fr':'en';\nconst data=digestData();\nfor(const digest of data.digests){\n digest.commandBrief.conclusion=locale==='fr'?'Examinez la preuve de stock manquante avant la cl\u00f4ture.':'Review missing stock evidence before close.';\n digest.changes=[observation('one'),observation('two'),observation('three','branch-b')];\n const extra={...digest.blockers[0],id:'different-record'};\n digest.blockers=[...digest.blockers,...digest.blockers,extra];\n digest.actions=digest.actions.map(a=>({...a,href:'/'+locale+'/dashboard/inventory'}));\n if(locale==='fr'){\n  digest.changes=digest.changes.map(c=>({...c,title:'Examen des preuves de stock',detail:'Preuves actuelles du stock',businessImpact:'Les preuves doivent \u00eatre examin\u00e9es'}));\n }\n}\nconst owner=buildOwnerData();\nowner.morningBrief.commandBrief.title=locale==='fr'?'Point du jour du dirigeant':'Owner morning brief';\ncreateRoot(document.getElementById('root')).render(location.pathname.endsWith('owner-war-room')?<OwnerWarRoomDashboard data={owner} locale={locale} title=\"Owner War Room\" subtitle=\"Fixture evidence\"/>:<DailyHabitDigestDashboard data={data} locale={locale}/>);\n");
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
  config.content=[path.join(root,'components/daily-habit/**/*.{ts,tsx}'),path.join(root,'components/owner-war-room/**/*.tsx'),path.join(root,'components/agents/**/*.tsx'),path.join(root,'components/manager-action-center/**/*.{ts,tsx}'),path.join(root,'components/bi/**/*.{ts,tsx}'),path.join(root,'components/ui/**/*.{ts,tsx}'),path.join(root,'components/finance/finance-dashboard-theme.ts'),path.join(root,'components/evidence/*.tsx')];
  const scopedCss=fs.readFileSync(path.join(root,'components/daily-habit/DailyHabitDigestDashboard.module.css'),'utf8').replace(/\.root\s+:global\(([^)]+)\)/g,'.digest-fixture $1');
  const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";','');
  fs.writeFileSync(path.join(work,'style.css'),(await postcss([tailwind(config)]).process(css+'\n'+scopedCss,{from:path.join(root,'app/globals.css')})).css);
}
async function run(){
  if(!process.argv.includes('--skip-build')) await build();console.log('Phase 2 fixture bundle ready');
  const server=http.createServer((req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/bundle.js'||pathname==='/style.css'){res.setHeader('Content-Type',pathname.endsWith('js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return;}
    res.setHeader('Content-Type','text/html');
    if(!pathname.endsWith('/daily-digest')&&!pathname.endsWith('/owner-war-room')){res.end('<h1>Fixture source handoff</h1>');return;}
    res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  const {chromium}=require(path.join(root,'node_modules/playwright'));
  let browser;const results=[];const errors=[];
  try{
    browser=await chromium.launch({channel:'msedge',headless:true});
    for(const locale of ['en','fr']){
      const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base+'/'+locale+'/dashboard/daily-digest');
      const limits=page.getByRole('region',{name:locale==='fr'?'Limites des sources':'Source limitations',exact:true});
      await limits.waitFor();assert.equal(await page.getByRole('heading',{level:1}).count(),1);
      assert.equal(await limits.locator('details').count(),3);
      assert.equal(await page.getByTestId('command-agent-unavailable').count(),1);
      assert.equal(await page.getByTestId('command-agent-panel').count(),0);
      await limits.locator('summary').first().focus();await page.keyboard.press('Enter');
      assert.equal(await limits.locator('details').first().getAttribute('open'),'');
      assert.equal(await limits.locator('details').first().getByRole('link').count(),2);
      assert.equal(await page.getByText(locale==='en'?'Historical comparison unavailable':'Comparaison historique indisponible',{exact:true}).count(),3);
      assert.ok(!(await page.locator('body').innerText()).includes('40 -> 50'));
      for(const width of [375,768,1440]){
        await page.setViewportSize({width,height:1000});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Digest overflow '+locale+' '+width);
        if(width!==768)await page.screenshot({path:path.join(output,'digest-'+locale+'-'+width+'.png'),fullPage:true});
      }
      await page.getByRole('button',{name:locale==='en'?'Command':'Pilotage',exact:true}).click();
      await page.getByRole('region',{name:locale==='en'?'Actions and risks':'Actions et risques'}).waitFor();
      const action=page.getByRole('link',{name:locale==='en'?'Open: Review source':'Ouvrir: Review source',exact:true});
      await action.click();await page.getByRole('heading',{name:'Fixture source handoff'}).waitFor();
      await page.goBack();await page.getByRole('region',{name:locale==='en'?'Actions and risks':'Actions et risques'}).waitFor();
      assert.equal(await page.evaluate(()=>window.fixtureCommandCalls),0);
      results.push(locale+': Digest single heading, 3 distinct blocker groups, 2 preserved source links, keyboard disclosure, compact agent, current observations, mode/source return, 375/768/1440 reflow');
      await page.goto(base+'/'+locale+'/dashboard/owner-war-room');
      await page.getByRole('heading',{name:locale==='en'?'Current observations':'Observations actuelles',exact:true}).waitFor();
      assert.equal(await page.getByRole('heading',{level:1}).count(),1);
      assert.ok(!(await page.locator('body').innerText()).includes('->'));
      assert.equal(await page.getByText(locale==='en'?'Historical comparison unavailable':'Comparaison historique indisponible',{exact:true}).count(),1);
      for(const width of [375,768,1440]){
        await page.setViewportSize({width,height:1000});
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Owner overflow '+locale+' '+width);
        if(width!==768)await page.screenshot({path:path.join(output,'owner-'+locale+'-'+width+'.png'),fullPage:true});
      }
      await page.getByRole('button',{name:locale==='en'?'Command':'Pilotage',exact:true}).click();
      await page.getByRole('heading',{name:locale==='en'?'Owner action queue':'Actions du propriétaire'}).waitFor();
      assert.equal(await page.evaluate(()=>window.fixtureCommandCalls),0);
      results.push(locale+': Owner current observations, unavailable comparison, existing modes, 375/768/1440 reflow');
      await page.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),environment:'Synthetic DTOs; headless Edge; real UI and theme; mocked Next routing/actions; no application services or database',results,pageErrors:errors},null,2));
    console.log(JSON.stringify(results,null,2));
  }catch(error){console.error(error);for(const c of browser?.contexts()??[])for(const p of c.pages()){console.log('Failure URL',p.url());console.log((await p.locator('body').innerText()).slice(0,3000));await p.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true});}throw error;}
  finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});
