const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({headless:true});
  const results = [];
  try {
    for (const locale of ['en','fr']) for (const width of [360,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:900}});
      await page.goto(`http://127.0.0.1:18542/?locale=${locale}`);
      await page.locator('select').first().selectOption('ATTENDANCE_CORRECTION');
      await page.locator('select').nth(1).selectOption('synthetic-entry');
      await page.locator('[name=proposedWorkedMinutes]').fill('480');
      await page.locator('[name=proposedAbsenceMinutes]').fill('0');
      await page.locator('[name=reason]').fill('Synthetic missed minutes');
      await page.locator('button[type=submit]').focus();
      await page.keyboard.press('Enter');
      await page.getByRole('alert').waitFor();
      await page.waitForFunction(()=>document.activeElement.getAttribute('role')==='alert');
      assert.equal(await page.locator('[name=proposedWorkedMinutes]').inputValue(),'480');
      assert.equal(await page.locator('[name=reason]').inputValue(),'Synthetic missed minutes');
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'alert');
      assert.equal(await page.evaluate(()=>window.submitted.expectedEntryHash),'sha256:synthetic-reviewed-base');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(__dirname,`${locale}-${width}.png`),fullPage:true});
      await page.evaluate(()=>{window.testMode='thrown'});
      await page.locator('button[type=submit]').click();
      await page.getByRole('alert').filter({hasText:locale==='fr'?'Vos valeurs':'Your entries'}).waitFor();
      assert.equal(await page.locator('[name=proposedWorkedMinutes]').inputValue(),'480');
      assert.equal(await page.locator('[name=reason]').inputValue(),'Synthetic missed minutes');
      await page.evaluate(()=>{window.testMode='success'});
      await page.locator('button[type=submit]').click();
      await page.getByRole('status').waitFor();
      results.push({locale,width,resolvedErrorRetained:true,thrownErrorRetained:true,keyboardSubmit:true,errorFocus:true,noHorizontalOverflow:true,successAnnounced:true});
      await page.close();
    }
    fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({scope:'Actual component, synthetic action boundary; no authenticated route or screen-reader certification',results},null,2));
    console.log(JSON.stringify(results));
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1});
