// Real calendar components, isolated package alias, synthetic inputs, loopback only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {spawn,execFile}=require('node:child_process'),engines=require('playwright');
const root=path.resolve(__dirname,'..'),[evidence,packagePath,reuse,frozenSource]=process.argv.slice(2),calendarPackage=path.resolve(packagePath||'');
const sourceRoot=frozenSource?path.resolve(frozenSource):root;
if(frozenSource){assert.equal(path.dirname(sourceRoot),path.join(root,'.codex-tmp'));assert.match(path.basename(sourceRoot),/^full-app-[a-f0-9]{10}$/);}
assert.ok(evidence&&fs.statSync(evidence).isDirectory());assert.equal(path.dirname(calendarPackage),path.join(root,'.codex-tmp'));assert.match(path.basename(calendarPackage),/^calendar-package-[a-f0-9]{10}$/);
assert.equal(JSON.parse(fs.readFileSync(path.join(calendarPackage,'package.json'))).version,'8.10.2');
const fixture=reuse?path.resolve(reuse):path.join(root,'.codex-tmp','calendar-browser-'+Date.now());
assert.equal(path.dirname(fixture),path.join(root,'.codex-tmp'));assert.match(path.basename(fixture),/^calendar-browser-\d+$/);
const files=['components/ui/calendar.tsx','components/ui/date-picker.tsx','components/ui/date-filter.tsx','components/DataTableComponents/TableDateRangePicker.tsx','components/ui/button.tsx','components/ui/popover.tsx','components/ui/dropdown-menu.tsx','lib/utils.ts','tests/local-gates/calendar-fixture.tsx','app/globals.css','app/public-contours.css','public/motifs/stoquify-contours.svg','tailwind.config.ts'];
const identity=()=>files.map(file=>({path:file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(sourceRoot,file))).digest('hex')}));const source=identity();
const liveSourceDrift=source.filter(f=>crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f.path))).digest('hex')!==f.sha256).map(f=>f.path);
if(!reuse){fs.mkdirSync(fixture);const write=(file,text)=>{fs.mkdirSync(path.dirname(path.join(fixture,file)),{recursive:true});fs.writeFileSync(path.join(fixture,file),text,{flag:'wx'})};
write('package.json',JSON.stringify({name:'calendar-compatibility',private:true}));
write('tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2017',lib:['dom','esnext'],strict:true,noEmit:true,skipLibCheck:true,esModuleInterop:true,module:'esnext',moduleResolution:'bundler',isolatedModules:true,jsx:'preserve',baseUrl:sourceRoot,paths:{'@/*':['./*'],'react-day-picker':[path.join(calendarPackage,'dist/index.d.ts')]}},include:['**/*.tsx','.next/types/**/*.ts']}));
write('next.config.mjs',`export default {experimental:{externalDir:true,cpus:1},outputFileTracingRoot:${JSON.stringify(root)},eslint:{ignoreDuringBuilds:true},typescript:{ignoreBuildErrors:true},webpack(c){c.resolve.alias['react-day-picker$']=${JSON.stringify(path.join(calendarPackage,'dist/index.esm.js'))};return c}}`);
write('postcss.config.mjs',`export default {plugins:{tailwindcss:{config:${JSON.stringify(path.join(fixture,'tailwind.config.ts'))}}}}`);
write('tailwind.config.ts',`import c from ${JSON.stringify(path.join(sourceRoot,'tailwind.config').replaceAll('\\','/'))};export default {...c,content:[${JSON.stringify(path.join(sourceRoot,'components/ui/*.tsx').replaceAll('\\','/'))},${JSON.stringify(path.join(sourceRoot,'components/DataTableComponents/*.tsx').replaceAll('\\','/'))},${JSON.stringify(path.join(sourceRoot,'tests/local-gates/calendar-fixture.tsx').replaceAll('\\','/'))}]}`);
fs.mkdirSync(path.join(fixture,'public/motifs'),{recursive:true});fs.copyFileSync(path.join(sourceRoot,'public/motifs/stoquify-contours.svg'),path.join(fixture,'public/motifs/stoquify-contours.svg'));
write('app/layout.tsx',`import '@/app/globals.css';export default function Layout({children}){return <html><body>{children}</body></html>}`);
write('app/[locale]/page.tsx',`import Fixture from '@/tests/local-gates/calendar-fixture';export default async function Page({params,searchParams}){return <Fixture locale={(await params).locale} scenario={(await searchParams).scenario||'single'}/>} `);
fs.writeFileSync(path.join(fixture,'source-identity.json'),JSON.stringify(source),{flag:'wx'});
}else{assert.deepEqual(JSON.parse(fs.readFileSync(path.join(fixture,'source-identity.json'))),source);if(frozenSource)assert.ok(fs.existsSync(path.join(fixture,'.next/BUILD_ID')),'Frozen source reuse must not rebuild from live files');}
const env=Object.fromEntries(Object.entries(process.env).filter(([k])=>/^(PATH|PATHEXT|SYSTEMROOT|WINDIR|TEMP|TMP|COMSPEC|LOCALAPPDATA|APPDATA|USERPROFILE)$/i.test(k)));Object.assign(env,{NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1',NODE_OPTIONS:'--require '+JSON.stringify(path.join(root,'scripts/local-gates-network.cjs'))});
function launch(args,label){const fd=fs.openSync(path.join(evidence,label+'.log'),'wx');const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),...args],{cwd:fixture,env,stdio:['ignore',fd,fd],windowsHide:true});fs.closeSync(fd);return child;}
const stop=child=>new Promise(resolve=>execFile('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true},()=>resolve()));
const month=(locale,n)=>locale==='fr'?(n===10?'octobre 2026':'novembre 2026'):(n===10?'October 2026':'November 2026');
const day=(page,locale,n,number)=>page.getByRole('grid',{name:month(locale,n),exact:true}).locator('button[name="day"]:not(.day-outside)').filter({hasText:new RegExp('^'+number+'$')});
const result=async page=>JSON.parse(await page.getByTestId('result').textContent());
async function keyboardOpen(page,trigger){await trigger.focus();await page.keyboard.press('Enter');await page.locator('button[name="day"]').first().waitFor();}
async function main(){
 if(!fs.existsSync(path.join(fixture,'.next/BUILD_ID'))){const build=launch(['build'],'build');const report={fixture,startedAt:new Date().toISOString(),timedOut:false};const timer=setTimeout(()=>{report.timedOut=true;stop(build)},1800000);try{report.exitCode=await new Promise((r,j)=>{build.once('exit',r);build.once('error',j)});assert.equal(report.exitCode,0)}finally{clearTimeout(timer);report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(evidence,'build.json'),JSON.stringify(report,null,2),{flag:'wx'})}assert.deepEqual(identity(),source);}
 const reservation=http.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const origin='http://127.0.0.1:'+port,server=launch(['start','--hostname','127.0.0.1','--port',String(port)],'server'),results=[];
 try{
  let ready=false;const startupDeadline=Date.now()+300000;while(Date.now()<startupDeadline){if(server.exitCode!==null)throw new Error('Fixture server exited before readiness: '+server.exitCode);try{if((await fetch(origin+'/en',{signal:AbortSignal.timeout(5000)})).ok){ready=true;break}}catch{}await new Promise(r=>setTimeout(r,500))}assert.ok(ready,'Fixture server did not become ready within five minutes; see server.log');
  for(const engine of (process.env.STOQUIFY_TEST_BROWSERS||'chromium,firefox,webkit').split(',')){
   const browser=await engines[engine].launch({headless:true});try{for(const locale of ['en','fr'])for(const width of [390,1280])for(const scenario of ['single','range','picker','range-picker','table','filter']){
    const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Europe/Paris'});await context.route('**/*',r=>new URL(r.request().url()).origin===origin?r.continue():r.abort());const page=await context.newPage(),errors=[],id=[engine,locale,width,scenario].join('-');page.on('pageerror',e=>errors.push(e.message));
    try{
     await page.clock.setFixedTime(new Date('2026-10-17T10:00:00+02:00'));await page.goto(origin+'/'+locale+'?scenario='+scenario);
     if(scenario==='single'){
      const selected=day(page,locale,10,15);await selected.waitFor();await page.waitForFunction(el=>el===document.activeElement,await selected.elementHandle());assert.equal(await day(page,locale,10,9).isDisabled(),true);assert.equal(await day(page,locale,10,21).isDisabled(),true);
      await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'16');await page.keyboard.press('Enter');assert.equal(await result(page),'2026-10-16');await page.keyboard.press('Enter');assert.equal(await result(page),null);
     }else if(scenario==='range'){
      await day(page,locale,11,3).click();assert.deepEqual(await result(page),{from:'2026-10-28',to:'2026-11-03'});assert.equal(await day(page,locale,10,30).getAttribute('aria-selected'),'true');
     }else if(scenario==='picker'||scenario==='range-picker'){
      const trigger=page.locator('button[aria-haspopup="dialog"]');await keyboardOpen(page,trigger);
      if(scenario==='picker'){assert.equal(await day(page,'en',10,9).isDisabled(),true);assert.equal(await day(page,'en',10,21).isDisabled(),true);await day(page,'en',10,15).focus();await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');await page.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await result(page),'2026-10-16');}
      else{await day(page,'en',11,3).click();await page.getByRole('dialog').waitFor({state:'hidden'});assert.deepEqual(await result(page),{from:'2026-10-28',to:'2026-11-03'});}
      await page.waitForFunction(el=>el===document.activeElement,await trigger.elementHandle());await keyboardOpen(page,trigger);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(el=>el===document.activeElement,await trigger.elementHandle());
     }else if(scenario==='table'){
      const trigger=page.getByRole('button',{name:locale==='fr'?'Période':'Date range',exact:true});await keyboardOpen(page,trigger);await day(page,locale,10,20).click();const value=await result(page);assert.equal(value.to,'2026-10-20');assert.equal(await page.locator('input[name="to"]').inputValue(),value.to);assert.equal(await page.locator('input[name="from"]').inputValue(),value.from);await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});await page.waitForFunction(el=>el===document.activeElement,await trigger.elementHandle());
     }else{
      await page.getByRole('button',{name:'All Time',exact:true}).click();await page.getByRole('menuitem',{name:'Last 7 Days',exact:true}).click();assert.deepEqual(await result(page),{option:'last7days',from:'2026-10-11',to:'2026-10-17',startHour:0,endHour:23});
      await page.getByRole('button',{name:'Last 7 Days',exact:true}).click();await page.getByRole('menuitem',{name:'Custom Range',exact:true}).click();await page.getByRole('menu').waitFor({state:'hidden'});
      // The existing filter exposes a second trigger after selecting Custom Range.
      // Exercise that explicit flow; the retained initial run records auto-open failure.
      const dateTrigger=page.getByRole('button',{name:'Select date range',exact:true});if(await dateTrigger.getAttribute('aria-expanded')!=='true')await dateTrigger.click();
      await day(page,'en',10,10).click();await day(page,'en',10,13).click();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid="result"]').textContent)?.option==='custom');assert.deepEqual(await result(page),{option:'custom',from:'2026-10-10',to:'2026-10-13',startHour:0,endHour:23});await page.keyboard.press('Escape');
     }
     assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
     if(scenario==='single'||scenario==='range'||scenario==='table')await page.screenshot({path:path.join(evidence,id+'.png'),fullPage:true});results.push({id,engine,version:browser.version(),locale,width,scenario,passed:true});
    }catch(error){await page.screenshot({path:path.join(evidence,id+'-failed.png'),fullPage:true});results.push({id,passed:false,error:error.message,errors});throw error;}finally{await context.close()}
   }}finally{await browser.close()}
  }
 }finally{await stop(server);fs.writeFileSync(path.join(evidence,'browser.json'),JSON.stringify({fixture,package:calendarPackage,version:'8.10.2',sourceRoot,source,liveSourceDrift,scope:'Real calendar, date/range picker, table picker and date filter; synthetic local inputs, no backend',results},null,2),{flag:'wx'})}
 console.log(JSON.stringify({passed:results.length}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
