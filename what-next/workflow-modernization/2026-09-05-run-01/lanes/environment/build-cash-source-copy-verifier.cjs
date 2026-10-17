const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
let source=fs.readFileSync(path.join(__dirname,'verify-cash-presentation.cjs'),'utf8');
function replace(before,after){assert.ok(source.includes(before),before);source=source.replace(before,after);}
source=source.replaceAll('cash-presentation-','cash-source-copy-');
replace('const hashes=()=>',"const {presentCashCommand}=require(path.join(f.root,'services/cash-command/cash-command-presentation.ts'));\nconst {localizeCashCommandNavigation}=require(path.join(f.root,'services/cash-command/cash-command-navigation.ts'));\nfiles.push('services/cash-command/cash-command-presentation.ts','lib/dashboard/snapshot-blocker-presentation.ts','lib/dashboard/snapshot-source-blocker-presentation.ts');\nconst hashes=()=>");
replace("const full=['dashboard.read','finance.read','payroll.payments.reconcile','payments.reconciliation.read','payroll.command.read'];","const full=['dashboard.read','finance.read','payroll.payments.reconcile','payments.reconciliation.read','payroll.command.read'];\n const all=[...full,'payroll.declarations.manage','CASH_DRAWER_READ','inventory.read','inventory.items.read','accounting.close.read','accounting.journal.read','purchases.orders.read'];");
replace("['populated','denied']","['populated','full','denied']");
replace("state==='denied'?['dashboard.read']:full","state==='denied'?['dashboard.read']:state==='full'?all:full");
replace("if(state==='populated')assert.ok", "if(state!=='denied')assert.ok");
replace("const context=await browser.newContext",`const presented=presentCashCommand(localizeCashCommandNavigation(data,locale),locale);
  const unchanged=[];
  function audit(before,after,key='',location=''){
   if(typeof before==='string'&&typeof after==='string'&&before===after&&/^(title|detail|summary|conclusion|nextStep|label|unavailableReason|disabledReason|staleReason|nextAction)$/.test(key)&&/[A-Za-z]/.test(before))unchanged.push({path:location,value:before});
   if(before&&after&&typeof before==='object'&&typeof after==='object')for(const name of Object.keys(before))audit(before[name],after[name],name,location+'.'+name);
  }
  if(locale==='fr')audit(data,presented);
  const context=await browser.newContext`);
replace("if(state==='populated'){", "if(state!=='denied'){");
replace("await expect(queue.getByText(locale==='fr'?'Partiel':'Partial',{exact:true}).first()).toBeVisible();", "if(state==='populated')await expect(queue.getByText(locale==='fr'?'Partiel':'Partial',{exact:true}).first()).toBeVisible();");
replace("assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));",`await expect(page.getByRole('heading',{name:locale==='fr'?'Synthèse de trésorerie':'Cash command brief',exact:true})).toBeVisible();
  await expect(page.getByText(presented.commandBrief.conclusion,{exact:true})).toBeVisible();
  if(presented.actionsToday.length){
   await expect(queue.getByRole('heading',{name:presented.actionsToday[0].title,exact:true})).toBeVisible();
   await expect(queue.getByText(presented.actionsToday[0].nextStep,{exact:true}).first()).toBeVisible();
   await expect(queue.getByText(presented.actionsToday[0].dueLabel,{exact:true}).first()).toBeVisible();
   const link=queue.locator('a').first();await link.focus();await expect(link).toBeFocused();
  }
  for(const subject of presented.proofSubjects)await expect(page.getByText(subject.label,{exact:true}).first()).toBeVisible();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));`);
replace('result.checks.push({state,locale,tenantCurrencyVerified:', 'result.checks.push({state,locale,untranslatedDisplayText:unchanged,sourceCopyVerified:true,tenantCurrencyVerified:');
fs.writeFileSync(path.join(__dirname,'verify-cash-source-copy.cjs'),source,{flag:'wx'});console.log('Created guarded source presentation verifier.');
