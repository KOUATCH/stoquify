import { chromium } from "playwright";

const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3021";
const routes = [
  { id: "cash-payment", path: "/en/dashboard/finance/cash-payment-history" },
  { id: "ap-history", path: "/en/dashboard/purchases/payables/history" },
  { id: "ar-history", path: "/en/dashboard/finance/receivables/history" },
];
const viewports = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "mobile-320", width: 320, height: 720 },
];

const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const route of routes) {
    for (const viewport of viewports) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const target = `${base}${route.path}`;
      let response = null;
      let error = null;
      try {
        response = await page.goto(target, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
      } catch (err) {
        error = err instanceof Error ? err.message : String(err);
      }
      const finalUrl = page.url();
      const metrics = await page.evaluate(() => ({
        title: document.title,
        bodyText: document.body?.innerText?.slice(0, 500) ?? "",
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        activeElementTag: document.activeElement?.tagName ?? null,
      })).catch((err) => ({
        title: null,
        bodyText: err instanceof Error ? err.message : String(err),
        scrollWidth: null,
        clientWidth: null,
        activeElementTag: null,
      }));
      const redirectedToLogin = finalUrl.includes("/login") && finalUrl.includes(encodeURIComponent(route.path));
      const noDocumentOverflow = typeof metrics.scrollWidth === "number" && typeof metrics.clientWidth === "number"
        ? metrics.scrollWidth <= metrics.clientWidth
        : false;
      results.push({
        route: route.id,
        path: route.path,
        viewport: viewport.name,
        status: response?.status() ?? null,
        finalUrl,
        redirectedToLogin,
        noDocumentOverflow,
        metrics,
        error,
      });
      await page.close();
    }
  }
} finally {
  await browser.close();
}
const failed = results.filter((result) => {
  if (result.error) return true;
  if (result.status && result.status >= 500) return true;
  if (!result.redirectedToLogin && ![200, 307, 308].includes(result.status ?? 0)) return true;
  if (!result.noDocumentOverflow) return true;
  return false;
});
const output = {
  status: failed.length ? "FAIL" : "PASS",
  base,
  checkedAt: new Date().toISOString(),
  results,
};
console.log(JSON.stringify(output, null, 2));
if (failed.length) process.exit(1);