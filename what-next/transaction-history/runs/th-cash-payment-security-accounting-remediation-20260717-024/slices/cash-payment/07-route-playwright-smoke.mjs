import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3019";
const route = "/en/dashboard/finance/cash-payment-history";
const results = [];

const browser = await chromium.launch({ headless: true });
for (const viewport of [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-320", width: 320, height: 720 },
]) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
  const url = page.url();
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  results.push({
    viewport: viewport.name,
    status: response?.status() ?? null,
    finalUrl: url,
    redirectedToLogin: url.includes("/login") && url.includes("cash-payment-history"),
    noDocumentOverflow: scrollWidth <= clientWidth,
    scrollWidth,
    clientWidth,
  });
  await page.close();
}
await browser.close();
console.log(JSON.stringify({ route, results }, null, 2));
