const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const base = process.env.LANDING_REVIEW_URL || 'http://127.0.0.1:4321';
const groups = [
  ['workflows', '#product', '.flow-tab', '.flow-copy[aria-hidden="false"]', 23],
  ['story', '#problem', '.story-tabs button', '.story-state[aria-hidden="false"]', 6],
  ['people', '#people-payroll', '.people-tabs button', '.people-panel[aria-hidden="false"]', 5],
  ['catalog', '#offers', '.catalog-menu button', '.catalog-panel[aria-hidden="false"]', 18],
  ['setup', '#start', '.setup-step button', '.setup-description[aria-hidden="false"]', 3],
];
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 const evidenceFile = path.join(out,'browser-evidence.json');
 const report = fs.existsSync(evidenceFile) ? JSON.parse(fs.readFileSync(evidenceFile)) : { date: '2026-10-25', base, note: 'Isolated public-page browser checks; no enquiry sent and no business data changes.', results: [] };
 try {
  for (const locale of ['en', 'fr']) for (const width of [1440, 390]) {
   if(report.results.some(r=>r.locale===locale && r.width===width && r.downloadStatus)) continue;
   report.results=report.results.filter(r=>r.locale!==locale || r.width!==width);
   const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1000 : 844 }, isMobile: width === 390, hasTouch: width === 390 });
   const page = await context.newPage(); const errors = [];
   page.on('pageerror', e => errors.push(e.message));
   await page.goto(`${base}/${locale}`, { waitUntil: 'domcontentloaded', timeout: 90000 });
   await page.locator('.flow-tab').first().waitFor({state:'attached'}); await page.locator('.cinematic-home.motion-ready').waitFor(); await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(1200);
   const item = { locale, width, errors, groups: {}, screenshots: [] }; report.results.push(item);
   for (const [name, section, buttons, active, expected] of groups) {
    const count = await page.locator(buttons).count(); if (count !== expected) throw Error(`${name}: expected ${expected}, found ${count}`);
    const states = [];
    for (let index = 0; index < count; index++) {
     if (width === 390 && name === 'workflows') await page.locator('.workflow-module-select select').selectOption(String(index));
     else if (width === 390 && name === 'catalog') await page.locator('.catalog-select select').selectOption(String(index));
     else await page.locator(buttons).nth(index).evaluate(el => el.click());
     await page.waitForTimeout(510);
     const state = await page.evaluate(({ section, buttons, active, index }) => {
      const button = document.querySelectorAll(buttons)[index]; const panel = document.querySelector(active);
      return { index, label: button.textContent.trim(), height: Math.round(document.querySelector(section).getBoundingClientRect().height * 100) / 100, selected: button.getAttribute('aria-selected') ?? button.getAttribute('aria-expanded'), content: panel?.textContent.trim().slice(0, 180), overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
     }, { section, buttons, active, index });
     if (!state.content || state.selected !== 'true' || state.overflow > 1) throw Error(`Invalid state: ${JSON.stringify(state)}`);
     if (name === 'workflows' && index >= 8) {
      const journey = page.locator('.journey-preview-state[aria-hidden="false"] .journey-preview');
      const next = journey.getByRole('button', { name: locale === 'fr' ? 'Étape suivante' : 'Next step' });
      await next.evaluate(el => el.click()); await page.waitForTimeout(70);
      state.nextStep = await journey.getAttribute('data-step'); if (state.nextStep !== '1') throw Error(`Journey did not advance: ${index}`);
     }
     states.push(state);
    }
    const heights = states.map(s => s.height); item.groups[name] = { range: Math.max(...heights) - Math.min(...heights), states };
    fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify(report,null,2));
    await page.locator(buttons).first().evaluate(el => el.click());
   }
   // Keyboard traversal and motion controls remain independent of pointer input.
   if (width === 1440) { await page.locator('.flow-tab').first().focus(); await page.keyboard.press('End'); item.keyboardLastWorkflow = await page.locator('.flow-tab').last().getAttribute('aria-expanded'); await page.keyboard.press('Home'); }
   const toggleMotion=async()=>{if(width<=760){await page.locator('button[aria-controls="mobile-menu"]').click();await page.locator('.mobile-motion-toggle').click();}else await page.locator('.motion-toggle').click();};
   await toggleMotion(); item.pause = await page.locator('.cinematic-home').evaluate(el => el.classList.contains('motion-off'));
   await toggleMotion();
   item.selectors = [];
   for (const theme of ['dark', 'light']) {
    if (theme === 'light') await page.locator('.theme-toggle').click();
    item.selectors.push({ theme, styles: await page.locator('select').evaluateAll(els => els.map(el => ({ color: getComputedStyle(el).color, background: getComputedStyle(el).backgroundColor, optionColor: getComputedStyle(el.options[0]).color }))) });
   }
   await page.locator('.theme-toggle').click();
   // Every section enters the viewport before capturing lazy reveals.
   const shots = [['hero','#overview'],['workflows','#product'],['story','#problem'],['responsibilities','#modules'],['business-intro','.sme-introduction'],['operations','#business-operations'],['payments','#business-payments'],['firm','#accounting-firm'],['accounting','#accounting-close'],['people','#people-payroll'],['catalog','#offers'],['pricing','.offer-cards'],['cost','#rollout-cost'],['questions','.decision-guide'],['setup','#start'],['resources','.resources'],['closing','#get-started']];
   for (const [name, selector] of shots) {
    const loc = page.locator(selector).first(); if (!await loc.count()) continue;
    await loc.evaluate(el => el.scrollIntoView({ behavior: 'instant', block: 'start' })); await page.waitForTimeout(400);
    const file = `${locale}-${width}-${name}.png`; await page.screenshot({ path: path.join(out,file), animations: 'disabled' }); item.screenshots.push(file);
   }
   item.page = await page.evaluate(() => ({ height: document.documentElement.scrollHeight, overflow: document.documentElement.scrollWidth-document.documentElement.clientWidth, title:document.title, lang:document.documentElement.lang, missingImages:[...document.images].filter(i=>!i.complete||i.naturalWidth===0).map(i=>i.getAttribute('src')) }));
   for (const w of [320,768]) { await page.setViewportSize({width:w,height:844}); await page.waitForTimeout(250); item[`overflow${w}`] = await page.evaluate(() => document.documentElement.scrollWidth-document.documentElement.clientWidth); }
   await page.setViewportSize({width,height:width===1440?1000:844});
   await page.goto(`${base}/${locale}/contact?interest=people`, { waitUntil:'domcontentloaded',timeout:90000 });
   await page.locator('.enquiry-form').waitFor(); await page.locator('.cinematic-home.motion-ready').waitFor(); await page.waitForTimeout(1000); item.enquiryInterest = await page.locator('.enquiry-form select').first().inputValue();
   await page.locator('.enquiry-form input').first().fill(locale === 'fr' ? 'Société exemple' : 'Example company');
   const download = page.waitForEvent('download'); await page.getByRole('button',{name:locale==='fr'?'Enregistrer mon projet':'Save my brief'}).click();
   const saved=await download; await saved.saveAs(path.join(out,`${locale}-${width}-brief.txt`)); item.downloadStatus=await page.locator('.enquiry-form [role="status"]').innerText();
   const lang=page.getByRole('link',{name:locale==='fr'?'Switch to English':'Passer en français'}); if(await lang.count()) item.localeLink=await lang.getAttribute('href');
   await page.screenshot({path:path.join(out,`${locale}-${width}-contact.png`),fullPage:true});
   fs.writeFileSync(path.join(out,'browser-evidence.json'),JSON.stringify(report,null,2));
   console.log(JSON.stringify({locale,width,height:item.page.height,ranges:Object.fromEntries(Object.entries(item.groups).map(([k,v])=>[k,v.range])),errors:item.errors.length,overflow:item.page.overflow}));
   await context.close();
  }
 } finally { await browser.close(); }
})().catch(error => { console.error(error.stack); process.exitCode=1; });
