"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process'), { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const copies = require(path.join(root, 'components/accounting/accountant-work-desk-copy.ts')).accountantWorkDeskCopy;
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', expect = baseExpect.configure({ timeout: 60000 }), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), secrets = [];
  const product = ['services/accounting/accountant-notification-history.service.ts', 'services/accounting/accountant-work-desk.service.ts', 'components/accounting/AccountantNotificationHistory.tsx', 'components/accounting/AccountantWorkDesk.tsx', 'actions/accounting/accountant-work-desk.actions.ts', 'services/_shared/protect.ts', 'next.config.mjs'];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries([__filename, ...product.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: ['Owned synthetic client with real service acceptance and publication, not customer approval.', 'Scoped keyboard/reflow/reduced-motion checks; native assistive technology and true browser zoom remain.'] }; let w, browser;
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $cmd=(@($p.CommandLine,$q.CommandLine)-join ' '); [pscustomobject]@{pid=$p.ProcessId;address=$rows[0].LocalAddress;workspace=$cmd.ToLowerInvariant().Contains('${root.toLowerCase().replaceAll("'", "''")}');next=($cmd -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.pid, expected); assert.equal(value.address, '127.0.0.1'); assert.equal(value.workspace, true); assert.equal(value.next, true); return value;
  }
  const outside = async () => f.hash({ base: await h.outside(), accounts: await db.account.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }), sessions: await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) });
  const retained = async () => f.hash({ comments: await db.accountantComment.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }), outbox: await db.businessEventOutbox.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }) });
  try {
    report.listenerBefore = listener(); const name = process.env.STOQUIFY_CLOSE_BROWSER_RECEIPT, hash = process.env.STOQUIFY_CLOSE_BROWSER_SHA;
    assert.ok(/^close-delegated-history-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || '')); const bytes = fs.readFileSync(path.join(__dirname, name)); assert.equal(sha(bytes), hash); const previous = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(previous[flag], true);
    for (const file of product.slice(0, 2)) assert.equal(previous.sourceAfter[file], sha(fs.readFileSync(path.join(root, file))));
    w = previous.workDesk; assert.ok(w.clientOrganizationId.startsWith('workflow_close_write_') && w.homeOrganizationId.startsWith('workflow_close_write_')); h.organizations.push(w.clientOrganizationId, w.homeOrganizationId); report.predecessor = { name, sha256: hash };
    await helper.withClient(helper.targetUrl(), helper.assertOwned); report.sourceBefore = sources(); report.outsideBefore = await outside(); report.financialBefore = await h.financial();
    const password = 'Owned-history-browser-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed);
    const user = await db.user.update({ where: { id: w.actorId, organizationId: w.homeOrganizationId }, data: { password: hashed, emailVerified: true } });
    const credential = await db.account.findFirst({ where: { userId: user.id, accountId: user.id, providerId: 'credential' }, select: { id: true } });
    if (credential) await db.account.update({ where: { id: credential.id }, data: { password: hashed } }); else await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
    const originalRecords = await retained(); browser = await chromium.launch({ headless: true });
    for (const locale of ['en', 'fr']) {
      const t = copies[locale], text = locale === 'en' ? { open: 'Notification history:', title: 'Published notification history', accepted: 'Response accepted', refresh: 'Latest publications', close: 'Close notification history:', error: 'History could not be loaded. Retry with latest publications.' } : { open: 'Historique des notifications:', title: 'Historique des notifications publiées', accepted: 'Réponse acceptée', refresh: 'Dernières publications', close: 'Fermer l’historique des notifications:', error: 'Historique indisponible. Réessayez avec les dernières publications.' };
      const row = { locale, passed: false, screenshots: [], viewports: [], errors: [] }; report.journeys.push(row);
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200);
        const page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets))); const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/accountant-portfolio', { waitUntil: 'domcontentloaded' });
        const panel = page.getByRole('region', { name: t.title, exact: true }); await expect(panel.getByText(t.empty, { exact: true })).toBeVisible(); row.routeReadyMs = Date.now() - started;
        const trigger = panel.getByRole('button', { name: new RegExp('^' + text.open) }); await trigger.focus(); await expect(trigger).toBeFocused(); const historyStarted = Date.now(); await page.keyboard.press('Enter');
        const history = panel.getByRole('region', { name: text.title, exact: true }); await expect(history.getByText(text.accepted, { exact: true })).toHaveCount(2); row.historyReadyMs = Date.now() - historyStarted; await expect(history.getByRole('heading', { name: text.title })).toBeFocused(); row.acceptedHistoryAfterEmptyQueue = true;
        for (const width of [1440, 768, 320]) {
          await page.setViewportSize({ width, height: 1000 }); await history.getByRole('heading').scrollIntoViewIfNeeded();
          const view = await history.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(view.content <= view.width + 1 && view.pageWidth <= width + 1 && view.reducedMotion); row.viewports.push(view);
          await history.getByText(text.accepted, { exact: true }).first().scrollIntoViewIfNeeded(); const file = `close-delegated-history-browser-${run}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file);
        }
        const refresh = history.getByRole('button', { name: text.refresh, exact: true });
        await page.route('**/*', route => route.request().method() === 'POST' && route.request().headers()['next-action'] ? route.abort('failed') : route.fallback());
        await refresh.click(); await expect(history.getByText(text.error, { exact: true })).toBeVisible(); assert.equal(await history.getByText(text.accepted, { exact: true }).count(), 0); await page.unroute('**/*');
        await refresh.click(); await expect(history.getByText(text.accepted, { exact: true })).toHaveCount(2); row.transportFailureAndRetry = true;
        await panel.getByRole('button', { name: new RegExp('^' + text.close) }).click(); await expect(trigger).toBeFocused(); assert.equal(await panel.getByRole('region', { name: text.title }).count(), 0); await page.keyboard.press('Enter'); await expect(history.getByText(text.accepted, { exact: true })).toHaveCount(2); row.keyboardFocusReturn = true;
        const grant = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: w.grantId } }); await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: grant.grantedById } });
        try { await refresh.click(); await expect(panel.getByText(t.denied, { exact: true })).toBeVisible(); assert.equal(await panel.getByRole('region', { name: text.title }).count(), 0); assert.equal(await panel.getByText(text.accepted, { exact: true }).count(), 0); row.revocationClearsHistory = true; }
        finally { await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: grant.status, revokedAt: grant.revokedAt, revokedById: grant.revokedById } }); }
        await panel.getByRole('button', { name: t.refresh, exact: true }).click(); await trigger.click(); await expect(history.getByText(text.accepted, { exact: true })).toHaveCount(2); row.authorizedRecovery = true;
        assert.equal(await retained(), originalRecords); row.sourceRecordsUnchanged = true; row.passed = row.errors.length === 0;
      } catch (error) { row.error = f.safe(error, secrets); } finally { await context.close(); }
      console.log(JSON.stringify({ locale, passed: row.passed, error: row.error }));
    }
    const build = path.join(root, '.next-workflow-supplier/server/app/[locale]/(dashboard)/dashboard/accounting/accountant-portfolio/page.js'); report.build = { file: path.relative(root, build), sha256: sha(fs.readFileSync(build)) };
  } catch (error) { report.error = f.safe(error, secrets); }
  finally {
    if (browser) await browser.close();
    try { report.listenerAfter = listener(); report.sourceAfter = sources(); report.sourceStable = f.hash(report.sourceBefore) === f.hash(report.sourceAfter); report.outsideAfter = await outside(); report.outsideUnchanged = report.outsideBefore === report.outsideAfter; report.financialAfter = await h.financial(); report.financialUnchanged = f.hash(report.financialBefore) === f.hash(report.financialAfter); } catch (error) { report.finalizationError = f.safe(error, secrets); }
    await db.$disconnect(); report.passed = report.journeys.length === 2 && report.journeys.every(row => row.passed) && report.sourceStable && report.outsideUnchanged && report.financialUnchanged && !report.error && !report.finalizationError;
    const filename = path.join(__dirname, 'close-delegated-history-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
