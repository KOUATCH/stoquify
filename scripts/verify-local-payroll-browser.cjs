// Actual settlement form; synthetic actions, all browser traffic loopback only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),engines=require('playwright');
require('ts-node').register({transpileOnly:true,compilerOptions:{module:'CommonJS',moduleResolution:'node'}});
const {payrollSettlementCopy}=require('../components/payroll/payroll-settlement-copy.ts');
const root=path.resolve(__dirname,'..'),evidence=process.argv[2];
if(!evidence||!fs.statSync(evidence).isDirectory())throw new Error('Existing new evidence directory required');
const reusedFixture=process.env.STOQUIFY_TEST_FIXTURE;const fixture=reusedFixture?path.resolve(reusedFixture):path.join(root,'.codex-tmp','payroll-browser-'+Date.now());
if(reusedFixture&&(path.dirname(fixture)!==path.join(root,'.codex-tmp')||!/^payroll-browser-\d+$/.test(path.basename(fixture))||!fs.existsSync(path.join(fixture,'.next/BUILD_ID'))))throw new Error('Owned compiled payroll fixture required');
if(!reusedFixture){fs.mkdirSync(fixture,{recursive:false});
const write=(file,value)=>{fs.mkdirSync(path.dirname(path.join(fixture,file)),{recursive:true});fs.writeFileSync(path.join(fixture,file),value,{flag:'wx'})};
const aliases=Object.fromEntries(['actions/payroll/payroll-payment-reconciliation.actions','actions/security/step-up-auth.actions'].map(n=>['@/'+n+'$',path.join(root,'tests/local-gates/payroll-adapters.ts')]));
write('package.json',JSON.stringify({name:'payroll-rehearsal',private:true}));
write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2017',lib:['dom','esnext'],allowJs:true,skipLibCheck:true,strict:true,noEmit:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',isolatedModules:true,jsx:'preserve',baseUrl:root,paths:{'@/*':['./*'],...Object.fromEntries(Object.entries(aliases).map(([k,v])=>[k.slice(0,-1),[v]]))}},include:['**/*.tsx','.next/types/**/*.ts']}));
write('next.config.mjs',`export default {experimental:{externalDir:true,cpus:1},outputFileTracingRoot:${JSON.stringify(root)},eslint:{ignoreDuringBuilds:true},typescript:{ignoreBuildErrors:true},webpack(c){Object.assign(c.resolve.alias,${JSON.stringify(aliases)});return c}}`);
write('postcss.config.mjs',`export default {plugins:{tailwindcss:{config:${JSON.stringify(path.join(fixture,'tailwind.config.ts'))}}}}`);
write('tailwind.config.ts',`import c from ${JSON.stringify(path.join(root,'tailwind.config').replaceAll('\\','/'))};export default {...c,content:[${JSON.stringify(path.join(root,'components/payroll/*.tsx').replaceAll('\\','/'))},${JSON.stringify(path.join(root,'tests/local-gates/*.tsx').replaceAll('\\','/'))}]}`);
write('app/layout.tsx',`import '@/app/globals.css';export default function Layout({children}){return <html><body>{children}</body></html>}`);
write('app/[locale]/page.tsx',`import Fixture from '@/tests/local-gates/payroll-fixture';export default async function Page({params}){return <Fixture locale={(await params).locale}/>} `);
}
const env=Object.fromEntries(Object.entries(process.env).filter(([key])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(key)));Object.assign(env,{NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'});
function launch(args,label){const fd=fs.openSync(path.join(evidence,label+'.log'),'wx');const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),...args],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true});fs.closeSync(fd);return child}
async function keyboardClick(page,button){await button.waitFor({state:'visible'});await page.waitForFunction(el=>!el.disabled,await button.elementHandle());const key=process.env.STOQUIFY_TEST_TAB_KEY||'Tab';if(!['Tab','Alt+Tab'].includes(key))throw new Error('Unsupported diagnostic key');const trail=[];for(let n=0;n<80;n++){if(await button.evaluate(el=>el===document.activeElement)){await page.keyboard.press('Enter');return}trail.push(await page.evaluate(()=>({tag:document.activeElement.tagName,text:document.activeElement.textContent?.slice(0,100)})));await page.keyboard.press(key)}fs.writeFileSync(path.join(evidence,'keyboard-failure.json'),JSON.stringify({key,target:await button.textContent(),trail},null,2));await page.screenshot({path:path.join(evidence,'keyboard-failure.png'),fullPage:true});throw new Error('Button unreachable by '+key+': '+await button.textContent())}
async function main(){
  if(!reusedFixture){const build=launch(['build'],'build');assert.equal(await new Promise((resolve,reject)=>{build.on('exit',resolve);build.on('error',reject)}),0);}
  const socket=http.createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  const origin='http://127.0.0.1:'+port,server=launch(['start','--hostname','127.0.0.1','--port',String(port)],'server'),results=[];
  try {
    for(let n=0;n<120;n++){try{if((await fetch(origin+'/en',{signal:AbortSignal.timeout(2000)})).ok)break}catch{}await new Promise(r=>setTimeout(r,250))}
    for(const engine of (process.env.STOQUIFY_TEST_BROWSERS||'chromium,firefox,webkit').split(',')) {
      const browser=await engines[engine].launch({headless:true});
      try {for(const locale of (process.env.STOQUIFY_TEST_LOCALES||'en,fr').split(','))for(const scenario of (process.env.STOQUIFY_TEST_SCENARIOS||'lost,denied,fresh,stale').split(',')){
        const context=await browser.newContext({viewport:{width:390,height:900}});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());
        const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));const c=payrollSettlementCopy(locale),id=engine+'-'+locale+'-'+scenario;
        try {
          await page.goto(origin+'/'+locale+'?scenario='+scenario);const submit=page.getByRole('button',{name:c.submit,exact:true});
          const proof=page.getByLabel(locale==='fr'?'Rapprochement approuvé':'Approved reconciliation');await proof.selectOption('match');
          if(scenario==='stale'){
            await keyboardClick(page,page.getByRole('button',{name:'Fixture: change balance'}));await page.getByText(c.stale,{exact:true}).waitFor();assert.equal(await submit.isDisabled(),true);
            await keyboardClick(page,page.getByRole('button',{name:c.adopt,exact:true}));assert.equal(await submit.isDisabled(),true);await proof.selectOption('match');assert.equal(await page.getByLabel(c.amount,{exact:true}).inputValue(),'50');
          } else {
            await keyboardClick(page,submit);
            if(scenario==='denied'){await page.getByRole('alert').getByText(c.denied,{exact:true}).waitFor();assert.equal(await page.getByRole('status').count(),0)}
            if(scenario==='lost'){await page.getByRole('alert').getByText(c.unknown,{exact:true}).waitFor();assert.equal(await page.getByLabel(c.amount,{exact:true}).isDisabled(),true);await keyboardClick(page,page.getByRole('button',{name:c.retry,exact:true}));await page.getByRole('status').getByText(c.replay,{exact:true}).waitFor()}
            if(scenario==='fresh'){await page.getByLabel(c.password,{exact:true}).fill('synthetic-only');await keyboardClick(page,page.getByRole('button',{name:c.authenticate,exact:true}));await page.getByRole('status').getByText(c.authenticated,{exact:true}).waitFor();assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('calls')).filter(c=>c.kind==='settle').length),1);await keyboardClick(page,submit);await page.getByRole('status').getByText(c.success,{exact:true}).waitFor()}
          }
          const calls=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('calls')||'[]'));if(scenario==='lost')assert.deepEqual(calls[0].input,calls[1].input);if(scenario==='stale')assert.equal(calls.length,0);
          assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
          await page.screenshot({path:path.join(evidence,id+'.png'),fullPage:true});results.push({id,engine,keyboardNavigation:process.env.STOQUIFY_TEST_TAB_KEY||'Tab',version:browser.version(),locale,width:390,scenario,calls,passed:true});
        } finally {await context.close()}
      }} finally {await browser.close()}
    }
  } finally {const exited=new Promise(r=>server.once('exit',r));server.kill();await exited;fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify({fixture,scope:'Actual payroll settlement form; synthetic actions, no full session/provider/database',results},null,2),{flag:'wx'})}
  console.log(JSON.stringify({passed:results.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
