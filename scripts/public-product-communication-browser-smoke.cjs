const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');

const phase = process.argv.includes('--before') ? 'before' : 'after';
const surfaceFilter = process.argv.find(arg => arg.startsWith('--surface='))?.split('=')[1];
const base = process.env.PUBLIC_COMMUNICATION_URL || 'http://127.0.0.1:3011';
const root = path.resolve('what-next/public-product-communication/2026-09-22');
const directory = path.join(root, phase + (surfaceFilter ? `-${surfaceFilter}` : ''));
fs.mkdirSync(directory, { recursive: true });
const results = { phase, base, capturedAt: new Date().toISOString(), pages: [], checks: [], accessibility: [], errors: [] };
const save = () => fs.writeFileSync(path.join(directory, 'browser-results.json'), JSON.stringify(results, null, 2));

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const locale of ['en', 'fr']) {
      for (const surface of ['home', 'workflows', 'login', 'register']) {
        if (surfaceFilter && surface !== surfaceFilter) continue;
        const route = `/${locale}${surface === 'home' ? '' : '/' + surface}`;
        for (const width of phase === 'before' ? [1440, 390] : [1440, 390, 320, 768]) {
          const context = await browser.newContext({ viewport: { width, height: width === 1440 ? 1100 : 900 }, reducedMotion: 'reduce', colorScheme: 'light' });
          await context.addInitScript(() => localStorage.setItem('theme', 'light'));
          const page = await context.newPage();
          const pageErrors = [];
          page.on('pageerror', error => pageErrors.push(error.message));
          page.setDefaultTimeout(20000);
          try {
            const response = await page.goto(base + route, { waitUntil: 'domcontentloaded', timeout: 240000 });
            await expect(page.locator('h1')).toBeVisible({ timeout: 60000 });
            // Public HTML arrives before the client bundle hydrates on a cold dev route.
            // Wait for that bundle before testing React-owned filters and validation.
            await page.waitForLoadState('networkidle', { timeout: 60000 });
            await page.evaluate(() => document.fonts.ready);
            const image = page.locator('[data-product-command-evidence] img');
            if (await image.count()) {
              await image.scrollIntoViewIfNeeded();
              await expect.poll(() => image.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
              await page.evaluate(() => scrollTo(0, 0));
            }
            const metrics = await page.evaluate(() => ({
              width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
              height: document.documentElement.scrollHeight, lang: document.documentElement.lang,
              h1: [...document.querySelectorAll('h1')].map(el => el.textContent),
              submitBottom: document.querySelector('button[type="submit"]')?.getBoundingClientRect().bottom,
              duplicateIds: [...document.querySelectorAll('[id]')].map(e => e.id).filter((id, i, ids) => ids.indexOf(id) !== i),
            }));
            const filename = `${locale}-${surface}-${width}.png`;
            await page.screenshot({ path: path.join(directory, filename), fullPage: true, animations: 'disabled' });
            results.pages.push({ route, width, status: response.status(), ...metrics, screenshot: filename, pageErrors });
            expect(response.status()).toBe(200);
            expect(metrics.scrollWidth).toBeLessThanOrEqual(width + 1);
            expect(metrics.h1).toHaveLength(1);
            expect(metrics.lang).toBe(locale);
            expect(metrics.duplicateIds).toEqual([]);
            expect(pageErrors).toEqual([]);
            if (phase === 'after') {
              if (surface === 'login') {
                expect(metrics.submitBottom).toBeLessThanOrEqual(900);
                await page.locator('button[type="submit"]').click();
                await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
                await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
              }
              if (surface !== 'workflows') await expect(page.locator(`a[href="/${locale}/workflows"]`).first()).toBeAttached();
              if (surface === 'workflows') {
                await page.locator('[data-workflow-atlas-role="purchasing"]').click();
                await expect(page.locator('[data-workflow-map-index] a')).toHaveCount(1);
                await expect(page.locator('[data-workflow-prerequisites]').last()).toBeVisible();
                const details = page.locator('#workflow-procureToPay details');
                await details.locator('summary').focus();
                await page.keyboard.press('Enter');
                await expect(details).toHaveAttribute('open', '');
                await expect(page.locator('#workflow-procureToPay [data-workflow-handoff]')).toBeVisible();
                await expect(page.locator('#workflow-procureToPay [data-workflow-atlas-step]')).toHaveCount(5);
                await page.screenshot({ path: path.join(directory, `${locale}-workflow-exploration-${width}.png`), fullPage: true });
              }
              if (surface === 'home') {
                const capabilities = page.locator('[data-capability-overview] details');
                expect(await capabilities.count()).toBeGreaterThanOrEqual(6);
                await capabilities.first().locator('summary').focus();
                await page.keyboard.press('Enter');
                await expect(capabilities.first()).toHaveAttribute('open', '');
              }
              results.checks.push({ route, width, status: 'passed', scope: 'Rendering, reflow, localized workflow links, keyboard disclosure/filter or login required-field validation, as applicable.' });
              if (width === 1440) {
                await page.addScriptTag({ path: require.resolve('axe-core') });
                const accessibility = await page.evaluate(async () => {
                  const report = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
                  return { violations: report.violations.map(({ id, impact, description, nodes }) => ({ id, impact, description, nodes: nodes.map(({ target, failureSummary }) => ({ target, failureSummary })) })), incomplete: report.incomplete.map(({ id }) => id) };
                });
                results.accessibility.push({ route, ...accessibility });
                expect(accessibility.violations).toEqual([]);
              }
            }
            console.log('PASS', phase, route, width);
          } catch (error) {
            results.errors.push({ route, width, message: error.message });
            console.log('FAIL', phase, route, width, error.message.slice(0, 300));
          } finally { save(); await context.close(); }
        }
      }
    }
  } finally { await browser.close(); save(); }
  if (results.errors.length) process.exitCode = 1;
}
main().catch(error => { results.errors.push({ message: error.message }); save(); console.error(error); process.exitCode = 1; });
