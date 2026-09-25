"use strict";
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { createHmac } = require("node:crypto");
const ROOT = path.resolve(__dirname, "../../../../.."); process.chdir(ROOT);
const helper = require(path.join(ROOT, "scripts/modern-modules-local-verification.js"));
const { PrismaClient } = require("@prisma/client");
const { chromium, expect } = require("@playwright/test");
const target = helper.targetUrl(); assert.equal(target.pathname.slice(1), helper.DATABASE_NAME);
assert.ok(["localhost", "127.0.0.1", "::1", "[::1]"].includes(target.hostname));
const db = new PrismaClient({ datasources: { db: { url: target.toString() } }, log: [] });
const result = { readOnly: true, startedAt: new Date().toISOString(), database: helper.DATABASE_NAME, bounds: [], buckets: [] };
(async () => {
  assert.equal((await db.$queryRaw`SELECT current_database() AS name`)[0].name, helper.DATABASE_NAME);
  const original = helper.readPrivateFixture();
  const hash = (scope, subject) => createHmac("sha256", original.authSecret).update(scope).update("\0").update(subject).digest("hex");
  for (const locale of ["en", "fr"]) {
    const userId = `workflow_otp_20260905_48b21da20a_${locale}`;
    const user = await db.user.findUniqueOrThrow({ where: { id: userId }, select: { organizationId: true } });
    assert.equal(user.organizationId, "org_modules_legacy_en_desktop");
    for (const operation of ["email_otp_verification", "email_otp_resend"]) {
      const scope = `${operation}:subject`;
      const bucket = await db.publicIdentityAbuseBucket.findUnique({ where: { scope_subjectHash: { scope, subjectHash: hash(scope, userId) } }, select: { requestCount: true, blockedUntil: true, windowStartedAt: true } });
      result.buckets.push({ locale, scope, bucket });
    }
  }
  const shared = await db.publicIdentityAbuseBucket.findMany({ where: { scope: { in: ["email_otp_verification:ip", "email_otp_resend:ip"] } }, select: { scope: true, requestCount: true, blockedUntil: true, windowStartedAt: true } });
  result.ipBuckets = shared;
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
    try {
      await context.route("**/*", async route => { const request = route.request(); const url = new URL(request.url()); if (request.method() !== "GET" || (["http:", "https:"].includes(url.protocol) && url.origin !== helper.BASE_URL)) await route.abort(); else await route.continue(); });
      const page = await context.newPage();
      for (const locale of ["en", "fr"]) {
        await page.goto(`${helper.BASE_URL}/${locale}/verify/workflow_otp_20260905_48b21da20a_${locale}?email=mismatch.48b21da20a.${locale}%40otp-workflow.stockflow.test`, { waitUntil: "domcontentloaded", timeout: 120000 });
        await expect(page.getByRole("heading", { name: locale === "fr" ? "Saisissez le code à 6 chiffres." : "Enter the 6-digit code." })).toBeVisible({ timeout: 60000 });
        await page.waitForTimeout(1000);
        result.bounds.push(await page.evaluate(locale => {
          const describe = element => { const r = element.getBoundingClientRect(); const s = getComputedStyle(element); return { tag: element.tagName, id: element.id, className: typeof element.className === "string" ? element.className : "", type: element.getAttribute("type"), role: element.getAttribute("role"), ariaLabel: element.getAttribute("aria-label"), rect: { x: r.x, right: r.right, width: r.width }, computed: { position: s.position, width: s.width, minWidth: s.minWidth, overflowX: s.overflowX, whiteSpace: s.whiteSpace }, inlineStyle: element.getAttribute("style") }; };
          return { locale, viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, overflowing: Array.from(document.querySelectorAll("body *")).filter(element => { const r = element.getBoundingClientRect(); return r.right > innerWidth + 0.5 || r.left < -0.5; }).slice(0, 30).map(describe), inputs: Array.from(document.querySelectorAll("input")).map(describe) };
        }, locale));
      }
    } finally { await context.close(); }
  } finally { await browser.close(); result.browserContextsClosed = true; }
})().catch(error => { result.error = error.name + ": " + String(error.message).slice(0, 1200); process.exitCode = 1; }).finally(async () => {
  await db.$disconnect(); result.completedAt = new Date().toISOString();
  fs.writeFileSync(path.join(__dirname, "otp-readonly-diagnosis-48b21da20a.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
  console.log(JSON.stringify(result));
});
