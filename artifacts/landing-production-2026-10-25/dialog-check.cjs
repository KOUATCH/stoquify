const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');
(async () => {
 const browser = await chromium.launch({channel:'chrome', headless:true});
 const file = path.join(__dirname,'final-evidence.json');
 const evidence = JSON.parse(fs.readFileSync(file,'utf8'));
 try {
  for (const locale of ['en','fr']) for (const width of [1440,390]) {
   const page = await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
   await page.goto(`http://127.0.0.1:4321/${locale}`,{waitUntil:'domcontentloaded',timeout:90000});
   await page.locator('.cinematic-home.motion-ready').waitFor();
   const trigger = page.locator('#accounting-firm .photo-screen-enlarge');
   await trigger.click(); await page.getByRole('dialog').waitFor();
   await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state:'detached'});
   const item = evidence.results.find(r=>r.locale===locale && r.width===width);
   item.dialogClosed = await page.getByRole('dialog').count() === 0;
   item.dialogFocusRestored = await trigger.evaluate(el=>document.activeElement===el);
   if (!item.dialogClosed || !item.dialogFocusRestored) throw Error(`${locale} ${width}: dialog failed`);
   console.log(JSON.stringify({locale,width,closed:item.dialogClosed,focusRestored:item.dialogFocusRestored}));
   await page.close();
  }
  fs.writeFileSync(file,JSON.stringify(evidence,null,2));
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
