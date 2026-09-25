"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const crypto = require("node:crypto");
const { chromium, expect } = require("@playwright/test");
const axe = require("axe-core");
const ROOT = path.resolve(__dirname, "../../../../..");
const { BASE_URL, FIXTURES, readPrivateFixture } = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const labels = {
  en: { review: "Review configuration", dialog: "Review your configuration", apply: "Apply configuration" },
  fr: { review: "Examiner la configuration", dialog: "Examinez votre configuration", apply: "Appliquer la configuration" },
};
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const profile = fs.mkdtempSync(path.join(os.tmpdir(), "stoquify-native-zoom-"));
const receipt = {
  classification: "ISOLATED_APPLICATION_VERIFICATION", startedAt: new Date().toISOString(),
  productionApproval: false, browserMechanism: "chrome.tabs.setZoom, automatic mode, per-tab scope",
  profile: { freshOwnedTemporaryProfile: true, userProfileUsed: false },
  viewportEmulation: false, cssZoomUsed: false, pageScaleEmulationUsed: false,
  fixture: "service_en_desktop", readOnlyConfiguration: true,
  sources: ["components/modules/ModuleCompositionWorkbench.tsx", "components/modules/module-composition.module.css", "components/ui/dialog.tsx", "next.config.mjs"].map(file => ({ path: file, sha256: hash(path.join(ROOT, file)) })),
  cases: [],
};
async function layout(page) {
  return page.evaluate(() => ({
    innerWidth, innerHeight, outerWidth, outerHeight, devicePixelRatio,
    visualViewport: { width: visualViewport.width, height: visualViewport.height, scale: visualViewport.scale },
    documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
    rootCssZoom: getComputedStyle(document.documentElement).zoom, bodyCssZoom: getComputedStyle(document.body).zoom,
    scrollX, scrollY,
  }));
}
async function focusFacts(locator) {
  return locator.evaluate(node => {
    const b = node.getBoundingClientRect(), style = getComputedStyle(node);
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, b.x + b.width / 2)), Math.min(innerHeight - 1, Math.max(0, b.y + b.height / 2)));
    return {
      focused: document.activeElement === node, focusVisible: node.matches(":focus-visible"),
      outline: { style: style.outlineStyle, width: style.outlineWidth, color: style.outlineColor },
      bounds: { x: b.x, y: b.y, width: b.width, height: b.height },
      centerUnoccluded: top === node || node.contains(top),
      fullyInViewport: b.x >= -1 && b.y >= -1 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1,
    };
  });
}
async function capture(page, name) {
  assert.equal(await page.locator('input[type="password"]').count(), 0);
  const file = path.join(__dirname, name + ".png");
  await page.screenshot({ path: file, fullPage: false, animations: "disabled", scale: "device" });
  return { path: path.relative(ROOT, file).replaceAll("\\", "/"), sha256: hash(file) };
}
(async () => {
  let context;
  try {
    const extension = path.join(__dirname, "extension");
    context = await chromium.launchPersistentContext(profile, {
      channel: "chromium", headless: true, viewport: null, reducedMotion: "reduce",
      args: ["--disable-extensions-except=" + extension, "--load-extension=" + extension, "--window-size=1280,1100"],
    });
    const worker = context.serviceWorkers()[0] ?? await context.waitForEvent("serviceworker", { timeout: 15000 });
    const page = context.pages()[0] ?? await context.newPage();
    page.setDefaultTimeout(60000);
    receipt.browserVersion = context.browser()?.version();
    receipt.executable = { path: chromium.executablePath(), sha256: hash(chromium.executablePath()) };
    const fixture = FIXTURES.find(item => item.key === receipt.fixture);
    const auth = await context.request.post(BASE_URL + "/api/auth/sign-in/email", {
      data: { email: fixture.email, password: readPrivateFixture().password, rememberMe: false }, headers: { Origin: BASE_URL }, timeout: 120000,
    });
    assert.equal(auth.status(), 200, "Real fixture sign-in");
    const permissions = await context.request.get(BASE_URL + "/api/me/permissions", { timeout: 120000 });
    assert.equal(permissions.status(), 200);
    assert.equal((await permissions.json()).organizationId, fixture.organizationId);
    for (const locale of ["en", "fr"]) for (const zoom of [2, 4]) {
      const result = { locale, requestedZoom: zoom, startedAt: new Date().toISOString(), screenshots: [] };
      receipt.cases.push(result);
      console.log(JSON.stringify({ stage: "case-started", locale, zoom }));
      try {
        await page.goto(BASE_URL + "/" + locale + "/dashboard/settings/modules", { waitUntil: "domcontentloaded", timeout: 240000 });
        await expect(page.getByTestId("module-composition-workbench")).toHaveAttribute("data-hydrated", "true");
        const tabId = await worker.evaluate(async url => {
          const tab = (await chrome.tabs.query({})).find(item => item.url === url);
          if (!tab?.id) throw new Error("Owned page tab was not found");
          return tab.id;
        }, page.url());
        await worker.evaluate(async id => {
          await chrome.tabs.setZoomSettings(id, { mode: "automatic", scope: "per-tab" });
          await chrome.tabs.setZoom(id, 1);
        }, tabId);
        result.baseline = await layout(page);
        result.browserZoom = await worker.evaluate(async ({ id, factor }) => {
          await chrome.tabs.setZoom(id, factor);
          return { actual: await chrome.tabs.getZoom(id), settings: await chrome.tabs.getZoomSettings(id) };
        }, { id: tabId, factor: zoom });
        await expect.poll(async () => (await layout(page)).devicePixelRatio).toBe(result.baseline.devicePixelRatio * zoom);
        result.zoomed = await layout(page);
        assert.equal(result.browserZoom.actual, zoom);
        assert.equal(result.browserZoom.settings.mode, "automatic");
        assert.equal(result.browserZoom.settings.scope, "per-tab");
        assert.ok(Math.abs(result.zoomed.innerWidth * zoom - result.baseline.innerWidth) <= zoom);
        assert.equal(result.zoomed.visualViewport.scale, 1, "No pinch/page-scale emulation");
        assert.ok(["1", "normal"].includes(result.zoomed.rootCssZoom));
        assert.ok(["1", "normal"].includes(result.zoomed.bodyCssZoom));
        assert.ok(Math.max(result.zoomed.documentWidth, result.zoomed.bodyWidth) <= result.zoomed.innerWidth + 2, "No document horizontal overflow");
        result.screenshots.push(await capture(page, locale + "-" + zoom * 100 + "-builder-top"));
        const review = page.getByRole("button", { name: labels[locale].review, exact: true });
        await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); });
        let tabs = 0;
        while (!(await review.evaluate(node => document.activeElement === node)) && tabs < 180) {
          await page.keyboard.press("Tab"); tabs += 1;
        }
        assert.ok(tabs < 180, "Review reachable by sequential keyboard navigation");
        result.reviewKeyboard = { tabs, ...(await focusFacts(review)) };
        assert.ok(result.reviewKeyboard.focused && result.reviewKeyboard.focusVisible && result.reviewKeyboard.centerUnoccluded && result.reviewKeyboard.fullyInViewport);
        assert.equal(result.reviewKeyboard.outline.width, "3px");
        result.screenshots.push(await capture(page, locale + "-" + zoom * 100 + "-review-focus"));
        await page.keyboard.press("Enter");
        const dialog = page.getByRole("dialog", { name: labels[locale].dialog, exact: true });
        await expect(dialog).toBeVisible();
        await expect.poll(() => dialog.evaluate(node => node.contains(document.activeElement))).toBe(true);
        result.dialog = await dialog.evaluate(node => ({
          scrollWidth: node.scrollWidth, clientWidth: node.clientWidth,
          scrollHeight: node.scrollHeight, clientHeight: node.clientHeight, textLength: node.textContent.length,
        }));
        assert.ok(result.dialog.scrollWidth <= result.dialog.clientWidth + 2, "No dialog horizontal overflow");
        result.screenshots.push(await capture(page, locale + "-" + zoom * 100 + "-dialog-top"));
        const apply = dialog.getByRole("button", { name: labels[locale].apply, exact: true });
        await expect(apply).toBeEnabled();
        let dialogTabs = 0;
        while (!(await apply.evaluate(node => document.activeElement === node)) && dialogTabs < 100) {
          await page.keyboard.press("Tab"); dialogTabs += 1;
        }
        result.applyKeyboard = { tabs: dialogTabs, ...(await focusFacts(apply)) };
        assert.ok(dialogTabs < 100 && result.applyKeyboard.focused && result.applyKeyboard.focusVisible && result.applyKeyboard.centerUnoccluded && result.applyKeyboard.fullyInViewport);
        result.screenshots.push(await capture(page, locale + "-" + zoom * 100 + "-dialog-actions"));
        const focusable = dialog.locator('button:not([disabled]),input:not([disabled]),a[href],[tabindex="0"]');
        await focusable.last().focus();
        await page.keyboard.press("Tab");
        assert.ok(await dialog.evaluate(node => node.contains(document.activeElement)));
        await page.addScriptTag({ content: axe.source });
        result.axeViolations = await page.evaluate(async () => {
          const result = await axe.run('[data-testid="configuration-review"]', { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] }, resultTypes: ["violations"] });
          return result.violations.map(item => ({ id: item.id, impact: item.impact, targets: item.nodes.map(node => node.target) }));
        });
        assert.deepEqual(result.axeViolations, []);
        await page.keyboard.press("Escape");
        await expect(dialog).not.toBeVisible();
        await expect(review).toBeFocused();
        result.focusReturned = true;
        await worker.evaluate(id => chrome.tabs.setZoom(id, 1), tabId);
        result.status = "passed";
      } catch (error) {
        result.status = "failed"; result.error = String(error.message);
        result.screenshots.push(await capture(page, locale + "-" + zoom * 100 + "-failure").catch(() => ({ unavailable: true })));
      }
      result.finishedAt = new Date().toISOString();
      fs.writeFileSync(path.join(__dirname, "receipt.json"), JSON.stringify(receipt, null, 2));
      console.log(JSON.stringify({ locale, zoom, status: result.status, error: result.error, viewport: result.zoomed?.innerWidth }));
    }
    receipt.status = receipt.cases.every(item => item.status === "passed") ? "passed" : "failed";
  } catch (error) { receipt.status = "blocked"; receipt.error = String(error.message); }
  finally {
    if (context) await context.close();
    receipt.finishedAt = new Date().toISOString(); receipt.profile.closed = true; receipt.helperSha256 = hash(__filename);
    fs.writeFileSync(path.join(__dirname, "receipt.json"), JSON.stringify(receipt, null, 2));
    console.log(JSON.stringify({ status: receipt.status, cases: receipt.cases.length, error: receipt.error }));
    process.exitCode = receipt.status === "passed" ? 0 : 1;
  }
})();
