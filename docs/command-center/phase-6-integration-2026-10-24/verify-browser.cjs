const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../..');
const work = path.join(root, '.codex-tmp/command-center-phase6');
const output = __dirname;
// Fixture-only runner. Reads UI sources/tokens; writes only this report and its owned temporary bundle.
// No Next configuration, environment loader, server actions, database, seed, migration, or real account.
fs.mkdirSync(work, {recursive:true});
fs.writeFileSync(path.join(work, 'loader.cjs'), `const ts=require(${JSON.stringify(path.join(root,'node_modules/typescript'))});module.exports=function(source){return ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText}`);
fs.writeFileSync(path.join(work, 'link.tsx'), 'export default function Link(props){return <a {...props}/>}; export const useLinkStatus=()=>({pending:false});');
fs.writeFileSync(path.join(work, 'intl.ts'), 'export const useTranslations=()=>key=>key;');
fs.writeFileSync(path.join(work,'actions.ts'), 'export const runCommandAgentAction=async()=>{window.fixtureCommandCalls++;return {success:false,error:"Fixture only"}}; export const submitCommandAgentFeedbackAction=runCommandAgentAction; export const createCopilotProposalAction=runCommandAgentAction;export const decideCopilotProposalAction=runCommandAgentAction;export const getProofTrailAction=async()=>{window.fixtureProofCalls++;if(window.fixtureProofMode==="pending")return new Promise(resolve=>window.fixtureProofResolve=resolve);if(window.fixtureProofMode==="error")return {success:false,error:"PRIVATE_INTERNAL_ERROR"};return {success:true,data:window.fixtureProof}};');
fs.writeFileSync(path.join(work,'navigation.ts'),'export const useRouter=()=>({push:href=>location.assign(href),refresh:()=>{if(window.fixtureRefreshMode==="fail")throw Error("fixture failure")}});export const usePathname=()=>location.pathname;');
fs.writeFileSync(path.join(work,'css-loader.cjs'), 'module.exports=()=>' + JSON.stringify('export default {root:"digest-fixture"}'));
fs.writeFileSync(path.join(work,'entry.tsx'),fs.readFileSync(path.join(output,'browser-entry.tsx'),'utf8'));
async function build() {
  const bundled = require(path.join(root, 'node_modules/next/dist/compiled/webpack/webpack')); bundled.init();
  await new Promise((resolve,reject)=>bundled.webpack({
    mode:'development', devtool:false, context:root, entry:path.join(work,'entry.tsx'),
    output:{path:work,filename:'bundle.js'},
    resolve:{extensions:['.tsx','.ts','.js'],alias:{'@/actions/command-center/follow-up.actions$':path.join(output,'browser-actions.ts'),'@/actions/agents/command-agent.actions$':path.join(work,'actions.ts'),'@/actions/ai/copilot-proposal.actions$':path.join(work,'actions.ts'),'@/actions/evidence/proof-trail.actions$':path.join(work,'actions.ts'),'next/navigation$':path.join(work,'navigation.ts'),'@':root,'next/link$':path.join(work,'link.tsx'),'next-intl$':path.join(work,'intl.ts')}},
    module:{rules:[{test:/\.module\.css$/,use:path.join(work,'css-loader.cjs')},{test:/\.tsx?$/,exclude:/node_modules/,use:path.join(work,'loader.cjs')}]},
    optimization:{minimize:false}, performance:{hints:false},
  },(error,stats)=>error||stats.hasErrors()?reject(error||new Error(stats.toString({all:false,errors:true}))):resolve()));
  const postcss = require(path.join(root, 'node_modules/postcss'));
  const tailwind = require(path.join(root, 'node_modules/tailwindcss'));
  const load = require(path.join(root,'node_modules/tailwindcss/loadConfig'));
  const config = load(path.join(root,'tailwind.config.ts'));
  config.content=[path.join(root,'components/command-center/**/*.tsx'),path.join(root,'components/daily-habit/**/*.{ts,tsx}'),path.join(root,'components/owner-war-room/**/*.tsx'),path.join(root,'components/agents/**/*.tsx'),path.join(root,'components/manager-action-center/**/*.{ts,tsx}'),path.join(root,'components/bi/**/*.{ts,tsx}'),path.join(root,'components/ui/**/*.{ts,tsx}'),path.join(root,'components/finance/finance-dashboard-theme.ts'),path.join(root,'components/evidence/*.tsx'),path.join(root,'components/dashboard/CommandCenterRecovery.tsx')];
  const scopedCss=fs.readFileSync(path.join(root,'components/daily-habit/DailyHabitDigestDashboard.module.css'),'utf8').replace(/\.root\s+:global\(([^)]+)\)/g,'.digest-fixture $1');
  const css=fs.readFileSync(path.join(root,'app/globals.css'),'utf8').replace('@import "./public-contours.css";','');
  fs.writeFileSync(path.join(work,'style.css'),(await postcss([tailwind(config)]).process(css+'\n'+scopedCss,{from:path.join(root,'app/globals.css')})).css);
}

async function run() {
 if(!process.argv.includes('--skip-build')) await build();
 const surfaces=['daily-digest','owner-war-room','manager-action-center','locations'];
 const server=http.createServer((req,res)=>{
  const pathname=new URL(req.url,'http://localhost').pathname;
  if(pathname==='/bundle.js'||pathname==='/style.css') {res.setHeader('Content-Type',pathname.endsWith('js')?'application/javascript':'text/css');res.end(fs.readFileSync(path.join(work,pathname.slice(1))));return;}
  res.setHeader('Content-Type','text/html');
  if(!surfaces.includes(pathname.split('/').at(-1))) {res.end('<title>Source fixture</title><h1>Fixture source handoff</h1>');return;}
  res.end('<!doctype html><html lang="'+(pathname.startsWith('/fr')?'fr':'en')+'"><head><title>Command Center release fixture</title><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 const {chromium}=require(path.join(root,'node_modules/playwright'));
 let browser;const results=[],errors=[],audits=[];
 async function focusVisible(page, locator) {
  await locator.focus(); await page.keyboard.press('Tab'); await page.keyboard.press('Shift+Tab');
  const evidence=await locator.evaluate(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {active:document.activeElement===el,visible:r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth,outline:s.outlineStyle,outlineWidth:s.outlineWidth,shadow:s.boxShadow,obscured:!el.contains(document.elementFromPoint(Math.max(1,Math.min(innerWidth-1,r.x+r.width/2)),Math.max(1,Math.min(innerHeight-1,r.y+r.height/2))))}});
  assert.ok(evidence.active&&evidence.visible&&!evidence.obscured,JSON.stringify(evidence));
  assert.ok(evidence.shadow!=='none'||(evidence.outline!=='none'&&parseFloat(evidence.outlineWidth)>0),'Visible focus indicator '+JSON.stringify(evidence));
  return evidence;
 }
 try {
  browser=await chromium.launch({channel:'msedge',headless:true});
  for(const locale of ['en','fr'])for(const surface of surfaces) {
   console.log('Checking',locale,surface);
   const page=await browser.newPage({locale:locale==='fr'?'fr-FR':'en-GB',viewport:{width:1440,height:1000},reducedMotion:'reduce'});
   page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);
   page.on('pageerror',e=>errors.push(e.message));
   await page.goto(base+'/'+locale+'/dashboard/'+surface+'?mode=brief');
   await page.getByRole('heading',{level:1}).waitFor();
   await page.addScriptTag({path:require.resolve('axe-core')});
   assert.ok(await page.evaluate(()=>matchMedia("(prefers-reduced-motion: reduce)").matches));
   const labels=locale==='en'?['Brief','Command','Investigate']:['Synthèse','Pilotage','Examiner'];
   for(const mode of labels) {
    const button=page.getByRole('button',{name:mode,exact:true});
    await button.focus();await page.keyboard.press('Enter');
    assert.equal(await button.getAttribute('aria-pressed'),'true');
    assert.equal(await page.getByRole('heading',{level:1}).count(),1);
    for(const width of [375,768,1440]) {
     await page.setViewportSize({width,height:1000});
     assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${locale} ${surface} ${mode} overflow at ${width}`);
    }
    await focusVisible(page,button);
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)}});
    audits.push({locale,surface,mode,...audit});
    if(audit.violations.length)console.log('Accessibility findings',locale,surface,mode,JSON.stringify(audit.violations));
   }
   await page.getByRole('button',{name:labels[1],exact:true}).click();
   if(surface==='owner-war-room') assert.equal(await page.getByRole('link',{name:new RegExp(locale==='en'?'^Open: Evidence to review':'^Ouvrir : Preuve à examiner')}).count(),25);
   if(surface==='manager-action-center'||surface==='locations') {
    const seen=[]; const next=page.getByRole('button',{name:locale==='en'?'Next page':'Page suivante',exact:true});
    for(let n=0;n<3;n++) {seen.push(...await page.locator('section[aria-labelledby="manager-queue-title"] summary').allTextContents());if(n<2)await next.click();}
    assert.equal(seen.length,25);assert.equal(new Set(seen).size,25);
    assert.ok(await next.isDisabled());
    await page.getByRole('button',{name:locale==='en'?'Clear filters':'Effacer les filtres',exact:true}).click();
    const summary=page.locator('section[aria-labelledby="manager-queue-title"] summary').first();await summary.focus();await page.keyboard.press('Enter');
    assert.equal(await summary.locator('..').getAttribute('open'),'');
    for(const select of await page.locator('main select').all())assert.ok(await select.evaluate(el=>el.labels?.length||el.getAttribute('aria-label')),'Filter label');
   }
   // CSS zoom is a controlled reflow check, not a claim of native browser zoom certification.
   await page.evaluate(()=>document.documentElement.style.zoom='2');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${surface} 200% CSS zoom overflow`);
   await page.evaluate(()=>document.documentElement.style.zoom='');
   for(const width of [375,1440]) {await page.setViewportSize({width,height:1000});await page.screenshot({path:path.join(output,surface+'-'+locale+'-'+width+'.png'),fullPage:surface!=='owner-war-room'});}
   if(surface==='owner-war-room') {
    await page.getByRole('button',{name:labels[2],exact:true}).click();
    // Use the Investigate card, not the header trigger, to verify actual trigger restoration.
    const trigger=page.getByRole('button',{name:new RegExp(locale==='en'?'Reconciliation proof.*Inspect':'Preuves du rapprochement.*Examinez')});
    await trigger.focus();await page.keyboard.press('Enter');
    const dialog=page.getByRole('dialog');await dialog.waitFor();
    const close=page.getByRole('button',{name:locale==='en'?'Close proof':'Fermer la preuve',exact:true});
    await focusVisible(page,close);
    for(let n=0;n<4;n++){await page.keyboard.press('Tab');assert.ok(await dialog.evaluate(el=>el.contains(document.activeElement)),'Modal focus trap');}
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(el=>document.activeElement===el),'Proof focus return');
    await page.evaluate(()=>{window.fixtureProofMode='error'});await trigger.click();await dialog.waitFor();await page.getByRole('alert').filter({hasText:locale==='en'?'could not':'n’ont pas pu être chargées'}).waitFor();
    assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_INTERNAL_ERROR'));
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    await page.evaluate(()=>{window.fixtureProofMode='pending'});await trigger.click();await dialog.waitFor();
    assert.ok(await page.locator('[role="status"]').count()>0,'Loading status exposed');
    assert.ok(await page.locator('[role="status"] svg').evaluateAll(nodes=>nodes.every(el=>getComputedStyle(el).animationName==='none')),'Reduced-motion loading spinner');
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});assert.ok(await trigger.evaluate(el=>document.activeElement===el),'Pending proof focus return');
    await page.evaluate(()=>window.fixtureProofResolve({success:true,data:window.fixtureProof}));
    assert.equal(await page.getByRole('dialog').count(),0,'Closed proof cannot reopen');
    await page.getByRole('button',{name:labels[1],exact:true}).click();
   }
   const panel=page.getByRole('region',{name:locale==='en'?'Work & follow-up':'Travail et suivi'}).first();
   await panel.getByRole('button',{name:locale==='en'?'Refresh follow-ups':'Actualiser les suivis',exact:true}).click();
   await panel.getByRole('heading',{level:3}).first().waitFor();
   if(surface==='daily-digest') {const filter=panel.getByRole('checkbox',{name:locale==='en'?'Assigned to me':'Attribués à moi'});await filter.uncheck();}
   const save=panel.getByRole('button',{name:locale==='en'?'Save follow-up':'Enregistrer le suivi',exact:true}).first();
   await focusVisible(page,save);
   for(const width of [375,768,1440]){await page.setViewportSize({width,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Follow-up panel overflow');}
   if(surface!=='locations') {
    const scope=panel.getByLabel(locale==='en'?'Follow-up scope':'Périmètre des suivis');
    await scope.selectOption('fixture-location');
    await panel.getByRole('heading',{level:3}).first().waitFor();
    assert.equal(new URL(page.url()).searchParams.get('followUpLocation'),'fixture-location');
   }
   await page.evaluate(()=>window.followUpMode='lost');await save.click();
   await panel.getByText(locale==='en'?/result is uncertain/:/résultat est incertain/).waitFor();assert.ok(await save.isDisabled());
   await panel.getByRole('button',{name:locale==='en'?'Retry the same request':'Réessayer la même demande',exact:true}).click();
   await panel.getByText(locale==='en'?/Follow-up saved/:/Suivi enregistré/).waitFor();
   assert.ok(await page.evaluate(()=>JSON.stringify(window.followUpRequests.at(-1))===JSON.stringify(window.followUpRequests.at(-2))),'Identical uncertain retry');
   await panel.getByText(locale==='en'?'Follow-up notification preferences':'Préférences des notifications de suivi',{exact:true}).click();
   await panel.getByRole('checkbox',{name:locale==='en'?'In-app notifications':'Notifications dans l’application',exact:true}).uncheck();
   await panel.getByRole('button',{name:locale==='en'?'Save preferences':'Enregistrer les préférences',exact:true}).click();
   await panel.getByText(locale==='en'?/Follow-up saved/:/Suivi enregistré/).waitFor();
   for(const width of [375,1440]){await page.setViewportSize({width,height:1000});await panel.screenshot({path:path.join(output,'follow-up-'+surface+'-'+locale+'-'+width+'.png')});}
   const followAudit=await panel.evaluate(async el=>{const r=await axe.run(el,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)}});
   audits.push({locale,surface,mode:'follow-up',...followAudit});
   await page.evaluate(()=>window.followUpMode='denied');await panel.getByRole('button',{name:locale==='en'?'Refresh follow-ups':'Actualiser les suivis',exact:true}).click();
   await panel.getByText(locale==='en'?/Follow-ups are unavailable/:/suivis sont indisponibles/).waitFor();assert.equal(await panel.getByRole('heading',{level:3}).count(),0);
   await page.evaluate(()=>window.followUpMode='success');await panel.getByRole('button',{name:surface==='locations'?(locale==='en'?'Refresh follow-ups':'Actualiser les suivis'):(locale==='en'?'Reset follow-up scope':'Réinitialiser le périmètre des suivis'),exact:true}).click();
   await panel.getByRole('heading',{level:3}).first().waitFor();
   const context=page.url();
   const links=await page.locator('main a[href]').all();let source;
   for(const link of links){const pathname=new URL(await link.getAttribute('href'),base).pathname;if(await link.isVisible()&&!surfaces.some(s=>pathname.endsWith('/'+s))){source=link;break;}}
   assert.ok(source,'Source link');assert.ok((await source.getAttribute('href')).startsWith('/'+locale+'/dashboard'));
   const popupPromise=page.context().waitForEvent('page',{timeout:10000});await source.click({modifiers:['Control']});const popup=await popupPromise;await popup.close();
   await source.click();await page.getByRole('heading',{name:'Fixture source handoff'}).waitFor();await page.goBack();await page.getByRole('heading',{level:1}).waitFor();assert.equal(page.url(),context);
   const refresh=page.getByRole('button',{name:locale==='en'?'Refresh view':'Actualiser la vue',exact:true});
   await refresh.click();assert.equal(await page.getByRole('heading',{level:1}).count(),0);assert.ok(await refresh.isDisabled());
   await page.evaluate(()=>window.fixtureCommit());await page.getByRole('heading',{level:1}).waitFor();
   await page.evaluate(()=>{window.fixtureRefreshMode='fail'});await refresh.click();assert.equal(await page.getByRole('heading',{level:1}).count(),0);
   await page.evaluate(()=>{window.fixtureRefreshMode='hold'});await refresh.click();await page.evaluate(()=>window.fixtureCommit());await page.getByRole('heading',{level:1}).waitFor();
   await page.evaluate(()=>window.fixtureRevoke());assert.equal(await page.locator('main a[href*="record=fixture"]').count(),0,'Withdrawn work cleared');
   assert.equal(await page.evaluate(()=>window.fixtureCommandCalls),0);
   results.push({locale,surface,modes:labels,widths:[375,768,1440],height:1000,cssZoom:2,keyboardFocus:true,sourceBack:true,refreshRecovery:true,withdrawnDataCleared:true,businessActionCalls:0,followUpUncertainRetry:true,followUpPreferences:true,followUpDeniedClears:true});
   await page.close();
  }
  fs.writeFileSync(path.join(output,'accessibility-results.json'),JSON.stringify(audits,null,2));
  fs.writeFileSync(path.join(output,'browser-results.json'),JSON.stringify({date:new Date().toISOString(),environment:'Synthetic DTOs, real components/Tailwind, headless Edge, mocked Next routing/source actions; no database',results,pageErrors:errors},null,2));
  assert.deepEqual(errors,[]);assert.equal(audits.reduce((n,a)=>n+a.violations.length,0),0,'Accessibility findings remain');
  console.log('Passed',results.length,'journeys and',audits.length,'automated accessibility scans');
 } catch(error) {
  fs.writeFileSync(path.join(output,'accessibility-results.json'),JSON.stringify(audits,null,2));
  console.error(error);
  for(const context of browser?.contexts()??[])for(const page of context.pages()){console.error('Failure URL',page.url());console.error((await page.locator('body').innerText()).slice(0,2400));await page.screenshot({path:path.join(output,'browser-failure.png'),fullPage:true});}
  throw error;
 } finally {await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
}
run().catch(error=>{console.error(error);process.exitCode=1});

