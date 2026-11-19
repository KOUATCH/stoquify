// Temporary browser-only experiment against the previous build; not final-source certification.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const results=[];
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{for(const locale of ['en','fr'])for(const [width,motion] of [[1440,'reduce'],[390,'reduce'],[320,'no-preference']]){
 const p=await b.newPage({viewport:{width,height:1000},reducedMotion:motion});await p.goto('http://localhost:4332/'+locale,{waitUntil:'load',timeout:120000});await p.locator('.cinematic-home.motion-ready').waitFor();await p.evaluate(()=>document.fonts.ready);const heights=[];
 for(const index of [0,7,8,15,22]){
  const tab=p.locator('.flow-tab').nth(index);if(await tab.isVisible())await tab.click();else await p.locator('.workflow-module-select select').selectOption(String(index));
  const s=await p.evaluate(()=>{const root=document.querySelector('.workflow-showcase'),placeholder=root.querySelector('.workflow-demo-placeholder'),demo=root.querySelector('.product-workflow:not(.workflow-demo-placeholder)'),measure=()=>root.querySelector('.showcase-inner').getBoundingClientRect().height;const before=measure(),guide=placeholder.querySelector('.workflow-size-guide'),parent=guide.parentNode;
   let hint,style;if(demo){guide.remove();style=document.createElement('style');style.textContent='.cinematic-home .workflow-size-guide .workflow-progress{display:block}';document.head.append(style);if(demo.dataset.motionOff==='true'){hint=placeholder.querySelector('.workflow-playback-indicator').cloneNode(true);hint.classList.add('workflow-text-reserve');hint.setAttribute('aria-hidden','true');demo.querySelector('.workflow-interaction').prepend(hint);}}
   const after=measure();hint?.remove();style?.remove();if(demo)parent.append(guide);return {before,after};});results.push({locale,width,motion,index,...s});heights.push(s.after);
 }
 assert.ok(Math.max(...heights)-Math.min(...heights)<=1,`${locale}/${width} candidate height varied`);console.log(locale,width,motion,'passed');await p.close();
}}finally{fs.writeFileSync(path.join(__dirname,'candidate-probe.json'),JSON.stringify(results,null,2));await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
