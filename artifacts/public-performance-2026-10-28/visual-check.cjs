process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright';
const {chromium, firefox, webkit} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), sharp = require('sharp');
const engine = process.argv[2] || 'chrome';
const out = path.join(__dirname, 'visual-' + engine); fs.mkdirSync(out, {recursive:true});
const rows = [];
const originalMark = fs.readFileSync('components/global/stoquify-logo-artwork.ts', 'utf8').match(/STOQUIFY_MARK_PATH\s*=\s*"([^"]+)"/)[1];
async function imageDifference(a, b) {
  const x = await sharp(a).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const y = await sharp(b).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.deepEqual(x.info, y.info, 'Logo dimensions changed');
  let total = 0; for(let i=0;i<x.data.length;i++)total += Math.abs(x.data[i]-y.data[i]);
  return total/x.data.length;
}
(async()=>{
  const browser = await ({chrome:chromium,firefox,webkit}[engine]).launch(engine==='chrome'?{channel:'chrome'}:{});
  try {
    for(const locale of ['en','fr']) for(const device of [{width:1440,dpr:1},{width:390,dpr:3},{width:320,dpr:2}]) {
      const row = {engine,locale,...device,errors:[],logos:[]}; rows.push(row);
      const contexts = [], pages = [];
      try {
        for(const port of [4334,4335]) {
          const context = await browser.newContext({viewport:{width:device.width,height:1000},deviceScaleFactor:device.dpr,reducedMotion:'reduce'});
          contexts.push(context); const page = await context.newPage(); pages.push(page);
          page.on('pageerror',e=>row.errors.push(e.message));
          await page.goto(`http://localhost:${port}/${locale}`,{waitUntil:'load',timeout:120000});
          await page.locator('.workflow-module-select option').last().waitFor({state:'attached'});
          await page.evaluate(()=>document.fonts.ready);
          await page.locator('.hero-dashboard-capture').waitFor();
          await page.waitForFunction(()=>[...document.querySelectorAll('.hero-image,.hero-dashboard-capture')].every(i=>i.complete&&i.naturalWidth));
        }
        const page = pages[1];
        row.images = await page.locator('.hero-image,.hero-dashboard-capture').evaluateAll(imgs=>imgs.map(i=>({source:new URL(i.currentSrc).pathname,naturalWidth:i.naturalWidth,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height,priority:i.fetchPriority})));
        assert.ok(row.images[1].source.includes(`dashboard-${locale}-`),'Full-size dashboard unexpectedly downloaded');
        assert.ok(row.images.every(i=>i.priority==='high'&&i.width>0&&i.height>0));
        row.shared = await page.locator('.preview-logo use').evaluateAll(uses=>uses.map(use=>{
          const target=document.getElementById(use.getAttribute('href').slice(1));
          return {target:use.getAttribute('href'),mark:target?.querySelector('path')?.getAttribute('d')};
        }));
        assert.ok(row.shared.length>25); assert.equal(new Set(row.shared.map(x=>x.target)).size,1);
        assert.ok(row.shared.every(x=>x.mark===originalMark));
        assert.equal(await page.locator('.workflow-module-select option').count(),23);
        assert.equal(await page.locator('.catalog-panel').count(),18);
        await page.locator('.hero-sme').screenshot({path:path.join(out,`${locale}-${device.width}-hero.png`)});
        for(const theme of ['dark','light']) {
          if(theme==='light')for(const p of pages)await p.locator('.theme-toggle').click();
          for(const [label, selector] of [
            ['workflow','.module-chrome .preview-logo'],
            ['catalogue','.catalog-panel[aria-hidden="false"] .preview-logo'],
            ['closing','.closing-copy .preview-logo'],
          ]) {
            const files = [];
            for(let i=0;i<pages.length;i++) {
              const logo=pages[i].locator(selector).first(); await logo.scrollIntoViewIfNeeded(); await pages[i].waitForTimeout(450);
              const file=path.join(out,`${locale}-${device.width}-${theme}-${label}-${i}.png`);
              await logo.screenshot({path:file}); files.push(file);
              assert.ok(await logo.evaluate(e=>e.getBBox().width>0&&e.getBBox().height>0));
            }
            const difference=await imageDifference(...files); row.logos.push({theme,label,difference});
            assert.ok(difference<3, `Logo appearance changed: ${label}, mean channel difference ${difference}`);
          }
        }
        row.overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth); assert.equal(row.overflow,0);
        await page.addScriptTag({path:require.resolve('axe-core')});
        row.violations=await page.evaluate(async()=>(await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})));
        assert.deepEqual(row.violations,[]); assert.deepEqual(row.errors,[]);
        row.passed=true; console.log(JSON.stringify({engine,locale,width:device.width,passed:true}));
      } finally {for(const c of contexts)await c.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(rows,null,2));}
    }
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
