const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function check(origin) {
  const browser = await chromium.launch({headless:true});
  const results=[];
  try {
    for(const locale of ['en','fr']) for(const width of [360,768,1440]) {
      const context=await browser.newContext({viewport:{width,height:900}});
      await context.addCookies([{name:'fixtureRole',value:'admin',url:origin}]);
      const page=await context.newPage();
      await page.goto(`${origin}/${locale}/dashboard/people`);
      await page.getByRole('status').filter({hasText:'200'}).waitFor();
      await page.getByRole('link',{name:locale==='fr'?'Suivant':'Next',exact:true}).click();
      await page.waitForURL(/page=2/);
      await page.locator('[name=search]').fill('ZZ Synthetic');
      await page.locator('[name=search]').press('Enter');
      await page.getByRole('cell',{name:'ZZ Synthetic last employee',exact:true}).waitFor();
      assert(!new URL(page.url()).searchParams.has('page'));
      assert.equal(await page.locator('tbody tr').count(),1);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(__dirname,`${locale}-${width}.png`),fullPage:true});
      await page.goBack();
      await page.waitForURL(/page=2/);
      await page.getByRole('status').filter({hasText:'200'}).waitFor();
      assert.equal(await page.locator('[name=search]').inputValue(),'');
      await page.locator('[name=search]').fill('Missing synthetic');
      await page.locator('[name=search]').press('Enter');
      await page.getByText(locale==='fr'?'Aucun employé ne correspond à ces filtres.':'No employees match these filters.').waitFor();
      await page.goto(`${origin}/${locale}/dashboard/people?failure=1`);
      await page.getByRole('heading',{name:locale==='fr'?'Impossible de charger le personnel':'Could not load people'}).waitFor();
      assert.equal(await page.locator('table').count(),0);
      await page.getByRole('button',{name:locale==='fr'?'Réessayer':'Retry'}).focus();
      assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');
      for(const role of ['manager','own','denied']) {
        await context.addCookies([{name:'fixtureRole',value:role,url:origin}]);
        await page.goto(`${origin}/${locale}/dashboard/people`);
        if(role==='manager') {await page.getByRole('status').filter({hasText:'199'}).waitFor();assert(!(await page.textContent('body')).includes('ZZ Synthetic'))}
        else {await page.getByRole('heading').waitFor();assert.equal(await page.locator('table').count(),0)}
      }
      results.push({locale,width,lastRecordSearch:true,pagination:true,keyboardSubmit:true,backNavigation:true,empty:true,failedNotZero:true,managerScoped199:true,ownAndDeniedBlocked:true,noPageOverflow:true});
      await context.close();
    }
    fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({scope:'Actual React components with synthetic role boundary and real HRIS service/PostgreSQL; not a full Next/Better Auth session or screen reader certification',results},null,2));
  } finally {await browser.close()}
};
if(require.main===module) module.exports(process.argv[2]).catch(error=>{console.error(error);process.exitCode=1});
