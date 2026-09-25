/* Real isolated auth and read-only business baseline. Never prints fixture secrets. */
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../../..');
const load = createRequire(path.join(root, 'package.json'));
const { chromium, expect: baseExpect } = load('@playwright/test');
const expect = baseExpect.configure({ timeout: 60000 });
const { PrismaClient } = load('@prisma/client');
const helper = load('./scripts/modern-modules-local-verification.js');
const run = process.argv[2] ?? 'initial';
assert.ok(['initial', 'fr-retry'].includes(run));
const evidenceName = name => run === 'initial' ? name : name.replace(/(\.[^.]+)$/, '-fr-retry$1');
const target = helper.targetUrl();
assert.equal(decodeURIComponent(target.pathname.slice(1)), 'stoquify_local_modern_modules_20260905_01');
assert.ok(['localhost', '127.0.0.1', '::1', '[::1]'].includes(target.hostname));
const prisma = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
const sourcePaths = ['next.config.mjs', 'prisma/schema.prisma', 'scripts/modern-modules-local-verification.js', 'app/[locale]/(dashboard)/dashboard/page.tsx', 'app/[locale]/(dashboard)/dashboard/settings/modules/page.tsx', 'components/dashboard/EnhancedEnterpriseDashboard.tsx', 'components/modules/ModuleCompositionWorkbench.tsx', 'services/dashboard/dashboard-read-model.service.ts', 'services/modules/module-composition.service.ts', 'config/sidebar.ts', 'app/globals.css', 'messages/en.json', 'messages/fr.json'];
const stamps = () => sourcePaths.map(file => ({ path: file, sha256: crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex') }));
async function inventory() {
  return prisma.$transaction(async tx => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    assert.equal((await tx.$queryRawUnsafe('SELECT current_database() AS name'))[0].name, helper.DATABASE_NAME);
    const organizations = await tx.organization.findMany({ select: { id: true, onboardingSource: true, isActive: true, countryCode: true, currency: true, defaultLocale: true, deletedAt: true }, orderBy: { id: 'asc' } });
    assert.equal(organizations.length, helper.FIXTURES.length);
    assert.ok(organizations.every(item => item.onboardingSource === helper.FIXTURE_SOURCE && helper.FIXTURES.some(fixture => fixture.organizationId === item.id)));
    const result = [];
    for (const organization of organizations) {
      const where = { organizationId: organization.id };
      const users = await tx.user.findMany({ where, select: { id: true, isActive: true, isLocked: true, roles: { select: { code: true, permissions: true, organizationId: true } } }, orderBy: { id: 'asc' } });
      const configuration = await tx.tenantModuleConfiguration.findUnique({ where, select: { revision: true, activeRevision: true, selectedModules: true, activeModules: true, newWorkStoppedModules: true } });
      const grants = await tx.tenantModuleGrant.findMany({ where, select: { moduleSlug: true, status: true, readOnly: true, startsAt: true, endsAt: true }, orderBy: { moduleSlug: 'asc' } });
      const accounting = await tx.organizationAccountingSettings.findUnique({ where, select: { setupStatus: true, accountingEnabled: true } });
      const counts = {};
      for (const model of ['location', 'customer', 'supplier', 'item', 'salesOrder', 'purchaseOrder', 'journalEntry', 'payrollEmployee', 'paymentTransaction', 'providerAccount']) {
        if (!tx[model]?.count) throw new Error(`Count model unavailable: ${model}`);
        counts[model] = await tx[model].count({ where });
      }
      result.push({ organization, fixture: helper.FIXTURES.find(item => item.organizationId === organization.id).key, users, configuration, grants, accounting, counts });
    }
    return result;
  }, { timeout: 30000 });
}
async function main() {
  const credentials = helper.readPrivateFixture();
  const redact = value => String(value).replaceAll(credentials.password, '[redacted password]').replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted database]');
  const receipt = { startedAt: new Date().toISOString(), baseURL: helper.BASE_URL, database: helper.DATABASE_NAME, source: helper.FIXTURE_SOURCE, privateFixtureGuardPassed: true, productionApproval: false, businessMutationsRequested: false, externalBrowserRequestsAllowed: false, beforeSources: stamps(), cases: [], blockedExternalOrigins: [] };
  const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true }).trim();
  const status = git(['status', '--porcelain']);
  receipt.sourceState = { branch: git(['branch', '--show-current']), commit: git(['rev-parse', 'HEAD']), workingTreeEntries: status ? status.split(/\r?\n/).length : 0, workingTreeStatusSha256: crypto.createHash('sha256').update(status).digest('hex') };
  receipt.inventoryBefore = await inventory();
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {}) });
  try {
    for (const locale of (run === 'fr-retry' ? ['fr'] : ['en', 'fr'])) {
      const fixture = helper.FIXTURES.find(item => item.key === (locale === 'en' ? 'retailer_en_desktop' : 'retailer_fr_mobile'));
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: locale === 'en' ? 'en-GB' : 'fr-FR', reducedMotion: 'reduce' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin === helper.BASE_URL || ['data:', 'blob:', 'about:'].includes(url.protocol)) return route.continue();
        receipt.blockedExternalOrigins.push(url.origin); return route.abort('blockedbyclient');
      });
      const page = await context.newPage(); page.setDefaultNavigationTimeout(240000); page.setDefaultTimeout(30000);
      try {
        const signin = await context.request.post(`${helper.BASE_URL}/api/auth/sign-in/email`, { data: { email: fixture.email, password: credentials.password, rememberMe: false }, headers: { Origin: helper.BASE_URL }, timeout: 120000 });
        assert.equal(signin.status(), 200);
        const session = await context.request.get(`${helper.BASE_URL}/api/auth/get-session`);
        assert.equal((await session.json()).user.id, fixture.userId);
        for (const routeName of ['dashboard', 'modules']) {
          const item = { locale, route: routeName, fixture: fixture.key, errors: [], startedAt: new Date().toISOString() };
          const onError = error => item.errors.push({ message: redact(error.message), stack: redact(error.stack ?? '') }); page.on('pageerror', onError);
          try {
            const started = Date.now();
            const url = `${helper.BASE_URL}/${locale}/dashboard${routeName === 'modules' ? '/settings/modules' : ''}`;
            const response = await page.goto(url, { waitUntil: 'domcontentloaded' }); item.httpStatus = response.status();
            if (routeName === 'modules') await expect(page.getByTestId('module-composition-workbench')).toHaveAttribute('data-hydrated', 'true');
            else await expect(page.locator('.dashboard-landing-theme')).toBeVisible();
            await expect(page.locator('main h1').first()).toBeVisible();
            item.usefulResultMs = Date.now() - started;
            item.headings = await page.locator('main h1,main h2').allTextContents();
            item.alerts = (await page.getByRole('alert').allTextContents()).map(redact);
            item.navigation = await page.locator('aside,nav,[data-sidebar="sidebar"]').evaluateAll(elements => elements.map(element => ({ role: element.getAttribute('role'), label: element.getAttribute('aria-label'), text: element.textContent?.replace(/\s+/g, ' ').trim().slice(0, 1600), links: [...element.querySelectorAll('a[href]')].map(link => ({ label: link.textContent?.replace(/\s+/g, ' ').trim(), href: link.getAttribute('href') })) })));
            item.mainLinks = await page.locator('main a[href]').evaluateAll(links => links.map(link => ({ label: link.textContent?.replace(/\s+/g, ' ').trim(), href: link.getAttribute('href') })));
            await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
            await page.screenshot({ path: path.join(__dirname, evidenceName(`${locale}-${routeName}-desktop.png`)), animations: 'disabled', scale: 'css', fullPage: false });
            if (locale === 'fr') {
              await page.setViewportSize({ width: 390, height: 844 });
              await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
              await page.screenshot({ path: path.join(__dirname, evidenceName(`${locale}-${routeName}-mobile.png`)), animations: 'disabled', scale: 'css', fullPage: false });
              item.mobileOverflow = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
              await page.setViewportSize({ width: 1440, height: 1000 });
            }
            item.observed = true;
          } catch (error) { item.failure = redact(error.message); await page.screenshot({ path: path.join(__dirname, evidenceName(`${locale}-${routeName}-failure.png`)), animations: 'disabled', scale: 'css', fullPage: false }); }
          finally { page.off('pageerror', onError); item.completedAt = new Date().toISOString(); receipt.cases.push(item); }
        }
      } catch (error) { receipt.cases.push({ locale, fixture: fixture.key, stage: 'authentication', failure: redact(error.message) }); }
      finally { await context.close(); }
    }
  } finally { await browser.close(); }
  receipt.inventoryAfter = await inventory();
  receipt.businessAndAuthoritySnapshotUnchanged = JSON.stringify(receipt.inventoryBefore) === JSON.stringify(receipt.inventoryAfter);
  receipt.afterSources = stamps(); receipt.sourceStable = JSON.stringify(receipt.beforeSources) === JSON.stringify(receipt.afterSources);
  receipt.blockedExternalOrigins = [...new Set(receipt.blockedExternalOrigins)];
  receipt.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, evidenceName('environment-baseline.json')), JSON.stringify(receipt, null, 2) + '\n');
  const failures = receipt.cases.filter(item => item.failure || item.errors?.length).length;
  console.log(JSON.stringify({ observedCases: receipt.cases.filter(item => item.observed).length, failures, businessAndAuthoritySnapshotUnchanged: receipt.businessAndAuthoritySnapshotUnchanged, sourceStable: receipt.sourceStable, blockedExternalOrigins: receipt.blockedExternalOrigins }));
  if (failures) process.exitCode = 1;
}
main().catch(error => { console.error(String(error.message).replace(/postgres(?:ql)?:\/\/\S+/gi, '[redacted database]')); process.exitCode = 1; }).finally(() => prisma.$disconnect());
