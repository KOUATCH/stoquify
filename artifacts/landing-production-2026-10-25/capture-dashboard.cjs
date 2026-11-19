const { chromium } = require('playwright');
const sharp = require('sharp');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const locale of ['en', 'fr']) {
      const context = await browser.newContext({ viewport: { width: 1600, height: 832 }, deviceScaleFactor: 1.5 });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:4321/${locale}/capture-landing-review`, { waitUntil: 'domcontentloaded', timeout: 90000 });
      await page.locator('#dashboard-capture h1').waitFor();
      await page.evaluate(async locale => { await document.fonts.ready; history.replaceState(null, '', `/${locale}/dashboard`); }, locale);
      await page.waitForTimeout(1800);
      // The development issue badge is browser tooling, not part of the product.
      await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const png = await page.screenshot({ animations: 'disabled', timeout: 15000 });
      const target = path.join(process.cwd(), `public/landing/cinematic/stoquify-dashboard-${locale}.webp`);
      await sharp(png).webp({ quality: 94 }).toFile(target);
      console.log(JSON.stringify({ locale, target, heading: await page.locator('h1').innerText(), url: page.url() }));
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
