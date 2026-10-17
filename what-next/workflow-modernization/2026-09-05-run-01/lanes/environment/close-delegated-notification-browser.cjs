"use strict";
async function main() {
  const h = require('./close-pack-write-race-runtime.cjs'), { f, db, root, helper } = h, { fs, path, crypto, assert } = f;
  const { chromium, expect: baseExpect } = require('@playwright/test'), { execFileSync } = require('node:child_process'), { hashPassword } = require(path.join(root, 'lib/password.ts'));
  const copies = require(path.join(root, 'components/accounting/accountant-work-desk-copy.ts')).accountantWorkDeskCopy;
  const run = crypto.randomUUID(), base = 'http://127.0.0.1:3110', expect = baseExpect.configure({ timeout: 60000 }), sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), secrets = [];
  const product = ['services/accounting/accountant-work-desk.service.ts', 'services/accounting/accountant-work-desk.contracts.ts', 'components/accounting/AccountantWorkDesk.tsx', 'components/accounting/accountant-work-desk-copy.ts', 'actions/accounting/accountant-work-desk.actions.ts', 'services/accounting/close-evidence-recipient.service.ts', 'services/accounting/close-evidence-resolution-records.ts', 'services/_shared/protect.ts', 'next.config.mjs'];
  const sources = () => ({ ...h.sources(), ...Object.fromEntries([__filename, ...product.map(file => path.join(root, file))].map(file => [path.relative(root, file).replaceAll('\\', '/'), sha(fs.readFileSync(file))])) });
  const report = { run, at: new Date().toISOString(), journeys: [], limitations: ['Owned synthetic client, actual in-app publication and synthetic lost-acknowledgement outbox state. No external transmission or real customer mandate.', 'Scoped keyboard/reflow checks, not accessibility or production performance certification.'] }; let w, browser;
  function listener() {
    const expected = Number(process.env.STOQUIFY_CLOSE_BROWSER_PID); assert.ok(Number.isSafeInteger(expected) && expected > 0);
    const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one listener'}; $p=Get-CimInstance Win32_Process -Filter ('ProcessId='+$rows[0].OwningProcess); $q=Get-CimInstance Win32_Process -Filter ('ProcessId='+$p.ParentProcessId); $cmd=(@($p.CommandLine,$q.CommandLine)-join ' '); [pscustomobject]@{pid=$p.ProcessId;address=$rows[0].LocalAddress;workspace=$cmd.ToLowerInvariant().Contains('${root.toLowerCase().replaceAll("'", "''")}');next=($cmd -match 'next.+dev.+-p.+3110')}|ConvertTo-Json -Compress`;
    const value = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
    assert.equal(value.pid, expected); assert.equal(value.address, '127.0.0.1'); assert.equal(value.workspace, true); assert.equal(value.next, true); return value;
  }
  function predecessor() {
    const name = process.env.STOQUIFY_CLOSE_BROWSER_RECEIPT, hash = process.env.STOQUIFY_CLOSE_BROWSER_SHA;
    assert.ok(/^close-delegated-notification-[a-f0-9-]{36}\.json$/.test(name || '')); assert.ok(/^[a-f0-9]{64}$/.test(hash || ''));
    const bytes = fs.readFileSync(path.join(__dirname, name)); assert.equal(sha(bytes), hash); const record = JSON.parse(bytes);
    for (const flag of ['passed', 'sourceStable', 'outsideUnchanged', 'financialUnchanged']) assert.equal(record[flag], true);
    for (const file of [product[0], product[5], product[6]]) assert.equal(record.sourceAfter[file], sha(fs.readFileSync(path.join(root, file))));
    w = record.workDesk; assert.ok(w.clientOrganizationId.startsWith('workflow_close_write_')); assert.ok(w.homeOrganizationId.startsWith('workflow_close_write_')); h.organizations.push(w.clientOrganizationId, w.homeOrganizationId); report.predecessor = { name, sha256: hash, workDesk: w };
  }
  const outside = async () => f.hash({ base: await h.outside(), accounts: await db.account.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }), sessions: await db.session.findMany({ where: { user: { organizationId: { notIn: h.organizations } } }, orderBy: { id: 'asc' } }) });
  const retained = async () => f.hash({ comments: await db.accountantComment.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }), inbox: await db.closeEvidenceNotification.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }), outbox: await db.businessEventOutbox.findMany({ where: { organizationId: w.clientOrganizationId }, orderBy: { id: 'asc' } }) });
  try {
    report.listenerBefore = listener(); predecessor(); await helper.withClient(helper.targetUrl(), helper.assertOwned);
    report.sourceBefore = sources(); report.outsideBefore = await outside(); report.financialBefore = await h.financial();
    const password = 'Owned-delegated-browser-' + crypto.randomUUID() + '!', hashed = await hashPassword(password); secrets.push(password, hashed);
    const user = await db.user.update({ where: { id: w.actorId, organizationId: w.homeOrganizationId }, data: { password: hashed, emailVerified: true } });
    const credential = await db.account.findFirst({ where: { userId: user.id, accountId: user.id, providerId: 'credential' }, select: { id: true } });
    if (credential) await db.account.update({ where: { id: credential.id }, data: { password: hashed } }); else await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: hashed } });
    const originalRecords = await retained(); browser = await chromium.launch({ headless: true });
    for (const locale of ['en', 'fr']) {
      const t = copies[locale], row = { locale, passed: false, screenshots: [], viewports: [], errors: [] }; report.journeys.push(row);
      const context = await browser.newContext({ viewport: { width: locale === 'fr' ? 320 : 1440, height: 1000 }, locale: locale === 'fr' ? 'fr-FR' : 'en-GB', reducedMotion: 'reduce' }); context.setDefaultTimeout(60000); context.setDefaultNavigationTimeout(180000);
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
        const login = await context.request.post(base + '/api/auth/sign-in/email', { data: { email: user.email, password }, headers: { Origin: base }, timeout: 180000 }); assert.equal(login.status(), 200);
        const page = await context.newPage(); page.on('pageerror', error => row.errors.push(f.safe(error, secrets)));
        const started = Date.now(); await page.goto(base + '/' + locale + '/dashboard/accounting/accountant-portfolio', { waitUntil: 'domcontentloaded' });
        const panel = page.getByRole('region', { name: t.title, exact: true }); await expect(panel).toHaveAttribute('aria-busy', 'false'); row.routeReadyMs = Date.now() - started;
        const response = panel.getByRole('listitem').filter({ hasText: t.responseNotification + ': ' + t.delivery.FAILED });
        await expect(response.getByText(t.publicationHelp, { exact: true })).toBeVisible(); await expect(panel.getByText(t.awaiting, { exact: true })).toBeVisible();
        assert.equal(await panel.getByText(t.partial, { exact: true }).count(), 0); row.recoveredPendingVisible = true; row.failedAcknowledgementRetainsPublication = true;
        for (const width of [1440, 768, 320]) {
          await page.setViewportSize({ width, height: 1000 }); const heading = panel.getByRole('heading', { name: t.title, exact: true }); await heading.scrollIntoViewIfNeeded(); await expect(heading).toBeInViewport();
          const view = await panel.evaluate(element => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, width: element.clientWidth, content: element.scrollWidth, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches })); assert.ok(view.content <= view.width + 1 && view.pageWidth <= width + 1 && view.reducedMotion); row.viewports.push(view);
          const publication = response.getByText(t.publicationHelp, { exact: true }); await publication.scrollIntoViewIfNeeded(); await expect(publication).toBeInViewport();
          const file = `close-delegated-notification-browser-${run}-${locale}-${width}.png`; await page.screenshot({ path: path.join(__dirname, file), animations: 'disabled' }); row.screenshots.push(file);
        }
        const refresh = panel.getByRole('button', { name: t.refresh, exact: true }); await refresh.focus(); await expect(refresh).toBeFocused(); await page.keyboard.press('Enter'); await expect(panel).toHaveAttribute('aria-busy', 'false'); await expect(response.getByText(t.publicationHelp, { exact: true })).toBeVisible(); row.keyboardRefresh = true;
        const grant = await db.accountantAccessGrant.findUniqueOrThrow({ where: { id: w.grantId } });
        await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: 'REVOKED', revokedAt: new Date(), revokedById: grant.grantedById } });
        try { await refresh.click(); await expect(panel).toHaveAttribute('aria-busy', 'false'); await expect(panel.getByText(t.empty, { exact: true })).toBeVisible(); assert.equal(await panel.getByText(t.publicationHelp, { exact: true }).count(), 0); row.revokedMandateClearsPublications = true; }
        finally { await db.accountantAccessGrant.update({ where: { id: grant.id }, data: { status: grant.status, revokedAt: grant.revokedAt, revokedById: grant.revokedById } }); }
        await refresh.click(); await expect(response.getByText(t.publicationHelp, { exact: true })).toBeVisible(); row.restoredMandateRecovers = true;
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
    const filename = path.join(__dirname, 'close-delegated-notification-browser-' + run + '.json'); fs.writeFileSync(filename, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' }); console.log(JSON.stringify({ filename, passed: report.passed, error: report.error }));
  }
  return report;
}
if (require.main === module && process.argv[2] === '--run') main().then(report => process.exit(report.passed ? 0 : 1)).catch(error => { console.error(error.code || error.name); process.exit(1); });
