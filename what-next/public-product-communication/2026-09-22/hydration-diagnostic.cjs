const { chromium } = require('@playwright/test');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const result = { errors: [], console: [], resources: [] };
  page.on('pageerror', error => result.errors.push({ message: error.message, stack: error.stack }));
  page.on('console', message => { if (message.type() === 'error') result.console.push(message.text()); });
  page.on('requestfailed', request => result.resources.push({ url: request.url(), failure: request.failure() }));
  await page.goto('http://127.0.0.1:3011/en/workflows', { waitUntil: 'networkidle', timeout: 240000 });
  const button = page.locator('[data-workflow-atlas-role="purchasing"]');
  await button.click();
  result.pressed = await button.getAttribute('aria-pressed');
  result.results = await page.locator('[data-workflow-map-index] a').count();
  await page.screenshot({ path: 'what-next/public-product-communication/2026-09-22/hydration-debug.png' });
  fs.writeFileSync('what-next/public-product-communication/2026-09-22/hydration-debug.json', JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
  await browser.close();
})();
