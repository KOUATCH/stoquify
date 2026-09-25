#!/usr/bin/env node
// Local-only public-page evidence. Registration is never submitted to a real backend.
const fs = require('fs');
const path = require('path');
const { chromium, expect } = require('@playwright/test');
const base = process.env.LANDING_MESSAGE_BASE_URL || 'http://127.0.0.1:3010';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('Use a local app server.');
const out = path.resolve('docs/landing-message/verification-2026-09-19');
const shots = path.resolve('docs/landing-message/screenshots/after-2026-09-19');
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(shots, { recursive: true });
const initialResults = { started: new Date().toISOString(), base, checks: [], pages: [], limitations: ['No new account or business record is created.', 'No real email verification or password-reset email is requested. Those transitions are covered by isolated component/service tests.'] };
const reflowOnly = process.argv.includes('--reflow-only');
const results = reflowOnly ? JSON.parse(fs.readFileSync(path.join(out, 'browser-results.json'), 'utf8')) : initialResults;
if (reflowOnly) {
  if (!fs.existsSync(path.join(out, 'browser-original-css-zoom-results.json'))) fs.copyFileSync(path.join(out, 'browser-results.json'), path.join(out, 'browser-original-css-zoom-results.json'));
  results.reflowReview = { started: new Date().toISOString(), reason: 'CSS zoom scales content without emulating responsive viewport breakpoints. Recheck equivalent layout widths; preserve the original diagnostic.' };
  for (const item of results.checks.filter(item => item.name.includes('CSS-zoom'))) {
    item.originalStatus = item.status;
    item.status = 'SUPERSEDED';
    item.supersededBy = 'Keyboard focus and 320px / 720px reflow';
  }
}
function save() { fs.writeFileSync(path.join(out, 'browser-results.json'), JSON.stringify(results, null, 2)); }
async function check(name, fn) {
  if (reflowOnly && results.checks.some(item => item.name === name)) {
    results.reflowReview.rechecked ??= [];
    results.reflowReview.rechecked.push(...results.checks.filter(item => item.name === name));
    results.checks = results.checks.filter(item => item.name !== name);
  }
  try { const detail = await fn(); results.checks.push({ name, status: 'PASS', detail }); console.log(`PASS ${name}`); }
  catch (error) { results.checks.push({ name, status: 'FAIL', error: error.message.slice(0, 1600) }); console.log(`FAIL ${name}: ${error.message.slice(0, 300)}`); }
  save();
}
async function visit(page, route, form = false) {
  const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  expect(response.status()).toBe(200);
  await page.waitForLoadState('load', { timeout: 120000 });
  await expect(page.locator('h1')).toHaveCount(1);
  if (form) await expect(page.locator('form button').last()).toBeEnabled({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  return response;
}
async function geometry(page) {
  return page.evaluate(() => ({ viewport: innerWidth, width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, lang: document.documentElement.lang, h1: document.querySelector('h1')?.textContent, formTop: document.querySelector('form')?.getBoundingClientRect().top, submitBottom: document.querySelector('button[type="submit"]')?.getBoundingClientRect().bottom }));
}
async function main() {
  save();
  if (!reflowOnly) for (const route of ['/en', '/en/login', '/en/register', '/en/forgot-password', '/en/workflows']) {
    const response = await fetch(`${base}${route}`, { signal: AbortSignal.timeout(240000) });
    await response.arrayBuffer();
    if (response.status !== 200) throw new Error(`Preflight ${route}: HTTP ${response.status}`);
    console.log(`READY ${route}`);
  }
  const browser = await chromium.launch({ headless: true });
  try {
    if (!reflowOnly) for (const locale of ['en', 'fr']) for (const [device, viewport] of Object.entries({ desktop: { width: 1440, height: 1100 }, mobile: { width: 390, height: 844 } })) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce', colorScheme: 'light' });
      await context.addInitScript(() => localStorage.setItem('theme', 'light'));
      const page = await context.newPage();
      page.setDefaultTimeout(15000);
      let errors = [];
      page.on('pageerror', error => errors.push(error.message));
      for (const [id, route] of [['public-home', `/${locale}`], ['login', `/${locale}/login`], ['register', `/${locale}/register`]]) {
        await check(`${locale}/${device}/${id}: render, localization, reflow and screenshots`, async () => {
          errors = [];
          await visit(page, route, id !== 'public-home');
          if (id === 'public-home') {
            // Explicitly load the below-fold lazy image before capturing it; decode alone can wait forever.
            const productImage = page.locator('[data-product-command-evidence] img');
            await productImage.scrollIntoViewIfNeeded();
            await expect.poll(() => productImage.evaluate(img => img.complete && img.naturalWidth > 0), { timeout: 60000 }).toBe(true);
            await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
          }
          const metrics = await geometry(page);
          expect(metrics.lang).toBe(locale);
          expect(metrics.width).toBeLessThanOrEqual(viewport.width + 1);
          expect(metrics.h1).toContain(locale === 'fr' ? (id === 'login' ? 'Se connecter' : id === 'register' ? 'Créer' : 'Gardez') : (id === 'login' ? 'Sign in' : id === 'register' ? 'Create' : 'Keep'));
          if (id === 'login') expect(metrics.submitBottom).toBeLessThanOrEqual(viewport.height);
          const basename = `${id}${locale === 'fr' ? '-fr' : ''}-${device}`;
          await page.screenshot({ path: path.join(shots, `${basename}.png`), fullPage: true, animations: 'disabled' });
          await page.screenshot({ path: path.join(shots, `${basename}-viewport.png`), animations: 'disabled' });
          results.pages.push({ route, device, ...metrics, screenshot: `screenshots/after-2026-09-19/${basename}.png`, pageErrors: [...errors] });
          expect(errors).toEqual([]);
          return metrics;
        });
        if (id === 'public-home') await check(`${locale}/${device}: navigation, mobile menu and adoption disclosure`, async () => {
          const menu = page.locator('[data-landing-mobile-menu]');
          const nav = page.locator(`[data-landing-nav="${device}"]`);
          for (const anchor of ['problem', 'workflow', 'product', 'pricing']) {
            if (device === 'mobile') await menu.locator('summary').click();
            await nav.locator(`a[href$="#${anchor}"]`).click();
            await expect(page).toHaveURL(new RegExp(`#${anchor}$`), { timeout: 60000 });
            await expect(nav.locator(`a[href$="#${anchor}"]`)).toHaveAttribute('aria-current', 'location');
            if (device === 'mobile') await expect(menu).not.toHaveAttribute('open', '');
          }
          await page.locator('[data-adoption-details] > summary').click();
          await expect(page.locator('[data-adoption-details]')).toHaveAttribute('open', '');
          const tabs = page.locator('[data-adoption-details] [role="tab"]');
          if (await tabs.count()) {
            await tabs.first().focus(); await page.keyboard.press('ArrowRight');
            await expect(tabs.nth(1)).toBeFocused();
            await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
          }
          await page.locator('[data-adoption-details] > summary').click();
          await page.locator('#overview a[href$="/register"]').click();
          await expect(page).toHaveURL(new RegExp(`/${locale}/register$`), { timeout: 60000 });
          return 'Four anchors and scrollspy, menu closure, keyboard adoption tabs, real create-account destination.';
        });
        if (id === 'login') {
          await check(`${locale}/${device}: login validation, password visibility, links and theme`, async () => {
            await page.locator('button[type="submit"]').click();
            await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true');
            await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true');
            expect(await page.locator('#email').getAttribute('aria-describedby')).toBe('login-email-error');
            const visibility = page.locator('form button[type="button"]');
            await visibility.click(); await expect(page.locator('#password')).toHaveAttribute('type', 'text');
            await visibility.click(); await expect(page.locator('#password')).toHaveAttribute('type', 'password');
            await expect(page.locator(`a[href="/${locale}/forgot-password"]`)).toHaveCount(1);
            await expect(page.locator(`a[href="/${locale}/register"]`)).toHaveCount(1);
            await page.locator('header button').click(); await expect(page.locator('html')).toHaveClass(/dark/);
            await page.screenshot({ path: path.join(shots, `login-${locale}-${device}-dark-validation.png`), fullPage: true });
            return 'Required errors are linked to fields; password toggles; localized recovery/register links; dark mode.';
          });
          await check(`${locale}/${device}: login pending and failure preserve entered data (mocked API)`, async () => {
            let release;
            let requested;
            const arrived = new Promise(resolve => { requested = resolve; });
            const pending = new Promise(resolve => { release = resolve; });
            await page.route('**/api/auth/sign-in/email', async route => { requested(); await pending; await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ code: 'INVALID_EMAIL_OR_PASSWORD', message: 'Invalid email or password' }) }); });
            try {
              await page.locator('#email').fill('landing-check@example.invalid');
              await page.locator('#password').fill('SyntheticOnly!2026');
              await page.locator('button[type="submit"]').click();
              await Promise.race([arrived, new Promise((_, reject) => setTimeout(() => reject(new Error('Sign-in request not sent')), 15000))]);
              await expect(page.locator('button[type="submit"]')).toBeDisabled();
              release();
              await expect(page.locator('button[type="submit"]')).toBeEnabled();
              await expect(page.locator('#email')).toHaveValue('landing-check@example.invalid');
              expect(await page.locator('#password').inputValue()).not.toBe('');
              expect(new URL(page.url()).pathname).toBe(`/${locale}/login`);
            } finally { release(); await page.unroute('**/api/auth/sign-in/email'); }
            return 'No real authentication request made by this test.';
          });
        }
        if (id === 'register') await check(`${locale}/${device}: three-step registration and consent validation, no real submission`, async () => {
          const next = () => page.locator('form button').filter({ has: page.locator('svg.lucide-arrow-right') });
          await next().click();
          await expect(page.locator('input[name="firstName"]')).toHaveAttribute('aria-invalid', 'true');
          for (const [name, value] of Object.entries({ firstName: 'Landing', lastName: 'Check', email: 'landing-check@example.invalid', phone: '+237600000000' })) await page.locator(`input[name="${name}"]`).fill(value);
          await next().click();
          await page.locator('input[name="companyName"]').fill('Synthetic landing check');
          await page.getByRole('combobox').first().click(); await page.getByRole('option').first().click();
          await next().click();
          await expect(page.locator('input[name="password"]')).toBeVisible();
          await page.locator('button[type="submit"]').click();
          await expect(page.locator('input[name="password"]')).toHaveAttribute('aria-invalid', 'true');
          await expect(page.locator('input[name="termsAccepted"]')).not.toBeChecked();
          await expect(page.locator(`a[href="/${locale}/terms"]`)).toHaveCount(1);
          await expect(page.locator(`a[href="/${locale}/privacy"]`)).toHaveCount(1);
          await page.locator('form button').filter({ has: page.locator('svg.lucide-arrow-left') }).click();
          await expect(page.locator('input[name="companyName"]')).toHaveValue('Synthetic landing check');
          return 'All three steps reached; required fields and consent block submission; previous-step entries retained.';
        });
      }
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    if (!reflowOnly) for (const route of ['login?returnUrl=%2Fen%2Fdashboard%2Finventory', 'register?ref=landing-check&role=accountant&invite=synthetic-token']) await check(`Locale switch preserves query: ${route.split('?')[0]}`, async () => {
      await visit(page, `/en/${route}`, true);
      await page.locator('header a[href^="/fr/"]').click();
      await expect(page).toHaveURL(`${base}/fr/${route}`, { timeout: 60000 });
    });
    await check('Keyboard focus and 320px / 720px reflow', async () => {
      await visit(page, '/en'); await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => { const style = getComputedStyle(document.activeElement); return { tag: document.activeElement.tagName, outline: style.outlineStyle, width: parseFloat(style.outlineWidth) }; });
      expect(focus.tag).toBe('A'); expect(focus.outline).not.toBe('none'); expect(focus.width).toBeGreaterThan(0);
      for (const route of ['/en', '/fr/login', '/fr/register']) for (const width of [320, 720]) {
        await page.setViewportSize({ width, height: 844 }); await visit(page, route, route.includes('login') || route.includes('register'));
        expect((await geometry(page)).width).toBeLessThanOrEqual(width + 1);
        await page.screenshot({ path: path.join(shots, `reflow-${route.slice(1).replaceAll('/', '-')}-${width}.png`), fullPage: false });
      }
      return 'Visible keyboard outline; 320px narrow layout and 720px layout equivalent to halving a 1440px desktop viewport. Native browser/OS zoom and screen-reader behavior are not certified.';
    });
    if (!reflowOnly) for (const locale of ['en', 'fr']) for (const route of ['forgot-password', 'terms', 'privacy', 'workflows']) await check(`Public destination /${locale}/${route}`, async () => {
      const response = await page.goto(`${base}/${locale}/${route}`, { waitUntil: 'domcontentloaded', timeout: 120000 });
      expect(response.status()).toBe(200); expect(new URL(page.url()).pathname).toBe(`/${locale}/${route}`);
    });
    if (reflowOnly) for (const item of [...results.checks].filter(item => item.status === 'FAIL' && item.name.startsWith('Public destination /'))) await check(item.name, async () => {
      const route = item.name.slice('Public destination '.length);
      const response = await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 240000 });
      expect(response.status()).toBe(200); expect(new URL(page.url()).pathname).toBe(route);
    });
    await context.close();
  } finally {
    await browser.close(); results.finished = new Date().toISOString(); save();
  }
  if (results.checks.some(result => result.status === 'FAIL')) process.exitCode = 1;
}
main().catch(error => { results.fatal = error.message; save(); console.error(error); process.exitCode = 1; });
