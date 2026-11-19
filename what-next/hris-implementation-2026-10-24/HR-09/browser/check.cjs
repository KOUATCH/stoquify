const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
module.exports = async function check(origin) {
  const browser = await chromium.launch({headless:true}), results=[];
  try {
    for(const locale of ['en','fr']) for(const width of [360,768,1440]) for(const role of ['owner','hr','manager','approver','denied']) {
      const context=await browser.newContext({viewport:{width,height:900}}), page=await context.newPage();
      await context.addCookies([{name:'fixtureRole',value:role,url:origin}]);
      await page.goto(`${origin}/${locale}/dashboard/people/setup`);
      await page.getByRole('heading').first().waitFor();
      if(role==='denied') assert.equal(await page.locator('form').count(),0);
      else {
        await page.getByRole('heading',{name:locale==='fr'?'Configuration de l’espace RH':'HR workspace setup'}).waitFor();
        if(role==='manager') {
          assert.equal(await page.locator('form').count(),0);
          assert(!(await page.textContent('body')).includes('Time policy incomplete'));
          assert(!(await page.textContent('body')).includes('Synthetic employee 200'));
        } else if(role==='approver') {
          assert.equal(await page.locator('form').filter({has:page.getByRole('heading',{name:locale==='fr'?'Valider la politique':'Review policy',exact:true})}).count(),0);
          const forms=page.locator('form').filter({has:page.getByRole('heading',{name:locale==='fr'?'Décider de la demande de temps':'Decide time request',exact:true})});
          const before=await forms.count();assert(before>0);
          const form=forms.first();
          await form.locator('[name=decision]').selectOption('APPROVE');
          await form.locator('[name=decisionReason]').fill('Synthetic browser independent review');
          await form.locator('[name=approvalEvidenceHash]').fill('sha256:synthetic-browser-review');
          await form.getByRole('button').focus();await page.keyboard.press('Enter');
          await page.getByRole('status').filter({hasText:locale==='fr'?'Enregistré.':'Saved.'}).waitFor();
          assert.equal(await forms.count(),before-1);
        } else {
          const form=page.locator('form').filter({has:page.getByRole('heading',{name:locale==='fr'?'Ajouter un service, une agence ou une équipe (facultatif)':'Add department, branch or team (optional)'})});
          const code=`${locale}-${width}-${role}-${Date.now()}`;
          await form.locator('[name=code]').fill(code);
          await form.locator('[name=name]').fill('Browser unit '+code);
          await form.locator('[name=effectiveFrom]').fill('2026-11-01');
          await form.locator('[name=effectiveTo]').fill('2027-11-01');
          await form.getByRole('button').focus();await page.keyboard.press('Enter');
          await page.getByRole('status').filter({hasText:locale==='fr'?'Enregistré.':'Saved.'}).waitFor();
          await page.getByText('Browser unit '+code,{exact:false}).waitFor();
          assert.equal(await form.locator('[name=name]').inputValue(),'Browser unit '+code);
          await form.locator('[name=effectiveTo]').fill('2025-01-01');
          await form.getByRole('button').click();
          await page.getByRole('status').filter({hasText:locale==='fr'?'Échec':'Could not'}).waitFor();
          assert.equal(await form.locator('[name=name]').inputValue(),'Browser unit '+code);
          assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('role')),'status');
        }
        await page.getByRole('button',{name:locale==='fr'?'Actualiser le statut':'Refresh status',exact:true}).focus();
        assert.equal(await page.evaluate(()=>document.activeElement.tagName),'BUTTON');
      }
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(__dirname,`${locale}-${width}-${role}.png`),fullPage:true});
      results.push({locale,width,role,scoped:true,keyboard:true,noOverflow:true});await context.close();
    }
    fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify({boundary:'Actual React UI + real service/PostgreSQL, synthetic role cookie; not full Next/BetterAuth or screen-reader certification',results},null,2));
  } finally {await browser.close()}
};
