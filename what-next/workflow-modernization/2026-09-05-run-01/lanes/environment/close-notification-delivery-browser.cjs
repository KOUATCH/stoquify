"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process');
  const { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', expect = baseExpect.configure({ timeout: 60000 }), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), secrets = [];
  const product = ['services/accounting/close-evidence-notification.worker.ts', 'services/accounting/close-evidence-notifications.service.ts', 'components/accounting/CloseEvidenceNotifications.tsx', 'components/accounting/CloseEvidenceWorkflowPanel.tsx', 'actions/accounting/close-evidence-notifications.actions.ts', 'services/_shared/protect.ts', 'next.config.mjs'];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries([__filename, ...product.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: ['Actual protected application reads of durable publications in an owned synthetic tenant. No external dispatch or personal read acknowledgement.', 'Scoped keyboard, transport recovery and reflow checks are not full accessibility or production performance certification.'] }; let w, browser;
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $cmd=(@($p.CommandLine,$q.CommandLine)-join ' '); [pscustomobject]@{pid=$p.ProcessId;address=$rows[0].LocalAddress;workspace=$cmd.ToLowerInvariant().Contains('${root.toLowerCase().replaceAll("'", "''")}');next=($cmd -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.pid, expected); assert.equal(value.address, '127.0.0.1'); assert.equal(value.workspace, true); assert.equal(value.next, true); return value;
  }
  function predecessor() {
    const name = process.env.STOQUIFY_CLOSE_BROWSER_RECEIPT, hash = process.env.STOQUIFY_CLOSE_BROWSER_SHA;
    assert.ok(/^close-notification-delivery-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || ''));
    const bytes = fs.readFileSync(path.join(__dirname, name)); assert.equal(sha(bytes), hash); const record = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(record[flag], true);
    for (const file of product.slice(0, 2)) assert.equal(record.sourceAfter[file], sha(fs.readFileSync(path.join(root, file))));
    w = record.browser; assert.ok(w.organizationId.startsWith('workflow_close_write_')); h.organizations.push(w.organizationId); report.predecessor = { name, sha256: hash, browser: w };
  }
  const outside = async () => f.hash({ base: await h.outside(), accounts: await db.account.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }), sessions: await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) });
  const retained = async () => f.hash({ comments: await db.accountantComment.findMany({ where: { organizationId: w.organizationId }, orderBy: { id: 'asc' } }), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: w.organizationId }, orderBy: { id: 'asc' } }), outbox: await db.businessEventOutbox.findMany({ where: { organizationId: w.organizationId }, orderBy: { id: 'asc' } }) });
  try {
    report.listenerBefore = listener(); predecessor(); await helper.withClient(helper.targetUrl(), helper.assertOwned);
    report.sourceBefore = sources(); report.outsideBefore = await outside(); report.financialBefore = await h.financial();
    const password = 'Owned-notification-browser-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed);
    const user = await db.user.update({ where: { id: w.actorId, organizationId: w.organizationId }, data: { password: hashed, emailVerified: true } });
    const credential = await db.account.findFirst({ where: { userId: user.id, accountId: user.id, providerId: 'credential' }, select: { id: true } });
    if (credential) await db.account.update({ where: { id: credential.id }, data: { password: hashed } }); else await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
    await db.role.create({ data: { organizationId: w.organizationId, code: 'notification-browser-' + run, nameEn: 'Synthetic dashboard access', permissions: ['dashboard.read'], users: { connect: { id: user.id } } } });
    const originalRecords = await retained(); browser = await chromium.launch({ headless: true });
    for (const locale of ['en', 'fr']) {
      const row = { locale, passed: false, screenshots: [], viewports: [], errors: [] }; report.journeys.push(row);
      const title = locale === 'fr' ? 'Actualités des justificatifs' : 'Evidence updates', accepted = locale === 'fr' ? 'Réponse acceptée' : 'Evidence response accepted', refreshName = locale === 'fr' ? 'Actualiser les actualités' : 'Refresh updates';
      const errorText = locale === 'fr' ? 'Actualités indisponibles. Actualisez pour réessayer.' : 'Updates are unavailable. Refresh to try again.';
      const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200);
        const page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
        const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/close', { waitUntil: 'domcontentloaded' });
        const panel = page.getByRole('region', { name: title, exact: true }); await expect(panel).toHaveAttribute('aria-busy', 'false'); await expect(panel.getByText(accepted, { exact: true })).toBeVisible(); row.routeReadyMs = Date.now() - started;
        await expect(panel.getByText(w.requestId, { exact: true }).first()).toBeVisible();
        for (const width of [1440, 768, 320]) {
          await page.setViewportSize({ width, height: 1000 });
          // The surrounding workbench loads separately and can change page
          // height. Anchor a visible heading, not the whole oversized region.
          await expect(page.locator('section[aria-labelledby="close-evidence-title"]').getByRole('button', { name: locale === 'fr' ? 'Actualiser les justificatifs' : 'Refresh evidence', exact: true })).toBeEnabled();
          const heading = panel.getByRole('heading', { name: title, exact: true }); await heading.scrollIntoViewIfNeeded(); await expect(heading).toBeInViewport();
          const view = await panel.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(view.content <= view.width + 1 && view.pageWidth <= width + 1 && view.reducedMotion); row.viewports.push(view);
          const file = `close-notification-delivery-browser-${run}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file);
        }
        const refresh = panel.getByRole('button', { name: refreshName, exact: true }); await refresh.focus(); await expect(refresh).toBeFocused(); await page.keyboard.press('Enter'); await expect(panel.getByText(accepted, { exact: true })).toBeVisible(); row.keyboardRefresh = true;
        const fault = route => route.request().method() === 'POST' ? route.abort('failed') : route.continue();
        await page.route('**/dashboard/accounting/close', fault); await refresh.click(); await expect(panel.getByText(errorText, { exact: true })).toBeVisible(); assert.equal(await panel.getByText(accepted, { exact: true }).count(), 0); row.transportFailureClearsRows = true;
        await page.unroute('**/dashboard/accounting/close', fault); await refresh.click(); await expect(panel.getByText(accepted, { exact: true })).toBeVisible(); row.retryRecovered = true;
        assert.equal(await retained(), originalRecords); row.sourceRecordsUnchanged = true; row.passed = row.errors.length === 0;
      } catch (error) { row.error = f.safe(error, secrets); } finally { await context.close(); }
      console.log(JSON.stringify({ locale, passed: row.passed, error: row.error }));
    }
    const build = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/accounting/close/page.js'); report.build = { file: path.relative(root, build), sha256: sha(fs.readFileSync(build)) };
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    if (browser) await browser.close();
    try { report.listenerAfter = listener(); report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-notification-delivery-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
