process.env.PLAYWRIGHT_BROWSERS_PATH = 'C:/Users/J COMPUTER/AppData/Local/ms-playwright';
const pw = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const engine = process.argv[2];
assert.ok(['chrome', 'firefox', 'webkit'].includes(engine));
const out = path.join(__dirname, 'final-build-' + engine);
fs.mkdirSync(out, { recursive: true });
const currentMark = fs.readFileSync('components/global/stoquify-logo-artwork.ts', 'utf8').match(/STOQUIFY_MARK_PATH\s*=\s*"([^"]+)"/)[1];
const buildId = fs.readFileSync('.next-public-final-20261026/BUILD_ID', 'utf8').trim();
const routes = ['', '/products', ...['pos', 'inventory', 'finance', 'accounting', 'hris', 'payroll', 'payables', 'receivables'].map(x => '/products/' + x), ...['operations', 'finance', 'people'].map(x => '/offers/' + x), '/pricing', '/workflows', '/get-started', '/contact', '/login', '/register', '/forgot-password', '/privacy', '/terms'];
const resultPath = path.join(out, 'results.json');
const report = fs.existsSync(resultPath) ? JSON.parse(fs.readFileSync(resultPath, 'utf8')) : { buildId, engine, results: [], rateLimitWaits: [] };
assert.equal(report.buildId, buildId);
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2));
(async () => {
  const browser = await (engine === 'chrome' ? pw.chromium : pw[engine]).launch({ headless: true, ...(engine === 'chrome' ? { channel: 'chrome' } : {}) });
  try {
    for (const locale of ['en', 'fr']) for (const width of [1440, 390]) {
      const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', hasTouch: width === 390, ...(engine === 'firefox' ? {} : { isMobile: width === 390 }) });
      const page = await context.newPage();
      let current;
      page.on('pageerror', e => current?.errors.push(e.message));
      page.on('console', m => { if (/MISSING_MESSAGE|INVALID_MESSAGE|IntlError/.test(m.text())) current?.errors.push(m.text()); });
      try {
        for (const route of routes) {
          if (report.results.some(r => r.locale === locale && r.width === width && r.route === route && r.passed && r.brandSignatureVerified)) continue;
          report.results = report.results.filter(r => r.locale !== locale || r.width !== width || r.route !== route);
          current = { locale, width, route, errors: [] };
          report.results.push(current);
          await page.waitForTimeout(1000);
          let response;
          for (let attempt = 0; attempt < 3; attempt++) {
            response = await page.goto('http://localhost:4334/' + locale + route, { waitUntil: 'load', timeout: 120000 });
            if (response.status() !== 429) break;
            const seconds = Number(response.headers()['retry-after']);
            assert.ok(seconds > 0 && seconds <= 60);
            report.rateLimitWaits.push({ locale, width, route, seconds });
            await page.waitForTimeout(seconds * 1000 + 500);
          }
          assert.equal(response.status(), 200);
          current.status = response.status();
          const auth = ['/login', '/register', '/forgot-password'].includes(route);
          if (!auth) await page.locator('.cinematic-home.motion-ready').waitFor({ timeout: 60000 });
          else await page.locator(route === '/forgot-password' ? 'section[aria-labelledby="recovery-request-title"]' : '.auth-shell').waitFor({ timeout: 60000 });
          await page.evaluate(() => document.fonts.ready);
          assert.equal(await page.locator('html').getAttribute('lang'), locale);
          assert.ok((await page.title()).includes('Stoquify'));
          current.overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          assert.equal(current.overflow, 0);
          current.brandMarks = await page.locator('[role="img"][aria-label="Stoquify"]').count();
          assert.ok(current.brandMarks > 0);
          assert.equal(await page.locator('[role="img"][aria-label="Stoquify"] svg[viewBox="0 0 70 70"] path').first().getAttribute('d'), currentMark);
          current.brandSignatureVerified = true;
          current.brokenLoadedImages = await page.evaluate(() => [...document.images].filter(i => i.complete && i.currentSrc && i.naturalWidth === 0).map(i => i.currentSrc));
          assert.deepEqual(current.brokenLoadedImages, []);
          if (route === '') {
            await page.keyboard.press('Tab');
            assert.equal(await page.locator(':focus').getAttribute('href'), '#main');
            await page.waitForFunction(() => { const r = document.activeElement.getBoundingClientRect(); return r.top >= 0 && r.height > 0; }, undefined, { timeout: 5000 });
            await page.keyboard.press('Enter');
            assert.equal(await page.locator(':focus').getAttribute('id'), 'main');
            current.skipLinkTabAndActivation = true;
            for (const selector of ['.responsibility-teams', '.firm-workflow']) {
              const group = page.locator(selector);
              assert.equal(await group.getAttribute('role'), 'group');
              assert.ok((await group.getAttribute('aria-label')).length > 0);
              assert.ok((await group.ariaSnapshot()).includes('group'));
            }
            assert.equal(await page.locator('.workflow-module-select option').count(), 23);
            assert.equal(await page.locator('.catalog-panel').count(), 18);
            await page.addScriptTag({ path: require.resolve('axe-core') });
            current.accessibility = [];
            for (const theme of ['default', 'alternate']) {
              if (theme === 'alternate') await page.locator('.theme-toggle').first().click();
              const result = await page.evaluate(async () => {
                const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } });
                return { violations: r.violations.map(v => v.id), incomplete: r.incomplete.map(v => v.id) };
              });
              assert.deepEqual(result.violations, []);
              assert.ok(!result.incomplete.includes('aria-prohibited-attr'));
              current.accessibility.push({ theme, ...result });
            }
            current.namedGroupsVerified = true;
            await page.screenshot({ path: path.join(out, `${locale}-${width}-home.png`) });
          }
          if (width === 390) {
            await page.setViewportSize({ width: 320, height: 900 });
            current.overflow320 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            assert.equal(current.overflow320, 0);
            await page.setViewportSize({ width, height: 900 });
          }
          assert.deepEqual(current.errors, []);
          current.passed = true;
          save();
          console.log(JSON.stringify({ engine, locale, width, route, passed: true }));
        }
      } finally { await context.close(); }
    }
  } finally { save(); await browser.close(); }
  assert.equal(report.results.length, 88);
  assert.ok(report.results.every(x => x.passed));
})().catch(error => { console.error(error); process.exitCode = 1; });
