const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const sourceCss=process.env.SOURCE_CONTROL_CSS==='1';
const results=[],out=path.join(__dirname,sourceCss?'workflow-browser-source-css':'workflow-browser');fs.mkdirSync(out,{recursive:true});
let controlCss;
if(sourceCss){
 const postcss=require('postcss'),crypto=require('node:crypto'),file=path.resolve('components/landing/product-workflow.css'),content=fs.readFileSync(file,'utf8');
 const media=postcss.atRule({name:'media',params:'(max-width: 540px)'});
 postcss.parse(content).walkAtRules('media',rule=>{if(rule.params==='(max-width: 540px)')rule.walkRules(child=>{if(child.selector.startsWith('.cinematic-home .workflow-showcase .workflow-controls'))media.append(child.clone());});});
 assert.equal(media.nodes.length,2);controlCss=media.toString();
 fs.writeFileSync(path.join(out,'source-css-provenance.json'),JSON.stringify({file,sha256:crypto.createHash('sha256').update(content).digest('hex'),baseBuild:fs.readFileSync('.next-public-payload-20261026/BUILD_ID','utf8').trim(),method:'Current source control rules overlaid on previously compiled application; not a rebuilt application',controlCss},null,2));
}
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const locale of ['en','fr'])for(const [width,motion] of [[1440,'reduce'],[390,'reduce'],[320,'no-preference']]){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:motion}),page=await context.newPage();
  const item={locale,width,motion,workflows:[],errors:[]};results.push(item);page.on('pageerror',e=>item.errors.push(e.message));
  console.log(JSON.stringify({starting:{locale,width,motion}}));
  await page.goto(`http://localhost:4332/${locale}`,{waitUntil:'load',timeout:120000});await page.locator('.cinematic-home.motion-ready').waitFor();await page.evaluate(()=>document.fonts.ready);
  if(sourceCss)await page.addStyleTag({content:controlCss});
  item.initial=await page.evaluate(()=>({nodes:document.querySelectorAll('*').length,htmlBytes:performance.getEntriesByType('navigation')[0].decodedBodySize,guides:document.querySelectorAll('.workflow-size-guide').length}));assert.equal(item.initial.guides,1);
  assert.equal(await page.locator('.workflow-module-select option').count(),23);assert.equal(await page.locator('.catalog-panel').count(),18);
  const heights=[];
  const capture=async()=>{const s=await page.locator('.workflow-showcase').evaluate(root=>({height:root.querySelector('.showcase-inner').getBoundingClientRect().height,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,guides:root.querySelectorAll('.workflow-size-guide').length,title:root.querySelector('.module-heading[aria-hidden="false"]').textContent.trim()}));assert.equal(s.overflow,0);assert.equal(s.guides,1);heights.push(s.height);return s;};
  for(let index=0;index<23;index++){
   const tab=page.locator('.flow-tab').nth(index);if(await tab.isVisible())await tab.click();else await page.locator('.workflow-module-select select').selectOption(String(index));
   const state={index,...await capture(),steps:[]};item.workflows.push(state);
   const steps=index<8?page.locator('.product-workflow:not(.workflow-demo-placeholder) .workflow-steps button'):page.locator('.journey-preview-state[aria-hidden="false"] .journey-stages button');
   for(let step=0;step<await steps.count();step++){await steps.nth(step).click();assert.equal(await steps.nth(step).getAttribute('aria-pressed'),'true');state.steps.push(await capture());}
   if([0,7,15,22].includes(index)){await page.locator('.workflow-showcase .showcase-inner').screenshot({path:path.join(out,`${locale}-${width}-${motion}-${index}.png`)});console.log(JSON.stringify({locale,width,motion,index,checked:true}));}
  }
  item.heightRange=Math.max(...heights)-Math.min(...heights);assert.ok(item.heightRange<=1,`Workflow height varied by ${item.heightRange}px`);
  if(width===1440){await page.locator('.flow-tab').first().focus();await page.keyboard.press('End');assert.equal(await page.locator('.flow-tab').last().getAttribute('aria-expanded'),'true');await page.keyboard.press('Home');assert.equal(await page.locator('.flow-tab').first().getAttribute('aria-expanded'),'true');item.keyboard=true;}
  await page.addScriptTag({path:require.resolve('axe-core')});item.violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));assert.deepEqual(item.violations,[]);assert.deepEqual(item.errors,[]);
  console.log(JSON.stringify({locale,width,motion,heightRange:item.heightRange,states:item.workflows.reduce((n,w)=>n+1+w.steps.length,0),initial:item.initial}));fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));await context.close();
 }
}finally{await browser.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}})().catch(e=>{console.error(e);process.exitCode=1});
