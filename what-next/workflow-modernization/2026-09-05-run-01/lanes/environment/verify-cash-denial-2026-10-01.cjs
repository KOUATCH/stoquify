// Explicitly owned local denial journeys. No migrations, domain commands or external delivery.
if (!process.argv.includes('--run')) throw new Error('Use --run after reviewing the local server and database guards');
const f = require('./statement-recipient-fixtures.cjs');
const { db, fs, path, crypto, assert, helper, root } = f;
const { execFileSync } = require('node:child_process');
const { chromium, expect: baseExpect } = require('@playwright/test');
const { hashPassword } = require(path.join(root, 'lib/password.ts'));
const expect = baseExpect.configure({ timeout: 60000 });
const base = 'http://127.0.0.1:3110', run = crypto.randomUUID(), secrets = [], organizationIds = [];
const files = [
  'components/dashboard/DashboardRouteState.tsx',
  'app/[locale]/(dashboard)/dashboard/finance/finance-route-access.tsx',
  'app/[locale]/(dashboard)/dashboard/finance/finance-route-data-access.ts',
  'app/[locale]/(dashboard)/dashboard/finance/cash-command/page.tsx',
  'app/[locale]/(dashboard)/dashboard/layout.tsx',
  'services/cash-command/cash-command.service.ts',
  'services/operating-access/operating-access-scope-contracts.ts',
  'lib/security/rbac.ts', 'lib/dashboard/presentation.ts',
  'messages/dashboard-shared/en.json', 'messages/dashboard-shared/fr.json',
  'app/globals.css',
  'what-next/workflow-modernization/2026-09-05-run-01/lanes/environment/verify-cash-denial-2026-10-01.cjs',
];
const sha = value => crypto.createHash('sha256').update(value).digest('hex');
const sources = () => Object.fromEntries(files.map(file => [file, sha(fs.readFileSync(path.join(root, file)))]));
const report = {
  run, at: new Date().toISOString(), sourceBefore: sources(), views: [],
  scope: 'Actual authenticated local EN/FR Cash route-permission and organization-authority denial. Synthetic users and organizations only. No financial writes, external messages, migration or production action.',
  browserZoom: { status: 'not_run', reason: 'CSS text enlargement is separately reported; no verified native browser zoom mechanism is assumed.' },
  nativeScreenReader: { status: 'not_run' },
};
let browser, page;

function verifyServer() {
  const command = `$ErrorActionPreference='Stop'; $rows=@(Get-NetTCPConnection -LocalPort 3110 -State Listen); if($rows.Count -ne 1){throw 'Expected one owned listener'}; $listener=$rows[0]; $process=Get-CimInstance Win32_Process -Filter ('ProcessId='+$listener.OwningProcess); $parent=Get-CimInstance Win32_Process -Filter ('ProcessId='+$process.ParentProcessId); $commands=(@($process.CommandLine,$parent.CommandLine) -join ' '); [pscustomobject]@{address=$listener.LocalAddress;pid=$process.ProcessId;parentPid=$parent.ProcessId;workspaceMatches=$commands.ToLowerInvariant().Contains('${root.toLowerCase().replaceAll("'", "''")}');nextDevelopmentCommand=($commands -match 'next.+dev.+-p.+3110')} | ConvertTo-Json -Compress`;
  const state = JSON.parse(execFileSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { encoding: 'utf8', windowsHide: true, timeout: 30000 }).trim());
  assert.equal(state.address, '127.0.0.1'); assert.equal(state.workspaceMatches, true); assert.equal(state.nextDevelopmentCommand, true);
  return state;
}

const financialModels = ['payment', 'journalEntry', 'ledgerPostingBatch', 'accountingSourceLink', 'inventoryTransaction', 'purchaseOrder', 'supplierInvoice', 'supplierPayment', 'payrollEmployeeBalanceCase', 'closeRun'];
async function fingerprints(outside) {
  const where = { organizationId: outside ? { notIn: organizationIds } : { in: organizationIds } };
  const records = {};
  for (const model of financialModels) records[model] = { hash: f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } })) };
  if (outside) {
    records.organizations = { hash: f.hash(await db.organization.findMany({ where: { id: { notIn: organizationIds } }, orderBy: { id: 'asc' } })) };
    for (const model of ['user', 'role']) records[model] = { hash: f.hash(await db[model].findMany({ where, orderBy: { id: 'asc' } })) };
  }
  return records;
}

async function fixture() {
  const id = 'workflow_cash_denial_' + run; organizationIds.push(id);
  await db.organization.create({ data: { id, name: helper.prefix + 'Cash denial ' + run, slug: 'cash-denial-' + run, currency: 'XAF', country: 'CM', defaultLocale: 'EN' } });
  const actors = {};
  for (const [kind, permissions] of [['route', ['purchases.orders.read']], ['authority', ['finance.read']]]) {
    const password = 'Owned-denial-' + crypto.randomUUID() + '!'; secrets.push(password);
    const passwordHash = await hashPassword(password);
    const user = await db.user.create({ data: { organizationId: id, email: kind + '-' + run + '@example.invalid', name: 'Owned denial reader', password: passwordHash, isActive: true, isVerified: true, emailVerified: true } });
    await db.account.create({ data: { userId: user.id, accountId: user.id, providerId: 'credential', password: passwordHash } });
    await db.role.create({ data: { organizationId: id, code: 'cash-denial-' + kind, nameEn: 'Owned scope-limited Cash reader', nameFr: 'Lecteur de test à portée limitée', permissions, users: { connect: { id: user.id } } } });
    actors[kind] = { id: user.id, email: user.email, password };
  }
  report.organizationId = id;
  return actors;
}

async function inspectLayout(content) {
  return content.evaluate(root => {
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const clipped = [...root.querySelectorAll('h1,p,a,button')].filter(visible).filter(node => {
      const box = node.getBoundingClientRect(), walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
      let text;
      while ((text = walker.nextNode())) {
        if (!text.textContent.trim()) continue;
        const range = document.createRange(); range.selectNodeContents(text);
        if ([...range.getClientRects()].some(rect => rect.width && (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1))) return true;
      }
      return false;
    }).map(node => node.textContent.trim().slice(0, 180));
    return { viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, contentWidth: root.clientWidth, contentScrollWidth: root.scrollWidth,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, clippedText: clipped };
  });
}

async function journey(actor, kind, locale, width) {
  const result = { kind, locale, width, screenshots: [], pageErrors: [], states: [] }; report.views.push(result);
  const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', locale: locale === 'fr' ? 'fr-FR' : 'en-GB', timezoneId: 'UTC' });
  context.setDefaultNavigationTimeout(180000); context.setDefaultTimeout(60000);
  await context.route('**/*', route => new URL(route.request().url()).origin === base ? route.continue() : route.abort());
  try {
    const login = await context.request.post(base + '/api/auth/sign-in/email', { headers: { Origin: base }, data: { email: actor.email, password: actor.password }, timeout: 60000, maxRedirects: 0 });
    assert.equal(login.status(), 200, 'Owned sign-in must succeed');
    page = await context.newPage(); page.on('pageerror', error => result.pageErrors.push(f.safe(error, secrets)));
    const started = Date.now(), response = await page.goto(base + '/' + locale + '/dashboard/finance/cash-command', { waitUntil: 'domcontentloaded' });
    const title = kind === 'route'
      ? locale === 'fr' ? 'Le pilotage de la trésorerie n’est pas accessible à votre rôle' : 'Cash Command Intelligence is not available for this role'
      : locale === 'fr' ? 'Le pilotage de la trésorerie exige une autorisation pour toute l’organisation' : 'Cash Command requires organization-wide authority';
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible(); result.observedRouteMs = Date.now() - started;
    const content = page.locator('.dashboard-landing-content'); await expect(content).toHaveCount(1);
    assert.equal(await page.getByRole('main').count(), 1); assert.equal(await content.locator('h1').count(), 1);
    await expect(page.getByRole('heading', { name: /Cash command brief|Synthèse de trésorerie/ })).toHaveCount(0);
    await expect(content.getByRole('button')).toHaveCount(0);
    const html = await response.text();
    result.serializedCashMarkers = ['cash_collected', 'unreconciled_cash', 'sourceRestrictions', 'commandBrief'].filter(marker => html.includes(marker));
    assert.deepEqual(result.serializedCashMarkers, [], 'Denied HTML must not serialize the Cash read model');
    result.oneMainAndHeading = true; result.noCashReadModel = true;
    const link = content.getByRole('link', { name: locale === 'fr' ? 'Retour au tableau de bord' : 'Back to dashboard', exact: true });
    await expect(link).toHaveAttribute('href', '/' + locale + '/dashboard');
    await page.addScriptTag({ path: require.resolve('axe-core') });
    result.scan = await page.evaluate(async () => {
      const scan = await window.axe.run('.dashboard-landing-content', { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
      const summarize = rows => rows.map(row => ({ id: row.id, impact: row.impact, nodes: row.nodes.map(node => ({ target: node.target, html: node.html })) }));
      return { violations: summarize(scan.violations), incomplete: summarize(scan.incomplete) };
    });
    assert.deepEqual(result.scan.violations, []);
    for (const scale of [1, 2]) {
      const rules = scale === 2 ? await content.evaluate(root => [...root.querySelectorAll('*')].map((node, index) => {
        const style = getComputedStyle(node); node.setAttribute('data-owned-denial-text', String(index));
        return `[data-owned-denial-text="${index}"]{font-size:${parseFloat(style.fontSize) * 2}px!important;line-height:${style.lineHeight === 'normal' ? 'normal' : parseFloat(style.lineHeight) * 2 + 'px'}!important;}`;
      }).join('\n')) : null;
      const style = rules ? await page.addStyleTag({ content: rules }) : null;
      // Tab away and back through the actual link, then inspect keyboard-visible focus.
      await link.focus(); await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Tab'); await expect(link).toBeFocused();
      assert.equal(await link.evaluate(node => node.matches(':focus-visible')), true);
      const metrics = await inspectLayout(content); assert.ok(metrics.documentWidth <= metrics.viewport + 1); assert.ok(metrics.contentScrollWidth <= metrics.contentWidth + 1);
      assert.deepEqual(metrics.clippedText, []); assert.equal(metrics.reducedMotion, true);
      result.states.push({ textScale: scale, ...metrics, keyboardFocusVisible: true });
      const file = `cash-denial-${run}-${kind}-${locale}-${width}-text${scale}.png`;
      await page.screenshot({ path: path.join(__dirname, file), fullPage: true, animations: 'disabled' });
      result.screenshots.push({ file, sha256: sha(fs.readFileSync(path.join(__dirname, file))) });
      if (style) await style.evaluate(node => node.remove());
    }
    await link.focus(); await page.keyboard.press('Enter');
    await page.waitForURL(url => url.pathname === '/' + locale + '/dashboard', { waitUntil: 'domcontentloaded', timeout: 180000 });
    result.keyboardReturnPath = new URL(page.url()).pathname;
    assert.deepEqual(result.pageErrors, []); result.passed = true;
    console.log(`${kind}/${locale}/${width}: verified`);
  } catch (error) {
    result.error = f.safe(error, secrets); result.passed = false;
    if (page && !page.isClosed()) {
      const file = `cash-denial-${run}-${kind}-${locale}-${width}-failed.png`;
      await page.screenshot({ path: path.join(__dirname, file), fullPage: true, animations: 'disabled' }).then(() => result.screenshots.push({ file, sha256: sha(fs.readFileSync(path.join(__dirname, file))) })).catch(() => {});
    }
    throw error;
  } finally { await context.close(); }
}

async function main() {
  report.serverBefore = verifyServer();
  await helper.withClient(f.target, helper.assertOwned);
  report.database = helper.database; report.outsideBefore = await fingerprints(true);
  const actors = await fixture(); report.financialBefore = await fingerprints(false);
  browser = await chromium.launch({ headless: true });
  for (const kind of ['route', 'authority']) for (const locale of ['en', 'fr']) for (const width of [320, 768, 1440]) await journey(actors[kind], kind, locale, width);
  report.serverAfter = verifyServer(); assert.deepEqual(report.serverAfter, report.serverBefore);
  report.passed = true;
}

main().catch(async error => {
  report.passed = false; report.error = f.safe(error, secrets); process.exitCode = 1;
  if (page && !page.isClosed()) await page.screenshot({ path: path.join(__dirname, `cash-denial-${run}-failed.png`), fullPage: true }).catch(() => {});
}).finally(async () => {
  await browser?.close();
  try {
    if (report.financialBefore) {
      report.financialAfter = await fingerprints(false); assert.deepEqual(report.financialAfter, report.financialBefore); report.noFinancialMutations = true;
    }
    if (report.outsideBefore) {
      report.outsideAfter = await fingerprints(true); assert.deepEqual(report.outsideAfter, report.outsideBefore); report.outsideFixtureUnchanged = true;
    }
  } catch (error) { report.passed = false; report.integrityError = f.safe(error, secrets); }
  report.sourceAfter = sources(); report.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.passed = !!report.passed && report.sourceStable; if (!report.passed) process.exitCode = 1;
  const file = `cash-denial-${run}.json`, output = path.join(__dirname, file);
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ file, passed: report.passed, error: report.error, sha256: sha(fs.readFileSync(output)) }));
  await db.$disconnect();
});
