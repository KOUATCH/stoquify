// Chrome DevTools Protocol inspection of local UI only.
// No fixture seeding, schema commands, or business-data mutations.
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("@playwright/test");
const output = path.join(__dirname, "browser");
const phase = process.argv[2] || "before";
const base = "http://localhost:3000";

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  const version = await cdp.send("Browser.getVersion");
  const report = { phase, browser: version.product, protocol: version.protocolVersion, checks: [] };
  page.setDefaultTimeout(30000);
  async function capture(name, route, width, height, navigate = true) {
    console.log(`Inspecting ${name} at ${width}px`);
    await cdp.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 768 });
    if (navigate) await page.goto(base + route, { waitUntil: "domcontentloaded", timeout: 150000 });
    await page.locator('[role="img"][aria-label="Stoquify"]').first().waitFor({ state: "attached", timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    const result = await cdp.send("Runtime.evaluate", {
      expression: `JSON.stringify((() => {
        const rect = el => { const r=el.getBoundingClientRect(); return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom}; };
        return {
          url:location.pathname, viewport:{width:innerWidth,height:innerHeight}, documentWidth:document.documentElement.scrollWidth,
          logos:[...document.querySelectorAll('[role="img"][aria-label="Stoquify"]')].filter(el=>el.getBoundingClientRect().width>0).map(el=>({
            root:rect(el), container:rect(el.parentElement), link:el.closest('a')?.getAttribute('href'),
            svgs:[...el.querySelectorAll('svg')].map(svg=>({rect:rect(svg), viewBox:svg.getAttribute('viewBox'), display:getComputedStyle(svg).display})),
            text:el.textContent, textBlocks:[...el.querySelectorAll('span')].filter(e=>e.children.length===0 && e.textContent.trim()).map(e=>({text:e.textContent,rect:rect(e),client:e.clientWidth,scroll:e.scrollWidth,display:getComputedStyle(e).display})),
          })),
          inputs:[...document.querySelectorAll('input')].map(e=>({name:e.name,type:e.type,placeholder:e.placeholder})),
          buttons:[...document.querySelectorAll('button')].slice(0,25).map(e=>({text:e.textContent,aria:e.getAttribute('aria-label')}))
        };
      })())`,
      returnByValue: true,
    });
    const data = JSON.parse(result.result.value);
    const screenshot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const filename = `${phase}-${name}-${width}.png`;
    fs.writeFileSync(path.join(output, filename), Buffer.from(screenshot.data, "base64"));
    report.checks.push({ name, screenshot: filename, ...data });
    fs.writeFileSync(path.join(output, `${phase}.json`), JSON.stringify(report, null, 2) + "\n");
    console.log(JSON.stringify({ name, width, url: data.url, overflow: data.documentWidth > data.viewport.width, logos: data.logos.length, clippedCaptions: data.logos.flatMap(logo => logo.textBlocks).filter(text => text.scroll > text.client).length }));
  }
  try {
    if (phase !== "dashboard-before") {
      for (const [name, route] of [["public", "/en"], ["login", "/en/login"], ["public-fr", "/fr"], ["login-fr", "/fr/login"]]) {
        await capture(name, route, 1440, 1000);
        await capture(name, route, 390, 844, false);
        if (phase === "after") await capture(name, route, 320, 740, false);
      }
    }
    if (process.argv.includes("--public-only")) return;
    console.log("Opening local sign-in");
    await page.goto(base + "/en/login", { waitUntil: "domcontentloaded", timeout: 90000 });
    const seedAccount = fs.readFileSync(path.resolve(__dirname, "../../../CLAUDE.md"), "utf8").match(/Admin: `([^`]+)` \/ `([^`]+)`/);
    if (!seedAccount) throw new Error("Documented local sign-in account is unavailable");
    await page.locator('input[name="email"]').fill(seedAccount[1]);
    await page.locator('input[name="password"]').fill(seedAccount[2]);
    await page.getByRole("button", { name: "Enter workspace", exact: true }).click();
    console.log("Submitted local sign-in");
    try {
      await page.waitForURL(/\/en\/dashboard(?:[/?]|$)/, { waitUntil: "domcontentloaded", timeout: 45000 });
    } catch (error) {
      console.log(JSON.stringify({ signInResult: new URL(page.url()).pathname, visibleText: (await page.locator("body").innerText()).slice(-2500) }));
      await capture("sign-in-result", "", 1440, 1000, false);
      throw error;
    }
    for (const locale of ["en", "fr"]) {
      await capture(`dashboard-${locale}`, `/${locale}/dashboard`, 1440, 1000);
      await capture(`dashboard-${locale}`, `/${locale}/dashboard`, 820, 1180, false);
      for (const width of [390, 320]) {
        await cdp.send("Emulation.setDeviceMetricsOverride", { width, height: 844, deviceScaleFactor: 1, mobile: true });
        await page.getByRole("button", { name: locale === "en" ? "Toggle navigation menu" : "Ouvrir le menu de navigation", exact: true }).click();
        await page.getByRole("dialog").waitFor();
        await capture(`dashboard-drawer-${locale}`, `/${locale}/dashboard`, width, 844, false);
        await page.getByRole("button", { name: locale === "en" ? "Close navigation" : "Fermer la navigation", exact: true }).click();
        await page.getByRole("dialog").waitFor({ state: "hidden" });
      }
    }
  } finally {
    await browser.close();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
