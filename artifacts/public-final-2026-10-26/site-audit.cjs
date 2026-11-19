const pw=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const engine=process.env.REVIEW_BROWSER||'chrome';assert.ok(['chrome','firefox','webkit'].includes(engine));
const base='http://localhost:4334',out=path.join(__dirname,engine),file=path.join(out,'audit.json');fs.mkdirSync(out,{recursive:true});
const buildId=fs.readFileSync('.next-public-final-20261026/BUILD_ID','utf8').trim();
const routes=['','/products',...['pos','inventory','finance','accounting','hris','payroll','payables','receivables'].map(id=>'/products/'+id),...['operations','finance','people'].map(id=>'/offers/'+id),'/pricing','/workflows','/get-started','/contact','/login','/register','/forgot-password','/privacy','/terms'];
const report=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{engine,buildId,base,scope:'Anonymous public routes, no form submission; browser emulation, not physical devices',results:[]};assert.equal(report.buildId,buildId);
const save=()=>fs.writeFileSync(file,JSON.stringify(report,null,2));
(async()=>{const browser=await (engine==='chrome'?pw.chromium:pw[engine]).launch({headless:true,...(engine==='chrome'?{channel:'chrome'}:{})});report.version=browser.version();let failures=0;
try{for(const locale of ['en','fr'])for(const width of [1440,390])for(const route of routes){
 if(report.results.some(r=>r.locale===locale&&r.width===width&&r.route===route&&r.passed))continue;
 report.results=report.results.filter(r=>r.locale!==locale||r.width!==width||r.route!==route);
 await new Promise(resolve=>setTimeout(resolve,8000));
 const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce',locale:locale==='fr'?'fr-FR':'en-US',hasTouch:width===390,...(engine!=='firefox'?{isMobile:width===390}:{})}),page=await context.newPage();
 const item={locale,width,route,errors:[],translationErrors:[]};report.results.push(item);page.on('pageerror',e=>item.errors.push(e.message));page.on('console',m=>{if(/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text()))item.translationErrors.push(m.text());});
 try{
  const response=await page.goto(base+'/'+locale+route,{waitUntil:'load',timeout:120000});item.status=response.status();assert.equal(item.status,200);
  if(route===''||route==='/forgot-password'){const html=await response.text();item.htmlBytes=Buffer.byteLength(html);item.fullApplicationMessagesPresent=html.includes('paymentPostingRecovery');assert.equal(item.fullApplicationMessagesPresent,route==='/forgot-password');}
  if(!['/login','/register','/forgot-password'].includes(route))await page.locator('.cinematic-home.motion-ready').waitFor({timeout:60000});
  await page.evaluate(()=>document.fonts.ready);
  // Load lazy media through actual scrolling before checking images and taking a full-page capture.
  await page.evaluate(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=window.innerHeight){window.scrollTo(0,y);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));}window.scrollTo(0,0);});
  await page.waitForFunction(()=>[...document.images].filter(i=>i.currentSrc).every(i=>i.complete),undefined,{timeout:30000});
  item.page=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,h1:[...document.querySelectorAll('h1')].map(e=>e.textContent.trim()),images:[...document.images].map(i=>({src:new URL(i.currentSrc||i.src,location.href).pathname,loaded:i.complete&&i.naturalWidth>0})),brandMarks:document.querySelectorAll('svg[role="img"],img[src*="stoquify"]').length,clipped:[...document.querySelectorAll('main h1,main h2,main p,main button,main a')].filter(e=>!e.closest('.sr-only')&&e.scrollHeight>e.clientHeight+3&&['hidden','clip'].includes(getComputedStyle(e).overflowY)).map(e=>e.textContent.trim().slice(0,100))}));
  assert.equal(item.page.lang,locale);assert.equal(item.page.overflow,0);assert.ok(item.page.title.includes('Stoquify'));assert.ok(item.page.images.every(i=>i.loaded));assert.deepEqual(item.page.clipped,[]);
  if(route===''){assert.equal(await page.locator('.workflow-module-select option').count(),23);assert.equal(await page.locator('.catalog-panel').count(),18);}
  await page.screenshot({path:path.join(out,`${locale}-${width}-${route.slice(1).replaceAll('/','-')||'home'}.png`),fullPage:true});
  await page.addScriptTag({path:require.resolve('axe-core')});item.accessibility=[];
  for(const theme of ['default','alternate']){
   if(theme==='alternate'){const toggle=page.locator('.theme-toggle, .auth-shell header button[aria-label]');if(!await toggle.count())break;await toggle.first().click();}
   const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return{violations:r.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});item.accessibility.push({theme,...audit});assert.deepEqual(audit.violations,[]);
  }
  if(width===390){await page.setViewportSize({width:320,height:844});item.overflow320=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);assert.equal(item.overflow320,0);}
  assert.deepEqual(item.errors,[]);assert.deepEqual(item.translationErrors,[]);item.passed=true;
 }catch(e){item.failure=e.message;failures++;}
 save();console.log(JSON.stringify({engine,locale,width,route,passed:item.passed||false,failure:item.failure}));await context.close();
 if(failures>=3)throw Error('Three failures: stop this browser and inspect before continuing.');
}}finally{save();await browser.close();}
assert.equal(report.results.length,88);assert.ok(report.results.every(r=>r.passed));})().catch(e=>{console.error(e);process.exitCode=1});
