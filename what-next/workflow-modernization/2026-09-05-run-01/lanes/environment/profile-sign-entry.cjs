const { fixture } = require('./verify-signoff-request-order.cjs');
const f = require('./statement-recipient-fixtures.cjs'), { db, fs, path, crypto, assert } = f;
const { chromium, expect: baseExpect } = require('@playwright/test'), expect = baseExpect.configure({ timeout: 60000 });
const { hashPassword } = require(path.join(f.root, 'lib/password.ts'));
const { getModuleCatalog } = require(path.join(f.root, 'services/modules/module-catalog.service.ts'));
const base = 'http://127.0.0.1:3110', stamp = crypto.randomUUID(), secrets = [];
const files = ['services/reconciliation/payment-reconciliation-certification.service.ts', 'services/modules/module-entitlement.service.ts', 'services/modules/module-catalog.service.ts', 'actions/payments/reconciliation.actions.ts', 'actions/payments/reconciliation-sign-review.actions.ts', 'components/finance/ReconciliationSignReview.tsx', 'components/finance/ReconciliationSignReview.module.css', 'components/finance/ReconciliationCertificateExportPanel.tsx', 'components/finance/PaymentReconciliationWorkbench.tsx', 'hooks/payments/usePaymentReconciliationWorkbench.ts', 'hooks/payments/usePaymentReconciliationDashboard.ts', 'lib/auth-client.ts','components/finance/PaymentSuspenseQueue.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, crypto.createHash('sha256').update(fs.readFileSync(path.join(f.root, file))).digest('hex')]));
const report = { phase: process.argv.includes('--after') ? 'after' : 'before', at: new Date().toISOString(), sourceBefore: hashes(), journeys: [] }; let browser;
async function journey(locale) {
  const x = await fixture('entry-profile-' + locale + '-' + stamp), modules = getModuleCatalog().map(m => m.slug), password = 'Owned-module-sign-' + crypto.randomUUID() + '!'; secrets.push(password);
  const hashed = await hashPassword(password), permissions = ['dashboard.read', 'finance.read', 'payments.reconciliation.read', 'payments.reconciliation.sign', 'payments.reconciliation.certificate.export'];
  await db.user.update({ where: { id: x.signer.id }, data: { password: hashed, isVerified: true, emailVerified: true } });
  await db.account.create({ data: { userId: x.signer.id, accountId: x.signer.id, providerId: 'credential', password: hashed } });
  const role = await db.role.create({ data: { organizationId: x.org.id, code: 'administrator', nameEn: 'Owned module sign reviewer', permissions, users: { connect: { id: x.signer.id } } } });
  await db.tenantModuleConfiguration.create({ data: { organizationId: x.org.id, manifestHash: 'owned-sign-entry-profile', selectedModules: modules, activeModules: modules } });
  await db.tenantModuleGrant.createMany({ data: modules.map(moduleSlug => ({ organizationId: x.org.id, moduleSlug, status: 'active', source: 'requested_modules' })) });
  const moduleStatus = status => db.tenantModuleGrant.update({ where: { organizationId_moduleSlug: { organizationId: x.org.id, moduleSlug: 'payment_reconciliation' } }, data: { status } });
  const m = require(path.join(f.root, 'messages/' + locale + '.json')).paymentReconciliationWorkbench, t = m.signReview;
  const row = { locale, organizationId: x.org.id, runId: x.run.runId, scans: [], screenshots: [], errors: [] }; report.journeys.push(row);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true, locale: locale === 'fr' ? 'fr-FR' : 'en-GB' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  assert.equal((await context.request.post(base + '/api/auth/sign-in/email', { data: { email: x.signer.email, password }, headers: { Origin: base }, timeout: 180000 })).status(), 200);
  const page = await context.newPage(); page.on('pageerror', e => row.errors.push(f.safe(e, secrets))); page.on('console', m => { if (m.text().includes('MISSING_MESSAGE')) row.errors.push(f.safe(m.text(), secrets)); });
  const panel = () => page.getByRole('region', { name: t.title, exact: true }), url = base + '/' + locale + '/dashboard/finance/reconciliation?reviewRun=' + x.run.runId;
  async function shot(label, target = panel()) { const file = 'sign-entry-profile-' + stamp + '-' + locale + '-' + label + '.png'; await target.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file); }
  async function scan(state, target) {
    console.log(JSON.stringify({ locale, phase: 'scan-' + state }));
    await target.evaluate(el => el.setAttribute('data-owned-module-review', 'true')); await page.addScriptTag({ path: require.resolve('axe-core') });
    const scan = await page.evaluate(async () => { const r = await window.axe.run('[data-owned-module-review]', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); const summarize = entries => entries.map(e => ({ id: e.id, impact: e.impact, nodes: e.nodes.map(n => ({ target: n.target, html: n.html, any: n.any })) })); return { violations: summarize(r.violations), incomplete: summarize(r.incomplete), passes: r.passes.map(e => e.id) }; });
    const rendered = [], measure = require('./measure-rendered-contrast.cjs');
    for (const node of scan.incomplete.find(r => r.id === 'color-contrast')?.nodes || []) { await page.locator(node.target[0]).first().scrollIntoViewIfNeeded(); rendered.push(...await measure(page, [node])); }
    row.scans.push({ state, scan, rendered }); assert.deepEqual(scan.violations, []); assert.deepEqual(rendered.filter(r => !r.disabled && (!r.measured || !r.passes)), []);
    await target.evaluate(el => el.removeAttribute('data-owned-module-review'));
  }
  try {

    row.samples=[];
    for(let iteration=0;iteration<3;iteration++){
      const sample={iteration,kind:iteration===0?'initial':'warm',requests:[],failedRequests:[]}, started=Date.now(), inflight=new Map();row.samples.push(sample);
      const onRequest=req=>{if(['document','fetch','xhr'].includes(req.resourceType()))inflight.set(req,Date.now());};
      const describe=req=>({path:new URL(req.url()).pathname,method:req.method(),kind:req.resourceType(),startMs:inflight.get(req)-started,elapsedMs:Date.now()-inflight.get(req),reviewArgument:(req.postData()||'').includes(x.run.runId),workbenchArgument:(req.postData()||'').includes('"period"')});
      const onFinished=req=>{if(inflight.has(req))sample.requests.push(describe(req))};const onFailed=req=>{if(inflight.has(req))sample.failedRequests.push({...describe(req),error:req.failure()?.errorText})};
      page.on('request',onRequest);page.on('requestfinished',onFinished);page.on('requestfailed',onFailed);
      await page.goto(url);await expect(panel().getByText(t.ready,{exact:true})).toBeVisible();await expect(panel()).toHaveAttribute('aria-busy','false');sample.readyMs=Date.now()-started;
      sample.navigation=await page.evaluate(()=>performance.getEntriesByType('navigation').map(n=>n.toJSON()));sample.resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(r=>['fetch','xmlhttprequest'].includes(r.initiatorType)).map(r=>({path:new URL(r.name).pathname,start:r.startTime,duration:r.duration,responseStart:r.responseStart,responseEnd:r.responseEnd})));
      page.off('request',onRequest);page.off('requestfinished',onFinished);page.off('requestfailed',onFailed);sample.permissionRequestCount=sample.requests.filter(r=>r.path==='/api/me/permissions').length;console.log(JSON.stringify({phase:report.phase,locale,iteration,readyMs:sample.readyMs,permissionRequests:sample.permissionRequestCount}));
    }
    if(process.argv.includes('--after')){
      await page.setViewportSize({width:320,height:1000});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await shot('ready-320');
      const refresh=async()=>{await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'hidden'});window.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'visibilityState',{configurable:true,get:()=> 'visible'});window.dispatchEvent(new Event('visibilitychange'));});};
      await db.role.update({where:{id:role.id},data:{permissions:permissions.filter(p=>p!=='payments.reconciliation.sign')}});await refresh();await expect(panel().getByText(t.denied,{exact:true})).toBeVisible();await expect(panel().getByRole('button',{name:t.confirm,exact:true})).toBeDisabled();row.liveSignWithdrawal=true;
      await db.role.update({where:{id:role.id},data:{permissions}});await refresh();await expect(panel().getByText(t.ready,{exact:true})).toBeVisible();row.signRestorationRereads=true;
      await page.route('**/api/me/permissions',route=>route.fulfill({status:500,contentType:'application/json',body:JSON.stringify({error:'Owned controlled permission lookup failure'})}));await refresh();await expect(panel()).toHaveCount(0);const errorCopy=require(path.join(f.root,'lib/dashboard/presentation.ts')).dashboardSharedCopy[locale].error;await expect(page.getByRole('heading',{name:errorCopy.title,exact:true})).toBeVisible();row.failedPermissionHidesEvidence=true;
      await page.unroute('**/api/me/permissions');await page.reload();await expect(panel().getByText(t.ready,{exact:true})).toBeVisible();row.permissionFailureReloadRecovered=true;
      await panel().getByRole('button',{name:t.confirm,exact:true}).click();const input=panel().getByLabel(m.manualMatch.passwordLabel,{exact:true});await expect(input).toBeFocused();await input.fill(password);await panel().getByRole('button',{name:m.suspenseWorkflow.review.authenticate,exact:true}).click();await expect(panel().getByRole('button',{name:t.retry,exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(panel().getByRole('button',{name:t.export,exact:true})).toBeVisible();
      assert.equal(await db.ledgerAuditEvent.count({where:{organizationId:x.org.id,action:'PAYMENT_RECONCILIATION_RUN_SIGN'}}),1);assert.equal(await db.businessEvent.count({where:{organizationId:x.org.id,eventType:'payment.reconciliation.signed'}}),1);assert.equal(await db.journalEntry.count({where:{organizationId:x.org.id}}),0);row.independentSignaturePreserved=true;
    }
    assert.deepEqual(row.errors,[]);row.passed=true;
  } catch (error) { row.error = f.safe(error, secrets); await shot('failure', page).catch(() => {}); throw error; } finally { await context.close(); }
}
(async () => { await f.helper.withClient(f.target, f.helper.assertOwned); browser = await chromium.launch({ headless: true }); for (const locale of ['en', 'fr']) await journey(locale); report.passed = true; })().catch(error => { report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); report.sourceAfter = hashes(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter); const output = path.join(__dirname, 'sign-entry-profile-' + stamp + '.json'); fs.writeFileSync(output, JSON.stringify(report, null, 2), { flag: 'wx' }); console.log(JSON.stringify({ output, passed: report.passed, error: report.error, sourceStable: report.sourceStable })); await db.$disconnect(); process.exit(process.exitCode || 0);
});
