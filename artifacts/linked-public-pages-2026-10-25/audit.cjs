const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.PUBLIC_REVIEW_URL||'http://127.0.0.1:4331';
const phase=process.env.PUBLIC_REVIEW_PHASE||'baseline';
const out=path.join(__dirname,phase);fs.mkdirSync(out,{recursive:true});
const products=['pos','inventory','finance','accounting','hris','payroll','payables','receivables'];
const routes=['/products',...products.map(id=>'/products/'+id),'/offers/operations','/offers/finance','/offers/people','/get-started','/login','/register','/forgot-password'];
if(phase==='final')routes.push('','/pricing','/workflows','/contact');
const reportFile=path.join(out,'audit.json');
const report=fs.existsSync(reportFile)?JSON.parse(fs.readFileSync(reportFile)):{base,phase,scope:'Anonymous public pages; no form submission or business actions',results:[]};
const save=()=>fs.writeFileSync(reportFile,JSON.stringify(report,null,2));
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{for(const locale of ['en','fr'])for(const width of [1440,390])for(const route of routes){
  if(report.results.some(r=>r.locale===locale&&r.width===width&&r.route===route&&!r.failure&&!(r.page?.clipped.length)))continue;
  report.results=report.results.filter(r=>r.locale!==locale||r.width!==width||r.route!==route);
  const context=await browser.newContext({viewport:{width,height:width===1440?1000:844},reducedMotion:'reduce',isMobile:width===390,hasTouch:width===390});
  const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const item={locale,width,route,errors};report.results.push(item);
  try{
   const response=await page.goto(`${base}/${locale}${route}`,{waitUntil:'load',timeout:120000});item.status=response.status();
   if(!['/login','/register','/forgot-password'].includes(route))await page.locator('.cinematic-home.motion-ready').waitFor({timeout:30000});
   await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(120);
   item.page=await page.evaluate(()=>({title:document.title,lang:document.documentElement.lang,description:document.querySelector('meta[name="description"]')?.content,headings:[...document.querySelectorAll('h1')].map(e=>e.textContent.trim()),height:document.documentElement.scrollHeight,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,links:[...document.querySelectorAll('a[href]')].map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),missingImages:[...document.images].filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src),clipped:[...document.querySelectorAll('main h1,main h2,main p,main button,main a')].filter(e=>!e.closest('.sr-only')&&e.scrollHeight>e.clientHeight+3&&['hidden','clip'].includes(getComputedStyle(e).overflowY)).map(e=>e.textContent.trim().slice(0,100))}));
   const stem=`${locale}-${width}-${route.slice(1).replaceAll('/','-')}`;
   await page.screenshot({path:path.join(out,stem+'.png'),fullPage:true});
   await page.addScriptTag({path:require.resolve('axe-core')});
   item.accessibility=[];
   const themes=phase==='final'?['default','alternate']:['default'];
   for(const theme of themes){
    if(theme==='alternate'){
     const toggle=page.locator('.theme-toggle, .auth-shell header button[aria-label]');if(!await toggle.count())break;await toggle.click();await page.waitForTimeout(150);
    }
    const audit=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return{violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)}});
    item.accessibility.push({theme,...audit});
   }
   if(width===390){await page.setViewportSize({width:320,height:844});item.overflow320=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);}
   console.log(JSON.stringify({locale,width,route,status:item.status,overflow:item.page.overflow,axe:item.accessibility.reduce((n,a)=>n+a.violations.length,0),errors:errors.length}));
  }catch(e){item.failure=e.message;console.log(JSON.stringify({locale,width,route,failure:item.failure}));}
  save();await context.close();
 }}finally{await browser.close();save();}
 const problems=report.results.filter(r=>r.failure||r.status!==200||r.page?.lang!==r.locale||r.page?.overflow>0||r.overflow320>0||r.errors.length||r.page?.missingImages.length||r.page?.clipped.length||r.accessibility?.some(a=>a.violations.length));
 if(report.results.length!==routes.length*4||problems.length)throw Error(JSON.stringify({cases:report.results.length,expected:routes.length*4,problems:problems.map(r=>({locale:r.locale,width:r.width,route:r.route,failure:r.failure,overflow:r.page?.overflow,clipped:r.page?.clipped,axe:r.accessibility?.flatMap(a=>a.violations.map(v=>v.id))}))}));
})().catch(e=>{console.error(e);process.exitCode=1});

